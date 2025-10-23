import {
    type CartChangedError,
    type CheckoutSelectors,
    type CheckoutService,
    type CheckoutSettings,
    type OrderRequestBody,
    type PaymentMethod,
} from '@bigcommerce/checkout-sdk';
import { memoizeOne } from '@bigcommerce/memoize';
import { compact, find, isEmpty, noop } from 'lodash';
import React, {
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { type ObjectSchema } from 'yup';

import { type AnalyticsContextProps } from '@bigcommerce/checkout/analytics';
import { type ErrorLogger } from '@bigcommerce/checkout/error-handling-utils';
import { withLanguage, type WithLanguageProps } from '@bigcommerce/checkout/locale';
import { type CheckoutContextProps, type PaymentFormValues } from '@bigcommerce/checkout/payment-integration-api';
import { ChecklistSkeleton } from '@bigcommerce/checkout/ui';

import { withAnalytics } from '../analytics';
import { withCheckout } from '../checkout';
import {
    ErrorModal,
    type ErrorModalOnCloseProps,
    isCartChangedError,
    isErrorWithType,
} from '../common/error';
import { EMPTY_ARRAY } from '../common/utility';
import { TermsConditionsType } from '../termsConditions';

import mapSubmitOrderErrorMessage, { mapSubmitOrderErrorTitle } from './mapSubmitOrderErrorMessage';
import mapToOrderRequestBody from './mapToOrderRequestBody';
import PaymentContext from './PaymentContext';
import PaymentForm from './PaymentForm';
import {
    getUniquePaymentMethodId,
    PaymentMethodId,
    PaymentMethodProviderType,
} from './paymentMethod';
import { loadPartiallyJs } from '../../../../../scripts/custom/partially.js';
import _ from 'lodash';

import { terraceFinanceSubmit, flexSubmit } from './paymentMethod/CustomMethodsSubmit';

export interface PaymentProps {
    errorLogger: ErrorLogger;
    isEmbedded?: boolean;
    isUsingMultiShipping?: boolean;
    checkEmbeddedSupport?(methodIds: string[]): void; // TODO: We're currently doing this check in multiple places, perhaps we should move it up so this check get be done in a single place instead.
    onCartChangedError?(error: CartChangedError): void;
    onFinalize?(): void;
    onFinalizeError?(error: Error): void;
    onReady?(): void;
    onSubmit?(): void;
    onSubmitError?(error: Error): void;
    onUnhandledError?(error: Error): void;
}

interface WithCheckoutPaymentProps {
    availableStoreCredit: number;
    cartUrl: string;
    defaultMethod?: PaymentMethod;
    finalizeOrderError?: Error;
    isInitializingPayment: boolean;
    isSubmittingOrder: boolean;
    isStoreCreditApplied: boolean;
    isTermsConditionsRequired: boolean;
    methods: PaymentMethod[];
    shouldExecuteSpamCheck: boolean;
    shouldLocaliseErrorMessages: boolean;
    submitOrderError?: Error;
    termsConditionsText?: string;
    termsConditionsUrl?: string;
    usableStoreCredit: number;
    applyStoreCredit(useStoreCredit: boolean): Promise<CheckoutSelectors>;
    clearError(error: Error): void;
    finalizeOrderIfNeeded(): Promise<CheckoutSelectors>;
    isPaymentDataRequired(): boolean;
    loadCheckout(): Promise<CheckoutSelectors>;
    loadPaymentMethods(): Promise<CheckoutSelectors>;
    submitOrder(values: OrderRequestBody): Promise<CheckoutSelectors>;
    checkoutServiceSubscribe: CheckoutService['subscribe'];
}

interface PaymentState {
    didExceedSpamLimit: boolean;
    isReady: boolean;
    selectedMethod?: PaymentMethod;
    shouldDisableSubmit: { [key: string]: boolean };
    shouldHidePaymentSubmitButton: { [key: string]: boolean };
    submitFunctions: { [key: string]: ((values: PaymentFormValues) => void) | null };
}

interface validationSchemas {
    [key: string]: ObjectSchema<Partial<PaymentFormValues>> | null;
}

const Payment= (props: PaymentProps & WithCheckoutPaymentProps & WithLanguageProps & AnalyticsContextProps): ReactElement  => {
    const [state, setState] = useState<PaymentState>({
        didExceedSpamLimit: false,
        isReady: false,
        shouldDisableSubmit: {},
        shouldHidePaymentSubmitButton: {},
        submitFunctions: {},
    });

    const isReadyRef = useRef(state.isReady);
    const grandTotalChangeUnsubscribe = useRef<() => void>();
    const validationSchemasRef = useRef<validationSchemas>({});

    const renderOrderErrorModal = (): ReactNode => {
            const { finalizeOrderError, language, shouldLocaliseErrorMessages, submitOrderError } =
                props;

            // FIXME: Export correct TS interface
            const error: any = submitOrderError || finalizeOrderError;

            if (
                !error ||
                error.type === 'order_finalization_not_required' ||
                error.type === 'payment_cancelled' ||
                error.type === 'payment_invalid_form' ||
                error.type === 'spam_protection_not_completed' ||
                error.type === 'invalid_hosted_form_value'
            ) {
                return null;
            }

            return (
                <ErrorModal
                    error={error}
                    message={mapSubmitOrderErrorMessage(
                        error,
                        language.translate.bind(language),
                        shouldLocaliseErrorMessages,
                    )}
                    onClose={handleCloseModal}
                    title={mapSubmitOrderErrorTitle(error, language.translate.bind(language))}
                />
            );
        }

    const renderEmbeddedSupportErrorModal =(): ReactNode => {
            const { checkEmbeddedSupport = noop, methods } = props;

            try {
                checkEmbeddedSupport(methods.map(({ id }) => id));
            } catch (error) {
                if (error instanceof Error) {
                    return <ErrorModal error={error} onClose={handleCloseModal} />;
                }
            }

            return null;
        }

    const disableSubmit = (method: PaymentMethod, disabled = true) : void => {
            const uniqueId = getUniquePaymentMethodId(method.id, method.gateway);
            const { shouldDisableSubmit } = state;

            if (shouldDisableSubmit[uniqueId] === disabled) {
                return;
            }

            setState(prevState => ({ ...prevState,
                shouldDisableSubmit: {
                    ...shouldDisableSubmit,
                    [uniqueId]: disabled,
                },
            }));
        };

    const hidePaymentSubmitButton = (method: PaymentMethod, disabled = true): void => {
            const uniqueId = getUniquePaymentMethodId(method.id, method.gateway);
            const { shouldHidePaymentSubmitButton } = state;

            if (shouldHidePaymentSubmitButton[uniqueId] === disabled) {
                return;
            }

            setState(prevState => ({ ...prevState,
                shouldHidePaymentSubmitButton: {
                    ...shouldHidePaymentSubmitButton,
                    [uniqueId]: disabled,
                },
            }));
        };

    const handleBeforeUnload = (event: BeforeUnloadEvent) : string | undefined => {
            const { defaultMethod, isSubmittingOrder, language } = props;
            const { selectedMethod = defaultMethod } = state;

            if (
                !isSubmittingOrder ||
                !selectedMethod ||
                selectedMethod.type === PaymentMethodProviderType.Hosted ||
                selectedMethod.type === PaymentMethodProviderType.PPSDK ||
                selectedMethod.skipRedirectConfirmationAlert ||
            selectedMethod.gateway === PaymentMethodId.BlueSnapDirect ||
            selectedMethod.gateway === PaymentMethodId.BlueSnapV2 ||
            selectedMethod.id === PaymentMethodId.AmazonPay ||
            selectedMethod.id === PaymentMethodId.CBAMPGS ||
            selectedMethod.id === PaymentMethodId.Checkoutcom ||
            selectedMethod.id === PaymentMethodId.CheckoutcomGooglePay ||
            selectedMethod.id === PaymentMethodId.Converge ||
            selectedMethod.id === PaymentMethodId.Humm ||
            selectedMethod.id === PaymentMethodId.Laybuy ||
            selectedMethod.id === PaymentMethodId.Quadpay ||
            selectedMethod.id === PaymentMethodId.SagePay ||
            selectedMethod.id === PaymentMethodId.Sezzle ||
            selectedMethod.id === PaymentMethodId.WorldpayAccess ||
            selectedMethod.id === PaymentMethodId.Zip ||
            selectedMethod.gateway === PaymentMethodId.AdyenV2 ||
            selectedMethod.gateway === PaymentMethodId.AdyenV2GooglePay ||
            selectedMethod.gateway === PaymentMethodId.AdyenV3 ||
            selectedMethod.gateway === PaymentMethodId.AdyenV3GooglePay ||
            selectedMethod.gateway === PaymentMethodId.Afterpay ||
            selectedMethod.gateway === PaymentMethodId.Clearpay ||
            selectedMethod.gateway === PaymentMethodId.Checkoutcom ||
            selectedMethod.gateway === PaymentMethodId.Mollie ||
            selectedMethod.gateway === PaymentMethodId.StripeV3 ||
            selectedMethod.gateway === PaymentMethodId.Partially ||
            selectedMethod.gateway === PaymentMethodId.TerraceFinance ||
            selectedMethod.gateway === PaymentMethodId.Flex
            ) {
                return;
            }

            const message = language.translate('common.leave_warning');

            event.returnValue = message;

            return message;
        };

    const handleCloseModal = async (_: Event, { error }: ErrorModalOnCloseProps) : Promise<void> => {
                if (!error) {
                    return;
                }

                const { cartUrl, clearError, loadCheckout } = props;
                const { type: errorType } = error as any; // FIXME: Export correct TS interface

                if (
                    errorType === 'provider_fatal_error' ||
                    errorType === 'order_could_not_be_finalized_error'
                ) {
                    window.location.replace(cartUrl || '/');
                }

                if (errorType === 'tax_provider_unavailable') {
                    window.location.reload();
                }

                if (errorType === 'cart_consistency') {
                    await loadCheckout();
                }

                if (isErrorWithType(error) && error.body) {
                    const { body, headers, status } = error;

                    if (body.type === 'provider_error' && headers.location) {
                        window.top?.location.assign(headers.location);
                    }

                    // Reload the checkout object to get the latest `shouldExecuteSpamCheck` value,
                    // which will in turn make `SpamProtectionField` visible again.
                    // NOTE: As a temporary fix, we're checking the status code instead of the error
                    // type because of an issue with Nginx config, which causes the server to return
                    // HTML page instead of JSON response when there is a 429 error.
                    if (
                        status === 429 ||
                        body.type === 'spam_protection_expired' ||
                        body.type === 'spam_protection_failed'
                    ) {
                        setState(prevState => ({ ...prevState, didExceedSpamLimit: true }));

                        await loadCheckout();
                    }
                }

                clearError(error);
            };

    const handleStoreCreditChange = useCallback(async (useStoreCredit: boolean) : Promise<void> => {
        const { applyStoreCredit, onUnhandledError = noop } = props;

        try {
            await applyStoreCredit(useStoreCredit);
        } catch (e) {
            onUnhandledError(e);
        }
    }, []);

    const handleError = useCallback((error: Error) : void => {
        const { onUnhandledError = noop, errorLogger } = props;

        const { type } = error as any;

        if (type === 'unexpected_detachment') {
            errorLogger.log(error);

            return;
        }

        return onUnhandledError(error);
    }, []);

    const handleSubmit = useCallback(async (values: PaymentFormValues) => {
        const {
            defaultMethod,
            loadPaymentMethods,
            isPaymentDataRequired,
            onCartChangedError = noop,
            onSubmit = noop,
            onSubmitError = noop,
            submitOrder,
            analyticsTracker,
            loadCheckout
        } = props;

        const { selectedMethod = defaultMethod, submitFunctions } = state;

        analyticsTracker.clickPayButton({ shouldCreateAccount: values.shouldCreateAccount });

        const customSubmit =
            selectedMethod &&
            submitFunctions[getUniquePaymentMethodId(selectedMethod.id, selectedMethod.gateway)];

        if (customSubmit) {
            return customSubmit(values);
        }

        try {
            if (selectedMethod?.id === 'terracefinance') {
                disableSubmit(selectedMethod, true);
                terraceFinanceSubmit(await loadCheckout(), handleError);
                disableSubmit(selectedMethod, false);
            } else if (selectedMethod?.id === 'flex') {
                disableSubmit(selectedMethod, true);
                flexSubmit(await loadCheckout(), handleError);
                disableSubmit(selectedMethod, false);
            } else {
                const state = await submitOrder(mapToOrderRequestBody(values, isPaymentDataRequired()));
                const order = state.data.getOrder();
    
                analyticsTracker.paymentComplete();
    
                onSubmit(order?.orderId);
            }
        } catch (error) {
            analyticsTracker.paymentRejected();

            if (isErrorWithType(error) && error.type === 'payment_method_invalid') {
                return loadPaymentMethods();
            }

            if (isCartChangedError(error)) {
                return onCartChangedError(error);
            }

            onSubmitError(error);
        }
    }, [props.defaultMethod, state.selectedMethod, props.isPaymentDataRequired()]);

    const trackSelectedPaymentMethod = (method: PaymentMethod) => {
        const { analyticsTracker } = props;

        const methodName = method.config.displayName || method.id;
        const methodId = method.id;

        analyticsTracker.selectedPaymentMethod(methodName, methodId);
    }

    const setSelectedMethod = useCallback((method?: PaymentMethod) : void => {
        const { selectedMethod } = state;

        if (selectedMethod === method) {
            return;
        }

        if (method) {
            trackSelectedPaymentMethod(method);
        }

        setState(prevState => ({ ...prevState, selectedMethod: method }));
    }, []);

    const setSubmit = (
        method: PaymentMethod,
        fn: (values: PaymentFormValues) => void | null,
    ): void => {
        const uniqueId = getUniquePaymentMethodId(method.id, method.gateway);
        const { submitFunctions } = state;

        if (submitFunctions[uniqueId] === fn) {
            return;
        }

        setState(prevState => ({ ...prevState,
            submitFunctions: {
                ...submitFunctions,
                [uniqueId]: fn,
            },
        }));
    };

    const setValidationSchema = (
        method: PaymentMethod,
        schema: ObjectSchema<Partial<PaymentFormValues>> | null,
    ): void => {
        const uniqueId = getUniquePaymentMethodId(method.id, method.gateway);

        if (validationSchemasRef.current[uniqueId] === schema) {
            return;
        }

        validationSchemasRef.current[uniqueId] = schema;
    };

    const loadPaymentMethodsOrThrow = async (): Promise<void> => {
        const {
            loadPaymentMethods,
            onUnhandledError = noop,
        } = props;

        try {
            await loadPaymentMethods();

            const selectedMethod = state.selectedMethod || props.defaultMethod;

            if (selectedMethod) {
                trackSelectedPaymentMethod(selectedMethod);
            }
        } catch (error) {
            onUnhandledError(error);
        }
    }

    const handleCartTotalChange = async (): Promise<void> => {
        const isReady = isReadyRef.current;

        if (!isReady) {
            return;
        }

        setState(prevState => ({ ...prevState, isReady: false }));

        await loadPaymentMethodsOrThrow();

        setState(prevState => ({ ...prevState,  isReady: true }));
    }

    const getContextValue = memoizeOne(() => {
        return {
            disableSubmit,
            setSubmit,
            setValidationSchema,
            hidePaymentSubmitButton,
        };
    });

    useEffect(() => {
        isReadyRef.current = state.isReady;
    }, [state.isReady]);

    useEffect(() => {
        const init = async () => {
            const {
                finalizeOrderIfNeeded,
                onFinalize = noop,
                onFinalizeError = noop,
                onReady = noop,
                usableStoreCredit,
                checkoutServiceSubscribe,
            } = props;

            if (usableStoreCredit) {
                await handleStoreCreditChange(true);
            }

            await loadPaymentMethodsOrThrow();

            try {
                const state = await finalizeOrderIfNeeded();
                const order = state.data.getOrder();

                onFinalize(order?.orderId);
            } catch (error) {
                if (isErrorWithType(error) && error.type !== 'order_finalization_not_required') {
                    onFinalizeError(error);
                }
            }

            grandTotalChangeUnsubscribe.current = checkoutServiceSubscribe(
                () => handleCartTotalChange(),
                ({ data }) => data.getCheckout()?.grandTotal,
                ({ data }) => data.getCheckout()?.outstandingBalance,
            );

            window.addEventListener('beforeunload', handleBeforeUnload);
            setState(prevState => ({ ...prevState, isReady: true }));
            onReady();
        }

        void init();

        return () => {
            const deInit = () => {
                if (grandTotalChangeUnsubscribe.current) {
                    grandTotalChangeUnsubscribe.current();
                    grandTotalChangeUnsubscribe.current = undefined;
                }

                window.removeEventListener('beforeunload', handleBeforeUnload);
            }

            deInit();
        }
    }, []);

    useEffect(() => {
        const { checkEmbeddedSupport = noop, methods } = props;

        checkEmbeddedSupport(methods.map(({ id }) => id));
    }, [props.methods]);

    const { selectedMethod = props.defaultMethod } = state;
    const uniqueSelectedMethodId =
        selectedMethod && getUniquePaymentMethodId(selectedMethod.id, selectedMethod.gateway);

    return (
        <PaymentContext.Provider value={getContextValue()}>
            <ChecklistSkeleton isLoading={!state.isReady}>
                {!isEmpty(props.methods) && props.defaultMethod && (
                    <PaymentForm
                        availableStoreCredit={props.availableStoreCredit}
                        defaultGatewayId={props.defaultMethod.gateway}
                        defaultMethodId={props.defaultMethod.id}
                        didExceedSpamLimit={state.didExceedSpamLimit}
                        isEmbedded={props.isEmbedded}
                        isInitializingPayment={props.isInitializingPayment}
                        isPaymentDataRequired={props.isPaymentDataRequired}
                        isStoreCreditApplied = {props.isStoreCreditApplied}
                        isTermsConditionsRequired={props.isTermsConditionsRequired}
                        isUsingMultiShipping={props.isUsingMultiShipping}
                        methods={props.methods}
                        onMethodSelect={setSelectedMethod}
                        onStoreCreditChange={handleStoreCreditChange}
                        onSubmit={handleSubmit}
                        onUnhandledError={handleError}
                        selectedMethod={state.selectedMethod}
                        shouldDisableSubmit={(uniqueSelectedMethodId && state.shouldDisableSubmit[uniqueSelectedMethodId]) || undefined}
                        shouldExecuteSpamCheck = {props.shouldExecuteSpamCheck}
                        shouldHidePaymentSubmitButton={(uniqueSelectedMethodId && props.isPaymentDataRequired() && state.shouldHidePaymentSubmitButton[uniqueSelectedMethodId]) || undefined}
                        termsConditionsText={props.termsConditionsText}
                        termsConditionsUrl={props.termsConditionsUrl}
                        usableStoreCredit={props.usableStoreCredit}
                        validationSchema={(uniqueSelectedMethodId && validationSchemasRef.current[uniqueSelectedMethodId]) || undefined}
                    />
                )}
            </ChecklistSkeleton>

            {renderOrderErrorModal()}
            {renderEmbeddedSupportErrorModal()}
        </PaymentContext.Provider>
    );
}

export function mapToPaymentProps({
        checkoutService,
        checkoutState,
}: CheckoutContextProps): WithCheckoutPaymentProps | null {
    const {
        data: {
            getCheckout,
            getConfig,
            getCustomer,
            getConsignments,
            getOrder,
            getPaymentMethod,
            getPaymentMethods,
            isPaymentDataRequired,
            getPaymentProviderCustomer,
        },
        errors: { getFinalizeOrderError, getSubmitOrderError },
        statuses: { isInitializingPayment, isSubmittingOrder },
    } = checkoutState;

    const checkout = getCheckout();
    const config = getConfig();
    const customer = getCustomer();
    const consignments = getConsignments();
    const paymentProviderCustomer = getPaymentProviderCustomer();

    const { isComplete = false } = getOrder() || {};
    let methods = getPaymentMethods() || EMPTY_ARRAY;

    // TODO: In accordance with the checkout team, this functionality is temporary and will be implemented in the backend instead.
    if (paymentProviderCustomer?.stripeLinkAuthenticationState) {
        const stripeUpePaymentMethod = methods.filter(method =>
            method.id === 'card' && method.gateway === PaymentMethodId.StripeUPE
        );

        methods = stripeUpePaymentMethod.length ? stripeUpePaymentMethod : methods;
    }

    
    if (!checkout || !config || !customer || isComplete) {
        return null;
    }

    // Attempt to find In Store payment method
    //  In Store is used for manual custom payment integrations
    const inStoreMethod = methods.filter(method => method.id === 'instore');
 
    // Check In Store payment method is enabled on store
    if (inStoreMethod.length) {

        const isReorder = checkout.cart.lineItems.physicalItems.some(x => x.sku.startsWith('SPARE'));

        // Only for US payment methods
        // Billing address and currency must match
        if ((checkout.billingAddress?.countryCode === 'US' && config.shopperCurrency.code === 'USD')) {
            // Adding Terrace Finance
            // Check TF is set for store and if not a reorder
            if (inStoreMethod[0].config.displayName?.includes('Terrace Finance PIS') && !isReorder) {
                methods = methods.concat(getTerraceFinanceMethod());
            }

            // Adding Partially
            if (inStoreMethod[0].config.displayName?.includes('Partially PIS') && !isReorder) {
                methods = methods.concat(getPartiallyMethod());
                loadPartiallyJs();
            }

            // Adding Flex
            if (inStoreMethod[0].config.displayName?.includes('Flex PIS')) {
                methods = methods.concat(getFlexMethod());
            }
        }

        // Only for UK payment methods
        // Billing address and currency must match
        if ((checkout.billingAddress?.countryCode === 'GB' && config.shopperCurrency.code === 'GBP')) {
            // Adding Partially
            if (inStoreMethod[0].config.displayName?.includes('Partially PIS') && !isReorder) {
                methods = methods.concat(getPartiallyMethod());
                loadPartiallyJs();
            }
        }
    }

    // Reorder methods US
    if (config.shopperCurrency.code === 'USD') {
        // Order is as follows
        //  Method ID is used which is a different value than the commented list below
        // Debit/credit Card (nmi)
        // Affirm (affirm)
        // Terrace Finance (terracefinance)
        // Paypal (paypalcommerce)
        // Venmo (paypalcommercevenmo)
        // Klarna (pay_over_time)
        // Afterpay (pay_by_installment)
        // Flex (flex)
        // Zip (quadpay)
        // Partially (partially)
        // Bread Pay (cod)
        // Paytomorrow (cheque)
        let paymentOrder = [ 
            'nmi',
            'affirm',
            'terracefinance',
            'paypalcommerce',
            'paypalcommercevenmo',
            'pay_over_time',
            'pay_by_installment',
            'flex',
            'quadpay',
            'partially',
            'cod',
            'cheque'
        ];
    
        methods = _.sortBy(methods, function(pm){
            return paymentOrder.indexOf(pm.id);
        });
    }

    const {
        enableTermsAndConditions: isTermsConditionsEnabled,
        features,
        orderTermsAndConditionsType: termsConditionsType,
        orderTermsAndConditions: termsCondtitionsText,
        orderTermsAndConditionsLink: termsCondtitionsUrl,
    } = config.checkoutSettings as CheckoutSettings & { orderTermsAndConditionsLocation: string };

    const isTermsConditionsRequired = isTermsConditionsEnabled;
    const selectedPayment = find(checkout.payments, {
        providerType: PaymentMethodProviderType.Hosted,
    });

    const { isStoreCreditApplied } = checkout;

    let selectedPaymentMethod;
    let filteredMethods;

    filteredMethods = methods.filter((method: PaymentMethod) => {
        if (method.id === PaymentMethodId.Bolt && method.initializationData) {
            return Boolean(method.initializationData.showInCheckout);
        }

        if (method.id === PaymentMethodId.BraintreeLocalPaymentMethod) {
            return false;
        }

        // Remove In Store as this payment method
        //  is only for checking custom payment merchant integration
        if (method.id === 'instore'){
            return false;
        }

        return true;
    });

    if (consignments && consignments.length > 1) {
        const multiShippingIncompatibleMethodIds: string[] = [
            PaymentMethodId.AmazonPay,
        ];

        filteredMethods = methods.filter((method: PaymentMethod) => {
            return !multiShippingIncompatibleMethodIds.includes(method.id);
        });
    }

    if (selectedPayment) {
        selectedPaymentMethod = getPaymentMethod(
            selectedPayment.providerId,
            selectedPayment.gatewayId,
        );
        filteredMethods = selectedPaymentMethod
            ? compact([selectedPaymentMethod])
            : filteredMethods;
    } else {
        selectedPaymentMethod = find(filteredMethods, {
            config: { hasDefaultStoredInstrument: true },
        });
        // eslint-disable-next-line no-self-assign
        filteredMethods = filteredMethods;
    }

    return {
        applyStoreCredit: checkoutService.applyStoreCredit,
        availableStoreCredit: customer.storeCredit,
        cartUrl: config.links.cartLink,
        clearError: checkoutService.clearError,
        defaultMethod: selectedPaymentMethod || filteredMethods[0],
        finalizeOrderError: getFinalizeOrderError(),
        finalizeOrderIfNeeded: checkoutService.finalizeOrderIfNeeded,
        loadCheckout: checkoutService.loadCheckout,
        isInitializingPayment: isInitializingPayment(),
        isPaymentDataRequired,
        isStoreCreditApplied,
        isSubmittingOrder: isSubmittingOrder(),
        isTermsConditionsRequired,
        loadPaymentMethods: checkoutService.loadPaymentMethods,
        methods: filteredMethods,
        shouldExecuteSpamCheck: checkout.shouldExecuteSpamCheck,
        shouldLocaliseErrorMessages:
            features['PAYMENTS-6799.localise_checkout_payment_error_messages'],
        submitOrder: checkoutService.submitOrder,
        submitOrderError: getSubmitOrderError(),
        checkoutServiceSubscribe: checkoutService.subscribe,
        termsConditionsText:
            isTermsConditionsRequired && termsConditionsType === TermsConditionsType.TextArea
                ? termsCondtitionsText
                : undefined,
        termsConditionsUrl:
            isTermsConditionsRequired && termsConditionsType === TermsConditionsType.Link
                ? termsCondtitionsUrl
                : undefined,
        usableStoreCredit:
            checkout.grandTotal > 0 ? Math.min(checkout.grandTotal, customer.storeCredit || 0) : 0,
    };
}

export default withAnalytics(withLanguage(withCheckout(mapToPaymentProps)(Payment)));

export function getPartiallyMethod(): PaymentMethod {
    return {
        id: 'partially',
        gateway: 'partially',
        logoUrl: 'https://cdn.instasmile.com/new-website/images/icons-merchants/icon-merchant-partially.svg',
        method: 'external',
        supportedCards: [],
        config: {
            displayName: 'Partial.ly Payment Plan',
            helpText: '',
            merchantId: 'partially',
            testMode: false,
            returnUrl: `${window.location.origin}/checkout`,
            redirectUrl: `${window.location.origin}/pages/complete`
        },
        type: 'PAYMENT_TYPE_API',
        skipRedirectConfirmationAlert: false
    };
}

export function getTerraceFinanceMethod(): PaymentMethod {
    return {
        id: 'terracefinance',
        gateway: 'terracefinance',
        logoUrl: 'https://terracefinance.com/wp-content/uploads/2019/12/Terrace-Logo-Retina-360px.png',
        method: 'external',
        supportedCards: [],
        config: {
            displayName: '$99 due today. Up to 12 month term',
            helpText: '',
            merchantId: 'terracefinance',
            testMode: false,
            returnUrl: `${window.location.origin}/checkout`,
            redirectUrl: `${window.location.origin}/pages/complete`
        },
        type: 'PAYMENT_TYPE_API',
        skipRedirectConfirmationAlert: false
    };
}

export function getFlexMethod(): PaymentMethod {
    return {
        id: 'flex',
        gateway: 'flex',
        logoUrl: 'https://cdn.instasmile.com/new-website/images/icons-merchants/icon-merchant-flex-navy.png',
        method: 'external',
        supportedCards: [],
        config: {
            displayName: 'Display right: Flex',
            helpText: '',
            merchantId: 'flex',
            testMode: false,
            returnUrl: `${window.location.origin}/checkout`,
            redirectUrl: `${window.location.origin}/pages/complete/`
        },
        type: 'PAYMENT_TYPE_API',
        skipRedirectConfirmationAlert: false
    };
}
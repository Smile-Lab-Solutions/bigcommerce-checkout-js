import {
    Address,
    Cart,
    CartChangedError,
    CheckoutParams,
    CheckoutSelectors,
    Consignment,
    EmbeddedCheckoutMessenger,
    EmbeddedCheckoutMessengerOptions,
    FlashMessage,
    Promotion,
    RequestOptions,
} from '@bigcommerce/checkout-sdk';
import classNames from 'classnames';
import { find, findIndex } from 'lodash';
import React, { Component, lazy, ReactNode } from 'react';

import { AnalyticsContextProps } from '@bigcommerce/checkout/analytics';
import { AddressFormSkeleton, ChecklistSkeleton } from '@bigcommerce/checkout/ui';

import { withAnalytics } from '../analytics';
import { StaticBillingAddress } from '../billing';
import { EmptyCartMessage } from '../cart';
import { CustomError, ErrorLogger, ErrorModal, isCustomError } from '../common/error';
import { retry } from '../common/utility';
import {
    CheckoutButtonContainer,
    CheckoutSuggestion,
    Customer,
    CustomerInfo,
    CustomerSignOutEvent,
    CustomerViewType,
} from '../customer';
import { EmbeddedCheckoutStylesheet, isEmbedded } from '../embeddedCheckout';
import { TranslatedString, withLanguage, WithLanguageProps } from '../locale';
import { PromotionBannerList } from '../promotion';
import { hasSelectedShippingOptions, isUsingMultiShipping, StaticConsignment } from '../shipping';
import { ShippingOptionExpiredError } from '../shipping/shippingOption';
import { LazyContainer, LoadingNotification, LoadingOverlay } from '../ui/loading';
import { MobileView } from '../ui/responsive';

import CheckoutStep from './CheckoutStep';
import CheckoutStepStatus from './CheckoutStepStatus';
import CheckoutStepType from './CheckoutStepType';
import CheckoutSupport from './CheckoutSupport';
import mapToCheckoutProps from './mapToCheckoutProps';
import navigateToOrderConfirmation from './navigateToOrderConfirmation';
import withCheckout from './withCheckout';
import { ModalHeader, ModalLink } from '../ui/modal';

const Billing = lazy(() =>
    retry(
        () =>
            import(
                /* webpackChunkName: "billing" */
                '../billing/Billing'
            ),
    ),
);

const CartSummary = lazy(() =>
    retry(
        () =>
            import(
                /* webpackChunkName: "cart-summary" */
                '../cart/CartSummary'
            ),
    ),
);

const CartSummaryDrawer = lazy(() =>
    retry(
        () =>
            import(
                /* webpackChunkName: "cart-summary-drawer" */
                '../cart/CartSummaryDrawer'
            ),
    ),
);

const Payment = lazy(() =>
    retry(
        () =>
            import(
                /* webpackChunkName: "payment" */
                '../payment/Payment'
            ),
    ),
);

const Shipping = lazy(() =>
    retry(
        () =>
            import(
                /* webpackChunkName: "shipping" */
                '../shipping/Shipping'
            ),
    ),
);

export interface CheckoutProps {
    checkoutId: string;
    containerId: string;
    embeddedStylesheet: EmbeddedCheckoutStylesheet;
    embeddedSupport: CheckoutSupport;
    errorLogger: ErrorLogger;
    createEmbeddedMessenger(options: EmbeddedCheckoutMessengerOptions): EmbeddedCheckoutMessenger;
}

export interface CheckoutState {
    activeStepType?: CheckoutStepType;
    isBillingSameAsShipping: boolean;
    customerViewType?: CustomerViewType;
    defaultStepType?: CheckoutStepType;
    error?: Error;
    flashMessages?: FlashMessage[];
    isMultiShippingMode: boolean;
    isCartEmpty: boolean;
    isRedirecting: boolean;
    hasSelectedShippingOptions: boolean;
    isBuyNowCartEnabled: boolean;
    isHidingStepNumbers: boolean;
    isWalletButtonsOnTop: boolean;
    isSubscribed: boolean;
}

export interface WithCheckoutProps {
    billingAddress?: Address;
    cart?: Cart;
    consignments?: Consignment[];
    error?: Error;
    hasCartChanged: boolean;
    flashMessages?: FlashMessage[];
    isGuestEnabled: boolean;
    isLoadingCheckout: boolean;
    isPending: boolean;
    isPriceHiddenFromGuests: boolean;
    loginUrl: string;
    cartUrl: string;
    siteUrl: string;
    createAccountUrl: string;
    canCreateAccountInCheckout: boolean;
    promotions?: Promotion[];
    steps: CheckoutStepStatus[];
    clearError(error?: Error): void;
    loadCheckout(id: string, options?: RequestOptions<CheckoutParams>): Promise<CheckoutSelectors>;
    subscribeToConsignments(subscriber: (state: CheckoutSelectors) => void): () => void;
}

class Checkout extends Component<
    CheckoutProps & WithCheckoutProps & WithLanguageProps & AnalyticsContextProps,
    CheckoutState
> {
    state: CheckoutState = {
        isBillingSameAsShipping: true,
        isCartEmpty: false,
        isRedirecting: false,
        isMultiShippingMode: false,
        hasSelectedShippingOptions: false,
        isBuyNowCartEnabled: false,
        isHidingStepNumbers: true,
        isWalletButtonsOnTop: false,
        isSubscribed: false,
    };

    private embeddedMessenger?: EmbeddedCheckoutMessenger;
    private unsubscribeFromConsignments?: () => void;

    componentWillUnmount(): void {
        if (this.unsubscribeFromConsignments) {
            this.unsubscribeFromConsignments();
            this.unsubscribeFromConsignments = undefined;
        }

        window.removeEventListener('beforeunload', this.handleBeforeExit);
        this.handleBeforeExit();
    }

    async componentDidMount(): Promise<void> {
        const {
            checkoutId,
            containerId,
            createEmbeddedMessenger,
            embeddedStylesheet,
            loadCheckout,
            subscribeToConsignments,
            analyticsTracker
        } = this.props;

        try {
            const { data } = await loadCheckout(checkoutId, {
                params: {
                    include: [
                        'cart.lineItems.physicalItems.categoryNames',
                        'cart.lineItems.digitalItems.categoryNames',
                    ] as any, // FIXME: Currently the enum is not exported so it can't be used here.
                },
            });
            const { links: { siteLink = '' } = {} } = data.getConfig() || {};
            const errorFlashMessages = data.getFlashMessages('error') || [];

            if (errorFlashMessages.length) {
                const { language } = this.props;

                this.setState({
                    error: new CustomError({
                        title:
                            errorFlashMessages[0].title ||
                            language.translate('common.error_heading'),
                        message: errorFlashMessages[0].message,
                        data: {},
                        name: 'default',
                    }),
                });
            }

            const messenger = createEmbeddedMessenger({ parentOrigin: siteLink });

            this.unsubscribeFromConsignments = subscribeToConsignments(
                this.handleConsignmentsUpdated,
            );
            this.embeddedMessenger = messenger;
            messenger.receiveStyles((styles) => embeddedStylesheet.append(styles));
            messenger.postFrameLoaded({ contentId: containerId });
            messenger.postLoaded();

            analyticsTracker.checkoutBegin();

            const consignments = data.getConsignments();
            const cart = data.getCart();

            const hasMultiShippingEnabled =
                data.getConfig()?.checkoutSettings.hasMultiShippingEnabled;
            const checkoutBillingSameAsShippingEnabled =
                data.getConfig()?.checkoutSettings.checkoutBillingSameAsShippingEnabled ?? true;
            const buyNowCartFlag =
                data.getConfig()?.checkoutSettings.features['CHECKOUT-3190.enable_buy_now_cart'] ??
                false;
            const removeStepNumbersFlag =
              data.getConfig()?.checkoutSettings.features['CHECKOUT-7255.remove_checkout_step_numbers'] ??
              false;
            const walletButtonsOnTopFlag =
              (data.getConfig()?.checkoutSettings.features['CHECKOUT-7222.checkout_settings_styling_section'] &&
              data.getUserExperienceSettings()?.walletButtonsOnTop) ??
              false;
            const defaultNewsletterSignupOption =
                data.getConfig()?.shopperConfig.defaultNewsletterSignup ??
                false;
            const isMultiShippingMode =
                !!cart &&
                !!consignments &&
                hasMultiShippingEnabled &&
                isUsingMultiShipping(consignments, cart.lineItems);

            this.setState({
                isBillingSameAsShipping: checkoutBillingSameAsShippingEnabled,
                isBuyNowCartEnabled: buyNowCartFlag,
                isHidingStepNumbers: removeStepNumbersFlag,
                isSubscribed: defaultNewsletterSignupOption,
                isWalletButtonsOnTop: walletButtonsOnTopFlag,
            });

            if (isMultiShippingMode) {
                this.setState({ isMultiShippingMode }, this.handleReady);
            } else {
                this.handleReady();
            }

            window.addEventListener('beforeunload', this.handleBeforeExit);
        } catch (error) {
            if (error instanceof Error) {
                this.handleUnhandledError(error);
            }
        }
    }

    render(): ReactNode {
        const { error, isHidingStepNumbers } = this.state;
        const { siteUrl } = this.props

        let errorModal = null;
        const termsAndConditionsUrl = siteUrl + '/pages/terms-and-conditions';

        if (error) {
            if (isCustomError(error)) {
                errorModal = (
                    <ErrorModal
                        error={error}
                        onClose={this.handleCloseErrorModal}
                        title={error.title}
                    />
                );
            } else {
                errorModal = <ErrorModal error={error} onClose={this.handleCloseErrorModal} />;
            }
        }

        return (
            <div className={classNames({ 'is-embedded': isEmbedded(), 'remove-checkout-step-numbers': isHidingStepNumbers })}>
                <div className="layout optimizedCheckout-contentPrimary">
                    {this.renderContent()}
                </div>
                <div id='checkout-footer-icons' style={{ display: 'flex', backgroundColor: '#fcfcfc', borderTop: '1px solid #ebebeb' }}>
                    <div style={{ width: '33%', padding: '2rem 0 2rem 2rem', textAlign: 'center' }}>
                        <p style={{ marginBottom: '0px' }}>Purchase Safely</p>
                        <img src="https://cdn.instasmile.com/new-website/images/purchase-safely.png" width={'25%'}></img>
                    </div>
                    <div style={{ width: '34%', padding: '2rem 0 2rem 0', textAlign: 'center' }}>
                        <p style={{ marginBottom: '1rem' }}>Convenient Payment</p>
                        <img src="https://cdn.instasmile.com/new-website/images/uk_payment_type_footer_nov_22_v2.png" width={'75%'}></img>
                    </div>
                    <div style={{ width: '33%', padding: '2rem 2rem 2rem 0', textAlign: 'center' }}>
                        <p style={{ marginBottom: '0px' }}>Fast Delivery</p>
                        <img src="https://cdn.instasmile.com/new-website/images/shipping-footer.png" width={'50%'}></img>
                    </div>
                </div>
                <div className="checkout-footer">
                        <ModalLink
                            body={this.renderRefundPolicyContent()}
                            header={
                                <ModalHeader>
                                    Refund policy
                                </ModalHeader>
                            }
                        >
                            Refund policy
                        </ModalLink>
                        <ModalLink
                            body={this.renderShippingPolicyContent()}
                            header={
                                <ModalHeader>
                                    Shipping policy
                                </ModalHeader>
                            }
                        >
                            Shipping policy
                        </ModalLink>
                        <ModalLink
                            body={this.renderPrivacyPolicyContent()}
                            header={
                                <ModalHeader>
                                    Privacy policy
                                </ModalHeader>
                            }
                        >
                            Privacy policy
                        </ModalLink>
                        <a
                            href={termsAndConditionsUrl}
                        >
                            Terms of service
                        </a>
                    </div>
                {errorModal}
            </div>
        );
    }

    private renderContent(): ReactNode {
        const { isPending, loginUrl, promotions = [], steps, cartUrl } = this.props;

        const { activeStepType, defaultStepType, isCartEmpty, isRedirecting, isWalletButtonsOnTop } = this.state;

        if (isCartEmpty) {
            return <EmptyCartMessage loginUrl={loginUrl} waitInterval={3000} />;
        }

        return (
            <LoadingOverlay hideContentWhenLoading isLoading={isRedirecting}>
                <div className="layout-main">
                    <div style={{paddingTop: '1.5rem'}}>
                        <a className="modal-header-link cart-modal-link" href={cartUrl} style={{display: 'flex', alignItems: 'center'}}>
                            <div className='arrowLeft'></div>
                            Edit Cart
                        </a>
                    </div>

                    <LoadingNotification isLoading={isPending} />

                    <PromotionBannerList promotions={promotions} />

                    {isWalletButtonsOnTop && <CheckoutButtonContainer
                        checkEmbeddedSupport={this.checkEmbeddedSupport}
                        onUnhandledError={this.handleUnhandledError}
                    />}

                    <ol className="checkout-steps">
                        {steps
                            .filter((step) => step.isRequired)
                            .map((step) =>
                                this.renderStep({
                                    ...step,
                                    isActive: activeStepType
                                        ? activeStepType === step.type
                                        : defaultStepType === step.type,
                                    isBusy: isPending,
                                }),
                            )}
                    </ol>
                </div>

                {this.renderCartSummary()}
            </LoadingOverlay>
        );
    }

    private renderStep(step: CheckoutStepStatus): ReactNode {
        switch (step.type) {
            case CheckoutStepType.Customer:
                return this.renderCustomerStep(step);

            case CheckoutStepType.Shipping:
                return this.renderShippingStep(step);

            case CheckoutStepType.Billing:
                return this.renderBillingStep(step);

            case CheckoutStepType.Payment:
                return this.renderPaymentStep(step);

            default:
                return null;
        }
    }

    private renderCustomerStep(step: CheckoutStepStatus): ReactNode {
        const { isGuestEnabled } = this.props;
        const {
            customerViewType = isGuestEnabled ? CustomerViewType.Guest : CustomerViewType.Login,
            isSubscribed,
            isWalletButtonsOnTop,
        } = this.state;

        return (
            <CheckoutStep
                {...step}
                heading={<TranslatedString id="customer.customer_heading" />}
                key={step.type}
                onEdit={this.handleEditStep}
                onExpanded={this.handleExpanded}
                suggestion={<CheckoutSuggestion />}
                summary={
                    <CustomerInfo
                        onSignOut={this.handleSignOut}
                        onSignOutError={this.handleError}
                    />
                }
            >
                <Customer
                    checkEmbeddedSupport={this.checkEmbeddedSupport}
                    isEmbedded={isEmbedded()}
                    isSubscribed={isSubscribed}
                    isWalletButtonsOnTop = {isWalletButtonsOnTop}
                    onAccountCreated={this.navigateToNextIncompleteStep}
                    onChangeViewType={this.setCustomerViewType}
                    onContinueAsGuest={this.navigateToNextIncompleteStep}
                    onContinueAsGuestError={this.handleError}
                    onReady={this.handleReady}
                    onSignIn={this.navigateToNextIncompleteStep}
                    onSignInError={this.handleError}
                    onSubscribeToNewsletter={this.handleNewsletterSubscription}
                    onUnhandledError={this.handleUnhandledError}
                    step={step}
                    viewType={customerViewType}
                />
            </CheckoutStep>
        );
    }

    private renderShippingStep(step: CheckoutStepStatus): ReactNode {
        const { hasCartChanged, cart, consignments = [] } = this.props;

        const { isBillingSameAsShipping, isMultiShippingMode } = this.state;

        if (!cart) {
            return;
        }

        return (
            <CheckoutStep
                {...step}
                heading={<TranslatedString id="shipping.shipping_heading" />}
                key={step.type}
                onEdit={this.handleEditStep}
                onExpanded={this.handleExpanded}
                summary={consignments.map((consignment) => (
                    <div className="staticConsignmentContainer" key={consignment.id}>
                        <StaticConsignment
                            cart={cart}
                            compactView={consignments.length < 2}
                            consignment={consignment}
                        />
                    </div>
                ))}
            >
                <LazyContainer loadingSkeleton={<AddressFormSkeleton />}>
                    <Shipping
                        cartHasChanged={hasCartChanged}
                        isBillingSameAsShipping={isBillingSameAsShipping}
                        isMultiShippingMode={isMultiShippingMode}
                        navigateNextStep={this.handleShippingNextStep}
                        onCreateAccount={this.handleShippingCreateAccount}
                        onReady={this.handleReady}
                        onSignIn={this.handleShippingSignIn}
                        onToggleMultiShipping={this.handleToggleMultiShipping}
                        onUnhandledError={this.handleUnhandledError}
                        step={step}
                    />
                </LazyContainer>
            </CheckoutStep>
        );
    }

    private renderBillingStep(step: CheckoutStepStatus): ReactNode {
        const { billingAddress } = this.props;

        return (
            <CheckoutStep
                {...step}
                heading={<TranslatedString id="billing.billing_heading" />}
                key={step.type}
                onEdit={this.handleEditStep}
                onExpanded={this.handleExpanded}
                summary={billingAddress && <StaticBillingAddress address={billingAddress} />}
            >
                <LazyContainer loadingSkeleton={<AddressFormSkeleton />}>
                    <Billing
                        navigateNextStep={this.navigateToNextIncompleteStep}
                        onReady={this.handleReady}
                        onUnhandledError={this.handleUnhandledError}
                    />
                </LazyContainer>
            </CheckoutStep>
        );
    }

    private renderPaymentStep(step: CheckoutStepStatus): ReactNode {
        const { consignments, cart, errorLogger } = this.props;

        return (
            <CheckoutStep
                {...step}
                heading={<TranslatedString id="payment.payment_heading" />}
                key={step.type}
                onEdit={this.handleEditStep}
                onExpanded={this.handleExpanded}
            >
                <LazyContainer loadingSkeleton={<ChecklistSkeleton />}>
                    <Payment
                        checkEmbeddedSupport={this.checkEmbeddedSupport}
                        errorLogger={errorLogger}
                        isEmbedded={isEmbedded()}
                        isUsingMultiShipping={
                            cart && consignments
                                ? isUsingMultiShipping(consignments, cart.lineItems)
                                : false
                        }
                        onCartChangedError={this.handleCartChangedError}
                        onFinalize={this.navigateToOrderConfirmation}
                        onReady={this.handleReady}
                        onSubmit={this.navigateToOrderConfirmation}
                        onSubmitError={this.handleError}
                        onUnhandledError={this.handleUnhandledError}
                    />
                </LazyContainer>
            </CheckoutStep>
        );
    }

    private renderCartSummary(): ReactNode {
        return (
            <MobileView>
                {(matched) => {
                    if (matched) {
                        return (
                            <LazyContainer>
                                <CartSummaryDrawer />
                            </LazyContainer>
                        );
                    }

                    return (
                        <aside className="layout-cart">
                            <LazyContainer>
                                <CartSummary />
                            </LazyContainer>
                        </aside>
                    );
                }}
            </MobileView>
        );
    }

    private navigateToStep(type: CheckoutStepType, options?: { isDefault?: boolean }): void {
        const { clearError, error, steps } = this.props;
        const { activeStepType } = this.state;
        const step = find(steps, { type });

        if (!step) {
            return;
        }

        if (activeStepType === step.type) {
            return;
        }

        if (options && options.isDefault) {
            this.setState({ defaultStepType: step.type });
        } else {
            this.setState({ activeStepType: step.type });
        }

        if (error) {
            clearError(error);
        }
    }

    private handleToggleMultiShipping: () => void = () => {
        const { isMultiShippingMode } = this.state;

        this.setState({ isMultiShippingMode: !isMultiShippingMode });
    };

    private navigateToNextIncompleteStep: (options?: { isDefault?: boolean }) => void = (
        options,
    ) => {
        const { steps, analyticsTracker } = this.props;
        const activeStepIndex = findIndex(steps, { isActive: true });
        const activeStep = activeStepIndex >= 0 && steps[activeStepIndex];

        if (!activeStep) {
            return;
        }

        const previousStep = steps[Math.max(activeStepIndex - 1, 0)];

        if (previousStep) {
            analyticsTracker.trackStepCompleted(previousStep.type);
        }

        this.navigateToStep(activeStep.type, options);
    };

    private navigateToOrderConfirmation: (orderId?: number) => void = (orderId) => {
        const { steps, analyticsTracker } = this.props;
        const { isBuyNowCartEnabled } = this.state;

        analyticsTracker.trackStepCompleted(steps[steps.length - 1].type);

        if (this.embeddedMessenger) {
            this.embeddedMessenger.postComplete();
        }

        this.setState({ isRedirecting: true }, () => {
            navigateToOrderConfirmation(isBuyNowCartEnabled, orderId);
        });
    };

    private checkEmbeddedSupport: (methodIds: string[]) => boolean = (methodIds) => {
        const { embeddedSupport } = this.props;

        return embeddedSupport.isSupported(...methodIds);
    };

    private handleCartChangedError: (error: CartChangedError) => void = () => {
        this.navigateToStep(CheckoutStepType.Shipping);
    };

    private handleConsignmentsUpdated: (state: CheckoutSelectors) => void = ({ data }) => {
        const { hasSelectedShippingOptions: prevHasSelectedShippingOptions, activeStepType } =
            this.state;

        const { steps } = this.props;

        const newHasSelectedShippingOptions = hasSelectedShippingOptions(
            data.getConsignments() || [],
        );

        if (
            prevHasSelectedShippingOptions &&
            !newHasSelectedShippingOptions &&
            findIndex(steps, { type: CheckoutStepType.Shipping }) <
                findIndex(steps, { type: activeStepType })
        ) {
            this.navigateToStep(CheckoutStepType.Shipping);
            this.setState({ error: new ShippingOptionExpiredError() });
        }

        this.setState({ hasSelectedShippingOptions: newHasSelectedShippingOptions });
    };

    private handleCloseErrorModal: () => void = () => {
        this.setState({ error: undefined });
    };

    private handleExpanded: (type: CheckoutStepType) => void = (type) => {
        const { analyticsTracker } = this.props;

        analyticsTracker.trackStepViewed(type);
    };

    private handleUnhandledError: (error: Error) => void = (error) => {
        this.handleError(error);

        // For errors that are not caught and handled by child components, we
        // handle them here by displaying a generic error modal to the shopper.
        this.setState({ error });
    };

    private handleError: (error: Error) => void = (error) => {
        const { errorLogger } = this.props;

        errorLogger.log(error);

        if (this.embeddedMessenger) {
            this.embeddedMessenger.postError(error);
        }
    };

    private handleEditStep: (type: CheckoutStepType) => void = (type) => {
        this.navigateToStep(type);
    };

    private handleReady: () => void = () => {
        this.navigateToNextIncompleteStep({ isDefault: true });
    };

    private handleNewsletterSubscription: (subscribed: boolean) => void = (subscribed) => {
        this.setState({ isSubscribed: subscribed });
    }

    private handleSignOut: (event: CustomerSignOutEvent) => void = ({ isCartEmpty }) => {
        const { loginUrl, cartUrl, isPriceHiddenFromGuests, isGuestEnabled } = this.props;

        if (isPriceHiddenFromGuests) {
            if (window.top) {
                return (window.top.location.href = cartUrl);
            }
        }

        if (this.embeddedMessenger) {
            this.embeddedMessenger.postSignedOut();
        }

        if (isGuestEnabled) {
            this.setCustomerViewType(CustomerViewType.Guest);
        }

        if (isCartEmpty) {
            this.setState({ isCartEmpty: true });

            if (!isEmbedded()) {
                if (window.top) {
                    return window.top.location.assign(loginUrl);
                }
            }
        }

        this.navigateToStep(CheckoutStepType.Customer);
    };

    private handleShippingNextStep: (isBillingSameAsShipping: boolean) => void = (
        isBillingSameAsShipping,
    ) => {
        this.setState({ isBillingSameAsShipping });

        if (isBillingSameAsShipping) {
            this.navigateToNextIncompleteStep();
        } else {
            this.navigateToStep(CheckoutStepType.Billing);
        }
    };

    private handleShippingSignIn: () => void = () => {
        this.setCustomerViewType(CustomerViewType.Login);
    };

    private handleShippingCreateAccount: () => void = () => {
        this.setCustomerViewType(CustomerViewType.CreateAccount);
    };

    private setCustomerViewType: (viewType: CustomerViewType) => void = (customerViewType) => {
        const { canCreateAccountInCheckout, createAccountUrl } = this.props;

        if (
            customerViewType === CustomerViewType.CreateAccount &&
            (!canCreateAccountInCheckout || isEmbedded())
        ) {
            if (window.top) {
                window.top.location.replace(createAccountUrl);
            }

            return;
        }

        this.navigateToStep(CheckoutStepType.Customer);
        this.setState({ customerViewType });
    };

    private handleBeforeExit: () => void = () => {
        const { analyticsTracker } = this.props;

        analyticsTracker.exitCheckout();
    }

    private renderRefundPolicyContent(): ReactNode {
        const { siteUrl } = this.props;
        const contactUsUrl = siteUrl + '/pages/contact-us';

        return (
            <>
                <p><strong>RIGHT TO CANCEL (REFUND POLICY)</strong></p>
                <ol>
                    <li>Your right to cancel will not apply if we have already started manufacturing your Veneers. We deem manufacturing to have commenced once your physical impressions have been accepted and scanned into our system.</li>
                    <li>You may be entitled to cancel this contract within 14 days of receiving the Self-Impression Kit (cooling off period), provided it has not been used.</li>
                    <li>To meet the cancellation deadline, you must let us know that you wish to exercise your right to cancel before the 14-day cancellation period expires by contacting us. <a href={contactUsUrl} target="_top">Our details are set out here</a>.</li>
                    <li>We will request that you return your unopened self impressions kit in a resellable condition (together with any free gifts) using a tracked service at your own cost.&nbsp; If these are not received within 21 days of the cancellation, or they are not in a&nbsp; resellable condition, an administration charge of £129 will apply.&nbsp;</li>
                    <li>You are not permitted to use the returns label if you have opted to cancel your order. If you use the returns label after cancellation then we will apply a charge of £25. Likewise if you refuse delivery from us we also reserve the right to apply a charge of £25.</li>
                    <li>If you have used the Self-Impression Kit but still wish to cancel the contract, you may do so, however you will be liable to pay a £129 administrative fee.&nbsp; Once you have commenced the impressions process, your cooling off period ends even if this is within 14 days.</li>
                    <li>If you cancel this contract we will reimburse to you all payments received from you, less the £129 administrative fee (if applicable). We will make the reimbursement without undue delay, and not later than:</li>
                </ol>
                <ul>
                    <li>21 days after we have approved your cancellation. Or</li>
                    <li>if the Self-Impression Kit was not supplied, 21 days after the day on which we are informed about your decision to cancel this contract.</li>
                </ul>
                <ol>
                    <li>We will make the reimbursement to the original payment method only as you used for the initial transaction, unless we have expressly agreed otherwise; in any event, you will not incur any fees as a result of the reimbursement.</li>
                    <li>If you are deemed unsuitable for the Instasmile, we will cancel the order and return any monies paid to date and/or cancel your finance plan. We will retain an administration fee to cover our costs which will be advised to you at the time unless you are still within your cooling off period and have not used your kit, and are able to return it to us.</li>
                </ol>
                <p>Please note</p>
                <ul>
                    <li>Any purchased impressions materials are non refundable.</li>
                    <li>If you have paid via a payment plan we will reduce the value of the plan to the relevant fee and we will still 'collect' the payments until this has been cleared</li>
                </ul>
            </>
        );
    }

    private renderShippingPolicyContent(): ReactNode {
        return (
            <>
                <p><strong>DELIVERY</strong></p>
                <ol>
                    <li>We use a courier service to deliver our Products to you. They may be sent either to the shipping address provided at the time you place your Order, or to a designated parcel collection point. We will provide further delivery information to you after you have placed your Order.</li>
                    <li>Our delivery information will be communicated to you when you place an Order with us, and will depend on what is being delivered to you, as follows:</li>
                </ol>
                <p>2.1. Self-Impression Kit : we will dispatch this on the next working day after your order has been placed</p>
                <p>2.2. Veneers : your estimated delivery date will be within 21 days from the date we have received an accurate impression that it is suitable for us to use to manufacture your Veneers. We also have an express manufacturing option if you would like your Veneers delivered sooner.</p>
                <p><strong>Events outside our control</strong></p>
                <p>We are not responsible for delays in providing the Products to you for reasons outside our control. However, if something happens which means that there will be a delay in delivering the Products to you, we will contact you as soon as possible and will take such reasonable steps to minimise the delay.</p>
                <p><strong>If you are not at home when the products are delivered</strong></p>
                <p>If no one is available at your shipping address to take delivery our chosen courier will leave you a note informing you of how to rearrange delivery or collect the Products from a local collection point.</p>
                <p><strong>If you do not re-arrange delivery i.e.</strong></p>
                <ul>
                    <li>do not collect the Products as arranged;</li>
                    <li>refuse delivery of the Products; or</li>
                    <li>after a failed delivery to you, you do not re-arrange delivery or collect them from a delivery depot,</li>
                </ul>
                <p>We will contact you for further instructions and may charge you for storage costs and any further delivery costs. If, despite our reasonable efforts, we are unable to contact you or re-arrange delivery or collection we may end the contract in line with the above terms.</p>
                <p><strong>Risk and ownership of the Products</strong></p>
                <p>Delivery of the Products will take place when we deliver them to the address that you gave to us.</p>
                <p>You are responsible for the Products when delivery has taken place. In other words, the risk in the Products passes to you when you take possession of the Products (which includes if the Products are left in your chosen 'safe-place', such as an outbuilding or porch).</p>
                <p><strong>When you own the Products</strong></p>
                <p>You own the Veneers only once payment in full has been received and we deliver them to the shipping address you gave us when you made the Order.</p>
                <p>You own the Self-Impression Kit from the point you receive it.</p>
                <p><strong>Excluded locations</strong></p>
                <p>Unfortunately, we do not deliver to the following territories: Belarus, Burma/Myanmar, Democratic Republic of Congo, Eritrea, Former Federal Republic of Yugoslavia &amp; Serbia, International Criminal Tribunal for The Former Yugoslavia, Iran, Iraq, Ivory Coast, Lebanon and Syria, Liberia, North Korea (Democratic People's Republic of Korea), Republic of Guinea, Somalia, Sudan, Zimbabwe, Cuba or the Balkans. Please note that we do have a number of international websites which can be accessed using the links in the tab at the top of our website.</p>
            </>
        );
    }

    private renderPrivacyPolicyContent(): ReactNode {
        const { siteUrl } = this.props;
        const contactUsUrl = siteUrl + '/pages/contact-us';
        const termsAndConditionsUrl = siteUrl + '/pages/terms-and-conditions';

        return (
            <>
                <p>Thank you for visiting&nbsp;<a href={siteUrl} target="_top">{siteUrl}</a>&nbsp;(the “Web Site”). Your privacy is important to us. To better protect your privacy, we provide this notice explaining our online information practices and the choices you can make about the way your information is collected and used at this site. All capitalised terms not defined in this Privacy policy shall have the meanings assigned to them in the Terms and conditions for use of the Web Site,&nbsp;<a href={termsAndConditionsUrl} target="_top">located here</a>. From time to time we may update this Privacy Policy. When we do, we will publish the changes on this Web Site. If you do not agree to these changes, please do not continue to use the Web Site. If material changes are made to this Privacy Policy, we will notify you placing a prominent notice of the Web Site.</p>
                <h4>The information we collect</h4>
                <p>In order to purchase an instasmile product, this site requires that User provides certain personal information. The types of personally identifiable information that we collect may include: name, address, email address, telephone number, fax number and credit card information. The Web Site also allows you to submit information about other people. For example, you might submit a person’s information to purchase a gift for that person. The types of personally identifiable information that may be collected about other people at these pages may include: recipient’s name, address, email address, and telephone number.</p>
                <p>We also automatically collect certain information when you visit the Web Site, such as the type of browser you are using (e.g., Google Chrome, Internet Explorer etc), the type of operating system you are using, (e.g., Windows XP or Mac OS) the domain name of your Internet service provider (e.g., America Online, Earthlink) and collect information on site navigation. We employ third party experts to help us analyse this information, however, we ensure that anyone we employ treats all of the information with the same sensitivity and security that we treat it.</p>
                <h4>How we use the information</h4>
                <p>We sometimes use this information to communicate with you, such as to notify you when we make changes to our subscriber agreements, to fulfil an online order for instasmile products, to answer your enquiries or to contact you about issues regarding your account with us. From time to time we would like to send you information about our products and services. We may occasionally use your information to carry out customer and market research. For this purpose we may contact you via letter, phone, SMS or email. You may opt-out of receiving such information by selecting the relevant option on our website when you place an order or by sending us an email at&nbsp;<a href="mailto:info@instasmile.com" target="_top">info@instasmile.com</a>&nbsp;. We will only use the information that you provide about others to enable us to send them the relevant products which you have purchased for them.</p>
                <p>We will also use the information collected about your computer and your browser settings to improve the design and content of our site and to enable us to provide a more tailored interface for individual Users.</p>
                <p>We may also use this information in aggregate (so that no individuals are identified) to analyse site usage and for strategic development purposes. Furthermore, there may be occasions where we are under a legal obligation to disclose a User’s personally identifiable information, for example, in response to a court order or a law enforcement agency’s request.</p>
                <h4>Information we do not collect</h4>
                <p>We do not store any credit or debit card details or our customers. All transactions are handled by PayPal.</p>
                <h4>Use of cookies</h4>
                <p>A cookie is a small piece of information sent by a web server to a web browser, which enables the server to collect information from the browser. Find out more about the use of cookies on&nbsp;<a href="http://www.allaboutcookies.org/" target="_top" aria-describedby="forwarding-external-message">http://www.allaboutcookies.org/&nbsp;</a>. We use cookies to identify you when you visit this website and to keep track of your browsing patterns and build up a demographic profile. Our use of cookies also allows registered users to be presented with a personalised version of the site, carry out transactions and have access to information about their account. Most browsers allow you to turn off cookies or to receive a warning before a cookie is stored on your hard drive. Please refer to your browser instructions or help screen to learn more about how to do this. However, should you decide to disable any cookies we place on your computer you may not be able to use certain services or facilities on the Web Site.</p>
                <h4>Disclosure</h4>
                <p>We will only disclose personal information to agents and contractors of instasmile who are engaged to process data on our behalf. Such organisations are required to protect this information in a manner that is consistent with this Privacy Notice by, for example, not using the information for any purpose other than to carry out the services they are performing for instasmile.</p>
                <h4>Internet-based transfers</h4>
                <p>Given that the Internet is a global environment, using the Internet to collect and process personal data necessarily involves the transmission of data on an international basis. Therefore, by browsing this website and communicating electronically with us, you acknowledge our processing of personal data in this way. However, we will endeavour to protect all personal information collected through this website in accordance with strict data protection standards.</p>
                <h4>Our commitment to security</h4>
                <p>We have put in place appropriate physical, electronic, and managerial procedures to safeguard and help prevent unauthorised access, maintain data security, and correctly use the information we collect online.</p>
                <h4>How you can access or correct information</h4>
                <p>For instructions on how you can access the personally identifiable information that this instasmile site has collected about you online, or how to correct factual errors in such information, please contact us at&nbsp;<a href="mailto:info@instasmile.com" target="_top">info@instasmile.com</a>&nbsp;. To protect your privacy and security, we will take reasonable steps to help verify your identity before granting access or making corrections.</p>
                <h4>Klarna's Privacy Policy</h4>
                <p>In order to offer you Klarna’s payment methods, we might in the checkout pass your personal data in the form of contact and order details to Klarna, in order for Klarna to assess whether you qualify for their payment methods and to tailor those payment methods for you. Your personal data transferred is processed in line with<span>&nbsp;</span><a href="https://www.klarna.com/international/privacy-policy/" target="_blank" aria-describedby="forwarding-external-new-window-message">Klarna’s own privacy notice</a>.</p>
                <h4>How to contact us</h4>
                <p>If you have any questions or concerns about this policy or its implementation you may&nbsp;<a href={contactUsUrl} target="_top">contact us here</a>.</p>
            </>
        );
    }
}

export default withAnalytics(withLanguage(withCheckout(mapToCheckoutProps)(Checkout)));

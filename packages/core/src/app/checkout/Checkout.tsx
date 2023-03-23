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
        let errorModal = null;

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
                        <ModalLink
                            body={this.renderTermsOfServiceContent()}
                            header={
                                <ModalHeader>
                                    Terms of service
                                </ModalHeader>
                            }
                        >
                            Terms of service
                        </ModalLink>
                    </div>
                {errorModal}
            </div>
        );
    }

    private renderContent(): ReactNode {
        const { isPending, loginUrl, promotions = [], steps } = this.props;

        const { activeStepType, defaultStepType, isCartEmpty, isRedirecting, isWalletButtonsOnTop } = this.state;

        if (isCartEmpty) {
            return <EmptyCartMessage loginUrl={loginUrl} waitInterval={3000} />;
        }

        return (
            <LoadingOverlay hideContentWhenLoading isLoading={isRedirecting}>
                <div className="layout-main">
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

    private renderTermsOfServiceContent(): ReactNode {
        const { siteUrl } = this.props;
        const contactUsUrl = siteUrl + '/pages/contact-us';
        const suitabilityUrl = siteUrl + '/pages/faq';
        const privacyPolicyUrl = siteUrl + '/pages/privacy-policy';
        const kitGuideUrl = siteUrl + '/pages/impression-kit-guide';

        return (
            <>
                <p><strong>OUR TERMS OF SALE</strong></p>
                <p>Please note that the Company provides products which are temporary removable appliances solely intended to be aesthetic in nature.</p>
                <p>The Company has no dental professionals and does not carry out the practice of dentistry in any manner - we do not engage in any diagnosis and do not provide any products which have any therapeutic effect. The Company neither offers professional advice nor provides any treatment or other dental or medical service. Some aesthetic issues may be due to underlying dental and/or medical problems. If you have any queries or concerns regarding the suitability of any of our products, you experience any adverse symptoms, or you have any condition which requires the attention of a professional, please consult your dentist, medical doctor, or other licensed professionals.</p>
                <p><strong>THESE TERMS</strong></p>
                <p>These are the terms and conditions on which we supply products to you (terms). They set out your legal rights and responsibilities, our legal rights and responsibilities, and certain key information required by law.</p>
                <p>Please read these terms carefully before you submit your order to us. These terms tell you who we are, how we will provide products to you, how you and we may change or end the contract, what to do if there is a problem and other important information.</p>
                <p><strong>In these terms, the following definitions apply:</strong></p>
                <p>Products means, together, the Self-Impression Kit, the Veneers, and any other products we may supply to you;</p>
                <p>Self-Impression Kit means the self-impression kit we send out to you to allow you to take an accurate impression of your teeth;</p>
                <p>Veneers means the specific instasmile clip-on veneers you have chosen to purchase from us.</p>
                <p><strong>KEY TERMS</strong></p>
                <p>While you should be familiar and agree with all our terms before you decide to place an Order, it is particularly important that we draw your attention to the following key terms:</p>
                <p><strong>Cancelation and Refunds</strong></p>
                <p>The Veneers are customised to your particular measurements and cannot be used on anyone else. Therefore, once we have started manufacturing the Veneers, <em>you will not be entitled to cancel your contract with us nor receive a refund.</em></p>
                <p><strong>Our disclaimer</strong></p>
                <p>Please note that the Veneers are made from dental grade material and are solely intended to be removable and aesthetic in nature. We do not carry out the practice of dentistry in any manner, and we do not engage in any diagnosis and do not provide Veneers which have any therapeutic effects.</p>
                <p>We will not be held liable to you if our Products are not suitable for you. Your use of our Products is at your own risk and it is your responsibility to decide if they are suitable for you. If you have any allergies or any other conditions, please consult your dentist or doctor before using our Products. Likewise, if you develop any adverse symptoms from the use of our Products, please seek professional medical advice.</p>
                <p><strong>USE OF OUR PRODUCTS</strong></p>
                <p><strong>Eating and drinking</strong></p>
                <p>instasmile products are designed to allow you to eat and drink as normal as they dont (where possible) cover your molars (chewing teeth) once in situ. As with any lifestyle product there is always a chance that eating and drinking could on rare occasions damage the product for which we cannot be held liable and should therefore be done so at your own risk.</p>
                <p><strong>Side effects</strong></p>
                <p>There should be no side effects from using the products unless you have an underlying health issue. If you experience any side effects, you should cease use of the Products immediately and consult your dentist or medical doctor. If you have any allergies or known chemical sensitivity, you should inform us before placing your order.</p>
                <p>You accept that unless we have been negligent, we will not be held liable for any loss, damages or injury associated with applying for, accepting, or using the Products. We will not be responsible if you develop any allergies or adverse reactions as a result of using the Products.</p>
                <p><strong>Age restriction</strong></p>
                <p>If you are under the age of 18 you may not buy Veneers from us unless parental or guardian consent has been given.</p>
                <p><strong>Limit of liability</strong></p>
                <p>Our liability to you is limited, please read these terms in full.</p>
                <p><strong>LIMIT ON OUR RESPONSIBILITY TO YOU</strong></p>
                <ol>
                    <li>The Veneers are intended to be a cosmetic accessory only and are not suitable for everyone. You should only use them if you do not have any significant health issues. You must also answer our suitability questions correctly to help us determine if the Veneers are suitable for you.</li>
                    <li>WE MAKE NO OTHER WARRANTIES OTHER THAN AS EXPRESSLY STATED IN THESE TERMS, AND EXPRESSLY REJECT AND DISCLAIM ANY AND ALL OTHER WARRANTIES OF ANY NATURE, TYPE, AND/OR EXTENT WHATSOEVER, INCLUDING BUT NOT LIMITED TO FITNESS FOR A PARTICULAR PURPOSE, MERCHANTABILITY, AND ANY OTHER ITEMS.</li>
                    <li>IN ABSENCE OF ANY NEGLIGENCE OR OTHER BREACH OF DUTY BY US, OUR LIABILITY TO YOU WILL BE EXPRESSLY LIMITED TO REFUNDING TO YOU THE PRICE PAID FOR THE PRODUCTS. ANY AND ALL CLAIMS FOR CONSEQUENTIAL, INDIRECT, AND/OR PUNITIVE DAMAGES ARE EXPRESSLY WAIVED.</li>
                </ol>
                <p><strong>WHO WE ARE AND HOW TO CONTACT US</strong></p>
                <p>' We' , 'us' or 'our' means Smile Lab Solutions Limited (reg. number 12329900 ) trading as ‘instasmile’. Our principal place of business in the United Kingdom is located at Unity House, Westwood Park Drive, Wigan, Lancashire, WN3 4HE</p>
                <p>' You' or 'your' means the person using our site to buy Products from us.</p>
                <p>If you want to contact us, please refer to our <a href={contactUsUrl} target="_top">customer contact page</a>.</p>
                <p>If we have to contact you we will do so by telephone or by writing to you at the email address or postal address you provided to us when placing your Order.</p>
                <p>"Writing" includes emails. When we use the words "writing" or "written" in these terms, this includes emails.</p>
                <p><strong>OUR CONTRACT WITH YOU</strong></p>
                <p>Below, we set out how a legally binding contract between us and you is made. The governing jurisdiction resides in the United Kingdom.</p>
                <p>You place an order on our website by following our 'Get Started' tool, where we will ask you a series of questions to help us determine the best type of Veneers for you ( Order ). Please note that if you give false or misleading information regarding your suitability for our Products, we will not be held liable to you</p>
                <p>Please read and check your Order carefully before submitting it and correct any errors before confirming your Order.</p>
                <p>When you place your Order, we will acknowledge it by email. This acknowledgement does not, however, mean that your Order has been accepted.</p>
                <p>We may contact you to say that we do not accept your Order. This is typically for the following reasons:</p>
                <ul>
                    <li>the Veneers you would like to order are unavailable;</li>
                    <li>we cannot authorise your payment;</li>
                    <li>there has been a mistake on the pricing or description of the Veneers; or</li>
                    <li>we do not consider our Veneers to be suitable for you, due to issues you may have with your oral health, such as having gum disease (<a href={suitabilityUrl} target="_top">please refer to our suitability guide for further information</a>).</li>
                </ul>
                <p>Our acceptance of your Order will take place when we receive confirmation of a successful payment from you or payment plan creation. We will then confirm your Order number.</p>
                <p>By accepting our terms and placing an Order with us, a legally binding contract will be in place between you and us.</p>
                <p><strong>OUR RIGHTS TO END OUR CONTRACT WITH YOU</strong></p>
                <p>1 We may terminate the contract if you are in breach if at any time:</p>
                <p>1.1. you do not make any payment to us or a third party finance provider when it is due and you continue to not make payment within 7 days of us or the payment provider reminding you that such payment is due;</p>
                <p>1.2. you do not, within 90 days of us asking for it, provide us with information that is necessary for us to manufacture the Veneers, for example, your completed Self-Impression Kit, or your Impressions measurements;</p>
                <p>1.3 it becomes apparent that you have provided us with dishonest information during the suitability assessment and we do not consider our Veneers to be suitable for you;</p>
                <p>1.4 you do not, within 90 days, provide us with the information we need to allow us to deliver the Products to you or if the Products are returned to us after attempted delivery;</p>
                <p>1.5 you move address or change the delivery address without letting us know and we are unable to deliver the Products to you;</p>
                <p>1.6 you make or publish any fraudulent, untrue, defamatory, threatening, abusive, offensive, obscene or otherwise inappropriate statements or allegations about us, our officers or our employees, online (including on social media) (we also retain the right to have such content removed);</p>
                <p>1.7 your Order with us was placed over 12 months ago and you have not been in contact with us for a period of 6 months or more.</p>
                <p>1.8 If we end our contract with you under this clause, we reserve the right to cancel your contract immediately without any recourse.</p>
                <p>1.9 If your account has ever been in default and you wish to cancel the order we reserve the right to charge an additional administration fee.</p>
                <ol>
                    <li>If you have been granted a free gift as part of your order and you cancel your order we reserve the right to charge a discretionary administration fee.</li>
                </ol>
                <p><strong>PERSONAL INFORMATION</strong></p>
                <ol>
                    <li>We will use the personal information you provide to us to supply the Products to you and to process your payment for the Products, and to contact you about similar products we have (if you have chosen to receive this from us).</li>
                    <li>Please refer to our <a href={privacyPolicyUrl} target="_top">Privacy Policy</a> for further information about how and why we process your personal data.</li>
                </ol>
                <p><strong>DISPUTES &amp; CHARGEBACKS</strong></p>
                <ol>
                    <li>If you are unhappy with the Products, our service to you, or anything else, please <a href={contactUsUrl} target="_top">contact us</a> on our website and our dedicated customer care team will work with you to resolve the issue.</li>
                    <li>We will try to resolve any disputes with you quickly and efficiently. If your dispute becomes a chargeback your account will be suspended whilst we work with your finance provider or merchant to investigate the issue. The final decision on a chargeback sits with the merchant or finance provider and not us. Where a Chargeback is resolved in our favour, we reserve the right to cancel your contract with us immediately without any recourse. We therefore encourage you to work with us outside of any official chargeback process to try to achieve a mutual resolution.</li>
                </ol>
                <p><strong>OTHER IMPORTANT TERMS</strong></p>
                <ol>
                    <li>We may transfer this contract to someone else. We may transfer our rights and obligations under these terms to another organisation.</li>
                    <li>You need our consent to transfer your rights to someone else. You may only transfer your rights or your obligations under these terms to another person if we agree to this in writing.</li>
                    <li>Nobody else has any rights under your contract with us. This contract is between you and us. No other person shall have any rights to enforce any of its terms.</li>
                    <li>If a court finds part of these terms illegal, the rest will continue in force. Each paragraph of these terms operates separately. If any court or relevant authority decides that any of them are unlawful, the remaining paragraphs will remain in full force and effect.</li>
                    <li>Even if we delay in enforcing our rights under our contract with you, we can still enforce it later. If we do not insist immediately that you do anything you are required to do under these terms, or if we delay in taking steps against you if you have broken this contract, that will not mean that you do not have to do those things and it will not prevent us from taking steps against you at a later date. For example, if you miss a payment and we do not chase you but we still provide the Products, we can still require you to make the payment at a later date.</li>
                    <li>These terms are subject to change from time to time without notice as to any new customers and/or new orders placed by existing customers.</li>
                </ol>
                <p><strong>INTELLECTUAL PROPERTY RIGHTS</strong></p>
                <ol>
                    <li>Please note that you only own the Products for your personal use. We do not convey to you in any manner the technology, know-how, processes and procedures, formulae, patents, trademarks, copyrights, and/or any other intellectual property associated with the Products. You agree not to reverse-engineer or otherwise gain or attempt to gain access to our intellectual property.</li>
                    <li>If you do so and we suffer a loss as result, we may take legal action against you in respect of our losses, damages, costs (including legal fees) and expenses incurred by us as a result of or in connection with your misuse of our intellectual property rights.</li>
                </ol>
                <p><strong>NATURE OF THE GOODS</strong></p>
                <p>We must provide you with Products that comply with your legal rights under this Agreement and applicable law.</p>
                <p>The packaging of the Products may be different from that shown on our website.</p>
                <p>While we try to make sure that the colours of our Veneers are displayed accurately on our website, please note that the images of them on our website are for illustrative purposes only. Therefore, the image you see online may vary slightly from the Veneers you receive.</p>
                <p>Please note that if you place a repeat order for Veneers previously ordered, different material may be used.</p>
                <p><strong>Measurements</strong></p>
                <p>Our Veneers are custom made to our specifications, therefore it is your responsibility for ensuring that any information we require is accurate. This includes, but is not limited to:</p>
                <p><strong>Your use of our Self-Impression Kit</strong></p>
                <p>You are responsible for ensuring that these measurements and impressions are correct. Please refer to the <a href={kitGuideUrl} target="_top">guidance on our website</a>, or <a href={contactUsUrl} target="_top">contact us</a>, for tips on how to measure correctly;</p>
                <p><strong>Your use of our online suitability assessment</strong></p>
                <p>By taking our online suitability assessment, it is your responsibility to ensure that all information provided to us is correct. We recommend that you thoroughly check that all your data is correct before submitting it to us. If it becomes apparent during our review of your Impressions that you have provided inaccurate information at this stage, we may cancel your contract with us.</p>
                <p>We will not be held responsible for Veneers that don't fit or are unsuitable due to incorrect information supplied by you. Please refer to our information regarding warranties.</p>
                <p>If you are unsure if our product will be suitable for you, please contact us and we will answer any questions you have - we may ask for images of your natural teeth to make an assessment.&nbsp;</p>
                <p>If you are unsure of which product is best for you, or which shade to choose, we will advise you.</p>
                <p><strong>PRICE</strong></p>
                <p>The price of the Veneers:</p>
                <ul>
                    <li>is in GBP (£);</li>
                    <li>includes our delivery costs;</li>
                    <li>includes VAT. If VAT is applicable, such shall be charged and reflected on your order, together with the purchase price of the Veneers</li>
                </ul>
                <p>The price of the Veneers will be the price indicated on our website when you place your Order. We take all reasonable care to ensure that the price of the Veneers advised to you is correct. However please see the following for what happens if we discover an error in the price of the Veneers you have chosen.</p>
                <p><strong>What happens if we got the price wrong?</strong></p>
                <p>It is always possible that, despite our best efforts, some of our Veneers we sell may be incorrectly priced. We will normally check prices before accepting your Order so that, where a Veneer's correct price at your Order date is less than our stated price at your Order date, we will charge the lower amount. If the Veneer's correct price at your Order date is higher than the price stated to you, we will contact you for your instructions before we accept your Order. If we accept and process your Order where a pricing error is obvious and unmistakable and could reasonably have been recognised by you as a miss-pricing, we may end the contract, refund you any sums you have paid and require the return of any Products provided to you.</p>
                <p><strong>What to do if you think an invoice is wrong</strong></p>
                <p>If you think an invoice is wrong, please contact us promptly to let us know and we will attempt to resolve the issue.</p>
                <p><strong>PAYMENT</strong></p>
                <p><strong>When you must pay</strong></p>
                <p>You must pay for the Products before we dispatch them, except when entering into a finance agreement with one of our third party finance providers.</p>
                <p>You may pay for your Products using either:</p>
                <p>(1) Credit or Debit Card; or</p>
                <p>(2) by Consumer Finance.</p>
                <p>We offer a range of finance options with third party finance providers. Our current providers are listed in the Checkout Page on the website. Please note that these providers may undertake eligibility checks against you before offering you consumer finance. Separate terms and conditions may also apply which you should read in full.</p>
                <p>IF YOU ARE IN DEFAULT OF ANY PAYMENT PLAN, WE ARE UNABLE TO ASSESS ANY ISSUES YOU MAY HAVE IN RELATION TO THE PRODUCTS UNTIL YOUR PLAN IS BROUGHT UP TO DATE.&nbsp; THIS INCLUDES PROGRESSION OF YOUR ORDER, DISPATCH OF MATERIALS, MANUFACTURING WARRANTY CLAIMS, EXTENDED WARRANTY CLAIMS.</p>
                <p>IF YOU ARE IN DEFAULT OF ANY PAYMENT DUE TO US, WE RESERVE THE RIGHT TO PASS YOUR DETAILS TO A DEBT COLLECTION AGENCY AND SEEK LEGAL ACTION AGAINST YOU. YOU MAY BE LIABLE TO PAY OUR LEGAL COSTS OF DOING SO AND YOUR CREDIT RATING MAY ALSO BE AFFECTED. WE MAY ALSO CHARGE INTEREST AT A RATE EQUAL TO THE LESSER OF EIGHTEEN PERCENT (18%) PER ANNUM OR THE MAXIMUM ALLOWED BY LAW; SUCH INTEREST WILL ACCRUE DAILY UNTIL PAYMENT HAS BEEN MADE.</p>
                <p><strong>Security</strong></p>
                <p>We will do all that we reasonably can to ensure that all of the information you give us when placing your Order with us is secure by using an encrypted secure payment mechanism. However, in the absence of negligence on our part, any failure by us to comply with this contract or our <a href={privacyPolicyUrl} target="_top">Privacy Policy</a> or breach by us of our duties under applicable laws we will not be legally responsible to you for any loss that you may suffer if a third party gains unauthorised access to any information that you give us.</p>
                <p>PLEASE NOTE:&nbsp; If you have more than one order, and one of those orders is in default, we will be entitled to offset the amount paid in total towards the amount owed.&nbsp; Any exercise of our rights under this clause will not prevent us from enforcing any other rights we may have under these terms.</p>
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
                <p>Unfortunately, we do not deliver to the following territories: Belarus, Burma/Myanmar, Democratic Republic of Congo, Cuba, Eritrea, Former Federal Republic of Yugoslavia &amp; Serbia, International Criminal Tribunal for The Former Yugoslavia, Iran, Iraq, Ivory Coast, Lebanon and Syria, Liberia, North Korea (Democratic People's Republic of Korea), Republic of Guinea, Russia, Somalia, Sudan, Ukraine, Zimbabwe or the Balkans. Please note that we do have a number of international websites which can be accessed using the links in the tab at the top of our website.</p>
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
                <p><strong>SELF-IMPRESSION KIT</strong></p>
                <p>Before we can manufacture your chosen Veneers, we may send you a Self-Impression Kit unless we have agreed to use previous impressions on file.&nbsp; We will provide you with full instructions on how to use the Self-Impression Kit</p>
                <p><strong>Please note the Self-Impression Kit may not be suitable for you if:</strong></p>
                <ul>
                    <li>you have loose teeth (including loose crowns, bridges, or veneers) or you have had teeth recently removed;</li>
                    <li>you have existing oral health issues;</li>
                    <li>you are undergoing dental or orthodontic treatment;</li>
                    <li>you are allergic to silicone.</li>
                    <li>you have a fixed retainer</li>
                </ul>
                <p>If you have crowns, bridges, or existing veneers you must take extra care when using the Self-Impression Kit. We will not be held liable for any damage to any crowns, bridges, existing veneers or loose teeth.</p>
                <p>If, due to a build-up of plaque, your use of the Self-Impression Kit is affected, we will advise you to remove the plaque and then continue with the Impressions process.&nbsp; Likewise if there are any other issues, we will contact you.</p>
                <p><strong>When you have completed your Self-Impression Kit</strong></p>
                <p>You MUST provide photographs of your impressions to us by email for a visual check. We may also request images of your natural dental profile. Failure to do so may delay your order and could incur additional costs. We cannot accept impressions in the mail that have NOT been firstly approved by visual check.</p>
                <p>If your impressions are not approved, do not worry we will contact you with regards to repeating them and provide guidance.&nbsp; The impressions trays we provide can be remoulded up to 8 times each.</p>
                <p><strong>Once your impression photos have been approved</strong></p>
                <p>If we have provided a returns label, you must return these to us using this label.&nbsp;&nbsp; Please keep a record of the tracking number.&nbsp;</p>
                <p>If you do not have a returns label, you must post this back to us yourself: if doing so, we recommend that you use a tracked courier service to ensure your Self-Impression Kit gets delivered to us safely;</p>
                <p>If we do not receive your returned Self-Impression Kit, or if you have used your Self-Impression Kit incorrectly and we are unable to use the Impressions you have provided then:</p>
                <ul>
                    <li>we will contact you to arrange the sending out of a replacement Self-Impression Kit;</li>
                    <li>we may charge you for the cost of any such replacement kit depending upon the circumstances;</li>
                </ul>
                <p>If you fail to commence the impressions process, and we are unable to contact you for a period of 90 days from the date of your Order, we may treat the contract as cancelled. It is important that you therefore contact us at this time to mitigate cancellation.</p>
                <p>Please note that freepost return labels are only available in the following territories: United States, United Kingdom, Australia. If you do not live in any of these territories it is your responsibility to return all impressions back to us at your own cost (including any duties and taxes) using a tracked and signed service. Please note that items cannot be accepted by us if duties and taxes have not been paid in advance by you.</p>
                <p><strong>CHANGES TO YOUR ORDER</strong></p>
                <p><strong>Your right to make changes</strong></p>
                <p>If you wish to make a change to the Veneers you have ordered, please contact us as soon as possible, as once we have started manufacturing your Veneers, no changes can be made.</p>
                <p>We will let you know if the change is possible. If it is possible we will let you know about any changes to the price of the Products, the delivery date, or anything else which would be necessary as a result of your requested change. We will ask you to confirm whether you wish to go ahead with the change.</p>
                <p><strong>Our rights to make changes</strong></p>
                <p>We may change any of the Products listed on our website without notice:</p>
                <ul>
                    <li>to reflect changes in relevant laws and regulatory requirements;</li>
                    <li>to reflect changes in technology; and</li>
                    <li>to implement technical adjustments and improvements, for example to address a health and safety or cosmetic concern.</li>
                </ul>
                <p>If you have already placed an order with us and we need to change your chosen Product for one or more of the above reasons, we will let you know. You will be entitled to refuse to accept the substituted Product, in which case we will offer you a refund or a suitable replacement.</p>
                <p>Any changes we make to our Products will not materially affect your use of the Products.</p>
                <p><strong>Reorders</strong></p>
                <p>Please note that we may keep your completed impressions stored in our system. If your dental profile has not changed, and you are still wearing/have recently been wearing your previous instasmile, you may place an order with us for a new set of Veneers using your existing Impressions; subject to our internal checks.</p>
                <p><strong>If you decide to proceed with a re-order using existing impressions</strong></p>
                <ul>
                    <li>we cannot be held liable for any fit issues.</li>
                    <li>we cannot accept a re-order if you have a previous order in default.</li>
                </ul>
                <p><strong>You will be required to complete new Impressions if: </strong></p>
                <ul>
                    <li>your dental profile has changed in any way from the order that we are using the impressions.</li>
                </ul>
                <p><em>Changes to dental profile examples - loss of teeth, any fillings, crowns or breakage/chipping of the teeth</em></p>
                <p>Please note that if you reorder Veneers from us, the material, shape and profile of the veneers may differ slightly from your previous set of Veneers.</p>
                <p><strong>WARRANTY (REMAKE POLICY)</strong></p>
                <p>We provide all our customers with our 30-day manufacturer's warranty; we include a 6 months extended warranty with Classic and Dynamic instasmile with an option to purchase an additional 6 months cover at check out.</p>
                <p>Both warranties have limitations, including limitations for any liability as previously explained above.</p>
                <p><strong>Manufacturer's Warranty</strong></p>
                <p>We warrant to you that for a period of 30 days from the date of delivery your Veneers will:</p>
                <ul>
                    <li>conform in all material respects with their description;</li>
                    <li>be free from material defects in material;</li>
                    <li>be of satisfactory quality;</li>
                    <li>be fit for the sole purpose of the Veneers, which shall be expressly limited to helping to enhance aesthetic appearance.</li>
                </ul>
                <p>We want you to be happy with your custom made Instasmile veneers, however, in the event there is an issue we will work with you to achieve a resolution.&nbsp;</p>
                <p><strong>What if my instasmile does not fit?</strong></p>
                <p>If you experience an issue with the fit of your custom made veneers, you will need to notify us within 30 days of receiving them.&nbsp; You must not return the veneers to us at this point.</p>
                <p>We will ask you to provide images and a short video within 14 days of reporting this, which demonstrates the issue to allow our technicians to make a full assessment.</p>
                <p>If the technician is confident that we can remake the veneer for you and correct the issue, then you must allow us to do so. We will remake this free of charge and any materials required will be complimentary.&nbsp; There is no refund option at this stage.</p>
                <p>If for any reason we cannot remake the veneer we will discuss other options with you.</p>
                <p><strong>What if my veneers are not what I expected?</strong></p>
                <p>It is important to remember, a period of adjustment is to be expected when you first receive your product.</p>
                <p>If you have an issue (i.e. design or shade of the veneers), you will need to notify us within 30 days, and provide us with images of the product fitted to your teeth, within 14 days of reporting this.</p>
                <p>If you have not previously sent us images of your natural teeth please also provide these to help with the assessment.</p>
                <p>The technician will make an assessment and where necessary provide a solution which may or may not incur a fee, depending on the suggested outcome (e.g. a different shade).&nbsp;</p>
                <p>In some cases the warranty claim may not be successful if the veneer fits well and offers a cosmetic uplift on your natural teeth.&nbsp; In this case no remake or refund will be provided.</p>
                <p><strong>What if my veneers break within 30 days of receiving them?</strong></p>
                <p>On the rare occasion this happens we will make an assessment under the manufacturer’s warranty to see if an adjustment to the design is required - e.g. if the bite is causing pressure points.&nbsp;</p>
                <p>PLEASE NOTE: The 30 day Manufacturer's warranty does not cover wear and tear, loss or accidental damage, attempts to self repair or self modify, but there are some instances where a remake will be approved subject to the technician's assessment. Where this is not covered under the Manufacturer's Warranty you may be able to claim for a like for like replacement under your extended warranty.</p>
                <p><strong>Sending Visual Evidence</strong></p>
                <p>When sending evidence we will need to see:</p>
                <ul>
                    <li>Description of the issue</li>
                    <li>Clear images with the product in the mouth showing the issue</li>
                    <li>Short video with the product being clipped on to teeth, and then removed</li>
                    <li>Natural bite image</li>
                </ul>
                <p>If you have not previously sent us images of your natural teeth please also provide these to help with the assessment.</p>
                <p><strong>Returning the Instasmile</strong></p>
                <p>In rare cases, we may ask for the product to be returned</p>
                <ul>
                    <li>For an adjustment if the Technicians feel this will resolve a fit issue (for which a returns label will be provided)</li>
                    <li>If a partial refund is being agreed, we would ask for the instasmile to be returned tracked and traced at your own cost</li>
                </ul>
                <p>You should not return the instasmile without being requested to do so.</p>
                <p><strong>Other Important Terms:</strong></p>
                <ul>
                    <li>If we agree a refund following an issue with the instamile it will be up to 75% of the order value depending on the issue, or the standard administration fee. We will discuss this with you at the time.</li>
                    <li>If you have paid via a payment plan we will reduce the value of the plan to the relevant fee and we will still 'collect' the payments until this has been cleared.</li>
                    <li>No full refunds will be provided after a product has been manufactured,</li>
                    <li>Please note if the issue is with only one arch, we will only assess a partial refund on this part of the order.</li>
                </ul>
                <p><strong>Extended Warranty</strong></p>
                <p>If you have our extended warranty and your Veneers become lost, damaged, or stolen, we will remake your Veneers for free - upto 2 arches on a dual order and 1 on a single order. Your warranty will commence on the date you receive your Instasmile.&nbsp;</p>
                <p>It is a condition of the warranty that any finance plans must be up to date or paid in full and we may need you to send us confirmation of this for some merchants.</p>
                <p>The extended warranty does not cover any fit issues which should have been addressed within 30 days of receiving the under the Manufacturer's Warranty.</p>
                <p>Replacements are like for like - and will be in the same design and shade as your original Instasmile.</p>
                <p>Before we can replace your veneer we will need you to confirm there has been no change to your dental profile and the original veneers fitted fine.</p>
                <p>Once we have all the information required, the timescale for your replacement is 15 days plus shipping.</p>
            </>
        );
    }
}

export default withAnalytics(withLanguage(withCheckout(mapToCheckoutProps)(Checkout)));

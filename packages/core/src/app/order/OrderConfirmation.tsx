import {
    CheckoutSelectors,
    EmbeddedCheckoutMessenger,
    EmbeddedCheckoutMessengerOptions,
    Order,
    StoreConfig,
} from '@bigcommerce/checkout-sdk';
import classNames from 'classnames';
import React, { Component, lazy, ReactNode } from 'react';
import { AnalyticsContextProps } from '@bigcommerce/checkout/analytics';
import { ErrorLogger } from '@bigcommerce/checkout/error-handling-utils';
import { CheckoutContextProps } from '@bigcommerce/checkout/payment-integration-api';
import { CartSummarySkeleton, LazyContainer, OrderConfirmationPageSkeleton } from '@bigcommerce/checkout/ui';

import { withAnalytics } from '../analytics';
import { withCheckout } from '../checkout';
import { ErrorModal } from '../common/error';
import { isExperimentEnabled, retry } from '../common/utility';
import { EmbeddedCheckoutStylesheet, isEmbedded } from '../embeddedCheckout';
import {
    CreatedCustomer,
    SignUpFormValues,
} from '../guestSignup';
import { MobileView } from '../ui/responsive';
import mapToOrderSummarySubtotalsProps from './mapToOrderSummarySubtotalsProps';
import PrintLink from './PrintLink';
import { loadOwlCarousel } from '../../../../../scripts/custom/orderConfirmation';

const OrderSummary = lazy(() =>
    retry(
        () =>
            import(
                /* webpackChunkName: "order-summary" */
                './OrderSummary'
            ),
    ),
);

const OrderSummaryDrawer = lazy(() =>
    retry(
        () =>
            import(
                /* webpackChunkName: "order-summary-drawer" */
                './OrderSummaryDrawer'
            ),
    ),
);

export interface OrderConfirmationState {
    error?: Error;
    hasSignedUp?: boolean;
    isSigningUp?: boolean;
}

export interface OrderConfirmationProps {
    containerId: string;
    embeddedStylesheet: EmbeddedCheckoutStylesheet;
    errorLogger: ErrorLogger;
    orderId: number;
    createAccount(values: SignUpFormValues): Promise<CreatedCustomer>;
    createEmbeddedMessenger(options: EmbeddedCheckoutMessengerOptions): EmbeddedCheckoutMessenger;
}

interface WithCheckoutOrderConfirmationProps {
    order?: Order;
    config?: StoreConfig;
    loadOrder(orderId: number): Promise<CheckoutSelectors>;
    isLoadingOrder(): boolean;
}

class OrderConfirmation extends Component<
    OrderConfirmationProps & WithCheckoutOrderConfirmationProps & AnalyticsContextProps,
    OrderConfirmationState
> {
    state: OrderConfirmationState = {};

    private embeddedMessenger?: EmbeddedCheckoutMessenger;

    componentDidMount(): void {
        const {
            containerId,
            createEmbeddedMessenger,
            embeddedStylesheet,
            loadOrder,
            orderId,
            analyticsTracker
        } = this.props;

        loadOrder(orderId)
            .then(({ data }) => {
                const { links: { siteLink = '' } = {} } = data.getConfig() || {};
                const messenger = createEmbeddedMessenger({ parentOrigin: siteLink });

                this.embeddedMessenger = messenger;

                messenger.receiveStyles((styles) => embeddedStylesheet.append(styles));
                messenger.postFrameLoaded({ contentId: containerId });

                analyticsTracker.orderPurchased();
            })
            .catch(this.handleUnhandledError);
    }

    render(): ReactNode {
        const { order, config, isLoadingOrder } = this.props;

        if (!order || !config || isLoadingOrder()) {
            return <OrderConfirmationPageSkeleton />;
        }

        const currencyCode = config.currency.code;

        return (
            <div
                className={classNames('layout optimizedCheckout-contentPrimary', {
                    'is-embedded': isEmbedded(),
                })}
            >
                <div className="layout-main" style={{ paddingRight: '1rem' }}>
                    <div className="orderConfirmation">
                        <div style={{ textAlign: 'center', borderRadius: '25px', background: 'white', padding: '20px', marginBottom: '20px' }}>
                            <h2 style={{ color: '#ff2688', marginBottom: '2rem', fontSize: 'large', fontWeight: '700', paddingTop: '3rem' }}>Congratulations {order.billingAddress.firstName}, Your instasmile Journey is Underway!</h2>
                            <h3 style={{ color: '#000070', marginBottom: '2rem', fontWeight: '600', fontSize: 'large' }}>Your order number is <b style={{ fontWeight: '800' }}>{order.orderId}</b>. You'll need this if you contact us!</h3>
                            <h3 style={{ color: '#000070', marginBottom: '2rem', fontWeight: '600', fontSize: 'large' }}>Whats Next?</h3>
                            <h3 style={{ color: '#000070', marginBottom: '2rem', fontWeight: '600', fontSize: 'large' }}><u style={{ fontWeight: '800' }}>New Orders</u><br /><b style={{ color: '#ff2688' }}>We’re Preparing Your Impression Kit</b><br />Typically, it will be shipped within 24 hrs (weekdays)</h3>

                            <h3 style={{ color: '#000070', marginBottom: '2rem', fontWeight: '600', fontSize: 'large' }}><u style={{ fontWeight: '800' }}>What's Next?</u><br /><b style={{ color: '#ff2688' }}>We Need To Confirm Your Suitability</b><br />Please upload photos of your natural teeth to our uploader</h3>
                            <img src='https://cdn.instasmile.com/new-website/images/show-us-your-teeth-300125.png' style={{ marginBottom: '15px' }} alt=''></img>
                            <p style={{ paddingTop: '15px', paddingBottom: '25px' }}>
                                <a role='button' href='https://uploader.instasmile.com/suitability' target='_blank' style={{ backgroundColor: '#ff2688', padding: '20px 24px', color: 'white', borderRadius: '20px', fontWeight: '600', fontSize: 'large' }}>Upload Photos</a>
                            </p>

                            <hr style={{ paddingBottom: '15px' }} />
                            <h3 style={{ color: '#000070', marginBottom: '2rem', fontWeight: '600', fontSize: 'large' }}><u style={{ fontWeight: '800' }}>Reorders</u><br /><b style={{ color: '#ff2688' }}>We’re getting your order ready for production!</b><br />We'll check we have your digital impressions stored from your previous order.<br />Then, we'll assign your Reorder to production within 24 hrs (weekdays) and you'll receive an email with an estimated completion date.</h3>
                            {currencyCode === 'USD' && (
                                <div style={{ display: 'flex', gap: '15px', maxHeight: '120px', marginBottom: '15px' }}>
                                    <div style={{ width: '33%', margin: 'auto' }}>
                                        <img src='https://cdn11.bigcommerce.com/s-k4sm7fwqbp/images/stencil/original/image-manager/trustpilot-12-08-25.png?t=1755012545' style={{ borderRadius: '10px' }} alt=''></img>
                                    </div>
                                    <div style={{ width: '33%', margin: 'auto' }}>
                                        <img src='https://cdn11.bigcommerce.com/s-k4sm7fwqbp/images/stencil/original/image-manager/usa.png?t=1725508250' style={{ borderRadius: '10px' }} alt=''></img>
                                    </div>
                                    <div style={{ width: '33%', margin: 'auto' }}>
                                        <img src='https://cdn11.bigcommerce.com/s-k4sm7fwqbp/images/stencil/original/image-manager/bbb.png?t=1725507539' style={{ borderRadius: '10px' }} alt=''></img>
                                    </div>
                                </div>
                            )}
                            {currencyCode === 'GBP' && (
                                <img src='https://cdn11.bigcommerce.com/s-k4sm7fwqbp/images/stencil/original/image-manager/trustpilot-12-08-25.png?t=1755012545' style={{ borderRadius: '10px' }} alt=''></img>
                            )}
                            {currencyCode === 'AUD' && (
                                <img src='https://cdn11.bigcommerce.com/s-k4sm7fwqbp/images/stencil/original/image-manager/trustpilot-12-08-25.png?t=1755012545' style={{ borderRadius: '10px' }} alt=''></img>
                            )}
                        </div>
                    </div>
                </div>

                {loadOwlCarousel()}
                {this.renderOrderSummary()}
                {this.renderErrorModal()}
            </div>
        );
    }

    private renderOrderSummary(): ReactNode {
        const { order, config } = this.props;

        if (!order || !config) {
            return null;
        }

        const { currency, shopperCurrency, checkoutSettings } = config;

        const isShippingDiscountDisplayEnabled = isExperimentEnabled(
            checkoutSettings,
            'PROJECT-6643.enable_shipping_discounts_in_orders',
        );

        return (
            <MobileView>
                {(matched) => {
                    if (matched) {
                        return (
                            <LazyContainer loadingSkeleton={<></>}>
                                <OrderSummaryDrawer
                                    {...mapToOrderSummarySubtotalsProps(order, isShippingDiscountDisplayEnabled)}
                                    headerLink={
                                        <PrintLink className="modal-header-link cart-modal-link" />
                                    }
                                    lineItems={order.lineItems}
                                    shopperCurrency={shopperCurrency}
                                    storeCurrency={currency}
                                    total={order.orderAmount}
                                />
                            </LazyContainer>
                        );
                    }

                    return (
                        <LazyContainer loadingSkeleton={<CartSummarySkeleton />}>
                            <aside className="layout-cart">
                                <OrderSummary
                                    headerLink={<PrintLink />}
                                    {...mapToOrderSummarySubtotalsProps(order, isShippingDiscountDisplayEnabled)}
                                    lineItems={order.lineItems}
                                    shopperCurrency={shopperCurrency}
                                    storeCurrency={currency}
                                    total={order.orderAmount}
                                />
                            </aside>
                        </LazyContainer>
                    );
                }}
            </MobileView>
        );
    }

    private renderErrorModal(): ReactNode {
        const { error } = this.state;

        return (
            <ErrorModal
                error={error}
                onClose={this.handleErrorModalClose}
                shouldShowErrorCode={false}
            />
        );
    }

    private handleErrorModalClose: () => void = () => {
        this.setState({ error: undefined });
    };

    private handleUnhandledError: (error: Error) => void = (error) => {
        const { errorLogger } = this.props;

        this.setState({ error });
        errorLogger.log(error);

        if (this.embeddedMessenger) {
            this.embeddedMessenger.postError(error);
        }
    };
}

export function mapToOrderConfirmationProps(
    context: CheckoutContextProps,
): WithCheckoutOrderConfirmationProps | null {
    const {
        checkoutState: {
            data: { getOrder, getConfig },
            statuses: { isLoadingOrder },
        },
        checkoutService,
    } = context;

    const config = getConfig();
    const order = getOrder();

    return {
        config,
        isLoadingOrder,
        loadOrder: checkoutService.loadOrder,
        order,
    };
}

export default withAnalytics(withCheckout(mapToOrderConfirmationProps)(OrderConfirmation));

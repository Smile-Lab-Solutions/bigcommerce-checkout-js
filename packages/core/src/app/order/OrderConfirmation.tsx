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

import { withAnalytics } from '../analytics';
import { withCheckout } from '../checkout';
import { ErrorModal } from '../common/error';
import { retry } from '../common/utility';
import { EmbeddedCheckoutStylesheet, isEmbedded } from '../embeddedCheckout';
import {
    CreatedCustomer,
    SignUpFormValues,
} from '../guestSignup';
import { LazyContainer, LoadingSpinner } from '../ui/loading';
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
            return <LoadingSpinner isLoading={true} />;
        }

        const currencyCode = config.currency.code;

        return (
            <div
                className={classNames('layout optimizedCheckout-contentPrimary', {
                    'is-embedded': isEmbedded(),
                })}
            >
                <div className="layout-main">
                    <div className="orderConfirmation">
                        <div style={{ textAlign: 'center', borderRadius: '25px', background: 'white', padding: '20px', marginBottom: '20px' }}>
                        <h2 style={{ color: '#ff2688', marginBottom: '2rem', fontSize: 'large', fontWeight: '700', paddingTop: '3rem' }}>Congratulations {order.billingAddress.firstName}, Your instasmile Journey is Underway!</h2>
                            <h3 style={{ color: '#000070', marginBottom: '2rem', fontWeight: 'inherit', fontSize: 'large' }}>Your order number is <b style={{ fontWeight: '800' }}>{order.orderId}</b>. You'll need this if you contact us!</h3>
                            <h4 style={{ marginBottom: '2rem', fontSize: 'medium' }}><b style={{ fontWeight: '800' }}>What’s Next?</b></h4>
                            <p style={{ fontSize: 'medium' }}><b style={{ color: '#000070' }}>Step 1</b><br/><b style={{ color: '#ff2688' }}>We’re Preparing Your Impression Kit</b></p>
                            <h4 style={{ color: '#000070', fontSize: 'medium' }}>Typically, it will be shipped within 24 hrs (Mon-Fri)</h4>
                            <img src='https://cdn.instasmile.com/new-website/images/impression-kit-image.png' style={{borderRadius: '10px', marginBottom: '15px', paddingRight: '4rem', paddingLeft: '4rem' }} alt='Impression guide'></img>                         
                            <p style={{ fontSize: 'medium' }}><b style={{ color: '#000070' }}>Step 2</b><br/><b style={{ color: '#ff2688' }}>You’ll Receive Your Welcome Call</b></p>

                            {currencyCode === 'USD' && (
                                <h4 style={{ color: '#000070', marginBottom: '2rem', fontSize: 'medium' }}>Typically we will call you from <b style={{ fontWeight: '800' }}>(855)-955-5910</b> within 24 hrs (Mon-Fri)</h4>
                            )}
                            {currencyCode === 'GBP' && (
                                <h4 style={{ color: '#000070', marginBottom: '2rem', fontSize: 'medium' }}>Typically we will call you from <b style={{ fontWeight: '800' }}>0800 060 8077</b> within 24 hrs (Mon-Fri)</h4>
                            )}
                            {currencyCode === 'AUD' && (
                                <h4 style={{ color: '#000070', marginBottom: '2rem', fontSize: 'medium' }}>Typically we will call you from <b style={{ fontWeight: '800' }}>+44 800 060 8077</b> within 24 hrs (Mon-Fri)</h4>
                            )}
                            
                            <h4 style={{ color: '#000070', marginBottom: '2rem', fontSize: 'medium' }}><b style={{ fontWeight: '800' }}>{order.billingAddress.firstName}, it's very important we have this call to get your order underway as quickly and easily as possible.</b></h4>
                            <h4 style={{ fontSize: 'medium' }}>📞 <b style={{ color: '#ff2688', fontWeight: '800' }}>Please look out for our call</b></h4>
                            
                            {currencyCode === 'USD' && (
                                <img src='https://cdn.instasmile.com/new-website/images/us-t-banner.png' style={{borderRadius: '10px', marginBottom: '15px', paddingRight: '4rem', paddingLeft: '4rem' }} alt=''></img>
                            )}
                            {currencyCode === 'GBP' && (
                                <img src='https://cdn.instasmile.com/new-website/images/tp-banner.png' style={{borderRadius: '10px', marginBottom: '15px', paddingRight: '4rem', paddingLeft: '4rem' }} alt=''></img>
                            )}
                            {currencyCode === 'AUD' && (
                                <img src='https://cdn.instasmile.com/new-website/images/tp-banner.png' style={{borderRadius: '10px', marginBottom: '15px', paddingRight: '4rem', paddingLeft: '4rem' }} alt=''></img>
                            )}

                            <img src='https://cdn.instasmile.com/new-website/images/Satisfaction-guarantee-mobile.png' style={{borderRadius: '10px', marginBottom: '15px', paddingRight: '4rem', paddingLeft: '4rem' }} alt='Satisfaction guarantee'></img>
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

        const { currency, shopperCurrency } = config;

        return (
            <MobileView>
                {(matched) => {
                    if (matched) {
                        return (
                            <LazyContainer>
                                <OrderSummaryDrawer
                                    {...mapToOrderSummarySubtotalsProps(order)}
                                    headerLink={
                                        <PrintLink className="modal-header-link cart-modal-link" />
                                    }
                                    isUpdatedCartSummayModal={false}
                                    lineItems={order.lineItems}
                                    shopperCurrency={shopperCurrency}
                                    storeCurrency={currency}
                                    total={order.orderAmount}
                                />
                            </LazyContainer>
                        );
                    }

                    return (
                        <aside className="layout-cart">
                            <LazyContainer>
                                <OrderSummary
                                    headerLink={<PrintLink />}
                                    {...mapToOrderSummarySubtotalsProps(order)}
                                    lineItems={order.lineItems}
                                    shopperCurrency={shopperCurrency}
                                    storeCurrency={currency}
                                    total={order.orderAmount}
                                />
                            </LazyContainer>
                        </aside>
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

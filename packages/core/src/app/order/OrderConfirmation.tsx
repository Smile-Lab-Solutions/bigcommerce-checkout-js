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
import { withAnalytics } from '../analytics';
import { CheckoutContextProps, withCheckout } from '../checkout';
import { ErrorLogger, ErrorModal } from '../common/error';
import { retry } from '../common/utility';
import { EmbeddedCheckoutStylesheet, isEmbedded } from '../embeddedCheckout';
import {
    CreatedCustomer,
    SignUpFormValues,
} from '../guestSignup';
import { Button, ButtonVariant } from '../ui/button';
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

        const {
            links: { siteLink },
        } = config;
        const accountLink = siteLink + '/account.php';

        const currencyCode = config.currency.code;

        return (
            <div
                className={classNames('layout optimizedCheckout-contentPrimary', {
                    'is-embedded': isEmbedded(),
                })}
            >
                <div className="layout-main">
                    <div className="orderConfirmation">
                        <div style={{ borderRadius: '25px', background: 'white', padding: '20px', marginBottom: '20px' }}>
                            <h3>{order.billingAddress.firstName}, Thank you for your order {order.orderId}</h3>
                            <div className='shippedKit' style={{backgroundColor: '#DCEFF5', borderRadius: '10px', padding: '15px 15px', margin: '15px 0px', display: 'flex'}}>
                                {currencyCode === 'USD' && (
                                    <p style={{width: '80%', marginBottom: '0px'}}>Our team will now prepare your revolutionary reusable self-impression kit, and will dispatch it using UPS. <br></br> Look out for an email with your tracking information.</p>
                                )}
                                {currencyCode === 'GBP' && (
                                    <p style={{width: '80%', marginBottom: '0px'}}>Our team will now prepare your revolutionary reusable self-impression kit, and will dispatch it using DPD's next-day
                                    service or Fedex if you're outside of the UK. <br></br> Look out for an email with your tracking information.</p>
                                )}
                                <div className="iconShipping"></div>
                            </div>
                            <h3>Go to your account to track your order progress</h3>
                            <img src='https://cdn.instasmile.com/new-website/images/checkout-confirm-track-order.png' style={{borderRadius: '10px', marginBottom: '15px'}} alt='Impression guide'></img>
                            <div className="continueButtonContainer" style={{display: 'flex'}}>
                                <form action={accountLink} method="get" target="_top" style={{width: '50%'}}>
                                    <Button type="submit" variant={ButtonVariant.Secondary} style={{width: '95%'}}>
                                        Go to your account
                                    </Button>
                                </form>
                                <form action={siteLink} method="get" target="_top" style={{width: '50%'}}>
                                    <Button type="submit" variant={ButtonVariant.Secondary} style={{width: '95%'}}>
                                        Back to the website
                                    </Button>
                                </form>
                            </div>
                        </div>
                        <div style={{backgroundColor: '#DCEFF5', borderRadius: '25px', padding: '15px 15px', margin: '15px 0px'}}>
                                <p>Your personal smile consultant will call you within 24 business hours to
                                    run through your order and answer any questions you may have, so please save us to your trusted contacts.
                                </p>
                                {currencyCode === "USD" && (
                                    <>
                                        <p style={{marginBottom: '0px'}}>Ways you can contact us (Mon - Fri EDT 6 am - 4:30 pm)</p>
                                        <p style={{marginBottom: '0px'}}>Tel: +1 (855) 955-5910</p>
                                    </>
                                )}
                                {currencyCode === "GBP" && (
                                    <>
                                        <p style={{marginBottom: '0px'}}>Ways you can contact us (Mon - Fri 11 am - 9:30 pm)</p>
                                        <p style={{marginBottom: '0px'}}>Tel: 0800 060 8077</p>
                                    </>
                                )}
                                <p style={{marginBottom: '0px'}}>Live Chat</p>
                                <p style={{marginBottom: '0px'}}>Email: <a href="mailto:info@instasmile.com" target="_top">info@instasmile.com</a></p>
                        </div>
                        <div style={{ textAlign: 'center', borderRadius: '25px', background: 'white', padding: '20px', marginBottom: '20px' }}>
                            <h2>Our Guide to Using Your Instasmile Impression Kit</h2>
                            <p>We understand that this may be a new experience for you. Your impression kit and instructions leaflet will
                                contain all the information you need to make a great impression for your new clip-on veneers.</p>
                            <h4>NEW No Stress Impression Kit Video</h4>
                            <iframe width="100%" height="650" src="https://www.youtube.com/embed/2FWyDZ1ZCf8" title="YouTube video player"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                ></iframe>
                            <p>You’ve watched the video, read through the instructions, and prepared everything you need. Now it’s time to
                                take your impressions.</p>
                            <p>Keep your instructions to hand and follow them carefully. You can download a copy here if you need to: </p>
                            <p><a href="https://cdn.instasmile.com/docs/UK-NSI-InstructionsV3.pdf" target="_blank"><strong>Download
                                Impression Instructions</strong></a></p>
                        </div>
                        <div style={{ borderRadius: '25px', background: 'white', padding: '20px', marginBottom: '20px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <h2>Three simple steps to your perfect instasmile</h2>
                            </div>
                            <div className="show-desktop">
                                <div style={{ display: 'flex' }}>
                                    <div className="smile-step-clmn-1">
                                        <div className="smile-step-text-over smile-step-text-over-1"></div>
                                        <div className="smile-step-details">
                                            <strong>Order Online</strong>
                                            <p>Complete your online <a href="/pages/smile-assessment-1.html" title="smile-assessment-1">Smile Assessment</a> and find the instasmile that’s right for you. Order your instasmile securely through our online store.</p>
                                        </div>
                                    </div>
                                    <div className="smile-step-clmn-2">
                                        <div className="smile-step-text-over smile-step-text-over-2"></div>
                                        <div className="smile-step-details">
                                            <strong>Make an Impression</strong>
                                            <p>You’ll get your Impression Kit in the post. Read through all the instructions so you get the perfect impression, and send us a photo so we can check it’s all OK.</p>
                                        </div>
                                    </div>
                                    <div className="smile-step-clmn-3">
                                        <div className="smile-step-text-over smile-step-text-over-3"></div>
                                        <div className="smile-step-details">
                                            <strong>Receive Your New Smile</strong>
                                            <p>After we’ve checked and approved your photo, send us your completed impression. We’ll then get to work on creating your brand new smile.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="show-mobile">
                                <div>
                                    <div id="owl-demo" className="owl-carousel owl-theme">
                                        <div className="item">
                                            <div className="smile-step-text-over smile-step-text-over-1"></div>
                                            <div className="smile-step-details">
                                                <strong>Order Online</strong>
                                                <p>Complete your online <a href="/pages/smile-assessment-1.html" title="smile-assessment-1">Smile Assessment</a> and find the instasmile that’s right for you. Order your instasmile securely through our online store.</p>
                                            </div>
                                        </div>
                                        <div className="item">
                                            <div className="smile-step-text-over smile-step-text-over-2"></div>
                                            <div className="smile-step-details">
                                                <strong>Make an Impression</strong>
                                                <p>You’ll get your Impression Kit in the post. Read through all the instructions so you get the perfect impression, and send us a photo so we can check it’s all OK.</p>
                                            </div>
                                        </div>
                                        <div className="item">
                                            <div className="smile-step-text-over smile-step-text-over-3"></div>
                                            <div className="smile-step-details">
                                                <strong>Receive Your New Smile</strong>
                                                <p>After we’ve checked and approved your photo, send us your completed impression. We’ll then get to work on creating your brand new smile.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
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

import {
    type Order,
    type ShopperConfig,
    type ShopperCurrency,
    type StoreConfig,
    type StoreCurrency,
} from '@bigcommerce/checkout-sdk';
import classNames from 'classnames';
import React, { type ReactElement } from 'react';

import { ErrorModal } from '../../common/error';
import { isEmbedded } from '../../embeddedCheckout';
import { type SignUpFormValues } from '../../guestSignup';
import { OrderSummaryContainer } from './OrderSummaryContainer';
import { loadOwlCarousel } from '../../../../../../scripts/custom/orderConfirmation';

interface OrderConfirmationPageProps {
    order: Order;
    config: StoreConfig;
    supportEmail: string;
    supportPhoneNumber: string | undefined;
    paymentInstructions: string | undefined;
    shouldShowPasswordForm: boolean;
    hasSignedUp: boolean | undefined;
    isSigningUp: boolean | undefined;
    onSignUp(values: SignUpFormValues): void;
    shopperConfig: ShopperConfig;
    customerCanBeCreated: boolean;
    siteLink: string;
    currency: StoreCurrency;
    shopperCurrency: ShopperCurrency;
    isShippingDiscountDisplayEnabled: boolean;
    error: Error | undefined;
    onErrorModalClose(): void;
}

export const OrderConfirmationPage = ({
    currency,
    error,
    isShippingDiscountDisplayEnabled,
    onErrorModalClose,
    order,
    shopperCurrency,
}: OrderConfirmationPageProps): ReactElement => (
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
                    {currency.code === 'USD' && (
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
                    {currency.code === 'GBP' && (
                        <img src='https://cdn11.bigcommerce.com/s-k4sm7fwqbp/images/stencil/original/image-manager/trustpilot-12-08-25.png?t=1755012545' style={{ borderRadius: '10px' }} alt=''></img>
                    )}
                    {currency.code === 'AUD' && (
                        <img src='https://cdn11.bigcommerce.com/s-k4sm7fwqbp/images/stencil/original/image-manager/trustpilot-12-08-25.png?t=1755012545' style={{ borderRadius: '10px' }} alt=''></img>
                    )}
                </div>
            </div>
        </div>

        {loadOwlCarousel()}

        <OrderSummaryContainer
            currency={currency}
            isShippingDiscountDisplayEnabled={isShippingDiscountDisplayEnabled}
            order={order}
            shopperCurrency={shopperCurrency}
        />

        <ErrorModal error={error} onClose={onErrorModalClose} shouldShowErrorCode={false} />
    </div>
);


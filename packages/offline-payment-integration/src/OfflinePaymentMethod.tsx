import { FunctionComponent, useEffect } from 'react';

import {
    PaymentMethodProps,
    toResolvableComponent,
} from '@bigcommerce/checkout/payment-integration-api';
import React from 'react';

const OfflinePaymentMethod: FunctionComponent<PaymentMethodProps> = ({
    method,
    checkoutService,
    onUnhandledError,
}) => {
    useEffect(() => {
        const initializePayment = async () => {
            try {
                await checkoutService.initializePayment({
                    gatewayId: method.gateway,
                    methodId: method.id,
                });
            } catch (error) {
                if (error instanceof Error) {
                    onUnhandledError(error);
                }
            }
        };

        void initializePayment();

        return () => {
            const deinitializePayment = async () => {
                try {
                    await checkoutService.deinitializePayment({
                        gatewayId: method.gateway,
                        methodId: method.id,
                    });
                } catch (error) {
                    if (error instanceof Error) {
                        onUnhandledError(error);
                    }
                }
            };

            void deinitializePayment();
        };
    }, [checkoutService, method.gateway, method.id, onUnhandledError]);

    // Cash on Delivery is used for Bread
    if (method.id === 'cod') {
        return <>
            <div className="paymentMethod paymentMethod--offline">
                <div className="payment-descriptor">
                    <p>For more information visit the Bread Pay™ financing page <a href="https://us.instasmile.com/breadpay-faqs/" target="_blank">here</a></p>
                </div>
            </div>
        </>
    }

    // Cheque is used for PayTomorrow
    if (method.id === 'cheque') {
        return <>
            <div className="paymentMethod paymentMethod--offline">
                <div className="payment-descriptor">
                    <p>Applying with Pay Tomorrow will not affect your credit score.</p>
                    <ul className="list-element">
                        <li><div className="circleCheck"></div>Payment plans up to $2,500 for as long as 6 months*</li>
                        <li><div className="circleCheck"></div>$99 down payment at checkout</li>
                        <li><div className="circleCheck"></div>0% interest</li>
                        <li><div className="circleCheck"></div>6 Month Term (with Weekly, Biweekly or Semimonthly Payments)</li>
                        <li><div className="circleCheck"></div>No hidden fees</li>
                        <li><div className="circleCheck"></div>90 day early payoff option</li>
                    </ul>
                    <p><small>*Qualified Customers Only</small></p>
                </div>
            </div>
        </>
    }

    return null;
};

export default toResolvableComponent(OfflinePaymentMethod, [
    {
        type: 'PAYMENT_TYPE_OFFLINE',
    },
]);
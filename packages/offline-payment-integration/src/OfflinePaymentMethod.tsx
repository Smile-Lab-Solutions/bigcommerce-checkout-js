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

    return null;
};

export default toResolvableComponent(OfflinePaymentMethod, [
    {
        type: 'PAYMENT_TYPE_OFFLINE',
    },
]);
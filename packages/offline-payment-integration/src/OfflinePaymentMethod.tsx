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
                    <p>Bread Pay™ offers you an easy and convenient way to buy the things you want now and pay over time.
                    </p>
                    <ul className="list-element">
                        <li><div className="circleCheck"></div>Low Monthly Payments*</li>
                        <li><div className="circleCheck"></div>Easy Monthly Payments over 6, 12 or 18 months*</li>
                        <li><div className="circleCheck"></div>0% APR Available*</li>
                    </ul>
                    <p>Please note, your financial institution may charge you one or more non-sufficient funds or overdraft fees if any loan payment exceeds your account’s available balance. If you pay with a credit card, your credit card issuer may charge interest and/or fees.</p>
                    <p>*Subject to approval of credit application. Rates range from 0% to 29.99% APR, resulting in, for example, 18 monthly payments of $60.05 at 9.99% APR, per $1,000 borrowed. APRs will vary depending on credit qualifications, loan amount, and term. Bread Pay™ loans are made by Comenity Capital Bank, a Bread Financial™ company.</p>
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
import React, { FunctionComponent, memo } from 'react';

import { withCheckout } from '../checkout';
import { TranslatedString } from '../locale';
import { Button, ButtonSize, ButtonVariant } from '../ui/button';
import { IconBolt } from '../ui/icon';

import { PaymentMethodId, PaymentMethodType } from './paymentMethod';

interface PaymentSubmitButtonTextProps {
    methodGateway?: string;
    methodId?: string;
    methodType?: string;
    methodName?: string;
    initialisationStrategyType?: string;
    brandName?: string;
    isComplete?: boolean;
}

const providersWithCustomClasses = [PaymentMethodId.Bolt];

const PaymentSubmitButtonText: FunctionComponent<PaymentSubmitButtonTextProps> = memo(
    ({
        methodId,
        methodName,
        methodType,
        methodGateway,
        initialisationStrategyType,
        brandName,
        isComplete,
    }) => {
        if (methodName && initialisationStrategyType === 'none') {
            return <TranslatedString data={{ methodName }} id="payment.ppsdk_continue_action" />;
        }

        if (methodId === PaymentMethodId.AmazonPay) {
            return <TranslatedString id="payment.amazonpay_continue_action" />;
        }

        if (methodId === PaymentMethodId.Bolt) {
            return (
                <>
                    <IconBolt additionalClassName="payment-submit-button-bolt-icon" />
                    <TranslatedString id="payment.place_order_action" />
                </>
            );
        }

        if (methodGateway === PaymentMethodId.Barclaycard) {
            return <TranslatedString id="payment.barclaycard_continue_action" />;
        }

        if (methodGateway === PaymentMethodId.BlueSnapV2) {
            return <TranslatedString id="payment.bluesnap_v2_continue_action" />;
        }

        if (methodType === PaymentMethodType.VisaCheckout) {
            return <TranslatedString id="payment.visa_checkout_continue_action" />;
        }

        if (methodType === PaymentMethodType.Chasepay) {
            return <TranslatedString id="payment.chasepay_continue_action" />;
        }

        if (
            methodType === PaymentMethodType.PaypalVenmo ||
            methodId === PaymentMethodId.BraintreeVenmo
        ) {
            return <TranslatedString id="payment.paypal_venmo_continue_action" />;
        }

        if (methodType === PaymentMethodType.Paypal) {
            return <TranslatedString
                data={{ isComplete }}
                id={
                    isComplete
                        ? 'payment.paypal_complete_action'
                        : 'payment.paypal_continue_action'
                }
            />;
        }

        if (methodType === PaymentMethodType.PaypalCredit) {
            const continueTranslationId = brandName
                ? 'payment.continue_with_brand'
                : 'payment.paypal_pay_later_continue_action'
            const completeTranslationId = brandName
                ? 'payment.complete_with_brand'
                : 'payment.paypal_pay_later_complete_action'

            return (
                <TranslatedString
                    data={{ brandName, isComplete, continueTranslationId, completeTranslationId }}
                    id={
                        isComplete
                            ? completeTranslationId
                            : continueTranslationId
                    }
                />
            );
        }

        if (methodId === PaymentMethodId.Opy) {
            return <TranslatedString data={{ methodName }} id="payment.opy_continue_action" />;
        }

        if (methodId === PaymentMethodId.Quadpay) {
            return <TranslatedString id="payment.quadpay_continue_action" />;
        }

        if (methodId === PaymentMethodId.Zip) {
            return <TranslatedString id="payment.zip_continue_action" />;
        }

        if (methodId === PaymentMethodId.Klarna) {
            return <TranslatedString id="payment.klarna_continue_action" />;
        }

        if (methodGateway === PaymentMethodId.Partially) {
            return <TranslatedString id="payment.partially_continue_action" />;
        }

        return <TranslatedString id="payment.place_order_action" />;
    },
);

export interface PaymentSubmitButtonProps {
    methodGateway?: string;
    methodId?: string;
    methodName?: string;
    methodType?: string;
    isDisabled?: boolean;
    initialisationStrategyType?: string;
    brandName?: string;
    isComplete?: boolean
}

interface WithCheckoutPaymentSubmitButtonProps {
    isInitializing?: boolean;
    isSubmitting?: boolean;
}

const PaymentSubmitButton: FunctionComponent<
    PaymentSubmitButtonProps & WithCheckoutPaymentSubmitButtonProps
> = ({
    isDisabled,
    isInitializing,
    isSubmitting,
    methodGateway,
    methodId,
    methodName,
    methodType,
    initialisationStrategyType,
    brandName,
    isComplete,
}) => (
    <Button
        className={
            providersWithCustomClasses.includes(methodId as PaymentMethodId)
                ? `payment-submit-button-${methodId}`
                : undefined
        }
        disabled={isInitializing || isSubmitting || isDisabled}
        id="checkout-payment-continue"
        isFullWidth
        isLoading={isSubmitting}
        size={ButtonSize.Large}
        type="submit"
        variant={ButtonVariant.Action}
    >
        <PaymentSubmitButtonText
            isComplete={isComplete}
            brandName={brandName}
            initialisationStrategyType={initialisationStrategyType}
            methodGateway={methodGateway}
            methodId={methodId}
            methodName={methodName}
            methodType={methodType}
        />
    </Button>
);

export default withCheckout(({ checkoutState }) => {
    const {
        statuses: { isInitializingCustomer, isInitializingPayment, isSubmittingOrder },
    } = checkoutState;

    return {
        isInitializing: isInitializingCustomer() || isInitializingPayment(),
        isSubmitting: isSubmittingOrder(),
    };
})(memo(PaymentSubmitButton));

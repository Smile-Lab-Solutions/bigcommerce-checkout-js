import { LanguageService, PaymentMethod } from '@bigcommerce/checkout-sdk';

import PaymentMethodId from './PaymentMethodId';

export default function getPaymentMethodDisplayName(
    language: LanguageService,
): (method: PaymentMethod) => string {
    return (method) => {
        const { displayName } = method.config;

        const isCreditCard = displayName?.toLowerCase() === 'credit card';

        if (
            method.id === PaymentMethodId.PaypalCommerceCredit ||
            method.id === PaymentMethodId.BraintreePaypalCredit
        ) {
            const { payPalCreditProductBrandName } = method.initializationData;

            if (payPalCreditProductBrandName) {
                return payPalCreditProductBrandName.credit || payPalCreditProductBrandName;
            }

            return 'Pay Later';
        }

        if (
            (isCreditCard && method.id === PaymentMethodId.AdyenV2) ||
            method.id === PaymentMethodId.AdyenV3
        ) {
            return language.translate('payment.credit_debit_card_text');
        }

        if (isCreditCard) {
            return language.translate('payment.credit_card_text');
        }

        if (method.id === PaymentMethodId.Laybuy){
            return 'Buy now and pay over 6 weekly interest-free instalments';
        }

        if (method.gateway === PaymentMethodId.StripeUPE){
            return displayName + ' All major credit and debit cards accepted';
        }

        if (method.gateway === PaymentMethodId.Partially){
            return displayName + ' Ideal for people with an adverse credit rating.';
        }

        if (method.gateway === PaymentMethodId.Clearpay){
            return 'Pay in 4 interest-free instalments.';
        }

        return displayName || '';
    };
}

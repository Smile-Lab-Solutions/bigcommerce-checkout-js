import { LanguageService, PaymentMethod } from '@bigcommerce/checkout-sdk';
import { number } from 'card-validator';
import { compact } from 'lodash';
import React, { FunctionComponent, memo } from 'react';

import { PaymentFormValues } from '@bigcommerce/checkout/payment-integration-api';

import { CheckoutContextProps, withCheckout } from '../../checkout';
import { connectFormik, ConnectFormikProps } from '../../common/form';
import { withLanguage, WithLanguageProps } from '../../locale';
import { CreditCardIconList, mapFromPaymentMethodCardType } from '../creditCard';

import { hasCreditCardNumber } from './CreditCardFieldsetValues';
import getPaymentMethodDisplayName from './getPaymentMethodDisplayName';
import getPaymentMethodName from './getPaymentMethodName';
import { isHostedCreditCardFieldsetValues } from './HostedCreditCardFieldsetValues';
import PaymentMethodId from './PaymentMethodId';
import PaymentMethodType from './PaymentMethodType';

export interface PaymentMethodTitleProps {
    method: PaymentMethod;
    isSelected?: boolean;
}

interface WithCdnPathProps {
    cdnBasePath: string;
}

function getPaymentMethodTitle(
    language: LanguageService,
    basePath: string,
): (method: PaymentMethod) => { logoUrl: string; titleText: string; titleSubText: string } {
    const cdnPath = (path: string) => `${basePath}${path}`;

    return (method) => {
        const paymentWithLogo = method.initializationData?.methodsWithLogo
            ? method.initializationData.methodsWithLogo
            : [];
        const methodName = getPaymentMethodName(language)(method);
        const methodDisplayName = getPaymentMethodDisplayName(language)(method);
        // TODO: API could provide the data below so UI can read simply read it.
        // However, I'm not sure how we deal with translation yet. TBC.
        const customTitles: { [key: string]: { logoUrl: string; titleText: string; titleSubText: string } } = {
            [PaymentMethodType.CreditCard]: {
                logoUrl: '',
                titleText: methodName,
                titleSubText: '',
            },
            [PaymentMethodId.BraintreeVenmo]: {
                logoUrl: method.logoUrl || '',
                titleText: method.logoUrl ? '' : methodDisplayName,
                titleSubText: '',
            },
            [PaymentMethodType.PaypalCredit]: {
                logoUrl: cdnPath('/img/payment-providers/paypal_commerce_logo_letter.svg'),
                titleText: methodDisplayName,
                titleSubText: '',
            },
            [PaymentMethodId.PaypalCommerce]: {
                logoUrl: cdnPath('/img/payment-providers/paypal_commerce_logo.svg'),
                titleText: '',
                titleSubText: '',
            },
            [PaymentMethodId.PaypalCommerceCredit]: {
                logoUrl: cdnPath('/img/payment-providers/paypal_commerce_logo_letter.svg'),
                titleText: methodDisplayName,
                titleSubText: '',
            },
            [PaymentMethodId.PaypalCommerceAlternativeMethod]: {
                logoUrl: method.logoUrl || '',
                titleText: method.logoUrl ? '' : methodDisplayName,
                titleSubText: '',
            },
            [PaymentMethodType.VisaCheckout]: {
                logoUrl: cdnPath('/img/payment-providers/visa-checkout.png'),
                titleText: methodName,
                titleSubText: '',
            },
            [PaymentMethodId.Affirm]: {
                logoUrl: cdnPath('/img/payment-providers/affirm-checkout-header.png'),
                titleText: language.translate('payment.affirm_display_name_text'),
                titleSubText: '',
            },
            [PaymentMethodId.Afterpay]: {
                logoUrl: cdnPath('/img/payment-providers/afterpay-badge-blackonmint.png'),
                titleText: methodName,
                titleSubText: '',
            },
            [PaymentMethodId.AmazonPay]: {
                logoUrl: cdnPath('/img/payment-providers/amazon-header.png'),
                titleText: '',
                titleSubText: '',
            },
            [PaymentMethodId.ApplePay]: {
                logoUrl: cdnPath('/modules/checkout/applepay/images/applepay-header@2x.png'),
                titleText: '',
                titleSubText: '',
            },
            [PaymentMethodId.Bolt]: {
                logoUrl: '',
                titleText: methodDisplayName,
                titleSubText: '',
            },
            [PaymentMethodId.ChasePay]: {
                logoUrl: cdnPath('/img/payment-providers/chase-pay.png'),
                titleText: '',
                titleSubText: '',
            },
            [PaymentMethodId.Clearpay]: {
                logoUrl: cdnPath('/img/payment-providers/clearpay-header.png'),
                titleText: methodName,
                titleSubText: 'Pay in 4 interest-free instalments.',
            },
            [PaymentMethodType.GooglePay]: {
                logoUrl: cdnPath('/img/payment-providers/google-pay.png'),
                titleText: '',
                titleSubText: '',
            },
            [PaymentMethodType.PayWithGoogle]: {
                logoUrl: cdnPath('/img/payment-providers/google-pay.png'),
                titleText: '',
                titleSubText: '',
            },
            [PaymentMethodId.DigitalRiver]: {
                logoUrl: '',
                titleText: language.translate('payment.digitalriver_display_name_text'),
                titleSubText: '',
            },
            [PaymentMethodId.Humm]: {
                logoUrl: cdnPath('/img/payment-providers/humm-checkout-header.png'),
                titleText: '',
                titleSubText: '',
            },
            [PaymentMethodId.Klarna]: {
                logoUrl: cdnPath('/img/payment-providers/klarna-header.png'),
                titleText: methodDisplayName,
                titleSubText: '',
            },
            [PaymentMethodId.Laybuy]: {
                logoUrl: cdnPath('/img/payment-providers/laybuy-checkout-header.png'),
                titleText: '',
                titleSubText: 'Buy now and pay over 6 weekly interest-free instalments',
            },
            [PaymentMethodId.Masterpass]: {
                logoUrl: 'https://masterpass.com/dyn/img/acc/global/mp_mark_hor_blk.svg',
                titleText: '',
                titleSubText: '',
            },
            [PaymentMethodId.Opy]: {
                logoUrl: cdnPath(
                    `/img/payment-providers/${method.config.logo ?? 'opy_default.svg'}`,
                ),
                titleText: '',
                titleSubText: '',
            },
            [PaymentMethodType.Paypal]: {
                // TODO: method.id === PaymentMethodId.BraintreeVenmo should be removed after the PAYPAL-1380.checkout_button_strategies_update experiment removal
                logoUrl:
                    method.id === PaymentMethodId.BraintreeVenmo && method.logoUrl
                        ? method.logoUrl
                        : cdnPath('/img/payment-providers/paypalpaymentsprouk.png'),
                titleText: '',
                titleSubText: '',
            },
            [PaymentMethodId.Quadpay]: {
                logoUrl: cdnPath('/img/payment-providers/quadpay.png'),
                titleText: language.translate('payment.quadpay_display_name_text'),
                titleSubText: '',
            },
            [PaymentMethodId.Sezzle]: {
                logoUrl: cdnPath('/img/payment-providers/sezzle-checkout-header.png'),
                titleText: language.translate('payment.sezzle_display_name_text'),
                titleSubText: '',
            },
            [PaymentMethodId.Zip]: {
                logoUrl: cdnPath('/img/payment-providers/zip.png'),
                titleText: language.translate('payment.zip_display_name_text'),
                titleSubText: '',
            },
            [PaymentMethodType.Barclaycard]: {
                logoUrl: cdnPath(
                    `/img/payment-providers/barclaycard_${method.id.toLowerCase()}.png`,
                ),
                titleText: '',
                titleSubText: '',
            },
            [PaymentMethodId.AdyenV2]: {
                logoUrl: `https://checkoutshopper-live.adyen.com/checkoutshopper/images/logos/${
                    method.method === 'scheme' ? 'card' : method.method
                }.svg`,
                titleText: methodDisplayName,
                titleSubText: '',
            },
            [PaymentMethodId.AdyenV3]: {
                logoUrl: `https://checkoutshopper-live.adyen.com/checkoutshopper/images/logos/${
                    method.method === 'scheme' ? 'card' : method.method
                }.svg`,
                titleText: methodDisplayName,
                titleSubText: '',
            },
            [PaymentMethodId.Mollie]: {
                logoUrl:
                    method.method === 'credit_card'
                        ? ''
                        : cdnPath(`/img/payment-providers/mollie_${method.method}.svg`),
                titleText: methodName,
                titleSubText: '',
            },
            [PaymentMethodId.Checkoutcom]: {
                logoUrl: ['credit_card', 'card', 'checkoutcom'].includes(method.id)
                    ? ''
                    : cdnPath(`/img/payment-providers/checkoutcom_${method.id.toLowerCase()}.svg`),
                titleText: methodName,
                titleSubText: '',
            },
            [PaymentMethodId.StripeV3]: {
                logoUrl: paymentWithLogo.includes(method.id)
                    ? cdnPath(`/img/payment-providers/stripe-${method.id.toLowerCase()}.svg`)
                    : '',
                titleText:
                    method.method === 'iban'
                        ? language.translate('payment.stripe_sepa_display_name_text')
                        : methodName,
                titleSubText: '',
            },
            [PaymentMethodId.StripeUPE]: {
                logoUrl: paymentWithLogo.includes(method.id)
                    ? cdnPath(`/img/payment-providers/stripe-${method.id.toLowerCase()}.svg`)
                    : '',
                titleText:
                    method.method === 'iban'
                        ? language.translate('payment.stripe_sepa_display_name_text')
                        : methodName,
                titleSubText: 'All major credit and debit cards accepted',
            },
            [PaymentMethodId.WorldpayAccess]: {
                logoUrl: '',
                titleText: language.translate('payment.credit_debit_card_text'),
                titleSubText: '',
            },
            [PaymentMethodId.Partially]: {
                logoUrl: method.logoUrl ? method.logoUrl : '',
                titleText: methodDisplayName,
                titleSubText: 'Ideal for people with an adverse credit rating.',
            },
        };

        if (method.id === PaymentMethodId.PaypalCommerceVenmo) {
            return customTitles[PaymentMethodId.PaypalCommerceAlternativeMethod];
        }

        // KLUDGE: 'paypal' is actually a credit card method. It is the only
        // exception to the rule below. We should probably fix it on API level,
        // but apparently it would break LCO if we are not careful.
        if (
            method.id === PaymentMethodId.PaypalPaymentsPro &&
            method.method === PaymentMethodType.CreditCard
        ) {
            return customTitles[PaymentMethodType.CreditCard];
        }

        return (
            customTitles[method.gateway || ''] ||
            customTitles[method.id] ||
            customTitles[method.method] ||
            customTitles[PaymentMethodType.CreditCard]
        );
    };
}

const PaymentMethodTitle: FunctionComponent<
    PaymentMethodTitleProps &
        WithLanguageProps &
        WithCdnPathProps &
        ConnectFormikProps<PaymentFormValues>
> = ({ cdnBasePath, formik: { values }, isSelected, language, method }) => {
    const methodName = getPaymentMethodName(language)(method);
    const { logoUrl, titleText, titleSubText } = getPaymentMethodTitle(language, cdnBasePath)(method);

    const getSelectedCardType = () => {
        if (!isSelected) {
            return;
        }

        if (isHostedCreditCardFieldsetValues(values) && values.hostedForm.cardType) {
            return values.hostedForm.cardType;
        }

        if (hasCreditCardNumber(values) && values.ccNumber) {
            const { card } = number(values.ccNumber);

            if (!card) {
                return;
            }

            return card.type;
        }
    };

    // Set card icons for Stripe
    if (method.gateway === PaymentMethodId.StripeUPE){
        method.supportedCards = ["VISA", "AMEX", "MC", "DISCOVER", "DINERS"];
    }

    if (method.gateway === PaymentMethodId.Clearpay){
        method.supportedCards = ["VISA", "MC"];
    }

    return (
        <div className="paymentProviderHeader-container">
            <div
                className="paymentProviderHeader-nameContainer"
                data-test={`payment-method-${method.id}`}
                style={{flexWrap: 'wrap'}}
            >
                {logoUrl && (
                    <img
                        alt={methodName}
                        className="paymentProviderHeader-img"
                        data-test="payment-method-logo"
                        src={logoUrl}
                    />
                )}

                {titleText && (
                    <div className="paymentProviderHeader-name" data-test="payment-method-name">
                        {titleText}
                    </div>
                )}

                {titleSubText && (
                    <div style={{width: '100%', fontSize: '1rem', fontWeight: '500'}}>
                        {titleSubText}
                    </div>
                )}
            </div>
            <div className="paymentProviderHeader-cc">
                <CreditCardIconList
                    cardTypes={compact(method.supportedCards.map(mapFromPaymentMethodCardType))}
                    selectedCardType={getSelectedCardType()}
                />
            </div>
        </div>
    );
};

function mapToCdnPathProps({ checkoutState }: CheckoutContextProps): WithCdnPathProps | null {
    const {
        data: { getConfig },
    } = checkoutState;
    const config = getConfig();

    if (!config) {
        return null;
    }

    return {
        cdnBasePath: config.cdnPath,
    };
}

export default connectFormik(
    withLanguage(withCheckout(mapToCdnPathProps)(memo(PaymentMethodTitle))),
);

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
    storeCurrency: string;
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
                titleText: '',
                titleSubText: 'Pay in 4 interest-free instalments',
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
                titleText: '',
                titleSubText: 'Pay in 4 interest-free instalments',
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
                titleSubText: '',
            },
            [PaymentMethodId.WorldpayAccess]: {
                logoUrl: '',
                titleText: language.translate('payment.credit_debit_card_text'),
                titleSubText: '',
            },
            [PaymentMethodId.Partially]: {
                logoUrl: method.logoUrl ? method.logoUrl : '',
                titleText: methodDisplayName,
                titleSubText: 'Ideal for people with an adverse credit rating',
            },
            // Cash on Delivery is used for Bread
            ['cod']: {
                logoUrl: 'https://cdn.instasmile.com/new-website/images/icons-merchants/icon-merchant-bread.svg',
                titleText: '',
                titleSubText: 'Flexible Ways to Buy Now and Pay Later',
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
> = ({ cdnBasePath, formik: { values }, isSelected, language, method, storeCurrency }) => {
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

    // Set card icons array to empty
    method.supportedCards = [];

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
                        <p style={{marginBottom: '0px'}}>{titleSubText}</p>
                        {method.gateway === PaymentMethodId.Partially && (
                            <div className='checkout-notifications'>
                                <div className="notification notification--info">
                                    <div className="notification__content">
                                        <p>
                                            {storeCurrency === 'USD' ?
                                                <i>Sorry, promo codes cannot be used with Partial.ly</i>
                                                :
                                                <i>Sorry, discount codes cannot be used with Partial.ly</i>
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {/* UK Stripe payment card icons */}
                {method.gateway === PaymentMethodId.StripeUPE && (
                    <div style={{width: '100%'}}>
                        <img id='stripeIconImg' src='https://cdn.instasmile.com/new-website/images/uk-cart-cards-2.png'></img>
                    </div>
                )}
                {/* US NMI payment card icons */}
                {method.id === 'nmi' && (
                    <div style={{width: '100%'}}>
                        <img id='nmiIconImg' src='https://cdn.instasmile.com/new-website/images/nmi_payment_type_cards-usa_may23.jpg'></img>
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
        storeCurrency: config.currency.code
    };
}

export default connectFormik(
    withLanguage(withCheckout(mapToCdnPathProps)(memo(PaymentMethodTitle))),
);

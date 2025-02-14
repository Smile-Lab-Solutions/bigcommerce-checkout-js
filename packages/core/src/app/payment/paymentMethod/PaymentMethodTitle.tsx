import { CardInstrument, LanguageService, PaymentMethod } from '@bigcommerce/checkout-sdk';
import { number } from 'card-validator';
import { compact } from 'lodash';
import React, { FunctionComponent, memo, ReactNode } from 'react';

import { withLanguage, WithLanguageProps } from '@bigcommerce/checkout/locale';
import { CheckoutContextProps , PaymentFormValues } from '@bigcommerce/checkout/payment-integration-api';

import { withCheckout } from '../../checkout';
import { connectFormik, ConnectFormikProps } from '../../common/form';
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
    onUnhandledError?(error: Error): void;
}

interface WithPaymentTitleProps {
    instruments: CardInstrument[];
    cdnBasePath: string;
    storeCurrency: string;
}

function getPaymentMethodTitle(
    language: LanguageService,
    basePath: string,
    storeCurrency: string,
): (method: PaymentMethod) => {
    logoUrl: string;
    titleText: string; 
    titleSubText: string,
    subtitle?: ReactNode | ((subtitleProps?: { onUnhandledError?(error: Error): void }) => ReactNode)
} {
    const cdnPath = (path: string) => `${basePath}${path}`;

    return (method) => {
        const paymentWithLogo = method.initializationData?.methodsWithLogo
            ? method.initializationData.methodsWithLogo
            : [];
        const methodName = getPaymentMethodName(language)(method);
        const methodDisplayName = getPaymentMethodDisplayName(language)(method);
        // TODO: API could provide the data below so UI can read simply read it.
        // However, I'm not sure how we deal with translation yet. TBC.
        const customTitles: { [key: string]: { logoUrl: string; titleText: string; titleSubText: string; subtitle?: ReactNode; } } = {
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
            [PaymentMethodId.BraintreePaypalCredit]: {
                logoUrl: cdnPath('/img/payment-providers/paypal_commerce_logo_letter.svg'),
                titleText: methodDisplayName,
                titleSubText: '',
            },
            [PaymentMethodType.PaypalCredit]: {
                logoUrl: cdnPath('/img/payment-providers/paypal_commerce_logo_letter.svg'),
                titleText: methodDisplayName,
                titleSubText: '',
            },
            [PaymentMethodId.BraintreeAch]: {
                logoUrl: method.logoUrl || '',
                titleText: methodDisplayName,
                titleSubText: '',
            },
            [PaymentMethodId.BraintreeLocalPaymentMethod]: {
                logoUrl: method.logoUrl || '',
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
                titleText: 'Make payment with your Venmo account',
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
                titleText: 'Pay in 4 interest free installments',
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
            [PaymentMethodId.Clearpay]: {
                logoUrl: cdnPath('/img/payment-providers/clearpay-header.png'),
                titleText: 'Pay in 4 interest-free installments',
                titleSubText: '',
            },
            [PaymentMethodType.GooglePay]: {
                logoUrl: cdnPath('/img/payment-providers/google-pay.png'),
                titleText: 'Make payment with your Google Pay account',
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
                titleText: storeCurrency === 'USD' ? 'Pay in 4 or 12 interest free installments' : methodDisplayName,
                titleSubText: '',
            },
            [PaymentMethodId.Laybuy]: {
                logoUrl: cdnPath('/img/payment-providers/laybuy-checkout-header.png'),
                titleText: 'Buy now and pay over 6 weekly interest-free instalments',
                titleSubText: '',
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
                titleText: 'Pay in up to 8 installments',
                titleSubText: '',
            },
            [PaymentMethodId.Sezzle]: {
                logoUrl: cdnPath('/img/payment-providers/sezzle-checkout-header.png'),
                titleText: language.translate('payment.sezzle_display_name_text'),
                titleSubText: '',
            },
            [PaymentMethodId.Zip]: {
                logoUrl: cdnPath('/img/payment-providers/zip.png'),
                titleText: 'Pay in 4 interest free installments',
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
                titleSubText: 'For people with a bad or zero credit',
            },
            // Cash on Delivery is used for Bread
            ['cod']: {
                logoUrl: 'https://cdn.instasmile.com/new-website/images/icons-merchants/icon-merchant-bread.svg',
                titleText: '',
                titleSubText: 'Up to 18 months credit from 0% APR',
            },
            // Cheque is used for PayTomorrow
            // ['cheque']: {
            //     logoUrl: '',
            //     titleText: 'Pay over 6 months 0% APR',
            //     titleSubText: 'For people with a 600+ FICO credit score',
            // },
            [PaymentMethodId.TerraceFinance]: {
                logoUrl: method.logoUrl ? method.logoUrl : '',
                titleText: methodDisplayName,
                titleSubText: 'Payment solutions tailored for you',
            },
            [PaymentMethodId.Flex]: {
                logoUrl: method.logoUrl ? method.logoUrl : '',
                titleText: methodDisplayName,
                titleSubText: 'Flex subtext',
            },
        };


        if (method.gateway === PaymentMethodId.BlueSnapDirect) {
            if (method.id === 'credit_card') {
                return { logoUrl: '', titleText: language.translate('payment.credit_card_text'), titleSubText: '' };
            }

            if (method.id === 'ecp') {
                return { logoUrl: '', titleText: language.translate('payment.bluesnap_direct_electronic_check_label'), titleSubText: '' };
            }

            if (method.id === 'banktransfer') {
                return { logoUrl: '', titleText: language.translate('payment.bluesnap_direct_local_bank_transfer_label'), titleSubText: '' };
            }
        }


        if (method.gateway === PaymentMethodId.BlueSnapDirect) {
            if (method.id === 'credit_card') {
                return { logoUrl: '', titleText: language.translate('payment.credit_card_text'), titleSubText: '' };
            }

            if (method.id === 'ecp') {
                return { logoUrl: '', titleText: language.translate('payment.bluesnap_direct_electronic_check_label'), titleSubText: '' };
            }

            if (method.id === 'banktransfer') {
                return { logoUrl: '', titleText: language.translate('payment.bluesnap_direct_local_bank_transfer_label'), titleSubText: '' };
            }
        }

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

        if (method.id === PaymentMethodId.Ratepay) {
            return { logoUrl: method.logoUrl || '', titleText: language.translate('payment.ratepay.payment_method_title'), titleSubText: '' };
        }

        return (
            customTitles[method.gateway || ''] ||
            customTitles[method.id] ||
            customTitles[method.method] ||
            customTitles[PaymentMethodType.CreditCard]
        );
    };
}

function getInstrumentForMethod(
    instruments: CardInstrument[],
    method: PaymentMethod,
    values: PaymentFormValues
): CardInstrument | undefined {
    const instrumentsForMethod = instruments.filter(instrument => instrument.provider === method.id);
    const selectedInstrument = instrumentsForMethod.find(instrument => instrument.bigpayToken === values.instrumentId);

    return selectedInstrument;
}

const PaymentMethodTitle: FunctionComponent<
    PaymentMethodTitleProps &
        WithLanguageProps &
        WithPaymentTitleProps &
        ConnectFormikProps<PaymentFormValues>
> = ({ cdnBasePath, onUnhandledError, formik: { values }, instruments, isSelected, language, method, storeCurrency }) => {
    const methodName = getPaymentMethodName(language)(method);
    const { logoUrl, titleText, titleSubText, subtitle } = getPaymentMethodTitle(language, cdnBasePath, storeCurrency)(method);

    const getSelectedCardType = () => {
        if (!isSelected) {
            return;
        }

        const instrumentSelected = getInstrumentForMethod(instruments, method, values);

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

        if (instrumentSelected) {
            return instrumentSelected.brand;
        }
    };

    const getSubtitle = () => {
        const node = subtitle instanceof Function ? subtitle({ onUnhandledError }) : subtitle;

        return node ? <div className="paymentProviderHeader-subtitleContainer">
            {node}
        </div> : null
    }

    // Set card icons array to empty
    method.supportedCards = [];

    return (
        <div className="paymentProviderHeader-container">
            <div
                className="paymentProviderHeader-nameContainer"
                data-test={`payment-method-${method.id}`}
                style={method.id === 'paypalcommerce' ? {} : {flexWrap: 'wrap', width: '100%'}}
            >
                {logoUrl && (
                    <img
                        alt={methodName}
                        className="paymentProviderHeader-img"
                        data-test="payment-method-logo"
                        src={logoUrl}
                        id={method.id}
                    />
                )}

                {/* US PayTomorrow payment icon */}
                {/* {method.id === 'cheque' && (
                    <img
                        alt={methodName}
                        className="paymentProviderHeader-img"
                        data-test="payment-method-logo"
                        src='https://cdn.paytomorrow.com/image/PayTomorrow_Logo_light_24px.png'
                        id='pt-img'
                    />
                )} */}

                {/* Paypal payment second icon */}
                {method.id === 'paypalcommerce' && (
                    <>
                        <div style={{margin: '0.5rem 1rem 0.5rem 1rem', borderLeft: '1px solid black'}}></div>
                        <img
                            alt={methodName}
                            className="paymentProviderHeader-img"
                            data-test="payment-method-logo"
                            src='https://cdn.instasmile.com/new-website/images/icons-merchants/icon-merchant-pp-credit.png'
                            id='paypalcommerceSecondIcon'
                        />
                    </>
                )}

                {titleText && (
                    <div 
                        data-test="payment-method-name" 
                        style={method.id === 'partially' ? {display: 'block'} : {display: 'contents'}}>
                        <p style={{marginBottom: '0px', fontSize: '1.15rem', marginTop: '0.5rem', fontWeight: '500'}}>{titleText}</p>
                    </div>
                )}

                {titleSubText && (
                    <div style={method.id !== 'partially' && method.id !== 'cod' ? {width: '100%', fontSize: '1rem', fontWeight: '500'} : {}}>
                        <p style={method.id === 'partially' || method.id === 'cod' ? {marginBottom: '0px', fontSize: '1.15rem', fontWeight: '500'} : {marginBottom: '0px'}}>{titleSubText}</p>
                    </div>
                )}

                {method.gateway === PaymentMethodId.Partially && (
                    <div className='checkout-notifications merchant' style={{width: '100%'}}>
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

                {/* US Terrace Finance promo code info */}
                {method.gateway === PaymentMethodId.TerraceFinance && (
                    <div className='checkout-notifications merchant' style={{ width: '100%' }}>
                        <div className="notification notification--info">
                            <div className="notification__content">
                                <p>
                                    <i>Sorry, promo codes cannot be used with Terrace Finance</i>
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* US PayTomorrow promo code info */}
                {/* {method.id === 'cheque' && (
                    <div className='checkout-notifications merchant' style={{width: '100%'}}>
                        <div className="notification notification--info">
                            <div className="notification__content">
                                <p>
                                    <i>Sorry, promo codes cannot be used with Paytomorrow</i>
                                </p>
                            </div>
                        </div>
                    </div>
                )} */}

                {/* UK Stripe payment card icons */}
                {method.gateway === PaymentMethodId.StripeUPE && (
                    <div style={{width: '100%'}}>
                        <img id='stripeIconImg' src='https://cdn.instasmile.com/new-website/images/uk-cart-cards-sep23.png'></img>
                    </div>
                )}

                {/* US Authorize.net subtext & payment card icons */}
                {method.id === 'authorizenet' && (
                    <>
                        <div style={{ width: '100%', fontSize: '1rem', fontWeight: '500' }}>
                            <p style={{ marginBottom: '0px' }}>We accept all major credit and debit cards as well as HSA and FSA.</p>
                        </div>
                        <div style={{ width: '100%' }}>
                            <img id='authorizenetIconImg' src='https://cdn11.bigcommerce.com/s-k4sm7fwqbp/images/stencil/original/image-manager/us-footer-160424.png?t=1713255511'></img>
                        </div>
                    </>
                )}

                {getSubtitle()}
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

function mapToCheckoutProps({ checkoutState }: CheckoutContextProps): WithPaymentTitleProps | null {
    const {
        data: { getConfig, getInstruments },
    } = checkoutState;
    const config = getConfig();

    const instruments = getInstruments() || [];

    if (!config) {
        return null;
    }

    return {
        instruments,
        cdnBasePath: config.cdnPath,
        storeCurrency: config.currency.code
    };
}

export default connectFormik(
    withLanguage(withCheckout(mapToCheckoutProps)(memo(PaymentMethodTitle))),
);

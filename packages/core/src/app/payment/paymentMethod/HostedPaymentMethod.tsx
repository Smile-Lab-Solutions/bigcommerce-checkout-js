import {
    type AccountInstrument,
    type CheckoutSelectors,
    type PaymentInitializeOptions,
    type PaymentInstrument,
    type PaymentMethod,
    type PaymentRequestOptions,
} from '@bigcommerce/checkout-sdk';
import { createExternalPaymentStrategy } from '@bigcommerce/checkout-sdk/integrations/external';
import { createHummPaymentStrategy } from '@bigcommerce/checkout-sdk/integrations/humm';
import { createOffsitePaymentStrategy } from '@bigcommerce/checkout-sdk/integrations/offsite';
import { memoizeOne } from '@bigcommerce/memoize';
import { find, noop } from 'lodash';
import React, { Component, type ReactNode } from 'react';

import { type MapToPropsFactory } from '@bigcommerce/checkout/legacy-hoc';
import { withLanguage, type WithLanguageProps } from '@bigcommerce/checkout/locale';
import { type CheckoutContextProps, type PaymentFormValues } from '@bigcommerce/checkout/payment-integration-api';
import { LoadingOverlay } from '@bigcommerce/checkout/ui';

import { withCheckout } from '../../checkout';
import { connectFormik, type ConnectFormikProps } from '../../common/form';
import {
    AccountInstrumentFieldset,
    isAccountInstrument,
    isInstrumentFeatureAvailable,
} from '../storedInstrument';
import StoreInstrumentFieldset from '../StoreInstrumentFieldset';
import withPayment, { type WithPaymentProps } from '../withPayment';
import PaymentMethodId from './PaymentMethodId';

export interface HostedPaymentMethodProps {
    description?: ReactNode;
    isInitializing?: boolean;
    isUsingMultiShipping?: boolean;
    method: PaymentMethod;
    deinitializePayment(options: PaymentRequestOptions): Promise<CheckoutSelectors>;
    initializePayment(options: PaymentInitializeOptions): Promise<CheckoutSelectors>;
    onUnhandledError?(error: Error): void;
}

interface HostedPaymentMethodState {
    isAddingNewInstrument: boolean;
    selectedInstrument?: AccountInstrument;
}

interface WithCheckoutHostedPaymentMethodProps {
    instruments: AccountInstrument[];
    isInstrumentFeatureAvailable: boolean;
    isLoadingInstruments: boolean;
    isNewAddress: boolean;
    isPaymentDataRequired: boolean;
    loadInstruments(): Promise<CheckoutSelectors>;
}

class HostedPaymentMethod extends Component<
    HostedPaymentMethodProps &
        WithCheckoutHostedPaymentMethodProps &
        WithPaymentProps &
        WithLanguageProps &
        ConnectFormikProps<PaymentFormValues>,
    HostedPaymentMethodState
> {
    state: HostedPaymentMethodState = {
        isAddingNewInstrument: false,
    };

    async componentDidMount(): Promise<void> {
        const {
            initializePayment,
            isInstrumentFeatureAvailable: isInstrumentFeatureAvailableProp,
            loadInstruments,
            method,
            onUnhandledError = noop,
        } = this.props;

        try {
            await initializePayment({
                gatewayId: method.gateway,
                methodId: method.id,
                integrations: [
                    createHummPaymentStrategy,
                    createExternalPaymentStrategy,
                    createOffsitePaymentStrategy,
                ],
            });

            if (isInstrumentFeatureAvailableProp) {
                await loadInstruments();
            }
        } catch (error) {
            onUnhandledError(error);
        }
    }

    async componentWillUnmount(): Promise<void> {
        const { deinitializePayment, method, onUnhandledError = noop } = this.props;

        try {
            await deinitializePayment({
                gatewayId: method.gateway,
                methodId: method.id,
            });
        } catch (error) {
            onUnhandledError(error);
        }
    }

    render(): ReactNode {
        const {
            description,
            isInitializing = false,
            isLoadingInstruments,
            instruments,
            isNewAddress,
            isInstrumentFeatureAvailable: isInstrumentFeatureAvailableProp,
        } = this.props;

        const { selectedInstrument = this.getDefaultInstrument() } = this.state;

        const isLoading = isInitializing || isLoadingInstruments;
        const shouldShowInstrumentFieldset =
            isInstrumentFeatureAvailableProp && (instruments.length > 0 || isNewAddress);

        if (!description && !isInstrumentFeatureAvailableProp) {
            return this.renderPaymentDescriptorIfAvailable(isLoading);
        }

        return (
            <LoadingOverlay hideContentWhenLoading isLoading={isLoading}>
                <div className="paymentMethod paymentMethod--hosted">
                    {description}

                    {shouldShowInstrumentFieldset && (
                        <AccountInstrumentFieldset
                            instruments={instruments}
                            onSelectInstrument={this.handleSelectInstrument}
                            onUseNewInstrument={this.handleUseNewInstrument}
                            selectedInstrument={selectedInstrument}
                        />
                    )}

                    {isInstrumentFeatureAvailableProp && (
                        <StoreInstrumentFieldset
                            instrumentId={selectedInstrument && selectedInstrument.bigpayToken}
                            isAccountInstrument={true}
                        />
                    )}
                </div>
            </LoadingOverlay>
        );
    }

    private getDefaultInstrument(): AccountInstrument | undefined {
        const { isAddingNewInstrument } = this.state;
        const { instruments } = this.props;

        if (isAddingNewInstrument || !instruments.length) {
            return;
        }

        return find(instruments, { defaultInstrument: true }) || instruments[0];
    }

    private handleUseNewInstrument: () => void = () => {
        this.setState({
            isAddingNewInstrument: true,
            selectedInstrument: undefined,
        });
    };

    private handleSelectInstrument: (id: string) => void = (id) => {
        const { instruments } = this.props;

        this.setState({
            isAddingNewInstrument: false,
            selectedInstrument: find(instruments, { bigpayToken: id }),
        });
    };

    private renderPaymentDescriptorIfAvailable(isLoading: boolean) {
        const { method } = this.props;
        
        // UK laybuy payment method block content
        if (method.id === 'laybuy') {
            return (
                <LoadingOverlay hideContentWhenLoading isLoading={isLoading}>
                    <div className="paymentMethod paymentMethod--hosted">
                        <div className="payment-descriptor">
                            <p>Spread the total cost over 6 weekly automatic payments. Always interest-free. Make the first payment today
                                and spread the cost over 6 weeks with payments every week.
                            </p>
                            <ul className="list-element">
                                <li><div className="circleCheck"></div>Pay using Visa or MasterCard</li>
                                <li><div className="circleCheck"></div>Subject to soft credit check</li>
                                <li><div className="circleCheck"></div>0% interest</li>
                                <li><div className="circleCheck"></div>Payments every week</li>
                            </ul>
                            <p>After clicking "Place Order", you will be redirected to Laybuy to complete your purchase securely.</p>
                        </div>
                    </div>
                </LoadingOverlay>
            );

        // UK clearpay payment method block content
        } else if (method.id === 'PAY_BY_INSTALLMENT') {
            return (
                <LoadingOverlay hideContentWhenLoading isLoading={isLoading}>
                    <div className="paymentMethod paymentMethod--hosted">
                        <div className="payment-descriptor">
                            <p>Pay in 4 interest-free instalments, payable every 2 weeks. Make the first payment today and spread the cost over 6 weeks.
                            </p>
                            <ul className="list-element">
                                <li><div className="circleCheck"></div>Pay using Amex, Visa or MasterCard</li>
                                <li><div className="circleCheck"></div>Identity check required</li>
                                <li><div className="circleCheck"></div>0% interest</li>
                                <li><div className="circleCheck"></div>Payments due every 2 weeks</li>
                            </ul>
                            <p style={{fontSize: 'smaller'}}>Clearpay lends you a fixed amount of credit so you can pay for your purchase over 4 instalments, due every 2 weeks. 
                                Ensure you can make repayments on time. You must be 18+ and a permanent UK resident (excl Channel Islands). 
                                Clearpay charges a £6 late fee for each late instalment and a further £6 if it’s still unpaid 7 days later. 
                                Late fees are capped at £6 for orders under £24 and the lower of £24 or 25% of the order value for orders over £24. 
                                Missed payments may affect your ability to use Clearpay in the future and your details may be passed onto a debt 
                                collection agency working on Clearpay’s behalf. Clearpay is credit that is not regulated by the Financial Conduct Authority. 
                                T&Cs and other eligibility criteria apply at <a href="https://www.clearpay.co.uk/en-GB/terms-of-service" target="_blank">clearpay.co.uk/terms</a></p>
                            <p>After clicking "Place Order", you will be redirected to Clearpay to complete your purchase securely.</p>
                        </div>
                    </div>
                </LoadingOverlay>
            );

        // US afterpay payment method block content
        } else if (method.gateway === PaymentMethodId.Afterpay) {
            return (
                <LoadingOverlay hideContentWhenLoading isLoading={isLoading}>
                    <div className="paymentMethod paymentMethod--hosted">
                    <div className="payment-descriptor">
                            <p>Pay in 4 interest-free instalments, payable every 2 weeks. Make the first payment today and spread the cost over 6 weeks.
                            </p>
                            <ul className="list-element">
                                <li><div className="circleCheck"></div>Pay using Amex, Visa or MasterCard</li>
                                <li><div className="circleCheck"></div>May conduct a soft credit check</li>
                                <li><div className="circleCheck"></div>0% interest</li>
                                <li><div className="circleCheck"></div>Payments every 2 weeks</li>
                            </ul>
                            <p>After clicking "Place Order", you will be redirected to Afterpay to complete your purchase securely.</p>
                        </div>
                    </div>
                </LoadingOverlay>
            );

        // US zip payment method block content
        // Zip, previously Quadpay
        } else if (method.id === 'quadpay') {
            return (
                <LoadingOverlay hideContentWhenLoading isLoading={isLoading}>
                    <div className="paymentMethod paymentMethod--hosted">
                    <div className="payment-descriptor">
                            <p>Pay in 4 payments split into equal installments over 6 weeks. <br></br> 1st payment due at checkout. 
                            </p>
                            <ul className="list-element">
                                <li><div className="circleCheck"></div>Pay using Amex, Visa or Mastercard (as long as they are not pre-paid)</li>
                                <li><div className="circleCheck"></div>Buy now, pay later</li>
                                <li><div className="circleCheck"></div>Installments are due every 2 weeks</li>
                            </ul>
                            <p style={{fontSize: 'smaller'}}>
                            Zip can only be used for US purchases. 
                            Late fees may apply, subject to eligibility. See complete <a href='https://zip.co/us/quadpay-terms-of-service' target="_blank">US Terms </a> 
                            or <a href='https://zip.co/en-ca/quadpay-terms-of-service' target="_blank">Canada Terms</a> for more detail. 
                            Est. payments on product pages exclude taxes, shipping and consumer fees added at checkout. 
                            Loans to California residents are pursuant to CFL license #60DBO-110414. Zip is the originator of all loans in CO, NV, MA, and MD. 
                            Where indicated in the terms and conditions, loans in other states are originated by WebBank. 
                            All loans subject to approval. Zip Co US Inc. ID 1963958 <a href='https://mortgage.nationwidelicensingsystem.org/about/Pages/NMLSConsumerAccess.aspx' target="_blank">NMLS Consumer Access</a>.
                            </p>
                            <p>After clicking "Place Order", you will be redirected to Zip to complete your purchase securely.</p>
                        </div>
                    </div>
                </LoadingOverlay>
            );

        }
        else {
            return null;
        }
    }
}

const mapFromCheckoutProps: MapToPropsFactory<
    CheckoutContextProps,
    WithCheckoutHostedPaymentMethodProps,
    HostedPaymentMethodProps & ConnectFormikProps<PaymentFormValues>
> = () => {
    const filterAccountInstruments = memoizeOne((instruments: PaymentInstrument[] = []) =>
        instruments.filter(isAccountInstrument),
    );
    const filterTrustedInstruments = memoizeOne((instruments: AccountInstrument[] = []) =>
        instruments.filter(({ trustedShippingAddress }) => trustedShippingAddress),
    );

    return (context, props) => {
        const { method } = props;

        const { checkoutService, checkoutState } = context;

        const {
            data: {
                getCart,
                getConfig,
                getCustomer,
                getInstruments,
                isPaymentDataRequired,
                isPaymentDataSubmitted,
            },
            statuses: { isLoadingInstruments },
        } = checkoutState;

        const cart = getCart();
        const config = getConfig();
        const customer = getCustomer();

        if (!config || !cart || !customer || !method) {
            return null;
        }

        const currentMethodInstruments = filterAccountInstruments(getInstruments(method));
        const trustedInstruments = filterTrustedInstruments(currentMethodInstruments);

        return {
            instruments: trustedInstruments,
            isNewAddress: trustedInstruments.length === 0 && currentMethodInstruments.length > 0,
            isInstrumentFeatureAvailable:
                !isPaymentDataSubmitted(method.id, method.gateway) &&
                isInstrumentFeatureAvailable({
                    config,
                    customer,
                    paymentMethod: method,
                }),
            isLoadingInstruments: isLoadingInstruments(),
            isPaymentDataRequired: isPaymentDataRequired(),
            loadInstruments: checkoutService.loadInstruments,
        };
    };
};

export default connectFormik(
    withLanguage(withPayment(withCheckout(mapFromCheckoutProps)(HostedPaymentMethod))),
);

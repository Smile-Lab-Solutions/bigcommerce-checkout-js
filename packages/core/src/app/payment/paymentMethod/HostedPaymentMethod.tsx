import {
    AccountInstrument,
    CheckoutSelectors,
    PaymentInitializeOptions,
    PaymentInstrument,
    PaymentMethod,
    PaymentRequestOptions,
} from '@bigcommerce/checkout-sdk';
import { memoizeOne } from '@bigcommerce/memoize';
import { find, noop } from 'lodash';
import React, { Component, ReactNode } from 'react';

import { PaymentFormValues } from '@bigcommerce/checkout/payment-integration-api';

import { CheckoutContextProps, withCheckout } from '../../checkout';
import { connectFormik, ConnectFormikProps } from '../../common/form';
import { MapToPropsFactory } from '../../common/hoc';
import { withLanguage, WithLanguageProps } from '../../locale';
import { LoadingOverlay } from '../../ui/loading';
import {
    AccountInstrumentFieldset,
    isAccountInstrument,
    isInstrumentFeatureAvailable,
} from '../storedInstrument';
import StoreInstrumentFieldset from '../StoreInstrumentFieldset';
import withPayment, { WithPaymentProps } from '../withPayment';
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
                            <p>Pay in 4 interest-free instalments, payable every 2 weeks. Make the first payment today
                                and spread the cost over 6 weeks.
                            </p>
                            <ul className="list-element">
                                <li><div className="circleCheck"></div>Pay using Amex, Visa or MasterCard</li>
                                <li><div className="circleCheck"></div>No credit check needed</li>
                                <li><div className="circleCheck"></div>0% interest</li>
                                <li><div className="circleCheck"></div>Payments every 2 week</li>
                            </ul>
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
                                <li><div className="circleCheck"></div>Payments every 2 week</li>
                            </ul>
                            <p>After clicking "Place Order", you will be redirected to Afterpay to complete your purchase securely.</p>
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
        const { isUsingMultiShipping = false, method } = props;

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
                    isUsingMultiShipping,
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

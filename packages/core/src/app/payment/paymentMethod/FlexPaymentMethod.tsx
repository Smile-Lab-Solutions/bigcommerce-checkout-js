import React, { Component, ReactNode } from 'react';
import { type CheckoutContextProps } from '@bigcommerce/checkout/contexts';
import { Checkout, PaymentMethod, CheckoutSelectors, StoreConfig, Address } from '@bigcommerce/checkout-sdk';
import { PaymentFormValues } from '@bigcommerce/checkout/payment-integration-api';
import { ConnectFormikProps, connectFormik } from '../../common/form';
import { MapToPropsFactory } from '@bigcommerce/checkout/legacy-hoc';
import { WithLanguageProps, withLanguage } from '@bigcommerce/checkout/locale';
import withPayment, { WithPaymentProps } from '../withPayment';
import { LoadingOverlay } from '@bigcommerce/checkout/ui';
import { withCheckout } from '../../checkout';

export interface HostedPaymentMethodProps {
  method: PaymentMethod;
  onUnhandledError?(error: Error): void;
}

interface WithCheckoutHostedPaymentMethodProps {
  checkout: Checkout | undefined;
  config: StoreConfig | undefined;
  shippingAddress: Address | undefined;
}

class FlexPaymentMethod extends Component<
      HostedPaymentMethodProps &
      WithCheckoutHostedPaymentMethodProps &
      WithPaymentProps &
      WithLanguageProps &
      ConnectFormikProps<PaymentFormValues>
> {
  async componentDidMount(): Promise<CheckoutSelectors | void> {
      const {
          method,
          disableSubmit,
      } = this.props;

      disableSubmit(method, false);
  }

  render(): ReactNode {
    return (
      <LoadingOverlay hideContentWhenLoading isLoading={false}>
        <div className="paymentMethod paymentMethod--hosted">
          <div className="payment-descriptor">
            <p>Pay with HSA/FSA to complete your purchase securely.</p>
            <p>Your purchase requires verification of eligibility, follow the steps to complete a brief telehealth consultation in the checkout.</p>
            <ul className="list-element">
              {this.getListText()}
            </ul>
          </div>
        </div>
      </LoadingOverlay>
    );
  }

  private getListText: () => ReactNode = () => {
    return <>
    </>
  }

  componentWillUnmount(): void {
  }
}

const mapFromCheckoutProps: MapToPropsFactory<
  CheckoutContextProps,
  WithCheckoutHostedPaymentMethodProps,
  HostedPaymentMethodProps & ConnectFormikProps<PaymentFormValues>
> = () => {
  return (context, props) => {
      const {
        method,
      } = props;

      const { checkoutState } = context;

      const {
          data: {
              getCheckout, getConfig, getShippingAddress
          }
      } = checkoutState;

      const checkout = getCheckout();
      const config = getConfig();
      const shippingAddress = getShippingAddress();
      
      return {
          checkout: checkout,
          method: method,
          config: config,
          shippingAddress: shippingAddress
      };
  };
};

export default connectFormik(withLanguage(withPayment(withCheckout(mapFromCheckoutProps)(FlexPaymentMethod))));
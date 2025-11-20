import React, { Component, ReactNode } from 'react';
import { toggleCouponBlock } from '../../../../../../scripts/custom/partially.js';
import { type CheckoutContextProps } from '@bigcommerce/checkout/contexts';
import { Checkout, PaymentMethod, CheckoutSelectors, StoreConfig } from '@bigcommerce/checkout-sdk';
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
  removeCoupon(code: string): void;
}

class PartiallyPaymentMethod extends Component<
      HostedPaymentMethodProps &
      WithCheckoutHostedPaymentMethodProps &
      WithPaymentProps &
      WithLanguageProps &
      ConnectFormikProps<PaymentFormValues>
> {
  async componentDidMount(): Promise<CheckoutSelectors | void> {
      const {
          checkout,
          removeCoupon
      } = this.props;

      try {
        if (checkout && checkout.coupons.length > 0){
          checkout.coupons.forEach(coupon => {
            removeCoupon(coupon.code);
          });
        }

        toggleCouponBlock(true);
      } catch(e){}
  }

  render(): ReactNode {
    const { config } = this.props;
    return (
      <LoadingOverlay hideContentWhenLoading isLoading={false}>
        <div className="paymentMethod paymentMethod--hosted">
          <div className="payment-descriptor">
            <ul className="list-element">
              {this.getListText(config?.currency.code)}
            </ul>
          </div>
        </div>
        <div id="partiallyCartButtonContainer" style={{display: 'none'}}></div>
      </LoadingOverlay>
    );
  }

  private getListText: (currency: string | undefined) => ReactNode = (currency) => {
    if (currency === "GBP") {
      return <>
        <li><div className="circleCheck"></div>Just £99 deposit today</li>
        <li><div className="circleCheck"></div>Monthly payments from £29.33</li>
        <li><div className="circleCheck"></div>Spread the cost over 6 months</li>
        <li><div className="circleCheck"></div>No Credit Check</li>
        <li><div className="circleCheck"></div>£25 Plan fee (Non refundable) included in deposit payment</li>
      </>
    } else if (currency === "USD") {
      return <>
        <li><div className="circleCheck"></div>Just <b>$149</b> down today!</li>
        <li><div className="circleCheck"></div>Low payments every 2 weeks</li>
        <li><div className="circleCheck"></div>Spread the cost over <b>20 weeks</b></li>
        <li><div className="circleCheck"></div>No Credit Check</li>
        <li><div className="circleCheck"></div><b>$50</b> Plan fee (Non refundable) included in down payment</li>
      </>
    } else if (currency === "AUD") {
      return <>
        <li>aud</li>
      </>
    }

    return <></>;
  }

  componentWillUnmount(): void {
    {
      toggleCouponBlock(false);
    }
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

      const { checkoutState, checkoutService } = context;

      const {
          data: {
              getCheckout, getConfig
          },
      } = checkoutState;

      const checkout = getCheckout();
      const config = getConfig();
      
      return {
          checkout: checkout,
          method: method,
          config,
          removeCoupon: checkoutService.removeCoupon
      };
  };
};

export default connectFormik(withLanguage(withPayment(withCheckout(mapFromCheckoutProps)(PartiallyPaymentMethod))));
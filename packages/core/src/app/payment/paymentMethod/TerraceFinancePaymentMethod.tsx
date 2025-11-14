import React, { Component, ReactNode } from 'react';
import { type CheckoutContextProps } from '@bigcommerce/checkout/contexts';
import { Checkout, PaymentMethod, CheckoutSelectors, StoreConfig } from '@bigcommerce/checkout-sdk';
import { PaymentFormValues } from '@bigcommerce/checkout/payment-integration-api';
import { ConnectFormikProps, connectFormik } from '../../common/form';
import { MapToPropsFactory } from '@bigcommerce/checkout/legacy-hoc';
import { WithLanguageProps, withLanguage } from '@bigcommerce/checkout/locale';
import withPayment, { WithPaymentProps } from '../withPayment';
import { LoadingOverlay } from '@bigcommerce/checkout/ui';
import { withCheckout } from '../../checkout';
import { toggleCouponBlock } from '../../../../../../scripts/custom/terraceFinance';

export interface HostedPaymentMethodProps {
  method: PaymentMethod;
  onUnhandledError?(error: Error): void;
}

interface WithCheckoutHostedPaymentMethodProps {
  checkout: Checkout | undefined;
  config: StoreConfig | undefined;
  removeCoupon(code: string): void;
}

class TerraceFinancePaymentMethod extends Component<
      HostedPaymentMethodProps &
      WithCheckoutHostedPaymentMethodProps &
      WithPaymentProps &
      WithLanguageProps &
      ConnectFormikProps<PaymentFormValues>
> {
  async componentDidMount(): Promise<CheckoutSelectors | void> {
      const {
          method,
          checkout,
          disableSubmit,
          removeCoupon,
      } = this.props;

      try {
        if (checkout && checkout.coupons.length > 0){
          checkout.coupons.forEach(coupon => {
            removeCoupon(coupon.code);
          });
        }

        toggleCouponBlock(true);
      } catch(e){}

      disableSubmit(method, false);
    }

  render(): ReactNode {
    return (
      <LoadingOverlay hideContentWhenLoading isLoading={false}>
        <div className="paymentMethod paymentMethod--hosted">
          <div className="payment-descriptor">
            <ul className="list-element">
              {this.getListText()}
            </ul>
            <div className="checkout-notifications tfCouponWarning" style={{display: 'block'}}>
              <div className="notification notification--info">
                <div className="notification__content">
                  <p><i>Sorry, promo codes cannot be used with Terrace Finance</i></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </LoadingOverlay>
    );
  }

  private getListText: () => ReactNode = () => {
    return <>
      <li><div className="circleCheck"></div><b>NEW</b> - 180 Days same-as-cash option</li>
      <li><div className="circleCheck"></div><b>Early pay-off discounts available</b></li>
      <li><div className="circleCheck"></div>Soft Credit pull on application</li>
      <li><div className="circleCheck"></div>$99 due today</li>
      <li><div className="circleCheck"></div>Up to 12 months term length</li>
      <li><div className="circleCheck"></div>Instant decision</li>
      <li><div className="circleCheck"></div>Skip-a-payment option</li>
      <li><div className="circleCheck"></div>Applicant must be in employment</li>

      <p style={{ fontSize: 'smaller' }}><strong>Not available in the following states: IL (Illinois), IN (Indiana), MS (Massachusetts), OK (Oklahoma), WN (Washington DC), VT (Vermont), MN (Minnesota), NJ (New Jersey), WI (Wisconsin), PR (Puerto Rico and islands)</strong></p>
      <p style={{ fontSize: 'smaller' }}>Terrace Finance is not a lender. We route your application through our network of lenders/lessors. Approval and approval amount are subject to credit eligibility and not guaranteed. Must be 18 or older to apply.</p>
    </>
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
          }
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

export default connectFormik(withLanguage(withPayment(withCheckout(mapFromCheckoutProps)(TerraceFinancePaymentMethod))));
import React, { Component, ReactNode } from 'react';
import { configurePartiallyButton, loadPartiallyJs, toggleCouponBlock } from '../../../../../../scripts/custom/partially.js';
import { CheckoutContextProps, withCheckout } from '../../checkout';
import { Checkout, PaymentMethod, CheckoutSelectors, StoreConfig, CustomError } from '@bigcommerce/checkout-sdk';
import { PaymentFormValues } from '@bigcommerce/checkout/payment-integration-api';
import { ConnectFormikProps, connectFormik } from '../../common/form';
import { MapToPropsFactory } from '../../common/hoc';
import { WithLanguageProps, withLanguage } from '../../locale';
import withPayment, { WithPaymentProps } from '../withPayment';
import { noop } from 'lodash';
import { LoadingOverlay } from '../../ui/loading';

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
          method,
          setSubmit,
          checkout,
          removeCoupon
      } = this.props;

      setSubmit(method, this.handleSubmit);
      loadPartiallyJs();

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
    const {} = this.props;

    return (
      <LoadingOverlay hideContentWhenLoading isLoading={false}>
        <div className="paymentMethod paymentMethod--hosted">
          <div className="payment-descriptor">
            <ul className="list-element">
              <li><div className="circleCheck"></div>No Credit Check | 100% Acceptance</li>
              <li><div className="circleCheck"></div>Spread the cost over 12 months</li>
              <li><div className="circleCheck"></div>From £150 deposit</li>
              <li><div className="circleCheck"></div>No Payment Plan Charge</li>
            </ul>
          </div>
        </div>
        <div id="partiallyCartButtonContainer" style={{display: 'none'}}></div>
      </LoadingOverlay>
    );
  }

  private handleSubmit: (values: PaymentFormValues) => void = async () => {
    const {
      method,
      checkout,
      config,
      onUnhandledError = noop,
    } = this.props;

    try {
      if (checkout && method && config) {
        if (checkout && checkout.coupons.length > 0){
          throw new Error('coupon');
        }

        // Merge physical/digital items in cart
        var lineItems = [...checkout.cart.lineItems.physicalItems, ...checkout.cart.lineItems.digitalItems];

        var total = checkout.grandTotal;

        // GBP, AUD, USD indicates currency
        // 0, 1, 2 indicates product type
        //  0 - classic/dynamic
        //  1 - iconic single
        //  2 - iconic dual
        var offerList: { [key: string]: string } = {
          GBP0: "046f59a9-f59c-45f2-9081-266b02a8f920",
          GBP1: "5315c331-474d-40e9-ab65-7ac1627183e3",
          GBP2: "6ec63bb0-a2e5-4980-919e-633fd2f9ea3d",
          AUD0: "046f59a9-f59c-45f2-9081-266b02a8f920",
          AUD1: "5315c331-474d-40e9-ab65-7ac1627183e3",
          AUD2: "6ec63bb0-a2e5-4980-919e-633fd2f9ea3d",
          USD0: "046f59a9-f59c-45f2-9081-266b02a8f920",
          USD1: "5315c331-474d-40e9-ab65-7ac1627183e3",
          USD2: "6ec63bb0-a2e5-4980-919e-633fd2f9ea3d",
        };

        // Filter line items to Iconic count
        let iconicItemsCount = lineItems
          .filter(item => item.name === "Instasmile Iconic").length;

        let key = config.shopperCurrency.code + iconicItemsCount;
        let offer = offerList[key];

        var partiallyUrl = configurePartiallyButton(lineItems, total, method.config.returnUrl, method.config.redirectUrl, offer);
        
        if (typeof partiallyUrl !== undefined &&
          typeof partiallyUrl !== null &&
          typeof partiallyUrl === 'string'){
            window.location.replace(partiallyUrl);
          } else {
            throw new Error();
          }

      } else {
        throw new Error();
      }
    } catch (error) {
      var errorMessage = "Failed to load partial.ly, please try again later.";

      // Replace default error message to coupon error 
      if (error instanceof Error && error.message === 'coupon') {
        errorMessage = "Discount codes cannot be used with Partial.ly";
      }

      onUnhandledError(new Error(errorMessage) as CustomError);
    }
  };

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
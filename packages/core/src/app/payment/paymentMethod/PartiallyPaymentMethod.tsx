import React, { Component, ReactNode } from 'react';
import { configurePartiallyButton, toggleCouponBlock, firePartially } from '../../../../../../scripts/custom/partially.js';
import { CheckoutContextProps } from '@bigcommerce/checkout/payment-integration-api';
import { Checkout, PaymentMethod, CheckoutSelectors, StoreConfig, CustomError } from '@bigcommerce/checkout-sdk';
import { PaymentFormValues } from '@bigcommerce/checkout/payment-integration-api';
import { ConnectFormikProps, connectFormik } from '../../common/form';
import { MapToPropsFactory } from '@bigcommerce/checkout/legacy-hoc';
import { WithLanguageProps, withLanguage } from '@bigcommerce/checkout/locale';
import withPayment, { WithPaymentProps } from '../withPayment';
import { noop } from 'lodash';
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
          method,
          setSubmit,
          checkout,
          removeCoupon
      } = this.props;

      setSubmit(method, this.handleSubmit);

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
          AUD0: "94e14131-d9b5-49e0-a38d-9f8cd5568009",
          AUD1: "94e14131-d9b5-49e0-a38d-9f8cd5568009",
          AUD2: "94e14131-d9b5-49e0-a38d-9f8cd5568009",
          USD0: "3d6ef83b-79e0-46b9-8a62-dfd208a9c00f",
          USD1: "3d6ef83b-79e0-46b9-8a62-dfd208a9c00f",
          USD2: "3d6ef83b-79e0-46b9-8a62-dfd208a9c00f",
        };

        // Filter line items to Iconic count
        let iconicItemsCount = lineItems
          .filter(item => item.name === "Instasmile Iconic").length;

        let key = config.shopperCurrency.code + iconicItemsCount;
        let offer = offerList[key];

        configurePartiallyButton(lineItems, total, method.config.returnUrl, method.config.redirectUrl, offer);

        // Delay the redirect by one second
        // This ensures partially JS can retrieve BC cart data and create the redirect URL
        setTimeout(() => {
          var btn = document.getElementsByClassName('partiallyButton');
          if (btn.length > 0) {
            var partiallyUrl = btn[0].getAttribute('href');
            if (typeof partiallyUrl !== undefined &&
              typeof partiallyUrl !== null &&
              typeof partiallyUrl === 'string') {
              var gaCookie = this.getCookie("_ga");

              if (gaCookie !== "") {
                partiallyUrl += "&_ga=" + gaCookie;
              }

              var utmSource = sessionStorage.getItem("utm_source");
              var utmMedium = sessionStorage.getItem("utm_medium");
              var utmCampaign = sessionStorage.getItem("utm_campaign");
              var gad = sessionStorage.getItem("gad");
              var gclid = sessionStorage.getItem("gclid");

              if (utmSource !== null && utmSource !== ""){
                partiallyUrl += "&utm_source=" + utmSource;
              }

              if (utmMedium !== null && utmMedium !== ""){
                partiallyUrl += "&utm_medium=" + utmMedium;
              }

              if (utmCampaign !== null && utmCampaign !== ""){
                partiallyUrl += "&utm_campaign=" + utmCampaign;
              }

              if (gad !== null && gad !== ""){
                partiallyUrl += "&gad=" + gad;
              }

              if (gclid !== null && gclid !== ""){
                partiallyUrl += "&gclid=" + gclid;
              }

              btn[0].setAttribute('href', partiallyUrl);
              firePartially(btn[0]);
            } else {
              throw new Error();
            }
          } else {
            throw new Error();
          }
        }, 1000);

      } else {
        throw new Error();
      }
    } catch (error) {
      var errorMessage = "Failed to load partial.ly, please try again later.";

      // Replace default error message to coupon error 
      if (error instanceof Error && error.message === 'coupon') {
        if (config?.shopperCurrency.code === 'USD'){
          errorMessage = "Sorry, promo codes cannot be used with Partial.ly";
        } else {
          errorMessage = "Sorry, discount codes cannot be used with Partial.ly";
        }
      }

      onUnhandledError(new Error(errorMessage) as CustomError);
    }
  };

  private getCookie: (cname: string) => string = (cname) => {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }

  private getListText: (currency: string | undefined) => ReactNode = (currency) => {
    if (currency === "GBP") {
      return <>
        <li><div className="circleCheck"></div>No Credit Check | 100% Acceptance</li>
        <li><div className="circleCheck"></div>Spread the cost over 12 months</li>
        <li><div className="circleCheck"></div>From £150 deposit</li>
        <li><div className="circleCheck"></div>£25 Payment Plan Admin Fee (Non Refundable)</li>
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
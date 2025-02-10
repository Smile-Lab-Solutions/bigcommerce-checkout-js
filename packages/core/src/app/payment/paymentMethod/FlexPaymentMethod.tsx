import React, { Component, ReactNode } from 'react';
import { CheckoutContextProps } from '@bigcommerce/checkout/payment-integration-api';
import { Checkout, PaymentMethod, CheckoutSelectors, StoreConfig, CustomError } from '@bigcommerce/checkout-sdk';
import { PaymentFormValues } from '@bigcommerce/checkout/payment-integration-api';
import { ConnectFormikProps, connectFormik } from '../../common/form';
import { MapToPropsFactory } from '@bigcommerce/checkout/legacy-hoc';
import { WithLanguageProps, withLanguage } from '@bigcommerce/checkout/locale';
import withPayment, { WithPaymentProps } from '../withPayment';
import { noop } from 'lodash';
import { LoadingOverlay } from '../../ui/loading';
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
          setSubmit,
          disableSubmit,
      } = this.props;

      disableSubmit(method, false);
      setSubmit(method, this.handleSubmit);
  }

  render(): ReactNode {
    return (
      <LoadingOverlay hideContentWhenLoading isLoading={false}>
        <div className="paymentMethod paymentMethod--hosted">
          <div className="payment-descriptor">
            <ul className="list-element">
              {this.getListText()}
            </ul>
          </div>
        </div>
      </LoadingOverlay>
    );
  }

  private handleSubmit: (values: PaymentFormValues) => void = async () => {
    const {
      method,
      checkout,
      config,
      onUnhandledError = noop,
      disableSubmit
    } = this.props;

    disableSubmit(method, true);

    try {
      if (checkout && method && config && checkout.billingAddress) {

        // ONLY ENTER TOKEN WHEN DEPLOYING
        // DO NOT PUSH TO REPO
        let flexBearerToken = '';

        // Create checkout session data to send to flex API
        let checkoutSessionData: FlexCheckoutSessionRootData = {
          checkout_session: {
            allow_promotion_codes: false,
            cancel_url: "https://instasmile.com",
            capture_method: "automatic",
            client_reference_id: "test",
            defaults: {
              email: "",
              first_name: "",
              last_name: "",
              phone: "07123456789"
            },
            line_items: [
              {
                price_data: {
                  product: "",
                  unit_amount: 1000
                },
                quantity: 1
              }
            ],
            mode: "payment",
            success_url: "https://instasmile.com"
          }
        };

        // Flex checkout session API call
        var checkoutXhr = new XMLHttpRequest();
        checkoutXhr.withCredentials = false;
        checkoutXhr.open("POST", "https://api.withflex.com/v1/checkout/sessions");
        checkoutXhr.setRequestHeader('Authorization', 'Bearer ' + flexBearerToken);
        checkoutXhr.setRequestHeader('Content-Type', 'application/json');
        checkoutXhr.send(JSON.stringify(checkoutSessionData));

        checkoutXhr.onreadystatechange = function () {
          if (checkoutXhr.readyState == 4) {

            // Error during checkout call
            if (checkoutXhr.status !== 200) {
              var errorMessage = "Failed to load Flex, please try again later.";
              onUnhandledError(new Error(errorMessage) as CustomError);
            } else {
              // Parse response
              let checkoutResponse: FlexCheckoutSessionRootDataResponse = JSON.parse(this.responseText);

              // Redirect customer from flex checkout response
              //window.location.replace(checkoutResponse.redirect_url);
              console.log(checkoutResponse);

              console.log(checkout);
            }
          }
        };
      } else {
        throw new Error();
      }
    } catch (error) {
      var errorMessage = "Failed to load Flex, please try again later.";

      disableSubmit(method, false);
      onUnhandledError(new Error(errorMessage) as CustomError);
    }
  };

  private getListText: () => ReactNode = () => {
    return <>
      <li><div className="circleCheck"></div><b>Flex Flex Flex Flex Flex</b></li>
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

export default connectFormik(withLanguage(withPayment(withCheckout(mapFromCheckoutProps)(FlexPaymentMethod))));

// Flex API interfaces

interface FlexCheckoutSessionRootData {
  checkout_session: FlexCheckoutSessionData;
}

interface FlexCheckoutSessionData {
  allow_promotion_codes: boolean;
  cancel_url: string;
  capture_method: string;
  client_reference_id: string;
  defaults: FlexCheckoutSessionCustomerData;
  line_items: FlexCheckoutSessionLineItemData[];
  mode: string;
  success_url: string;
}

interface FlexCheckoutSessionCustomerData {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
}

interface FlexCheckoutSessionLineItemData {
  price_data: FlexCheckoutSessionLineItemPriceData;
  quantity: number;
}

interface FlexCheckoutSessionLineItemPriceData {
  product: string;
  unit_amount: number;
}

// Flex Response interfaces

interface FlexCheckoutSessionRootDataResponse {
  checkout_session: FlexCheckoutSessionDataResponse
}

interface FlexCheckoutSessionDataResponse {
  allow_promotion_codes: boolean
  amount_total: number
  amount_subtotal: number
  cancel_url: string
  captures: any[]
  capture_method: string
  checkout_session_id: string
  client_reference_id: string
  created_at: number
  customer: any
  customer_id: any
  customer_email: any
  defaults: FlexCheckoutSessionCustomerDataResponse
  expires_at: number
  invoice: any
  hsa_fsa_eligible: boolean
  letter_of_medical_necessity_required: boolean
  metadata: any
  mode: string
  payment_intent: any
  payment_intent_id: any
  redirect_url: string
  refunds: any[]
  setup_intent: any
  shipping_options: any
  shipping_address_collection: boolean
  shipping_details: any
  status: string
  success_url: string
  subscription: any
  tax_rate: any
  test_mode: boolean
  total_details: FlexCheckoutSessionTotalDetailsResponse
  visit_type: any
}

interface FlexCheckoutSessionCustomerDataResponse {
  email: string
  first_name: string
  last_name: string
  phone: any
}

interface FlexCheckoutSessionTotalDetailsResponse {
  amount_discount: number
  amount_tax: any
  amount_shipping: number
}

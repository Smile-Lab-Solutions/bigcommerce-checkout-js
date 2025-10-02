import React, { Component, ReactNode } from 'react';
import { CheckoutContextProps } from '@bigcommerce/checkout/payment-integration-api';
import { Checkout, PaymentMethod, CheckoutSelectors, StoreConfig, CustomError, Address } from '@bigcommerce/checkout-sdk';
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

  private handleSubmit: (values: PaymentFormValues) => void = async () => {
    const {
      method,
      checkout,
      config,
      shippingAddress,
      onUnhandledError = noop,
      disableSubmit
    } = this.props;

    disableSubmit(method, true);

    try {
      if (checkout && method && config && checkout.billingAddress && shippingAddress) {

        // ONLY ENTER TOKEN WHEN DEPLOYING
        // DO NOT PUSH TO REPO
        let flexBearerToken = '';

        /////////////////////////
        // SANDBOX PRODUCT IDS //
        /////////////////////////
        // let flexProductIds = {
        //   "ISCLASSICTOP-BL1": "fprod_01jma8095kj7sja08xcvycp243",
        //   "ISCLASSICTOP-A1": "fprod_01jma80w5tzhdzsza201w74fd3",
        //   "ISCLASSICTOP-A2": "fprod_01jma8157jac8vyyv74mvnvd2c",
        //   "ISCLASSICTOP-A3": "fprod_01jma81e5hvtxqwsawkmc7zk2p",
        //   "ISCLASSICBOT-BL1": "fprod_01jma81z974c7dcw9zbyhde1mc",
        //   "ISCLASSICBOT-A1": "fprod_01jma829askzbdtd5qtbvxjz18",
        //   "ISCLASSICBOT-A2": "fprod_01jma82jpmmcf2fe9qhk5shbcp",
        //   "ISCLASSICBOT-A3": "fprod_01jma82v3hjgt665j3mwcapcvw",
        //   "ISDYNAMICTOP-BL1": "fprod_01jma84c0nqf4yfp63hvrt47sy",
        //   "ISDYNAMICTOP-A1": "fprod_01jma84m1zyvc7x38aagk7a7m5",
        //   "ISDYNAMICTOP-A2": "fprod_01jma84t9hhbjwegjyqek1s2tc",
        //   "ISDYNAMICTOP-A3": "fprod_01jma8518aj3npscxenea87fjz",
        //   "ISDYNAMICBOT-BL1": "fprod_01jma858e5pbwxssasv6wf405t",
        //   "ISDYNAMICBOT-A1": "fprod_01jma85fb5pmsp1b1drny1pp4j",
        //   "ISDYNAMICBOT-A2": "fprod_01jma85nw8qf9vhsqszt4fpae0",
        //   "ISDYNAMICBOT-A3": "fprod_01jma85wfq9emw6fys8nt7gj58",
        //   "IMPKIT-SINGLE": "fprod_01jma8fwxbxafpnaqy26ej7f4y",
        //   "IMPKIT-DUAL": "fprod_01jma8g7ke7avxhb4jwtvbrt8g",
        //   "EXPPROD": "fprod_01jma86arbxrs3th5s79cyzg8f",
        //   "ISBF3YRWNTY": "fprod_01jma86ncmktwa5jgcazb4s060",
        //   "SPAREINSTATOP-BL1": "fprod_01jnr5rdfafw0fczx0qrsyjvhm",
        //   "SPAREINSTATOP-A1": "fprod_01jnr5rng0pwkg2nm4s7q311v1",
        //   "SPAREINSTATOP-A2": "fprod_01jnr5rzshm8he0ya58dyczng3",
        //   "SPAREINSTATOP-A3": "fprod_01jnr5s7v0kz89d3qbfp5kqx7b",
        //   "SPAREINSTABOT-BL1": "fprod_01jnr5sg16nbtgv1gtp6gxk9xe",
        //   "SPAREINSTABOT-A1": "fprod_01jnr5st9zb9msxjk9cm98e35p",
        //   "SPAREINSTABOT-A2": "fprod_01jnr5t36jtrfz8834grmq6apf",
        //   "SPAREINSTABOT-A3": "fprod_01jnr5tbh78s7mx96h66z1tn4r"
        // };

        //////////////////////
        // LIVE PRODUCT IDS //
        //////////////////////
        let flexProductIds = {
          "ISCLASSICTOP-BL1": "fprod_01jn1gmnxrv7pr360jxtjdqnfv",
          "ISCLASSICTOP-A1": "fprod_01jn1gk77pea6w3vfa71d52kv8",
          "ISCLASSICTOP-A2": "fprod_01jn1gjwzyse0r2m9b7egb7pqw",
          "ISCLASSICTOP-A3": "fprod_01jn1gjjb9vy4536dm7pyg8c1g",
          "ISCLASSICBOT-BL1": "fprod_01jn1gjat51rz6canq3twae2k5",
          "ISCLASSICBOT-A1": "fprod_01jn1gj32xza8ppw9zccrwd35g",
          "ISCLASSICBOT-A2": "fprod_01jn1ghv3sc0b68cj51z215v1z",
          "ISCLASSICBOT-A3": "fprod_01jn1ghfhjsd340bge5afj160p",
          "ISDYNAMICTOP-BL1": "fprod_01jn1gh6xk8rggyhpmwbxj2wda",
          "ISDYNAMICTOP-A1": "fprod_01jn1ggzbgcjkp921g9pghw3a6",
          "ISDYNAMICTOP-A2": "fprod_01jn1ggr2njm1k313rfe85zjvs",
          "ISDYNAMICTOP-A3": "fprod_01jn1ggez8y2dh1v815ha7y4yf",
          "ISDYNAMICBOT-BL1": "fprod_01jn1gg6yhvyxxzmssptfe19an",
          "ISDYNAMICBOT-A1": "fprod_01jn1gfygestz92fs9xhpkrj53",
          "ISDYNAMICBOT-A2": "fprod_01jn1gfq6sbvw9w6mtzw95nry2",
          "ISDYNAMICBOT-A3": "fprod_01jn1gfh4kxwcqb47gr3vbxvzc",
          "IMPKIT-SINGLE": "fprod_01jn1get94mdvx27jp98983z7e",
          "IMPKIT-DUAL": "fprod_01jn1gefaafk15canb0rqs889r",
          "EXPPROD": "fprod_01jn1gf9pknjwvgcxbrkjcwgaq",
          "ISBF3YRWNTY": "fprod_01jn1gf2qcbx19008tca2f9bbd",
          "SPAREINSTATOP-BL1": "fprod_01jnrhz3a8cvpqf26sxrkferse",
          "SPAREINSTATOP-A1": "fprod_01jnrhzbf0rmz6tbp7rm3g1rrq",
          "SPAREINSTATOP-A2": "fprod_01jnrhzm9fn80ca1pbeyzmw2v1",
          "SPAREINSTATOP-A3": "fprod_01jnrhzwpn1m8ky007am6hpbt0",
          "SPAREINSTABOT-BL1": "fprod_01jnrj0752fctz8k2z06nfapw5",
          "SPAREINSTABOT-A1": "fprod_01jnrj0gvkhv9175xa5v10dbx6",
          "SPAREINSTABOT-A2": "fprod_01jnrj0tc7tgr57t1bp24db5w2",
          "SPAREINSTABOT-A3": "fprod_01jnrj13861ape8w5wcej92va0"
        };

        // Merge physical/digital items in cart
        var lineItems = [...checkout.cart.lineItems.physicalItems, ...checkout.cart.lineItems.digitalItems];

        // Stores all line items
        let flexCheckoutSessionLineItems: FlexCheckoutSessionLineItemData[] = [];

        // Stores all discounts for discounted line items
        let flexCheckoutSessionDiscountRootData: FlexCheckoutSessionDiscountRootData[] = [];

        // Filters all line items to only store locally items that are mapped in flex portal
        lineItems.forEach(x => {
          const flexProductId = Object.entries(flexProductIds).find(([key]) => key === x.sku);
          if (flexProductId) {
            // Push to local flex line item array
            flexCheckoutSessionLineItems.push(
              {
                price_data: {
                  product: flexProductId[1],
                  unit_amount: x.listPrice * 100
                },
                quantity: x.quantity
              }
            );

            // Check if item has discount and push to flex discount array
            x.discounts.forEach(d => {
              if (d.discountedAmount > 0) {
                flexCheckoutSessionDiscountRootData.push(
                  {
                    coupon_data: {
                      amount_off: d.discountedAmount * 100,
                      name: "Discount",
                      applies_to: {
                        products: [flexProductId[1]]
                      }
                    }
                  }
                )
              }
            });
          }
        });

        // Create customer session data to send to flex API
        let customerData: FlexCustomerRootData = {
          customer: {
            first_name: checkout.billingAddress?.firstName ?? "",
            last_name: checkout.billingAddress?.lastName ?? "",
            email: checkout.billingAddress?.email ?? "",
            phone: checkout.billingAddress?.phone != null ? "+1" + checkout.billingAddress?.phone : "",
            shipping: {
              line1: shippingAddress.address1,
              line2: shippingAddress.address2,
              city: shippingAddress.city,
              state: shippingAddress.stateOrProvince,
              postal_code: shippingAddress.postalCode,
              country: shippingAddress.country
            }
          }
        }

        // Flex create customer API call
        var customerXhr = new XMLHttpRequest();
        customerXhr.withCredentials = false;
        customerXhr.open("POST", "https://api.withflex.com/v1/customers");
        customerXhr.setRequestHeader('Authorization', 'Bearer ' + flexBearerToken);
        customerXhr.setRequestHeader('Content-Type', 'application/json');
        customerXhr.send(JSON.stringify(customerData));

        customerXhr.onreadystatechange = function () {
          if (customerXhr.readyState == 4) {
            // Error during customer call
            if (customerXhr.status !== 200) {
              var errorMessage = "Failed to load Flex, please try again later.";
              onUnhandledError(new Error(errorMessage) as CustomError);
            } else { 
              // Parse response
              let customerResponse: FlexCustomerRootDataResponse = JSON.parse(customerXhr.responseText);

              if (!customerResponse.customer.customer_id){
                var errorMessage = "Failed to load Flex, please try again later.";
                onUnhandledError(new Error(errorMessage) as CustomError);
              }

              // Continue with checkout
              // Create checkout session data to send to flex API
              let checkoutSessionData: FlexCheckoutSessionRootData = {
                checkout_session: {
                  allow_promotion_codes: false,
                  cancel_url: "https://us.instasmile.com/checkout",
                  capture_method: "automatic",
                  client_reference_id: checkout.id,
                  defaults: {
                    customer_id: customerResponse.customer.customer_id,
                    email: checkout.billingAddress?.email ?? "",
                    first_name: checkout.billingAddress?.firstName ?? "",
                    last_name: checkout.billingAddress?.lastName ?? "",
                    phone: checkout.billingAddress?.phone ?? ""
                  },
                  discounts: flexCheckoutSessionDiscountRootData,
                  line_items: flexCheckoutSessionLineItems,
                  mode: "payment",
                  success_url: "https://us.instasmile.com/pages/complete/"
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
                    window.location.replace(checkoutResponse.checkout_session.redirect_url);
                  }
                }
              };
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
  discounts: FlexCheckoutSessionDiscountRootData[];
  line_items: FlexCheckoutSessionLineItemData[];
  mode: string;
  success_url: string;
}

interface FlexCheckoutSessionCustomerData {
  customer_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
}

interface FlexCheckoutSessionDiscountRootData {
  coupon_data: FlexCheckoutSessionDiscountData
}

interface FlexCheckoutSessionDiscountData {
  amount_off: number;
  name: string;
  applies_to: FlexCheckoutSessionDiscountAppliesToData;
}

interface FlexCheckoutSessionDiscountAppliesToData {
  products: string[];
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

// Flex Customer API Interfaces

interface FlexCustomerRootData {
  customer: FlexCustomerData;
}

interface FlexCustomerData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  shipping: FlexCustomerShippingData;
}

interface FlexCustomerShippingData {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

// Flex Customer Responses Interfaces

interface FlexCustomerRootDataResponse {
  customer: FlexCustomerDataResponse
}

interface FlexCustomerDataResponse {
  customer_id: string
}
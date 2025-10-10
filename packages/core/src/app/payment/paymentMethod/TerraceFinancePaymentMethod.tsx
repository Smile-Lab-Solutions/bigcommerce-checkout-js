import React, { Component, ReactNode } from 'react';
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
          setSubmit,
          disableSubmit,
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

        if (checkout && checkout.coupons.length > 0){
          throw new Error('coupon');
        }

        // ONLY ENTER PASSWORD WHEN DEPLOYING
        // DO NOT PUSH TO REPO
        let terraceAPIBaseUrl = 'https://mlp-uat-merchant-api.azurewebsites.net';
        let terraceUsername = 'apiinstasmile@instasmile.com';
        let terracePwd = '';
        
        // Terrace Finance Token API call
        var authData = new FormData();
        authData.append("UserName", terraceUsername);
        authData.append("Password", terracePwd);
        var authXhr = new XMLHttpRequest();
        authXhr.withCredentials = false;
        authXhr.open("POST", terraceAPIBaseUrl + "/api/v1.0/Authenticate");
        authXhr.send(authData);

        authXhr.onreadystatechange = function () {
          if (authXhr.readyState == 4) {

            // Error during auth call
            if (authXhr.status !== 200){
              var errorMessage = "Failed to load Terrace Finance, please try again later.";
              onUnhandledError(new Error(errorMessage) as CustomError);
            } else {
              // Parse response
              let tokenResponse: TerraceFinanceTokenResponse = JSON.parse(authXhr.responseText);
  
              // Terrace Finance Lead API call
              var leadData = new FormData();
              leadData.append("FirstName", checkout.billingAddress?.firstName ?? "");
              leadData.append("LastName", checkout.billingAddress?.lastName ?? "");
              leadData.append("PhoneNumber", checkout.billingAddress?.phone ?? "");
              leadData.append("Address", checkout.billingAddress?.address1 ?? "");
              leadData.append("City", checkout.billingAddress?.city ?? "");
              leadData.append("State", checkout.billingAddress?.stateOrProvinceCode ?? "");
              leadData.append("Zip", checkout.billingAddress?.postalCode ?? "");
              leadData.append("Email", checkout.billingAddress?.email ?? "");
              leadData.append("ProductInformation", "Medical Equipment");
              var leadXhr = new XMLHttpRequest();
              leadXhr.withCredentials = false;
              leadXhr.open("POST", terraceAPIBaseUrl + "/api/v1.0/Lead");
              leadXhr.setRequestHeader('Authorization', 'Bearer ' + tokenResponse.Token);
              leadXhr.setRequestHeader("name", terraceUsername);
              leadXhr.send(leadData);
  
              leadXhr.onreadystatechange = function () {
                if (leadXhr.readyState == 4) {
  
                  // Error during lead call
                  if (leadXhr.status !== 200){
                    var errorMessage = JSON.parse(this.responseText).Errors;
                    onUnhandledError(new Error(errorMessage) as CustomError);
                  } else {
                    // Parse response
                    let leadResponse: TerraceFinanceLeadResponse = JSON.parse(leadXhr.responseText);
    
                    // Merge physical/digital items in cart
                    var lineItems = [...checkout.cart.lineItems.physicalItems, ...checkout.cart.lineItems.digitalItems];
                    let invoiceItems: TerraceFinanceInvoiceDataItems[] = 
                      lineItems.map(x =>
                      (
                        {
                          ItemDescription: x.name,
                          Brand: x.brand,
                          SKU: x.sku,
                          Condition: "New",
                          Price: x.listPrice,
                          Quantity: x.quantity,
                          Discount: x.sku.startsWith('IMPKIT-') ? x.listPrice : x.discountAmount,
                          Total: x.sku.startsWith('IMPKIT-') ? 0 : x.salePrice
                        }
                      ));
    
                    // Terrace Finance Invoice data
                    let invoiceData: TerraceFinanceInvoiceData = {
                      InvoiceNumber: checkout.id,
                      InvoiceDate: checkout.createdTime,
                      LeadID: leadResponse.Result,
                      DeliveryDate: checkout.createdTime,
                      Discount: lineItems.reduce((acc, lineItem) => acc + lineItem.couponAmount, 0),
                      DownPayment: 0,
                      Shipping: checkout.shippingCostTotal,
                      Tax: 0,
                      NetTotal: checkout.grandTotal,
                      GrossTotal: checkout.grandTotal,
                      Items: invoiceItems
                    };
    
                    // Terrace Finance Invoice API call
                    var invXhr = new XMLHttpRequest();
                    invXhr.withCredentials = false;
                    invXhr.open("POST", terraceAPIBaseUrl + "/api/v1.0/Invoice/AddInvoice");
                    invXhr.setRequestHeader('Authorization', 'Bearer ' + tokenResponse.Token);
                    invXhr.setRequestHeader('Content-Type', 'application/json');
                    invXhr.setRequestHeader("name", terraceUsername);
                    invXhr.send(JSON.stringify(invoiceData));
    
                    invXhr.onreadystatechange = function () {
                      if (invXhr.readyState == 4) {

                        // Error during invoice call
                        if (invXhr.status !== 200) {
                          var errorMessage = "Failed to load Terrace Finance, please try again later.";
                          onUnhandledError(new Error(errorMessage) as CustomError);
                        } else {
                          // Parse response - Commented as not needed at the moment
                          //let invoiceResponse: TerraceFinanceInvoiceResponse = JSON.parse(this.responseText);
      
                          // Redirect customer from lead response
                          window.location.replace(leadResponse.Url);
                        }
                      }
                    };
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
      var errorMessage = "Failed to load Terrace Finance, please try again later.";

      // Replace default error message to coupon error 
      if (error instanceof Error && error.message === 'coupon') {
        errorMessage = "Sorry, promo codes cannot be used with Terrace Finance";
      }

      disableSubmit(method, false);
      onUnhandledError(new Error(errorMessage) as CustomError);
    }
  };

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

interface TerraceFinanceTokenResponse {
  Result: number;
  IsSuccess: boolean;
  Message: string;
  Error: string;
  Token: string;
  UserName: string;
  Authenticate: boolean;
  RequestId: number;
}

interface TerraceFinanceLeadResponse {
  Result: number;
  IsSuccess: boolean;
  Message: string;
  Error: string;
  Token: string;
  UserName: string;
  Authenticate: boolean;
  RequestId: number;
  Url: string;
}

interface TerraceFinanceInvoiceData {
  InvoiceNumber: string;
  InvoiceDate: string;
  LeadID: number;
  DeliveryDate: string;
  Discount: number;
  DownPayment: number;
  Shipping: number;
  Tax: number;
  NetTotal: number;
  GrossTotal: number;
  Items: TerraceFinanceInvoiceDataItems[];
}

interface TerraceFinanceInvoiceDataItems {
  ItemDescription: string;
  Brand: string;
  SKU: string;
  Condition: string;
  Price: number;
  Quantity: number;
  Discount: number;
  Total: number;
}

// interface TerraceFinanceInvoiceResponse {
//   Result: number;
//   IsSuccess: boolean;
//   Message: string;
//   Error: string;
//   Token: string;
//   UserName: string;
//   Authenticate: boolean;
//   RequestId: number;
//   Url: string;
// }
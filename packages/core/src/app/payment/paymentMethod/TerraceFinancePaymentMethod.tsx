import React, { Component, ReactNode } from 'react';
import { CheckoutContextProps } from '@bigcommerce/checkout/payment-integration-api';
import { Checkout, PaymentMethod, CheckoutSelectors, StoreConfig, CustomError } from '@bigcommerce/checkout-sdk';
import { PaymentFormValues } from '@bigcommerce/checkout/payment-integration-api';
import { ConnectFormikProps, connectFormik } from '../../common/form';
import { MapToPropsFactory } from '../../common/hoc';
import { WithLanguageProps, withLanguage } from '@bigcommerce/checkout/locale';
import withPayment, { WithPaymentProps } from '../withPayment';
import { noop } from 'lodash';
import { LoadingOverlay } from '../../ui/loading';
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
          setSubmit,
          disableSubmit
      } = this.props;

      disableSubmit(method, false);
      setSubmit(method, this.handleSubmit);
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

        // ONLY ENTER PASSWORD WHEN DEPLOYING
        // DO NOT PUSH TO REPO
        let terraceUsername = 'hamzah@seblgroup.com';
        let terracePwd = '';
        
        // Terrace Finance Token API call
        var authData = new FormData();
        authData.append("UserName", terraceUsername);
        authData.append("Password", terracePwd);
        var authXhr = new XMLHttpRequest();
        authXhr.withCredentials = false;
        authXhr.open("POST", "https://tfc-qa-merchant-api.azurewebsites.net/api/v1.0/Authenticate");

        console.log("auth fire");
        authXhr.send(authData);

        authXhr.onreadystatechange = function () {
          if (authXhr.readyState == 4) {

            // Error during auth call
            if (authXhr.status !== 200){
              var errorMessage = "Failed to load Terrace Finance, please try again later. (auth)";
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
              leadXhr.open("POST", "https://tfc-qa-merchant-api.azurewebsites.net/api/v1.0/Lead");
              leadXhr.setRequestHeader('Authorization', 'Bearer ' + tokenResponse.Token);
              leadXhr.setRequestHeader("name", terraceUsername);

              console.log("lead fire");
              leadXhr.send(leadData);
  
              leadXhr.onreadystatechange = function () {
                if (leadXhr.readyState == 4) {
  
                  // Error during lead call
                  if (leadXhr.status !== 200){
                    var errorMessage = "Failed to load Terrace Finance, please try again later. (Lead)";
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
                          Price: x.listPrice,
                          Quantity: x.quantity,
                          Discount: x.discountAmount,
                          Total: x.salePrice
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
                    invXhr.open("POST", "https://tfc-qa-merchant-api.azurewebsites.net/api/v1.0/Invoice/AddInvoice");
                    invXhr.setRequestHeader('Authorization', 'Bearer ' + tokenResponse.Token);
                    invXhr.setRequestHeader('Content-Type', 'application/json');
                    invXhr.setRequestHeader("name", terraceUsername);

                    console.log("inv fire");
                    invXhr.send(JSON.stringify(invoiceData));
    
                    invXhr.onreadystatechange = function () {
                      if (invXhr.readyState == 4) {

                        // Error during invoice call
                        if (invXhr.status !== 200) {
                          var errorMessage = "Failed to load Terrace Finance, please try again later. (Inv)";
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
      disableSubmit(method, false);
      var errorMessage = "Failed to load Terrace Finance, please try again later. (catch)";
      onUnhandledError(new Error(errorMessage) as CustomError);
    }
  };

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
        <p>Terrace Finance is not a lender. We route your application through our network of lenders/lessors. Approval and approval amount are subject to credit eligibility and not guaranteed. Must be 18 or older to apply.</p>
      </>
    } else if (currency === "AUD") {
      return <>
        <li>aud</li>
      </>
    }

    return <></>;
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
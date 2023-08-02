import React, { Component, ReactNode } from 'react';
import { CheckoutContextProps } from '@bigcommerce/checkout/payment-integration-api';
import { Checkout, PaymentMethod, CheckoutSelectors, StoreConfig, CustomError } from '@bigcommerce/checkout-sdk';
import { PaymentFormValues } from '@bigcommerce/checkout/payment-integration-api';
import { ConnectFormikProps, connectFormik } from '../../common/form';
import { MapToPropsFactory } from '../../common/hoc';
import { WithLanguageProps, withLanguage } from '@bigcommerce/checkout/locale';
import withPayment, { WithPaymentProps } from '../withPayment';
import { noop, sum } from 'lodash';
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
      } = this.props;

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
    } = this.props;

    try {
      if (checkout && method && config && checkout.billingAddress) {

        let terraceUsername = 'hamzah@seblgroup.com';
        let terracePwd = '';
        
        // Terrace Finance Token API call
        var data = new FormData();
        data.append("UserName", terraceUsername);
        data.append("Password", terracePwd);
        var xhr = new XMLHttpRequest();
        xhr.withCredentials = false;
        xhr.open("POST", "https://tfc-qa-merchant-api.azurewebsites.net/api/v1.0/Authenticate");
        xhr.send(data);

        xhr.onreadystatechange = function () {
          if (this.readyState == 4) {

            // Error during auth call
            if (this.status !== 200){
              var errorMessage = "Failed to load Terrace Finance, please try again later.";
              onUnhandledError(new Error(errorMessage) as CustomError);
            } else {
              // Parse response
              let tokenResponse: TerraceFinanceTokenResponse = JSON.parse(this.responseText);
  
              // Terrace Finance Lead API call
              var data = new FormData();
              data.append("FirstName", checkout.billingAddress?.firstName ?? "");
              data.append("LastName", checkout.billingAddress?.lastName ?? "");
              data.append("PhoneNumber", checkout.billingAddress?.phone ?? "");
              data.append("Address", checkout.billingAddress?.address1 ?? "");
              data.append("City", checkout.billingAddress?.city ?? "");
              data.append("State", checkout.billingAddress?.stateOrProvinceCode ?? "");
              data.append("Zip", checkout.billingAddress?.postalCode ?? "");
              data.append("Email", checkout.billingAddress?.email ?? "");
              data.append("ProductInformation", "Medical Equipment");
              var xhr = new XMLHttpRequest();
              xhr.withCredentials = false;
              xhr.open("POST", "https://tfc-qa-merchant-api.azurewebsites.net/api/v1.0/Lead");
              xhr.setRequestHeader('Authorization', 'Bearer ' + tokenResponse.Token);
              xhr.setRequestHeader("name", terraceUsername);
              xhr.send(data);
  
              xhr.onreadystatechange = function () {
                if (this.readyState == 4) {
  
                  // Error during lead call
                  if (this.status !== 200){
                    var errorMessage = "Failed to load Terrace Finance, please try again later.";
                    onUnhandledError(new Error(errorMessage) as CustomError);
                  } else {
                    // Parse response
                    let leadResponse: TerraceFinanceLeadResponse = JSON.parse(this.responseText);
    
                    // Merge physical/digital items in cart
                    var lineItems = [...checkout.cart.lineItems.physicalItems, ...checkout.cart.lineItems.digitalItems];
                    let invoiceItems: TerraceFinanceInvoiceDataItems[] = 
                      lineItems.map(x =>
                      (
                        {
                          ItemDescription: x.name,
                          Brand: x.brand,
                          SKU: x.sku,
                          Price: x.salePrice, // change to prediscount value
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
                      Discount: invoiceItems.reduce((acc, lineItem) => acc + lineItem.Discount, 0),
                      DownPayment: 0,
                      Shipping: checkout.shippingCostTotal,
                      Tax: 0,
                      NetTotal: checkout.grandTotal,
                      GrossTotal: checkout.grandTotal,
                      Items: invoiceItems
                    };
    
                    // Terrace Finance Invoice API call
                    var xhr = new XMLHttpRequest();
                    xhr.withCredentials = false;
                    xhr.open("POST", "https://tfc-qa-merchant-api.azurewebsites.net/api/v1.0/Invoice/AddInvoice");
                    xhr.setRequestHeader('Authorization', 'Bearer ' + tokenResponse.Token);
                    xhr.setRequestHeader('Content-Type', 'application/json');
                    xhr.setRequestHeader("name", terraceUsername);
                    xhr.send(JSON.stringify(invoiceData));
    
                    xhr.onreadystatechange = function () {
                      if (this.readyState == 4) {

                        // Error during invoice call
                        if (this.status !== 200) {
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
        <li><div className="circleCheck"></div>Just <b>$149</b> down today!</li>
        <li><div className="circleCheck"></div>Weekly payment as low as <b>$22</b></li>
        <li><div className="circleCheck"></div>Spread the cost over <b>16 weeks</b></li>
        <li><div className="circleCheck"></div>No Credit Check</li>
        <li><div className="circleCheck"></div><b>$25</b> Payment Plan Admin Fee (Non Refundable)</li>
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
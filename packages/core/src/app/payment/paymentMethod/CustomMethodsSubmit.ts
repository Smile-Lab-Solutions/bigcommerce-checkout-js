import { CheckoutSelectors } from "@bigcommerce/checkout-sdk";
import { configurePartiallyButton, firePartially } from '../../../../../../scripts/custom/partially.js';

// ----------- START TERRACE FINANCE VARIABLES -----------

// ONLY ENTER PASSWORD WHEN DEPLOYING
// DO NOT PUSH TO REPO
let terraceAPIBaseUrl = 'https://tfc-qa-merchant-api.azurewebsites.net';
let terraceUsername = 'hamzah@seblgroup.com';
let terracePwd = '';

let terraceAPIAuthUrl = "/api/v1.0/Authenticate";
let terraceAPILeadUrl = "/api/v1.0/Lead";
let terraceAPIInvoiceUrl = "/api/v1.0/Invoice/AddInvoice"

let terraceCouponError = "Sorry, promo codes cannot be used with Terrace Finance";
let terraceGenericError = "Failed to load Terrace Finance, please try again later."

// ----------- END TERRACE FINANCE VARIABLES -----------

// ----------- START FLEX VARIABLES -----------

// ONLY ENTER TOKEN WHEN DEPLOYING
// DO NOT PUSH TO REPO
let flexAPIBaseUrl = 'https://api.withflex.com';
let flexBearerToken = '';

/////////////////////////
// SANDBOX PRODUCT IDS //
/////////////////////////
let flexProductIds = {
    "ISCLASSICTOP-BL1": "fprod_01jma8095kj7sja08xcvycp243",
    "ISCLASSICTOP-A1": "fprod_01jma80w5tzhdzsza201w74fd3",
    "ISCLASSICTOP-A2": "fprod_01jma8157jac8vyyv74mvnvd2c",
    "ISCLASSICTOP-A3": "fprod_01jma81e5hvtxqwsawkmc7zk2p",
    "ISCLASSICBOT-BL1": "fprod_01jma81z974c7dcw9zbyhde1mc",
    "ISCLASSICBOT-A1": "fprod_01jma829askzbdtd5qtbvxjz18",
    "ISCLASSICBOT-A2": "fprod_01jma82jpmmcf2fe9qhk5shbcp",
    "ISCLASSICBOT-A3": "fprod_01jma82v3hjgt665j3mwcapcvw",
    "ISDYNAMICTOP-BL1": "fprod_01jma84c0nqf4yfp63hvrt47sy",
    "ISDYNAMICTOP-A1": "fprod_01jma84m1zyvc7x38aagk7a7m5",
    "ISDYNAMICTOP-A2": "fprod_01jma84t9hhbjwegjyqek1s2tc",
    "ISDYNAMICTOP-A3": "fprod_01jma8518aj3npscxenea87fjz",
    "ISDYNAMICBOT-BL1": "fprod_01jma858e5pbwxssasv6wf405t",
    "ISDYNAMICBOT-A1": "fprod_01jma85fb5pmsp1b1drny1pp4j",
    "ISDYNAMICBOT-A2": "fprod_01jma85nw8qf9vhsqszt4fpae0",
    "ISDYNAMICBOT-A3": "fprod_01jma85wfq9emw6fys8nt7gj58",
    "IMPKIT-SINGLE": "fprod_01jma8fwxbxafpnaqy26ej7f4y",
    "IMPKIT-DUAL": "fprod_01jma8g7ke7avxhb4jwtvbrt8g",
    "EXPPROD": "fprod_01jma86arbxrs3th5s79cyzg8f",
    "ISBF3YRWNTY": "fprod_01jma86ncmktwa5jgcazb4s060",
    "SPAREINSTATOP-BL1": "fprod_01jnr5rdfafw0fczx0qrsyjvhm",
    "SPAREINSTATOP-A1": "fprod_01jnr5rng0pwkg2nm4s7q311v1",
    "SPAREINSTATOP-A2": "fprod_01jnr5rzshm8he0ya58dyczng3",
    "SPAREINSTATOP-A3": "fprod_01jnr5s7v0kz89d3qbfp5kqx7b",
    "SPAREINSTABOT-BL1": "fprod_01jnr5sg16nbtgv1gtp6gxk9xe",
    "SPAREINSTABOT-A1": "fprod_01jnr5st9zb9msxjk9cm98e35p",
    "SPAREINSTABOT-A2": "fprod_01jnr5t36jtrfz8834grmq6apf",
    "SPAREINSTABOT-A3": "fprod_01jnr5tbh78s7mx96h66z1tn4r"
};

//////////////////////
// LIVE PRODUCT IDS //
//////////////////////
// let flexProductIds = {
//   "ISCLASSICTOP-BL1": "fprod_01jn1gmnxrv7pr360jxtjdqnfv",
//   "ISCLASSICTOP-A1": "fprod_01jn1gk77pea6w3vfa71d52kv8",
//   "ISCLASSICTOP-A2": "fprod_01jn1gjwzyse0r2m9b7egb7pqw",
//   "ISCLASSICTOP-A3": "fprod_01jn1gjjb9vy4536dm7pyg8c1g",
//   "ISCLASSICBOT-BL1": "fprod_01jn1gjat51rz6canq3twae2k5",
//   "ISCLASSICBOT-A1": "fprod_01jn1gj32xza8ppw9zccrwd35g",
//   "ISCLASSICBOT-A2": "fprod_01jn1ghv3sc0b68cj51z215v1z",
//   "ISCLASSICBOT-A3": "fprod_01jn1ghfhjsd340bge5afj160p",
//   "ISDYNAMICTOP-BL1": "fprod_01jn1gh6xk8rggyhpmwbxj2wda",
//   "ISDYNAMICTOP-A1": "fprod_01jn1ggzbgcjkp921g9pghw3a6",
//   "ISDYNAMICTOP-A2": "fprod_01jn1ggr2njm1k313rfe85zjvs",
//   "ISDYNAMICTOP-A3": "fprod_01jn1ggez8y2dh1v815ha7y4yf",
//   "ISDYNAMICBOT-BL1": "fprod_01jn1gg6yhvyxxzmssptfe19an",
//   "ISDYNAMICBOT-A1": "fprod_01jn1gfygestz92fs9xhpkrj53",
//   "ISDYNAMICBOT-A2": "fprod_01jn1gfq6sbvw9w6mtzw95nry2",
//   "ISDYNAMICBOT-A3": "fprod_01jn1gfh4kxwcqb47gr3vbxvzc",
//   "IMPKIT-SINGLE": "fprod_01jn1get94mdvx27jp98983z7e",
//   "IMPKIT-DUAL": "fprod_01jn1gefaafk15canb0rqs889r",
//   "EXPPROD": "fprod_01jn1gf9pknjwvgcxbrkjcwgaq",
//   "ISBF3YRWNTY": "fprod_01jn1gf2qcbx19008tca2f9bbd",
//   "SPAREINSTATOP-BL1": "fprod_01jnrhz3a8cvpqf26sxrkferse",
//   "SPAREINSTATOP-A1": "fprod_01jnrhzbf0rmz6tbp7rm3g1rrq",
//   "SPAREINSTATOP-A2": "fprod_01jnrhzm9fn80ca1pbeyzmw2v1",
//   "SPAREINSTATOP-A3": "fprod_01jnrhzwpn1m8ky007am6hpbt0",
//   "SPAREINSTABOT-BL1": "fprod_01jnrj0752fctz8k2z06nfapw5",
//   "SPAREINSTABOT-A1": "fprod_01jnrj0gvkhv9175xa5v10dbx6",
//   "SPAREINSTABOT-A2": "fprod_01jnrj0tc7tgr57t1bp24db5w2",
//   "SPAREINSTABOT-A3": "fprod_01jnrj13861ape8w5wcej92va0"
// };

let flexAPICustomersUrl = "/v1/customers";
let flexAPICheckoutUrl = "/v1/checkout/sessions";

let flexCancelUrl = window.location.origin + "/checkout";
let flexSuccessUrl = window.location.origin + "/pages/complete/";

let flexGenericError = "Failed to load Flex, please try again later.";

// ----------- END FLEX VARIABLES -----------

// ----------- START PARTIALLY VARIABLES -----------

// GBP, AUD, USD indicates currency
// 0, 1, 2 indicates product type
//  0 - classic/dynamic
//  1 - iconic single
//  2 - iconic dual
var partiallyOfferList: { [key: string]: string } = {
    GBP0: "e316f8d1-8e46-41bc-b1ff-9f8f5f787efb",
    GBP1: "e316f8d1-8e46-41bc-b1ff-9f8f5f787efb",
    GBP2: "e316f8d1-8e46-41bc-b1ff-9f8f5f787efb",
    AUD0: "94e14131-d9b5-49e0-a38d-9f8cd5568009",
    AUD1: "94e14131-d9b5-49e0-a38d-9f8cd5568009",
    AUD2: "94e14131-d9b5-49e0-a38d-9f8cd5568009",
    USD0: "3d6ef83b-79e0-46b9-8a62-dfd208a9c00f",
    USD1: "3d6ef83b-79e0-46b9-8a62-dfd208a9c00f",
    USD2: "3d6ef83b-79e0-46b9-8a62-dfd208a9c00f",
};

let partiallyCancelUrl = window.location.origin + "/checkout";
let partiallySuccessUrl = window.location.origin + "/pages/complete/";

let partiallyGenericError = "Failed to load partial.ly, please try again later.";
let partiallyCouponError = "Sorry, discount codes cannot be used with Partial.ly";
let partiallyUSDCouponError = "Sorry, promo codes cannot be used with Partial.ly";

// ----------- END PARTIALLY VARIABLES -----------

export function terraceFinanceSubmit(
    checkoutState: CheckoutSelectors,
    handleError: (error: Error) => void
): void {
    const {
        data: { getCheckout, getConfig }
    } = checkoutState;

    const checkout = getCheckout();
    const config = getConfig();

    try {
        if (checkout && config && checkout.billingAddress) {

            if (checkout && checkout.coupons.length > 0) {
                handleError(new Error(terraceCouponError));
            }

            // Terrace Finance Token API call
            var authData = new FormData();
            authData.append("UserName", terraceUsername);
            authData.append("Password", terracePwd);
            var authXhr = new XMLHttpRequest();
            authXhr.withCredentials = false;
            authXhr.open("POST", terraceAPIBaseUrl + terraceAPIAuthUrl);
            authXhr.send(authData);

            authXhr.onreadystatechange = function () {
                if (authXhr.readyState == 4) {

                    // Error during auth call
                    if (authXhr.status !== 200) {
                        handleError(new Error(terraceGenericError));
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
                        leadXhr.open("POST", terraceAPIBaseUrl + terraceAPILeadUrl);
                        leadXhr.setRequestHeader('Authorization', 'Bearer ' + tokenResponse.Token);
                        leadXhr.setRequestHeader("name", terraceUsername);
                        leadXhr.send(leadData);

                        leadXhr.onreadystatechange = function () {
                            if (leadXhr.readyState == 4) {

                                // Error during lead call
                                if (leadXhr.status !== 200) {
                                    handleError(new Error(JSON.parse(this.responseText).Errors));
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
                                    invXhr.open("POST", terraceAPIBaseUrl + terraceAPIInvoiceUrl);
                                    invXhr.setRequestHeader('Authorization', 'Bearer ' + tokenResponse.Token);
                                    invXhr.setRequestHeader('Content-Type', 'application/json');
                                    invXhr.setRequestHeader("name", terraceUsername);
                                    invXhr.send(JSON.stringify(invoiceData));

                                    invXhr.onreadystatechange = function () {
                                        if (invXhr.readyState == 4) {

                                            // Error during invoice call
                                            if (invXhr.status !== 200) {
                                                handleError(new Error(terraceGenericError));
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
            handleError(new Error(terraceGenericError));
        }
    } catch (error) {
        var errorMessage = terraceGenericError;

        // Replace default error message to coupon error 
        if (error instanceof Error && error.message === 'coupon') {
            errorMessage = terraceCouponError;
        }

        handleError(new Error(errorMessage));
    }
}

export function flexSubmit(
    checkoutState: CheckoutSelectors,
    handleError: (error: Error) => void
): void {
    const {
        data: { getCheckout, getConfig, getShippingAddress }
    } = checkoutState;

    const checkout = getCheckout();
    const config = getConfig();
    const shippingAddress = getShippingAddress();

    try {
        if (checkout && config && checkout.billingAddress && shippingAddress) {
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
            customerXhr.open("POST", flexAPIBaseUrl + flexAPICustomersUrl);
            customerXhr.setRequestHeader('Authorization', 'Bearer ' + flexBearerToken);
            customerXhr.setRequestHeader('Content-Type', 'application/json');
            customerXhr.send(JSON.stringify(customerData));

            customerXhr.onreadystatechange = function () {
                if (customerXhr.readyState == 4) {
                    // Error during customer call
                    if (customerXhr.status !== 200) {
                        handleError(new Error(flexGenericError));
                    } else {
                        // Parse response
                        let customerResponse: FlexCustomerRootDataResponse = JSON.parse(customerXhr.responseText);

                        if (!customerResponse.customer.customer_id) {
                            handleError(new Error(flexGenericError));
                        }

                        // Continue with checkout
                        // Create checkout session data to send to flex API
                        let checkoutSessionData: FlexCheckoutSessionRootData = {
                            checkout_session: {
                                allow_promotion_codes: false,
                                cancel_url: flexCancelUrl,
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
                                success_url: flexSuccessUrl
                            }
                        };

                        // Flex checkout session API call
                        var checkoutXhr = new XMLHttpRequest();
                        checkoutXhr.withCredentials = false;
                        checkoutXhr.open("POST", flexAPIBaseUrl + flexAPICheckoutUrl);
                        checkoutXhr.setRequestHeader('Authorization', 'Bearer ' + flexBearerToken);
                        checkoutXhr.setRequestHeader('Content-Type', 'application/json');
                        checkoutXhr.send(JSON.stringify(checkoutSessionData));

                        checkoutXhr.onreadystatechange = function () {
                            if (checkoutXhr.readyState == 4) {

                                // Error during checkout call
                                if (checkoutXhr.status !== 200) {
                                    handleError(new Error(flexGenericError));
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
            handleError(new Error(flexGenericError));
        }
    } catch (error) {
        handleError(new Error(flexGenericError));
    }
}

export function partiallySubmit(
    checkoutState: CheckoutSelectors,
    handleError: (error: Error) => void
): void {
    const {
        data: { getCheckout, getConfig }
    } = checkoutState;

    const checkout = getCheckout();
    const config = getConfig();

    try {
        if (checkout && config) {

            if (checkout && checkout.coupons.length > 0) {
                if (config.shopperCurrency.code === 'USD') {
                    handleError(new Error(partiallyUSDCouponError));
                } else {
                    handleError(new Error(partiallyCouponError));
                }
            }

            // Merge physical/digital items in cart
            var lineItems = [...checkout.cart.lineItems.physicalItems, ...checkout.cart.lineItems.digitalItems];

            var total = checkout.grandTotal;

            // Filter line items to Iconic count
            let iconicItemsCount = lineItems
                .filter(item => item.name === "Instasmile Iconic").length;

            let key = config.shopperCurrency.code + iconicItemsCount;
            let offer = partiallyOfferList[key];

            configurePartiallyButton(lineItems, total, partiallyCancelUrl, partiallySuccessUrl, offer);

            // Delay the redirect by one second
            // This ensures partially JS can retrieve BC cart data and create the redirect URL
            setTimeout(() => {
                var btn = document.getElementsByClassName('partiallyButton');
                if (btn.length > 0) {
                    var partiallyUrl = btn[0].getAttribute('href');
                    if (typeof partiallyUrl !== undefined &&
                        typeof partiallyUrl !== null &&
                        typeof partiallyUrl === 'string') {
                        var gaCookie = getCookie("_ga");

                        if (gaCookie !== "") {
                            partiallyUrl += "&_ga=" + gaCookie;
                        }

                        var utmSource = sessionStorage.getItem("utm_source");
                        var utmMedium = sessionStorage.getItem("utm_medium");
                        var utmCampaign = sessionStorage.getItem("utm_campaign");
                        var gad = sessionStorage.getItem("gad");
                        var gclid = sessionStorage.getItem("gclid");

                        if (utmSource !== null && utmSource !== "") {
                            partiallyUrl += "&utm_source=" + utmSource;
                        }

                        if (utmMedium !== null && utmMedium !== "") {
                            partiallyUrl += "&utm_medium=" + utmMedium;
                        }

                        if (utmCampaign !== null && utmCampaign !== "") {
                            partiallyUrl += "&utm_campaign=" + utmCampaign;
                        }

                        if (gad !== null && gad !== "") {
                            partiallyUrl += "&gad=" + gad;
                        }

                        if (gclid !== null && gclid !== "") {
                            partiallyUrl += "&gclid=" + gclid;
                        }

                        btn[0].setAttribute('href', partiallyUrl);
                        firePartially(btn[0]);
                    } else {
                        handleError(new Error(partiallyGenericError));
                    }
                } else {
                    handleError(new Error(partiallyGenericError));
                }
            }, 1000);

        } else {
            handleError(new Error(partiallyGenericError));
        }
    } catch (error) {
        var errorMessage = partiallyGenericError;

        // Replace default error message to coupon error 
        if (error instanceof Error && error.message === 'coupon') {
            if (config?.shopperCurrency.code === 'USD') {
                errorMessage = partiallyUSDCouponError;
            } else {
                errorMessage = partiallyCouponError;
            }
        }

        handleError(new Error(errorMessage));
    }
};

function getCookie(cname: string) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
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

// ----------- START TERRACE FINANCE INTERFACES -----------

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

// ----------- END TERRACE FINANCE INTERFACES -----------

// ----------- START FLEX INTERFACES -----------

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

// ----------- END FLEX INTERFACES -----------
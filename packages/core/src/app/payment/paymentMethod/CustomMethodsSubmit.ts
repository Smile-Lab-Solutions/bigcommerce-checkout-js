import { CheckoutSelectors } from "@bigcommerce/checkout-sdk";
import { configurePartiallyButton, firePartially } from '../../../../../../scripts/custom/partially.js';

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
export const loadPartiallyJs = () => {
    (function() {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://partial.ly/js/partially-checkout-button.js';
        script.async = true;
        document.head.appendChild(script);
    })();
}

export function configurePartiallyButton (lineItems, total, returnUrl, redirectUrl, offer) {
    var partiallyButtonConfig = {
        offer: offer,
        amount: total,
        returnUrl: `${returnUrl}`,
        returnConfirmedUrl: `${redirectUrl}`,
        cssButton: true,
        cssButtonText: 'Proceed to Spread the Cost with Partially',
        cssButtonShowLogo: false,
        cssButtonLogoType: 'full',
        cssButtonLogoPlacement: 'after',
        renderSelector: '#partiallyCartButtonContainer',
        cssButtonCustomBg: '#14CCAD',
        bigcommerceCartItems: lineItems
    };

    // Initialise partially button
    //  this will trigger retrieving BC cart
    var btn = new PartiallyButton(partiallyButtonConfig);
    btn.init();

    // Manually call generate URL and return
    var url = btn.generateUrl();

    return url;
};
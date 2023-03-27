export const loadPartiallyJs = () => {
    (function() {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://partial.ly/js/partially-checkout-button.js';
        script.async = true;
        document.head.appendChild(script);
    })();
}

export function toggleCouponBlock (isPartiallyOpen) {
    var couponInputBlock = document.getElementById('couponFieldSet');

    var couponButton = [...document.getElementsByClassName('couponButton')];
    var couponWarning = [...document.getElementsByClassName('partiallyCouponWarning')];

    if (isPartiallyOpen){
        couponWarning.forEach(warning => {
            warning.style.display = 'block';
        }); 

        if (couponInputBlock !== null && couponInputBlock !== undefined){
            couponInputBlock.style.display = 'none';
        }
        couponButton.forEach(button => {
            button.style.display = 'none';
        });
    } else {
        if (couponInputBlock !== null && couponInputBlock !== undefined){
            couponInputBlock.style.display = 'block';
        }
        couponButton.forEach(button => {
            button.style.display = 'block';
        });

        couponWarning.forEach(warning => {
            warning.style.display = 'none';
        }); 
    }
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
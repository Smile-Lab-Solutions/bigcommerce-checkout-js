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
    var couponInputBlock = [...document.getElementsByClassName('couponFieldSet')];
    var couponLabel = [...document.getElementsByClassName('redeemable-label')];
    var couponWarning = [...document.getElementsByClassName('partiallyCouponWarning')];

    if (isPartiallyOpen){
        couponWarning.forEach(warning => {
            warning.style.display = 'block';
        }); 

        if (couponInputBlock !== null && couponInputBlock !== undefined){
            couponInputBlock.forEach(inputBlock => {
                inputBlock.style.display = 'none';
            });
        }
        couponLabel.forEach(label => {
            label.style.display = 'none';
        });
    } else {
        if (couponInputBlock !== null && couponInputBlock !== undefined){
            couponInputBlock.forEach(inputBlock => {
                inputBlock.style.display = 'block';
            });
        }
        couponLabel.forEach(label => {
            label.style.display = 'block';
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
};
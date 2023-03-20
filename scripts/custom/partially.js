export const configurePartiallyButton = (lineItems, total, returnUrl, redirectUrl, offer) => {
    document.partiallyButtonConfig = {
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

    (function() {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://partial.ly/js/partially-checkout-button.js';
        script.async = true;
        document.head.appendChild(script);

        // Hide BC checkout continue button
        document.getElementById('checkout-payment-continue').style.display = 'none';

        // Listen for the partially continue button 
        document.getElementById('partiallySubmitBtn').onclick = function () {
            var termsCheckbox = document.getElementById("terms");

            if (termsCheckbox !== undefined){
                if (termsCheckbox.checked){
                    document.getElementById('partiallyCartButtonContainer').firstElementChild.click();
                } else {
                    // Submit BC checkout form to force validation on t&c
                    document.getElementById('checkout-payment-continue').click();
                }
            }
        };
    })();
};
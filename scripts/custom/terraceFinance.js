export function toggleCouponBlock (isTfOpen) {
    var couponInputBlock = [...document.getElementsByClassName('couponFieldSet')];
    var couponLabel = [...document.getElementsByClassName('redeemable-label')];
    var couponWarning = [...document.getElementsByClassName('tfCouponWarning')];

    if (isTfOpen){
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
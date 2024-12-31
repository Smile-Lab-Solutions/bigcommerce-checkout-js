// This function is called from 'packages\core\src\app\shipping\SingleShippingForm.tsx'
//  when the shipping form is loaded
export function updateConsentLabel() {
    
    let element = document.getElementsByClassName('dynamic-form-field--field_26')[0];
    if (element){
        element.getElementsByTagName("label")[1].innerHTML = 'By providing your cell number, you agree to receive text messages from instasmile. Message & data rates may apply. Message frequency varies. Reply STOP to opt-out, reply HELP for help. <a href="/pages/terms-and-conditions/" target="_blank">Terms &amp; Conditions</a> <a href="/pages/privacy-policy/">Privacy Policy</a>';
    }
}

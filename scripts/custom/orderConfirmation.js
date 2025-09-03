export const loadOwlCarousel = () => {
    $(document).ready(function () {
        $("#owl-demo").owlCarousel({
            navigation: true, // Show next and prev buttons
            center: true,
            slideSpeed: 300,
            loop: false,
            nav: false,
            autoplay: true,
            autoplayTimeout: 5000,
            navText: ['<i class="fas fa-chevron-left"></i>', '<i class="fas fa-chevron-right"></i>'],
            autoplayHoverPause: true,
            items: 1
        });
    });
    return true;
}
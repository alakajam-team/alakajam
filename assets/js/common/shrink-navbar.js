/* eslint-env jquery */

module.exports = function shrinkNavbar () {

    // The scroll value from which the navbar will be shrinked
    var shrinkHeader = 1;

    $(document).ready(function() {
        shrinkNavbarIfScrolled();
    });

    $(window).scroll(function() {
        shrinkNavbarIfScrolled();
    });

    function shrinkNavbarIfScrolled() {
        var scroll = $(document).scrollTop();
        if ( scroll >= shrinkHeader ) {
            $('.navbar-default').addClass('shrink');
        }
        else {
            $('.navbar-default').removeClass('shrink');
        }
    }

    function getCurrentScroll() {
        return window.pageYOffset || document.documentElement.scrollTop;
    }
}

/* eslint-env jquery */

module.exports = function shrinkNavbar () {
    console.log("hello");
    var shrinkHeader = 200;
    $(window).scroll(function() {
        console.log("hello");
        var scroll = getCurrentScroll();
        if ( scroll >= shrinkHeader ) {
            $('.navbar-default').addClass('shrink');
        }
        else {
            $('.navbar-default').removeClass('shrink');
        }
    });

    function getCurrentScroll() {
        return window.pageYOffset || document.documentElement.scrollTop;
    }
}

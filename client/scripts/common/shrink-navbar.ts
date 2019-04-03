
export default function shrinkNavbar() {
  // The scroll value from which the navbar will be shrinked
  const shrinkHeader = 1;

  $(document).ready(() => {
    shrinkNavbarIfScrolled();
  });

  $(window).scroll(() => {
    shrinkNavbarIfScrolled();
  });

  function shrinkNavbarIfScrolled() {
    const scroll = $(document).scrollTop();
    if (scroll >= shrinkHeader) {
      $(".navbar-default").addClass("shrink");
    } else {
      $(".navbar-default").removeClass("shrink");
    }
  }
}

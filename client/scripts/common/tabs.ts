/**
 * Ensures Bootstrap tabs update URL anchors and are kept upon refresh
 */
export default function tabs() {
  $(".nav-link").click(function() {
    window.location.hash = $(this).attr("href");
  });

  $(document).ready(() => {
    if (window.location.hash) {
      $(`.nav-link[href="${window.location.hash}"]`).first().click();
    }
  });
}


import slug from "slug";

export default function syncSlug(inputSelector) {
  $(inputSelector)
    .on("change", (event) => {
      const $titleInput = $(event.target);
      const slugText = slug($titleInput.val().toString()).toLowerCase();
      const $slugInput = $($titleInput.attr("data-sync-slug-input-selector"));
      if (!$slugInput.val()) {
        $slugInput.val(slugText);
      }
    });
}

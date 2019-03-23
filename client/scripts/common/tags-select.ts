import select2Sort from "./select2-sort";

export default function tagsSelect() {
  $(".js-tags-select").each(function() {
    const $select = $(this);
    const findTagsUrl = $select.attr("data-find-tags-url");
    const allowNewTags = $select.attr("data-allow-new-tags") === "true";

    $select.select2({
      multiple: true,
      ajax: {
        url: findTagsUrl,
        dataType: "json",
        delay: 500,
        data(params) {
          return {
            name: params.term
          };
        },
        processResults(data, params) {
          return {
            results: data.matches.map((userInfo) => {
              return {
                id: userInfo.id,
                text: userInfo.value
              };
            })
          };
        },
        cache: true
      },
      createTag(tag) {
        if (tag.term.indexOf("[NEW]") === -1) {
          return {
            id: tag.term,
            text: tag.term + " [NEW]"
          };
        } else {
          return null;
        }
      },
      escapeMarkup(m) {
        return jQuery.fn.select2.defaults.defaults.escapeMarkup(m)
          .replace("[NEW]", "<strong><i>(new tag)</i></strong>");
      },
      tags: allowNewTags,
      sortResults: select2Sort.byValue,
      width: "100%",
      allowClear: false,
      minimumInputLength: 3
    });
  });
}

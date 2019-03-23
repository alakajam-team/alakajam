
export default function editEntryExternal() {
  $(".js-entry-external-event").each(function() {
    const $externalEventInput = $(this);

    $externalEventInput.select2({
      ajax: {
        url: "/events/ajax-find-external-event",
        dataType: "json",
        delay: 500,
        data(params) {
          return {
            name: params.term
          };
        },
        processResults(data, params) {
          return {
            results: data.map((str) => {
              return { id: str, text: str };
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
          .replace("[NEW]", "<strong><i>(new event)</i></strong>");
      },
      minimumInputLength: 3,
      maximumInputLength: 255,
      allowClear: true,
      placeholder: "",
      tags: true
    });
  });
}

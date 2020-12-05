
import select2Sort from "../common/select2-sort";

export default function editEntryTeam(): void {
  $(".js-edit-entry-team").each(function() {
    const $editEntryTeam = $(this);
    const $searchMembers = $editEntryTeam.find(".js-search-members");

    const entryId = $editEntryTeam.attr("data-entry-id");

    const findTeamMateUrl = $editEntryTeam.attr("data-find-team-mate-url");

    function format(user, container) {
      if (user.element && $(user.element).attr("data-avatar") !== undefined) {
        const $option = $(user.element);
        user.avatar = $option.attr("data-avatar");
        user.locked = $option.attr("data-locked") === "true";
        user.invite = $option.attr("data-invite") === "true";
      }

      if (user.locked || $searchMembers.attr("readonly")) {
        // Select2 hack to support locking tags from deletion (not supported yet in v4)
        $(container).addClass("select2-locked");
      }
      const avatarUrl = user.avatar || "/static/images/default-avatar.png";
      // XXX this should probably use _.template
      return $([
        '<div class="member">',
        '  <div class="member-avatar">',
        '    <img class="avatar" src="', avatarUrl, '" alt="', user.text, '" />',
        "  </div>",
        '  <div class="member-info">',
        '    <div class="username">', user.text, "</div>",
        user.locked ? '<div class="tag owner-tag">Owner</div>' : "",
        user.invite ? '<div class="tag">Pending invite</div>' : "",
        '    <div class="tag unavailable-tag">Has a game already</div>',
        "  </div>",
        "</div>"].join(""));
    }

    $searchMembers.select2({
      multiple: true,
      ajax: {
        url: findTeamMateUrl,
        dataType: "json",
        delay: 500,
        data(params) {
          return {
            name: params.term,
            entryId
          };
        },
        processResults(data, params) {
          $.each(data.matches, (i, m) => {
            m.disabled = (m.status === "unavailable");
          });
          return {
            results: data.matches
          };
        },
        cache: true
      },
      initSelection(elem, cb) {
        const results = [];
        $(elem).children().each((i, option) => {
          const $option = $(option);
          results.push({
            id: $option.val(),
            text: $option.text(),
            avatar: $option.attr("data-avatar"),
            locked: $option.attr("data-locked") === "true",
            invite: $option.attr("data-invite") === "true"
          });
        });
        cb(results);
      },
      sortResults: select2Sort.byText,
      placeholder: "",
      width: "100%",
      allowClear: false,
      minimumInputLength: 3,
      templateResult: format,
      templateSelection: format,
      dropdownCssClass: "edit-team-dropdown"
    });

    $searchMembers.on("select2:unselecting", (e: any) => {
      if ($(e.params.args.data.element).attr("data-locked") === "true") {
        return false;
      }
    });
  });
}

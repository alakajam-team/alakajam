
export default function userSelect(): void {
  $(".js-user-select").each(function() {
    const $select = $(this);
    $select.select2({
      ajax: {
        url: "/api/user",
        dataType: "json",
        delay: 500,
        data(params, page) {
          return {
            title: params.term,
            page: (page - 1)
          };
        },
        processResults(data, params) {
          const flagNonMods = $select.is("[data-flag-non-mods]");
          return {
            results: data.users.map((userInfo) => {
              const promoted = flagNonMods && !userInfo.is_mod && !userInfo.is_admin;
              return {
                id: userInfo.id,
                text: userInfo.title + (promoted ? " (will be promoted to mod)" : "")
              };
            })
          };
        },
        cache: true
      },
      width: "100%",
      allowClear: true,
      placeholder: "",
      minimumInputLength: 3
    });
  });
}

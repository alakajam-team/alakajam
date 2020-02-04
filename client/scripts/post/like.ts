/* eslint-disable no-console */

const DEFAULT_LIKE_TYPE = "like";

export default function like() {
  $(".js-like").each(function() {
    bindLike($(this));
  });
}

function bindLike($like) {
  const $button = $(".js-like-button", $like);

  $button.click((e) => {
    $(".js-like-spinner", $like).removeClass("hidden");
    $.post({
      url: "/post/" + $button.data("post-id") + "/" + $button.data("post-name") + "/like",
      data: {
        like: $button.data("liked") ? false : DEFAULT_LIKE_TYPE,
        unlike: $button.data("liked"),
        ajax: true
      },
      success: (html) => {
        $like.html(html);
        bindLike($like);
      }
    })
      .fail(() => {
        console.error("Failed to register like");
        $(".js-like-spinner", $like).removeClass("hidden");
      });

    e.preventDefault();
    return false;
  });
}

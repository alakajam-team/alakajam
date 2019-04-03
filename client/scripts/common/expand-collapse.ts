
export default function expandCollapse() {
  $(".js-expand-bar").each(function() {
    LimitExpandContent($(this), $(this).parent());
  });

  $(".expandable img").on("load", function() {
    const content = $(this).parents(".expandable");
    LimitExpandContent($(".js-expand-bar", content), $(content));
  });
}

function LimitExpandContent(expandBar, content) {
  const maxHeight = parseInt(expandBar.attr("data-max-height"), 10);
  if (content.height() > maxHeight) {
    // limit the size while preventing cropping just a single line
    content.attr("style", "max-height: " + (maxHeight * 0.8) + "px");
    expandBar.show();
    expandBar.click(() => {
      content.toggleClass("expanded");
    });
  }
}

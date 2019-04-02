import * as Sortable from "../../../node_modules/sortablejs/Sortable";

export default function editEntryLinks() {
  const linksTemplate = _.template($("#js-links-template").html());
  const addLinkSelector = ".js-add-link";
  const removeLinkSelector = ".js-remove-link";
  const linkLabelSelector = ".js-link-label";
  const linkUrlSelector = ".js-link-url";

  const $linksContainer = $(".js-links");

  const links = JSON.parse($linksContainer.attr("data-entry-links") || "[]") || [];
  if (links.length === 0) {
    links.push({});
  }

  if ($linksContainer.length > 0) {
    Sortable.create($linksContainer[0], {
      animation: 100,
      handle: ".draggable",
      onEnd() {
        let index = 0;
        $(".js-link").each(function() {
          $(".js-link-label", this).attr({
            "name": "label" + index,
            "data-row": index
          });
          $(".js-link-url", this).attr({
            "name": "url" + index,
            "data-row": index
          });
          $(".js-remove-link", this).attr({
            "data-row": index
          });
          index++;
        });
      }
    });

    refreshLinksView();

    $linksContainer.on("click", addLinkSelector, () => {
      refreshLinksModel();
      links.push({});
      refreshLinksView();
    });

    $linksContainer.on("click", removeLinkSelector, function() {
      refreshLinksModel();
      links.splice($(this).attr("data-row"), 1);
      if (links.length === 0) {
        links.push({});
      }
      refreshLinksView();
    });
  }

  function refreshLinksView() {
    $linksContainer.html(linksTemplate({ links }));
  }

  function refreshLinksModel() {
    $linksContainer.find(linkLabelSelector).each(function() {
      const $this = $(this);
      links[$this.attr("data-row")].label = $this.val();
    });
    $linksContainer.find(linkUrlSelector).each(function() {
      const $this = $(this);
      links[$this.attr("data-row")].url = $this.val();
    });
  }
}

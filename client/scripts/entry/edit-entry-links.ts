import template from "lodash.template";
import Sortable from "sortablejs";

interface EntryLink {
  label: string;
  url: string;
}

export default function editEntryLinks(): void {
  const linksTemplate = template($("#js-links-template").html());
  const addLinkSelector = ".js-add-link";
  const removeLinkSelector = ".js-remove-link";
  const linkLabelSelector = ".js-link-label";
  const linkUrlSelector = ".js-link-url";

  const $linksContainer = $(".js-links");

  // Model

  const links: EntryLink[] = JSON.parse($linksContainer.attr("data-entry-links") || "[]") || [];
  if (links.length === 0) {
    links.push(newLink());
  }

  // Initial bindings

  if ($linksContainer.length > 0) {
    Sortable.create($linksContainer[0], {
      animation: 100,
      handle: ".draggable",
      onEnd() {
        // Update DOM attributes after a drag'n'drop
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

    $linksContainer.on("click", addLinkSelector, () => {
      links.push(newLink());
      refreshView();
    });

    $linksContainer.on("click", removeLinkSelector, function() {
      links.splice(parseInt($(this).attr("data-row"), 10), 1);
      refreshView();
    });

    // Initial view update

    refreshView();
  }

  function refreshView() {
    // Recreate input fields if needed
    if (links.length !== $(".js-link").length) {
      $linksContainer.html(linksTemplate({ links }));

      // Recreate input bindings
      $(".js-link-url, .js-link-label").off("input");
      $(".js-link-url, .js-link-label").on("input", () => {
        refreshModel();
        refreshView();
      });
    }

    // Toggle links warning
    $(".js-warnings-no-links").toggle(
      links.every(link => !link.url)
    );
  }

  function refreshModel() {
    $linksContainer.find(linkLabelSelector).each(function() {
      const $this = $(this);
      links[$this.attr("data-row")].label = $this.val();
    });
    $linksContainer.find(linkUrlSelector).each(function() {
      const $this = $(this);
      links[$this.attr("data-row")].url = $this.val();
    });
  }

  function newLink(): EntryLink {
    return { label: "", url: "" };
  }

}

/* globals EasyMDE CodeMirror */

/**
 * Initializes the Markdown editor on each textarea matching the given
 * `mdselector`. Can be configured using data attributes. Also initializes
 * the CodeMirror editor on each textarea matching the given `cmSelector`.
 */
export default function editor(mdSelector, cmSelector) {
  $(mdSelector).each(function() {
    const mde = new EasyMDE({
      element: this,
      autoDownloadFontAwesome: false,
      spellChecker: false,
      toolbar: ["bold", "italic", "heading", "|",
        {
          name: "float-left",
          action: alignText("float-left"),
          className: "fas fa-align-left",
          title: "Float left"
        },
        {
          name: "align-center",
          action: alignText("text-center"),
          className: "fas fa-align-center",
          title: "Align center"
        },
        {
          name: "float-right",
          action: alignText("float-right"),
          className: "fas fa-align-right",
          title: "Float right"
        },
        "|",
        "code", "quote", "unordered-list", "ordered-list", "|",
        "link", "image", "table", "horizontal-rule", "|",
        "preview", "side-by-side", "fullscreen", "|",
        {
          name: "guide",
          action() {
            window.open("/article/markdown", "_blank");
          },
          className: "fas fa-question-circle",
          title: "Markdown guide"
        }],
      status: false,
      forceSync: true // Save all changes immediately to underlying textarea. Needed for warnOnUnsavedChanges.
    });
    mde.codemirror.setOption("extraKeys", {
      Home: "goLineLeft",
      End: "goLineRight"
    });
  });

  $(cmSelector).each(function() {
    const codemirror = CodeMirror.fromTextArea(this, {
      autoRefresh: true, // required for editors to load correctly in tabs
      matchBrackets: true,
      autoCloseBrackets: true,
      mode: "application/ld+json",
      lineWrapping: true,
      readOnly: !!$(this).attr("readonly"),
      viewportMargin: Infinity
    });

    if ($(this).hasClass("auto-height")) {
      $(codemirror.display.wrapper).addClass("auto-height");
    }
  });
}

function alignText(className) {
  return (easymde) => {
    const cm = easymde.codemirror;
    const text = cm.getSelection();
    cm.replaceSelection('<p class="' + className + '">' + text + "</p>");
  };
}

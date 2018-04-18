/* eslint-env jquery */
/* globals SimpleMDE CodeMirror */

/**
 * Initializes the Markdown editor on each textarea matching the given
 * `mdselector`. Can be configured using data attributes. Also initializes
 * the CodeMirror editor on each textarea matching the given `cmSelector`.
 */
module.exports = function editor (mdSelector, cmSelector) {
  $(mdSelector).each(function () {
    const $this = $(this)
    const autosaveId = $this.attr('data-autosave-id')
    const mde = new SimpleMDE({
      element: this,
      spellChecker: false,
      toolbar: ['bold', 'italic', 'heading', '|',
        {
          name: 'float-left',
          action: alignText('pull-left'),
          className: 'fa fa-align-left',
          title: 'Float left'
        },
        {
          name: 'align-center',
          action: alignText('text-center'),
          className: 'fa fa-align-center',
          title: 'Align center'
        },
        {
          name: 'float-right',
          action: alignText('pull-right'),
          className: 'fa fa-align-right',
          title: 'Float right'
        },
        '|',
        'code', 'quote', 'unordered-list', 'ordered-list', '|',
        'link', 'image', 'table', 'horizontal-rule', '|',
        'preview', 'side-by-side', 'fullscreen', '|',
        {
          name: 'guide',
          action: function () {
            window.open('/article/markdown', '_blank')
          },
          className: 'fa fa-question-circle',
          title: 'Markdown guide'
        }],
      status: false,
      forceSync: true, // Save all changes immediately to underlying textarea. Needed for warnOnUnsavedChanges.
      autosave: {
        enabled: !!autosaveId,
        uniqueId: autosaveId
      }
    })
    mde.codemirror.setOption('extraKeys', {
      'Home': 'goLineLeft',
      'End': 'goLineRight'
    })
  })

  $(cmSelector).each(function () {
    var codemirror = CodeMirror.fromTextArea(this, {
      autoRefresh: true, // required for editors to load correctly in tabs
      matchBrackets: true,
      autoCloseBrackets: true,
      mode: 'application/ld+json',
      lineWrapping: true,
      readOnly: !!$(this).attr('readonly'),
      viewportMargin: Infinity
    })

    if ($(this).hasClass('auto-height')) {
      $(codemirror.display.wrapper).addClass('auto-height')
    }
  })
}

function alignText (className) {
  return function (editor) {
    var cm = editor.codemirror
    var text = cm.getSelection()
    cm.replaceSelection('<p class="' + className + '">' + text + '</p>')
  }
}

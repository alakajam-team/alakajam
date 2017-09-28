/* eslint-env jquery */
/* globals SimpleMDE */

/**
 * Initializes the Markdown editor on each textarea matching the given
 * selector. Can be configured using data attributes.
 */
module.exports = function editor (selector) {
  $(selector).each(function () {
    const $this = $(this)
    const autosaveId = $this.attr('data-autosave-id')
    new SimpleMDE({ // eslint-disable-line no-new
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
      autosave: {
        enabled: !!autosaveId,
        uniqueId: autosaveId
      }
    })
  })
}

function alignText (className) {
  return function (editor) {
    var cm = editor.codemirror
    var text = cm.getSelection()
    cm.replaceSelection('<p class="' + className + '">' + text + '</p>')
  }
}

/* eslint-env jquery */

function manageZeroes ($input, caretPosition, digits) {
  let value = $input.val()
  if (value) {
    if (value.length > digits) {
      if (value[0] === '0') {
        value = value.slice(value.length - digits, value.length)
      } else {
        value = value.slice(0, digits)
        setTimeout(() => {
          $input[0].setSelectionRange(caretPosition, caretPosition)
        }, 0)
      }
    } else {
      while (value.length < digits) {
        value = '0' + value
      }
    }
    $input.val(value)
  }
}

/**
  Forces leading zeroes on text fields.

  <input type="number" name="seconds" class="form-control js-fixed-digits" data-digits="2" placeholder="seconds" />
*/
module.exports = function fixedDigits () {
  $('input.js-fixed-digits').each(function () {
    // Config
    if (this.type === 'number') {
      console.warn('Cannot manipulate caret with number inputs, changing type to text')
      this.type = 'text'
    }
    let $this = $(this)
    let digits = 3
    try {
      let digitsString = $this.attr('data-digits')
      if (digitsString) {
        digits = parseInt(digitsString)
      }
    } catch (e) {
      console.error('Invalid data-digits info on ', this)
    }

    // Watch key presses
    $this.on('keydown', function (e) {
      $this.data('previous', $this.val())
    })
    $this.on('input', function (e) {
      let $this = $(this)
      $this.val($this.val().replace(/\D/g, '')) // only accept digits
      if ($this.val().length > $this.data('previous').length) { // Don't fill zeroes when pressing backspace/delete etc.
        manageZeroes($(this), this.selectionStart, digits)
      }
    })

    // Init
    manageZeroes($this, this.selectionStart, digits)
  })
}

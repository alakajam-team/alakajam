// tslint:disable: no-console

function manageZeroes($input, caretPosition, digits) {
  let value = $input.val();
  if (value) {
    if (value.length > digits) {
      if (value[0] === "0") {
        value = value.slice(value.length - digits, value.length);
      } else {
        value = value.slice(0, digits);
        setTimeout(() => {
          $input[0].setSelectionRange(caretPosition, caretPosition);
        }, 0);
      }
    } else {
      while (value.length < digits) {
        value = "0" + value;
      }
    }
    $input.val(value);
  }
}

/**
 * Forces leading zeroes on text fields.
 *
 * <input type="number" name="seconds" class="form-control js-fixed-digits" data-digits="2" placeholder="seconds" />
 */
export default function fixedDigits() {
  $("input.js-fixed-digits").each(function() {
    const self: HTMLInputElement = (this as HTMLInputElement);

    // Config
    if (self.type === "number") {
      console.warn("Cannot manipulate caret with number inputs, changing type to text");
      self.type = "text";
    }
    const $this = $(this);
    let digits = 3;
    try {
      const digitsString = $this.attr("data-digits");
      if (digitsString) {
        digits = parseInt(digitsString, 10);
      }
    } catch (e) {
      console.error("Invalid data-digits info on ", this);
    }

    // Watch key presses
    $this.on("keydown", () => {
      $this.data("previous", $this.val());
    });
    $this.on("input", () => {
      const value = $this.val().toString().replace(/\D/g, "");
      $this.val(value); // only accept digits

      // Don't fill zeroes when pressing backspace/delete etc.
      if (value.length > $this.data("previous").length) {
        manageZeroes($this, self.selectionStart, digits);
      }
    });

    // Init
    manageZeroes($this, self.selectionStart, digits);
  });
}

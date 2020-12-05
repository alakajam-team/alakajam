export default function formSubmit(): void {
  // Prevent submitting a form twice
  $("form").submit(function() {
    $("input[type=submit]", this).attr("data-disabled", "true");
    this.onsubmit = () => false;
  });
}


/**
 * Automatically triggered on all picture inputs (see macros/form.macros.html)
 * Supports previewing a picture before it is actually uploaded
 */

function previewUpload(inputBlock: HTMLElement, input: HTMLInputElement) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const $preview = $(".js-picture-input-preview", inputBlock);
      $preview.attr("src", e.target.result);
      $preview.addClass("upload-pending");
      $preview.show();
    };
    reader.readAsDataURL(input.files[0]);
  }
}

export default function pictureInput(): void {
  $(".js-picture-input").each(function() {
    const inputBlock = this;
    const $inputFile = $("input[type=file]", inputBlock);
    $inputFile.on("change load", function() {
      previewUpload(inputBlock, this as HTMLInputElement);
    });
    $inputFile.each(function() {
      previewUpload(inputBlock, this as HTMLInputElement);
    });
  });
}

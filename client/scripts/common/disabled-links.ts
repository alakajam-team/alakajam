export default function disabledLinks(selector: string): void {
  $(selector).click((e) => {
    e.preventDefault();
  });
}

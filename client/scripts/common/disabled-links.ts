export default function disabledLinks(selector) {
  $(selector).click((e) => {
    e.preventDefault();
  });
}

/**
 * Tooltips made with popper.js/Bootsrap 4
 * https://getbootstrap.com/docs/4.0/components/tooltips/
 */

export default function tooltips(selector) {
  $(selector).tooltip({
    delay: { show: 300, hide: 0 }
  });
}

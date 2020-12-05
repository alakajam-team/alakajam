/**
 * Tooltips made with popper.js/Bootsrap 4
 * https://getbootstrap.com/docs/4.0/components/tooltips/
 */

export default function tooltips(selector: string): void {
  initTooltips(selector);
}

function initTooltips(selector) {
  $(selector).tooltip({
    trigger: "hover",
    delay: { show: 300, hide: 0 }
  });

  /**
   * Clicking on a element with tooltips enabled might:
   * - Lose focus, making the tooltip get stuck (despite "trigger: hover")
   * - Toggle other elements with tooltips, which need a new initialization call to work
   */
  $(`${selector}, ${selector} a, ${selector} button`).click(() => {
    $(selector).tooltip("hide");
    setTimeout(() => {
      initTooltips(selector);
    }, 500);
  });
}

import evalRawScript from "../core/eval-raw-script";

import("raw-loader!jquery-lazy").then(evalRawScript).catch(e => console.error(e));

export default function lazyImages(selector: string): void {
  $(selector).Lazy();
}

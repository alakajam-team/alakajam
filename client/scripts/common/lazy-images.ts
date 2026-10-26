import evalRawScript from "../core/eval-raw-script";

import("jquery-lazy?raw").then(evalRawScript).catch(e => console.error(e));

export default function lazyImages(selector: string): void {
  $(selector).Lazy();
}

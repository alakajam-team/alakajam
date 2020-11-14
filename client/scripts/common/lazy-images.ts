import evalRawScript from "../core/eval-raw-script";

import("raw-loader!jquery-lazy").then(evalRawScript);

export default function lazyImages(selector: string) {
  $(selector).Lazy();
}

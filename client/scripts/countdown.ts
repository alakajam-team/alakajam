import evalRawScript from "./core/eval-raw-script";

import("raw-loader!flipclock/dist/flipclock.min.js").then(evalRawScript);

export default function countdown(selector: string) {
  $(selector).each(function () {
    const $countdown = $(this);

    const startTime = roundToNearestSecond(Date.now());
    const endTime = Date.parse($countdown.attr("data-countdown-to-date"));
    const targetDate = new Date(Math.max(Date.now(), endTime));

    $countdown.show();

    const clock = new FlipClock(this, targetDate, {
      face: "DayCounter",
      countdown: true,
      autoStart: false
    });

    if (endTime > startTime) {
      clock.timer.on("interval", () => {
        // FlipClock actually decreases the target date every second, down to the initial date.
        // It also seems to have rounding issues when decreasing time
        clock.value.value = new Date(roundToNearestSecond(clock.value.value.getTime()));
        if (clock.value.value.getTime() <= startTime + .5) {
          clock.stop();
        }
      });

      clock.start();
    }

  });
}

function roundToNearestSecond(timeMs: number) {
  return Math.round(timeMs / 1000) * 1000;
}
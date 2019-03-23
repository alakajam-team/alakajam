import "../../node_modules/flipclock/compiled/flipclock.js";

export default function countdown(selector) {
  $(selector).each(function() {
    const $countdown = $(this);
    const endDateString = $countdown.attr("data-countdown-to-date");
    const diffMs = Math.max(0, Date.parse(endDateString) - Date.now());
    $countdown.show();
    $countdown.FlipClock(diffMs / 1000, {
      clockFace: "DailyCounter",
      countdown: true
    });
  });
}

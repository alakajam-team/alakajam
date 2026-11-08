import { elapsedTime, flipClock, theme } from "flipclock";

export default function countdown(selector: string): void {
  $(selector).each(function() {
    const $countdown = $(this);

    const now = Date.now();
    const endTime = Date.parse($countdown.attr("data-countdown-to-date"));
    const targetDate = new Date(Math.max(now, endTime));

    $countdown.show();

    // Past dates are displayed as zeros, so the clock is mounted but not started
    flipClock({
      parent: this,
      autoStart: endTime > now,
      face: elapsedTime({ to: targetDate, format: "[DD] [hh] [mm] [ss]" }),
      theme: theme({
        dividers: " ",
        // One single-label list per group of the format below
        labels: [["Days"], ["Hours"], ["Minutes"], ["Seconds"]]
      })
    });
  });
}

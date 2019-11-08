/*
 * Bootstrap Notify integration
 * https://github.com/mouse0270/bootstrap-notify
 */

interface Alert {
  type: "success" | "info" | "warning" | "danger";
  title?: string;
  message: string;
  floating?: boolean;
}

const INLINE_ALERTS_SELECTOR = "#js-alerts-inline";

function makeInlineAlertsDismissable() {
  const inlineAlerts = $(".alert", $(INLINE_ALERTS_SELECTOR));
  inlineAlerts.css({ cursor: "pointer" });
  inlineAlerts.click((e) => {
    $(e.delegateTarget).fadeOut(300);
  });
}

export default function(selector: string) {
  let alerts: Alert[];
  try {
    alerts = JSON.parse($(selector).text());
  } catch (e) {
    // tslint:disable-next-line: no-console
    console.warn("Failed to parse alert data");
    return;
  }

  const inlineAlertsAreShown = $(INLINE_ALERTS_SELECTOR).length > 0;
  if (inlineAlertsAreShown) {
    makeInlineAlertsDismissable();
  }

  for (const alert of alerts) {
    if (!alert.floating) {
      if (inlineAlertsAreShown) {
        continue;
      } else {
        // tslint:disable-next-line: no-console
        console.warn("No inline alerts block found, showing inline alert as floating instead");
      }
    }

    $.notify({
      title: alert.title,
      message: alert.message
    }, {
      type: alert.type,
      placement: {
        from: "top",
        align: ["warning", "danger"].includes(alert.type) ? "center" : "right"
      },
      delay: 3000 + alert.message.length * 50,
      mouse_over: "pause",
      offset: {
        x: 15,
        y: 75
      },
      animate: {
        enter: "animated fadeInDown faster",
        exit: "animated fadeOut fast"
      },
      z_index: 1029
    });
  }
}

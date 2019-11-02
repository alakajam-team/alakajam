/*
 * Bootstrap Notify integration
 * https://github.com/mouse0270/bootstrap-notify
 */

interface NotificationMessage {
  type: "success" | "info" | "warning" | "danger";
  title?: string;
  message: string;
}

export default function(selector: string) {
  let notifications: NotificationMessage[];
  try {
    notifications = JSON.parse($(selector).text());
  } catch (e) {
    // tslint:disable-next-line: no-console
    console.warn("Failed to parse notification data");
    return;
  }

  for (const notification of notifications) {
    $.notify({
      title: notification.title,
      message: notification.message
    }, {
      type: notification.type,
      placement: {
        from: "top",
        align: ["warning", "danger"].includes(notification.type) ? "center" : "right"
      },
      delay: 3000 + notification.message.length * 50,
      mouse_over: "pause",
      offset: {
        x: 0,
        y: 120
      },
      animate: {
        enter: "animated fadeIn fastest",
        exit: "animated fadeOut fast"
      }
    });
  }
}

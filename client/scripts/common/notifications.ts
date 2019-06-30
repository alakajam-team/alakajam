interface NotificationMessage {
  type: "success" | "info" | "warning" | "error";
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
      message: notification.message
    }, {
      type: notification.type,
      delay: 3000 + notification.message.length * 50,
      offset: {
        x: 15,
        y: 75
      },
      animate: {
        enter: "animated fadeInDown faster",
        exit: "animated fadeOut fast"
      }
    });
  }
}

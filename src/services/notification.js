import badge from "./badge";
import { log } from "../helpers";

class Notification {
  constructor() {
    chrome.notifications.onClosed.addListener(notificationId => {
      log(notificationId);

      if (notificationId.indexOf("tcs-notifier") === 0) {
        badge.decrement();
      }
    });
  }

  show(title, message) {
    const notificationId = "tcs-notifier-" + Date.now();

    chrome.notifications.create(notificationId, {
      type: "basic",
      title: title || "",
      message: message || "",
      iconUrl: "/icons/icon128.png",
      requireInteraction: true
    });

    badge.increment();
  }
}

export default new Notification();

import type { ParentAlert } from "./types";
import { footballAlertText } from "./alerts";

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported";
  }
  return Notification.permission;
}

export async function enableDeviceNotify(): Promise<boolean> {
  if (typeof window === "undefined" || typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function fireParentNotify(alert: ParentAlert): void {
  if (typeof window === "undefined" || typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  try {
    const display = footballAlertText(alert);
    const note = new Notification(display.title, {
      body: display.body,
      tag: alert.kind,
      lang: "pt-BR",
      silent: false,
    });
    note.onclick = () => {
      window.focus();
      note.close();
      window.location.assign("/pais");
    };
  } catch {
    /* some browsers block without a service worker */
  }
}

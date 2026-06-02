const { contextBridge, ipcRenderer } = require("electron");

const notificationChannels = {
  startBreakReminders: "notifications:start-break-reminders",
  stopBreakReminders: "notifications:stop-break-reminders",
  showBreakReminder: "notifications:show-break-reminder",
  breakReminderAction: "notifications:break-reminder-action",
};

contextBridge.exposeInMainWorld("electronNotifications", {
  startBreakReminders(intervalMs) {
    return ipcRenderer.invoke(notificationChannels.startBreakReminders, intervalMs);
  },
  stopBreakReminders() {
    return ipcRenderer.invoke(notificationChannels.stopBreakReminders);
  },
  showBreakReminder(options) {
    return ipcRenderer.invoke(notificationChannels.showBreakReminder, options);
  },
  onBreakReminderAction(callback) {
    if (typeof callback !== "function") {
      return undefined;
    }

    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on(notificationChannels.breakReminderAction, listener);

    return () => {
      ipcRenderer.removeListener(notificationChannels.breakReminderAction, listener);
    };
  },
});

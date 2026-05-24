const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronNotifications", {
  startBreakReminders(intervalMs) {
    return ipcRenderer.invoke("notifications:start-break-reminders", intervalMs);
  },
  stopBreakReminders() {
    return ipcRenderer.invoke("notifications:stop-break-reminders");
  },
});

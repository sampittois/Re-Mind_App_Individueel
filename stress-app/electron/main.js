const path = require("node:path");
const { app, BrowserWindow, Notification, ipcMain } = require("electron");

const reminderIntervals = new Map();

function clearReminderForContents(contentsId) {
  const intervalId = reminderIntervals.get(contentsId);
  if (intervalId) {
    clearInterval(intervalId);
    reminderIntervals.delete(contentsId);
  }
}

function sendBreakNotification() {
  if (!Notification.isSupported()) {
    return;
  }

  new Notification({
    title: "Pauzeherinnering",
    body: "Het is tijd voor een korte pauze.",
  }).show();
}

ipcMain.handle("notifications:start-break-reminders", (event, intervalMs) => {
  const contentsId = event.sender.id;
  const parsedIntervalMs = Number(intervalMs);

  clearReminderForContents(contentsId);

  if (!Number.isFinite(parsedIntervalMs) || parsedIntervalMs <= 0) {
    return false;
  }

  const intervalId = setInterval(() => {
    sendBreakNotification();
  }, parsedIntervalMs);

  reminderIntervals.set(contentsId, intervalId);
  return true;
});

ipcMain.handle("notifications:stop-break-reminders", (event) => {
  clearReminderForContents(event.sender.id);
  return true;
});

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL("http://localhost:5173");

  win.webContents.on("destroyed", () => {
    clearReminderForContents(win.webContents.id);
  });
}

app.whenReady().then(createWindow);

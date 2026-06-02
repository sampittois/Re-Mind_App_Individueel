const path = require("node:path");
const { app, BrowserWindow, Notification, ipcMain, nativeImage } = require("electron");

const windowIconPath = app.isPackaged
  ? path.join(process.resourcesPath, "logo_primary-dark_icon.png")
  : path.join(__dirname, "..", "frontend", "src", "assets", "logo_primary-dark_icon.png");
const appIcon = nativeImage.createFromPath(windowIconPath);

const reminderIntervals = new Map();
let mainWindow = null;
const hasSingleInstanceLock = app.requestSingleInstanceLock();

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
    icon: appIcon,
  }).show();
}

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return false;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
  return true;
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
  if (focusMainWindow()) {
    return mainWindow;
  }

  const win = new BrowserWindow({
    width: 900,
    height: 700,
    title: "Re-Mind",
    icon: appIcon,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (app.isPackaged) {
    win.loadFile(path.join(process.resourcesPath, "renderer", "index.html"));
  } else {
    win.loadURL("http://localhost:5173");
  }

  win.webContents.on("destroyed", () => {
    clearReminderForContents(win.webContents.id);
  });

  win.on("closed", () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });

  mainWindow = win;
  return win;
}

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    focusMainWindow();
  });

  app.whenReady().then(() => {
    app.setName("Re-Mind");
    app.setAppUserModelId("com.remind.stressapp");
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
        return;
      }

      focusMainWindow();
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

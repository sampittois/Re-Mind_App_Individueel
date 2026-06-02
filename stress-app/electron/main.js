const path = require("node:path");
const { app, BrowserWindow, Notification, ipcMain, nativeImage, shell } = require("electron");

const APP_NAME = "Re:Mind";
const APP_DATA_NAME = "Re-Mind";
const APP_USER_MODEL_ID = "com.remind.stressapp";

app.setName(APP_NAME);
app.setPath("userData", path.join(app.getPath("appData"), APP_DATA_NAME));
if (process.platform === "win32") {
  app.setAppUserModelId(APP_USER_MODEL_ID);
}

const windowIconPath = app.isPackaged
  ? path.join(process.resourcesPath, "logo_primary-dark_icon.png")
  : path.join(__dirname, "..", "frontend", "src", "assets", "logo_primary-dark_icon.png");
const appIcon = nativeImage.createFromPath(windowIconPath);

const reminderIntervals = new Map();
let mainWindow = null;
const hasSingleInstanceLock = app.requestSingleInstanceLock();

function enableReloadShortcuts(win) {
  win.webContents.on("before-input-event", (event, input) => {
    const key = input.key.toLowerCase();
    const usesReloadModifier = input.control || input.meta;
    const shouldReload = input.type === "keyDown" && (key === "f5" || (usesReloadModifier && key === "r"));

    if (!shouldReload) {
      return;
    }

    event.preventDefault();

    if (input.shift) {
      win.webContents.reloadIgnoringCache();
      return;
    }

    win.webContents.reload();
  });
}

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

function ensureWindowsNotificationShortcut() {
  if (process.platform !== "win32") {
    return;
  }

  const shortcutPath = path.join(app.getPath("appData"), "Microsoft", "Windows", "Start Menu", "Programs", "ReMind.lnk");
  const shortcutOptions = {
    target: process.execPath,
    appUserModelId: APP_USER_MODEL_ID,
    description: APP_NAME,
    icon: windowIconPath,
    iconIndex: 0,
  };

  if (!app.isPackaged) {
    shortcutOptions.args = `"${app.getAppPath()}"`;
  }

  shell.writeShortcutLink(shortcutPath, "replace", shortcutOptions);
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
    title: APP_NAME,
    icon: appIcon,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.maximize();
  enableReloadShortcuts(win);

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
    ensureWindowsNotificationShortcut();
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

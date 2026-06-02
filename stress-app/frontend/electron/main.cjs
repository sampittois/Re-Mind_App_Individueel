const { app, BrowserWindow, Notification, ipcMain, nativeImage, shell } = require("electron");
const path = require("path");

const appIconPath = app.isPackaged
  ? path.join(process.resourcesPath, "logo_primary-dark_icon.png")
  : path.join(__dirname, "../src/assets/logo_primary-dark_icon.png");
const appIcon = nativeImage.createFromPath(appIconPath);
const preloadPath = path.join(__dirname, "preload.cjs");

let mainWindow = null;
let breakReminderTimer = null;
let pendingBreakReminderAction = null;

function getBreakReminderAction(actionIndex) {
  if (actionIndex === 0) {
    return "continue";
  }

  if (actionIndex === 1) {
    return "take-break";
  }

  return null;
}

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
}

function sendBreakReminderAction(action, reminderKey = null) {
  if (!action) {
    return;
  }

  if (!mainWindow || mainWindow.isDestroyed()) {
    pendingBreakReminderAction = { action, reminderKey };
    return;
  }

  focusMainWindow();
  mainWindow.webContents.send("notifications:break-reminder-action", {
    action,
    reminderKey,
  });
}

function flushPendingBreakReminderAction() {
  if (!pendingBreakReminderAction || !mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const action = pendingBreakReminderAction;
  pendingBreakReminderAction = null;
  sendBreakReminderAction(action.action, action.reminderKey);
}

function showBreakNotification(options = {}) {
  if (!Notification.isSupported()) {
    return false;
  }

  const reminderKey = typeof options.reminderKey === "string" ? options.reminderKey : null;
  const notification = new Notification({
    id: reminderKey || undefined,
    title: typeof options.title === "string" && options.title.trim() ? options.title : "Tijd voor een pauze",
    body:
      typeof options.body === "string" && options.body.trim()
        ? options.body
        : "Neem even afstand van je scherm en geef jezelf een reset.",
    icon: appIcon,
    silent: Boolean(options.silent),
    actions: [
      { type: "button", text: "Doorwerken" },
      { type: "button", text: "Neem een pauze" },
    ],
  });

  notification.on("click", focusMainWindow);
  notification.on("action", (event, actionIndex) => {
    const resolvedActionIndex = Number.isFinite(event?.actionIndex) ? event.actionIndex : actionIndex;
    sendBreakReminderAction(getBreakReminderAction(resolvedActionIndex), reminderKey);
  });
  notification.show();
  return true;
}

function stopBreakReminderTimer() {
  if (breakReminderTimer) {
    clearInterval(breakReminderTimer);
    breakReminderTimer = null;
  }
}

function startBreakReminderTimer(intervalMs) {
  const normalizedInterval = Number(intervalMs);

  if (!Number.isFinite(normalizedInterval) || normalizedInterval < 60_000) {
    return { ok: false, reason: "invalid-interval" };
  }

  stopBreakReminderTimer();
  breakReminderTimer = setInterval(() => {
    showBreakNotification();
  }, normalizedInterval);

  return { ok: true };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#f7f4ef",
    autoHideMenuBar: true,
    icon: appIcon,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  mainWindow.webContents.once("did-finish-load", flushPendingBreakReminderAction);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

ipcMain.handle("notifications:start-break-reminders", (_event, intervalMs) => {
  return startBreakReminderTimer(intervalMs);
});

ipcMain.handle("notifications:stop-break-reminders", () => {
  stopBreakReminderTimer();
  return { ok: true };
});

ipcMain.handle("notifications:show-break-reminder", (_event, options) => {
  return { ok: showBreakNotification(options) };
});

app.whenReady().then(() => {
  app.setName("Re-Mind");
  app.setAppUserModelId("be.thomasmore.remind");

  if (process.platform === "win32" && typeof Notification.handleActivation === "function") {
    Notification.handleActivation((details) => {
      if (details.type === "action") {
        sendBreakReminderAction(getBreakReminderAction(details.actionIndex), details.id || null);
        return;
      }

      focusMainWindow();
    });
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  stopBreakReminderTimer();

  if (process.platform !== "darwin") {
    app.quit();
  }
});

const { app, BrowserWindow, Notification, ipcMain, nativeImage, shell } = require("electron");
const fs = require("fs");
const path = require("path");

const APP_NAME = "Re:Mind";
const APP_DATA_NAME = "Re-Mind";
const APP_USER_MODEL_ID = "be.thomasmore.remind";

app.setName(APP_NAME);
app.setPath("userData", path.join(app.getPath("appData"), APP_DATA_NAME));
if (process.platform === "win32") {
  app.setAppUserModelId(APP_USER_MODEL_ID);
}

const startupLogPath = path.join(app.getPath("userData"), "startup.log");

function logStartup(message, error = null) {
  try {
    fs.mkdirSync(path.dirname(startupLogPath), { recursive: true });
    const errorDetails = error ? ` ${error.stack || error.message || String(error)}` : "";
    fs.appendFileSync(startupLogPath, `${new Date().toISOString()} ${message}${errorDetails}\n`);
  } catch {
    // Startup logging must never block the app from opening.
  }
}

logStartup(`main:start packaged=${app.isPackaged} appPath=${app.getAppPath()}`);

process.on("uncaughtException", (error) => {
  logStartup("uncaughtException", error);
});

process.on("unhandledRejection", (reason) => {
  logStartup("unhandledRejection", reason);
});

app.on("render-process-gone", (_event, _webContents, details) => {
  logStartup(`render-process-gone reason=${details.reason} exitCode=${details.exitCode}`);
});

app.on("child-process-gone", (_event, details) => {
  logStartup(`child-process-gone type=${details.type} reason=${details.reason} exitCode=${details.exitCode}`);
});

app.on("before-quit", () => {
  logStartup("before-quit");
});

app.on("will-quit", () => {
  logStartup("will-quit");
});

const appIconPath = app.isPackaged
  ? path.join(process.resourcesPath, "logo_primary-dark_icon.png")
  : path.join(__dirname, "../src/assets/logo_primary-dark_icon.png");
const appIcon = nativeImage.createFromPath(appIconPath);
const preloadPath = path.join(__dirname, "preload.cjs");

let mainWindow = null;
let breakReminderTimer = null;
let pendingBreakReminderAction = null;
const activeBreakNotifications = new Map();
const hasSingleInstanceLock = app.requestSingleInstanceLock();
logStartup(`single-instance-lock=${hasSingleInstanceLock}`);

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
    return false;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
  return true;
}

function closeBreakNotification(reminderKey = null) {
  if (reminderKey && activeBreakNotifications.has(reminderKey)) {
    activeBreakNotifications.get(reminderKey).close();
    activeBreakNotifications.delete(reminderKey);
    return;
  }

  activeBreakNotifications.forEach((notification) => notification.close());
  activeBreakNotifications.clear();
}

function sendBreakReminderAction(action, reminderKey = null, options = {}) {
  if (!action) {
    return;
  }

  closeBreakNotification(reminderKey);

  if (!mainWindow || mainWindow.isDestroyed()) {
    pendingBreakReminderAction = { action, reminderKey };
    return;
  }

  if (options.focus) {
    focusMainWindow();
  }

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

function ensureWindowsNotificationShortcut() {
  if (process.platform !== "win32") {
    return;
  }

  const shortcutPath = path.join(app.getPath("appData"), "Microsoft", "Windows", "Start Menu", "Programs", "ReMind.lnk");
  const shortcutOptions = {
    target: process.execPath,
    appUserModelId: APP_USER_MODEL_ID,
    description: APP_NAME,
    icon: appIconPath,
    iconIndex: 0,
  };

  if (!app.isPackaged) {
    shortcutOptions.args = `"${app.getAppPath()}"`;
  }

  shell.writeShortcutLink(shortcutPath, "replace", shortcutOptions);
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
    const action = getBreakReminderAction(resolvedActionIndex);
    sendBreakReminderAction(action, reminderKey, { focus: action === "take-break" });
  });
  notification.on("close", () => {
    if (reminderKey) {
      activeBreakNotifications.delete(reminderKey);
    }
  });
  if (reminderKey) {
    activeBreakNotifications.set(reminderKey, notification);
  }
  notification.show();
  return true;
}

function stopBreakReminderTimer() {
  if (breakReminderTimer) {
    clearInterval(breakReminderTimer);
    breakReminderTimer = null;
  }
  closeBreakNotification();
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
  logStartup("createWindow:start");

  if (focusMainWindow()) {
    logStartup("createWindow:focused-existing-window");
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: APP_NAME,
    backgroundColor: "#f7f4ef",
    autoHideMenuBar: true,
    icon: appIcon,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath,
    },
  });

  mainWindow.maximize();
  enableReloadShortcuts(mainWindow);
  logStartup("createWindow:browser-window-created");

  const indexPath = path.join(__dirname, "../dist/index.html");
  logStartup(`createWindow:loadFile ${indexPath}`);
  mainWindow.loadFile(indexPath);
  mainWindow.webContents.once("did-finish-load", () => {
    logStartup("webContents:did-finish-load");
    flushPendingBreakReminderAction();
  });
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    logStartup(`webContents:did-fail-load code=${errorCode} description=${errorDescription} url=${validatedURL}`);
  });
  mainWindow.on("closed", () => {
    logStartup("mainWindow:closed");
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  return mainWindow;
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

if (!hasSingleInstanceLock) {
  logStartup("quit:no-single-instance-lock");
  app.quit();
} else {
  app.on("second-instance", () => {
    focusMainWindow();
  });

  app.whenReady().then(() => {
    logStartup("app:ready");
    ensureWindowsNotificationShortcut();

    if (process.platform === "win32" && typeof Notification.handleActivation === "function") {
      Notification.handleActivation((details) => {
        if (details.type === "action") {
          const action = getBreakReminderAction(details.actionIndex);
          sendBreakReminderAction(action, details.id || null, { focus: action === "take-break" });
          return;
        }

        focusMainWindow();
      });
    }

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
  stopBreakReminderTimer();

  if (process.platform !== "darwin") {
    app.quit();
  }
});

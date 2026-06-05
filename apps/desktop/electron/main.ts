import path from "node:path";
import { app, BrowserWindow, ipcMain, Notification, session } from "electron";

const XHS_CREATOR_URL = "https://creator.xiaohongshu.com/";
const xhsWindows = new Map<string, BrowserWindow>();

function safePartitionId(accountId: string) {
  return accountId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function xhsPartition(accountId: string) {
  return `persist:redbook-xhs-${safePartitionId(accountId)}`;
}

function openXhsWorkbench(accountId: string, displayName: string) {
  if (!accountId) {
    throw new Error("缺少账号 ID，无法打开小红书工作台。");
  }

  const existingWindow = xhsWindows.get(accountId);
  if (existingWindow && !existingWindow.isDestroyed()) {
    existingWindow.focus();
    return;
  }

  const workbenchWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 960,
    minHeight: 680,
    title: `小红书工作台 - ${displayName || accountId}`,
    backgroundColor: "#f5f5f7",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      partition: xhsPartition(accountId)
    }
  });

  xhsWindows.set(accountId, workbenchWindow);
  workbenchWindow.on("closed", () => xhsWindows.delete(accountId));
  void workbenchWindow.loadURL(XHS_CREATOR_URL);
}

async function clearXhsSession(accountId: string) {
  if (!accountId) {
    throw new Error("缺少账号 ID，无法清除登录状态。");
  }

  const targetSession = session.fromPartition(xhsPartition(accountId));
  await targetSession.clearStorageData();
  await targetSession.clearCache();
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: "RedBook Compliance Ops",
    backgroundColor: "#f5f5f7",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (!app.isPackaged) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL ?? "http://127.0.0.1:5173");
    return;
  }

  mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
}

ipcMain.handle("notifyPublishDue", (_event, message: string) => {
  if (Notification.isSupported()) {
    new Notification({
      title: "Manual publishing reminder",
      body: message
    }).show();
  }
});

ipcMain.handle("openXhsWorkbench", (_event, accountId: string, displayName: string) => {
  openXhsWorkbench(accountId, displayName);
});

ipcMain.handle("clearXhsSession", async (_event, accountId: string) => {
  await clearXhsSession(accountId);
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

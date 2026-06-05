import path from "node:path";
import { app, BrowserWindow, ipcMain, Notification } from "electron";

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

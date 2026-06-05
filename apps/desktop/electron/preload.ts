import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("redbook", {
  clearXhsSession: (accountId: string) => ipcRenderer.invoke("clearXhsSession", accountId),
  notifyPublishDue: (message: string) => ipcRenderer.invoke("notifyPublishDue", message),
  openXhsWorkbench: (accountId: string, displayName: string) =>
    ipcRenderer.invoke("openXhsWorkbench", accountId, displayName)
});

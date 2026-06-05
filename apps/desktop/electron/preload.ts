import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("redbook", {
  notifyPublishDue: (message: string) => ipcRenderer.invoke("notifyPublishDue", message)
});

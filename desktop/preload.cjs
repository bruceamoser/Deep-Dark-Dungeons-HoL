const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("desktop", {
  save: (text) => ipcRenderer.invoke("save:write", text),
  load: () => ipcRenderer.invoke("save:read"),
});

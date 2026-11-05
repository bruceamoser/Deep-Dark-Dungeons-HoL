const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("desktop", {
  saves: Object.fromEntries(
    ["get", "set", "remove", "keys"].map((method) => [
      method,
      (...args) => ipcRenderer.invoke(`saves:${method}`, ...args),
    ]),
  ),
  onClose: (callback) => {
    ipcRenderer.on("save:closing", () => callback());
    ipcRenderer.send("save:ready");
  },
  close: () => ipcRenderer.send("save:closed"),
  load: () => ipcRenderer.invoke("save:read"),
});

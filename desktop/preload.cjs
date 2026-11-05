const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("desktop", {
  updates: {
    ...Object.fromEntries(
      ["status", "check", "install", "releases"].map((method) => [
        method,
        () => ipcRenderer.invoke(`updates:${method}`),
      ]),
    ),
    subscribe: (callback) => {
      const listener = (_event, status) => callback(status);
      ipcRenderer.on("updates:status", listener);
      return () => ipcRenderer.removeListener("updates:status", listener);
    },
  },
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
  cancelClose: (message) => ipcRenderer.send("save:failed", message),
  load: () => ipcRenderer.invoke("save:read"),
});

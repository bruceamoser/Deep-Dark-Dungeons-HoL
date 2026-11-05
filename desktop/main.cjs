const { app, BrowserWindow, protocol, net, ipcMain } = require("electron");
const path = require("node:path");
const { createSaveStorage } = require("./save-storage.cjs");
const { pathToFileURL } = require("node:url");
if (process.env.DDD_TEST_USER_DATA)
  app.setPath("userData", process.env.DDD_TEST_USER_DATA);
protocol.registerSchemesAsPrivileged([
  {
    scheme: "dungeon",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);
app.whenReady().then(async () => {
  const root = path.resolve(__dirname, "../dist");
  protocol.handle("dungeon", (request) => {
    const u = new URL(request.url);
    let p;
    try {
      p = path.resolve(
        root,
        "." +
          decodeURIComponent(u.pathname === "/" ? "/index.html" : u.pathname),
      );
    } catch {
      return new Response("Invalid path", { status: 400 });
    }
    if (u.host !== "game" || !p.startsWith(root + path.sep))
      return new Response("Forbidden", { status: 403 });
    return net.fetch(pathToFileURL(p).href);
  });
  const storage = createSaveStorage(app.getPath("userData"));
  const trusted = (event) => {
    if (!event.senderFrame.url.startsWith("dungeon://game/"))
      throw new Error("Invalid save sender");
  };
  for (const method of ["get", "set", "remove", "keys"])
    ipcMain.handle(`saves:${method}`, (event, ...args) => {
      trusted(event);
      return storage[method](...args);
    });
  ipcMain.handle("save:read", async (event) => {
    trusted(event);
    const index = JSON.parse((await storage.get("index")) ?? "null");
    if (!index?.active) return storage.get("legacy");
    const record = JSON.parse(await storage.get(index.active));
    return record?.text ?? null;
  });
  const win = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#080e13",
    title: "Deep Dark Dungeons — HoL",
    icon: path.join(root, "art/greyhaven-seal.png"),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith("dungeon://game/")) e.preventDefault();
  });
  let closing = false,
    readyToSave = false;
  ipcMain.on("save:ready", (event) => {
    trusted(event);
    readyToSave = true;
  });
  win.on("close", (event) => {
    if (closing || !readyToSave) return;
    event.preventDefault();
    win.webContents.send("save:closing");
  });
  ipcMain.on("save:closed", (event) => {
    trusted(event);
    closing = true;
    win.close();
  });
  await win.loadURL("dungeon://game/");
});
app.on("window-all-closed", () => app.quit());

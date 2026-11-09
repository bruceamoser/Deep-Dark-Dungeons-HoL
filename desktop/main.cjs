const {
  app,
  BrowserWindow,
  protocol,
  net,
  ipcMain,
  shell,
} = require("electron");
const electronUpdater = require("electron-updater");
// Multi-target Linux builds may contain a package-type marker. APPIMAGE is
// authoritative when running the portable release; Debian installs use dpkg.
const autoUpdater = process.env.APPIMAGE
  ? new electronUpdater.AppImageUpdater()
  : electronUpdater.autoUpdater;
const fs = require("node:fs");
const { createUpdates } = require("./updates.cjs");
const path = require("node:path");
const { createSaveStorage } = require("./save-storage.cjs");
const { pathToFileURL } = require("node:url");
// Keep existing saves across the display-name change.
app.setPath(
  "userData",
  process.env.DDD_TEST_USER_DATA ||
    path.join(app.getPath("appData"), "deep-dark-dungeons-hol"),
);
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
    if (
      event.sender !== win.webContents ||
      event.senderFrame !== event.sender.mainFrame ||
      !event.senderFrame.url.startsWith("dungeon://game/")
    )
      throw new Error("Invalid desktop sender");
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
    title: "Four Lanterns Deep",
    icon: path.join(root, "art/four-lanterns-seal.png"),
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
    readyToSave = false,
    pendingUpdate = false,
    updateTimer;
  const updates = createUpdates({
    updater: autoUpdater,
    version: app.getVersion(),
    supported:
      app.isPackaged &&
      (process.platform === "win32" ||
        (process.platform === "linux" &&
          (!!process.env.APPIMAGE ||
            (process.execPath.startsWith("/opt/deep-dark-dungeons-hol/") &&
              fs.existsSync(
                path.join(process.resourcesPath, "package-type"),
              ))))),
    publish: (status) => {
      if (!win.isDestroyed()) win.webContents.send("updates:status", status);
    },
  });
  for (const method of ["status", "check"])
    ipcMain.handle(`updates:${method}`, (event) => {
      trusted(event);
      return updates[method]();
    });
  ipcMain.handle("updates:releases", (event) => {
    trusted(event);
    return shell.openExternal(
      "https://github.com/bruceamoser/Deep-Dark-Dungeons-HoL/releases/latest",
    );
  });
  ipcMain.handle("updates:install", (event) => {
    trusted(event);
    if (!readyToSave)
      throw new Error("Wait for your journey to finish loading.");
    updates.prepareInstall();
    pendingUpdate = true;
    win.webContents.send("save:closing", "update");
  });
  ipcMain.on("save:ready", (event) => {
    trusted(event);
    if (readyToSave) return;
    readyToSave = true;
    setTimeout(() => updates.check(), 6000).unref();
    updateTimer = setInterval(() => updates.check(), 4 * 60 * 60 * 1000);
    updateTimer.unref();
  });
  win.on("close", (event) => {
    if (closing || !readyToSave) return;
    event.preventDefault();
    win.webContents.send("save:closing");
  });
  ipcMain.on("save:closed", (event) => {
    trusted(event);
    if (pendingUpdate) {
      closing = updates.installAfterSave();
      pendingUpdate = false;
      return;
    }
    closing = true;
    win.close();
  });
  ipcMain.on("save:failed", (event, message) => {
    trusted(event);
    pendingUpdate = false;
    updates.cancelInstall(
      `Your journey could not be saved: ${String(message).slice(0, 500)}`,
    );
  });
  win.on("closed", () => clearInterval(updateTimer));
  await win.loadURL("dungeon://game/");
});
app.on("window-all-closed", () => app.quit());

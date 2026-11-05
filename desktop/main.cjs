const { app, BrowserWindow, protocol, net, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
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
  const savePath = path.join(app.getPath("userData"), "campaign.json");
  let saveQueue = Promise.resolve();
  ipcMain.handle("save:write", async (event, text) => {
    if (
      !event.senderFrame.url.startsWith("dungeon://game/") ||
      typeof text !== "string" ||
      text.length > 8_000_000
    )
      throw new Error("Invalid save");
    JSON.parse(text);
    const write = saveQueue.then(async () => {
      await fs.mkdir(path.dirname(savePath), { recursive: true });
      await fs.writeFile(savePath + ".tmp", text);
      await fs.rename(savePath + ".tmp", savePath);
      return true;
    });
    saveQueue = write.catch(() => {});
    return write;
  });
  ipcMain.handle("save:read", async () => {
    await saveQueue;
    try {
      return await fs.readFile(savePath, "utf8");
    } catch (e) {
      if (e.code === "ENOENT") return null;
      throw e;
    }
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
  await win.loadURL("dungeon://game/");
});
app.on("window-all-closed", () => app.quit());

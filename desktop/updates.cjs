// Only electron-updater's packaged GitHub feed supplies downloads. Renderer IPC
// accepts commands, never URLs, paths, versions or executable arguments.
function createUpdates({ updater, version, supported, publish = () => {} }) {
  let state = { phase: supported ? "idle" : "unsupported", current: version };
  const set = (patch) => {
    state = { ...state, ...patch };
    publish({ ...state });
  };
  const fail = (error) =>
    set({ phase: "error", error: error.message || String(error) });
  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = false;
  updater.allowPrerelease = false;
  updater.allowDowngrade = false;
  updater.on("error", fail);
  updater.on("update-available", (info) =>
    set({ phase: "available", next: info.version, error: null }),
  );
  updater.on("update-not-available", () =>
    set({ phase: "current", next: null }),
  );
  updater.on("download-progress", (info) =>
    set({
      phase: "downloading",
      percent: Math.max(0, Math.min(100, info.percent)),
    }),
  );
  updater.on("update-downloaded", (info) =>
    set({ phase: "downloaded", next: info.version, percent: 100, error: null }),
  );
  let busy = false;
  return {
    status: () => ({ ...state }),
    async check() {
      if (
        !supported ||
        busy ||
        ["downloaded", "saving", "installing"].includes(state.phase)
      )
        return;
      busy = true;
      set({ phase: "checking", error: null, percent: 0 });
      try {
        await updater.checkForUpdates();
        if (state.phase === "available") {
          set({ phase: "downloading" });
          await updater.downloadUpdate();
        }
      } catch (error) {
        fail(error);
      } finally {
        busy = false;
      }
    },
    prepareInstall() {
      if (state.phase !== "downloaded")
        throw new Error("Download an update before installing it.");
      set({ phase: "saving", error: null });
    },
    cancelInstall(message) {
      if (state.phase === "saving")
        set({ phase: "downloaded", error: message });
    },
    installAfterSave() {
      if (state.phase !== "saving")
        throw new Error("The game must save before installing an update.");
      set({ phase: "installing" });
      try {
        updater.quitAndInstall(false, true);
      } catch (error) {
        fail(error);
      }
      return state.phase === "installing";
    },
  };
}
module.exports = { createUpdates };

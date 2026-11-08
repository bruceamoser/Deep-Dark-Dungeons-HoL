const fs = require("node:fs/promises");
const path = require("node:path");
module.exports = async ({ electronPlatformName, appOutDir }) => {
  if (electronPlatformName === "win32") {
    // Directory builds bypass NSIS's updater metadata generation. The staged
    // portable app must already be complete before NSIS wraps it on Windows.
    const config = require("../package.json");
    await fs.writeFile(
      path.join(appOutDir, "resources/app-update.yml"),
      JSON.stringify(
        {
          ...config.build.publish,
          updaterCacheDirName: `${config.name}-updater`,
        },
        null,
        2,
      ),
    );
  }
  if (electronPlatformName !== "linux") return;
  const entry = path.join(appOutDir, "deep-dark-dungeons-hol");
  await fs.rename(entry, entry + ".bin");
  await fs.copyFile(path.join(__dirname, "../desktop/linux-entry.sh"), entry);
  await fs.chmod(entry, 0o755);
  // AppImage assembly copies appOutDir over its generated staging files.
  // Override AppRun so it never injects a sandbox-disabling fallback.
  await fs.copyFile(
    path.join(__dirname, "../desktop/AppRun"),
    path.join(appOutDir, "AppRun"),
  );
  await fs.chmod(path.join(appOutDir, "AppRun"), 0o755);
};

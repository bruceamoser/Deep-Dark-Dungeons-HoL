const fs = require("node:fs/promises");
const path = require("node:path");
function createSaveStorage(root) {
  let queue = Promise.resolve();
  const directory = path.join(root, "runs");
  function filename(key) {
    if (key === "legacy") return path.join(root, "campaign.json");
    if (key !== "index" && !/^run-[a-f0-9-]{36}$/.test(key))
      throw new Error("Invalid save key");
    return path.join(directory, key + ".json");
  }
  function operation(fn) {
    const result = queue.then(fn);
    queue = result.catch(() => {});
    return result;
  }
  return {
    get: (key) =>
      operation(async () => {
        try {
          return await fs.readFile(filename(key), "utf8");
        } catch (e) {
          if (e.code === "ENOENT") return null;
          throw e;
        }
      }),
    set: (key, text) =>
      operation(async () => {
        if (
          key === "legacy" ||
          typeof text !== "string" ||
          text.length > 16_100_000
        )
          throw new Error("Invalid save");
        JSON.parse(text);
        const dest = filename(key);
        await fs.mkdir(directory, { recursive: true });
        const handle = await fs.open(dest + ".tmp", "w", 0o600);
        try {
          await handle.writeFile(text);
          await handle.sync();
        } finally {
          await handle.close();
        }
        await fs.rename(dest + ".tmp", dest);
        return true;
      }),
    remove: (key) =>
      operation(async () => {
        if (key === "legacy" || key === "index")
          throw new Error("Cannot remove this save key");
        await fs.rm(filename(key), { force: true });
      }),
    keys: () =>
      operation(async () => {
        try {
          return (await fs.readdir(directory))
            .filter((f) => /^run-[a-f0-9-]{36}\.json$/.test(f))
            .map((f) => f.slice(0, -5));
        } catch (e) {
          if (e.code === "ENOENT") return [];
          throw e;
        }
      }),
  };
}
module.exports = { createSaveStorage };

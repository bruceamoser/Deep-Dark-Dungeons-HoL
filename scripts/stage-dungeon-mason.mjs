import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const source =
  process.argv[2] ??
  process.env.DDD_MASON_SOURCE ??
  path.join(
    os.homedir(),
    "Projects/DDD-Asset-Workshop/PurchasedSource/Assets/RPGTinyHeroWavePolyart",
  );
if (!fs.existsSync(path.join(source, "Mesh/AllBodiesCloaks.fbx")))
  throw new Error(
    "Supply the extracted, purchased RPGTinyHeroWavePolyart folder as the first argument or DDD_MASON_SOURCE.",
  );
const blender =
  process.env.BLENDER ?? path.join(os.homedir(), ".local/bin/blender");
const result = spawnSync(
  blender,
  [
    "--factory-startup",
    "-noaudio",
    "-b",
    "--python-exit-code",
    "1",
    "--python",
    path.join(root, "scripts/blender/export_dungeon_mason.py"),
  ],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      DDD_MASON_SOURCE: source,
      DDD_MASON_OUTPUT: path.join(root, "public/assets/licensed/dungeon-mason"),
    },
  },
);
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
await import("./verify-dungeon-mason.mjs");

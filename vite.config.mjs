import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolveApprovedCreatureAssets } from "./scripts/approved-creature-assets.mjs";
import { defineConfig } from "vite";
const approvedManifest = JSON.parse(
  readFileSync(
    new URL("./config/approved-creature-assets.json", import.meta.url),
    "utf8",
  ),
);
const { models: approved } = resolveApprovedCreatureAssets(
  fileURLToPath(new URL(".", import.meta.url)),
  approvedManifest,
  { required: process.env.FLD_REQUIRE_APPROVED_CREATURES === "1" },
);

export default defineConfig({
  define: {
    // Legacy macro names retained internally; these are now approved defaults.
    __WOLF_PILOT__: JSON.stringify(!!approved.WolfPilot),
    __AIR_ELEMENTAL_PILOT__: JSON.stringify(!!approved.AirElementalSculpted),
    __GOBLIN_SPEARHAND_MODEL__: JSON.stringify(
      approved.GoblinSpearhand ?? null,
    ),
  },
  base: "./",
  server: { host: "127.0.0.1" },
  build: { target: "es2022", chunkSizeWarningLimit: 1200 },
});

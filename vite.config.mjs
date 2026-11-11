import { existsSync } from "node:fs";
import { defineConfig } from "vite";
export default defineConfig({
  define: {
    __WOLF_PILOT__: JSON.stringify(
      process.env.FLD_WOLF_PILOT === "1" &&
        existsSync(
          new URL(
            "./public/assets/licensed/creatures/WolfPilot.glb",
            import.meta.url,
          ),
        ),
    ),
    __AIR_ELEMENTAL_PILOT__: JSON.stringify(
      process.env.FLD_AIR_PILOT === "1" &&
        existsSync(
          new URL(
            "./public/assets/licensed/creatures/AirElementalSculpted.glb",
            import.meta.url,
          ),
        ),
    ),
    __GOBLIN_SPEARHAND_MODEL__: JSON.stringify(
      existsSync(
        new URL(
          "./public/assets/licensed/creatures/GoblinSpearhand.glb",
          import.meta.url,
        ),
      )
        ? "/assets/licensed/creatures/GoblinSpearhand.glb"
        : null,
    ),
  },
  base: "./",
  server: { host: "127.0.0.1" },
  build: { target: "es2022", chunkSizeWarningLimit: 1200 },
});

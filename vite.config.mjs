import { existsSync } from "node:fs";
import { defineConfig } from "vite";
export default defineConfig({
  define: {
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

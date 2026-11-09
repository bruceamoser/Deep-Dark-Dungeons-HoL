import { enterGame } from "./ui-session.mjs";
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
await fs.mkdir("test-results", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto("http://127.0.0.1:5198");
await page.waitForFunction(() => window.__ddd, { timeout: 45000 });
await enterGame(page);
await page.waitForTimeout(1800);
await page.screenshot({ path: "test-results/town.png" });
await page.getByRole("button", { name: "The Depths" }).click();
await page.waitForFunction(
  () => window.__ddd.game.mode === "exploration",
  null,
  { timeout: 15000 },
);
await page.waitForTimeout(1000);
await page.screenshot({ path: "test-results/dungeon.png" });
console.log(
  JSON.stringify({
    errors,
    mode: await page.evaluate(() => window.__ddd.game.mode),
  }),
);
await browser.close();
if (errors.length) process.exitCode = 1;

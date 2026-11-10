import { verifyCreatureAI } from "./creature-ai-check.mjs";
import { enterGame, settingsAction } from "./ui-session.mjs";
// Smoke-test the actual AppImage or installed Windows executable, with real IPC,
// an isolated save directory, and Chromium's renderer sandbox enabled.
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { chromium, expect } from "@playwright/test";
import { verifyMusic } from "./music-check.mjs";
import { verifyDungeonCamp } from "./camp-check.mjs";
import { verifyTownNavigation } from "./town-check.mjs";
import { verifyTorchModels } from "./torch-model-check.mjs";
import { verifyWeaponVisuals } from "./weapon-visual-check.mjs";
import { verifyCombinedSupplies } from "./combined-supplies-check.mjs";
const executable = path.resolve(process.argv[2]);
const { version } = JSON.parse(
  await fs.readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const userData = await fs.mkdtemp(path.join(os.tmpdir(), "ddd-release-"));
const linux = process.platform === "linux";
if (process.platform === "win32") {
  const config = await fs.readFile(
    path.join(path.dirname(executable), "resources/app-update.yml"),
    "utf8",
  );
  expect(config).toMatch(/["']?provider["']?\s*:\s*["']?github/);
  expect(config).toContain("Four-Lanterns-Deep");
}
const command = linux ? "/usr/bin/aa-exec" : executable;
const args = [
  ...(linux ? ["-p", "unconfined", "--", executable] : []),
  "--remote-debugging-port=0",
  "--mute-audio",
  "--inspect=0",
  ...(process.env.CI
    ? [
        "--ozone-platform=x11",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ]
    : []),
];
const child = spawn(command, args, {
  env: { ...process.env, DDD_TEST_USER_DATA: userData },
  stdio: ["ignore", "ignore", "pipe"],
});
let browser,
  log = "";
try {
  child.stderr.on("data", (chunk) => {
    log += chunk;
  });
  await expect
    .poll(() => log.match(/DevTools listening on (ws:\/\/\S+)/)?.[1], {
      timeout: 60000,
    })
    .toBeTruthy();
  browser = await chromium.connectOverCDP(
    log.match(/DevTools listening on (ws:\/\/\S+)/)[1],
  );
  const page = browser.contexts()[0].pages()[0];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.waitForFunction(
    () =>
      window.__ddd ||
      document.querySelector(".loading-screen h1")?.textContent ===
        "The gate could not open",
    null,
    { timeout: 90000 },
  );
  expect(
    await page.evaluate(() => !!window.__ddd),
    await page.locator("body").innerText(),
  ).toBe(true);
  await enterGame(page);
  if (process.env.DDD_REQUIRE_MASON === "1") {
    expect(
      await page.evaluate(() => window.__ddd.scene.assets.has("DungeonMason")),
      "Published installers must contain the licensed character art",
    ).toBe(true);
    await page.locator('[data-hero="0"]').click();
    await page.locator('[data-tab="appearance"]').click();
    await expect(page.getByLabel("Headpiece", { exact: true })).toBeVisible();
    await page.screenshot({
      path: `test-results/release-character-${process.platform}.png`,
    });
    await page.keyboard.press("Escape");
    await verifyTorchModels(page);
    await verifyWeaponVisuals(page);
    await verifyCombinedSupplies(page);
    await verifyTownNavigation(page);
    await verifyDungeonCamp(page);
    await expect(page).toHaveTitle("Four Lanterns Deep");
    await verifyMusic(page);
  }
  await verifyCreatureAI(page);
  await settingsAction(page, "Save");
  const saved = await page.evaluate(() => window.desktop.load());
  expect(JSON.parse(saved).campaign.party.length).toBe(4);
  await page.locator('[data-action="training"]').click();
  await page.locator("#open-build-forge").click();
  await expect(
    page.getByRole("dialog", { name: "Discipline forge" }),
  ).toBeVisible();
  await expect(page.locator(".forge-svg")).toBeVisible();
  await expect(page.locator(".forge-node")).toHaveCount(377);
  await page.locator('[data-discipline="arms"]').click();
  await page.screenshot({
    path: `test-results/release-forge-${process.platform}.png`,
  });
  await page.locator('[data-view="columns"]').click();
  await expect(page.locator(".forge-path-column")).toHaveCount(4);
  await page.locator('[data-view="columns"]').click();
  await expect(page.locator(".forge-svg")).toBeVisible();
  await page.locator(".forge-close").click();
  await page.keyboard.press("Escape");
  await settingsAction(page, "Updates");
  await expect(page.locator("#update-panel")).toContainText(
    `Version ${version}`,
  );
  expect(
    (await page.evaluate(() => window.desktop.updates.status())).phase,
  ).not.toBe("unsupported");
  if (linux) {
    const cdp = await browser.newBrowserCDPSession();
    const { processInfo } = await cdp.send("SystemInfo.getProcessInfo");
    for (const proc of processInfo.filter((p) => p.type === "renderer")) {
      const status = await fs.readFile(`/proc/${proc.id}/status`, "utf8");
      expect(Number(/Seccomp:\s+(\d+)/.exec(status)[1])).toBe(2);
      expect(
        await fs.readFile(`/proc/${proc.id}/cmdline`, "utf8"),
      ).not.toContain("--no-sandbox");
    }
  }
  await fs.mkdir("test-results", { recursive: true });
  await page.screenshot({
    path: `test-results/release-${process.platform}.png`,
  });
  expect(errors).toEqual([]);
  console.log(
    "Release executable opened, rendered, saved to disk, and exposed supported update controls.",
  );
} catch (error) {
  console.error(log);
  throw error;
} finally {
  await browser?.close().catch(() => {});
  child.kill();
}

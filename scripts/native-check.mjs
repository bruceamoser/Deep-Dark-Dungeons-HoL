import { verifyWeaponRoll } from "./weapon-roll-check.mjs";
import { verifyAppearanceUX } from "./appearance-ux-check.mjs";
import { verifyCombinedSupplies } from "./combined-supplies-check.mjs";
import { verifyWeaponVisuals } from "./weapon-visual-check.mjs";
import { verifyRespec } from "./respec-check.mjs";
import { verifyForgeUI } from "./forge-ui-check.mjs";
import { verifyBuildForge } from "./build-forge-check.mjs";
import { verifyGameplayIdentity } from "./identity-preview-check.mjs";
import { verifyTorchModels } from "./torch-model-check.mjs";
import { verifyExpeditionUI } from "./expedition-check.mjs";
import { verifySaveSlots } from "./save-slots-check.mjs";
import { verifyCreatureVisuals } from "./creature-visual-check.mjs";
import { verifyDungeonLoop } from "./dungeon-loop-check.mjs";
import { verifyCombatUX } from "./combat-ux-check.mjs";
import { verifyRoster } from "./roster-check.mjs";
import { verifyInteractions } from "./interaction-check.mjs";
import { verifyEffects } from "./effects-check.mjs";
import { verifyRecovery } from "./recovery-check.mjs";
import { verifyCharacter } from "./character-check.mjs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium, expect } from "@playwright/test";
import { verifyControls } from "./control-check.mjs";

// Exercise the user's launcher. Playwright's Electron launcher can supply
// --no-sandbox and therefore cannot prove an ordinary Linux launch works.
if (process.platform !== "linux")
  throw new Error("This launcher regression check requires Linux.");
const root = path.resolve(import.meta.dirname, "..");
const userData = await fs.mkdtemp(path.join(os.tmpdir(), "ddd-native-check-"));
// The desktop host has a userns-allowing AppArmor profile. A normal terminal
// is unconfined and is subject to Ubuntu's userns restriction. Match the latter.
const child = spawn(
  "/usr/bin/aa-exec",
  [
    "-p",
    "unconfined",
    "--",
    path.join(root, "launch-game.sh"),
    "--remote-debugging-port=0",
    "--inspect=0",
  ],
  {
    cwd: root,
    detached: true,
    stdio: ["ignore", "ignore", "pipe"],
    env: {
      ...process.env,
      CHROME_DEVEL_SANDBOX: process.env.CHROME_DEVEL_SANDBOX ?? "",
      DDD_TEST_USER_DATA: userData,
    },
  },
);
let browser, mainEndpoint;
try {
  const endpoint = await new Promise((resolve, reject) => {
    let log = "";
    const timer = setTimeout(
      () => reject(new Error("Native launcher did not open DevTools: " + log)),
      30000,
    );
    child.once("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Native launcher exited ${code}: ${log}`));
    });
    child.stderr.on("data", (chunk) => {
      log += chunk.toString();
      mainEndpoint =
        log.match(/Debugger listening on (ws:\/\/\S+)/)?.[1] ?? mainEndpoint;
      const match = log.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
  });
  browser = await chromium.connectOverCDP(endpoint);
  const context = browser.contexts()[0];
  const w = context.pages()[0] ?? (await context.waitForEvent("page"));
  const errors = [];
  w.on("pageerror", (e) => errors.push(e.message));
  await w.waitForFunction(() => window.__ddd, { timeout: 45000 });
  await w.screenshot({ path: "test-results/native-town.png" });
  const selectedChecks = process.env.DDD_NATIVE_CHECKS?.split(",");
  const runCheck = async (fn) => {
    if (!selectedChecks || selectedChecks.includes(fn.name)) await fn(w);
  };
  await runCheck(verifyRespec);
  await runCheck(verifyForgeUI);
  await runCheck(verifyBuildForge);
  await runCheck(verifyWeaponRoll);
  await runCheck(verifyAppearanceUX);
  await runCheck(verifyGameplayIdentity);
  await runCheck(verifyExpeditionUI);
  await runCheck(verifyTorchModels);
  await runCheck(verifyWeaponVisuals);
  await runCheck(verifyCombinedSupplies);
  await runCheck(verifyCharacter);
  await runCheck(verifyRoster);
  await w.getByRole("button", { name: "Enter the depths" }).click();
  await w.waitForFunction(
    () => window.__ddd.game.mode === "exploration",
    null,
    { timeout: 15000 },
  );
  await w.getByRole("button", { name: "Save", exact: true }).click();
  await expect(w.locator("#toast")).toContainText("saved");
  const stored = await w.evaluate(() => window.desktop.load());
  expect(JSON.parse(stored).campaign.party).toHaveLength(4);
  await w.screenshot({ path: "test-results/native-dungeon.png" });
  await runCheck(verifyControls);
  await runCheck(verifyCombatUX);
  await runCheck(verifyInteractions);
  await runCheck(verifyEffects);
  await runCheck(verifyRecovery);
  await runCheck(verifyDungeonLoop);
  await runCheck(verifyCreatureVisuals);
  await runCheck(verifySaveSlots);
  expect(errors).toEqual([]);
  const cdp = await browser.newBrowserCDPSession();
  const { processInfo } = await cdp.send("SystemInfo.getProcessInfo");
  const renderers = processInfo.filter((p) => p.type === "renderer");
  expect(renderers.length).toBeGreaterThan(0);
  const mainArgs = (
    await fs.readFile(`/proc/${child.pid}/cmdline`, "utf8")
  ).split("\0");
  expect(mainArgs.join(" ")).not.toMatch(/(?:^|\s)--no-sandbox(?:\s|$)/);
  expect(await fs.readlink(`/proc/${child.pid}/exe`)).not.toMatch(/\s/);
  expect(
    (await fs.readFile(`/proc/${child.pid}/attr/current`, "utf8")).trim(),
  ).toBe("unconfined");
  for (const renderer of renderers) {
    const status = await fs.readFile(`/proc/${renderer.id}/status`, "utf8");
    expect(Number(/Seccomp:\s+(\d+)/.exec(status)?.[1])).toBe(2);
  }
  const activeSlot = await w.evaluate(() => window.__ddd.library.active);
  await w.evaluate(() => {
    window.__ddd.game.campaign.bank = 9876;
  });
  const closed = new Promise((resolve) => child.once("exit", resolve));
  // BrowserWindow.close follows the native titlebar close path. Chromium's
  // renderer window.close() destroys this Electron window without that event.
  const inspector = new WebSocket(mainEndpoint);
  await new Promise((resolve, reject) => {
    inspector.addEventListener("open", resolve, { once: true });
    inspector.addEventListener("error", reject, { once: true });
  });
  const requested = new Promise((resolve, reject) =>
    inspector.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id === 1)
        message.result?.exceptionDetails
          ? reject(new Error(JSON.stringify(message.result.exceptionDetails)))
          : resolve();
    }),
  );
  inspector.send(
    JSON.stringify({
      id: 1,
      method: "Runtime.evaluate",
      params: {
        expression:
          "process.mainModule.require('electron').BrowserWindow.getAllWindows()[0].close()",
      },
    }),
  );
  await requested;
  inspector.close();
  await Promise.race([
    closed,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Window close did not finish saving")),
        15000,
      ),
    ),
  ]);
  const savedOnClose = JSON.parse(
    await fs.readFile(
      path.join(userData, "runs", activeSlot + ".json"),
      "utf8",
    ),
  );
  expect(JSON.parse(savedOnClose.text).campaign.bank).toBe(9876);
  console.log(
    "Native window-close handshake saved the latest state before exit.",
  );
  console.log(
    "Exact Linux launcher in the normal terminal AppArmor context, rendered scene and disk save passed; runtime path has no spaces, renderers have seccomp filtering and no --no-sandbox flag.",
  );
} catch (error) {
  const page = browser?.contexts()[0]?.pages()[0];
  if (page) {
    await page.screenshot({ path: "test-results/native-failure.png" });
    console.error(
      await page.evaluate(() => ({
        selected: window.__ddd?.game.selected,
        action: window.__ddd?.selectedAction,
        toast: document.querySelector("#toast")?.textContent,
        log: window.__ddd?.game.log.slice(-5),
      })),
    );
  }
  throw error;
} finally {
  await browser?.close().catch(() => {});
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch (e) {
    if (e.code !== "ESRCH") throw e;
  }
}

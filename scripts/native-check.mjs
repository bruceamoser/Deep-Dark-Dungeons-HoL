import { verifyCombatUX } from "./combat-ux-check.mjs";
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
let browser;
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
  await verifyCharacter(w);
  await w.getByRole("button", { name: "Enter the depths" }).click();
  await w.getByRole("button", { name: "Save", exact: true }).click();
  await expect(w.locator("#toast")).toContainText("saved");
  const stored = await w.evaluate(() => window.desktop.load());
  expect(JSON.parse(stored).campaign.party).toHaveLength(4);
  await w.screenshot({ path: "test-results/native-dungeon.png" });
  await verifyControls(w);
  await verifyCombatUX(w);
  await verifyInteractions(w);
  await verifyEffects(w);
  await verifyRecovery(w);
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
  await browser?.close();
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch (e) {
    if (e.code !== "ESRCH") throw e;
  }
}

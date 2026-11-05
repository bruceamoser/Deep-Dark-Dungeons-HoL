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
const child = spawn(
  path.join(root, "launch-game.sh"),
  ["--remote-debugging-port=0"],
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
  await w.getByRole("button", { name: "Enter the depths" }).click();
  await w.getByRole("button", { name: "Save", exact: true }).click();
  await expect(w.locator("#toast")).toContainText("saved");
  const stored = await w.evaluate(() => window.desktop.load());
  expect(JSON.parse(stored).campaign.party).toHaveLength(4);
  await w.screenshot({ path: "test-results/native-dungeon.png" });
  await verifyControls(w);
  expect(errors).toEqual([]);
  const cdp = await browser.newBrowserCDPSession();
  const { processInfo } = await cdp.send("SystemInfo.getProcessInfo");
  const renderers = processInfo.filter((p) => p.type === "renderer");
  expect(renderers.length).toBeGreaterThan(0);
  const mainArgs = (
    await fs.readFile(`/proc/${child.pid}/cmdline`, "utf8")
  ).split("\0");
  expect(mainArgs).not.toContain("--no-sandbox");
  for (const renderer of renderers) {
    const status = await fs.readFile(`/proc/${renderer.id}/status`, "utf8");
    expect(Number(/Seccomp:\s+(\d+)/.exec(status)?.[1])).toBe(2);
  }
  console.log(
    "Exact Linux launcher, rendered scene and disk save passed; renderers have seccomp filtering and no --no-sandbox flag.",
  );
} finally {
  await browser?.close();
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch (e) {
    if (e.code !== "ESRCH") throw e;
  }
}

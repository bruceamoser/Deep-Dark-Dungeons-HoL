// Exercise an unmodified published app's original GitHub feed after repo rename.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium, expect } from "@playwright/test";
const executable = path.resolve(process.argv[2]),
  expected = process.argv[3] ?? "0.8.2";
const profile = await fs.mkdtemp(path.join(os.tmpdir(), "fld-legacy-feed-"));
const child = spawn(
  "/usr/bin/aa-exec",
  ["-p", "unconfined", "--", executable, "--remote-debugging-port=0"],
  {
    detached: true,
    stdio: ["ignore", "ignore", "pipe"],
    env: {
      ...process.env,
      DDD_TEST_USER_DATA: profile,
      XDG_CACHE_HOME: path.join(profile, "cache"),
    },
  },
);
let log = "",
  browser;
child.stderr.on("data", (c) => (log += c));
try {
  await expect
    .poll(() => log.match(/DevTools listening on (ws:\/\/\S+)/)?.[1], {
      timeout: 60000,
    })
    .toBeTruthy();
  browser = await chromium.connectOverCDP(
    log.match(/DevTools listening on (ws:\/\/\S+)/)[1],
  );
  const page = browser.contexts()[0].pages()[0];
  await page.waitForFunction(() => window.__ddd, null, { timeout: 60000 });
  await page.evaluate(() => window.desktop.updates.check());
  const status = await page.evaluate(() => window.desktop.updates.status());
  expect(["current", "downloaded"]).toContain(status.phase);
  expect(status.next ?? status.current).toBe(expected);
  expect(status.error ?? null).toBeNull();
  console.log(
    `Unmodified published ${status.current} follows its original GitHub feed: ${status.phase}${status.next ? " " + status.next : ""}.`,
  );
} finally {
  await browser?.close().catch(() => {});
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch (e) {
    if (e.code !== "ESRCH") throw e;
  }
}

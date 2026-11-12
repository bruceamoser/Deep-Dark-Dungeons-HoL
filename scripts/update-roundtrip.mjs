import { settingsAction, waitForGame } from "./ui-session.mjs";
// Real Linux update, checksum rejection, save-failure protection and restart.
// Usage: node scripts/update-roundtrip.mjs old.AppImage new.AppImage
// Both must contain the updater. The first image must have an older version.
// A local HTTP feed substitutes for GitHub only through the Node inspector;
// production builds expose no feed-override IPC or environment variable.
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { chromium, expect } from "@playwright/test";
const [oldImage, newImage] = process.argv.slice(2).map((p) => path.resolve(p));
const { version } = JSON.parse(
  await fs.readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const testRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ddd-upgrade-"));
const installed = path.join(testRoot, "Deep-Dark-Dungeons-HoL.AppImage");
const userData = path.join(testRoot, "saves");
const restartLog = path.join(testRoot, "restart.log");
await fs.mkdir(userData);
await fs.copyFile(oldImage, installed);
await fs.chmod(installed, 0o755);
const image = await fs.readFile(newImage);
const sha512 = createHash("sha512").update(image).digest("base64");
let badChecksum = true;
const server = createServer((req, res) => {
  if (req.url.startsWith("/latest-linux.yml")) {
    res.end(
      JSON.stringify({
        version,
        files: [
          {
            url: "update.AppImage",
            size: image.length,
            sha512: badChecksum ? Buffer.alloc(64).toString("base64") : sha512,
          },
        ],
        path: "update.AppImage",
        sha512,
      }),
    );
  } else if (req.url.startsWith("/update.AppImage")) {
    res.setHeader("Content-Length", image.length);
    createReadStream(newImage).pipe(res);
  } else {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const child = spawn(
  "/usr/bin/aa-exec",
  [
    "-p",
    "unconfined",
    "--",
    installed,
    "--remote-debugging-port=0",
    "--mute-audio",
    "--inspect=0",
  ],
  {
    detached: true,
    env: {
      ...process.env,
      DDD_TEST_USER_DATA: userData,
      XDG_CACHE_HOME: path.join(testRoot, "cache"),
      XDG_DATA_HOME: path.join(testRoot, "data"),
    },
    stdio: ["ignore", "ignore", "pipe"],
  },
);
let log = "",
  browser,
  restarted,
  inspector;
child.stderr.on("data", (chunk) => {
  log += chunk;
});
let nextId = 0;
async function evaluate(expression) {
  const id = ++nextId;
  const result = new Promise((resolve, reject) => {
    const listener = (event) => {
      const response = JSON.parse(event.data);
      if (response.id !== id) return;
      inspector.removeEventListener("message", listener);
      if (response.result?.exceptionDetails)
        reject(new Error(JSON.stringify(response.result.exceptionDetails)));
      else resolve(response.result?.result?.value);
    };
    inspector.addEventListener("message", listener);
  });
  inspector.send(
    JSON.stringify({
      id,
      method: "Runtime.evaluate",
      params: { expression, returnByValue: true },
    }),
  );
  return result;
}
try {
  await expect
    .poll(() => log.match(/DevTools listening on (ws:\/\/\S+)/)?.[1], {
      timeout: 60000,
    })
    .toBeTruthy();
  inspector = new WebSocket(log.match(/Debugger listening on (ws:\/\/\S+)/)[1]);
  await new Promise((resolve) =>
    inspector.addEventListener("open", resolve, { once: true }),
  );
  await evaluate(`(() => {
    const { AppImageUpdater } = process.mainModule.require('electron-updater');
    const check = AppImageUpdater.prototype.checkForUpdates;
    // Since 0.3.1 the app creates an explicit AppImageUpdater to avoid a Debian
    // package marker selecting the wrong updater. Patch the prototype only in
    // this inspector session so the real instance receives the diagnostic feed.
    AppImageUpdater.prototype.checkForUpdates = function (...args) {
    this.setFeedURL({provider:'generic',url:'http://127.0.0.1:${server.address().port}'});
    this.disableDifferentialDownload = true;
    // Observe the real restarted release; only diagnostic flags/stdio differ.
    this.spawnLog = async (file, args, env) => {
      const fs = process.mainModule.require('node:fs');
      const fd = fs.openSync(${JSON.stringify(restartLog)}, 'a');
      const child = process.mainModule.require('node:child_process').spawn(file,
        ['--remote-debugging-port=0'], {env, detached:true, stdio:['ignore','ignore',fd]});
      fs.closeSync(fd); child.unref(); return true;
    };
    return check.apply(this, args);
    };
  })()`);
  browser = await chromium.connectOverCDP(
    log.match(/DevTools listening on (ws:\/\/\S+)/)[1],
  );
  const page = browser.contexts()[0].pages()[0];
  await waitForGame(page);
  await settingsAction(page, "Updates");
  await page.evaluate(() => window.desktop.updates.check());
  await expect
    .poll(() => page.evaluate(() => window.desktop.updates.status()), {
      timeout: 60000,
    })
    .toMatchObject({ phase: "error" });
  await expect(page.locator("#update-panel")).toContainText(/checksum/i);
  console.log("Corrupt update rejected; retry remains available.");
  badChecksum = false;
  await page.getByRole("button", { name: "Check for updates" }).click();
  await expect(
    page.getByRole("button", { name: "Save & restart to install" }),
  ).toBeVisible({ timeout: 60000 });
  await page.evaluate(() => {
    const library = window.__ddd.library;
    window.testWrite = library.write;
    library.write = async () => {
      throw new Error("Simulated disk full");
    };
  });
  await page.getByRole("button", { name: "Save & restart to install" }).click();
  await expect(page.locator("#update-panel")).toContainText(
    "Simulated disk full",
  );
  expect(
    createHash("sha512")
      .update(await fs.readFile(installed))
      .digest("base64"),
  ).not.toBe(sha512);
  console.log("Failed save blocked installation without closing the game.");
  await page.evaluate(() => {
    window.__ddd.library.write = window.testWrite;
    window.__ddd.game.campaign.bank = 24680;
  });
  const priorSlot = await page.evaluate(() => window.__ddd.library.active);
  await page.screenshot({ path: "test-results/update-ready.png" });
  inspector.close();
  await page.getByRole("button", { name: "Save & restart to install" }).click();
  await expect
    .poll(
      async () =>
        (await fs.readFile(restartLog, "utf8").catch(() => "")).match(
          /DevTools listening on (ws:\/\/\S+)/,
        )?.[1],
      { timeout: 60000 },
    )
    .toBeTruthy();
  const endpoint = (await fs.readFile(restartLog, "utf8")).match(
    /DevTools listening on (ws:\/\/\S+)/,
  )[1];
  restarted = await chromium.connectOverCDP(endpoint);
  const newPage = restarted.contexts()[0].pages()[0];
  await waitForGame(newPage);
  expect(
    (await newPage.evaluate(() => window.desktop.updates.status())).current,
  ).toBe(version);
  const oldRecord = JSON.parse(
    await fs.readFile(path.join(userData, "runs", priorSlot + ".json"), "utf8"),
  );
  const oldSave = JSON.parse(oldRecord.text);
  expect(oldSave.campaign.bank).toBe(24680);
  if (oldSave.version === 1) {
    const slots = await newPage.evaluate(() => window.__ddd.library.list());
    expect(slots.find((s) => s.id === priorSlot)).toMatchObject({
      incompatible: true,
      invalid: true,
    });
    await expect(
      newPage.getByRole("dialog", { name: "Saved runs" }),
    ).toBeVisible();
    await newPage.locator("#run-name").fill("The Forge Company");
    await newPage.locator("#new-run").click();
    expect(
      await newPage.evaluate(
        () => window.__ddd.game.active.draft.forge.version,
      ),
    ).toBe(1);
    expect(
      await fs.readFile(
        path.join(userData, "runs", priorSlot + ".json"),
        "utf8",
      ),
    ).toBe(JSON.stringify(oldRecord));
  } else
    expect(await newPage.evaluate(() => window.__ddd.game.campaign.bank)).toBe(
      24680,
    );
  expect(
    createHash("sha512")
      .update(await fs.readFile(installed))
      .digest("base64"),
  ).toBe(sha512);
  await newPage.screenshot({ path: "test-results/update-restarted.png" });
  console.log(
    `Real AppImage download, verified replacement, restart into ${version}, ${oldSave.version === 1 ? "with earlier save preservation and fresh-rule journey creation" : "with the compatible journey and vault balance preserved"} passed.`,
  );
} catch (error) {
  console.error(log, await fs.readFile(restartLog, "utf8").catch(() => ""));
  throw error;
} finally {
  inspector?.close();
  await restarted
    ?.contexts()[0]
    ?.pages()[0]
    ?.evaluate(() => window.desktop.close())
    .catch(() => {});
  await restarted?.close().catch(() => {});
  await browser?.close().catch(() => {});
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {}
  server.closeAllConnections();
  server.close();
}

import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createRequire } from "node:module";
const { createUpdates } = createRequire(import.meta.url)(
  "../desktop/updates.cjs",
);
function fixture(supported = true) {
  const updater = new EventEmitter();
  const calls = [];
  updater.checkForUpdates = async () => {
    calls.push("check");
    updater.emit("update-available", { version: "0.3.0" });
  };
  updater.downloadUpdate = async () => {
    calls.push("download");
    updater.emit("download-progress", { percent: 51 });
    updater.emit("update-downloaded", { version: "0.3.0" });
  };
  updater.quitAndInstall = (...args) => calls.push(["install", ...args]);
  const updates = createUpdates({ updater, version: "0.2.0", supported });
  return { updater, updates, calls };
}
test("updates download automatically but install only after a successful save", async () => {
  const { updater, updates, calls } = fixture();
  assert.equal(updater.autoInstallOnAppQuit, false);
  assert.equal(updater.allowDowngrade, false);
  assert.equal(updater.allowPrerelease, false);
  assert.throws(() => updates.prepareInstall());
  await updates.check();
  assert.deepEqual(calls, ["check", "download"]);
  assert.equal(updates.status().phase, "downloaded");
  assert.throws(() => updates.installAfterSave());
  updates.prepareInstall();
  updates.cancelInstall("Disk full");
  assert.equal(updates.status().phase, "downloaded");
  assert.equal(updates.status().error, "Disk full");
  assert.throws(() => updates.installAfterSave());
  updates.prepareInstall();
  assert.equal(updates.installAfterSave(), true);
  assert.deepEqual(calls[2], ["install", false, true]);
});
test("concurrent checks and downloaded updates do not duplicate work", async () => {
  const { updates, calls } = fixture();
  await Promise.all([updates.check(), updates.check(), updates.check()]);
  await updates.check();
  assert.deepEqual(calls, ["check", "download"]);
});
test("offline and failed downloads remain retryable, installer errors do not quit", async () => {
  const { updates, updater, calls } = fixture();
  const download = updater.downloadUpdate;
  updater.downloadUpdate = async () => {
    throw new Error("Offline");
  };
  await updates.check();
  assert.equal(updates.status().phase, "error");
  updater.downloadUpdate = download;
  await updates.check();
  updater.quitAndInstall = () =>
    updater.emit("error", new Error("Read-only installation"));
  updates.prepareInstall();
  assert.equal(updates.installAfterSave(), false);
  assert.equal(updates.status().error, "Read-only installation");
  assert.deepEqual(calls, ["check", "check", "download"]);
});
test("local builds never invoke the release updater", async () => {
  const { updates, calls } = fixture(false);
  await updates.check();
  assert.equal(updates.status().phase, "unsupported");
  assert.deepEqual(calls, []);
});
test("a current release never downloads or offers to install", async () => {
  const { updater, updates, calls } = fixture();
  updater.checkForUpdates = async () => updater.emit("update-not-available");
  await updates.check();
  assert.equal(updates.status().phase, "current");
  assert.throws(() => updates.prepareInstall());
  assert.deepEqual(calls, []);
});

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { _electron as electron, expect } from "@playwright/test";
const executable = process.argv[2];
const userData = await fs.mkdtemp(path.join(os.tmpdir(), "ddd-native-check-"));
const app = await electron.launch({
  ...(executable
    ? { executablePath: executable, args: [] }
    : { args: ["desktop/main.cjs"] }),
  env: {
    ...process.env,
    DDD_TEST_USER_DATA: userData,
    ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
  },
});
try {
  const w = await app.firstWindow(),
    errors = [];
  w.on("pageerror", (e) => errors.push(e.message));
  await w.waitForFunction(() => window.__ddd, { timeout: 45000 });
  await w.waitForTimeout(1000);
  await w.screenshot({ path: "test-results/native-town.png" });
  await w.getByRole("button", { name: "Enter the depths" }).click();
  await w.waitForTimeout(500);
  await w.getByRole("button", { name: "Save", exact: true }).click();
  await expect(w.locator("#toast")).toContainText("saved");
  const stored = await w.evaluate(() => window.desktop.load());
  expect(JSON.parse(stored).campaign.party).toHaveLength(4);
  await w.screenshot({ path: "test-results/native-dungeon.png" });
  expect(errors).toEqual([]);
  console.log("Native desktop launch, scene rendering and disk save passed.");
} finally {
  await app.close();
}

import { settingsAction, waitForGame } from "./ui-session.mjs";
import { chromium, expect } from "@playwright/test";
import { verifyForgeUI } from "./forge-ui-check.mjs";
import { verifyCharacter } from "./character-check.mjs";
import { verifyCombatUX } from "./combat-ux-check.mjs";
const browser = await chromium.launch({
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({
      viewport: { width: 1600, height: 1000 },
    }),
    errors = [];
  page.setDefaultTimeout(30000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.DDD_TEST_URL ?? "http://127.0.0.1:5198");
  await waitForGame(page);
  await verifyForgeUI(page);
  await verifyCharacter(page);
  await page.getByRole("button", { name: "The Depths" }).click();
  await page.waitForFunction(
    () => window.__ddd.game.mode === "exploration",
    null,
    { timeout: 15000 },
  );
  await verifyCombatUX(page);
  await settingsAction(page, "Save");
  expect(
    JSON.parse(
      await page.evaluate(() =>
        window.__ddd.library.read(window.__ddd.library.active),
      ),
    ).version,
  ).toBe(2);
  expect(errors).toEqual([]);
  console.log(
    "Browser forge, creator, inventory, combat and save checks passed.",
  );
} finally {
  await browser.close();
}

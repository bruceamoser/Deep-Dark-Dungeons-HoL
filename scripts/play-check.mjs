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
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.DDD_TEST_URL ?? "http://127.0.0.1:5198");
  await page.waitForFunction(() => window.__ddd);
  await verifyForgeUI(page);
  await verifyCharacter(page);
  await page.getByRole("button", { name: "Enter the depths" }).click();
  await verifyCombatUX(page);
  await page.getByRole("button", { name: "Save", exact: true }).click();
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

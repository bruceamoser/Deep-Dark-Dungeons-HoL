import { enterGame } from "./ui-session.mjs";
import { chromium, expect } from "@playwright/test";
const b = await chromium.launch({
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
try {
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 } }),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  await p.route("**/assets/animations/**", async (route) => {
    await gate;
    await route.continue();
  });
  await p.goto(process.env.DDD_TEST_URL ?? "http://127.0.0.1:5198", { waitUntil: "domcontentloaded" });
  await expect(p.locator(".loading-seal")).toBeVisible();
  await expect(p).toHaveTitle("Four Lanterns Deep");
  await expect(p.locator(".loading-seal")).toHaveAttribute(
    "src",
    "/art/four-lanterns-logo-v2.png",
  );
  await p.evaluate(() => document.fonts.ready);
  await p.waitForFunction(
    () => document.querySelector(".loading-seal").naturalWidth > 0,
  );
  await expect(p.locator(".logo-flame-glow")).toHaveCount(4);
  const opacity = () =>
    p
      .locator(".logo-flame-glow")
      .evaluateAll((es) => es.map((e) => getComputedStyle(e).opacity));
  const before = await opacity();
  await p.waitForTimeout(450);
  expect(await opacity()).not.toEqual(before);
  await p.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await p
      .locator(".logo-flame-glow")
      .first()
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe("none");
  expect(
    await p
      .locator(".logo-ember")
      .first()
      .evaluate((e) => getComputedStyle(e).display),
  ).toBe("none");
  await p.emulateMedia({ reducedMotion: "no-preference" });

  await p.screenshot({ path: "test-results/four-lanterns-loading.png" });
  release();
  await p.waitForFunction(() => window.__ddd?.town.active, null, {
    timeout: 45000,
  });
  await enterGame(p);
  for (const [width, height] of [
    [1600, 1000],
    [1100, 720],
  ]) {
    await p.setViewportSize({ width, height });
    await p.waitForTimeout(700);
    const layout = await p.evaluate(() => {
      const rect = (q) => {
        const { left, right, top, bottom } = document
          .querySelector(q)
          .getBoundingClientRect();
        return { left, right, top, bottom };
      };
      return {
        brand: rect(".brand"),
        location: rect(".location"),
        tools: rect(".top-tools"),
        gate: rect(".town-directory [data-action=descend]"),
        directory: rect(".town-directory"),
        images: [
          ...document.querySelectorAll(".topbar img,.town-masthead img"),
        ].every((i) => i.complete && i.naturalWidth > 0),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    expect(layout.images).toBe(true);
    expect(layout.gate.bottom).toBeLessThanOrEqual(layout.directory.bottom);
    expect(layout.overflow).toBe(false);
    expect(layout.brand.right).toBeLessThanOrEqual(layout.location.left);
    expect(layout.location.right).toBeLessThanOrEqual(layout.tools.left);
    expect(layout.tools.right).toBeLessThanOrEqual(width);
    await p.screenshot({ path: `test-results/greyhaven-brand-${width}.png` });
  }
  expect(errors).toEqual([]);
  console.log(
    "Generated title logo, four animated flame glows, reduced-motion fallback and nonoverlapping 1600/1100 branding layouts passed.",
  );
} finally {
  await b.close();
}

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
  await p.goto("http://127.0.0.1:5198", { waitUntil: "domcontentloaded" });
  await expect(p.locator(".loading-seal")).toBeVisible();
  await expect(p).toHaveTitle("Four Lanterns Deep");
  await expect(p.locator(".loading-seal")).toHaveAttribute("src", "/art/four-lanterns-seal.svg");
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: "test-results/greyhaven-loading.png" });
  release();
  await p.waitForFunction(() => window.__ddd?.town.active, null, {
    timeout: 45000,
  });
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
    "Loading crest, shared vector marks and nonoverlapping 1600/1100 branding layouts passed.",
  );
} finally {
  await b.close();
}

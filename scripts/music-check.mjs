import { enterGame, settingsAction } from "./ui-session.mjs";
import { expect, chromium } from "@playwright/test";
import { pathToFileURL } from "node:url";
export async function verifyMusic(page) {
  const saved = await page.evaluate(() =>
    structuredClone(window.__ddd.game.snapshot()),
  );
  const preferences = await page.evaluate(() => {
    const s = window.__ddd.sound;
    return {
      volume: s.volume,
      muted: s.muted,
      effects: s.effectsVolume,
      music: s.music.volume,
      musicMuted: s.music.muted,
    };
  });
  const waitTrack = async (scene) => {
    await page.waitForFunction(
      (scene) => {
        const m = window.__ddd.sound.music;
        return (
          m.current?.track.scene === scene &&
          !m.pending &&
          m.current.voices.size >= 2 &&
          m.position() > 0.2
        );
      },
      scene,
      { timeout: 15000 },
    );
  };
  const energy = () =>
    page.evaluate(() => {
      const s = window.__ddd.sound,
        a = new Float32Array(s.analyser.fftSize);
      s.analyser.getFloatTimeDomainData(a);
      return Math.sqrt(a.reduce((sum, v) => sum + v * v, 0) / a.length);
    });
  try {
    await settingsAction(page, "Sound");
    await page.locator("#volume").fill("0.8");
    await page.locator("#music-volume").fill("0.65");
    await page.locator("#effects-volume").fill("0");
    await page.locator("#music-muted").uncheck();
    await page.evaluate(() => {
      const s = window.__ddd.sound;
      if (s.muted) s.toggle();
    });
    await waitTrack("town");
    await expect.poll(energy, { timeout: 10000 }).toBeGreaterThan(0.0001);
    const timeBefore = await page.evaluate(() =>
      window.__ddd.sound.music.position(),
    );
    await page.evaluate(() => {
      for (let i = 0; i < 8; i++) window.__ddd.game.emit("change");
    });
    expect(
      await page.evaluate(() => window.__ddd.sound.music.position()),
    ).toBeGreaterThanOrEqual(timeBefore);
    await page.locator("#music-muted").check();
    await page.waitForTimeout(600);
    expect(await energy()).toBeLessThan(0.0001);
    await page.locator("#effects-volume").fill("1");
    await page.getByRole("button", { name: "Play test sound" }).click();
    await expect
      .poll(() => page.evaluate(() => window.__ddd.sound.effects.gain.value))
      .toBeGreaterThan(0.9);
    await page.locator("#music-muted").uncheck();
    await page.locator(".music-credits summary").click();
    await expect(page.locator(".music-credits")).toContainText(
      "Alexander Nakarada",
    );
    await expect(page.locator(".music-credits")).toContainText("Kevin MacLeod");
    await page.screenshot({
      path: `test-results/release-music-${process.platform}.png`,
    });
    await page.keyboard.press("Escape");
    await page.evaluate(() => {
      const g = window.__ddd.game;
      g.pause();
      g.mode = "exploration";
      g.enemies = [];
      g.emit("change");
    });
    await waitTrack("exploration");
    await settingsAction(page, "Camp & supplies");
    await waitTrack("camp");
    await page.keyboard.press("Escape");
    await waitTrack("exploration");
    await settingsAction(page, "Camp & supplies");
    await waitTrack("camp");
    await page.evaluate(() => {
      const g = window.__ddd.game,
        h = g.active;
      g.enemies = [
        {
          id: "music-sentry",
          name: "Bone sentry",
          x: h.x + 1,
          z: h.z,
          hp: 40,
          maxHp: 40,
          group: 999,
          conditions: [],
        },
      ];
      g.detect(g.enemies);
    });
    await waitTrack("battle");
    // Play the actual last three seconds and measure through the scheduled seam.
    await page.evaluate(async () => {
      const s = window.__ddd.sound;
      s.setEffectsVolume(0);
      const m = s.music;
      await m.start(m.current.track, {
        offset: m.current.duration - 3,
        fade: 0.1,
      });
    });
    await page.waitForTimeout(1700);
    const levels = [];
    for (let i = 0; i < 35; i++) {
      levels.push(await energy());
      await page.waitForTimeout(50);
    }
    expect(Math.max(...levels)).toBeGreaterThan(0.001);
    // No sustained silence while the outgoing recording meets the incoming one.
    let silent = 0;
    for (const level of levels) {
      silent = level < 0.0001 ? silent + 1 : 0;
      expect(silent).toBeLessThan(3);
    }
    expect(
      await page.evaluate(() => window.__ddd.sound.music.current.loops),
    ).toBeGreaterThan(0);
    expect(
      await page.evaluate(() => window.__ddd.sound.music.retiring.size),
    ).toBe(0);
    await page.evaluate(() => window.__ddd.sound.setEffectsVolume(1));
    if (await page.locator(".dungeon-camp").count())
      await page.keyboard.press("Escape");
    await page.evaluate((saved) => {
      const g = window.__ddd.game;
      g.load(saved, { resume: false });
      g.emit("floor");
      g.emit("change");
    }, saved);
    await settingsAction(page, "Save");
    await page.reload();
    await page.waitForFunction(() => window.__ddd);
    await enterGame(page);
    expect(
      await page.evaluate(() => ({
        music: window.__ddd.sound.music.volume,
        effects: window.__ddd.sound.effectsVolume,
      })),
    ).toEqual({ music: 0.65, effects: 1 });
    console.log(
      "Licensed music plays audibly; town/exploration/camp/combat transitions, faded looping, independent volume/mute, credits and preference reload passed.",
    );
  } finally {
    if (await page.locator("#modal-root > *").count())
      await page.keyboard.press("Escape");
    await page.evaluate(
      ({ saved, preferences: p }) => {
        const { game: g, sound: s } = window.__ddd;
        s.setVolume(p.volume);
        if (s.muted !== p.muted) s.toggle();
        s.setEffectsVolume(p.effects);
        s.music.setVolume(p.music);
        s.music.setMuted(p.musicMuted);
        g.load(saved, { resume: false });
        g.emit("floor");
        g.emit("change");
      },
      { saved, preferences },
    );
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const b = await chromium.launch({
    headless: true,
    args: ["--enable-unsafe-swiftshader"],
  });
  try {
    const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
    await p.goto("http://127.0.0.1:5198");
    await p.waitForFunction(() => window.__ddd);
    await enterGame(p);
    await verifyMusic(p);
  } finally {
    await b.close();
  }
}

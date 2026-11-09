import fs from "node:fs";
import { createHash } from "node:crypto";
import { MUSIC_TRACKS } from "../src/view/music-library.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { GameMusic, musicScene, crossfadeCurve } from "../src/view/music.mjs";
const tracks = ["town", "exploration", "battle", "camp"].map((scene) => ({
  scene,
  title: scene,
  url: `/${scene}.mp3`,
}));
const settle = () => new Promise((r) => setImmediate(r));
function fixture({ deferred = false } = {}) {
  const values = new Map(),
    sources = [],
    loads = [];
  const param = () => ({
    value: 0,
    events: [],
    setTargetAtTime(v) {
      this.value = v;
    },
    setValueAtTime(v, t) {
      this.events.push([v, t]);
      this.value = v;
    },
    linearRampToValueAtTime(v, t) {
      this.events.push([v, t]);
    },
    setValueCurveAtTime(v, t, d) {
      this.events.push([v, t, d]);
    },
    cancelAndHoldAtTime() {},
  });
  const node = () => ({
    gain: param(),
    connect(n) {
      return n;
    },
    disconnect() {
      this.disconnected = true;
    },
  });
  const context = {
    state: "running",
    currentTime: 2,
    createGain: node,
    createBufferSource() {
      const n = {
        ...node(),
        start(...args) {
          this.started = args;
        },
        stop() {
          this.stopped = true;
        },
      };
      sources.push(n);
      return n;
    },
  };
  const loadBuffer = (url) => {
    const l = { url };
    loads.push(l);
    return deferred
      ? new Promise((resolve, reject) => Object.assign(l, { resolve, reject }))
      : Promise.resolve({ duration: 60 });
  };
  const music = new GameMusic({
    tracks,
    loadBuffer,
    storage: {
      getItem: (k) => values.get(k) ?? null,
      setItem: (k, v) => values.set(k, v),
    },
  });
  return { music, context, sources, loads, values };
}
test("combat overrides camp and town/defeat return to town", () => {
  assert.equal(musicScene("combat", true), "battle");
  assert.equal(musicScene("town", true), "town");
  assert.equal(musicScene("defeat"), "town");
  assert.equal(musicScene("exploration", true), "camp");
  assert.equal(musicScene("exploration"), "exploration");
});
test("equal-power loop curves preserve energy over the whole overlap", () => {
  const a = crossfadeCurve(true),
    b = crossfadeCurve(false);
  for (let i = 0; i < a.length; i++)
    assert.ok(Math.abs(a[i] ** 2 + b[i] ** 2 - 1) < 1e-6);
  assert.equal(a[0], 0);
  assert.equal(a.at(-1), 1);
  assert.equal(b[0], 1);
  assert.ok(b.at(-1) < 1e-6);
});
test("loops are scheduled before playback, reuse decoded data and release their nodes", async () => {
  const { music, context, sources, loads } = fixture();
  music.setScene("town");
  assert.equal(loads.length, 0);
  music.attach(context, {});
  music.sync();
  await settle();
  const first = music.current;
  assert.equal(sources.length, 2);
  assert.equal(loads.length, 1);
  assert.equal(sources[1].started[0], sources[0].started[0] + 60 - 1.5);
  for (let i = 0; i < 20; i++) music.setScene("town");
  assert.equal(loads.length, 1);
  context.currentTime = sources[0].started[0] + 60;
  sources[0].onended();
  assert.equal(sources.length, 3);
  assert.equal(first.loops, 1);
  assert.equal(first.voices.size, 2);
  assert.equal(sources[2].started[0], sources[1].started[0] + 60 - 1.5);
  assert.equal(loads.length, 1);
  music.dispose();
  assert.ok(sources.slice(1).every((s) => s.stopped));
});
test("late downloads cannot replace newer scenes; failures allow retry and volume persists", async () => {
  const { music, context, loads, values } = fixture({ deferred: true });
  music.attach(context, {});
  music.setVolume(0.3);
  music.setMuted(true);
  assert.equal(music.bus.gain.value, 0);
  assert.equal(values.get("ddd.music.volume"), "0.3");
  music.setMuted(false);
  assert.equal(music.bus.gain.value, 0.3);
  music.setScene("town");
  music.setScene("battle");
  loads[1].resolve({ duration: 60 });
  await settle();
  loads[0].resolve({ duration: 60 });
  await settle();
  assert.equal(music.current.track.scene, "battle");
  music.setScene("camp");
  loads[2].reject(new Error("missing"));
  await settle();
  assert.ok(music.status().error);
  assert.equal(music.pending, null);
  music.sync();
  loads[3].resolve({ duration: 60 });
  await settle();
  assert.equal(music.status().error, null);
  assert.equal(music.current.track.scene, "camp");
  music.dispose();
});
test("every approved context bundles the exact credited original recording", () => {
  const manifest = JSON.parse(
    fs.readFileSync(new URL("../docs/music-provenance.json", import.meta.url)),
  );
  const credits = fs.readFileSync(
    new URL("../public/audio/music/CREDITS.txt", import.meta.url),
    "utf8",
  );
  assert.deepEqual(MUSIC_TRACKS.map((t) => t.scene).sort(), [
    "battle",
    "camp",
    "exploration",
    "town",
  ]);
  assert.equal(manifest.tracks.length, 4);
  for (const t of MUSIC_TRACKS) {
    const fact = manifest.tracks.find((f) => f.scene === t.scene),
      data = fs.readFileSync(new URL("../public" + t.url, import.meta.url));
    assert.equal(createHash("sha256").update(data).digest("hex"), t.sha256);
    assert.equal(data.length, fact.bytes);
    assert.ok(fact.durationSeconds > 30);
    assert.equal(fact.license, "CC-BY-4.0");
    assert.equal(fact.approvedBy, "Bruce");
    assert.ok(credits.includes(t.title));
    assert.ok(credits.includes(t.creator));
    assert.ok(credits.includes(t.source));
    assert.ok(credits.includes(t.licenseUrl));
  }
});

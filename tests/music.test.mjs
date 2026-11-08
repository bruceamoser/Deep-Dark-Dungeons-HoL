import fs from "node:fs";
import { createHash } from "node:crypto";
import { MUSIC_TRACKS } from "../src/view/music-library.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { GameMusic, musicScene } from "../src/view/music.mjs";
const tracks = ["town", "exploration", "battle", "camp"].map((scene) => ({
  scene,
  title: scene,
  url: `/${scene}.mp3`,
}));
function fixture({ deferred = false } = {}) {
  const values = new Map(),
    audios = [];
  const param = () => ({
    value: 0,
    setTargetAtTime(v) {
      this.value = v;
    },
    setValueAtTime(v) {
      this.value = v;
    },
    linearRampToValueAtTime(v) {
      this.value = v;
    },
    cancelAndHoldAtTime() {},
  });
  const node = () => ({
    gain: param(),
    connect(next) {
      return next;
    },
    disconnect() {
      this.disconnected = true;
    },
  });
  const context = {
    state: "running",
    currentTime: 2,
    createGain: node,
    createMediaElementSource: node,
  };
  const createAudio = () => {
    const audio = {
      currentTime: 0,
      duration: 60,
      pause() {
        this.paused = true;
      },
      removeAttribute() {},
      load() {},
      play() {
        this.paused = false;
        return deferred
          ? new Promise((resolve, reject) => {
              this.resolve = resolve;
              this.reject = reject;
            })
          : Promise.resolve();
      },
    };
    audios.push(audio);
    return audio;
  };
  const music = new GameMusic({
    tracks,
    storage: {
      getItem: (k) => values.get(k) ?? null,
      setItem: (k, v) => values.set(k, v),
    },
    createAudio,
  });
  return { music, context, audios, values };
}
const settle = () => new Promise((r) => setImmediate(r));
test("combat overrides camping; town/defeat return to Greyhaven", () => {
  assert.equal(musicScene("combat", true), "battle");
  assert.equal(musicScene("town", true), "town");
  assert.equal(musicScene("defeat"), "town");
  assert.equal(musicScene("exploration", true), "camp");
  assert.equal(musicScene("exploration", false), "exploration");
});
test("music waits for unlocked context, does not restart on renders, and repeats with a faded second source", async () => {
  const { music, context, audios } = fixture();
  music.setScene("town");
  assert.equal(audios.length, 0);
  music.attach(context, {});
  music.sync();
  await settle();
  assert.equal(music.current.track.scene, "town");
  for (let i = 0; i < 20; i++) music.setScene("town");
  assert.equal(audios.length, 1);
  const first = music.current;
  first.audio.currentTime = 59;
  first.audio.ontimeupdate();
  await settle();
  assert.equal(audios.length, 2);
  assert.notEqual(music.current, first);
  assert.equal(music.retiring.size, 1);
  music.dispose();
  assert.ok(audios.every((a) => a.paused));
});
test("rapid context changes cannot let a late download replace the newer scene", async () => {
  const { music, context, audios } = fixture({ deferred: true });
  music.attach(context, {});
  music.setScene("town");
  music.setScene("battle");
  audios[1].resolve();
  await settle();
  audios[0].resolve();
  await settle();
  assert.equal(music.current.track.scene, "battle");
  assert.equal(audios[0].paused, true);
  music.dispose();
});
test("music volume/mute persist independently and a failed track leaves the game usable", async () => {
  const { music, context, audios, values } = fixture({ deferred: true });
  music.attach(context, {});
  music.setVolume(0.3);
  music.setMuted(true);
  assert.equal(music.bus.gain.value, 0);
  assert.equal(values.get("ddd.music.volume"), "0.3");
  assert.equal(values.get("ddd.music.muted"), "true");
  music.setMuted(false);
  assert.equal(music.bus.gain.value, 0.3);
  music.setScene("battle");
  audios[0].reject(new Error("missing file"));
  await settle();
  assert.ok(music.status().error);
  assert.equal(music.pending, null);
  music.sync();
  audios[1].resolve();
  await settle();
  assert.equal(music.status().error, null);
  assert.equal(music.current.track.scene, "battle");
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

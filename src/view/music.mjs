import { MUSIC_TRACKS } from "./music-library.mjs";
const volume = (value, fallback) =>
  Number.isFinite(Number(value)) && value !== null
    ? Math.max(0, Math.min(1, Number(value)))
    : fallback;
export function musicScene(mode, camping = false) {
  if (mode === "combat") return "battle";
  if (mode === "town" || mode === "defeat") return "town";
  return camping ? "camp" : "exploration";
}
export class GameMusic {
  constructor({
    tracks = MUSIC_TRACKS,
    storage = globalThis.localStorage,
    createAudio = () => new Audio(),
  } = {}) {
    this.tracks = tracks;
    this.storage = storage;
    this.createAudio = createAudio;
    this.volume = volume(storage?.getItem("ddd.music.volume") ?? null, 0.45);
    this.muted = storage?.getItem("ddd.music.muted") === "true";
    this.scene = null;
    this.current = null;
    this.pending = null;
    this.retiring = new Set();
    this.sequence = 0;
    this.error = null;
  }
  attach(context, destination) {
    if (this.context) return;
    this.context = context;
    this.bus = context.createGain();
    this.bus.connect(destination);
    this.applyVolume();
  }
  status() {
    return {
      scene: this.scene,
      title: this.current?.track.title ?? null,
      loading: !!this.pending,
      error: this.error,
      muted: this.muted,
      volume: this.volume,
    };
  }
  changed() {
    this.onChange?.(this.status());
  }
  setScene(scene) {
    if (this.scene === scene) return;
    this.scene = scene;
    this.sequence++;
    if (this.pending) {
      this.stop(this.pending);
      this.pending = null;
    }
    this.sync();
  }
  sync() {
    if (!this.context || this.context.state !== "running") return;
    const track = this.tracks.find((t) => t.scene === this.scene);
    if (!track || this.pending || this.current?.track === track) return;
    this.start(track);
  }
  async start(track, { fade = 1.5 } = {}) {
    const token = ++this.sequence;
    const audio = this.createAudio(),
      gain = this.context.createGain();
    audio.src = track.url;
    audio.preload = "auto";
    audio.loop = true;
    const source = this.context.createMediaElementSource(audio);
    gain.gain.value = 0;
    source.connect(gain).connect(this.bus);
    const record = { audio, gain, source, track, timer: null };
    this.pending = record;
    this.error = null;
    this.changed();
    audio.ontimeupdate = () => {
      if (
        this.current === record &&
        !this.pending &&
        audio.currentTime > 3 &&
        Number.isFinite(audio.duration) &&
        audio.duration - audio.currentTime < 1.5
      )
        this.start(track, { fade: 1.5 });
    };
    try {
      await audio.play();
      if (token !== this.sequence) {
        this.stop(record);
        return;
      }
      this.pending = null;
      for (const old of this.retiring) this.stop(old);
      this.retiring.clear();
      const previous = this.current;
      this.current = record;
      const now = this.context.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(1, now + fade);
      if (previous) {
        previous.gain.gain.cancelAndHoldAtTime(now);
        previous.gain.gain.linearRampToValueAtTime(0, now + fade);
        this.retiring.add(previous);
        previous.timer = setTimeout(
          () => {
            this.stop(previous);
            this.retiring.delete(previous);
          },
          fade * 1000 + 100,
        );
      }
      this.changed();
    } catch (error) {
      this.stop(record);
      if (token === this.sequence) {
        this.pending = null;
        this.error = "Music could not play. Use the sound controls to retry.";
        this.changed();
      }
    }
  }
  stop(record) {
    clearTimeout(record.timer);
    record.audio.ontimeupdate = null;
    record.audio.pause();
    record.audio.removeAttribute("src");
    record.audio.load();
    record.source.disconnect();
    record.gain.disconnect();
  }
  applyVolume() {
    this.bus?.gain.setTargetAtTime(
      this.muted ? 0 : this.volume,
      this.context.currentTime,
      0.025,
    );
  }
  setVolume(value) {
    this.volume = volume(value, 0);
    this.storage?.setItem("ddd.music.volume", String(this.volume));
    this.applyVolume();
    this.changed();
  }
  setMuted(muted) {
    this.muted = !!muted;
    this.storage?.setItem("ddd.music.muted", String(this.muted));
    this.applyVolume();
    this.changed();
  }
  dispose() {
    this.sequence++;
    for (const record of new Set([
      this.current,
      this.pending,
      ...this.retiring,
    ]))
      if (record) this.stop(record);
    this.current = this.pending = null;
    this.retiring.clear();
    this.bus?.disconnect();
    this.context = null;
  }
}

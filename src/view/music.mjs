import { MUSIC_TRACKS } from "./music-library.mjs";
export function crossfadeCurve(incoming, count = 64) {
  return Float32Array.from({ length: count }, (_, i) =>
    incoming
      ? Math.sin(((i / (count - 1)) * Math.PI) / 2)
      : Math.cos(((i / (count - 1)) * Math.PI) / 2),
  );
}
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
    loadBuffer = async (url, context) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Missing music recording");
      return context.decodeAudioData(await response.arrayBuffer());
    },
  } = {}) {
    this.tracks = tracks;
    this.storage = storage;
    this.loadBuffer = loadBuffer;
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
  async start(track, { fade = 1.5, offset = 0 } = {}) {
    const token = ++this.sequence,
      context = this.context;
    const record = {
      track,
      voices: new Set(),
      gain: context.createGain(),
      stopped: false,
      timer: null,
      loops: 0,
    };
    record.gain.gain.value = 0;
    record.gain.connect(this.bus);
    this.pending = record;
    this.error = null;
    this.changed();
    try {
      record.buffer =
        this.current?.track === track
          ? this.current.buffer
          : await this.loadBuffer(track.url, context);
      if (token !== this.sequence || this.context !== context) {
        this.stop(record);
        return;
      }
      this.pending = null;
      const previous = this.current;
      this.current = record;
      record.duration = record.buffer.duration;
      record.fade = Math.min(1.5, record.duration / 4);
      const now = context.currentTime + 0.03;
      record.startedAt = now;
      record.offset = Math.max(
        0,
        Math.min(offset, record.duration - record.fade * 2),
      );
      const first = this.voice(record, now, record.offset, true);
      record.next = this.voice(record, first.end - record.fade, 0, false);
      record.gain.gain.setValueAtTime(0, now);
      record.gain.gain.linearRampToValueAtTime(1, now + fade);
      if (previous) {
        previous.gain.gain.cancelAndHoldAtTime(context.currentTime);
        previous.gain.gain.linearRampToValueAtTime(0, now + fade);
        this.retiring.add(previous);
        previous.timer = setTimeout(
          () => {
            this.stop(previous);
            this.retiring.delete(previous);
          },
          (fade + 0.1) * 1000,
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
  voice(record, start, offset, first) {
    const source = this.context.createBufferSource(),
      gain = this.context.createGain(),
      end = start + record.duration - offset,
      fade = record.fade;
    source.buffer = record.buffer;
    source.connect(gain).connect(record.gain);
    const voice = { source, gain, start, end };
    record.voices.add(voice);
    // Schedule both sides of the overlap on the audio clock, before playback.
    // No timeupdate callback, decoder startup or native loop wrap at the seam.
    gain.gain.setValueAtTime(first ? 1 : 0, start);
    if (!first)
      gain.gain.setValueCurveAtTime(crossfadeCurve(true), start, fade);
    gain.gain.setValueAtTime(1, end - fade);
    gain.gain.setValueCurveAtTime(crossfadeCurve(false), end - fade, fade);
    source.onended = () => {
      record.voices.delete(voice);
      source.disconnect();
      gain.disconnect();
      if (!record.stopped && this.current === record) {
        record.loops++;
        record.next = this.voice(record, record.next.end - fade, 0, false);
      }
    };
    source.start(start, offset, record.duration - offset);
    return voice;
  }
  position() {
    const r = this.current;
    if (!r) return 0;
    return (
      Math.max(0, this.context.currentTime - r.startedAt + r.offset) %
      (r.duration - r.fade)
    );
  }
  stop(record) {
    if (record.stopped) return;
    record.stopped = true;
    clearTimeout(record.timer);
    for (const voice of record.voices) {
      voice.source.onended = null;
      voice.source.stop();
      voice.source.disconnect();
      voice.gain.disconnect();
    }
    record.voices.clear();
    record.buffer = null;
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

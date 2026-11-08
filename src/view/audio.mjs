import { GameMusic } from "./music.mjs";
/** Procedural effects and a separately controlled licensed music bus. */
export class GameAudio {
  constructor() {
    this.volume = Number(localStorage.getItem("ddd.volume") ?? 0.65);
    this.muted = localStorage.getItem("ddd.muted") === "true";
    this.effectsVolume = Number(
      localStorage.getItem("ddd.effects.volume") ?? 1,
    );
    this.music = new GameMusic();
    this.lastStep = 0;
    for (const event of ["pointerdown", "keydown"])
      document.addEventListener(
        event,
        () => this.unlock().catch(console.warn),
        { capture: true },
      );
  }
  async unlock() {
    if (!this.context) {
      const c = (this.context = new AudioContext());
      this.master = c.createGain();
      this.analyser = c.createAnalyser();
      this.master.connect(this.analyser).connect(c.destination);
      this.effects = c.createGain();
      this.effects.connect(this.master);
      this.setEffectsVolume(this.effectsVolume);
      this.music.attach(c, this.master);
      this.setVolume(this.volume);
      const noise = c.createBuffer(1, c.sampleRate * 3, c.sampleRate),
        samples = noise.getChannelData(0);
      let last = 0;
      for (let i = 0; i < samples.length; i++)
        samples[i] = last = (last + (Math.random() * 2 - 1) * 0.025) / 1.025;
      const source = c.createBufferSource(),
        filter = c.createBiquadFilter(),
        gain = c.createGain();
      source.buffer = noise;
      source.loop = true;
      filter.type = "lowpass";
      filter.frequency.value = 700;
      gain.gain.value = 0.2;
      source.connect(filter).connect(gain).connect(this.effects);
      source.start();
      this.transientNoise = c.createBuffer(
        1,
        Math.ceil(c.sampleRate * 0.4),
        c.sampleRate,
      );
      const transient = this.transientNoise.getChannelData(0);
      for (let i = 0; i < transient.length; i++)
        transient[i] = Math.random() * 2 - 1;
    }
    await this.context.resume();
    this.music.sync();
  }
  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, Number(value) || 0));
    localStorage.setItem("ddd.volume", this.volume);
    if (this.master)
      this.master.gain.setTargetAtTime(
        this.muted ? 0 : this.volume,
        this.context.currentTime,
        0.02,
      );
  }
  setEffectsVolume(value) {
    this.effectsVolume = Math.max(0, Math.min(1, Number(value) || 0));
    localStorage.setItem("ddd.effects.volume", this.effectsVolume);
    this.effects?.gain.setTargetAtTime(
      this.effectsVolume,
      this.context.currentTime,
      0.02,
    );
  }
  toggle() {
    this.muted = !this.muted;
    localStorage.setItem("ddd.muted", this.muted);
    this.setVolume(this.volume);
  }
  play(kind) {
    const c = this.context;
    if (!c || c.state !== "running" || this.muted) return;
    if (kind === "step" && c.currentTime - this.lastStep < 0.14) return;
    if (kind === "step") this.lastStep = c.currentTime;
    const presets = {
      step: [130, 55, 0.075, 0.1],
      hit: [180, 42, 0.18, 0.3],
      bow: [280, 85, 0.16, 0.14],
      "arrow-hit": [120, 48, 0.09, 0.16],
      swing: [95, 45, 0.12, 0.035],
      spell: [720, 140, 0.45, 0.12],
      loot: [520, 1040, 0.3, 0.13],
      combat: [90, 38, 0.8, 0.25],
      ui: [440, 660, 0.12, 0.1],
    };
    const [from, to, duration, level] = presets[kind] ?? presets.ui;
    if (["swing", "bow", "arrow-hit", "hit"].includes(kind)) {
      const noise = c.createBufferSource(),
        filter = c.createBiquadFilter(),
        envelope = c.createGain();
      noise.buffer = this.transientNoise;
      filter.type = kind === "swing" ? "bandpass" : "lowpass";
      filter.frequency.setValueAtTime(
        kind === "swing" ? 2400 : kind === "bow" ? 3200 : 1400,
        c.currentTime,
      );
      filter.frequency.exponentialRampToValueAtTime(
        250,
        c.currentTime + duration,
      );
      envelope.gain.setValueAtTime(0.001, c.currentTime);
      envelope.gain.linearRampToValueAtTime(
        kind === "swing" ? 0.22 : 0.12,
        c.currentTime + 0.015,
      );
      envelope.gain.exponentialRampToValueAtTime(
        0.001,
        c.currentTime + duration,
      );
      noise.connect(filter).connect(envelope).connect(this.effects);
      noise.start();
      noise.stop(c.currentTime + duration);
      noise.onended = () => {
        noise.disconnect();
        filter.disconnect();
        envelope.disconnect();
      };
    }
    const osc = c.createOscillator(),
      gain = c.createGain();
    osc.type = kind === "hit" || kind === "step" ? "triangle" : "sine";
    osc.frequency.setValueAtTime(from, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(to, c.currentTime + duration);
    gain.gain.setValueAtTime(0.001, c.currentTime);
    gain.gain.linearRampToValueAtTime(level, c.currentTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain).connect(this.effects);
    osc.start();
    osc.stop(c.currentTime + duration);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
}

/** Original procedural audio; no external recordings or licensing dependencies. */
export class GameAudio {
  constructor() {
    this.volume = Number(localStorage.getItem("ddd.volume") ?? 0.65);
    this.muted = localStorage.getItem("ddd.muted") === "true";
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
      source.connect(filter).connect(gain).connect(this.master);
      source.start();
    }
    await this.context.resume();
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
      spell: [720, 140, 0.45, 0.12],
      loot: [520, 1040, 0.3, 0.13],
      combat: [90, 38, 0.8, 0.25],
      ui: [440, 660, 0.12, 0.1],
    };
    const [from, to, duration, level] = presets[kind] ?? presets.ui;
    const osc = c.createOscillator(),
      gain = c.createGain();
    osc.type = kind === "hit" || kind === "step" ? "triangle" : "sine";
    osc.frequency.setValueAtTime(from, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(to, c.currentTime + duration);
    gain.gain.setValueAtTime(0.001, c.currentTime);
    gain.gain.linearRampToValueAtTime(level, c.currentTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain).connect(this.master);
    osc.start();
    osc.stop(c.currentTime + duration);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
}

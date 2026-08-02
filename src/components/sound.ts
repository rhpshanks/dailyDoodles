// Tiny synthesized sound kit: soft pops per fill, a two-note chime on
// completion, and an optional rain-like ambience bed. Everything is generated
// with WebAudio at runtime (no audio files, no licensing concerns), stays very
// quiet, and only ever starts from a user gesture. Off by default.

class DoodleSound {
  private ctx: AudioContext | null = null;
  private ambienceGain: GainNode | null = null;
  private ambienceSrc: AudioBufferSourceNode | null = null;
  enabled = false;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC = window.AudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (on) {
      this.startAmbience();
    } else {
      this.stopAmbience();
    }
  }

  pop(step = 0) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = "triangle";
    osc.frequency.value = 340 + Math.random() * 140 + Math.min(step, 8) * 12;
    filter.type = "lowpass";
    filter.frequency.value = 1400;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.09, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  chime() {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    [523.25, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = t + i * 0.16;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.07, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.9);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 1);
    });
  }

  private startAmbience() {
    const ctx = this.ensure();
    if (!ctx || this.ambienceSrc) return;
    const seconds = 3;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      // Brown-ish noise reads as distant rain once low-passed.
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 2);
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.11;
    lfoGain.gain.value = 90;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
    this.ambienceSrc = src;
    this.ambienceGain = gain;
  }

  private stopAmbience() {
    if (!this.ctx || !this.ambienceSrc || !this.ambienceGain) return;
    const t = this.ctx.currentTime;
    this.ambienceGain.gain.cancelScheduledValues(t);
    this.ambienceGain.gain.setValueAtTime(this.ambienceGain.gain.value, t);
    this.ambienceGain.gain.linearRampToValueAtTime(0, t + 0.6);
    const src = this.ambienceSrc;
    setTimeout(() => {
      try {
        src.stop();
      } catch {
        // already stopped
      }
    }, 700);
    this.ambienceSrc = null;
    this.ambienceGain = null;
  }
}

export const sound = new DoodleSound();

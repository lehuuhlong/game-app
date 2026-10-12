/**
 * Pure Web Audio API sound synthesizer for Dino Egg Pop.
 * Zero external audio assets or network requests needed.
 */

let audioCtx: AudioContext | null = null;
let isMuted = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function setSoundMuted(muted: boolean) {
  isMuted = muted;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("dino-egg-pop-muted", muted ? "true" : "false");
    } catch {
      /* noop */
    }
  }
}

export function getSoundMuted(): boolean {
  if (typeof window !== "undefined") {
    try {
      return localStorage.getItem("dino-egg-pop-muted") === "true";
    } catch {
      return false;
    }
  }
  return isMuted;
}

/** Shoot sound: quick rising whoosh / laser pop */
export function playShootSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(750, now + 0.1);

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.12);
}

/** Wall bounce sound: subtle high ping */
export function playBounceSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(540, now);
  osc.frequency.exponentialRampToValueAtTime(820, now + 0.05);

  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.06);
}

/** Match-3 pop sound: bright bubble pop, pitch scales with combo */
export function playPopSound(combo: number = 1) {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  const baseFreq = Math.min(1100, 440 * Math.pow(1.15, Math.min(combo, 6)));

  osc.type = "sine";
  osc.frequency.setValueAtTime(baseFreq * 0.8, now);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.08);

  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.14);
}

/** Cluster drop sound: descending cascade notes */
export function playDropSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [659, 587, 523, 440];

  notes.forEach((freq, idx) => {
    const t = now + idx * 0.05;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);
  });
}

/** Descending ceiling alarm sound */
export function playWarningSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.setValueAtTime(330, now + 0.1);

  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.22);
}

/** Game over sound */
export function playGameOverSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [392, 349, 311, 261]; // G4 -> F4 -> Eb4 -> C4

  notes.forEach((freq, idx) => {
    const t = now + idx * 0.14;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.22);
  });
}

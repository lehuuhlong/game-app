/**
 * Pure Web Audio API Sound Synthesizer for Neon Nonogram.
 * Zero external audio assets or network requests needed.
 */

let audioCtx: AudioContext | null = null;
let isMuted: boolean | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {
      /* Ignore browser autoplay or suspended context policy rejection */
    });
  }
  return audioCtx;
}

export function setMuted(muted: boolean) {
  isMuted = muted;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('nonogram-sound-muted', muted ? 'true' : 'false');
    } catch {
      /* noop */
    }
  }
}

export function getMuted(): boolean {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('nonogram-sound-muted');
      if (stored !== null) {
        const val = stored === 'true';
        isMuted = val;
        return val;
      }
    } catch {
      /* noop */
    }
  }
  return isMuted ?? false;
}

export function isAudioMuted(): boolean {
  if (isMuted === null) {
    isMuted = getMuted();
  }
  return isMuted;
}

/** Fill cell sound: clean high-tech pop */
export function playFillSound(combo = 1) {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const safeCombo = typeof combo === 'number' && Number.isFinite(combo) ? Math.max(1, combo) : 1;
  const baseFreq = 480 * Math.min(2.0, 1 + (safeCombo - 1) * 0.1);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(baseFreq, now);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.08);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
  gain.gain.linearRampToValueAtTime(0, now + 0.095);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.onended = () => {
    try {
      osc.disconnect();
      gain.disconnect();
    } catch {
      /* noop */
    }
  };

  osc.start(now);
  osc.stop(now + 0.095);
}

/** Mark X / Cross cell sound: subtle pencil tick */
export function playCrossSound() {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(180, now + 0.05);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  gain.gain.linearRampToValueAtTime(0, now + 0.055);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.onended = () => {
    try {
      osc.disconnect();
      gain.disconnect();
    } catch {
      /* noop */
    }
  };

  osc.start(now);
  osc.stop(now + 0.055);
}

/** Mistake sound: low buzzer error */
export function playMistakeSound() {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(130, now);
  osc.frequency.linearRampToValueAtTime(95, now + 0.08);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.25, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  gain.gain.linearRampToValueAtTime(0, now + 0.225);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.onended = () => {
    try {
      osc.disconnect();
      gain.disconnect();
    } catch {
      /* noop */
    }
  };

  osc.start(now);
  osc.stop(now + 0.225);
}

/** Line completed (row or col satisfied): pleasant harmonic chord */
export function playLineCompleteSound() {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const chord = [523.25, 659.25]; // C5, E5
  chord.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + idx * 0.05;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.14, start + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
    gain.gain.linearRampToValueAtTime(0, start + 0.185);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        /* noop */
      }
    };

    osc.start(start);
    osc.stop(start + 0.185);
  });
}

/** Hint sound: shimmering sparkle */
export function playHintSound() {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [659.25, 783.99, 987.77, 1318.51];
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + idx * 0.06;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.12, start + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
    gain.gain.linearRampToValueAtTime(0, start + 0.205);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        /* noop */
      }
    };

    osc.start(start);
    osc.stop(start + 0.205);
  });
}

/** Undo sound: descending soft chirp */
export function playUndoSound() {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  gain.gain.linearRampToValueAtTime(0, now + 0.085);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.onended = () => {
    try {
      osc.disconnect();
      gain.disconnect();
    } catch {
      /* noop */
    }
  };

  osc.start(now);
  osc.stop(now + 0.085);
}

/** Victory Fanfare: ascending bright cyberpunk arpeggio */
export function playVictorySound() {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [392, 523.25, 659.25, 783.99, 1046.5]; // G4, C5, E5, G5, C6
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + idx * 0.09;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.2, start + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
    gain.gain.linearRampToValueAtTime(0, start + 0.405);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        /* noop */
      }
    };

    osc.start(start);
    osc.stop(start + 0.405);
  });
}

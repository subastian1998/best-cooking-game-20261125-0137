// Tiny WebAudio bleeps, synthesised at run time — no sound files needed.
// Everything is guarded: no audio context, no crash, and nothing plays
// before the player's first gesture (browser autoplay rules).
let ctx = null;

function audio() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext ?? window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch {
    return null;
  }
  return ctx;
}

export function unlockAudio() {
  const c = audio();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

function tone(freq, dur, type = 'sine', vol = 0.12, when = 0) {
  const c = audio();
  if (!c) return;
  try {
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur);
  } catch {
    // silence is fine
  }
}

export const sfx = {
  pickup() { tone(520, 0.08, 'triangle', 0.1); },
  cookStart() { tone(300, 0.12, 'sawtooth', 0.06); tone(450, 0.1, 'sawtooth', 0.05, 0.08); },
  cookDone() { tone(880, 0.12, 'sine', 0.1); tone(1174, 0.16, 'sine', 0.1, 0.1); },
  served() { tone(523, 0.12, 'sine', 0.12); tone(659, 0.12, 'sine', 0.12, 0.09); tone(784, 0.22, 'sine', 0.12, 0.18); },
  missed() { tone(220, 0.25, 'sawtooth', 0.08); tone(165, 0.35, 'sawtooth', 0.08, 0.15); },
  wrong() { tone(180, 0.15, 'square', 0.06); },
  burn() { tone(140, 0.3, 'sawtooth', 0.09); },
  level() { tone(392, 0.1, 'sine', 0.1); tone(523, 0.1, 'sine', 0.1, 0.08); tone(659, 0.1, 'sine', 0.1, 0.16); tone(784, 0.2, 'sine', 0.1, 0.24); },
};

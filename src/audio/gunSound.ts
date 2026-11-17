// The sea battle's sounds, made on the spot (owner, 17 novembre 2026: "tum tum tum"): the machine gun's short thump
// with a crack of noise, the gun's deep boom, a burst far away, a round striking a hull. No sound files.
/** Each sound: its volume, how long it lasts (s), the low tone's start and end (Hz). Tuning. */
const SOUNDS = {
  mg: { volume: 0.22, length: 0.12, from: 150, to: 55, noise: 0.5 },
  gun: { volume: 0.45, length: 0.9, from: 90, to: 30, noise: 0.7 },
  burst: { volume: 0.35, length: 1.3, from: 70, to: 24, noise: 0.9 },
  clank: { volume: 0.12, length: 0.08, from: 900, to: 400, noise: 0.3 },
} as const;

export type GunSoundKind = keyof typeof SOUNDS;

let noiseBuffer: AudioBuffer | null = null;

function noise(c: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === c.sampleRate) return noiseBuffer;
  const b = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  noiseBuffer = b;
  return b;
}

/** Plays one, `near` 0 (far) … 1 (on you). */
export function playGun(c: AudioContext, out: AudioNode, kind: GunSoundKind, near: number): void {
  const s = SOUNDS[kind];
  const t = c.currentTime;
  const v = s.volume * (0.25 + 0.75 * near);
  // the thump: a falling low tone
  const o = c.createOscillator();
  const og = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(s.from, t);
  o.frequency.exponentialRampToValueAtTime(s.to, t + s.length);
  og.gain.setValueAtTime(v, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + s.length);
  o.connect(og).connect(out);
  o.start(t);
  o.stop(t + s.length + 0.05);
  // the crack: noise, darker far away
  const n = c.createBufferSource();
  n.buffer = noise(c);
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 600 + 3400 * near;
  const ng = c.createGain();
  ng.gain.setValueAtTime(v * s.noise, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + s.length * 0.8);
  n.connect(f).connect(ng).connect(out);
  n.start(t, Math.random() * 0.5);
  n.stop(t + s.length);
}

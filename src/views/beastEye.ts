// The red eye of a hunting beast (data/beastEyes.ts; owner, 25 ottobre 2026: no code dots over the beasts): a soft
// light on its painted eye, following the head's strip of the picture, where the open-mouth picture has it when the
// mouth is open. Split from beastView.ts in the cleanup of 12 novembre 2026.
import Phaser from 'phaser';
import { BEAST_SPRITE } from '../data/beasts';
import { BEAST_EYES, BEAST_EYES_OPEN, EYE_GLOW } from '../data/beastEyes';

const { frameW: IW, spineY: CY, segments: N } = BEAST_SPRITE;
const SEG = IW / N;

/** A soft red light, made once: bright in the middle, fading out to nothing (no edge). */
export function eyeGlowTexture(scene: Phaser.Scene): string {
  const key = 'beast-eye-glow';
  if (scene.textures.exists(key)) return key;
  const n = 64;
  const tex = scene.textures.createCanvas(key, n, n)!;
  const g = tex.getContext();
  const c = EYE_GLOW.color;
  const rgb = `${(c >> 16) & 255},${(c >> 8) & 255},${c & 255}`;
  const grad = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  grad.addColorStop(0, 'rgba(255,235,220,1)');
  grad.addColorStop(0.2, `rgba(${rgb},1)`);
  grad.addColorStop(0.45, `rgba(${rgb},0.5)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, n, n);
  tex.refresh();
  return key;
}

/**
 * Places the eye's light on the strip that holds it (hidden when the beast does not hunt, flashes red, or the picture
 * has no eye listed). Returns its light spot in the world for the darkness mask, or null.
 */
export function placeEye(
  eye: Phaser.GameObjects.Image,
  strips: readonly Phaser.GameObjects.Image[],
  root: Phaser.GameObjects.Container,
  p: { key: string; hunt?: boolean; flash: number },
  open: boolean,
  t: number,
): { x: number; y: number; r: number } | null {
  const at = (open ? BEAST_EYES_OPEN : BEAST_EYES)[p.key];
  if (!p.hunt || !at || p.flash > 0) {
    eye.setVisible(false);
    return null;
  }
  const [ex, ey] = at;
  const i = Math.min(N - 1, Math.max(0, Math.floor((IW - ex) / SEG)));
  const s = strips[i]!;
  // the point in the piece (its origin: the piece's right edge on the spine), then in the beast
  const dx = (ex - IW * (1 - i / N)) * s.scaleX;
  const dy = (ey - CY) * s.scaleY;
  const cos = Math.cos(s.rotation);
  const sin = Math.sin(s.rotation);
  const size = Math.max(EYE_GLOW.minSize, EYE_GLOW.size * Math.abs(root.scaleY));
  const throb = 1 - EYE_GLOW.pulseDepth * (0.5 + 0.5 * Math.sin(t * EYE_GLOW.pulse));
  const lx = s.x + dx * cos - dy * sin;
  const ly = s.y + dx * sin + dy * cos;
  const k = size / Math.abs(root.scaleY) / eye.width; // in the beast's own (scaled) frame
  eye
    .setVisible(true)
    .setPosition(lx, ly)
    .setScale(k)
    .setAlpha(EYE_GLOW.alpha * throb);
  return { x: root.x + lx * root.scaleX, y: root.y + ly * root.scaleY, r: size * EYE_GLOW.light };
}

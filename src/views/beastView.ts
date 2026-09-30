// A big beast drawn from its painted side profile, bent along the spine (drawShark in
// prototype/prova-realistica.html). Phaser 4 has no Rope/Mesh, so the image is cut into vertical strips:
// each strip follows one spine segment (rotated and shortened in perspective as the tail swings).
import Phaser from 'phaser';
import { BEAST_SPRITE } from '../data/beasts';

const { frameW: IW, frameH: IH, spineY: CY, segments: N } = BEAST_SPRITE;
const SEG = IW / N;
const OVERLAP = 1.07; // strips overlap a little so no seams show on the outside of a bend

export const spriteUrl = (key: string, open: boolean): string => `sprites/${key}${open ? '_open' : ''}.webp`;
export const textureKey = (key: string, open: boolean): string => `beast-${key}${open ? '-open' : ''}`;

/** Queues the closed and open profile of a beast form for loading. */
export function loadBeastSprites(scene: Phaser.Scene, key: string): void {
  for (const open of [false, true]) {
    const tk = textureKey(key, open);
    if (!scene.textures.exists(tk)) scene.load.image(tk, spriteUrl(key, open));
  }
}

/** Cuts a loaded profile texture into strip frames s0 (head) … s25 (tail). */
export function addStripFrames(scene: Phaser.Scene, key: string): boolean {
  let ok = true;
  for (const open of [false, true]) {
    const tk = textureKey(key, open);
    if (!scene.textures.exists(tk)) {
      ok = false;
      continue;
    }
    const tex = scene.textures.get(tk);
    if (tex.has('s0')) continue;
    for (let i = 0; i < N; i++) {
      const x1 = Math.round(IW * (1 - i / N));
      const x0 = Math.round(IW * (1 - (i + 1) / N));
      tex.add(`s${i}`, 0, x0, 0, x1 - x0, IH);
    }
  }
  return ok;
}

export interface BeastPoseView {
  key: string;
  x: number;
  y: number;
  face: 1 | -1;
  pitch: number;
  pitchV: number;
  phase: number;
  jaw: number;
  length: number;
  flash: number;
  alpha: number;
  /** 0 = normal; 0..1 while turning around (own beasts only). */
  turn?: number;
  /** Frenzy: red eyes and shaking. */
  rage?: boolean;
}

export class BeastSprite {
  readonly root: Phaser.GameObjects.Container;
  private readonly strips: Phaser.GameObjects.Image[] = [];
  private key = '';
  private open = false;

  constructor(
    private readonly scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
  ) {
    this.root = scene.add.container(0, 0);
    for (let i = 0; i < N; i++) {
      const im = scene.add.image(0, 0, '__WHITE').setOrigin(1, CY / IH);
      this.strips.push(im);
    }
    // tail first so the head is drawn on top
    this.root.add([...this.strips].reverse());
    layer.add(this.root);
    this.root.setVisible(false);
  }

  private setTextures(key: string, open: boolean): boolean {
    if (key === this.key && open === this.open) return true;
    const tk = textureKey(key, open);
    if (!this.scene.textures.exists(tk)) return false;
    this.strips.forEach((s, i) => s.setTexture(tk, `s${i}`));
    this.key = key;
    this.open = open;
    return true;
  }

  hide(): void {
    this.root.setVisible(false);
  }

  update(p: BeastPoseView): void {
    if (!this.setTextures(p.key, p.jaw > 0)) {
      this.root.setVisible(false);
      return;
    }
    const turn = Math.max(-1.2, Math.min(1.2, p.pitchV * 0.35));
    const pts: [number, number][] = [];
    const ang: number[] = [];
    const lens: number[] = [];
    let px = 0;
    let py = 0;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const env = Math.pow(Math.max(0, (u - 0.35) / 0.65), 1.5);
      const th = 1.05 * env * Math.sin(p.phase - u * 2.2);
      const a = p.pitch + turn * u * u * 0.9 + 0.05 * env * Math.sin(p.phase - u * 2.2 + 1.2);
      const len = SEG * (0.62 + 0.38 * Math.cos(th));
      pts.push([px, py]);
      ang.push(a);
      lens.push(len);
      if (i < N) {
        px -= Math.cos(a) * len;
        py -= Math.sin(a) * len;
      }
    }
    const mid = pts[Math.round(N * 0.45)]!;
    for (let i = 0; i < N; i++) {
      const s = this.strips[i]!;
      const [x, y] = pts[i]!;
      const a = (ang[i]! + ang[i + 1]!) / 2;
      s.setPosition(x - mid[0], y - mid[1])
        .setRotation(a)
        .setScale((lens[i]! / SEG) * OVERLAP, 1);
      if (p.flash > 0) s.setTint(0xff9a8a);
      else if (p.rage) s.setTint(0xffd0c8);
      else s.clearTint();
    }
    const sc = p.length / IW;
    const squash = p.turn && p.turn > 0 ? Math.max(0.06, Math.abs(1 - 2 * p.turn)) : 1;
    const shake = p.rage ? (Math.random() - 0.5) * p.length * 0.02 : 0;
    this.root
      .setVisible(true)
      .setPosition(p.x + shake, p.y + shake)
      .setScale(p.face * sc * squash, sc)
      .setAlpha(p.alpha);
  }

  destroy(): void {
    this.root.destroy();
  }
}

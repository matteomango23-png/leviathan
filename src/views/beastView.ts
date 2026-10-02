// A big beast drawn from its painted side profile, bent along the spine (drawShark in
// prototype/prova-realistica.html). Phaser 4 has no Rope/Mesh, so the image is cut into vertical strips:
// each strip follows one spine segment (rotated and shortened in perspective as the tail swings).
import Phaser from 'phaser';
import { assetUrl } from '../data/assets';
import { BEAST_SPRITE } from '../data/beasts';
import { BATTLE_ART_KEYS, OPEN_SPRITE_KEYS, SPRITE_KEYS } from '../data/sprites.generated';

const { frameW: IW, frameH: IH, spineY: CY, segments: N } = BEAST_SPRITE;
const SEG = IW / N;
const OVERLAP = 1.07;
const ALBINO_SCREEN = 150; // 0..255: how much an albino stand-in is lightened // strips overlap a little so no seams show on the outside of a bend

export const spriteUrl = (key: string, open: boolean): string =>
  assetUrl(`sprites/${key}${open ? '_open' : ''}.webp`);
export const textureKey = (key: string, open: boolean): string => `beast-${key}${open ? '-open' : ''}`;

/** Queues the closed (and, if it exists, open) profile of a sprite key for loading. */
export function loadBeastSprites(scene: Phaser.Scene, key: string): void {
  if (!SPRITE_KEYS.includes(key)) return;
  for (const open of OPEN_SPRITE_KEYS.includes(key) ? [false, true] : [false]) {
    const tk = textureKey(key, open);
    if (!scene.textures.exists(tk)) scene.load.image(tk, spriteUrl(key, open));
  }
}

/**
 * Beasts that have no side profile yet but a picture from the front (the Re Corallo: a crab walks sideways, so
 * seen from the front it moves across the screen as crabs do). Drawn whole, with a scuttling sway.
 */
export const frontTextureKey = (key: string): string => `beast-front-${key}`;
export const frontOnlyKeys = (ids: string[]): string[] =>
  ids.filter((id) => !SPRITE_KEYS.includes(id) && BATTLE_ART_KEYS.includes(`${id}_front`));
export function loadFrontSprites(scene: Phaser.Scene, ids: string[]): void {
  for (const id of frontOnlyKeys(ids))
    if (!scene.textures.exists(frontTextureKey(id)))
      scene.load.image(frontTextureKey(id), assetUrl(`sprites/${id}_front.webp`));
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
  /** 0 = normal; 0..1 while turning around (own beasts, or wild ones against a wall). */
  turn?: number;
  /** The facing before the turn started. */
  turnFrom?: 1 | -1;
  /** Frenzy: red eyes and shaking. */
  rage?: boolean;
  /** Thicker than the picture (species girth). */
  girth?: number;
  /** An albino drawn with the normal sprite (no albino one yet): lightened to look pale. */
  pale?: boolean;
}

export class BeastSprite {
  readonly root: Phaser.GameObjects.Container;
  private readonly strips: Phaser.GameObjects.Image[] = [];
  private key = '';
  private open = false;
  private readonly front: Phaser.GameObjects.Image;

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
    this.front = scene.add.image(0, 0, '__WHITE').setVisible(false);
    this.root.add(this.front);
    layer.add(this.root);
    this.root.setVisible(false);
  }

  private setTextures(key: string, wantOpen: boolean): boolean {
    const open = wantOpen && this.scene.textures.exists(textureKey(key, true));
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
      this.updateFront(p);
      return;
    }
    this.front.setVisible(false);
    for (const s of this.strips) s.setVisible(true);
    const bend = Math.max(-1.2, Math.min(1.2, p.pitchV * 0.35));
    // Turning around (own beasts, or against a wall): the head turns first and the body follows
    // to the tail, each piece folding through edge-on; mid-turn the body darkens (showing its back)
    // and arches, so it reads as a turn in depth rather than a flat card flipping.
    const turning = p.turn !== undefined && p.turn > 0;
    const t = turning ? p.turn! : 0;
    const baseFace = turning ? (p.turnFrom ?? p.face) : p.face;
    const facing = (u: number): number => {
      if (!turning) return 1;
      const q = Math.max(0, Math.min(1, t * 1.7 - u * 0.7));
      return Math.cos(Math.PI * q);
    };
    const pts: [number, number][] = [];
    const ang: number[] = [];
    const lens: number[] = [];
    const fs: number[] = [];
    let px = 0;
    let py = 0;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const env = Math.pow(Math.max(0, (u - 0.35) / 0.65), 1.5);
      const th = 1.05 * env * Math.sin(p.phase - u * 2.2);
      const f = facing(u);
      const arch = turning ? -0.45 * Math.sin(Math.PI * Math.max(0, Math.min(1, t * 1.7 - u * 0.7))) : 0;
      const a = p.pitch + bend * u * u * 0.9 + 0.05 * env * Math.sin(p.phase - u * 2.2 + 1.2) + arch;
      const len = SEG * (0.62 + 0.38 * Math.cos(th));
      pts.push([px, py]);
      ang.push(a);
      lens.push(len);
      fs.push(f);
      if (i < N) {
        const fm = (f + facing((i + 1) / N)) / 2;
        px -= Math.cos(a) * len * fm;
        py -= Math.sin(a) * len;
      }
    }
    const mid = pts[Math.round(N * 0.45)]!;
    for (let i = 0; i < N; i++) {
      const s = this.strips[i]!;
      const [x, y] = pts[i]!;
      const a = (ang[i]! + ang[i + 1]!) / 2;
      const fm = (fs[i]! + fs[i + 1]!) / 2;
      const width = (lens[i]! / SEG) * OVERLAP;
      // never exactly zero wide: a thin sliver keeps the silhouette continuous
      const w = Math.sign(fm || 1) * Math.max(0.08, Math.abs(fm)) * width;
      s.setPosition(x - mid[0], y - mid[1])
        .setRotation(a)
        .setScale(w, 1);
      const shade = turning ? 0.45 + 0.55 * Math.abs(fm) : 1;
      if (p.pale && p.flash <= 0) {
        // screen tint: lightens the dark sprite towards bone white
        const k = Math.round(ALBINO_SCREEN * shade);
        s.setTintMode(Phaser.TintModes.SCREEN).setTint((k << 16) | (k << 8) | Math.round(k * 0.96));
        continue;
      }
      s.setTintMode(Phaser.TintModes.MULTIPLY);
      const base = p.flash > 0 ? [255, 154, 138] : p.rage ? [255, 208, 200] : [255, 255, 255];
      if (shade < 1 || p.flash > 0 || p.rage)
        s.setTint(((base[0]! * shade) << 16) | ((base[1]! * shade) << 8) | (base[2]! * shade));
      else s.clearTint();
    }
    const sc = p.length / IW;
    const shake = p.rage ? (Math.random() - 0.5) * p.length * 0.02 : 0;
    this.root
      .setVisible(true)
      .setPosition(p.x + shake, p.y + shake)
      .setScale(baseFace * sc, sc * (p.girth ?? 1))
      .setAlpha(p.alpha);
  }

  /** No side profile: the front picture, whole, scuttling (see frontTextureKey). */
  private updateFront(p: BeastPoseView): void {
    const tk = frontTextureKey(p.key);
    if (!this.scene.textures.exists(tk)) {
      this.root.setVisible(false);
      return;
    }
    for (const s of this.strips) s.setVisible(false);
    this.key = '';
    const im = this.front.setVisible(true);
    if (im.texture.key !== tk) im.setTexture(tk);
    const sc = p.length / im.width;
    im.setOrigin(0.5, 0.55)
      .setRotation(Math.sin(p.phase) * 0.05 + p.pitch * 0.3)
      .setScale(sc, sc * (1 + 0.03 * Math.sin(p.phase * 2)));
    if (p.flash > 0) im.setTint(0xff9a8a);
    else if (p.rage) im.setTint(0xffd0c8);
    else im.clearTint();
    this.root.setVisible(true).setPosition(p.x, p.y).setScale(1, 1).setAlpha(p.alpha);
  }

  destroy(): void {
    this.root.destroy();
  }
}

// A big beast drawn from its painted side profile, bent along the spine (drawShark in
// prototype/prova-realistica.html). Phaser 4 has no Rope/Mesh, so the image is cut into vertical strips:
// each strip follows one spine segment (rotated and shortened in perspective as the tail swings).
import Phaser from 'phaser';
import { assetUrl } from '../data/assets';
import { BEAST_SPRITE } from '../data/beasts';
import { BATTLE_ART_KEYS, OPEN_SPRITE_KEYS, SPRITE_KEYS } from '../data/sprites.generated';

const {
  frameW: IW,
  frameH: IH,
  spineY: CY,
  segments: N,
  turnBreadth,
  turnBreadthWhale,
  whaleWave,
} = BEAST_SPRITE;
const SEG = IW / N;
const OVERLAP = 1.07;
const TURN_MIN = 0.12; // the profile never narrows below this share of its length while it turns
const ALBINO_SCREEN = 150; // 0..255: how much an albino stand-in is lightened // strips overlap a little so no seams show on the outside of a bend

export const spriteUrl = (key: string, open: boolean): string =>
  assetUrl(`sprites/${key}${open ? '_open' : ''}.webp`);
export const textureKey = (key: string, open: boolean): string => `beast-${key}${open ? '-open' : ''}`;

/** A profile's body: for each piece (head first) its top and bottom around the spine, and its main colour. */
interface BodyOutline {
  span: [number, number][];
  color: number;
}
const outlines = new Map<string, BodyOutline>();

/** Reads the outline of a loaded profile once (the alpha of the picture, column by column). */
function bodyOutline(scene: Phaser.Scene, tk: string): BodyOutline | null {
  const hit = outlines.get(tk);
  if (hit) return hit;
  const src = scene.textures.get(tk).getSourceImage() as CanvasImageSource & {
    width: number;
    height: number;
  };
  if (!src || !src.width) return null;
  const c = document.createElement('canvas');
  c.width = IW;
  c.height = IH;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(src, 0, 0, IW, IH);
  const data = ctx.getImageData(0, 0, IW, IH).data;
  const span: [number, number][] = [];
  let r = 0;
  let gg = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i <= N; i++) {
    // piece i starts at the head (the right edge of the picture)
    const x = Math.min(IW - 1, Math.max(0, Math.round(IW - i * SEG - 1)));
    let top = CY;
    let bottom = CY;
    for (let y = 0; y < IH; y++) {
      const k = (y * IW + x) * 4;
      if (data[k + 3]! < 128) continue;
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      if (Math.abs(y - CY) < 40) {
        r += data[k]!;
        gg += data[k + 1]!;
        b += data[k + 2]!;
        n++;
      }
    }
    span.push([top - CY, bottom - CY]);
  }
  const color = n ? (Math.round(r / n) << 16) | (Math.round(gg / n) << 8) | Math.round(b / n) : 0x3a4048;
  const o = { span, color };
  outlines.set(tk, o);
  return o;
}

const scaleColor = (c: number, k: number): number =>
  (Math.round(((c >> 16) & 255) * k) << 16) |
  (Math.round(((c >> 8) & 255) * k) << 8) |
  Math.round((c & 255) * k);

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
  /** A whale or a dolphin: the tail beats up and down, and it is bulkier when it turns. */
  whale?: boolean;
}

export class BeastSprite {
  readonly root: Phaser.GameObjects.Container;
  private readonly strips: Phaser.GameObjects.Image[] = [];
  /** The body's thickness while it turns (the "ham"), drawn behind the profile. */
  private readonly slab: Phaser.GameObjects.Graphics;
  private outline: BodyOutline | null = null;
  private key = '';
  private open = false;
  private readonly front: Phaser.GameObjects.Image;

  constructor(
    private readonly scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
  ) {
    this.root = scene.add.container(0, 0);
    for (let i = 0; i < N; i++) this.strips.push(scene.add.image(0, 0, '__WHITE').setOrigin(1, CY / IH));
    // the thickness behind everything, then the profile tail first so the head is drawn on top
    this.slab = scene.add.graphics();
    this.root.add(this.slab);
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
    this.outline = bodyOutline(this.scene, tk);
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
    // Turning around (own beasts, or against a wall), like a sandwich (owner, 4 ottobre): the profile narrows to
    // its edge while the body's thickness opens behind it, as wide as the animal; the head leads a little.
    const turning = p.turn !== undefined && p.turn > 0;
    const t = turning ? p.turn! : 0;
    const baseFace = turning ? (p.turnFrom ?? p.face) : p.face;
    // the body's breadth, a share of its length (whales are bulkier)
    const breadth = p.whale ? turnBreadthWhale : turnBreadth;
    // seen from the side, an animal turning round shrinks only sideways: the whole picture narrows (the root's
    // width), the pieces keep their shape, so nothing breaks into steps
    const turnF = turning ? Math.cos(Math.PI * t) : 1;
    const facing = (_u: number): number => 1;
    const pts: [number, number][] = [];
    const ang: number[] = [];
    const lens: number[] = [];
    const fs: number[] = [];
    let px = 0;
    let py = 0;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const env = Math.pow(Math.max(0, (u - 0.35) / 0.65), 1.5);
      const f = facing(u);
      let a: number;
      let len: number;
      if (p.whale) {
        // whales and dolphins: the tail beats up and down, the thick front of the body stays whole
        const tail = Math.pow(Math.max(0, (u - whaleWave.from) / (1 - whaleWave.from)), 1.6);
        a = p.pitch + bend * u * u * 0.9 + whaleWave.amp * tail * Math.sin(p.phase - u * whaleWave.waves);
        len = SEG;
      } else {
        // sharks and fish: the tail swings sideways, shortening in perspective
        const th = 1.05 * env * Math.sin(p.phase - u * 2.2);
        a = p.pitch + bend * u * u * 0.9 + 0.05 * env * Math.sin(p.phase - u * 2.2 + 1.2);
        len = SEG * (0.62 + 0.38 * Math.cos(th));
      }
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
      const w = fm * width;
      s.setPosition(x - mid[0], y - mid[1])
        .setRotation(a)
        .setScale(w, 1);
      // seen edge-on it darkens a little (its back or belly turns to you)
      const shade = turning ? 0.7 + 0.3 * Math.abs(turnF) : 1;
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
    this.drawThickness(turning ? t : 0, turnF, pts, ang, mid, breadth, p.whale === true);
    const sc = p.length / IW;
    const shake = p.rage ? (Math.random() - 0.5) * p.length * 0.02 : 0;
    this.root
      .setVisible(true)
      .setPosition(p.x + shake, p.y + shake)
      .setScale(
        baseFace * sc * Math.sign(turnF || 1) * Math.max(TURN_MIN, Math.abs(turnF)),
        sc * (p.girth ?? 1),
      )
      .setAlpha(p.alpha);
  }

  /**
   * The body's thickness while it turns (owner, 4 ottobre: "the ham between two slices of bread"): the outline
   * of the body swept sideways by its breadth × how far it has turned, filled with its own colour, darkened. The
   * profile narrows to its edge in front of it, so mid-turn you see a solid body, never a sheet of paper.
   */
  private drawThickness(
    t: number,
    turnF: number,
    pts: [number, number][],
    ang: number[],
    mid: [number, number],
    breadth: number,
    whale: boolean,
  ): void {
    const g = this.slab.clear();
    const o = this.outline;
    if (t <= 0 || !o) return;
    const open = Math.sin(Math.PI * t);
    if (open < 0.02) return;
    // in the picture's own coordinates, which the turn narrows: the depth keeps its real width on screen and
    // always opens the same way
    const narrow = Math.max(TURN_MIN, Math.abs(turnF));
    const depth = ((breadth * IW * open * (whale ? 1 : 0.9)) / narrow) * Math.sign(turnF || 1);
    // the body as a tube: at each piece an ellipse as tall as the body there and as deep as it is thick (thick
    // where the body is tall, thin at nose and tail), set behind the profile; together a rounded solid body
    const tall = Math.max(...o.span.map(([a, b]) => b - a), 1);
    const k = 1 + 0.12 * Math.abs(turnF); // its own colour, a little darker mid-turn
    g.fillStyle(scaleColor(o.color, Math.min(1.25, k)), 1);
    for (let i = 0; i <= N; i++) {
      const [t0, b0] = o.span[i]!;
      if (b0 - t0 < 2) continue;
      const a = ang[Math.min(i, ang.length - 1)]!;
      const [x, y] = pts[i]!;
      const d = depth * Math.sqrt((b0 - t0) / tall);
      const midY = (t0 + b0) / 2;
      const cx = x - mid[0] - Math.sin(a) * midY; // around the profile: edge-on you see the body from the front
      const cy = y - mid[1] + Math.cos(a) * midY;
      g.fillEllipse(cx, cy, Math.abs(d), b0 - t0, 24);
    }
  }

  /** No side profile: the front picture, whole, scuttling (see frontTextureKey). */
  private updateFront(p: BeastPoseView): void {
    const tk = frontTextureKey(p.key);
    if (!this.scene.textures.exists(tk)) {
      this.root.setVisible(false);
      return;
    }
    for (const s of this.strips) s.setVisible(false);
    this.slab.clear();
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

// A big beast drawn from its painted side profile, bent along the spine (drawShark in
// prototype/prova-realistica.html). Phaser 4 has no Rope/Mesh, so the image is cut into vertical strips:
// each strip follows one spine segment (rotated and shortened in perspective as the tail swings).
import Phaser from 'phaser';
import { assetUrl } from '../data/assets';
import { BEAST_SPRITE, WING_FRAME_FORMS } from '../data/beasts';
import { spineOf } from './swimPose';
import { BATTLE_ART_KEYS, GLOW_KEYS, OPEN_SPRITE_KEYS, SPRITE_KEYS } from '../data/sprites.generated';
import { glowAt, glowOf } from '../systems/glowPulse';
import { BEAST_EYES, EYE_GLOW } from '../data/beastEyes';

const { frameW: IW, frameH: IH, spineY: CY, segments: N } = BEAST_SPRITE;
const SEG = IW / N;
const OVERLAP = 1.07;
const ALBINO_SCREEN = 150; // 0..255: how much an albino stand-in is lightened // strips overlap a little so no seams show on the outside of a bend

const spriteUrl = (key: string, open: boolean): string =>
  assetUrl(`sprites/${key}${open ? '_open' : ''}.webp`);
export const textureKey = (key: string, open: boolean): string => `beast-${key}${open ? '-open' : ''}`;
/** Its glow (data/glow.ts, public/glow), laid over it like light. */
const glowKey = (key: string, open: boolean): string => `glow-${key}${open ? '-open' : ''}`;
const hasGlow = (key: string, open: boolean): boolean => GLOW_KEYS.includes(`${key}${open ? '_open' : ''}`);

/** Queues the closed (and, if it exists, open) profile of a sprite key for loading. */
export function loadBeastSprites(scene: Phaser.Scene, key: string): void {
  if (!SPRITE_KEYS.includes(key)) return;
  for (const open of OPEN_SPRITE_KEYS.includes(key) ? [false, true] : [false]) {
    const tk = textureKey(key, open);
    if (!scene.textures.exists(tk)) scene.load.image(tk, spriteUrl(key, open));
    const gk = glowKey(key, open);
    if (hasGlow(key, open) && !scene.textures.exists(gk))
      scene.load.image(gk, assetUrl(`glow/${key}${open ? '_open' : ''}.webp`));
  }
}

/**
 * Beasts that have no side profile yet but a picture from the front (the Re Corallo: a crab walks sideways, so
 * seen from the front it moves across the screen as crabs do). Drawn whole, with a scuttling sway.
 */
const frontTextureKey = (key: string): string => `beast-front-${key}`;
const frontOnlyKeys = (ids: string[]): string[] =>
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
    // its glow is cut the same way (same frame)
    for (const k of [tk, glowKey(key, open)]) {
      if (!scene.textures.exists(k)) continue;
      const tex = scene.textures.get(k);
      if (tex.has('s0')) continue;
      for (let i = 0; i < N; i++) {
        const x1 = Math.round(IW * (1 - i / N));
        const x0 = Math.round(IW * (1 - (i + 1) / N));
        tex.add(`s${i}`, 0, x0, 0, x1 - x0, IH);
      }
    }
  }
  return ok;
}

interface BeastPoseView {
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
  /** Frenzy: red eyes and shaking. */
  rage?: boolean;
  /** Thicker than the picture (species girth). */
  girth?: number;
  /** An albino drawn with the normal sprite (no albino one yet): lightened to look pale. */
  pale?: boolean;
  /** A whale or a dolphin: the tail beats up and down. */
  whale?: boolean;
  /** A serpent or an eel: a wave along the whole body, no piece shortened (BEAST_SPRITE.serpentWave). */
  serpent?: boolean;
  /** An octopus or a squid: arms waving and opening with the jet (BEAST_SPRITE.cephalopodWave). */
  cephalopod?: boolean;
  /** Walking on the floor (a crab): the body whole. */
  walker?: boolean;
  /** Murky water, far from your light: only its dark shape shows (this tint; clarity.ts). */
  shade?: number;
  /** It hunts you: its eyes glow red (data/beastEyes.ts), even in the dark. */
  hunt?: boolean;
}

/** A soft red light, made once: bright in the middle, fading out to nothing (no edge). */
function eyeGlowTexture(scene: Phaser.Scene): string {
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

export class BeastSprite {
  readonly root: Phaser.GameObjects.Container;
  private readonly strips: Phaser.GameObjects.Image[] = [];
  /** Its glow over the strips, piece by piece (runes that pulse along it, eyes that shine). */
  private readonly glows: Phaser.GameObjects.Image[] = [];
  private glowOn = false;
  private key = '';
  private open = false;
  private readonly front: Phaser.GameObjects.Image;
  /** Its eye's red glow: part of the beast, so whatever swims in front of it covers it (owner, 25 ottobre). */
  private readonly eye: Phaser.GameObjects.Image;
  /** Where its eye glows now (the light mask lets it show in the dark), or null. */
  eyeSpot: { x: number; y: number; r: number } | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
  ) {
    this.root = scene.add.container(0, 0);
    for (let i = 0; i < N; i++) this.strips.push(scene.add.image(0, 0, '__WHITE').setOrigin(1, CY / IH));
    // tail first so the head is drawn on top
    this.root.add([...this.strips].reverse());
    for (let i = 0; i < N; i++)
      this.glows.push(
        scene.add
          .image(0, 0, '__WHITE')
          .setOrigin(1, CY / IH)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setVisible(false),
      );
    this.root.add(this.glows);
    this.front = scene.add.image(0, 0, '__WHITE').setVisible(false);
    this.root.add(this.front);
    this.eye = scene.add
      .image(0, 0, eyeGlowTexture(scene))
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);
    this.root.add(this.eye);
    layer.add(this.root);
    this.root.setVisible(false);
  }

  private setTextures(key: string, wantOpen: boolean): boolean {
    const open = wantOpen && this.scene.textures.exists(textureKey(key, true));
    if (key === this.key && open === this.open) return true;
    const tk = textureKey(key, open);
    if (!this.scene.textures.exists(tk)) return false;
    this.strips.forEach((s, i) => s.setTexture(tk, `s${i}`));
    const gk = glowKey(key, open);
    this.glowOn = this.scene.textures.exists(gk) && this.scene.textures.get(gk).has('s0');
    if (this.glowOn) this.glows.forEach((g, i) => g.setTexture(gk, `s${i}`));
    this.key = key;
    this.open = open;
    return true;
  }

  hide(): void {
    this.root.setVisible(false);
    this.eyeSpot = null;
  }

  /** The red glow on its painted eye, following the head's piece of the picture. */
  private updateEye(p: BeastPoseView): void {
    const at = BEAST_EYES[p.key];
    this.eyeSpot = null;
    if (!p.hunt || !at || p.flash > 0) {
      this.eye.setVisible(false);
      return;
    }
    const [ex, ey] = at;
    const i = Math.min(N - 1, Math.max(0, Math.floor((IW - ex) / SEG)));
    const s = this.strips[i]!;
    // the point in the piece (its origin: the piece's right edge on the spine), then in the beast
    const dx = (ex - IW * (1 - i / N)) * s.scaleX;
    const dy = (ey - CY) * s.scaleY;
    const cos = Math.cos(s.rotation);
    const sin = Math.sin(s.rotation);
    const r = this.root;
    const t = this.scene.time.now / 1000;
    const size = Math.max(EYE_GLOW.minSize, EYE_GLOW.size * Math.abs(r.scaleY));
    const throb = 1 - EYE_GLOW.pulseDepth * (0.5 + 0.5 * Math.sin(t * EYE_GLOW.pulse));
    const lx = s.x + dx * cos - dy * sin;
    const ly = s.y + dx * sin + dy * cos;
    const k = size / Math.abs(r.scaleY) / this.eye.width; // in the beast's own (scaled) frame
    this.eye
      .setVisible(true)
      .setPosition(lx, ly)
      .setScale(k)
      .setAlpha(EYE_GLOW.alpha * throb);
    this.eyeSpot = { x: r.x + lx * r.scaleX, y: r.y + ly * r.scaleY, r: size * EYE_GLOW.light };
  }

  /** Its glow follows each strip; a pulse runs along it (systems/glowPulse.ts). Off while it flashes red. */
  private updateGlow(p: BeastPoseView): void {
    const def = this.glowOn && p.flash <= 0 ? glowOf(p.key) : undefined;
    const t = this.scene.time.now / 1000;
    for (let i = 0; i < N; i++) {
      const g = this.glows[i]!;
      if (!def) {
        g.setVisible(false);
        continue;
      }
      const s = this.strips[i]!;
      g.setVisible(true)
        .setPosition(s.x, s.y)
        .setRotation(s.rotation)
        .setScale(s.scaleX, s.scaleY)
        .setAlpha(glowAt(def, t, i / (N - 1)));
    }
  }

  update(p: BeastPoseView): void {
    // wings up and down (WING_FRAME_FORMS): the two pictures alternate with its swimming, never a bite
    const open = WING_FRAME_FORMS.includes(p.key) ? Math.sin(p.phase) > 0 : p.jaw > 0;
    if (!this.setTextures(p.key, open)) {
      this.updateFront(p);
      return;
    }
    this.front.setVisible(false);
    for (const s of this.strips) s.setVisible(true);
    // no turning animation: a beast faces its new way at once (owner, 4 ottobre: every animated turn of a flat
    // painted profile looked like a sheet of paper)
    const { pts, ang, lens, tall } = spineOf(p);
    const mid = pts[Math.round(N * 0.45)]!;
    // a thicker body (species girth) is made thicker piece by piece, across each piece: thickening the whole beast
    // stretched the pieces as they turned (owner, 20 ottobre: Folgore longer, shorter, thinner going up and down)
    const girth = p.girth ?? 1;
    for (let i = 0; i < N; i++) {
      const s = this.strips[i]!;
      const [x, y] = pts[i]!;
      const a = (ang[i]! + ang[i + 1]!) / 2;
      s.setPosition(x - mid[0], y - mid[1])
        .setRotation(a)
        .setScale((lens[i]! / SEG) * OVERLAP, girth * ((tall[i]! + tall[i + 1]!) / 2));
      if (p.shade !== undefined && p.flash <= 0) {
        s.setTintMode(Phaser.TintModes.MULTIPLY).setTint(p.shade);
        continue;
      }
      if (p.pale && p.flash <= 0) {
        // screen tint: lightens the dark sprite towards bone white
        const k = ALBINO_SCREEN;
        s.setTintMode(Phaser.TintModes.SCREEN).setTint((k << 16) | (k << 8) | Math.round(k * 0.96));
        continue;
      }
      s.setTintMode(Phaser.TintModes.MULTIPLY);
      const base = p.flash > 0 ? [255, 154, 138] : p.rage ? [255, 208, 200] : [255, 255, 255];
      if (p.flash > 0 || p.rage) s.setTint((base[0]! << 16) | (base[1]! << 8) | base[2]!);
      else s.clearTint();
    }
    this.updateGlow(p);
    const sc = p.length / IW;
    const shake = p.rage ? (Math.random() - 0.5) * p.length * 0.02 : 0;
    this.root
      .setVisible(true)
      .setPosition(p.x + shake, p.y + shake)
      .setScale(p.face * sc, sc)
      .setAlpha(p.alpha);
    this.updateEye(p);
  }

  /** No side profile: the front picture, whole, scuttling (see frontTextureKey). */
  private updateFront(p: BeastPoseView): void {
    const tk = frontTextureKey(p.key);
    if (!this.scene.textures.exists(tk)) {
      this.root.setVisible(false);
      return;
    }
    for (const s of this.strips) s.setVisible(false);
    for (const g of this.glows) g.setVisible(false);
    this.eye.setVisible(false);
    this.eyeSpot = null;
    this.key = '';
    const im = this.front.setVisible(true);
    if (im.texture.key !== tk) im.setTexture(tk);
    const sc = p.length / im.width;
    im.setOrigin(0.5, 0.55)
      .setRotation(Math.sin(p.phase) * 0.05 + p.pitch * 0.3)
      .setScale(sc, sc * (1 + 0.03 * Math.sin(p.phase * 2)));
    if (p.flash > 0) im.setTint(0xff9a8a);
    else if (p.shade !== undefined) im.setTint(p.shade);
    else if (p.rage) im.setTint(0xffd0c8);
    else im.clearTint();
    this.root.setVisible(true).setPosition(p.x, p.y).setScale(1, 1).setAlpha(p.alpha);
  }

  destroy(): void {
    this.root.destroy();
  }
}

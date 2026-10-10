// The ship's paintings (owner's art): hatches closed and open in the same frame, an open one fading in while its
// hatch opens, the turning propeller, the pulsing red glow; diving, the hull under the waves seen through the water.
// Look only: placed by shipView.ts.
import Phaser from 'phaser';
import type { ShipModelDef } from '../data/fleet';
import { shipLength, shipPicture } from '../systems/ship/model';
import { hatchT, type ShipState } from '../systems/ship/ship';
import { WORLD_ART_KEYS } from '../data/sprites.generated';

const UNDERWATER_TINT = 0x6f97a6;
/** A diving U-Boat's hull under the sea is drawn in this many upright strips, each cut where the wave crosses it
 *  (owner, 9 ottobre: it darkened along a straight line under uneven waves). */
const STRIPS = 40;

interface Part {
  /** The whole picture, as it is. */
  full: Phaser.GameObjects.Image;
  /** Over it, under the waves, the same picture seen through the water, in strips. */
  under: Phaser.GameObjects.Image[];
}

/**
 * One copy of the ship: its pictures, each whole with its under-water strips over it. Closed first; then, with two
 * hatches, each one open alone and both open; with one, it open; last the propeller turning, if painted.
 */
export class ShipPictures {
  private readonly parts: Part[];
  /** For each part: how open it shows (from the hatches), or the propeller turning. */
  private readonly roles: ('closed' | number | 'all' | 'moving' | 'mouth' | 'mouthMoving')[] = [];
  /** Its lit red parts, added on top and pulsing (art.glow). */
  private readonly glow: Phaser.GameObjects.Image | null;

  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer | Phaser.GameObjects.Container,
    art: NonNullable<ShipModelDef['art']>,
    bays: ShipModelDef['bays'],
  ) {
    const make = (key: string): Phaser.GameObjects.Image => scene.add.image(0, 0, key).setVisible(false);
    this.parts = [];
    const add = (key: string, role: (typeof this.roles)[number]): void => {
      if (!WORLD_ART_KEYS.includes(key)) return;
      const full = make(`world-${key}`);
      const under = Array.from({ length: STRIPS }, () => make(`world-${key}`).setTint(UNDERWATER_TINT));
      this.parts.push({ full, under });
      layer.add([full, ...under]);
      this.roles.push(role);
    };
    add(art.closed, 'closed');
    if (bays.length > 1) {
      for (const [i, bay] of bays.entries()) if (bay.open) add(bay.open, i);
      add(art.open, 'all');
    } else add(art.open, 0);
    if (art.moving) add(art.moving, 'moving');
    // the Krill Hunter's mouth, still and running, over the rest
    if (art.mouth) {
      add(art.mouth.open, 'mouth');
      add(art.mouth.moving, 'mouthMoving');
    }
    this.glow =
      art.glow && WORLD_ART_KEYS.includes(art.glow)
        ? make(`world-${art.glow}`).setBlendMode(Phaser.BlendModes.ADD)
        : null;
    if (this.glow) layer.add(this.glow);
  }

  hide(): void {
    for (const p of this.parts) for (const im of [p.full, ...p.under]) im.setVisible(false);
    this.glow?.setVisible(false);
  }

  /** How much a picture shows: each open hatch fades in over the closed one, both open over both; the turning
   *  propeller over all while it pushes. */
  private alphaOf(s: ShipState, role: (typeof this.roles)[number]): number {
    if (role === 'closed') return 1;
    if (typeof role === 'number') return hatchT(s, role);
    const most = Math.max(0, ...s.hatches.map((h) => h.t));
    if (role === 'all') return s.hatches.reduce((a, h) => a * h.t, 1);
    const run = Math.min(1, Math.max(0, (s.prop - 0.05) / 0.25));
    if (role === 'mouth') return s.mouthT * (1 - run);
    if (role === 'mouthMoving') return s.mouthT * run;
    return run * (1 - most);
  }

  /**
   * Places it: centre x, top of the picture y, scale, pitch (radians, bow up > 0), and the sea's surface (world y at
   * a world x) when it is diving: under it the picture is seen through the water, cut along the waves themselves.
   * Afloat (null) the whole picture shows and the sea in front of it is drawn by waterOver. `wet`: how strongly the
   * part under the waves is tinted (0 … 1), growing as it goes down.
   */
  place(
    s: ShipState,
    x: number,
    top: number,
    scale: number,
    pitch: number,
    seaY: ((x: number) => number) | null,
    time = 0,
    wet = 1,
  ): void {
    const w = shipLength(s) * scale;
    const h = w * shipPicture(s).aspect;
    const cy = top + h / 2;
    const rot = -s.face * pitch;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    if (this.glow) {
      const sc = w / this.glow.width;
      this.glow
        .setVisible(true)
        .setPosition(x, cy)
        .setScale(sc * s.face, sc)
        .setRotation(rot)
        .setAlpha(0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * Math.PI * 1.6)));
    }
    for (const [i, p] of this.parts.entries()) {
      const alpha = this.alphaOf(s, this.roles[i]!);
      const show = alpha > 0.01;
      const W = p.full.width;
      const H = p.full.height;
      const sc = w / W;
      p.full
        .setVisible(show)
        .setPosition(x, cy)
        .setScale(sc * s.face, sc)
        .setRotation(rot)
        .setAlpha(alpha);
      const sw = W / STRIPS;
      for (const [j, im] of p.under.entries()) {
        if (!show || !seaY) {
          im.setVisible(false);
          continue;
        }
        const u0 = Math.floor(j * sw);
        const u1 = Math.min(W, Math.ceil((j + 1) * sw));
        // the strip's middle along the hull (the picture is mirrored when facing west), the sea there, and where
        // that falls in the picture's own frame (turned by the pitch)
        const lx = ((u0 + u1) / 2 - W / 2) * sc * s.face;
        const ly = (seaY(x + lx * cos) - cy - lx * sin) / cos;
        const v = Math.max(0, Math.min(H, Math.round(ly / sc + H / 2)));
        im.setVisible(v < H)
          .setPosition(x, cy)
          .setScale(sc * s.face, sc)
          .setRotation(rot)
          .setAlpha(alpha * wet)
          .setCrop(u0, v, u1 - u0, H - v);
      }
    }
  }
}

// The expedition ship (data/ship.ts): the owner's two paintings (hatch closed and open, the same frame, so the
// open one fades in while the hatch opens). Its waterline sits on the sea surface; the hull under it is drawn
// darker and bluer, as seen through the water. It rocks with the waves (more in bad weather), lifts its bow and
// throws foam when it planes at speed, leaves a wake. On the far lane (sailing round something) it is drawn smaller,
// darker and behind the rock. Look only: systems/ship/ moves it.
import Phaser from 'phaser';
import { SHIP } from '../data/ship';
import { WORLD } from '../data/worldLayout';
import { WORLD_ART_KEYS } from '../data/sprites.generated';
import { SHIP_HEIGHT } from '../systems/ship/geometry';
import type { ShipState } from '../systems/ship/ship';

const P = SHIP.picture;
const UNDERWATER_TINT = 0x6f97a6;
const FAR_TINT = 0x7f8c94;

/** One copy of the ship: the closed and open pictures, each cut at the waterline (above / below). */
class ShipPictures {
  readonly parts: Phaser.GameObjects.Image[];

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer | Phaser.GameObjects.Container) {
    const make = (key: string): Phaser.GameObjects.Image => scene.add.image(0, 0, key).setVisible(false);
    const closed = `world-${SHIP.art}`;
    const open = `world-${SHIP.artOpen}`;
    this.parts = [make(closed), make(closed), make(open), make(open)];
    layer.add(this.parts);
    for (const [i, im] of this.parts.entries()) {
      const below = i % 2 === 1;
      const h = im.height;
      const cut = Math.round(P.waterline * h);
      if (below) im.setCrop(0, cut, im.width, h - cut).setTint(UNDERWATER_TINT);
      else im.setCrop(0, 0, im.width, cut);
    }
  }

  hide(): void {
    for (const im of this.parts) im.setVisible(false);
  }

  /** Places it: centre x, top of the picture y, scale, pitch (radians, bow up > 0), open share, darkening. */
  place(s: ShipState, x: number, top: number, scale: number, pitch: number, dark: number): void {
    const w = SHIP.length * scale;
    const h = w * P.aspect;
    for (const [i, im] of this.parts.entries()) {
      const open = i >= 2;
      const alpha = open ? s.hatch : 1;
      const sc = w / im.width;
      im.setVisible(alpha > 0.01)
        .setPosition(x, top + h / 2)
        .setScale(sc * s.face, sc)
        .setRotation(-s.face * pitch)
        .setAlpha(alpha);
      if (dark > 0) im.setTint(i % 2 ? UNDERWATER_TINT : FAR_TINT);
      else if (i % 2 === 0) im.clearTint();
    }
  }
}

export class ShipView {
  private readonly near: ShipPictures | null;
  private readonly far: ShipPictures | null;
  private readonly fx: Phaser.GameObjects.Graphics;
  private readonly fallback: Phaser.GameObjects.Graphics;

  /** `farLayer` is drawn behind the rock (the far lane); `layer` in front, with the diver and the beasts. */
  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    farLayer: Phaser.GameObjects.Layer | Phaser.GameObjects.Container,
  ) {
    const painted = WORLD_ART_KEYS.includes(SHIP.art) && WORLD_ART_KEYS.includes(SHIP.artOpen);
    this.far = painted ? new ShipPictures(scene, farLayer) : null;
    this.fallback = scene.add.graphics();
    layer.add(this.fallback);
    this.near = painted ? new ShipPictures(scene, layer) : null;
    this.fx = scene.add.graphics();
    layer.add(this.fx);
  }

  /** @param waves the weather's surface waves (1 = calm) */
  update(s: ShipState, time: number, waves: number): void {
    this.fx.clear();
    this.fallback.clear();
    if (!s.owned) {
      this.near?.hide();
      this.far?.hide();
      return;
    }
    const k = s.speed / SHIP.maxSpeed;
    // rocking on the swell (more in bad weather), planing at speed
    const R = SHIP.rock;
    const sea = Math.min(3, waves);
    const heave = Math.sin(time * Math.PI * 2 * R.hz) * R.heave * sea;
    const roll = Math.sin(time * Math.PI * 2 * R.hz * 0.8 + 1.3) * R.pitch * sea;
    const planing = Math.max(0, (k - SHIP.plane.from) / (1 - SHIP.plane.from));
    const pitch = roll + planing * SHIP.plane.pitch;
    const lift = planing * SHIP.plane.lift;
    const lane = s.lane;
    const scale = 1 - (1 - SHIP.lane.scale) * lane;
    // on the far lane the waterline stays on the surface, a little higher (further away)
    const w = SHIP.length * scale;
    const top = WORLD.surfaceY - P.waterline * w * P.aspect + heave - lift - SHIP.lane.lift * lane;
    const farSide = lane >= 0.5;
    if (this.near && this.far) {
      (farSide ? this.near : this.far).hide();
      (farSide ? this.far : this.near).place(s, s.x, top, scale, pitch, farSide ? SHIP.lane.darken : 0);
    } else this.drawFallback(s, top, scale);
    if (!farSide) this.drawWake(s, k, planing, time, heave);
  }

  /** No picture yet: a dark hull with a wheelhouse. */
  private drawFallback(s: ShipState, top: number, scale: number): void {
    const g = this.fallback;
    const L = SHIP.length * scale;
    const H = SHIP_HEIGHT * scale;
    const wl = top + P.waterline * H;
    g.fillStyle(0x2c2a27, 1).fillRect(s.x - L * 0.45, top + 0.3 * H, L * 0.9, wl - top - 0.3 * H);
    g.fillStyle(0x1f2a30, 1).fillRect(s.x - L * 0.42, wl, L * 0.84, (P.keel - P.waterline) * H);
    g.fillStyle(0x3a3530, 1).fillRect(
      s.x + s.face * (P.helmX - 0.5) * L - L * 0.06,
      top + 0.1 * H,
      L * 0.12,
      0.2 * H,
    );
  }

  /** Foam at the bow and the stern, a wake behind, spray when it planes. */
  private drawWake(s: ShipState, k: number, planing: number, time: number, heave: number): void {
    if (k < 0.03) return;
    const g = this.fx;
    const L = SHIP.length;
    const bow = s.x + s.face * L * 0.47;
    const stern = s.x - s.face * L * 0.46;
    const y = WORLD.surfaceY + heave * 0.3;
    for (let i = 0; i < 14; i++) {
      const t = (time * (0.8 + k) + i / 14) % 1;
      // the wake: foam left behind, spreading and fading
      const wx = stern - s.face * t * (40 + 120 * k);
      g.fillStyle(0xe8f2f4, 0.35 * k * (1 - t));
      g.fillEllipse(wx, y + Math.sin(i * 1.7) * 1.2, 6 + t * 14, 1.6 + t * 1.2);
      // the bow wave
      const bx = bow - s.face * t * 10;
      g.fillStyle(0xf4fafb, 0.5 * k * (1 - t));
      g.fillEllipse(bx, y - 1 + t * 0.5, 3 + t * 6, 1.4);
    }
    if (planing > 0)
      for (let i = 0; i < 8; i++) {
        const t = (time * 2.2 + i / 8) % 1;
        g.fillStyle(0xffffff, 0.45 * planing * (1 - t));
        g.fillCircle(bow + s.face * (2 + t * 8), y - 2 - t * 9 + t * t * 8, 0.8 + t * 1.6);
      }
  }
}

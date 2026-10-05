// The expedition ship (data/ship.ts): the owner's two paintings (hatch closed and open, the same frame, so the
// open one fades in while the hatch opens). Its waterline sits on the sea surface; the hull under it is drawn
// darker and bluer, as seen through the water. It rocks with the waves (more in bad weather), lifts its bow and
// throws foam when it planes at speed, leaves a wake and bubbles behind its propeller. Its windows and lanterns glow,
// a floodlight shines down from under the hull (owner, 5 ottobre: "più viva"). After the rescue flare a tug tows it.
// Look only: systems/ship/ moves it.
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
  private readonly pics: ShipPictures | null;
  private readonly fx: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly fallback: Phaser.GameObjects.Graphics;
  private readonly tug: Phaser.GameObjects.Image | null;
  private tugLeft = 0;
  private tugFrom = 0;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    const painted = WORLD_ART_KEYS.includes(SHIP.art) && WORLD_ART_KEYS.includes(SHIP.artOpen);
    this.fallback = scene.add.graphics();
    layer.add(this.fallback);
    this.tug = WORLD_ART_KEYS.includes(SHIP.tug.art)
      ? scene.add.image(0, 0, `world-${SHIP.tug.art}`).setVisible(false)
      : null;
    if (this.tug) layer.add(this.tug);
    this.pics = painted ? new ShipPictures(scene, layer) : null;
    this.fx = scene.add.graphics();
    this.glow = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    layer.add([this.fx, this.glow]);
  }

  /** The rescue flare: a tug comes and tows the ship (look only), then sails off. */
  towed(s: ShipState): void {
    this.tugLeft = SHIP.tug.seconds;
    this.tugFrom = s.x;
  }

  /** @param waves the weather's surface waves (1 = calm) */
  update(s: ShipState, time: number, dt: number, waves: number): void {
    this.fx.clear();
    this.glow.clear();
    this.fallback.clear();
    if (!s.owned) {
      this.pics?.hide();
      this.tug?.setVisible(false);
      return;
    }
    const k = Math.min(1, s.speed / SHIP.maxSpeed);
    // rocking on the swell (more in bad weather), planing at speed
    const R = SHIP.rock;
    const sea = Math.min(3, waves);
    const heave = Math.sin(time * Math.PI * 2 * R.hz) * R.heave * sea;
    const roll = Math.sin(time * Math.PI * 2 * R.hz * 0.8 + 1.3) * R.pitch * sea;
    const planing = Math.max(0, (k - SHIP.plane.from) / (1 - SHIP.plane.from));
    const pitch = roll + planing * SHIP.plane.pitch;
    const lift = planing * SHIP.plane.lift;
    const top = WORLD.surfaceY - P.waterline * SHIP_HEIGHT + heave - lift;
    if (this.pics) this.pics.place(s, s.x, top, 1, pitch, 0);
    else this.drawFallback(s, top);
    this.drawWake(s, k, planing, time, heave);
    this.drawLights(s, top, time);
    this.drawTug(s, top, dt);
  }

  /** A point of the picture (shares) in the world, at this top. */
  private at(s: ShipState, top: number, u: number, v: number): { x: number; y: number } {
    return { x: s.x + s.face * (u - 0.5) * SHIP.length, y: top + v * SHIP_HEIGHT };
  }

  /** Lit windows and lanterns (where the painting has them), and the floodlight under the hull. */
  private drawLights(s: ShipState, top: number, time: number): void {
    const g = this.glow;
    for (const [u, v, r] of SHIP.lights.windows) {
      const p = this.at(s, top, u, v);
      const flicker = 0.85 + 0.15 * Math.sin(time * 7 + u * 40);
      g.fillStyle(0xffc56a, 0.18 * flicker).fillCircle(p.x, p.y, r * 3);
      g.fillStyle(0xffe2a8, 0.55 * flicker).fillCircle(p.x, p.y, r);
    }
    // the floodlight: a soft cone straight down from the keel
    const f = SHIP.lights.flood;
    const p = this.at(s, top, f.u, f.v);
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      g.fillStyle(0xcfe8ff, 0.12 * (1 - t * 0.8)).fillEllipse(
        p.x,
        p.y + t * f.reach,
        8 + t * f.reach * 0.9,
        10 + t * 12,
      );
    }
    g.fillStyle(0xffffff, 0.6).fillCircle(p.x, p.y, 1.6);
  }

  /** Light spots for the darkness mask (views/lightView.ts). */
  glowSpots(s: ShipState): { x: number; y: number; r: number }[] {
    if (!s.owned) return [];
    const top = WORLD.surfaceY - P.waterline * SHIP_HEIGHT;
    const spots = SHIP.lights.windows.map(([u, v, r]) => ({ ...this.at(s, top, u, v), r: r * 4 }));
    const f = SHIP.lights.flood;
    const p = this.at(s, top, f.u, f.v);
    for (let i = 1; i <= 3; i++) spots.push({ x: p.x, y: p.y + (f.reach * i) / 3, r: 14 + i * 8 });
    return spots;
  }

  /** The tug after a rescue flare: ahead of the bow, a towline to it, then it sails away. */
  private drawTug(s: ShipState, top: number, dt: number): void {
    if (!this.tug) return;
    if (this.tugLeft <= 0) {
      this.tug.setVisible(false);
      return;
    }
    this.tugLeft -= dt;
    const T = SHIP.tug;
    const leaving = Math.max(0, T.seconds * 0.5 - this.tugLeft) * 40; // the second half: it sails off
    const bow = this.at(s, top, 1, 0.45);
    const x = bow.x + s.face * (T.gap + T.length / 2 + leaving);
    const sc = T.length / this.tug.width;
    const y = WORLD.surfaceY - T.waterline * this.tug.height * sc + this.tug.height * sc * 0.5;
    this.tug
      .setVisible(true)
      .setPosition(x, y)
      .setScale(sc * s.face, sc)
      .setAlpha(Math.min(1, this.tugLeft));
    if (leaving === 0)
      this.fx.lineStyle(0.8, 0x2a221a, 1).lineBetween(bow.x, bow.y, x - s.face * T.length * 0.45, y);
    void this.tugFrom;
  }

  /** No picture yet: a dark hull with a wheelhouse. */
  private drawFallback(s: ShipState, top: number): void {
    const g = this.fallback;
    const L = SHIP.length;
    const H = SHIP_HEIGHT;
    const wl = top + P.waterline * H;
    g.fillStyle(0x2c2a27, 1).fillRect(s.x - L * 0.45, top + 0.3 * H, L * 0.9, wl - top - 0.3 * H);
    g.fillStyle(0x1f2a30, 1).fillRect(s.x - L * 0.42, wl, L * 0.84, (P.keel - P.waterline) * H);
  }

  /** Foam at the bow and the stern, a wake behind, spray when it planes, bubbles behind the propeller. */
  private drawWake(s: ShipState, k: number, planing: number, time: number, heave: number): void {
    if (k < 0.03) return;
    const g = this.fx;
    const L = SHIP.length;
    const bow = s.x + s.face * L * 0.47;
    const stern = s.x - s.face * L * 0.46;
    const y = WORLD.surfaceY + heave * 0.3;
    for (let i = 0; i < 14; i++) {
      const t = (time * (0.8 + k) + i / 14) % 1;
      const wx = stern - s.face * t * (40 + 120 * k);
      g.fillStyle(0xe8f2f4, 0.35 * k * (1 - t));
      g.fillEllipse(wx, y + Math.sin(i * 1.7) * 1.2, 6 + t * 14, 1.6 + t * 1.2);
      const bx = bow - s.face * t * 10;
      g.fillStyle(0xf4fafb, 0.5 * k * (1 - t));
      g.fillEllipse(bx, y - 1 + t * 0.5, 3 + t * 6, 1.4);
    }
    // bubbles churned by the propeller, under water at the stern
    const prop = {
      x: s.x + s.face * (P.propX - 0.5) * L,
      y: WORLD.surfaceY + (P.propY - P.waterline) * SHIP_HEIGHT,
    };
    for (let i = 0; i < 16; i++) {
      const t = (time * (1.2 + k * 2) + i / 16) % 1;
      g.lineStyle(0.5, 0xdff8ff, 0.7 * k * (1 - t));
      g.strokeCircle(
        prop.x - s.face * t * (30 + 50 * k),
        prop.y - t * 10 + Math.sin(i * 2.7) * 3,
        0.7 + t * 1.4,
      );
    }
    if (planing > 0)
      for (let i = 0; i < 8; i++) {
        const t = (time * 2.2 + i / 8) % 1;
        g.fillStyle(0xffffff, 0.45 * planing * (1 - t));
        g.fillCircle(bow + s.face * (2 + t * 8), y - 2 - t * 9 + t * t * 8, 0.8 + t * 1.6);
      }
  }
}

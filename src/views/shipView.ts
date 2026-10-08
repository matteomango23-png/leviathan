// The expedition ship (its model in data/fleet.ts): the owner's paintings (hatches closed and open, the same frame, so
// an open one fades in while its hatch opens). Its waterline sits on the sea surface; the hull under it is drawn
// darker and bluer, as seen through the water. It rocks with the waves (more in bad weather), lifts its bow and
// leaves a wake and bubbles behind its propeller. A soft light glows under the hull
// (owner, 5 ottobre). After the rescue flare a tug tows it.
// Look only: systems/ship/ moves it.
import Phaser from 'phaser';
import { SHIP } from '../data/ship';
import { WORLD } from '../data/worldLayout';
import { WORLD_ART_KEYS } from '../data/sprites.generated';
import { SHIP_MODELS, type ShipModelDef } from '../data/fleet';
import { shipHeight } from '../systems/ship/geometry';
import { shipArt, shipLength, shipPicture, shipTopSpeed } from '../systems/ship/model';
import { hatchT, type ShipState } from '../systems/ship/ship';
import { ShipFx } from './shipFx';

const UNDERWATER_TINT = 0x6f97a6;
const FAR_TINT = 0x7f8c94;

/**
 * One copy of the ship: its pictures, each cut at the waterline (above / below), in pairs. Closed first; then,
 * with two hatches, each one open alone and both open; with one, it open; last the propeller turning, if painted.
 */
class ShipPictures {
  readonly parts: Phaser.GameObjects.Image[];
  /** For each pair of parts: how open it shows (from the hatches), or the propeller turning. */
  private readonly roles: ('closed' | number | 'all' | 'moving')[] = [];

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
      this.parts.push(make(`world-${key}`), make(`world-${key}`));
      this.roles.push(role);
    };
    add(art.closed, 'closed');
    if (bays.length > 1) {
      for (const [i, bay] of bays.entries()) if (bay.open) add(bay.open, i);
      add(art.open, 'all');
    } else add(art.open, 0);
    if (art.moving) add(art.moving, 'moving');
    layer.add(this.parts);
    for (const [i, im] of this.parts.entries()) {
      const below = i % 2 === 1;
      const h = im.height;
      const cut = Math.round(art.picture.waterline * h);
      if (below) im.setCrop(0, cut, im.width, h - cut).setTint(UNDERWATER_TINT);
      else im.setCrop(0, 0, im.width, cut);
    }
  }

  hide(): void {
    for (const im of this.parts) im.setVisible(false);
  }

  /** How much a picture shows: each open hatch fades in over the closed one, both open over both; the turning
   *  propeller over all while it pushes. */
  private alphaOf(s: ShipState, role: (typeof this.roles)[number]): number {
    if (role === 'closed') return 1;
    if (typeof role === 'number') return hatchT(s, role);
    const most = Math.max(0, ...s.hatches.map((h) => h.t));
    if (role === 'all') return s.hatches.reduce((a, h) => a * h.t, 1);
    return Math.min(1, Math.max(0, (s.prop - 0.05) / 0.25)) * (1 - most);
  }

  /** Places it: centre x, top of the picture y, scale, pitch (radians, bow up > 0), darkening. */
  place(s: ShipState, x: number, top: number, scale: number, pitch: number, dark: number): void {
    const w = shipLength(s) * scale;
    const h = w * shipPicture(s).aspect;
    for (const [i, im] of this.parts.entries()) {
      const alpha = this.alphaOf(s, this.roles[i >> 1]!);
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
  /** The paintings of every model, made at once so they stay under the submarine (owner, 8 ottobre: made later,
   *  on top, the open hatch hid it). */
  private readonly pics = new Map<string, ShipPictures | null>();
  private readonly fx: Phaser.GameObjects.Graphics;
  /** Smoke (behind the ship), the bow wave and ice shards (views/shipFx.ts). */
  private readonly effects: ShipFx;
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly fallback: Phaser.GameObjects.Graphics;
  private readonly tug: Phaser.GameObjects.Image | null;
  private tugLeft = 0;
  private tugFrom = 0;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    const smoke = scene.add.graphics(); // behind the ship
    this.fallback = scene.add.graphics();
    layer.add([smoke, this.fallback]);
    for (const m of SHIP_MODELS) {
      const art = m.art;
      if (!art || this.pics.has(art.closed)) continue;
      const painted = WORLD_ART_KEYS.includes(art.closed) && WORLD_ART_KEYS.includes(art.open);
      this.pics.set(art.closed, painted ? new ShipPictures(scene, layer, art, m.bays) : null);
    }
    this.tug = WORLD_ART_KEYS.includes(SHIP.tug.art)
      ? scene.add.image(0, 0, `world-${SHIP.tug.art}`).setVisible(false)
      : null;
    if (this.tug) layer.add(this.tug);
    this.fx = scene.add.graphics();
    this.effects = new ShipFx(smoke, this.fx);
    this.glow = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    layer.add([this.fx, this.glow]);
  }

  /** The paintings of this ship's model (null: not painted yet), the others hidden. */
  private picsOf(s: ShipState): ShipPictures | null {
    const art = shipArt(s);
    for (const [key, p] of this.pics) if (key !== art.closed) p?.hide();
    return this.pics.get(art.closed) ?? null;
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
      for (const p of this.pics.values()) p?.hide();
      this.tug?.setVisible(false);
      return;
    }
    const k = Math.min(1, s.speed / shipTopSpeed(s));
    // rocking on the swell (more in bad weather), planing at speed
    const R = SHIP.rock;
    const sea = Math.min(3, waves);
    const heave = Math.sin(time * Math.PI * 2 * R.hz) * R.heave * sea;
    const roll = Math.sin(time * Math.PI * 2 * R.hz * 0.8 + 1.3) * R.pitch * sea;
    const planing = Math.max(0, (k - SHIP.plane.from) / (1 - SHIP.plane.from));
    const pitch = roll + planing * SHIP.plane.pitch;
    const lift = planing * SHIP.plane.lift;
    const top = WORLD.surfaceY - shipPicture(s).waterline * shipHeight(s) + heave - lift;
    const pics = this.picsOf(s);
    if (pics) pics.place(s, s.x, top, 1, pitch, 0);
    else this.drawFallback(s, top);
    this.effects.smoke(s, (u, v) => this.at(s, top, u, v), dt);
    this.drawWake(s, k, time, heave);
    this.effects.iceShards(s, dt);
    this.drawLights(s, top, time);
    this.drawTug(s, top, dt);
  }

  /** A point of the picture (shares) in the world, at this top. */
  private at(s: ShipState, top: number, u: number, v: number): { x: number; y: number } {
    return { x: s.x + s.face * (u - 0.5) * shipLength(s), y: top + v * shipHeight(s) };
  }

  /** Points under the keel where the soft light sits. */
  private underSpots(s: ShipState, top: number): { x: number; y: number }[] {
    const L = SHIP.lights.under;
    return Array.from({ length: L.spots }, (_, i) => {
      const p = this.at(s, top, L.from + ((L.to - L.from) * i) / (L.spots - 1), L.v);
      return { x: p.x, y: p.y + L.below };
    });
  }

  /** A faint, soft wash of light under the hull (no hard shapes): many wide, nearly clear layers. */
  private drawLights(s: ShipState, top: number, time: number): void {
    const L = SHIP.lights.under;
    const pulse = 0.9 + 0.1 * Math.sin(time * 1.3);
    for (const p of this.underSpots(s, top))
      for (let k = 6; k >= 1; k--)
        this.glow
          .fillStyle(0x9fd8ff, L.wash * pulse)
          .fillEllipse(p.x, p.y, L.radius * k * 0.45, L.radius * k * 0.3);
  }

  /** Light spots for the darkness mask (views/lightView.ts): the soft light under the hull. */
  glowSpots(s: ShipState): { x: number; y: number; r: number }[] {
    if (!s.owned) return [];
    const top = WORLD.surfaceY - shipPicture(s).waterline * shipHeight(s);
    return this.underSpots(s, top).map((p) => ({ ...p, r: SHIP.lights.under.radius }));
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
    const L = shipLength(s);
    const H = shipHeight(s);
    const P = shipPicture(s);
    const wl = top + P.waterline * H;
    g.fillStyle(0x2c2a27, 1).fillRect(s.x - L * 0.45, top + 0.3 * H, L * 0.9, wl - top - 0.3 * H);
    g.fillStyle(0x1f2a30, 1).fillRect(s.x - L * 0.42, wl, L * 0.84, (P.keel - P.waterline) * H);
  }

  /** Foam at the stern, a wake behind, bubbles behind the propeller. */
  private drawWake(s: ShipState, k: number, time: number, heave: number): void {
    const g = this.fx;
    this.drawPropBubbles(s, time);
    if (k < 0.03) return;
    const L = shipLength(s);
    const stern = s.x - s.face * L * 0.46;
    const y = WORLD.surfaceY + heave * 0.3;
    for (let i = 0; i < 14; i++) {
      const t = (time * (0.8 + k) + i / 14) % 1;
      const wx = stern - s.face * t * (40 + 120 * k);
      g.fillStyle(0xe8f2f4, 0.35 * k * (1 - t));
      g.fillEllipse(wx, y + Math.sin(i * 1.7) * 1.2, 6 + t * 14, 1.6 + t * 1.2);
    }
    // (the bow wave is gone, owner 8 ottobre: foam should be the sea itself, not dots over it; for now none)
  }

  /** Bubbles churned by the propeller, only while it turns (owner, 8 ottobre: not while the ship coasts). */
  private drawPropBubbles(s: ShipState, time: number): void {
    const k = s.prop;
    if (k < 0.03) return;
    const g = this.fx;
    const L = shipLength(s);
    const P = shipPicture(s);
    const prop = {
      x: s.x + s.face * (P.propX - 0.5) * L,
      y: WORLD.surfaceY + (P.propY - P.waterline) * shipHeight(s),
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
  }
}

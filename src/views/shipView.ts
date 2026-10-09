// The expedition ship (its model in data/fleet.ts): the owner's paintings (hatches closed and open, the same frame, so
// an open one fades in while its hatch opens). Its waterline sits on the sea surface; the hull under it is drawn
// darker and bluer, as seen through the water. It rocks with the waves (more in bad weather), lifts its bow and
// leaves a wake and bubbles behind its propeller. A soft light glows under the hull
// (owner, 5 ottobre). After the rescue flare a tug tows it.
// Look only: systems/ship/ moves it.
import Phaser from 'phaser';
import { seaHeight, type SeaNow } from '../systems/sea';
import { SeaFx, waterOver } from './seaFx';
import { SHIP } from '../data/ship';
import { WORLD } from '../data/worldLayout';
import { WORLD_ART_KEYS } from '../data/sprites.generated';
import { SHIP_MODELS } from '../data/fleet';
import { shipHeight } from '../systems/ship/geometry';
import { shipArt, shipLength, shipPicture, shipTopSpeed } from '../systems/ship/model';
import type { ShipState } from '../systems/ship/ship';
import { diveShare, submerged } from '../systems/ship/uboat';
import { ShipFx } from './shipFx';
import { ShipPictures } from './shipPictures';

export class ShipView {
  /** The paintings of every model, made at once so they stay under the submarine (owner, 8 ottobre: made later,
   *  on top, the open hatch hid it). */
  private readonly pics = new Map<string, ShipPictures | null>();
  private readonly fx: Phaser.GameObjects.Graphics;
  /** Smoke (behind the ship), the bow wave and ice shards (views/shipFx.ts). */
  private readonly effects: ShipFx;
  /** Spray where its bow buries itself in the sea. */
  private readonly spray: SeaFx;
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
    this.spray = new SeaFx(this.fx);
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

  /** @param sea the weather's waves and wind: it rides them (systems/sea.ts) */
  update(s: ShipState, time: number, dt: number, sea: SeaNow): void {
    this.fx.clear();
    this.glow.clear();
    this.fallback.clear();
    if (!s.owned) {
      for (const p of this.pics.values()) p?.hide();
      this.tug?.setVisible(false);
      return;
    }
    const k = Math.min(1, s.speed / shipTopSpeed(s));
    // floating on the waves (systems/ride.ts): lifted and dropped, its bow buried in the crests; planing at speed
    const heave = -s.ride.h;
    const roll = s.ride.p;
    const planing = Math.max(0, (k - SHIP.plane.from) / (1 - SHIP.plane.from));
    const pitch = roll + planing * SHIP.plane.pitch;
    const lift = planing * SHIP.plane.lift;
    // a U-Boat diving: deeper, the swell fading little by little, the sea line climbing its picture, no wake
    const sunk = submerged(s);
    const calm = 1 - diveShare(s);
    const top = WORLD.surfaceY - shipPicture(s).waterline * shipHeight(s) + s.dive + (heave - lift) * calm;
    const pics = this.picsOf(s);
    // afloat, the whole painting, and in front of it the sea cut by the wave itself (no straight line, owner 9
    // ottobre); diving, the sea line climbing its picture, along the waves too
    const afloat = diveShare(s) < 0.02;
    const seaY = afloat ? null : (wx: number): number => WORLD.surfaceY - seaHeight(wx, time, sea, sea.water);
    if (pics) pics.place(s, s.x, top, 1, pitch * calm, seaY, time);
    else this.drawFallback(s, top);
    if (afloat) {
      const { x0, x1 } = { x0: s.x - shipLength(s) / 2, x1: s.x + shipLength(s) / 2 };
      waterOver(this.fx, x0, x1, top + shipHeight(s) * 1.05, time, sea);
      // its bow buried in a crest throws the sea up (his clip of the tanker)
      if (s.ride.plunge > 0.5)
        this.spray.spray(
          s.x + s.face * shipLength(s) * 0.42,
          s.ride.plunge,
          s.speed,
          s.face,
          shipLength(s) / 180,
          dt,
        );
    }
    this.spray.update(dt);
    this.effects.smoke(s, (u, v) => this.at(s, top, u, v), dt); // a stack under water does not smoke
    if (sunk) this.drawPropBubbles(s, time);
    else this.drawWake(s, k, time, sea);
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
    // diving, it fades as the headlight's cone takes over (owner, 9 ottobre: the circles snapped off)
    const pulse = (0.9 + 0.1 * Math.sin(time * 1.3)) * (1 - diveShare(s));
    if (pulse <= 0.01) return;
    for (const p of this.underSpots(s, top))
      for (let k = 6; k >= 1; k--)
        this.glow
          .fillStyle(0x9fd8ff, L.wash * pulse)
          .fillEllipse(p.x, p.y, L.radius * k * 0.45, L.radius * k * 0.3);
  }

  /** Light spots for the darkness mask (views/lightView.ts): the soft light under the hull. */
  glowSpots(s: ShipState): { x: number; y: number; r: number }[] {
    if (!s.owned) return [];
    const top = WORLD.surfaceY - shipPicture(s).waterline * shipHeight(s) + s.dive;
    const fade = 1 - diveShare(s);
    if (fade <= 0.01) return [];
    return this.underSpots(s, top).map((p) => ({ ...p, r: SHIP.lights.under.radius * fade }));
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
  private drawWake(s: ShipState, k: number, time: number, sea: SeaNow): void {
    const g = this.fx;
    this.drawPropBubbles(s, time);
    if (k < 0.03) return;
    const L = shipLength(s);
    const stern = s.x - s.face * L * 0.46;
    for (let i = 0; i < 14; i++) {
      const t = (time * (0.8 + k) + i / 14) % 1;
      const wx = stern - s.face * t * (40 + 120 * k);
      g.fillStyle(0xe8f2f4, 0.35 * k * (1 - t));
      g.fillEllipse(
        wx,
        WORLD.surfaceY - seaHeight(wx, time, sea, sea.water) + Math.sin(i * 1.7) * 1.2,
        6 + t * 14,
        1.6 + t * 1.2,
      );
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
      y: WORLD.surfaceY + s.dive + (P.propY - P.waterline) * shipHeight(s),
    };
    // a big ship churns much more water (owner, 9 ottobre): more bubbles, bigger, a longer and taller plume
    const size = Math.max(1, L / SHIP.camera.refLength);
    const n = Math.round(16 + 26 * (size - 1));
    for (let i = 0; i < n; i++) {
      const t = (time * (1.2 + k * 2) + i / n) % 1;
      const spread = Math.sin(i * 2.7) * 3 * size + Math.cos(i * 1.3) * 2 * (size - 1);
      g.lineStyle(0.5 + 0.2 * (size - 1), 0xdff8ff, 0.7 * k * (1 - t));
      g.strokeCircle(
        prop.x - s.face * t * (30 + 50 * k) * Math.sqrt(size),
        prop.y - t * 10 * Math.sqrt(size) + spread,
        (0.7 + t * 1.4) * (0.8 + 0.35 * size) * (0.6 + ((i * 0.37) % 1) * 0.8),
      );
    }
  }
}

// The expedition ship (its model in data/fleet.ts): the owner's paintings (hatches closed and open, the same frame, so
// an open one fades in while its hatch opens). Its waterline sits on the sea surface; the hull under it is drawn
// darker and bluer, as seen through the water. It rocks with the waves (more in bad weather), lifts its bow and
// leaves a wake and bubbles behind its propeller. A soft light glows under the hull
// (owner, 5 ottobre). After the rescue flare a tug tows it.
// Look only: systems/ship/ moves it.
import Phaser from 'phaser';
import { drawPropBubbles, drawWake } from './shipWake';
import { seaHeight, type SeaNow } from '../systems/sea';
import { SeaFx, waterOver } from './seaFx';
import { SHIP } from '../data/ship';
import { WORLD } from '../data/worldLayout';
import { WORLD_ART_KEYS } from '../data/sprites.generated';
import { SHIP_MODELS } from '../data/fleet';
import { shipDraft, shipHeight } from '../systems/ship/geometry';
import { shipArt, shipLength, shipPicture, shipTopSpeed } from '../systems/ship/model';
import type { ShipState } from '../systems/ship/ship';
import { diveShare, submerged } from '../systems/ship/uboat';
import { ShipFx } from './shipFx';
import { ShipPictures } from './shipPictures';
import { hasMouth, mouthPoint } from '../systems/ship/krillMouth';
import { floodSpots } from '../systems/ship/floodlight';

/** A U-Boat's hull under the waves darkens fully once it has gone down this share of its floating line. */
const UNDER_FADE = 0.5;

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
  /** The light under the still ship: behind the hull and its hatches, as if it shone from beneath them (owner, 20
   *  ottobre: drawn over the ship, it lit part of the open hatch). */
  private readonly beam: Phaser.GameObjects.Graphics;
  /** How far the waves move the ship from its resting place now (the light spot rides with it). */
  private lift = 0;
  private readonly fallback: Phaser.GameObjects.Graphics;
  private readonly tug: Phaser.GameObjects.Image | null;
  private tugLeft = 0;
  private tugFrom = 0;
  /** How lit the light under the still ship is now (eases on and off). */
  private beamK = 0;

  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    glowLayer: Phaser.GameObjects.Layer = layer,
  ) {
    const smoke = scene.add.graphics(); // behind the ship
    this.fallback = scene.add.graphics();
    this.beam = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    layer.add([smoke, this.beam, this.fallback]);
    for (const m of SHIP_MODELS) {
      const art = m.art;
      if (!art || this.pics.has(art.closed)) continue;
      const painted = WORLD_ART_KEYS.includes(art.closed) && WORLD_ART_KEYS.includes(art.open);
      this.pics.set(art.closed, painted ? new ShipPictures(scene, layer, art, m.bays, glowLayer) : null);
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
    this.beam.clear();
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
    // ottobre); diving, the hull under the waves darkens little by little (owner: it turned dark at once going
    // down a centimetre) while that sea in front fades away
    const wet = Math.min(1, diveShare(s) / UNDER_FADE);
    const afloat = diveShare(s) < 0.02;
    const seaY = (wx: number): number => WORLD.surfaceY - seaHeight(wx, time, sea, sea.water);
    if (pics) pics.place(s, s.x, top, 1, pitch * calm, wet > 0 ? seaY : null, time, wet);
    else this.drawFallback(s, top);
    if (wet < 1) {
      const { x0, x1 } = { x0: s.x - shipLength(s) / 2, x1: s.x + shipLength(s) / 2 };
      waterOver(this.fx, x0, x1, top + shipHeight(s) * 1.05, time, sea, 1 - wet);
    }
    if (afloat) {
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
    if (sunk) drawPropBubbles(this.fx, s, time);
    else drawWake(this.fx, s, k, time, sea);
    this.effects.iceShards(s, dt);
    this.drawLights(s, top, time);
    // its light rides the waves with it (owner, 11 ottobre: the hull rocked, the light stood still)
    this.lift = top - this.restTop(s);
    this.drawBeam(s, this.lift, time, dt);
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

  /** The top of its picture with no waves (the light was computed from it). */
  private restTop(s: ShipState): number {
    return WORLD.surfaceY - shipPicture(s).waterline * shipHeight(s) + s.dive;
  }

  /**
   * The light under the still ship (block 5b; owner, 10 ottobre: on and off looked the same): a wide beam fanning
   * down from the keel, flickering on and fading out, behind the hull (owner, 20 ottobre).
   * @param lift how far the waves move the ship from its resting place now (down > 0)
   */
  private drawBeam(s: ShipState, lift: number, time: number, dt: number): void {
    const want = s.lightOn ? 1 : 0;
    this.beamK += (want - this.beamK) * Math.min(1, dt * (want ? 2.5 : 4));
    if (this.beamK < 0.01) return;
    // switching on it flickers for a moment, like a big lamp warming up
    const flicker = this.beamK < 0.95 && want ? 0.6 + 0.4 * Math.abs(Math.sin(time * 37)) : 1;
    const k = this.beamK * flicker;
    if (hasMouth(s)) {
      this.drawMouthBeam(s, k * s.mouthT, lift);
      return;
    }
    const B = SHIP.underLight;
    const keel = WORLD.surfaceY + s.dive + shipDraft(s) + lift;
    const half = shipLength(s) * 0.22;
    for (let i = 6; i >= 1; i--) {
      const w = half + (B.spread + B.glow) * (i / 6);
      const depth = B.below[1] * 1.6 * (0.55 + 0.45 * (i / 6));
      const [ax, bx, y1] = [s.x - half * 0.8, s.x + half * 0.8, keel + depth];
      this.beam
        .fillStyle(0xfff1c8, 0.05 * k)
        .fillTriangle(ax, keel, bx, keel, s.x + w, y1)
        .fillTriangle(ax, keel, s.x + w, y1, s.x - w, y1);
    }
    for (let r = 4; r >= 1; r--)
      this.beam.fillStyle(0xffe6a8, 0.08 * k).fillEllipse(s.x, keel + 6, half * 0.9 * r * 0.5, 10 * r * 0.5);
  }

  /** The Krill Hunter's light: out of its mouth, a blue-green beam fanning forward and down into the sea. */
  private drawMouthBeam(s: ShipState, k: number, lift: number): void {
    if (k < 0.01) return;
    const at = mouthPoint(s);
    const m = { x: at.x, y: at.y + lift };
    const len = SHIP.mouth.reach * 0.9;
    for (let i = 6; i >= 1; i--) {
      const spread = len * (0.18 + 0.32 * (i / 6));
      const far = { x: m.x + s.face * len * (0.6 + 0.4 * (i / 6)), y: m.y + len * 0.35 };
      this.beam
        .fillStyle(0x8ff7ff, 0.05 * k)
        .fillTriangle(m.x, m.y - 4, far.x, far.y - spread, far.x, far.y + spread);
    }
    for (let r = 4; r >= 1; r--) this.beam.fillStyle(0xc8fbff, 0.1 * k).fillCircle(m.x, m.y, 5 * r);
  }

  /** Light spots for the darkness mask (views/lightView.ts): the soft light under the hull. */
  glowSpots(s: ShipState, murk = 0): { x: number; y: number; r: number }[] {
    if (!s.owned) return [];
    const top = WORLD.surfaceY - shipPicture(s).waterline * shipHeight(s) + s.dive;
    // its lights stay on under water (owner, 15 ottobre: they went out as it dived, all black at depth)
    const spots = this.underSpots(s, top).map((p) => ({ ...p, r: SHIP.lights.under.radius }));
    spots.push(...floodSpots(s, murk));
    // the light under the still ship (block 5b): a wide glow below the keel
    // riding the waves with the ship, and below its keel: the hull and its hatches are not lit by it (owner, 20
    // ottobre)
    if (s.lightOn && hasMouth(s)) {
      const m = mouthPoint(s);
      spots.push({
        x: m.x + s.face * SHIP.mouth.reach * 0.4,
        y: m.y + this.lift + SHIP.mouth.reach * 0.2,
        r: SHIP.underLight.glow,
      });
    } else if (s.lightOn) {
      const keel = WORLD.surfaceY + s.dive + shipDraft(s) + this.lift;
      spots.push({
        x: s.x,
        y: keel + SHIP.underLight.glow * SHIP.underLight.spotBelow,
        r: SHIP.underLight.glow,
      });
    }
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
    const L = shipLength(s);
    const H = shipHeight(s);
    const P = shipPicture(s);
    const wl = top + P.waterline * H;
    g.fillStyle(0x2c2a27, 1).fillRect(s.x - L * 0.45, top + 0.3 * H, L * 0.9, wl - top - 0.3 * H);
    g.fillStyle(0x1f2a30, 1).fillRect(s.x - L * 0.42, wl, L * 0.84, (P.keel - P.waterline) * H);
  }
}

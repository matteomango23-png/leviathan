// The expedition ship (its model in data/fleet.ts): the owner's paintings (hatches closed and open, the same frame, so
// an open one fades in while its hatch opens). Its waterline sits on the sea surface; the hull under it is drawn
// darker and bluer, as seen through the water. It rocks with the waves (more in bad weather), lifts its bow and
// leaves a wake and bubbles behind its propeller. A soft light glows under the hull
// (owner, 5 ottobre). After the rescue flare a tug tows it.
// Look only: systems/ship/ moves it.
import Phaser from 'phaser';
import { JetFlames } from './jetFlames';
import { drawPropBubbles, drawWake } from './shipWake';
import { seaHeight, type SeaNow } from '../systems/sea';
import { SeaFx, waterOver } from './seaFx';
import { SHIP } from '../data/ship';
import { WORLD } from '../data/worldLayout';
import { WORLD_ART_KEYS } from '../data/sprites.generated';
import { SHIP_MODELS } from '../data/fleet';
import { shipHeight } from '../systems/ship/geometry';
import { shipArt, shipLength, shipModel, shipPicture, shipTopSpeed } from '../systems/ship/model';
import type { ShipState } from '../systems/ship/ship';
import { diveShare, submerged } from '../systems/ship/uboat';
import { ShipFx } from './shipFx';
import { ShipPictures } from './shipPictures';
import { ShipLights } from './shipLights';

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
  /** Its lights under the hull and the still ship's beam (views/shipLights.ts). */
  private readonly lights: ShipLights;
  private readonly fallback: Phaser.GameObjects.Graphics;
  private readonly tug: Phaser.GameObjects.Image | null;
  private tugLeft = 0;
  private tugFrom = 0;
  private readonly jets: JetFlames;
  /** How hard its reactors burn now (eases on and off). */
  private jetPower = 0;

  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    glowLayer: Phaser.GameObjects.Layer = layer,
  ) {
    const smoke = scene.add.graphics(); // behind the ship
    this.jets = new JetFlames(scene, layer); // behind the ship too
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
    this.lights = new ShipLights(this.glow, this.beam);
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

  /**
   * @param sea the weather's waves and wind: it rides them (systems/sea.ts)
   * @param waiting Aurelio's gift moored at Porto Fango before it is yours (systems/story.ts shipWaitsAtDock)
   */
  update(s: ShipState, time: number, dt: number, sea: SeaNow, waiting = false): void {
    this.fx.clear();
    this.glow.clear();
    this.beam.clear();
    this.fallback.clear();
    if (!s.owned && !waiting) {
      for (const p of this.pics.values()) p?.hide();
      this.tug?.setVisible(false);
      this.jets.update([], time);
      return;
    }
    const k = Math.min(1, s.speed / shipTopSpeed(s));
    // floating on the waves (systems/ride.ts): lifted and dropped, its bow buried in the crests; planing at speed
    const heave = -s.ride.h;
    const roll = s.ride.p;
    const P = shipModel(s).plane ?? SHIP.plane;
    const planing = Math.max(0, (k - P.from) / (1 - P.from));
    const pitch = roll + planing * P.pitch;
    const lift = planing * P.lift;
    // a U-Boat diving: deeper, the swell fading little by little, the sea line climbing its picture, no wake
    const sunk = submerged(s);
    const calm = 1 - diveShare(s);
    // a fast rise carries it a little out of the water (ship/uboat.ts stepHop)
    const top =
      WORLD.surfaceY -
      shipPicture(s).waterline * shipHeight(s) +
      s.dive +
      (heave - lift) * calm -
      (s.hop ?? 0);
    const pics = this.picsOf(s);
    // afloat, the whole painting, and in front of it the sea cut by the wave itself (no straight line, owner 9
    // ottobre); diving, the hull under the waves darkens little by little (owner: it turned dark at once going
    // down a centimetre) while that sea in front fades away
    const wet = Math.min(1, diveShare(s) / UNDER_FADE);
    const afloat = diveShare(s) < 0.02;
    const seaY = (wx: number): number => WORLD.surfaceY - seaHeight(wx, time, sea, sea.water);
    if (pics) pics.place(s, s.x, top, 1, pitch * calm, wet > 0 ? seaY : null, time, wet);
    else this.drawFallback(s, top);
    this.drawJets(s, top, pitch * calm, time, dt);
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
    // its lights ride the waves with it (owner, 11 ottobre: the hull rocked, the light stood still) and lean with it
    this.lights.draw(s, top, top - this.restTop(s), -s.face * pitch * calm, time, dt);
    this.drawTug(s, top, dt);
  }

  /** Its reactors' flames (the abyssal ship): only while the engine runs, longer with the throttle. */
  private drawJets(s: ShipState, top: number, pitch: number, time: number, dt: number): void {
    const jets = shipArt(s).jets ?? [];
    const want = s.engineOn && jets.length ? Math.max(0.15, s.prop) : 0;
    this.jetPower += (want - this.jetPower) * Math.min(1, dt * 4);
    const w = shipLength(s);
    const h = shipHeight(s);
    const cy = top + h / 2;
    const rot = -s.face * pitch; // as the painting turns (shipPictures.ts place)
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    this.jets.update(
      jets.map((j) => {
        const dx = s.face * (j.u - 0.5) * w;
        const dy = (j.v - 0.5) * h;
        return {
          x: s.x + dx * cos - dy * sin,
          y: cy + dx * sin + dy * cos,
          angle: rot + (s.face > 0 ? Math.PI : 0),
          width: j.size * h,
          power: this.jetPower,
        };
      }),
      time,
    );
  }

  /** A point of the picture (shares) in the world, at this top. */
  private at(s: ShipState, top: number, u: number, v: number): { x: number; y: number } {
    return { x: s.x + s.face * (u - 0.5) * shipLength(s), y: top + v * shipHeight(s) };
  }

  /** The top of its picture with no waves (the light was computed from it). */
  private restTop(s: ShipState): number {
    return WORLD.surfaceY - shipPicture(s).waterline * shipHeight(s) + s.dive;
  }

  /** Light spots for the darkness mask (views/lightView.ts): the soft light under the hull. */
  glowSpots(s: ShipState, murk = 0): { x: number; y: number; r: number }[] {
    return this.lights.spots(s, murk);
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

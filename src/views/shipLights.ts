// The lights under the ship (split from shipView.ts in the cleanup of 12 novembre 2026): the soft wash under the
// keel, the still ship's beam (the Krill Hunter's from its mouth) and their spots in the darkness mask. They ride the
// waves with the hull and lean with it (owner, 11 ottobre and 12 novembre 2026).
import Phaser from 'phaser';
import { SHIP } from '../data/ship';
import { WORLD } from '../data/worldLayout';
import { diveShare } from '../systems/ship/uboat';
import { floodSpots } from '../systems/ship/floodlight';
import { shipDraft, shipHeight } from '../systems/ship/geometry';
import { hasMouth, mouthPoint } from '../systems/ship/krillMouth';
import { shipLength, shipPicture } from '../systems/ship/model';
import type { ShipState } from '../systems/ship/ship';

/** A point of the picture (shares) in the world, at this top. */
const at = (s: ShipState, top: number, u: number, v: number): { x: number; y: number } => ({
  x: s.x + s.face * (u - 0.5) * shipLength(s),
  y: top + v * shipHeight(s),
});

export class ShipLights {
  /** How far the waves move the ship from its resting place now (the light spot rides with it). */
  private lift = 0;
  /** And how it leans with them: the light turns with the hull round its picture's middle. */
  private lean = { rot: 0, x: 0, y: 0 };
  /** How lit the light under the still ship is now (eases on and off). */
  private beamK = 0;

  /**
   * @param glow the soft wash, over the hull
   * @param beam the still ship's beam, behind the hull
   */
  constructor(
    private readonly glow: Phaser.GameObjects.Graphics,
    private readonly beam: Phaser.GameObjects.Graphics,
  ) {}

  /**
   * One frame of the lights (the graphics already cleared).
   * @param lift how far the waves move it from its resting place (down > 0)
   * @param rot how it leans (radians)
   */
  draw(s: ShipState, top: number, lift: number, rot: number, time: number, dt: number): void {
    this.lift = lift;
    this.lean = { rot, x: s.x, y: top + shipHeight(s) / 2 };
    this.drawLights(s, top, time);
    this.drawBeam(s, lift, time, dt);
  }

  /** Points under the keel where the soft light sits. */
  private underSpots(s: ShipState, top: number): { x: number; y: number }[] {
    const L = SHIP.lights.under;
    return Array.from({ length: L.spots }, (_, i) => {
      const p = at(s, top, L.from + ((L.to - L.from) * i) / (L.spots - 1), L.v);
      return this.turn(p.x, p.y + L.below);
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

  /** A point of the light turned with the leaning hull (this.lean). */
  private turn(x: number, y: number): { x: number; y: number } {
    const { rot, x: px, y: py } = this.lean;
    const [c, n] = [Math.cos(rot), Math.sin(rot)];
    return { x: px + (x - px) * c - (y - py) * n, y: py + (x - px) * n + (y - py) * c };
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
      const a = this.turn(s.x - half * 0.8, keel);
      const b = this.turn(s.x + half * 0.8, keel);
      const c = this.turn(s.x + w, keel + depth);
      const d = this.turn(s.x - w, keel + depth);
      this.beam
        .fillStyle(0xfff1c8, 0.05 * k)
        .fillTriangle(a.x, a.y, b.x, b.y, c.x, c.y)
        .fillTriangle(a.x, a.y, c.x, c.y, d.x, d.y);
    }
    const spot = this.turn(s.x, keel + 6);
    for (let r = 4; r >= 1; r--)
      this.beam.fillStyle(0xffe6a8, 0.08 * k).fillEllipse(spot.x, spot.y, half * 0.9 * r * 0.5, 10 * r * 0.5);
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
  spots(s: ShipState, murk = 0): { x: number; y: number; r: number }[] {
    if (!s.owned) return [];
    const top = WORLD.surfaceY - shipPicture(s).waterline * shipHeight(s) + s.dive + this.lift;
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
        ...this.turn(s.x, keel + SHIP.underLight.glow * SHIP.underLight.spotBelow),
        r: SHIP.underLight.glow,
      });
    }
    return spots;
  }
}

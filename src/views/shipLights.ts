// The ship's lights (split from shipView.ts in the cleanup of 12 novembre 2026): by night its deck lights and
// portholes and its red sidelight, small warm points over the darkness (lot N1b, owner 13 novembre 2026: the round
// patches of light under the hull lit the sea blue at night, against the rule of no circles); the still ship's beam
// (the Krill Hunter's from its mouth) and the beams it opens in the darkness. They ride the waves and lean with the
// hull (owner, 11 ottobre and 12 novembre 2026).
import Phaser from 'phaser';
import { SHIP } from '../data/ship';
import { WORLD } from '../data/worldLayout';
import { diveShare } from '../systems/ship/uboat';
import { floodBeams, type Beam } from '../systems/ship/floodlight';
import { NIGHT } from '../data/daynight';
import { shipDraft, shipHeight } from '../systems/ship/geometry';
import { hasMouth, mouthPoint } from '../systems/ship/krillMouth';
import { shipLength, shipModel, shipPicture } from '../systems/ship/model';
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
  /** The top of its picture this frame (its lights ride with it). */
  private top = 0;
  /** How lit the light under the still ship is now (eases on and off). */
  private beamK = 0;

  /**
   * @param glow the deck lights by night, over the darkness
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
  draw(s: ShipState, top: number, lift: number, rot: number, time: number, dt: number, night = 0): void {
    this.lift = lift;
    this.top = top;
    this.lean = { rot, x: s.x, y: top + shipHeight(s) / 2 };
    this.drawDeckLights(s, top, time, night);
    this.drawBeam(s, lift, time, dt);
  }

  /** By night: a row of warm portholes along the hull and the red sidelight at the bow, soft small points (each a
   *  few faint layers, never a drawn disc), over the darkness; a diving U-Boat puts them out. */
  private drawDeckLights(s: ShipState, top: number, time: number, night: number): void {
    const L = NIGHT.deckLights;
    const k = night * (1 - diveShare(s));
    if (k <= 0.01) return;
    const wl = shipPicture(s).waterline;
    const dot = (u: number, v: number, color: number, alpha: number, size: number): void => {
      const p = at(s, top, u, v * wl);
      const q = this.turn(p.x, p.y);
      for (let r = 3; r >= 1; r--)
        this.glow.fillStyle(color, (alpha * k) / (r * r)).fillEllipse(q.x, q.y, size * r, size * r * 0.8);
    };
    for (let i = 0; i < L.portholes; i++) {
      const u = L.from + ((L.to - L.from) * i) / (L.portholes - 1);
      const flicker = 0.85 + 0.15 * Math.sin(time * 0.7 + i * 2.1);
      dot(u, L.v, L.warm, L.alpha * flicker, L.size);
    }
    dot(L.sideU, L.sideV, L.side, L.alpha, L.size * 1.3);
  }

  /** How much the hull leans this frame (radians): its headlight turns with it. */
  get rot(): number {
    return this.lean.rot;
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

  /** The light of its hull's lamps round it (owner, 13 novembre 2026: the abyssal ship's yellow lights should light
   *  a little round it): soft light along the whole hull, by night and under water, for the darkness mask. Many
   *  small soft lights overlapping into one long glow the shape of the hull, never a round patch. */
  hullGlow(s: ShipState, night: number): { x: number; y: number; r: number; a: number }[] {
    const H = NIGHT.hullGlow;
    const k = Math.max(night, diveShare(s));
    if (!s.owned || k < 0.05) return [];
    const n = Math.max(2, Math.round(shipLength(s) / H.spacing));
    const r = H.radius * (shipModel(s).floodlightM ? H.floodMult : 1);
    const v = H.v * shipPicture(s).waterline;
    return Array.from({ length: n }, (_, i) => {
      const p = at(s, this.top, 0.08 + (0.84 * i) / (n - 1), v);
      return { ...this.turn(p.x, p.y), r, a: H.alpha * k };
    });
  }

  /** The beams it opens in the darkness (views/lightView.ts): its floodlights under water, and the light under the
   *  still ship (down from the keel) or the Krill Hunter's (forward from its mouth). No round spots. */
  beams(s: ShipState, murk = 0): Beam[] {
    if (!s.owned) return [];
    const out = floodBeams(s, murk);
    const B = SHIP.underLight;
    const k = this.beamK;
    if (k < 0.05) return out;
    if (hasMouth(s)) {
      const m = mouthPoint(s);
      out.push({
        x: m.x,
        y: m.y + this.lift,
        angle: s.face > 0 ? 0.33 : Math.PI - 0.33,
        len: SHIP.mouth.reach * 0.9 * k,
        width: 0.7,
      });
    } else {
      const keel = WORLD.surfaceY + s.dive + shipDraft(s) + this.lift;
      out.push({
        ...this.turn(s.x, keel),
        angle: Math.PI / 2,
        len: (B.below[1] * 1.6 + B.glow) * k,
        width: 1.1,
      });
    }
    return out;
  }
}

// The surface radar of the big ships (block 5c, owner 10 ottobre 2026: "like the ones with the signal turning round
// 360 degrees", only for the ships and U-Boats). What is close to the hull, within SHIP.radar.rangeM of its ends:
// ice, rock and a floor too shallow for the keel, the piers of harbours and outposts, your speedboat and submarine
// afloat, beasts near the surface. And the parking sensor: an obstacle ahead within that range while the ship goes
// faster than a crawl beeps, the closer the more often. Pure logic.
import { PORTS } from '../../data/economy';
import { SHIP } from '../../data/ship';
import { TILE, WORLD } from '../../data/worldLayout';
import type { BeastState } from '../beastState';
import { isInWater } from '../beasts/wildState';
import type { BoatState } from '../boat';
import { knotsOf } from '../helm';
import type { SubState } from '../subState';
import type { TileMap } from '../world/tileMap';
import { shipDraft } from './geometry';
import { shipLength } from './model';
import type { ShipState } from './ship';

const R = SHIP.radar;
const M = WORLD.unitsPerMetre;

export type ContactKind = 'ice' | 'rock' | 'port' | 'boat' | 'sub' | 'beast';

export interface RadarContact {
  kind: ContactKind;
  /** Metres from the ship's middle (east > 0) and from the waterline (down > 0). */
  dxM: number;
  dyM: number;
}

export interface RadarWorld {
  ship: ShipState;
  map: TileMap;
  boat: BoatState;
  sub: SubState;
  beasts: Pick<BeastState, 'wilds'>;
}

/** How far it sees from the ship's middle (m): half the ship and the range beyond its ends. */
export const radarRadiusM = (s: { model: string }): number => shipLength(s) / M / 2 + R.rangeM;

/** The ship's waterline now (a U-Boat under water: its own depth). */
const waterline = (s: ShipState): number => WORLD.surfaceY + s.dive;

/** Rock or ice at a point: what kind, or null. */
function solid(map: TileMap, x: number, y: number): ContactKind | null {
  const t = map.tileAtPoint(x, y);
  if (t === TILE.ice) return 'ice';
  return t === TILE.water ? null : 'rock';
}

/** Everything it sees now, for the cockpit's screen. */
export function radarContacts(g: RadarWorld): RadarContact[] {
  const s = g.ship;
  const out: RadarContact[] = [];
  const r = radarRadiusM(s) * M;
  const y0 = waterline(s);
  const keel = y0 + shipDraft(s);
  const step = 2 * M;
  // the sea around the hull: from above the water down past the keel, a dot where it is solid
  for (let x = s.x - r; x <= s.x + r; x += step)
    for (let y = y0 - 6 * M; y <= keel + R.rangeM * M * 0.5; y += step) {
      const k = solid(g.map, x, y);
      if (!k || Math.hypot(x - s.x, y - y0) > r) continue;
      out.push({ kind: k, dxM: (x - s.x) / M, dyM: (y - y0) / M });
    }
  for (const p of PORTS)
    if (Math.abs(p.x - s.x) < r) out.push({ kind: 'port', dxM: (p.x - s.x) / M, dyM: 0 });
  const near = (x: number, y: number): boolean => Math.hypot(x - s.x, y - y0) < r;
  if (g.boat.owned && g.boat.bay === 'out' && near(g.boat.x, WORLD.surfaceY))
    out.push({ kind: 'boat', dxM: (g.boat.x - s.x) / M, dyM: (WORLD.surfaceY - y0) / M });
  if (g.sub.owned && !(s.bay === 'docked') && near(g.sub.x, g.sub.y))
    out.push({ kind: 'sub', dxM: (g.sub.x - s.x) / M, dyM: (g.sub.y - y0) / M });
  for (const w of g.beasts.wilds)
    if (isInWater(w) && near(w.x, w.y))
      out.push({ kind: 'beast', dxM: (w.x - s.x) / M, dyM: (w.y - y0) / M });
  return out;
}

/** The parking sensor: metres to the nearest obstacle ahead within range (null: none, or too slow to care). */
export function obstacleAhead(g: Pick<RadarWorld, 'ship' | 'map'>): number | null {
  const s = g.ship;
  if (!s.owned || knotsOf(s.speed) < R.beepFromKnots) return null;
  const y0 = waterline(s);
  const top = s.dive > 0 ? y0 - shipDraft(s) * 0.5 : y0 - 2 * M; // a U-Boat under water: its whole height
  const keel = y0 + shipDraft(s) + M;
  const bow = s.x + (s.face * shipLength(s)) / 2;
  for (let d = 0; d <= R.rangeM; d += 1) {
    const x = bow + s.face * d * M;
    for (let y = top; y <= keel; y += 1.5 * M) if (solid(g.map, x, y)) return d;
    // a pier ahead
    if (PORTS.some((p) => Math.abs(p.x - x) < M)) return d;
  }
  return null;
}

/** Seconds between two beeps at this distance (m). */
export const beepEvery = (m: number): number =>
  R.beepNear + (R.beepFar - R.beepNear) * Math.max(0, Math.min(1, m / R.rangeM));

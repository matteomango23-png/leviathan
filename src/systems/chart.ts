// The chart of the bridge (cockpit): what lies a couple of km each side of the ship — harbours and outposts you
// found, the borders of the regions, the submarine when it is out, the dens whose echo you heard (the one you follow
// stands out) and the end of the known sea. Pure logic; ui/bridgeChart.ts draws it.
import { SHIP } from '../data/ship';
import { OUTPOSTS, PORTO_FANGO } from '../data/economy';
import { ENDLESS } from '../data/endless';
import { kmToX, SEA_REGIONS } from '../data/regions';
import { WORLD } from '../data/worldLayout';
import { outpostKey } from './economy/places';
import type { GameState } from './game';

export type ChartKind = 'harbour' | 'border' | 'sub' | 'boat' | 'ship' | 'end';

interface ChartMark {
  kind: ChartKind;
  /** Metres from the ship (+ east). */
  dx: number;
  label: string;
}

export interface Chart {
  /** How far it shows each side (m). */
  halfM: number;
  marks: ChartMark[];
}

type ChartWorld = Pick<GameState, 'ship' | 'sub' | 'boat' | 'seen'>;

export function chartAround(g: ChartWorld): Chart {
  const halfM = SHIP.chart.halfKm * 1000;
  // from the abyssal submarine's own cockpit, the chart is round the submarine, the ship a mark on it
  const x = g.sub.aboard ? g.sub.x : g.ship.x;
  const marks: ChartMark[] = [];
  const add = (kind: ChartKind, wx: number, label: string): void => {
    const dx = Math.round((wx - x) / WORLD.unitsPerMetre);
    if (Math.abs(dx) <= halfM) marks.push({ kind, dx, label });
  };
  add('harbour', PORTO_FANGO.x, PORTO_FANGO.name);
  for (const o of OUTPOSTS) if (g.seen.has(outpostKey(o.id))) add('harbour', o.x, o.name);
  for (const r of SEA_REGIONS) if (r.fromKm > 0) add('border', kmToX(r.fromKm), r.name);
  add('end', ENDLESS.maxX - ENDLESS.endWall, 'Fine del mare conosciuto');
  if (g.sub.owned && g.ship.bay === 'out' && !g.sub.aboard) add('sub', g.sub.x, 'Sottomarino');
  if (g.boat.owned && g.boat.bay === 'out' && !g.boat.aboard) add('boat', g.boat.x, 'Motoscafo');
  if (g.sub.aboard && g.ship.owned) add('ship', g.ship.x, 'Nave');
  // (no legends' dens: owner, 20 ottobre; the hunt is followed with the sonar and the diary)
  marks.sort((a, b) => a.dx - b.dx);
  return { halfM, marks };
}

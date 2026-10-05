// The chart of the bridge (cockpit): what lies a couple of km each side of the ship — harbours and outposts you
// found, the borders of the regions, the submarine when it is out, the dens whose echo you heard (the one you follow
// stands out) and the end of the known sea. Pure logic; ui/bridgeChart.ts draws it.
import { SHIP } from '../data/ship';
import { HUNTS } from '../data/hunts';
import { OUTPOSTS, PORTO_FANGO } from '../data/economy';
import { ENDLESS } from '../data/endless';
import { kmToX, SEA_REGIONS } from '../data/regions';
import { WORLD } from '../data/worldLayout';
import { outpostKey } from './economy/places';
import type { GameState } from './game';
import { huntOpen } from './hunts';

export type ChartKind = 'harbour' | 'border' | 'sub' | 'den' | 'target' | 'end';

export interface ChartMark {
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

type ChartWorld = Pick<GameState, 'ship' | 'sub' | 'seen' | 'hunts' | 'huntPinned' | 'dens' | 'beasts'>;

export function chartAround(g: ChartWorld): Chart {
  const halfM = SHIP.chart.halfKm * 1000;
  const x = g.ship.x;
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
  HUNTS.forEach((h, i) => {
    const den = g.dens[i];
    if (!den || !g.hunts[h.id]?.echo || !huntOpen(h, g.beasts.gone, g.beasts.team)) return;
    add(h.id === g.huntPinned ? 'target' : 'den', den.x, h.name);
  });
  marks.sort((a, b) => a.dx - b.dx);
  return { halfM, marks };
}

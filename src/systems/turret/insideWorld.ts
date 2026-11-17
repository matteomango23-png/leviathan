// The inside view and the running world (owner, 17 novembre 2026: "è come se switchassi da view outside a view
// inside"): it opens where your ship is, with the Compagnia's vessels near it, each at its own distance to your side;
// every frame it writes back into the world where your ship and theirs are along the sea's line, which way they face,
// how fast and how deep — the world goes on around them (the helm and the world's own sailing leave them alone while
// it is open: ship/sail.ts, company/company.ts). Vessels coming near while it is open come into it. Pure logic.
import { INSIDE } from '../../data/turret';
import { afloatEnemies, type EnemyVessel } from '../company/enemyState';
import type { GameState } from '../newGame';
import { newInside, toUnits, type FoeInView, type InsideState } from './insideState';

const U = toUnits(1);

/** A vessel into the view: where it is along the line, its own side, its way. */
function joinFoe(d: InsideState, e: EnemyVessel): FoeInView {
  const a = ((e.x - d.origin.x) * d.origin.face) / U;
  const sides = INSIDE.sides;
  const s = sides[e.id % sides.length]! * (e.id % 2 ? 1 : -1);
  e.inView = true;
  return {
    id: e.id,
    a,
    s: d.you.s + s,
    heading: e.face === d.origin.face ? 0 : Math.PI,
    speed: e.speed / U,
    bearing: Math.atan2(s, a - d.you.a),
    weaveT: 0,
    aimT: 0,
    aimAt: null,
    reload: 1.5,
    depth: e.dive / U,
    torpReload: 3,
    chargeReload: 0,
    home: a,
    homeS: d.you.s + s,
    dir: e.face === d.origin.face ? 1 : -1,
  };
}

/** The vessels near your ship along the line not yet in the view come into it. */
export function joinFoes(g: GameState, d: InsideState): void {
  for (const e of afloatEnemies(g.company)) {
    if (e.inView || Math.abs(e.x - g.ship.x) > toUnits(INSIDE.joinM)) continue;
    d.foes.push(joinFoe(d, e));
  }
}

/** Into the inside view: your ship sailed by it from now on, the turret looking along your bow, as outside (it
 *  never turns by itself to a vessel: one far ahead seemed to come out of nowhere, owner 17 novembre 2026). */
export function openInside(g: GameState): InsideState {
  const s = g.ship;
  const d = newInside({ x: s.x, face: s.face }, s.dive / U, s.speed / U);
  g.company.inside = true;
  s.inside = true;
  joinFoes(g, d);
  return d;
}

/** The view's places written into the world (each frame). */
export function syncWorld(g: GameState, d: InsideState): void {
  const s = g.ship;
  const o = d.origin;
  s.x = o.x + o.face * toUnits(d.you.a);
  s.face = (Math.cos(d.you.heading) >= 0 ? o.face : -o.face) as 1 | -1;
  // how fast it goes along the line (the engine's noise, the wake)
  s.speed = toUnits(Math.abs(d.you.speed * Math.cos(d.you.heading)));
  s.dive = toUnits(d.you.depth);
  // under way the engine runs (heard by the Compagnia), unless in Silence
  if (!s.silent && Math.abs(d.you.speed) > 0.3 && s.fuel > 0) s.engineOn = true;
  for (const f of d.foes) {
    const e = g.company.enemies.find((x) => x.id === f.id);
    if (!e) continue;
    e.x = o.x + o.face * toUnits(f.a);
    e.face = (Math.cos(f.heading) >= 0 ? o.face : -o.face) as 1 | -1;
    e.speed = e.sinkT > 0 ? 0 : toUnits(Math.abs(f.speed));
    e.dive = toUnits(f.depth);
  }
}

/** Out of the inside view: the world has your ship and the vessels where the view left them, and sails them again. */
export function closeInside(g: GameState, d: InsideState): void {
  syncWorld(g, d);
  const s = g.ship;
  // going astern the world's ship stops: it only sails ahead
  if (d.you.speed < 0) s.speed = 0;
  // turned round in here: out there it goes the other way now — say so (ui/companyMessages.ts)
  if (s.face !== d.origin.face) g.story.pending.push({ type: 'insideTurned', face: s.face });
  s.inside = false;
  g.company.inside = false;
  for (const e of g.company.enemies) e.inView = false;
  g.company.battle = null;
}

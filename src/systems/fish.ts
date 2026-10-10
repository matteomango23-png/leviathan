// Small fish in schools (sardines, mackerel…). Port of initEntities/updateFish from the prototype.
import { ENDLESS } from '../data/endless';
import { SARDINE } from '../data/diver';
import { FISH_LOOK, OTHER_FISH_SCHOOLS } from '../data/economy';
import { SARDINE_SCHOOLS } from '../data/worldLayout';
import { range, type Rng } from './math';
import type { TileMap } from './world/tileMap';

export interface School {
  x: number;
  y: number;
  tx: number;
  ty: number;
  t: number;
  roam: [number, number, number, number];
  /** A school of the endless sea: moved near you when left far behind (endlessLife.ts). */
  roaming?: boolean;
}

export interface Fish {
  kind: string; // FISH id in world.ts
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive: boolean;
  hooked: boolean;
  respawn: number;
  school: School;
  ox: number;
  oy: number;
  phase: number;
}

export interface FishState {
  schools: School[];
  fish: Fish[];
}

export function createFish(map: TileMap, rng: Rng): FishState {
  const schools: School[] = [];
  const fish: Fish[] = [];
  const [sx, sy] = SARDINE.schoolSpread;
  // the schools that follow you in the endless sea start at its edge (moved near you when you get out there)
  const roaming = Array.from({ length: ENDLESS.schools }, (_, i) => {
    const x = ENDLESS.startX + 200 + i * 260;
    return {
      x,
      y: 90 + (i % 3) * 40,
      roam: [x - 200, 40, x + 200, 300] as School['roam'],
      kind: 'sardina',
      roaming: true,
    };
  });
  const defs = [
    ...SARDINE_SCHOOLS.map((s) => ({ ...s, kind: 'sardina', roaming: false })),
    ...OTHER_FISH_SCHOOLS.map((s) => ({ ...s, roaming: false })),
    ...roaming,
  ];
  for (const def of defs) {
    const school: School = {
      x: def.x,
      y: def.y,
      tx: def.x,
      ty: def.y,
      t: 0,
      roam: def.roam,
      roaming: def.roaming,
    };
    schools.push(school);
    const count = FISH_LOOK[def.kind]?.perSchool ?? SARDINE.perSchool;
    for (let k = 0; k < count; k++) {
      const p = map.randomOpen(rng, def.x - 30, def.y - 18, def.x + 30, def.y + 18, 3);
      fish.push({
        kind: def.kind,
        x: p.x,
        y: p.y,
        vx: 0,
        vy: 0,
        alive: true,
        hooked: false,
        respawn: 0,
        school,
        ox: range(rng, -sx, sx),
        oy: range(rng, -sy, sy),
        phase: range(rng, 0, Math.PI * 2),
      });
    }
  }
  return { schools, fish };
}

export interface Threat {
  x: number;
  y: number;
  alive: boolean;
}

export function stepFish(
  state: FishState,
  map: TileMap,
  threat: Threat,
  time: number,
  dt: number,
  rng: Rng,
  /** Hunting packs after the sardines (beasts/packHunt.ts): they flee from them too. */
  hunters: { x: number; y: number }[] = [],
): void {
  for (const sc of state.schools) {
    sc.t -= dt;
    if (sc.t <= 0) {
      const [x0, y0, x1, y1] = sc.roam;
      const p = map.randomOpen(rng, x0, y0, x1, y1, 10);
      sc.tx = p.x;
      sc.ty = p.y;
      sc.t = range(rng, SARDINE.schoolRetarget[0], SARDINE.schoolRetarget[1]);
    }
    const dx = sc.tx - sc.x;
    const dy = sc.ty - sc.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > 2) {
      sc.x += (dx / d) * SARDINE.schoolSpeed * dt;
      sc.y += (dy / d) * SARDINE.schoolSpeed * dt;
    }
  }
  for (const f of state.fish) {
    if (f.hooked) continue;
    if (!f.alive) {
      f.respawn -= dt;
      if (f.respawn <= 0) {
        const p = map.randomOpen(rng, f.school.x - 30, f.school.y - 15, f.school.x + 30, f.school.y + 15, 3);
        f.x = p.x;
        f.y = p.y;
        f.vx = 0;
        f.vy = 0;
        f.alive = true;
      }
      continue;
    }
    let tx = f.school.x + f.ox + Math.sin(time * 1.3 + f.phase) * 6;
    let ty = f.school.y + f.oy + Math.cos(time * 1.1 + f.phase) * 4;
    // far from you (out of sight): it just keeps its place in the school, no swimming against rock to work out
    if (Math.abs(f.x - threat.x) > SARDINE.simRange || Math.abs(f.y - threat.y) > SARDINE.simRange) {
      f.vx = ((tx - f.x) / Math.max(dt, 1e-3)) * 0.1;
      f.vy = ((ty - f.y) / Math.max(dt, 1e-3)) * 0.1;
      f.x += (tx - f.x) * 0.1;
      f.y += (ty - f.y) * 0.1;
      continue;
    }
    const mult = FISH_LOOK[f.kind]?.speedMult ?? 1;
    let sp = SARDINE.swimSpeed * mult;
    // the nearest danger: you, or a hunter of a pack
    let near = threat.alive ? threat : null;
    let nd = near ? Math.hypot(f.x - near.x, f.y - near.y) : Infinity;
    for (const h of hunters) {
      const hd = Math.hypot(f.x - h.x, f.y - h.y);
      if (hd < nd) [near, nd] = [{ ...h, alive: true }, hd];
    }
    const dx = near ? f.x - near.x : 0;
    const dy = near ? f.y - near.y : 0;
    const d = Math.hypot(dx, dy) || 1;
    if (near && d < SARDINE.fleeRadius) {
      tx = f.x + (dx / d) * SARDINE.fleeDistance;
      ty = f.y + (dy / d) * SARDINE.fleeDistance;
      sp = SARDINE.fleeSpeed * mult;
    }
    const ex = tx - f.x;
    const ey = ty - f.y;
    const ed = Math.hypot(ex, ey) || 1;
    const k = Math.min(1, SARDINE.steer * dt);
    f.vx += ((ex / ed) * sp - f.vx) * k;
    f.vy += ((ey / ed) * sp - f.vy) * k;
    map.moveBody(f, SARDINE.radius, dt);
  }
}

/** Removes a fish from the water (caught); it comes back after a while. */
export function takeFish(f: Fish): void {
  f.alive = false;
  f.hooked = false;
  f.respawn = SARDINE.respawnSeconds;
}

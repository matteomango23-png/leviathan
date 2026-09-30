// Small fish in schools (tappa 1: sardines). Port of initEntities/updateFish from the prototype.
import { SARDINE } from '../data/diver';
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
}

export interface Fish {
  kind: 'sardina';
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
  for (const def of SARDINE_SCHOOLS) {
    const school: School = { x: def.x, y: def.y, tx: def.x, ty: def.y, t: 0, roam: def.roam };
    schools.push(school);
    for (let k = 0; k < SARDINE.perSchool; k++) {
      const p = map.randomOpen(rng, def.x - 30, def.y - 18, def.x + 30, def.y + 18, 3);
      fish.push({
        kind: 'sardina',
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
    let sp = SARDINE.swimSpeed;
    const dx = f.x - threat.x;
    const dy = f.y - threat.y;
    const d = Math.hypot(dx, dy) || 1;
    if (threat.alive && d < SARDINE.fleeRadius) {
      tx = f.x + (dx / d) * 50;
      ty = f.y + (dy / d) * 50;
      sp = SARDINE.fleeSpeed;
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

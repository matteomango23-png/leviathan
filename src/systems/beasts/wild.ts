// Wild big beasts (tappa 2: the white shark). Movement follows CLAUDE.md and the shark block of
// update() in prototype/prova-realistica.html: they never turn around in view. They enter from an edge
// slowing down, cruise past near the diver's depth, speed up towards the far edge and leave; off screen they
// wait, turn, and come back from the side they left. Followed, or in view too long, they bolt faster than you.
// Attacks are lunges during a pass, announced by open jaws.
import { BEAST_COMBAT, BIG_BEAST_MOTION as M, STATUS_RULES, TAMING_FLOW } from '../../data/beasts';
import { WEAPON_RULES } from '../../data/economy';
import { DIVER } from '../../data/diver';
import type { GameEvent } from '../events';
import { clamp, range } from '../math';
import type { TileMap } from '../world/tileMap';
import { headOf, inBiteReach } from './combat';
import { attackChanceOf, type WildBeast, type WildContext } from './wildState';
import { updateMood } from './wildStatus';

export * from './wildState';
export { hitWild } from './wildStatus';

const U = DIVER.lengthUnits;

function diverInArea(b: WildBeast, d: WildContext['diver'], map: TileMap): boolean {
  const [x0, y0, x1, y1] = b.spawn.area;
  const m = 60;
  return d.x > x0 - m && d.x < x1 + m && d.y > y0 - m && d.y < y1 + m && d.y > map.surfaceY + 6;
}

/** Keeps a y inside open water near an x (so the beast does not appear inside rock). */
function openY(map: TileMap, x: number, y: number, r: number): number | null {
  for (let k = 0; k <= 12; k++) {
    for (const s of k === 0 ? [0] : [-k, k]) {
      const yy = y + s * 10;
      if (yy > map.surfaceY + r && !map.hitCircle(x, yy, r)) return yy;
    }
  }
  return null;
}

/** Speed the beast wants along its facing, from where it is on screen. */
function wantedSpeed(b: WildBeast, ctx: WildContext, rel: number, off: boolean, aheadOff: boolean): number {
  const d = ctx.diver;
  if (b.motion === 'bolt') return Math.max(M.boltSpeed * U, Math.abs(d.vx) + M.boltOverDiver * U);
  if (off && !aheadOff) return M.catchUpSpeed * U;
  if (b.mood === 'tired') return TAMING_FLOW.tiredSpeed * U;
  if (b.motion === 'attack') return b.telegraph > 0 ? M.cruiseSpeed * U * 0.6 : M.attackSpeed * U;
  if (rel < M.enterZone) return M.enterSpeed * U - (rel / M.enterZone) * M.enterSlowdown * U;
  if (rel < M.exitZone) return M.cruiseSpeed * U;
  return M.cruiseSpeed * U + Math.pow((rel - M.exitZone) / (1 - M.exitZone), 2) * M.exitBoost * U;
}

function goHidden(b: WildBeast, ctx: WildContext): void {
  if (b.mood === 'fleeing') {
    b.motion = 'gone';
    b.mood = 'calm';
    b.respawn = range(ctx.rng, b.spawn.respawnSeconds[0], b.spawn.respawnSeconds[1]);
    return;
  }
  if (b.leaving) {
    b.motion = 'away';
    return;
  }
  b.motion = 'hidden';
  const wait = b.mood === 'angry' ? M.waitHidden : M.waitCalm;
  b.t = range(ctx.rng, wait[0], wait[1]);
}

export function stepWild(b: WildBeast, ctx: WildContext, events: GameEvent[]): void {
  const { dt, view, map, rng } = ctx;
  const d = ctx.diver;
  b.flash = Math.max(0, b.flash - dt);
  b.jaw = Math.max(0, b.jaw - dt);
  b.barTime = Math.max(0, b.barTime - dt);
  b.biteCooldown -= dt;
  b.stun = Math.max(0, b.stun - dt);
  b.slow = Math.max(0, b.slow - dt);
  if (b.motion === 'gone' || b.mood === 'taming') return;
  updateMood(b, dt, events);

  const present = diverInArea(b, d, map);
  if (b.motion === 'away') {
    if (present) {
      b.leaving = false;
      b.motion = 'hidden';
      b.t = range(rng, M.waitCalm[0], M.waitCalm[1]);
    }
    return;
  }
  b.leaving = !present;

  const halfL = b.length * M.offscreenMargin;
  const r = b.length * BEAST_COMBAT.collideRadiusFrac;
  const top = map.surfaceY + b.length * 0.12;
  const ty0 = clamp(d.y + b.dy, top, map.height - r);

  if (b.motion === 'hidden') {
    b.t -= dt;
    b.x = b.face > 0 ? view.x + view.w + halfL * 1.3 : view.x - halfL * 1.3;
    b.y += (ty0 - b.y) * Math.min(1, dt * 2);
    b.vx = 0;
    b.vy = 0;
    if (b.t <= 0 && !b.leaving && !d.dead) {
      b.face = b.face > 0 ? -1 : 1;
      const dy = (rng() * 2 - 1) * M.depthSpread * view.h;
      const y = openY(map, b.x + b.face * halfL, clamp(d.y + dy, top, map.height - r), r * 2);
      if (y === null) {
        b.face = b.face > 0 ? -1 : 1;
        b.t = 1;
        return;
      }
      b.dy = y - d.y;
      b.y = y;
      b.motion = 'enter';
      b.vx = b.face * M.enterSpeed * U;
      b.onScreenTime = 0;
      b.followTime = 0;
      b.attackPlanned = b.mood !== 'tired' && (b.mood === 'angry' || rng() < attackChanceOf(b));
      if (!b.announced) {
        b.announced = true;
        events.push({ type: 'wildAppeared', id: b.id });
      }
    }
    return;
  }

  const sx = b.x - view.x;
  const off = sx < -halfL || sx > view.w + halfL;
  const aheadOff = off && ((b.face > 0 && sx > view.w) || (b.face < 0 && sx < 0));
  const rel = b.face > 0 ? sx / view.w : 1 - sx / view.w;

  if (!off) {
    b.onScreenTime += dt;
    const following = Math.sign(d.vx) === b.face && Math.abs(d.vx) > U * M.followMinSpeed;
    b.followTime = following ? b.followTime + dt : Math.max(0, b.followTime - dt * 0.5);
  }
  const canBolt = b.motion !== 'bolt' && b.motion !== 'attack' && b.mood !== 'tired';
  if (canBolt && (b.followTime > M.followSeconds || b.onScreenTime > M.lingerSeconds)) b.motion = 'bolt';

  if (aheadOff && b.motion !== 'attack') {
    goHidden(b, ctx);
    return;
  }

  // the attack: jaws open (the cue), then a lunge at the diver
  const head = headOf(b);
  if (
    b.attackPlanned &&
    b.mood !== 'tired' &&
    b.stun <= 0 &&
    (b.motion === 'enter' || b.motion === 'cruise') &&
    b.biteCooldown <= 0 &&
    !d.dead
  ) {
    const ahead = (d.x - head.x) * b.face;
    if (ahead > 0 && ahead < BEAST_COMBAT.attackRange * U && Math.abs(d.y - b.y) < view.h * 0.35) {
      b.motion = 'attack';
      b.telegraph = BEAST_COMBAT.telegraphSeconds;
      b.jaw = BEAST_COMBAT.telegraphSeconds + 0.3;
      b.bit = false;
    }
  }
  if (b.motion === 'attack') {
    if (b.telegraph > 0) b.telegraph -= dt;
    else b.jaw = Math.max(b.jaw, 0.2);
    const passed = (d.x - head.x) * b.face < -b.length * 0.1;
    if (b.telegraph <= 0 && !b.bit && !d.dead && inBiteReach(b, d.x, d.y)) {
      b.bit = true;
      b.jaw = 0.45;
      b.biteCooldown = BEAST_COMBAT.biteCooldown;
      events.push({ type: 'wildBite', id: b.id });
    }
    if (b.bit || passed || d.dead || aheadOff) {
      b.motion = 'exit';
      b.attackPlanned = false;
    }
  } else if (b.motion !== 'bolt') {
    b.motion = rel < M.enterZone ? 'enter' : rel < M.exitZone ? 'cruise' : 'exit';
  }

  let want = wantedSpeed(b, ctx, rel, off, aheadOff);
  if (b.stun > 0) want *= STATUS_RULES.stunSlowdown;
  else if (b.slow > 0) want *= WEAPON_RULES.rete.slowMult;
  let ty = b.motion === 'attack' ? clamp(d.y, top, map.height - r) : ty0;
  // look ahead: rock in front of the snout → rise over it
  if (map.solidAt(head.x + b.face * b.length * 0.12, head.y)) ty = b.y - b.length * 0.4;
  const ky = b.motion === 'attack' && b.telegraph <= 0 ? 4 : M.steerY;
  b.vx += (b.face * want - b.vx) * Math.min(1, dt * M.steerX);
  b.vy += ((ty - b.y) * 0.8 - b.vy) * Math.min(1, dt * ky);

  const before = b.vx;
  const blocked = map.moveBody(b, r, dt);
  if (blocked && Math.sign(before) === b.face && Math.abs(b.vx) < Math.abs(before) * 0.5) {
    // against a wall a visible turn is allowed (CLAUDE.md)
    b.face = b.face > 0 ? -1 : 1;
    b.vx = b.face * Math.abs(before) * 0.3;
    b.onScreenTime = 0;
  }

  const wp = clamp(Math.atan2(b.vy, Math.abs(b.vx) + U * 1.5), -M.pitchMax, M.pitchMax);
  const np = b.pitch + (wp - b.pitch) * Math.min(1, dt * M.pitchRate);
  b.pitchV = (np - b.pitch) / Math.max(dt, 1e-3);
  b.pitch = np;
  const speed = Math.hypot(b.vx, b.vy);
  b.phase += dt * (M.swimPhaseBase + (speed / U) * M.swimPhasePerSpeed + (b.motion === 'attack' ? 4 : 0));
}

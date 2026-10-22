// How wild beasts swim around you (owner's decision of 1 ottobre 2026): slowly, as shapes in the dark that
// your lamp reveals. They turn around only out of the light (or against a wall). By temperament they come at
// you, ignore you, or slip away slowly — never vanishing at full speed. Touching one starts a battle.
import { BEAST_TEMPER, PATROL, ROAM, type Temper } from '../../data/beasts';
import { HARPOON_WEAKEN } from '../../data/battle';
import { DIVER } from '../../data/diver';
import { clamp, type Rng } from '../math';
import type { TileMap } from '../world/tileMap';
import { bodiesTouch, bodyCircles, distanceToBody, type BodyPose } from './combat';
import { uniqueOf } from './forms';
import { bodyRadius, isRare, type WildBeast } from './wildState';
import { startPatrol, stepPatrol } from './patrol';
import { stepStalk } from './stalk';
import type { ViewRect } from '../beastState';

const U = DIVER.lengthUnits;

interface RoamContext {
  diver: { x: number; y: number; dead: boolean; vx?: number };
  /** What the camera shows: the big hunters' passes go out of it and back (beasts/patrol.ts). */
  view?: ViewRect | null;
  map: TileMap;
  rng: Rng;
  dt: number;
  /** The sardine swarm hides you: nobody comes at you. */
  hidden: boolean;
  /** Length of the beast you ride (0 on foot): much smaller beasts keep away instead of attacking. */
  riderLength?: number;
  /** The superpredator you ride is far above it: it keeps away (beasts/mountTraits.ts fearOf). */
  riderFear?: boolean;
  /** You are inside your submarine and this beast is not one that rams it: it slips away (submarine.ts). */
  scared?: boolean;
  /** The beast you ride: touching its body counts as touching you (owner, 4 ottobre). */
  rider?: BodyPose;
}

/** Rare beasts are always shy (you have to reach them); named ones always come at you. */
export function temperOf(b: WildBeast): Temper {
  if (b.boss) return 'aggressive';
  const legend = uniqueOf(b.form)?.temper;
  if (legend) return legend;
  if (isRare(b)) return 'shy';
  return BEAST_TEMPER[b.form.speciesId]?.temper ?? 'calm';
}

/** A random point of open water in the beast's area (near `near` if given). */
export function wanderPoint(
  b: WildBeast,
  map: TileMap,
  rng: Rng,
  near?: { x: number; y: number },
): { x: number; y: number } {
  const [x0, y0, x1, y1] = b.spawn.area;
  const r = bodyRadius(b) * 2;
  const span = 320;
  const ax = near ? Math.max(x0, near.x - span) : x0;
  const bx = near ? Math.min(x1, near.x + span) : x1;
  const p = map.randomOpen(rng, ax, Math.max(y0, map.surfaceY + r), bx, y1, r);
  // crabs and isopods walk on the floor: their places are on it (owner, 8 ottobre)
  if (BEAST_TEMPER[b.form.speciesId]?.floor) p.y = map.floorBelow(p.x, p.y) - r * 0.5;
  return p;
}

/** The floor's top at x near height y: climbing out if y is in rock, down to it if y is in water. */
export function floorNear(map: TileMap, x: number, y: number): number {
  let yy = y;
  if (map.solidAt(x, yy)) {
    const limit = yy - 2000;
    while (yy > limit && map.solidAt(x, yy)) yy -= 2;
    return yy + 2;
  }
  return map.floorBelow(x, yy);
}

/** A place in the dark to appear: in its area, at least ROAM.spawnMinDistance from you. */
export function appearPoint(
  b: WildBeast,
  map: TileMap,
  rng: Rng,
  diver: { x: number; y: number },
  seen: (x: number, y: number) => boolean = () => false,
): { x: number; y: number } | null {
  for (let i = 0; i < 30; i++) {
    const p = wanderPoint(b, map, rng);
    if (Math.hypot(p.x - diver.x, p.y - diver.y) >= ROAM.spawnMinDistance && !seen(p.x, p.y)) return p;
  }
  return null;
}

function turnAround(b: WildBeast): void {
  b.turnFrom = b.face;
  b.turn = 0.001;
  b.face = b.face > 0 ? -1 : 1;
}

/** One step. Returns true when the beast touches the diver (a battle starts). */
export function stepRoam(b: WildBeast, ctx: RoamContext): boolean {
  const { dt, map, rng } = ctx;
  const d = ctx.diver;
  b.flash = Math.max(0, b.flash - dt);
  b.jaw = Math.max(0, b.jaw - dt);
  b.calm = Math.max(0, b.calm - dt);
  b.provoked = Math.max(0, (b.provoked ?? 0) - dt);
  const roused = (b.provoked ?? 0) > 0;
  if (b.motion === 'gone') return false;
  // roused by your weapon or your mount's bite: it stalks you, charging from the dark (beasts/stalk.ts)
  const st = b.stalk ? stepStalk(b, ctx.diver, ctx.view, rng, dt) : null;
  if (st) [b.patrol, b.mood] = [undefined, 'chase'];

  const dist = Math.hypot(d.x - b.x, d.y - b.y);
  const temper = temperOf(b);
  const quiet = d.dead || b.calm > 0 || ctx.hidden;
  // named beasts (a Guardian in its lair, a commander's beast) always know where you are
  const sight = b.boss ? Infinity : ROAM.sightRange * U;
  // on its passes it goes far off the screen and comes back: it does not lose you meanwhile
  const lose = b.boss || b.patrol ? Infinity : ROAM.loseRange * U;
  // a small predator does not come at a diver riding something far bigger than itself: it keeps away
  const afraid = !b.boss && ((ctx.riderLength ?? 0) * ROAM.fearRatio > b.length || !!ctx.riderFear);
  if (quiet && !st) b.mood = 'wander';
  else if (b.mood === 'wander' && dist < sight) {
    b.mood = temper === 'aggressive' && !afraid ? 'chase' : temper === 'shy' || afraid ? 'flee' : 'wander';
    // a big hunter does not always charge at once: now and then a few passes first (beasts/patrol.ts)
    if (b.mood === 'chase' && !b.charging && ctx.view && !st) startPatrol(b, rng);
  } else if (b.mood === 'chase' && afraid) b.mood = 'flee';
  else if (b.mood !== 'wander' && dist > lose) b.mood = 'wander';
  if (ctx.scared && !b.boss && dist < sight) b.mood = 'flee';
  if (b.mood !== 'chase') [b.patrol, b.charging, b.patrolled] = [undefined, undefined, undefined];
  // called by the light under the ship, a curious beast comes on and does not slip away from you (block 5b)
  if (b.drawn && temper !== 'aggressive' && b.mood === 'flee') b.mood = 'wander';

  const spec = BEAST_TEMPER[b.form.speciesId];
  // frightened by your weapon, a calm or shy one much faster (HARPOON_WEAKEN)
  const mult = (spec?.speedMult ?? 1) * (roused && b.mood === 'flee' ? HARPOON_WEAKEN.fleeMult : 1);
  const top = map.surfaceY + b.length * 0.12;
  let tx: number;
  let ty: number;
  let speed: number;
  const pass =
    b.mood === 'chase' && ctx.view && !st ? stepPatrol(b, { ...d, vx: d.vx ?? 0 }, ctx.view, rng, dt) : null;
  if (b.mood === 'chase' && b.patrol === undefined && pass === null && ctx.view && !b.charging && b.patrolled)
    b.charging = true;
  if (st) {
    // its own speed (STALK), its jaws open on the charge; it turns whenever its way turns
    [tx, ty, speed] = [st.tx, st.ty, st.speed];
    if (st.charging) b.jaw = Math.max(b.jaw, 0.3);
    if (Math.sign(tx - b.x) !== b.face && Math.abs(tx - b.x) > 2 && b.turn === 0) turnAround(b);
  } else if (pass) {
    [tx, ty, speed] = [pass.tx, pass.ty, pass.speed * mult];
    if (pass.turn && b.turn === 0) turnAround(b); // off screen, or the turn in view it chose
  } else if (b.mood === 'chase') {
    // after its passes it charges faster (owner: "quando attaccano accelerano")
    [tx, ty, speed] = [d.x, d.y, ROAM.chaseSpeed * U * mult * (b.charging ? PATROL.chargeMult : 1)];
    b.jaw = Math.max(b.jaw, dist < ROAM.sightRange * U * 0.4 ? 0.2 : 0);
  } else if (b.mood === 'flee') {
    const k = (ROAM.loseRange * U) / Math.max(1, dist);
    // frightened by your weapon even a slow one gets away faster than you swim (HARPOON_WEAKEN.fleeOver)
    const flee = roused
      ? Math.max(ROAM.shySpeed * U * mult, DIVER.maxSpeed * HARPOON_WEAKEN.fleeOver)
      : ROAM.shySpeed * U * mult;
    [tx, ty, speed] = [b.x + (b.x - d.x) * k, b.y + (b.y - d.y) * k * 0.5, flee];
  } else if (b.fleeFrom) {
    // a hunter after it (beasts/packHunt.ts): away from it
    const fx = b.x - b.fleeFrom.x;
    const fy = b.y - b.fleeFrom.y;
    const fd = Math.hypot(fx, fy) || 1;
    [tx, ty, speed] = [b.x + (fx / fd) * 200, b.y + (fy / fd) * 100, ROAM.shySpeed * U * mult * 1.3];
  } else if (b.drawn) {
    // the light under the ship: to its place there, then round it slowly
    const near = Math.hypot(b.drawn.x - b.x, b.drawn.y - b.y) < b.length;
    const round = near ? Math.sin(b.phase * 0.05) * b.length * 1.5 : 0;
    [tx, ty, speed] = [b.drawn.x + round, b.drawn.y, ROAM.cruiseSpeed * U * mult * (near ? 0.5 : 1)];
  } else if (b.hunt) {
    // its pack hunts: after the sardines or a smaller beast
    [tx, ty, speed] = [b.hunt.x, b.hunt.y, ROAM.chaseSpeed * U * mult];
  } else {
    if (!b.target || Math.hypot(b.target.x - b.x, b.target.y - b.y) < ROAM.targetReach)
      b.target = wanderPoint(b, map, rng, b);
    [tx, ty, speed] = [b.target.x, b.target.y, ROAM.cruiseSpeed * U * mult];
  }
  // stay in its own waters; a hunter follows you a little way out of them, then gives up and goes back
  const [x0, y0, x1, y1] = b.spawn.area;
  const leash = b.mood === 'chase' ? ROAM.chaseLeash : 0;
  const outside = Math.max(x0 - b.x, b.x - x1, y0 - b.y, b.y - y1, 0);
  if (b.mood === 'chase' && !st && outside > ROAM.chaseLeash * (pass ? 3 : 1)) {
    b.mood = 'wander'; // it gives up and swims home, leaving you alone meanwhile
    b.calm = ROAM.homeSeconds;
  }
  // the light calls it out of its own waters (block 5b)
  if (pass || st)
    ty = Math.max(ty, top); // its passes (and its stalking) go out of the screen, past its waters for a while
  else if (!(b.drawn && b.mood === 'wander')) {
    tx = clamp(tx, x0 - leash, x1 + leash);
    ty = clamp(ty, Math.max(y0 - leash, top), y1 + leash);
  } else ty = Math.max(ty, top);
  if ((spec?.surface || uniqueOf(b.form)?.surface) && b.mood !== 'chase') ty = top;
  // crabs walk on the floor whatever they do: chasing, fleeing or called by the light (owner, 20 ottobre: "il
  // granchio non può fluttuare come un pesce"); the floor a little ahead, so it climbs and goes down its slopes
  const walker = !!spec?.floor;
  if (walker) ty = floorNear(map, b.x + b.face * b.length * 0.4, b.y) - bodyRadius(b);

  // turn around only out of the light (a visible turn is allowed against a wall)
  const want = Math.sign(tx - b.x) || b.face;
  const lit = !d.dead && dist < ROAM.litRadius;
  if (!pass && !st && want !== b.face && b.turn === 0 && !lit && Math.abs(tx - b.x) > b.length * 0.3)
    turnAround(b);

  const len = Math.hypot(tx - b.x, ty - b.y) || 1;
  const wantVx = b.face * Math.abs(((tx - b.x) / len) * speed) || b.face * speed * 0.3;
  const wantVy = walker
    ? clamp((ty - b.y) * ROAM.floorHug, -speed, Math.max(speed, ROAM.floorSink))
    : ((ty - b.y) / len) * speed;
  const k = Math.min(1, dt * ROAM.steer * (st ? 2 : 1)); // stalking it answers faster
  b.vx += (wantVx - b.vx) * k;
  b.vy += (wantVy - b.vy) * k;
  const before = b.vx;
  const blocked = map.moveBody(b, bodyCircles(b), dt); // the whole body against rock, not only its middle
  if (blocked && b.turn === 0 && Math.sign(before) === b.face && Math.abs(b.vx) < Math.abs(before) * 0.5) {
    turnAround(b);
    b.target = null;
  }

  if (b.turn > 0) {
    b.turn += dt / ROAM.turnSeconds;
    if (b.turn >= 1) b.turn = 0;
  }
  const wp = clamp(Math.atan2(b.vy, Math.abs(b.vx) + U * 1.5), -ROAM.pitchMax, ROAM.pitchMax);
  const np = b.pitch + (wp - b.pitch) * Math.min(1, dt * ROAM.pitchRate);
  b.pitchV = (np - b.pitch) / Math.max(dt, 1e-3);
  b.pitch = np;
  b.phase += dt * (ROAM.swimPhaseBase + (Math.hypot(b.vx, b.vy) / U) * ROAM.swimPhasePerSpeed);

  if (st) {
    // stalking, only its charge bites
    if (!st.charging) return false;
  } else if (quiet || pass) return false; // a pass is not an attack: it goes by
  // riding, the battle starts as soon as it touches your beast's body, not only when it reaches you
  if (ctx.rider && bodiesTouch(b, ctx.rider, ROAM.bodyContact)) return true;
  return distanceToBody(b, d.x, d.y) < b.length * ROAM.contactFrac + DIVER.radius;
}

// Sea birds (look only, not saved): a few small flocks of gulls, each living over a school of fish near the
// surface, as the sardines and mackerel live in their areas. A flock flies back and forth over its school,
// turning slowly; now and then a bird plunges on the fish. Flocks only arrive, change home or go to rest beyond
// the edge of the screen, so none ever pops in or out in view. Bad weather sends them away (WeatherLook.birds).
import { BIRDS } from '../data/weather';
import { WORLD } from '../data/worldLayout';
import { CAMERA } from '../data/diver';
import { makeRng, range, type Rng } from './math';

export interface Bird {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Its place in the flock, from the flock centre (behind = against the flight). */
  ox: number;
  oy: number;
  /** Wing beat: phase (radians) and speed (Hz); gliding birds keep their wings open. */
  phase: number;
  flapHz: number;
  glide: number; // seconds left gliding (0: flapping)
  /** Plunging on fish: down to the water, then back up to the flock. */
  dive: 'none' | 'down' | 'up';
  diveX: number;
}

export interface Flock {
  active: boolean;
  /** Going away (bad weather, or no fish left near you): flies off the screen, then rests. */
  leaving: boolean;
  /** Index of the school of fish it lives over (−1: none). */
  home: number;
  x: number;
  y: number;
  vx: number;
  /** Where it is heading: east (1) or west (−1); it turns back when far enough past its home. */
  dir: 1 | -1;
  speed: number;
  patrol: number;
  altitude: number;
  t: number;
  /** Seconds left before it flies off by itself. */
  stay: number;
  birds: Bird[];
}

export interface BirdsState {
  flocks: Flock[];
  rng: Rng;
}

export interface Splash {
  x: number;
  y: number;
}

/** The part of the world on screen, sideways (world units). */
export interface BirdsView {
  x: number; // centre
  halfW: number;
}

export interface School {
  x: number;
  y: number;
}

const SKY_TOP = CAMERA.minY + 6; // birds never fly out of the top of the world

export function createBirds(seed: number = BIRDS.seed): BirdsState {
  const rng = makeRng(seed);
  const flocks: Flock[] = [];
  for (let i = 0; i < BIRDS.flocks; i++)
    flocks.push({
      active: false,
      leaving: false,
      home: -1,
      x: 0,
      y: 0,
      vx: 0,
      dir: 1,
      speed: 0,
      patrol: 0,
      altitude: 0,
      t: 0,
      stay: 0,
      birds: [],
    });
  return { flocks, rng };
}

/** Is a world x beyond the edge of the screen (with room for a whole bird)? */
export const offScreen = (x: number, view: BirdsView): boolean =>
  Math.abs(x - view.x) > view.halfW + BIRDS.offscreenMargin;

/** Is the whole flock beyond the edge of the screen (its centre and every bird)? */
const flockOffScreen = (f: Flock, view: BirdsView): boolean =>
  offScreen(f.x, view) && f.birds.every((b) => offScreen(b.x, view));

/** Can this school be home to a flock (near the surface, near the camera, not taken by another flock)? */
function goodHome(
  s: BirdsState,
  schools: readonly School[],
  i: number,
  view: BirdsView,
  self: Flock,
): boolean {
  const sc = schools[i];
  if (!sc) return false;
  if (sc.y > WORLD.surfaceY + BIRDS.homeMaxDepth || Math.abs(sc.x - view.x) > BIRDS.homeRange) return false;
  return !s.flocks.some((f) => f !== self && f.active && !f.leaving && f.home === i);
}

function pickHome(s: BirdsState, schools: readonly School[], view: BirdsView, self: Flock): number {
  const options: number[] = [];
  for (let i = 0; i < schools.length; i++) if (goodHome(s, schools, i, view, self)) options.push(i);
  if (!options.length) return -1;
  return options[Math.floor(s.rng() * options.length)]!;
}

/** Puts a flock just beyond the edge of the screen on its home's side, flying in towards it. */
function arrive(f: Flock, rng: Rng, view: BirdsView, homeX: number): void {
  const side: 1 | -1 = homeX >= view.x ? 1 : -1;
  f.x = view.x + side * (view.halfW + BIRDS.offscreenMargin + BIRDS.spread[0] * 2);
  f.dir = side === 1 ? -1 : 1;
  f.speed = range(rng, BIRDS.speed[0], BIRDS.speed[1]);
  f.vx = f.dir * f.speed;
  f.patrol = range(rng, BIRDS.patrol[0], BIRDS.patrol[1]);
  f.altitude = range(rng, BIRDS.altitude[0], BIRDS.altitude[1]);
  f.y = WORLD.surfaceY - f.altitude;
  f.t = rng() * 100;
  f.stay = range(rng, BIRDS.staySeconds[0], BIRDS.staySeconds[1]);
  f.active = true;
  f.leaving = false;
  const n = Math.floor(range(rng, BIRDS.perFlock[0], BIRDS.perFlock[1] + 1));
  f.birds = [];
  for (let i = 0; i < n; i++) {
    // a loose, uneven line: each bird a little behind and above or below the one before
    const ox = -i * BIRDS.spread[0] * 0.3 + range(rng, -3, 3);
    const oy = (i % 2 ? 1 : -1) * Math.ceil(i / 2) * BIRDS.spread[1] * 0.35 + range(rng, -1.5, 1.5);
    f.birds.push({
      x: f.x + ox * f.dir,
      y: f.y + oy,
      vx: f.vx,
      vy: 0,
      ox,
      oy,
      phase: rng() * Math.PI * 2,
      flapHz: range(rng, BIRDS.flapHz[0], BIRDS.flapHz[1]),
      glide: rng() < 0.5 ? range(rng, 0.5, 2) : 0,
      dive: 'none',
      diveX: 0,
    });
  }
}

/**
 * One step of the birds.
 * @param view what is on screen sideways: flocks appear and rest only beyond its edges
 * @param wanted share of the flocks that fly in this weather (WeatherLook.birds), 0..1
 * @param wind 0..1: pushes the flocks east
 * @param schools schools of fish: homes of the flocks, and what they plunge on
 * @returns the splashes of birds hitting the water
 */
export function stepBirds(
  s: BirdsState,
  dt: number,
  view: BirdsView,
  wanted: number,
  wind: number,
  schools: readonly School[],
): Splash[] {
  const splashes: Splash[] = [];
  const rng = s.rng;
  const want = Math.round(BIRDS.flocks * Math.max(0, Math.min(1, wanted)));
  let flying = s.flocks.filter((f) => f.active && !f.leaving).length;

  for (const f of s.flocks) {
    if (!f.active) {
      if (flying < want && rng() < dt * BIRDS.arriveChancePerSec) {
        const home = pickHome(s, schools, view, f);
        if (home >= 0) {
          f.home = home;
          arrive(f, rng, view, schools[home]!.x);
          flying++;
        }
      }
      continue;
    }
    f.stay -= dt;
    if (!f.leaving && (flying > want || f.stay <= 0)) {
      f.leaving = true;
      flying--;
    }
    if (!f.leaving && !goodHome(s, schools, f.home, view, f)) {
      // its fish went deep or were left behind: off screen it moves to new fish, in view it flies away
      const home = pickHome(s, schools, view, f);
      if (home >= 0 && flockOffScreen(f, view)) {
        f.home = home;
        if (Math.abs(schools[home]!.x - f.x) > view.halfW * 2) arrive(f, rng, view, schools[home]!.x);
      } else if (home >= 0) f.home = home;
      else {
        f.leaving = true;
        flying--;
      }
    }
    stepFlock(f, dt, view, wind, schools[f.home]);
    if (f.leaving && flockOffScreen(f, view)) {
      f.active = false;
      continue;
    }
    for (const b of f.birds) stepBird(b, f, dt, rng, schools, splashes);
  }
  return splashes;
}

/** The flock centre: back and forth over its home, turning slowly; leaving, straight off the screen. */
function stepFlock(f: Flock, dt: number, view: BirdsView, wind: number, home: School | undefined): void {
  f.t += dt;
  if (f.leaving) f.dir = f.x >= view.x ? 1 : -1;
  else if (home && (f.x - home.x) * f.dir > f.patrol) f.dir = f.dir === 1 ? -1 : 1;
  const target = f.dir * f.speed * (f.leaving ? 1.4 : 1);
  const dv = target - f.vx;
  const step = BIRDS.turnAccel * dt;
  f.vx += Math.max(-step, Math.min(step, dv));
  f.x += (f.vx + wind * BIRDS.windPush) * dt;
  f.y = WORLD.surfaceY - f.altitude + Math.sin(f.t * 0.35) * 5;
}

function stepBird(
  b: Bird,
  f: Flock,
  dt: number,
  rng: Rng,
  schools: readonly School[],
  splashes: Splash[],
): void {
  const surface = WORLD.surfaceY;
  b.glide = Math.max(0, b.glide - dt);
  if (b.glide > 0)
    b.phase = Math.PI * 0.15; // wings held open, a little raised
  else {
    b.phase += dt * Math.PI * 2 * b.flapHz;
    if (rng() < dt * BIRDS.glideChance) b.glide = range(rng, 1, 3);
  }

  if (b.dive === 'none' && !f.leaving && rng() < dt * BIRDS.diveChancePerSec) {
    const fish = schools.find(
      (sh) =>
        sh.y > surface && sh.y < surface + BIRDS.diveShoalDepth && Math.abs(sh.x - b.x) < BIRDS.diveRange,
    );
    if (fish) {
      b.dive = 'down';
      b.diveX = fish.x;
      b.glide = 0;
    }
  }

  // its place in the flock: behind the leader along the flight, so the line turns round with the flock
  const heading = f.vx >= 0 ? 1 : -1;
  const tx = b.dive === 'down' ? b.diveX : f.x + b.ox * heading + Math.sin(f.t * 0.6 + b.oy) * 2;
  const ty =
    b.dive === 'down' ? surface + BIRDS.diveDepth + 2 : f.y + b.oy + Math.sin(f.t * 0.8 + b.ox) * 1.5;
  const pull = b.dive === 'down' ? 5 : 1.6;
  // a damped spring towards its place, plus the flock's own speed: smooth, no stiff formation
  b.vx += ((tx - b.x) * pull + (b.dive === 'down' ? 0 : f.vx * 1.8) - b.vx * 1.8) * dt;
  b.vy += ((ty - b.y) * pull - b.vy * 1.8) * dt;
  if (b.dive === 'down' && b.vy < BIRDS.diveSpeed) b.vy += BIRDS.diveSpeed * 2 * dt;
  b.x += b.vx * dt;
  b.y += b.vy * dt;

  if (b.dive === 'down' && b.y >= surface + BIRDS.diveDepth) {
    b.y = surface + BIRDS.diveDepth;
    b.vy = -BIRDS.diveSpeed * 0.5;
    b.dive = 'up';
    splashes.push({ x: b.x, y: surface });
  } else if (b.dive === 'up' && b.y < surface - 6 && Math.abs(b.y - ty) < 4) b.dive = 'none';
  if (b.dive === 'none' && b.y > surface - 3) {
    b.y = surface - 3; // only a plunging bird touches the water
    b.vy = Math.min(0, b.vy);
  }
  if (b.y < SKY_TOP) b.y = SKY_TOP;
}

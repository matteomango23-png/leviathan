// Sea birds (look only, not saved): a few flocks of gulls and gannets flying over the water around the camera.
// Each bird keeps its place in the flock with a little wander; now and then one plunges on a school of sardines
// near the surface. Bad weather sends the flocks away (WeatherLook.birds), calm weather brings them back.
import { BIRDS } from '../data/weather';
import { WORLD } from '../data/worldLayout';
import { CAMERA } from '../data/diver';
import { makeRng, range, type Rng } from './math';

export interface Bird {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Its place in the flock, from the flock centre. */
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
  /** Leaving: climbs away and is put to rest once out of sight. */
  leaving: boolean;
  x: number;
  y: number;
  dir: 1 | -1;
  speed: number;
  altitude: number;
  t: number;
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

const SKY_TOP = CAMERA.minY + 6; // birds never fly out of the top of the world

export function createBirds(seed: number = BIRDS.seed): BirdsState {
  const rng = makeRng(seed);
  const flocks: Flock[] = [];
  for (let i = 0; i < BIRDS.flocks; i++)
    flocks.push({
      active: false,
      leaving: false,
      x: 0,
      y: 0,
      dir: 1,
      speed: 0,
      altitude: 0,
      t: 0,
      birds: [],
    });
  return { flocks, rng };
}

/** Puts a flock at the edge of the view, flying in towards the camera. */
function launch(f: Flock, rng: Rng, camX: number): void {
  f.dir = rng() < 0.5 ? 1 : -1;
  f.x = camX - f.dir * BIRDS.enterOffset;
  f.altitude = range(rng, BIRDS.altitude[0], BIRDS.altitude[1]);
  f.y = WORLD.surfaceY - f.altitude;
  f.speed = range(rng, BIRDS.speed[0], BIRDS.speed[1]);
  f.t = rng() * 100;
  f.active = true;
  f.leaving = false;
  const n = Math.round(range(rng, BIRDS.perFlock[0], BIRDS.perFlock[1] + 0.99) - 0.49);
  f.birds = [];
  for (let i = 0; i < n; i++) {
    // a loose V: the leader in front, the others behind and to either side
    const row = Math.ceil(i / 2);
    const side = i % 2 ? 1 : -1;
    const ox = -f.dir * row * BIRDS.spread[0] * 0.35 + range(rng, -2, 2);
    const oy = side * row * BIRDS.spread[1] * 0.35 + range(rng, -1.5, 1.5);
    f.birds.push({
      x: f.x + ox,
      y: f.y + oy,
      vx: f.dir * f.speed,
      vy: 0,
      ox,
      oy,
      phase: rng() * Math.PI * 2,
      flapHz: range(rng, BIRDS.flapHz[0], BIRDS.flapHz[1]),
      glide: 0,
      dive: 'none',
      diveX: 0,
    });
  }
}

/**
 * One step of the birds.
 * @param camX the camera centre (flocks live around it)
 * @param wanted share of the flocks that fly in this weather (WeatherLook.birds), 0..1
 * @param wind 0..1: pushes the flocks east
 * @param shoals schools of fish (centres): birds plunge on those just under the surface
 * @returns the splashes of birds hitting the water
 */
export function stepBirds(
  s: BirdsState,
  dt: number,
  camX: number,
  wanted: number,
  wind: number,
  shoals: readonly { x: number; y: number }[],
): Splash[] {
  const splashes: Splash[] = [];
  const rng = s.rng;
  const want = Math.round(BIRDS.flocks * Math.max(0, Math.min(1, wanted)));
  let flying = s.flocks.filter((f) => f.active && !f.leaving).length;
  for (const f of s.flocks) {
    if (f.active && !f.leaving && flying > want) {
      f.leaving = true;
      flying--;
    } else if (!f.active && flying < want && rng() < dt * 0.5) {
      launch(f, rng, camX);
      flying++;
    }
  }

  for (const f of s.flocks) {
    if (!f.active) continue;
    f.t += dt;
    f.x += (f.dir * f.speed + wind * BIRDS.windPush) * dt;
    if (f.leaving) f.y -= dt * 10;
    else f.y = WORLD.surfaceY - f.altitude + Math.sin(f.t * 0.4) * 4;
    const far = Math.abs(f.x - camX) > BIRDS.keepWithin;
    if (f.leaving && (far || f.y < SKY_TOP - 20)) {
      f.active = false;
      continue;
    }
    if (far && !f.leaving) {
      // left far behind (or flew far ahead): it comes back in from the edge, as the sardines do
      launch(f, rng, camX);
      continue;
    }
    for (const b of f.birds) stepBird(b, f, dt, rng, shoals, splashes);
  }
  return splashes;
}

function stepBird(
  b: Bird,
  f: Flock,
  dt: number,
  rng: Rng,
  shoals: readonly { x: number; y: number }[],
  splashes: Splash[],
): void {
  const surface = WORLD.surfaceY;
  b.phase += dt * Math.PI * 2 * (b.glide > 0 ? 0 : b.flapHz);
  b.glide = Math.max(0, b.glide - dt);
  if (b.glide <= 0 && rng() < dt * BIRDS.glideChance) b.glide = range(rng, 0.8, 2.2);

  if (b.dive === 'none' && !f.leaving && rng() < dt * BIRDS.diveChancePerSec) {
    const fish = shoals.find(
      (sh) =>
        sh.y > surface && sh.y < surface + BIRDS.diveShoalDepth && Math.abs(sh.x - b.x) < BIRDS.diveRange,
    );
    if (fish) {
      b.dive = 'down';
      b.diveX = fish.x;
      b.glide = 0;
    }
  }

  let tx: number;
  let ty: number;
  let pull: number;
  if (b.dive === 'down') {
    tx = b.diveX;
    ty = surface + BIRDS.diveDepth + 2;
    pull = 6;
  } else {
    tx = f.x + b.ox + Math.sin(f.t * 0.7 + b.phase * 0.05) * 2;
    ty = f.y + b.oy + Math.sin(f.t * 0.9 + b.ox) * 1.5;
    pull = b.dive === 'up' ? 2.5 : 3;
  }
  // steer towards its place: a spring with damping keeps the flock together without stiff formation
  b.vx += ((tx - b.x) * pull - b.vx * 1.6 + (b.dive === 'down' ? 0 : f.dir * f.speed * 1.6)) * dt;
  b.vy += ((ty - b.y) * pull - b.vy * 1.6) * dt;
  if (b.dive === 'down') {
    const sp = Math.hypot(b.vx, b.vy);
    if (sp < BIRDS.diveSpeed) b.vy += BIRDS.diveSpeed * 2 * dt;
  }
  b.x += b.vx * dt;
  b.y += b.vy * dt;

  if (b.dive === 'down' && b.y >= surface + BIRDS.diveDepth) {
    b.y = surface + BIRDS.diveDepth;
    b.vy = -BIRDS.diveSpeed * 0.6;
    b.dive = 'up';
    splashes.push({ x: b.x, y: surface });
  } else if (b.dive === 'up' && b.y < surface - 6 && Math.abs(b.y - ty) < 4) b.dive = 'none';
  if (b.dive === 'none' && b.y > surface - 3) {
    b.y = surface - 3; // only a plunging bird touches the water
    b.vy = Math.min(0, b.vy);
  }
  if (b.y < SKY_TOP - 30) b.y = SKY_TOP - 30;
}

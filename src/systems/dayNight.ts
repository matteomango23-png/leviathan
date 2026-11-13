// The day and the night (lot N1; data/daynight.ts): the clock of the sea, how dark it is (`nightness`), and sleeping,
// the time running fast until evening or morning, stopped whenever you like. Pure logic; saved like the weather.
import { DAY, NIGHT, SLEEP, type DayPhase } from '../data/daynight';
import { clamp, type Rng } from './math';

export interface DayState {
  /** 0..1: where in the cycle we are, from the start of dawn. */
  t: number;
  /** Asleep: the phase where it stops by itself. */
  sleeping: { until: DayPhase } | null;
}

/** What is saved of it. */
export interface SavedDay {
  t: number;
}

export const createDay = (saved?: SavedDay | null): DayState => ({
  t: saved ? saved.t : DAY.startAt,
  sleeping: null,
});

export const saveDay = (d: DayState): SavedDay => ({ t: Math.round(d.t * 10000) / 10000 });

/** A saved clock read back (null: missing or not valid: the game starts in the morning). */
export function checkedDay(raw: unknown): SavedDay | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const t = (raw as Record<string, unknown>).t;
  if (typeof t !== 'number' || !Number.isFinite(t)) return null;
  return { t: ((t % 1) + 1) % 1 };
}

/** Where each phase starts (fraction of the cycle). */
export function phaseStart(id: DayPhase): number {
  let at = 0;
  for (const p of DAY.phases) {
    if (p.id === id) return at;
    at += p.share;
  }
  return 0;
}

/** The phase at t, and how far through it (0..1). */
export function phaseAt(t: number): { id: DayPhase; name: string; u: number } {
  let at = 0;
  for (const p of DAY.phases) {
    if (t < at + p.share) return { id: p.id, name: p.name, u: (t - at) / p.share };
    at += p.share;
  }
  const last = DAY.phases[DAY.phases.length - 1]!;
  return { id: last.id, name: last.name, u: 1 };
}

const smooth = (u: number): number => u * u * (3 - 2 * u);

/** How dark it is: 0 by day, 1 at night, softly in between at dawn and dusk. */
export function nightness(d: { t: number }): number {
  const p = phaseAt(d.t);
  if (p.id === 'giorno') return 0;
  if (p.id === 'notte') return 1;
  return p.id === 'alba' ? 1 - smooth(p.u) : smooth(p.u);
}

/** The time of day shown, "Notte · 23:40". */
export function clockText(d: { t: number }): string {
  const hours = (DAY.dawnHour + d.t * 24) % 24;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${phaseAt(d.t).name} · ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** How much faster the time runs right now (1 awake). */
export const timeSpeed = (d: DayState): number => (d.sleeping ? SLEEP.speed : 1);

/** Starts sleeping until the evening ("sera") or the morning ("mattino"). */
export function startSleep(d: DayState, until: keyof typeof SLEEP.targets): void {
  d.sleeping = { until: SLEEP.targets[until] };
}

export function stopSleep(d: DayState): void {
  d.sleeping = null;
}

/**
 * One step of the clock (dt in real seconds; asleep it runs SLEEP.speed times faster). Returns why the sleep
 * ended this step: 'reached' (the chosen hour), a wake reason (open sea), or null.
 */
export function stepDay(d: DayState, dt: number, rng: Rng, safe: boolean): string | null {
  const before = d.t;
  const step = (dt * timeSpeed(d)) / DAY.cycleSeconds;
  d.t = (d.t + step) % 1;
  if (!d.sleeping) return null;
  const target = phaseStart(d.sleeping.until);
  const passed = before <= d.t ? before < target && d.t >= target : before < target || d.t >= target;
  if (passed) {
    d.t = target;
    d.sleeping = null;
    return 'reached';
  }
  // something in the open sea: a beast bumping the hull, a gust (never at a port)
  const hours = step * 24;
  if (!safe && rng() < clamp(SLEEP.wakePerHour * hours, 0, 1)) {
    d.sleeping = null;
    return SLEEP.wakeReasons[Math.floor(rng() * SLEEP.wakeReasons.length)]!;
  }
  return null;
}

/** Test panel: jumps to the start of the next phase. */
export function skipPhase(d: DayState): string {
  const i = DAY.phases.findIndex((p) => p.id === phaseAt(d.t).id);
  const next = DAY.phases[(i + 1) % DAY.phases.length]!;
  d.t = phaseStart(next.id);
  return next.name;
}

/** The night's darkness at a depth in metres (negative: over the surface), at full night (data/daynight.ts NIGHT). */
export function nightDarkAt(depthM: number): number {
  const N = NIGHT;
  if (depthM < 0) {
    const u = Math.min(1, -depthM / N.skyFadeM);
    return N.horizonDark + (N.skyDark - N.horizonDark) * u;
  }
  const u = Math.min(1, depthM / N.blackByM);
  return N.surfaceDark + (N.deepDark - N.surfaceDark) * (1 - (1 - u) * (1 - u));
}

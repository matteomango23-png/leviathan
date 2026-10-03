// Chapter 4 (data/chapter4.ts): above the Foresta Sommersa the Vedova's ship sounds the Corno delle Catene through a
// bronze bell; bound by it, La Piovra guards a sunken galleon and her tentacles rise from the kelp at whoever
// comes. Break the bell (three hits) and the spell breaks; by the wreck she fights you (a boss battle); beaten,
// her collar snaps and she joins you; the Vedova sails towards the Mare di Ghiaccio. Progress is kept in the
// story's "seen" list (saved); the tentacles and the grab are not saved.
import { BELL, CHAPTER4_MARKS, CHAPTER4_TEXT, PIOVRA, TENTACLES, WRECK } from '../data/chapter4';
import { MARKET } from '../data/economy';
import { GUARDIAN_TEETH_REWARD } from '../data/world';
import type { BeastState } from './beastState';
import { formLengthUnits } from './beasts/forms';
import { addTamed, makeTeamBeast } from './beasts/team';
import { createWild, isInWater, removeWild, spawnWild, type WildBeast } from './beasts/wildState';
import type { Chapter3World } from './chapter3';
import { requestBattle } from './encounters';
import type { GameEvent } from './events';
import type { InputState } from './input';
import { range } from './math';
import { openDialogue, setStep } from './story';

const PIOVRA_ID = 902;
const FORM = { speciesId: PIOVRA.speciesId, variant: 'comune' as const };
const M = CHAPTER4_MARKS;

export interface Tentacle {
  x: number;
  /** 'down' (hidden in the kelp), 'warn' (the kelp shakes), 'up' (raised: it grabs). */
  stage: 'down' | 'warn' | 'up';
  t: number;
}

export interface Chapter4State {
  bellHp: number;
  tentacles: Tentacle[];
  /** The tentacle holding you, and the dash taps still needed. */
  grab: { i: number; taps: number } | null;
  /** Seconds before a tentacle may grab you again. */
  grabCooldown: number;
}

export interface Chapter4World extends Chapter3World {
  chapter4: Chapter4State;
}

export function createChapter4(beasts: BeastState, seen: string[]): Chapter4State {
  const area: [number, number, number, number] = [
    WRECK.x - WRECK.arena.rx,
    WRECK.arena.top,
    WRECK.x + WRECK.arena.rx,
    WRECK.floorY,
  ];
  const p = createWild(PIOVRA_ID, { speciesId: PIOVRA.speciesId, area, respawnSeconds: [0, 0] });
  p.arena = true;
  p.storyBoss = true;
  beasts.wilds.push(p);
  return {
    bellHp: seen.includes(M.bell) ? 0 : BELL.hp,
    tentacles: TENTACLES.xs.map((x, i) => ({ x, stage: 'down', t: 1 + i * 0.9 })),
    grab: null,
    grabCooldown: 0,
  };
}

const piovraOf = (g: Chapter4World): WildBeast => g.beasts.wilds.find((w) => w.id === PIOVRA_ID)!;
export const spellBroken = (g: Chapter4World): boolean => g.story.seen.includes(M.bell);
const restY = (): number => WRECK.floorY - formLengthUnits(FORM, PIOVRA.level) * 0.22;

/** A weapon tip on the bell. Returns true if it hit it (the shot stops there). */
export function hitBell(g: Chapter4World, x: number, y: number, events: GameEvent[]): boolean {
  const c = g.chapter4;
  if (g.story.step !== 'freePiovra' || c.bellHp <= 0) return false;
  if (Math.hypot(x - BELL.x, y - BELL.y) > BELL.reach) return false;
  c.bellHp--;
  events.push({ type: 'harpoonHitRock', x, y });
  events.push({ type: 'storyNote', text: CHAPTER4_TEXT.bellHit(c.bellHp) });
  if (c.bellHp <= 0) {
    g.story.seen.push(M.bell);
    c.grab = null;
  }
  return true;
}

/** The tentacles rise from the kelp in turn while the spell holds, and grab a diver who comes too close. */
function stepTentacles(g: Chapter4World, input: InputState, dt: number, events: GameEvent[]): void {
  const c = g.chapter4;
  const d = g.diver;
  c.grabCooldown = Math.max(0, c.grabCooldown - dt);
  const G = TENTACLES.grab;
  if (c.grab) {
    // held: pulled towards its base, losing air, until you tap free
    const t = c.tentacles[c.grab.i]!;
    if (input.dash) c.grab.taps--;
    d.vx = 0;
    d.vy = 0;
    d.x += Math.sign(t.x - d.x) * Math.min(Math.abs(t.x - d.x), G.pull * dt);
    d.y += Math.min(G.pull * dt, Math.max(0, WRECK.floorY - 20 - d.y));
    d.o2 = Math.max(0, d.o2 - G.o2PerSecond * dt);
    if (c.grab.taps <= 0 || d.dead) {
      c.grab = null;
      c.grabCooldown = G.cooldown;
      t.stage = 'down';
      t.t = range(g.rng, TENTACLES.rest[0], TENTACLES.rest[1]);
      if (!d.dead) events.push({ type: 'storyNote', text: CHAPTER4_TEXT.freed });
    }
    return;
  }
  c.tentacles.forEach((t, i) => {
    if (Math.abs(d.x - t.x) > TENTACLES.wakeRange) return; // asleep while you are far
    t.t -= dt;
    if (t.t <= 0) {
      t.stage = t.stage === 'down' ? 'warn' : t.stage === 'warn' ? 'up' : 'down';
      t.t =
        t.stage === 'warn'
          ? TENTACLES.warn
          : t.stage === 'up'
            ? TENTACLES.up
            : range(g.rng, ...TENTACLES.rest);
    }
    if (t.stage !== 'up' || c.grabCooldown > 0 || d.dead) return;
    // along the raised tentacle, from the floor up
    const top = WRECK.floorY - TENTACLES.height;
    if (Math.abs(d.x - t.x) < TENTACLES.reach && d.y > top - TENTACLES.reach) {
      c.grab = { i, taps: G.taps };
      events.push({ type: 'storyNote', text: CHAPTER4_TEXT.grabbed });
    }
  });
}

function reward(g: Chapter4World, events: GameEvent[]): void {
  if (g.story.seen.includes(M.reward)) return;
  g.story.seen.push(M.reward);
  g.gear.teeth += GUARDIAN_TEETH_REWARD;
  g.gear.mythicStock = MARKET.mythicHarpoonStock;
  events.push({ type: 'guardianBeaten', teeth: GUARDIAN_TEETH_REWARD });
}

const inArena = (x: number, y: number, margin = 0): boolean =>
  Math.abs(x - WRECK.x) < WRECK.arena.rx + margin && y > WRECK.arena.top - margin && y < WRECK.floorY + 10;

/** The Piovra by the wreck: she rises when you come, crawls along the hull towards you, touches you: battle. */
function stepPiovra(g: Chapter4World, dt: number, events: GameEvent[]): void {
  const p = piovraOf(g);
  const d = g.diver;
  if (p.beaten) {
    removeWild(p, 0);
    p.beaten = undefined;
    g.beasts.arena = false;
    g.story.seen.push(M.down);
    reward(g, events);
    events.push({ type: 'storyNote', text: CHAPTER4_TEXT.exhausted });
    return;
  }
  if (!isInWater(p)) {
    if (g.beasts.battle || d.dead || !inArena(d.x, d.y)) return;
    const side = d.x < WRECK.x ? 1 : -1;
    const x = WRECK.x + side * WRECK.arena.rx * 0.4;
    spawnWild(p, FORM, PIOVRA.level, x, restY(), side > 0 ? -1 : 1);
    p.boss = PIOVRA.title;
    g.beasts.arena = true;
    events.push({ type: 'storyNote', text: CHAPTER4_TEXT.fight });
    return;
  }
  if (d.dead || !inArena(d.x, d.y, 40)) {
    removeWild(p, 0);
    g.beasts.arena = false;
    return;
  }
  if (g.beasts.battle) return;
  p.calm = Math.max(0, p.calm - dt);
  const half = WRECK.arena.rx - p.length * 0.3;
  const tx = Math.max(WRECK.x - half, Math.min(WRECK.x + half, d.x));
  const step = Math.max(-PIOVRA.walkSpeed * dt, Math.min(PIOVRA.walkSpeed * dt, tx - p.x));
  p.vx = step / Math.max(dt, 1e-6);
  p.x += step;
  p.y = restY();
  p.phase += dt * 2;
  if (Math.abs(d.x - p.x) > 2) p.face = d.x > p.x ? 1 : -1;
  if (Math.hypot(d.x - p.x, d.y - p.y) < p.length * 0.4 + PIOVRA.reach && p.calm <= 0)
    requestBattle(g, p, 'foe', events);
}

const nearShip = (g: Chapter4World): boolean =>
  g.diver.y > g.map.surfaceY && Math.abs(g.diver.x - PIOVRA.shipX) < PIOVRA.meetDistance;

/** One step of chapter 4 (after stepChapter3). */
export function stepChapter4(g: Chapter4World, input: InputState, dt: number, events: GameEvent[]): void {
  const s = g.story;
  if (s.dialogue || g.diver.dead) {
    g.chapter4.grab = null;
    return;
  }
  if (s.step === 'chapter3Done' && !s.ship && nearShip(g)) openDialogue(s, 'piovra', events);
  if (s.step !== 'freePiovra') return;
  if (!spellBroken(g)) stepTentacles(g, input, dt, events);
  else if (!s.seen.includes(M.down)) stepPiovra(g, dt, events);
  else openDialogue(s, 'piovraFree', events);
}

/** The last line of a chapter 4 dialogue was read. */
export function closeChapter4Dialogue(g: Chapter4World, id: string, events: GameEvent[]): void {
  const s = g.story;
  if (id === 'piovra') setStep(s, 'freePiovra', events);
  else if (id === 'piovraFree') {
    if (!g.beasts.team.some((b) => b.form.speciesId === PIOVRA.speciesId)) {
      const b = addTamed(
        g.beasts.team,
        makeTeamBeast(`b${g.beasts.nextUid++}`, { ...FORM }, PIOVRA.level, true),
      );
      g.seen.add(PIOVRA.speciesId);
      events.push({ type: 'tamed', uid: b.uid, toTeam: b.inTeam });
    }
    s.ship = { x: PIOVRA.shipX, untilX: PIOVRA.shipX + PIOVRA.shipLeaveDistance, whale: false };
    events.push({ type: 'storyNote', text: CHAPTER4_TEXT.chapterDone });
    setStep(s, 'chapter4Done', events);
  }
}

/** The chapter 4 goal under the hearts, or null. */
export function chapter4Objective(g: Chapter4World): string | null {
  const s = g.story.step;
  if (s === 'chapter3Done') return CHAPTER4_TEXT.objective;
  if (s === 'freePiovra') return spellBroken(g) ? CHAPTER4_TEXT.fight : CHAPTER4_TEXT.bell(g.chapter4.bellHp);
  if (s === 'chapter4Done') return CHAPTER4_TEXT.done;
  return null;
}

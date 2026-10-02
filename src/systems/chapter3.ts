// Chapter 3 (data/chapter3.ts): above the Barriera Rossa the Vedova's ship is anchored; three chains tear the
// Re Corallo from his throne at the bottom of an amphitheatre of coral. Swimming near the ship she speaks; going
// down into the bowl he rises and comes at you (a boss battle, no fleeing). Beaten he lies exhausted and the
// chains can be broken; tamed in battle the chains give way by themselves. Free, he joins you and the ship
// sails towards the Foresta Sommersa. What is done is kept in the story's "seen" list (saved).
import { ARENA, CHAPTER3_MARKS, CHAPTER3_TEXT, CORAL_KING } from '../data/chapter3';
import { MARKET } from '../data/economy';
import { OBJECTIVES, type DialogueId } from '../data/story';
import { GUARDIAN_TEETH_REWARD } from '../data/world';
import type { BeastState } from './beastState';
import { formLengthUnits } from './beasts/forms';
import { addTamed, makeTeamBeast } from './beasts/team';
import { createWild, isInWater, removeWild, spawnWild, type WildBeast } from './beasts/wildState';
import type { Chapter2World } from './chapter2';
import { requestBattle } from './encounters';
import type { GameEvent } from './events';
import { openDialogue, setStep } from './story';
import { arenaFloor, inArenaBowl } from './world/arena';

const KING_ID = 901;
const SEEN = CHAPTER3_MARKS;
const KING_FORM = { speciesId: CORAL_KING.speciesId, variant: 'comune' as const };

export interface Chapter3State {
  /** Hits each chain can still take (0 = broken). */
  chains: number[];
  /** Game time of the last "he is still fighting" message (not to repeat it at every shot). */
  warnedAt: number;
}

export interface Chapter3World extends Chapter2World {
  chapter3: Chapter3State;
  time: number;
}

/** Adds the Re Corallo to the wild beasts (out of the world until you come down into the amphitheatre). */
export function createChapter3(beasts: BeastState, seen: string[]): Chapter3State {
  const area: [number, number, number, number] = [
    ARENA.x - ARENA.rx,
    ARENA.y0,
    ARENA.x + ARENA.rx,
    ARENA.y0 + ARENA.depth,
  ];
  const king = createWild(KING_ID, { speciesId: CORAL_KING.speciesId, area, respawnSeconds: [0, 0] });
  king.arena = true;
  king.storyBoss = true;
  beasts.wilds.push(king);
  return {
    chains: CORAL_KING.chains.map((_, i) => (seen.includes(SEEN.chain(i)) ? 0 : CORAL_KING.chainHp)),
    warnedAt: -99,
  };
}

const kingOf = (g: Chapter3World): WildBeast => g.beasts.wilds.find((w) => w.id === KING_ID)!;
export const kingDown = (g: Chapter3World): boolean => g.story.seen.includes(SEEN.down);
export const chainsBroken = (c: Chapter3State): number => c.chains.filter((h) => h <= 0).length;
const kingLength = (): number => formLengthUnits(KING_FORM, CORAL_KING.level);

/** Where the Re Corallo stands (or lies) at x: his body's centre over the floor of the bowl. */
export function kingRestY(x: number): number {
  return (arenaFloor(x) ?? ARENA.y0 + ARENA.depth) - kingLength() * 0.28;
}

/** The points of the three chains you hit: the winches on the terraces (the middle one runs up to the ship). */
export function chainPoints(): { x: number; y: number; toShip: boolean }[] {
  return CORAL_KING.chains.map((share) => {
    const x = ARENA.x + share * ARENA.rx;
    return share === 0
      ? { x, y: kingRestY(x) - kingLength() * 1.4, toShip: true }
      : { x, y: (arenaFloor(x) ?? ARENA.y0) - 4, toShip: false };
  });
}

/** A weapon tip on a chain. Returns true if it hit one (the shot stops there). */
export function hitChain(g: Chapter3World, x: number, y: number, dmg: number, events: GameEvent[]): boolean {
  if (g.story.step !== 'freeKing') return false;
  const c = g.chapter3;
  const i = chainPoints().findIndex(
    (p, k) => c.chains[k]! > 0 && Math.hypot(p.x - x, p.y - y) < CORAL_KING.chainReach,
  );
  if (i < 0) return false;
  events.push({ type: 'harpoonHitRock', x, y });
  if (!kingDown(g)) {
    if (g.time - c.warnedAt > 4) events.push({ type: 'storyNote', text: CHAPTER3_TEXT.stillFighting });
    c.warnedAt = g.time;
    return true;
  }
  c.chains[i] = Math.max(0, c.chains[i]! - Math.max(1, dmg));
  if (c.chains[i] === 0) {
    g.story.seen.push(SEEN.chain(i));
    events.push({ type: 'storyNote', text: CHAPTER3_TEXT.chainBroken(chainsBroken(c), c.chains.length) });
  }
  return true;
}

/** The Guardian's reward, once: teeth and a mythic harpoon back at the market. */
function reward(g: Chapter3World, events: GameEvent[]): void {
  if (g.story.seen.includes(SEEN.reward)) return;
  g.story.seen.push(SEEN.reward);
  g.gear.teeth += GUARDIAN_TEETH_REWARD;
  g.gear.mythicStock = MARKET.mythicHarpoonStock;
  events.push({ type: 'guardianBeaten', teeth: GUARDIAN_TEETH_REWARD });
}

function leave(g: Chapter3World, king: WildBeast): void {
  removeWild(king, 0);
  king.beaten = undefined;
  g.beasts.arena = false;
}

/** After the battle: exhausted (break the chains now) or tamed (the chains give way by themselves). */
function afterBattle(g: Chapter3World, king: WildBeast, events: GameEvent[]): void {
  const caught = king.beaten === 'caught';
  leave(g, king);
  g.story.seen.push(SEEN.down);
  reward(g, events);
  if (!caught) {
    events.push({ type: 'storyNote', text: CHAPTER3_TEXT.exhausted });
    return;
  }
  g.chapter3.chains = g.chapter3.chains.map(() => 0);
  g.chapter3.chains.forEach((_, i) => g.story.seen.push(SEEN.chain(i)));
  events.push({ type: 'storyNote', text: CHAPTER3_TEXT.caughtFree });
}

/** The Re Corallo in the bowl: he rises when you come down, scuttles sideways after you, touches you: battle. */
function stepKing(g: Chapter3World, dt: number, events: GameEvent[]): void {
  const king = kingOf(g);
  const d = g.diver;
  if (king.beaten) {
    afterBattle(g, king, events);
    return;
  }
  if (!isInWater(king)) {
    if (g.beasts.battle || d.dead || !inArenaBowl(d.x, d.y, CORAL_KING.enterMargin)) return;
    const side = d.x < ARENA.x ? 1 : -1; // from the far side of the bowl
    const x = ARENA.x + side * ARENA.rx * 0.5;
    spawnWild(king, KING_FORM, CORAL_KING.level, x, kingRestY(x), side > 0 ? -1 : 1);
    king.boss = CORAL_KING.title;
    g.beasts.arena = true;
    events.push({ type: 'storyNote', text: CHAPTER3_TEXT.fight });
    return;
  }
  // you swam out of the amphitheatre (or lost your senses): he sinks back to the bottom
  if (d.dead || !inArenaBowl(d.x, d.y, -30)) {
    leave(g, king);
    return;
  }
  if (g.beasts.battle) return;
  king.calm = Math.max(0, king.calm - dt);
  // sideways along the terraces, towards you
  const half = ARENA.rx - king.length * 0.5;
  const tx = Math.max(ARENA.x - half, Math.min(ARENA.x + half, d.x));
  const step = Math.max(-CORAL_KING.walkSpeed * dt, Math.min(CORAL_KING.walkSpeed * dt, tx - king.x));
  king.vx = step / Math.max(dt, 1e-6);
  king.x += step;
  king.y = kingRestY(king.x);
  king.phase += Math.abs(step) * 0.25;
  if (Math.abs(d.x - king.x) > 2) king.face = d.x > king.x ? 1 : -1;
  const touch = Math.hypot(d.x - king.x, d.y - king.y) < king.length * 0.5 + CORAL_KING.reach;
  if (touch && king.calm <= 0) requestBattle(g, king, 'foe', events);
}

const nearShip = (g: Chapter3World): boolean =>
  g.diver.y > g.map.surfaceY && Math.abs(g.diver.x - CORAL_KING.shipX) < CORAL_KING.meetDistance;

/** One step of chapter 3 (after stepChapter2). */
export function stepChapter3(g: Chapter3World, dt: number, events: GameEvent[]): void {
  const s = g.story;
  if (s.dialogue || g.diver.dead) return;
  if (s.step === 'chapter2Done' && !s.ship && nearShip(g)) openDialogue(s, 'reCorallo', events);
  if (s.step !== 'freeKing') return;
  if (!kingDown(g)) stepKing(g, dt, events);
  else if (chainsBroken(g.chapter3) >= g.chapter3.chains.length) openDialogue(s, 'kingFree', events);
}

/** The last line of a chapter 3 dialogue was read. */
export function closeChapter3Dialogue(g: Chapter3World, id: DialogueId, events: GameEvent[]): void {
  const s = g.story;
  if (id === 'reCorallo') setStep(s, 'freeKing', events);
  else if (id === 'kingFree') {
    // he joins you (unless you tamed him in battle)
    if (!g.beasts.team.some((b) => b.form.speciesId === CORAL_KING.speciesId)) {
      const b = addTamed(
        g.beasts.team,
        makeTeamBeast(`b${g.beasts.nextUid++}`, { ...KING_FORM }, CORAL_KING.level, true),
      );
      g.seen.add(CORAL_KING.speciesId);
      events.push({ type: 'tamed', uid: b.uid, toTeam: b.inTeam });
    }
    s.ship = { x: CORAL_KING.shipX, untilX: CORAL_KING.shipX + CORAL_KING.shipLeaveDistance, whale: false };
    events.push({ type: 'storyNote', text: CHAPTER3_TEXT.chapterDone });
    setStep(s, 'chapter3Done', events);
  }
}

/** The chapter 3 goal under the hearts, or null. */
export function chapter3Objective(g: Chapter3World): string | null {
  const s = g.story.step;
  if (s === 'chapter2Done') return OBJECTIVES.chapter2Done;
  if (s === 'freeKing')
    return kingDown(g)
      ? CHAPTER3_TEXT.chains(chainsBroken(g.chapter3), g.chapter3.chains.length)
      : CHAPTER3_TEXT.fight;
  if (s === 'chapter3Done') return CHAPTER3_TEXT.done;
  return null;
}

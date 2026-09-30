// Chapter 2 (data/chapter2.ts): in the Delta delle Mangrovie the ship of La Vedova Nera is anchored with the
// whale of the opening in chains. Swimming into the Delta she speaks; her crocodile is let loose; three chain
// anchors on the sea floor break under your weapons. Freed, the whale joins you and the ship sails east.
// The anchors and the crocodile are not saved: after reloading, the fight in the Delta starts again.
import { VEDOVA } from '../data/chapter2';
import { OBJECTIVES, STORY_NOTES, type DialogueId } from '../data/story';
import { spawnWild, type WildBeast } from './beasts/wildState';
import { addTamed, makeTeamBeast } from './beasts/team';
import { summonCompanion } from './beasts/companion';
import type { GameEvent } from './events';
import { openDialogue, setStep, type StoryWorld } from './story';
import type { TileMap } from './world/tileMap';

export interface Chapter2State {
  /** Chain anchors on the sea floor, with the hits they can still take. */
  anchors: { x: number; y: number; hp: number }[];
  /** The Vedova's crocodile was let loose in this session. */
  crocLoose: boolean;
}

export interface Chapter2World extends StoryWorld {
  chapter2: Chapter2State;
}

export function createChapter2(map: TileMap): Chapter2State {
  return {
    anchors: VEDOVA.anchors.map((x) => ({
      x,
      y: map.floorBelow(x, map.surfaceY + 20) - 3,
      hp: VEDOVA.anchorHp,
    })),
    crocLoose: false,
  };
}

export const anchorsBroken = (c: Chapter2State): number => c.anchors.filter((a) => a.hp <= 0).length;

/** A weapon tip on a chain anchor. Returns true if it hit one (the shot stops there). */
export function hitAnchor(g: Chapter2World, x: number, y: number, dmg: number, events: GameEvent[]): boolean {
  if (g.story.step !== 'freeWhale') return false;
  const a = g.chapter2.anchors.find((k) => k.hp > 0 && Math.hypot(k.x - x, k.y - y) < VEDOVA.anchorReach);
  if (!a) return false;
  a.hp = Math.max(0, a.hp - Math.max(1, dmg));
  events.push({ type: 'harpoonHitRock', x, y });
  if (a.hp <= 0) {
    const n = anchorsBroken(g.chapter2);
    events.push({ type: 'storyNote', text: STORY_NOTES.anchorBroken(n, g.chapter2.anchors.length) });
  }
  return true;
}

/** The Delta's crocodile becomes the Vedova's: an angry alfa with a title and a big health bar. */
function letCrocLoose(g: Chapter2World): void {
  g.chapter2.crocLoose = true;
  const w = g.beasts.wilds.find((x) => !x.arena && x.spawn.speciesId === VEDOVA.croc.speciesId);
  if (!w) return;
  const { speciesId, variant, level, title } = VEDOVA.croc;
  spawnWild(w, { speciesId, variant }, level, g.rng, 1);
  w.boss = title;
  w.mood = 'angry';
  w.angryTime = 999;
}

const nearShip = (x: number, y: number, surfaceY: number): boolean =>
  y > surfaceY && Math.abs(x - VEDOVA.shipX) < VEDOVA.meetDistance;

/** One step of chapter 2 (after stepStory). */
export function stepChapter2(g: Chapter2World, events: GameEvent[]): void {
  const s = g.story;
  const d = g.diver;
  if (s.dialogue || d.dead) return;
  if (s.step === 'chapter1Done' && nearShip(d.x, d.y, g.map.surfaceY)) openDialogue(s, 'vedova', events);
  if (s.step !== 'freeWhale') return;
  if (!g.chapter2.crocLoose) letCrocLoose(g);
  if (anchorsBroken(g.chapter2) >= g.chapter2.anchors.length) openDialogue(s, 'whaleFree', events);
}

/** The whale, freed, swims to you: in your team (or reserve), and in the water with you if there is room. */
function whaleJoins(g: Chapter2World, events: GameEvent[]): void {
  const { speciesId, level, x, y } = VEDOVA.whale;
  const b = addTamed(
    g.beasts.team,
    makeTeamBeast(`b${g.beasts.nextUid++}`, { speciesId, variant: 'comune' }, level, true),
  );
  g.seen.add(speciesId);
  events.push({ type: 'tamed', uid: b.uid, toTeam: b.inTeam });
  if (b.inTeam && !g.beasts.companion) {
    const c = summonCompanion(b, g.diver, g.map);
    Object.assign(c, { x, y, face: -1, state: 'follow' });
    g.beasts.companion = c;
  }
}

/** The last line of a chapter 2 dialogue was read. */
export function closeChapter2Dialogue(g: Chapter2World, id: DialogueId, events: GameEvent[]): void {
  const s = g.story;
  if (id === 'vedova') setStep(s, 'freeWhale', events);
  else if (id === 'whaleFree') {
    whaleJoins(g, events);
    // the Vedova sails east, her crocodile goes with her (unless you tamed it)
    s.ship = { x: VEDOVA.shipX, untilX: VEDOVA.shipX + VEDOVA.shipLeaveDistance, whale: false };
    const croc = g.beasts.wilds.find((w: WildBeast) => w.boss === VEDOVA.croc.title);
    if (croc && croc.mood !== 'taming') {
      croc.mood = 'fleeing';
      croc.motion = 'bolt';
    }
    events.push({ type: 'storyNote', text: STORY_NOTES.chapter2Done });
    setStep(s, 'chapter2Done', events);
  }
}

/** The chapter 2 goal under the hearts, or null. */
export function chapter2Objective(g: Chapter2World): string | null {
  const s = g.story.step;
  if (s === 'chapter1Done') return OBJECTIVES.chapter1Done;
  if (s === 'freeWhale') return OBJECTIVES.freeWhale(anchorsBroken(g.chapter2), g.chapter2.anchors.length);
  if (s === 'chapter2Done') return OBJECTIVES.chapter2Done;
  return null;
}

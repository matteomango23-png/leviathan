// Chapter 2 (data/chapter2.ts): in the Delta delle Mangrovie the ship of La Vedova Nera is anchored with the
// whale of the opening in chains. Swimming into the Delta she speaks; her crocodile is let loose; three chain
// anchors on the sea floor break under your weapons. Freed, the whale joins you and the ship sails east.
// The anchors and the crocodile are not saved: after reloading, the fight in the Delta starts again.
import { VEDOVA } from '../data/chapter2';
import { OBJECTIVES, STORY_NOTES, type DialogueId } from '../data/story';
import { appearPoint } from './beasts/roam';
import { removeWild, spawnWild, type WildBeast } from './beasts/wildState';
import { addTamed, makeTeamBeast } from './beasts/team';
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
  const p = appearPoint(w, g.map, g.rng, g.diver);
  if (!p) return;
  spawnWild(w, { speciesId, variant }, level, p.x, p.y, p.x < g.diver.x ? 1 : -1);
  w.boss = title; // it comes at you (named beasts are aggressive)
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

/** The whale, freed, joins your team (or the reserve if the team is full). */
function whaleJoins(g: Chapter2World, events: GameEvent[]): void {
  const { speciesId, level } = VEDOVA.whale;
  const b = addTamed(
    g.beasts.team,
    makeTeamBeast(`b${g.beasts.nextUid++}`, { speciesId, variant: 'comune' }, level, true),
  );
  g.seen.add(speciesId);
  events.push({ type: 'tamed', uid: b.uid, toTeam: b.inTeam });
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
    if (croc && !g.beasts.battle) removeWild(croc, 30);
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

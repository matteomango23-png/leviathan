// Meeting wild beasts in the open sea: they appear in the dark of their waters, swim around (roam.ts), and a
// battle starts when one touches you (it strikes first) or when your weapon hits one (from behind you strike
// first). At most WILD_RULES.maxPresent are around you at once.
import { BEAST_BODY, ROAM, WILD_RULES, DANGER_RULES } from '../data/beasts';
import { ITEM_RULES } from '../data/economy';
import { prepareEndlessSpawn } from './endlessLife';
import { teamMembers } from './beasts/team';
import type { GameEvent } from './events';
import { range } from './math';
import { distanceToBody } from './beasts/combat';
import { formKey, formLengthM, rollWildForm, rollWildLevel, type BeastForm } from './beasts/forms';
import { appearPoint, stepRoam, temperOf } from './beasts/roam';
import { SUBMARINE } from '../data/submarine';
import { isLegend } from './beasts/legends';
import { drawSpawn, rememberSpawn } from './beasts/spawnDraw';
import { isInWater, isRare, removeWild, spawnWild, type WildBeast } from './beasts/wildState';
import type { BattleRequest, BeastWorld } from './beastState';

/**
 * Asks for a battle (the World scene opens it). Only one at a time. With no beast able to fight, there is no
 * battle: like Pokémon you black out (game.ts wakes you on your ship or at your harbour with the team healed).
 */
export function requestBattle(
  g: BeastWorld,
  w: WildBeast,
  first: BattleRequest['first'],
  events: GameEvent[],
): void {
  if (g.beasts.battle || g.diver.dead) return;
  if (!teamMembers(g.beasts.team).some((b) => !b.ko && b.hp > 0)) {
    w.calm = ROAM.calmAfterBattle;
    events.push({ type: 'noTeam' });
    return;
  }
  g.beasts.battle = { wildId: w.id, first };
  events.push({ type: 'battleStart', id: w.id, first });
}

/** A weapon tip on a wild beast: the battle starts. Returns true if it hit one (the shot stops). */
export function weaponHitsBeast(g: BeastWorld, x: number, y: number, events: GameEvent[]): boolean {
  const d = g.diver;
  for (const w of g.beasts.wilds) {
    if (!isInWater(w) || w.calm > 0) continue;
    if (distanceToBody(w, x, y) > BEAST_BODY.weaponHitMargin) continue;
    w.flash = BEAST_BODY.hitFlashSeconds;
    // facing away from you, or not after you: a surprise attack
    const behind = (d.x - w.x) * w.face < 0 || w.mood !== 'chase';
    requestBattle(g, w, behind ? 'you' : 'normal', events);
    return true;
  }
  return false;
}

function inArea(w: WildBeast, x: number, y: number, margin: number): boolean {
  const [x0, y0, x1, y1] = w.spawn.area;
  return x > x0 - margin && x < x1 + margin && y > y0 - margin && y < y1 + margin;
}

/** Big aggressive beasts come at your submarine and ram it (owner: "quelli enormi te lo rompono"). */
export const ramsSubmarine = (w: WildBeast): boolean =>
  temperOf(w) === 'aggressive' && formLengthM(w.form) >= SUBMARINE.giantLengthM;

/** Wild beasts appear, swim, leave when you are far, and touch you. */
export function stepWildSpawns(g: BeastWorld, dt: number, events: GameEvent[]): void {
  const d = g.diver;
  let present = g.beasts.wilds.filter((w) => !w.arena && isInWater(w)).length;
  const hidden = !!g.beasts.decoy;
  const aboard = g.beasts.aboard; // in the submarine: the big hunters ram it, the others slip away
  const lure = g.beasts.lure;
  if (lure) {
    lure.t -= dt;
    if (lure.t <= 0) g.beasts.lure = null;
  }
  const lured = (w: WildBeast): boolean => !!g.beasts.lure?.species.includes(w.spawn.speciesId);
  /** It comes out of the dark. */
  const appear = (w: WildBeast): boolean => {
    // a hunted beast is always itself (hunts.ts lets it come only when its hunt is ready)
    const form: BeastForm = w.spawn.form
      ? { speciesId: w.spawn.speciesId, variant: 'comune', ...w.spawn.form }
      : rollWildForm(w.spawn.speciesId, g.rng);
    const p = appearPoint(w, g.map, g.rng, d);
    if (!p) return false;
    spawnWild(w, form, rollWildLevel(form, g.rng, w.spawn.band), p.x, p.y, p.x < d.x ? 1 : -1);
    rememberSpawn(g.beasts.recent, w.spawn.speciesId);
    // far stronger than your strongest beast: a warning (owner, 4 ottobre: fear of some creatures)
    const top = Math.max(0, ...g.beasts.team.filter((b) => b.inTeam).map((b) => b.level));
    const danger = w.level >= top + DANGER_RULES.warnGap;
    events.push({ type: 'wildAppeared', id: w.id, rare: isRare(w), legend: isLegend(form.unique), danger });
    return true;
  };
  const ready: WildBeast[] = [];
  for (const w of g.beasts.wilds) {
    if (w.arena) continue; // moved by the Guardian fight (guardian.ts)
    if (!isInWater(w)) {
      if (lured(w)) w.respawn = Math.min(w.respawn, ITEM_RULES.bait.respawn);
      w.respawn -= dt;
      const room = present < WILD_RULES.maxPresent || lured(w);
      if (w.respawn > 0 || d.dead || g.beasts.arena || !room) continue;
      if (w.spawn.endless) {
        if (prepareEndlessSpawn(w, d, g.rng, g.beasts.lure?.species) && appear(w)) present++;
      } else if (inArea(w, d.x, d.y, 0)) ready.push(w);
      continue;
    }
    // you swam far away from its waters: it goes back into the dark (a hunter on your tail a bit later)
    if (!inArea(w, d.x, d.y, 400 + (w.mood === 'chase' ? ROAM.chaseLeash : 0))) {
      removeWild(w, range(g.rng, w.spawn.respawnSeconds[0], w.spawn.respawnSeconds[1]) * 0.3);
      continue;
    }
    // in the bestiary only once you have really seen it: close, in your light (it used to count as seen the
    // moment it came out of the dark, far away; owner, 4 ottobre)
    if (!d.dead && distanceToBody(w, d.x, d.y) < WILD_RULES.seenRadius) {
      g.seen.add(w.spawn.speciesId);
      g.seen.add(formKey(w.form));
    }
    const riderLength = g.beasts.riding ? (g.beasts.mount?.length ?? 0) : 0;
    const rams = aboard && ramsSubmarine(w);
    const scared = aboard && !rams;
    const rider = g.beasts.riding ? (g.beasts.mount ?? undefined) : undefined;
    const touched = stepRoam(w, { diver: d, map: g.map, rng: g.rng, dt, hidden, riderLength, scared, rider });
    if (touched && rams) {
      events.push({ type: 'subRammedBy', lengthM: formLengthM(w.form), x: w.x, y: w.y });
      w.calm = SUBMARINE.ram.calm; // it backs off, then comes again
    } else if (touched && !aboard) requestBattle(g, w, 'foe', events);
  }
  // in the hand-made waters, while there is room: a fair draw among the beasts ready to come (it used to be the
  // first of the list, so the same few came every time)
  const inWater = g.beasts.wilds.filter((w) => !w.arena && isInWater(w)).map((w) => w.spawn.speciesId);
  while (ready.length) {
    const pool = present < WILD_RULES.maxPresent ? ready : ready.filter(lured);
    if (!pool.length) break;
    const w = drawSpawn(pool, inWater, g.beasts.recent, g.beasts.lure?.species ?? [], g.rng);
    ready.splice(ready.indexOf(w), 1);
    if (appear(w)) {
      present++;
      inWater.push(w.spawn.speciesId);
    }
  }
}

/**
 * The beast swimming with you (or carrying you) feels the wild ones coming in the dark before you see them:
 * once per beast (the nearest, if several come at once), while it is between ROAM.senseMin and ROAM.senseRange from you.
 */
export function stepSenses(g: BeastWorld, events: GameEvent[]): void {
  const m = g.beasts.mount;
  const s = g.beasts.sensed;
  for (let i = s.length - 1; i >= 0; i--)
    if (!g.beasts.wilds.some((w) => w.id === s[i] && isInWater(w))) s.splice(i, 1);
  if (!m || (m.state !== 'follow' && m.state !== 'ride') || g.diver.dead) return;
  const d = g.diver;
  let nearest: { w: WildBeast; dist: number } | null = null;
  for (const w of g.beasts.wilds) {
    if (!isInWater(w) || w.arena || s.includes(w.id)) continue;
    const dist = Math.hypot(w.x - d.x, w.y - d.y);
    if (dist > ROAM.senseRange || dist < ROAM.senseMin) continue;
    s.push(w.id); // several at once: it warns about the nearest one only
    if (!nearest || dist < nearest.dist) nearest = { w, dist };
  }
  if (nearest)
    events.push({ type: 'beastSensed', uid: m.uid, wildId: nearest.w.id, side: nearest.w.x < d.x ? -1 : 1 });
}

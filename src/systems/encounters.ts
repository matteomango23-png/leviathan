// Meeting wild beasts in the open sea: they appear in the dark of their waters, swim around (roam.ts), and a
// battle starts when one touches you (it strikes first) or when your weapon hits one (from behind you strike
// first). At most WILD_RULES.maxPresent are around you at once.
import { BEAST_BODY, ROAM, WILD_RULES } from '../data/beasts';
import { ITEM_RULES } from '../data/economy';
import { teamMembers } from './beasts/team';
import type { GameEvent } from './events';
import { range } from './math';
import { distanceToBody } from './beasts/combat';
import { formKey, rollWildForm, rollWildLevel } from './beasts/forms';
import { appearPoint, stepRoam } from './beasts/roam';
import { isInWater, isRare, removeWild, spawnWild, type WildBeast } from './beasts/wildState';
import type { BattleRequest, BeastWorld } from './beastState';

/**
 * Asks for a battle (the World scene opens it). Only one at a time. With no beast able to fight, there is no
 * battle: like Pokémon you black out (game.ts wakes you at your sanctuary or harbour with the team healed).
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

/** Wild beasts appear, swim, leave when you are far, and touch you. */
export function stepWildSpawns(g: BeastWorld, dt: number, events: GameEvent[]): void {
  const d = g.diver;
  let present = g.beasts.wilds.filter((w) => !w.arena && isInWater(w)).length;
  const hidden = !!g.beasts.decoy;
  const lure = g.beasts.lure;
  if (lure) {
    lure.t -= dt;
    if (lure.t <= 0) g.beasts.lure = null;
  }
  const lured = (w: WildBeast): boolean => !!g.beasts.lure?.species.includes(w.spawn.speciesId);
  for (const w of g.beasts.wilds) {
    if (w.arena) continue; // moved by the Guardian fight (guardian.ts)
    if (!isInWater(w)) {
      if (lured(w)) w.respawn = Math.min(w.respawn, ITEM_RULES.bait.respawn);
      w.respawn -= dt;
      const room = present < WILD_RULES.maxPresent || lured(w);
      const can = w.respawn <= 0 && !d.dead && !g.beasts.arena && room;
      if (can && inArea(w, d.x, d.y, 0)) {
        const form = rollWildForm(w.spawn.speciesId, g.rng);
        const p = appearPoint(w, g.map, g.rng, d);
        if (!p) continue;
        spawnWild(w, form, rollWildLevel(form, g.rng, w.spawn.level), p.x, p.y, p.x < d.x ? 1 : -1);
        present++;
        g.seen.add(w.spawn.speciesId);
        g.seen.add(formKey(form));
        events.push({ type: 'wildAppeared', id: w.id, rare: isRare(w) });
      }
      continue;
    }
    // you swam far away from its waters: it goes back into the dark (a hunter on your tail a bit later)
    if (!inArea(w, d.x, d.y, 400 + (w.mood === 'chase' ? ROAM.chaseLeash : 0))) {
      removeWild(w, range(g.rng, w.spawn.respawnSeconds[0], w.spawn.respawnSeconds[1]) * 0.3);
      continue;
    }
    const riderLength = g.beasts.riding ? (g.beasts.mount?.length ?? 0) : 0;
    const touched = stepRoam(w, { diver: d, map: g.map, rng: g.rng, dt, hidden, riderLength });
    if (touched) requestBattle(g, w, 'foe', events);
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

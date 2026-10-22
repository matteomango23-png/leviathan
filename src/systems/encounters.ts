// Meeting wild beasts in the open sea: they appear in the dark of their waters, swim around (roam.ts), and a
// battle starts when one touches you (it strikes first) or when your weapon hits one (from behind you strike
// first). At most WILD_RULES.maxPresent are around you at once.
import { ROAM, WILD_RULES, DANGER_RULES } from '../data/beasts';
import { noSurprise, scaredOfPack } from './pack';
import { fearOf, openingFor, type Fear } from './beasts/mountTraits';
import { ITEM_RULES } from '../data/economy';
import { ENDLESS } from '../data/endless';
import { residentArea, residentsNear, residentForm } from './beasts/residents';
import { teamMembers } from './beasts/team';
import type { GameEvent } from './events';
import { range } from './math';
import { distanceToBody } from './beasts/combat';
import { formKey, formLengthM, rollWildForm, rollWildLevel, type BeastForm } from './beasts/forms';
import { appearPoint, stepRoam, temperOf } from './beasts/roam';
import { hunterAfterYou, mountBite, stalkBite, swimBite } from './swimFight';
import { HARPOON_WEAKEN } from '../data/battle';
import { SUBMARINE } from '../data/submarine';
import { DIVER } from '../data/diver';
import { isLegend } from './beasts/legends';
import { drawSpawn, rememberSpawn } from './beasts/spawnDraw';
import { luredForm } from './beasts/lure';
import { isInWater, isRare, removeWild, spawnWild, type WildBeast } from './beasts/wildState';
import {
  activeBeast,
  isHeld,
  onScreen,
  packMembers,
  type BattleRequest,
  type BeastWorld,
} from './beastState';

/**
 * Asks for a battle (the World scene opens it). Only one at a time. With no beast able to fight, there is no
 * battle: like Pokémon you black out (game.ts wakes you on your ship or at your harbour with the team healed).
 */
export function requestBattle(
  g: BeastWorld,
  w: WildBeast,
  first: BattleRequest['first'],
  events: GameEvent[],
  fear?: Fear,
): void {
  if (g.beasts.battle || g.diver.dead) return;
  if (!teamMembers(g.beasts.team).some((b) => !b.ko && b.hp > 0)) {
    w.calm = ROAM.calmAfterBattle;
    events.push({ type: 'noTeam' });
    return;
  }
  g.beasts.battle = { wildId: w.id, first, ...(fear && (fear.fleeTries || fear.frozen) ? { fear } : {}) };
  events.push({ type: 'battleStart', id: w.id, first });
}

/**
 * A beast that reaches you gets a free attack only from behind (you were facing away from it); met face to face,
 * the battle starts even (owner, 15 ottobre: "i nemici a parità di livello sono sempre più forti": almost every battle
 * began with its free attack, though the two sides are otherwise even; tests/balance.test.ts).
 */
export function ambush(
  w: { x: number },
  d: { x: number; face: 1 | -1 },
  mount: { face: 1 | -1 } | null = null,
): BattleRequest['first'] {
  const face = mount?.face ?? d.face;
  return Math.sign(w.x - d.x) === face ? 'normal' : 'foe';
}

/** You face the hunter after you (the context button, or a tap on one of your beasts: `lead` goes first). */
export function faceHunter(g: BeastWorld, events: GameEvent[], lead?: string): boolean {
  const w = hunterAfterYou(g);
  if (!w) return false;
  w.stalk = undefined;
  requestBattle(g, w, 'normal', events);
  if (g.beasts.battle && lead) g.beasts.battle.lead = lead;
  return true;
}

function inArea(w: WildBeast, x: number, y: number, margin: number): boolean {
  const [x0, y0, x1, y1] = w.spawn.area;
  return x > x0 - margin && x < x1 + margin && y > y0 - margin && y < y1 + margin;
}

/** Big aggressive beasts come at your submarine and ram it (owner: "quelli enormi te lo rompono"). */
const ramsSubmarine = (w: WildBeast): boolean =>
  temperOf(w) === 'aggressive' && formLengthM(w.form) >= SUBMARINE.giantLengthM;

/** Wild beasts appear, swim, leave when you are far, and touch you. */
export function stepWildSpawns(g: BeastWorld, dt: number, events: GameEvent[]): void {
  const d = g.diver;
  let present = g.beasts.wilds.filter((w) => isInWater(w)).length;
  const hidden = !!g.beasts.decoy;
  const aboard = g.beasts.aboard; // in the submarine: the big hunters ram it, the others slip away
  const lure = g.beasts.lure;
  if (lure) {
    lure.t -= dt;
    if (lure.t <= 0) g.beasts.lure = null;
  }
  /** On screen, or so near its edge that a beast there would show. */
  const seen = (x: number, y: number): boolean => onScreen(g.beasts.view, x, y, WILD_RULES.viewMargin);
  const lured = (w: WildBeast): boolean => !!g.beasts.lure?.species.includes(w.spawn.speciesId);
  /** It comes out of the dark (a resident of the endless sea: where it already is). */
  const appear = (
    w: WildBeast,
    at?: { x: number; y: number },
    own?: { form: BeastForm; level: number },
  ): boolean => {
    // a hunted beast is always itself (hunts.ts lets it come only when its hunt is ready); a resident too (its own)
    const base: BeastForm =
      own?.form ??
      (w.spawn.form
        ? { speciesId: w.spawn.speciesId, variant: 'comune', ...w.spawn.form }
        : rollWildForm(w.spawn.speciesId, g.rng));
    // drawn by a fine bait: now and then an alfa or an albino (beasts/lure.ts); never a hunted one
    const form = !w.spawn.form && lured(w) ? luredForm(base, g.beasts.lure?.rare, g.rng) : base;
    const p = at ?? appearPoint(w, g.map, g.rng, d, seen);
    if (!p || seen(p.x, p.y)) return false;
    spawnWild(w, form, own?.level ?? rollWildLevel(form, g.rng, w.spawn.band), p.x, p.y, p.x < d.x ? 1 : -1);
    rememberSpawn(g.beasts.recent, w.spawn.speciesId);
    // far stronger than your strongest beast: a warning (owner, 4 ottobre: fear of some creatures)
    const top = Math.max(0, ...g.beasts.team.filter((b) => b.inTeam).map((b) => b.level));
    const danger = w.level >= top + DANGER_RULES.warnGap;
    events.push({ type: 'wildAppeared', id: w.id, rare: isRare(w), legend: isLegend(form.unique), danger });
    return true;
  };
  // the endless sea's residents: the clock of their laps, and who is no longer out
  const res = g.beasts.residents;
  res.clock += dt;
  for (const [id, wildId] of Object.entries(res.awake)) {
    const w = g.beasts.wilds.find((x) => x.id === wildId);
    if (!w || !isInWater(w) || w.spawn.resident !== id) delete res.awake[id];
  }
  const R = ENDLESS.residents;
  /** The nearest resident not out yet (a lured species first) comes out for real in this slot. */
  const wakeResident = (w: WildBeast): boolean => {
    const lure = g.beasts.lure?.species ?? [];
    const dist = (c: { x: number; y: number }): number => Math.hypot(c.x - d.x, c.y - d.y);
    // just beyond the screen's edge when the view is wider than the waking distance (the big ships' far view)
    const v = g.beasts.view;
    // and with the light under the ship on, as far as it calls them (block 5b)
    const light = g.beasts.light;
    const reach = Math.max(
      R.wakeRadius,
      v ? Math.max(v.width, v.height) / 2 + WILD_RULES.viewMargin * 2 : 0,
      light ? light.reach : 0,
    );
    const near = residentsNear(res, d.x, reach, g.beasts.held).filter(
      (c) => res.awake[c.r.id] === undefined && dist(c) < reach && !seen(c.x, c.y),
    );
    if (!near.length) return false;
    const score = (c: (typeof near)[number]): number => dist(c) - (lure.includes(c.r.speciesId) ? 1e6 : 0);
    const c = near.reduce((a, b) => (score(b) < score(a) ? b : a));
    w.spawn = {
      ...w.spawn,
      speciesId: c.r.speciesId,
      area: residentArea(c.r),
      band: c.r.band,
      resident: c.r.id,
      form: undefined,
    };
    if (!appear(w, g.map.nearestOpen(c.x, c.y, 8), residentForm(c.r))) return false;
    res.awake[c.r.id] = w.id;
    return true;
  };
  const ready: WildBeast[] = [];
  // the beast you ride: its fear and its talent (beasts/mountTraits.ts)
  const rb = g.beasts.riding ? activeBeast(g) : undefined;
  const ridden = rb ? { form: rb.form, level: rb.level } : null;
  for (const w of g.beasts.wilds) {
    if (!isInWater(w)) {
      if (lured(w)) w.respawn = Math.min(w.respawn, ITEM_RULES.bait.respawn);
      w.respawn -= dt;
      const room = present < WILD_RULES.maxPresent || lured(w);
      if (w.respawn > 0 || d.dead || !room) continue;
      if (w.spawn.endless) {
        if (wakeResident(w)) present++;
      } else if (inArea(w, d.x, d.y, 0)) ready.push(w);
      continue;
    }
    // you swam far away from its waters: it goes back into the dark (a hunter on your tail a bit later)
    // (not while the sphere holds it: it waits for you there)
    const leash = 400 + (w.mood === 'chase' ? ROAM.chaseLeash : 0);
    // (a hunter stalking you does not leave: it comes back at you out of the dark, beasts/stalk.ts)
    if (!isHeld(g.beasts.held, w) && !w.drawn && !w.stalk && !inArea(w, d.x, d.y, leash) && !seen(w.x, w.y)) {
      removeWild(w, range(g.rng, w.spawn.respawnSeconds[0], w.spawn.respawnSeconds[1]) * 0.3);
      continue;
    }
    // in the bestiary only once you have really seen it: close, in your light (it used to count as seen the
    // moment it came out of the dark, far away; owner, 4 ottobre)
    if (!d.dead && distanceToBody(w, d.x, d.y) < WILD_RULES.seenRadius) {
      g.seen.add(w.spawn.speciesId);
      g.seen.add(formKey(w.form));
    }
    // held by the Ocean's Nightmare's sphere: it stops gently where it is, and neither swims nor comes at you
    if (isHeld(g.beasts.held, w)) {
      const k = Math.max(0, 1 - dt * 3);
      w.vx *= k;
      w.vy *= k;
      w.x += w.vx * dt;
      w.y += w.vy * dt;
      // you swim up to it: the battle starts, and you strike first (it cannot move; owner, 9 ottobre)
      if (!aboard && !d.dead && distanceToBody(w, d.x, d.y) < w.length * ROAM.contactFrac + DIVER.radius) {
        g.beasts.held = null;
        requestBattle(g, w, 'you', events);
      }
      continue;
    }
    const riderLength = g.beasts.riding ? (g.beasts.mount?.length ?? 0) : 0;
    // a superpredator far above it: it keeps away (mountTraits.ts fearOf)
    // …and the small ones go round your pack (systems/pack.ts)
    const fearful = fearOf(ridden, w).keepAway || scaredOfPack(g, w);
    const rams = aboard && ramsSubmarine(w);
    const scared = aboard && !rams;
    const rider = g.beasts.riding ? (g.beasts.mount ?? undefined) : undefined;
    const view = g.beasts.view;
    const touched = stepRoam(w, {
      diver: d,
      map: g.map,
      rng: g.rng,
      dt,
      hidden,
      riderLength,
      riderFear: fearful,
      scared,
      rider,
      view,
    });
    if (w.stalk?.toll) {
      w.stalk.toll = false;
      events.push({ type: 'chargeWarn', x: w.x, y: w.y });
    }
    if (touched && rams) {
      events.push({ type: 'subRammedBy', lengthM: formLengthM(w.form), x: w.x, y: w.y });
      w.calm = SUBMARINE.ram.calm; // it backs off, then comes again
    } else if (touched && !aboard && w.stalk) {
      // its charge reached you (beasts/stalk.ts): it bites you, or your mount
      stalkBite(g, w, events);
    } else if (touched && !aboard && !g.beasts.riding) {
      // on your own it bites, and you choose: face it or swim away (swimFight.ts; owner, 22 ottobre)
      swimBite(g, w, events);
    } else if (
      touched &&
      !aboard &&
      d.rideDashT !== undefined &&
      (w.wounds ?? 0) < HARPOON_WEAKEN.max - 1e-6
    ) {
      // riding, dashing into it: your mount bites it, no battle yet (swimFight.ts; owner, 22 ottobre)
      mountBite(g, w, events);
    } else if (touched && !aboard) {
      // a Predatore you ride, dashing into it: its Assalto, it loses its first turn (mountTraits.ts)
      const first = openingFor(
        ridden,
        d.rideDashT !== undefined,
        // with a Tempesta in the pack nobody takes you by surprise
        noSurprise(g) ? 'normal' : ambush(w, d, g.beasts.riding ? g.beasts.mount : null),
      );
      requestBattle(g, w, first, events, fearOf(ridden, w, g.rng()));
    }
  }
  // in the hand-made waters, while there is room: a fair draw among the beasts ready to come (it used to be the
  // first of the list, so the same few came every time)
  const inWater = g.beasts.wilds.filter((w) => isInWater(w)).map((w) => w.spawn.speciesId);
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
  // the beast you ride, or else the first of your pack
  const m =
    g.beasts.mount && g.beasts.mount.state !== 'in' && g.beasts.mount.state !== 'leaving'
      ? g.beasts.mount
      : (packMembers(g).find((p) => p.m.state === 'follow')?.m ?? null);
  const s = g.beasts.sensed;
  for (let i = s.length - 1; i >= 0; i--)
    if (!g.beasts.wilds.some((w) => w.id === s[i] && isInWater(w))) s.splice(i, 1);
  if (!m || (m.state !== 'follow' && m.state !== 'ride') || g.diver.dead) return;
  const d = g.diver;
  let nearest: { w: WildBeast; dist: number } | null = null;
  for (const w of g.beasts.wilds) {
    if (!isInWater(w) || s.includes(w.id)) continue;
    const dist = Math.hypot(w.x - d.x, w.y - d.y);
    if (dist > ROAM.senseRange || dist < ROAM.senseMin) continue;
    s.push(w.id); // several at once: it warns about the nearest one only
    if (!nearest || dist < nearest.dist) nearest = { w, dist };
  }
  if (nearest)
    events.push({ type: 'beastSensed', uid: m.uid, wildId: nearest.w.id, side: nearest.w.x < d.x ? -1 : 1 });
}

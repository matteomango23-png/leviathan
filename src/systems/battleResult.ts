// After a battle (scenes/BattleScene.ts): health back to the team, experience, a tamed beast into the team,
// the wild beast gone (or calm for a while if you fled), or back to your ship or harbour if
// the whole team was worn out. Pure logic; the World scene sends the returned events with the next step.
import { residentGone } from './beasts/residents';
import type { StatusId } from '../data/moveBattle';
import { REGIONS } from '../data/world';
import { PACK_RULES, ROAM } from '../data/beasts';
import { temperOf } from './beasts/roam';
import { seedFrom } from '../data/stats';
import { isLegend } from './beasts/legends';
import { XP_RULES } from '../data/progression';
import { range } from './math';
import { activeBeast } from './beastState';
import { formLengthUnits, formKey, formName, speciesOf, type BeastForm } from './beasts/forms';
import { gainXp, xpReward } from './beasts/growth';
import { addTamed, makeTeamBeast, maxHpOf, teamMembers } from './beasts/team';
import { removeWild } from './beasts/wildState';
import { hurtDiver } from './diver';
import type { GameEvent } from './events';
import type { BackpackWorld } from './economy/backpack';
import { createBattle, type BattleState } from './battle/battle';
import { fighterFromTeam, makeFighter, ppUsedOf } from './battle/fighter';
import { battlePlace } from './battle/stage';
import type { BattlePlace } from '../data/battle';

export interface BattleOutcome {
  wildId: number;
  over: 'won' | 'lost' | 'caught' | 'fled';
  /** Health of your team beasts after the battle. */
  team: { uid: string; hp: number; ppUsed?: number[]; status?: StatusId | null; sleepTurns?: number }[];
  /** The beast that was fighting at the end (it gets all the experience). */
  lastActive?: string;
  foe: { form: BeastForm; level: number; hp: number };
  /** Its pack (block 5b): the ones beaten before it, and how many mates are left swimming with it. */
  defeated?: { form: BeastForm; level: number }[];
  packLeft?: number;
}

/** The beasts that fight for you: the team, worn-out ones included (they cannot be sent in). */
export const battleTeam = (g: BackpackWorld) => teamMembers(g.beasts.team);

export function finishBattle(g: BackpackWorld, o: BattleOutcome): GameEvent[] {
  const events: GameEvent[] = [];
  g.beasts.battle = null;
  for (const t of o.team) {
    const b = g.beasts.team.find((x) => x.uid === t.uid);
    if (!b) continue;
    b.hp = Math.max(0, Math.min(maxHpOf(b), t.hp));
    b.ppUsed = t.ppUsed?.some((n) => n > 0) ? t.ppUsed : undefined;
    // like Pokémon, a condition stays after the battle (a worn-out beast loses it)
    b.status = b.hp > 0 && t.status ? t.status : undefined;
    b.sleepTurns = b.status === 'stordito' ? t.sleepTurns : undefined;
    if (b.hp <= 0 && !b.ko) {
      b.ko = true;
      events.push({ type: 'beastKo', uid: b.uid });
    }
  }
  const w = g.beasts.wilds.find((x) => x.id === o.wildId);
  const win = o.over === 'won' || o.over === 'caught';
  // experience for every beast beaten, its pack's too (block 5b), even if you fled after some of them
  const beaten = [...(o.defeated ?? []), ...(win ? [o.foe] : [])];
  for (const foe of beaten)
    for (const b of battleTeam(g)) {
      if (b.ko) continue;
      const xp = xpReward(foe.form, foe.level, b.level); // each by its own level, like Pokémon
      gainXp(b, b.uid === o.lastActive ? xp : Math.floor(xp * XP_RULES.benchShare), events);
    }
  if (win) {
    const m = g.beasts.mount;
    const rode = activeBeast(g);
    if (m && rode) m.length = formLengthUnits(rode.form, rode.level); // it may have grown
    events.push({ type: 'battleWon', speciesId: o.foe.form.speciesId });
  }
  // a legend defeated (not tamed) is gone forever
  if (o.over === 'won' && isLegend(o.foe.form.unique) && !g.beasts.gone.includes(o.foe.form.unique!)) {
    g.beasts.gone.push(o.foe.form.unique!);
    events.push({ type: 'legendGone', name: formName(o.foe.form) });
  }
  if (o.over === 'caught') {
    const b = addTamed(
      g.beasts.team,
      makeTeamBeast(`b${g.beasts.nextUid++}`, { ...o.foe.form }, o.foe.level, true),
    );
    b.hp = Math.max(1, Math.min(maxHpOf(b), o.foe.hp));
    // where you met it, for its sheet (its home waters)
    const region = speciesOf(o.foe.form).region;
    b.met = { level: o.foe.level, place: REGIONS.find((r) => r.id === region)?.name ?? region };
    g.seen.add(formKey(o.foe.form));
    events.push({ type: 'tamed', uid: b.uid, toTeam: b.inTeam });
  }
  if (w) {
    if (win) {
      removeWild(w, range(g.rng, w.spawn.respawnSeconds[0], w.spawn.respawnSeconds[1]));
      // a resident of the endless sea: its place stays empty for a while (beasts/residents.ts)
      if (w.spawn.resident) residentGone(g.beasts.residents, w.spawn.resident, g.rng);
    } else {
      w.calm = ROAM.calmAfterBattle;
      if (o.packLeft !== undefined) w.pack = Math.max(0, o.packLeft); // the pack left swims on, smaller
    }
  }
  // a moment of peace: nobody comes at you right after a battle
  for (const x of g.beasts.wilds) x.calm = Math.max(x.calm, 1.5);
  if (o.over === 'fled') events.push({ type: 'battleFled' });
  if (o.over === 'lost') {
    events.push({ type: 'battleLost' });
    g.diver.invulnerable = 0;
    hurtDiver(g.diver, g.diver.hp, events); // the sea pushes you back to your ship or harbour
  }
  return events;
}

/** A battle from the game: your team against the wild beast that asked for it. */
export interface BattleSetup {
  state: BattleState;
  wildId: number;
  first: 'you' | 'foe' | 'normal';
  /** Named beasts: no fleeing, like a trainer battle. */
  noFlee: boolean;
  /** Its title, if it has one (a named beast). */
  title?: string;
  /** Which background the battle uses. */
  place: BattlePlace;
}

export function battleSetup(g: BackpackWorld): BattleSetup | null {
  const req = g.beasts.battle;
  const w = req && g.beasts.wilds.find((x) => x.id === req.wildId);
  if (!req || !w) return null;
  const team = battleTeam(g).map(fighterFromTeam);
  // a wild beast gets its individual values when you meet it; they stay with it if you tame it
  w.form.seed ??= seedFrom(`${w.id}:${w.x.toFixed(1)}:${w.y.toFixed(1)}:${w.level}`);
  // an aggressive pack fights together: its mates come in one after the other (block 5b)
  const together = temperOf(w) === PACK_RULES.fightTogether && !w.boss;
  const reserve = together
    ? Array.from({ length: w.pack }, (_, i) => {
        const level = Math.max(1, w.level + Math.round((g.rng() * 2 - 1) * PACK_RULES.levelSpread));
        const seed = seedFrom(`${w.id}:pack${i}:${level}`);
        return makeFighter({ speciesId: w.form.speciesId, variant: 'comune', seed }, level);
      })
    : [];
  const state = createBattle(team, makeFighter({ ...w.form }, w.level), reserve);
  return {
    state,
    wildId: w.id,
    first: req.first,
    noFlee: !!w.boss,
    title: w.boss,
    place: battlePlace(speciesOf(w.form).region),
  };
}

/** What the battle left behind, for finishBattle. */
export function battleOutcome(s: BattleState, wildId: number): BattleOutcome {
  return {
    wildId,
    over: s.over ?? 'fled',
    team: s.team
      .filter((f) => f.uid)
      .map((f) => ({
        uid: f.uid!,
        hp: f.hp,
        ppUsed: ppUsedOf(f),
        status: f.status,
        sleepTurns: f.sleepTurns,
      })),
    lastActive: s.team[s.active]?.uid,
    foe: { form: s.foe.form, level: s.foe.level, hp: s.foe.hp },
    defeated: s.defeated,
    packLeft: s.reserve.length + (s.foe.hp > 0 ? 1 : 0) - 1,
  };
}

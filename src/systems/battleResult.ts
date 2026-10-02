// After a battle (scenes/BattleScene.ts): health back to the team, experience, a tamed beast into the team,
// the wild beast gone (or calm for a while if you fled), the Guardian's reward, or back to the sanctuary if
// the whole team was worn out. Pure logic; the World scene sends the returned events with the next step.
import { ROAM } from '../data/beasts';
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
import { guardianDefeated, type GuardianWorld } from './guardian';
import { createBattle, type BattleState } from './battle/battle';
import { fighterFromTeam, makeFighter } from './battle/fighter';
import { battlePlace } from './battle/stage';
import type { BattlePlace } from '../data/battle';

export interface BattleOutcome {
  wildId: number;
  over: 'won' | 'lost' | 'caught' | 'fled';
  /** Health of your team beasts after the battle. */
  team: { uid: string; hp: number }[];
  /** The beast that was fighting at the end (it gets all the experience). */
  lastActive?: string;
  foe: { form: BeastForm; level: number; hp: number };
}

/** The beasts that fight for you: the team, worn-out ones included (they cannot be sent in). */
export const battleTeam = (g: GuardianWorld) => teamMembers(g.beasts.team);

export function finishBattle(g: GuardianWorld, o: BattleOutcome): GameEvent[] {
  const events: GameEvent[] = [];
  g.beasts.battle = null;
  for (const t of o.team) {
    const b = g.beasts.team.find((x) => x.uid === t.uid);
    if (!b) continue;
    b.hp = Math.max(0, Math.min(maxHpOf(b), t.hp));
    if (b.hp <= 0 && !b.ko) {
      b.ko = true;
      events.push({ type: 'beastKo', uid: b.uid });
    }
  }
  const w = g.beasts.wilds.find((x) => x.id === o.wildId);
  const win = o.over === 'won' || o.over === 'caught';
  if (win) {
    const xp = xpReward(o.foe.form, o.foe.level, !!w?.guardian);
    for (const b of battleTeam(g)) {
      if (b.ko) continue;
      gainXp(b, b.uid === o.lastActive ? xp : xp * XP_RULES.benchShare, events);
    }
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
    g.seen.add(formKey(o.foe.form));
    events.push({ type: 'tamed', uid: b.uid, toTeam: b.inTeam });
  }
  if (w) {
    if (win && w.storyBoss) w.beaten = o.over === 'caught' ? 'caught' : 'won';
    else if (win && w.guardian) guardianDefeated(g, o.over === 'caught', events);
    else if (win) removeWild(w, range(g.rng, w.spawn.respawnSeconds[0], w.spawn.respawnSeconds[1]));
    else w.calm = ROAM.calmAfterBattle;
  }
  // a moment of peace: nobody comes at you right after a battle
  for (const x of g.beasts.wilds) x.calm = Math.max(x.calm, 1.5);
  if (o.over === 'fled') events.push({ type: 'battleFled' });
  if (o.over === 'lost') {
    events.push({ type: 'battleLost' });
    g.diver.invulnerable = 0;
    hurtDiver(g.diver, g.diver.hp, events); // the sea pushes you back to the last sanctuary
  }
  return events;
}

/** A battle from the game: your team against the wild beast that asked for it. */
export interface BattleSetup {
  state: BattleState;
  wildId: number;
  first: 'you' | 'foe' | 'normal';
  /** Guardians and named beasts: no fleeing, like a trainer battle. */
  noFlee: boolean;
  /** Its title, if it has one (a Guardian, the Vedova's crocodile). */
  title?: string;
  /** Which background the battle uses. */
  place: BattlePlace;
}

export function battleSetup(g: GuardianWorld): BattleSetup | null {
  const req = g.beasts.battle;
  const w = req && g.beasts.wilds.find((x) => x.id === req.wildId);
  if (!req || !w) return null;
  const team = battleTeam(g).map(fighterFromTeam);
  const state = createBattle(team, makeFighter({ ...w.form }, w.level));
  return {
    state,
    wildId: w.id,
    first: req.first,
    noFlee: !!w.boss,
    title: w.boss,
    place: battlePlace(speciesOf(w.form).region, !!w.guardian),
  };
}

/** What the battle left behind, for finishBattle. */
export function battleOutcome(s: BattleState, wildId: number): BattleOutcome {
  return {
    wildId,
    over: s.over ?? 'fled',
    team: s.team.filter((f) => f.uid).map((f) => ({ uid: f.uid!, hp: f.hp })),
    lastActive: s.team[s.active]?.uid,
    foe: { form: s.foe.form, level: s.foe.level, hp: s.foe.hp },
  };
}

// A turn-based battle, 1 against 1, like Pokémon: you pick an action (a move, the backpack, another beast,
// taming, fleeing), the wild beast picks a move, and they happen in order of speed. Pure logic: the battle
// scene animates the steps it returns and asks for the dodge when the wild beast attacks.
import { BATTLE } from '../../data/battle';
import { BATTLE_TEXT } from '../../data/battleText';
import { formStars, isGiant, speciesOf } from '../beasts/forms';
import type { MoveDef } from '../../data/moves';
import type { Rng } from '../math';
import { canUse, effectiveness, hasFx, hitDamage, hitsOf, named, type Fighter } from './fighter';

export type Side = 'you' | 'foe';
export type Dodge = 'perfect' | 'graze' | 'none';

export type Action =
  | { kind: 'move'; index: number }
  | { kind: 'switch'; index: number }
  | { kind: 'tame' }
  | { kind: 'flee' }
  | { kind: 'item'; id: string };

/** What happened, in order, for the scene to show. */
export type Step =
  | { kind: 'text'; text: string }
  | {
      kind: 'attack';
      side: Side;
      move: string;
      /** The move's type (the colour of its effect). */
      type: MoveDef['type'];
      hits: number[];
      crit: boolean;
      dodge: Dodge;
      effect: 'super' | 'weak' | null;
    }
  | { kind: 'heal'; side: Side; amount: number }
  | { kind: 'switch'; index: number }
  | { kind: 'tame'; shakes: number; caught: boolean }
  | { kind: 'faint'; side: Side };

export interface BattleState {
  team: Fighter[];
  active: number;
  foe: Fighter;
  fleeTries: number;
  over: null | 'won' | 'lost' | 'caught' | 'fled';
  /** The wild beast's move for this round (chosen at the start of the round). */
  foeMove: number;
}

export const you = (s: BattleState): Fighter => s.team[s.active]!;

export function createBattle(team: Fighter[], foe: Fighter): BattleState {
  const active = Math.max(
    0,
    team.findIndex((f) => f.hp > 0),
  );
  return { team, active, foe, fleeTries: 0, over: null, foeMove: 0 };
}

/** The wild beast's choice: its best ready move against you, sometimes a random ready one. */
export function chooseFoeMove(s: BattleState, rng: Rng): number {
  const ready = s.foe.moves.map((m, i) => ({ m, i })).filter(({ m }) => canUse(m));
  if (!ready.length) return 0;
  if (rng() < BATTLE.ai.randomChoice) return ready[Math.floor(rng() * ready.length)]!.i;
  const score = ({ m }: (typeof ready)[number]): number =>
    (m.move.power === 'nessuno' ? 0.5 : 1) *
    effectiveness(m.move, you(s)) *
    hitsOf(m.move) *
    (1 + m.rechargeTurns);
  return ready.reduce((a, b) => (score(b) > score(a) ? b : a)).i;
}

/** Who acts first this round. Switching, items, taming and fleeing always come first, like Pokémon. */
export function firstSide(s: BattleState, action: Action, rng: Rng): Side {
  if (action.kind !== 'move') return 'you';
  const prio = (f: Fighter, i: number): number => {
    const m = f.moves[i]?.move;
    return m && hasFx(m, 'dash') ? 1 : m && hasFx(m, 'slowAttack') ? -1 : 0;
  };
  const p = prio(you(s), action.index) - prio(s.foe, s.foeMove);
  if (p !== 0) return p > 0 ? 'you' : 'foe';
  const a = you(s).stats.spe;
  const b = s.foe.stats.spe;
  return a === b ? (rng() < 0.5 ? 'you' : 'foe') : a > b ? 'you' : 'foe';
}

/** The wild beast's attack can be dodged unless it grabs you. */
export const foeCanBeDodged = (s: BattleState): boolean => {
  const m = s.foe.moves[s.foeMove]?.move;
  return !!m && m.power !== 'nessuno' && !hasFx(m, 'grab');
};

/** One fighter uses a move. `dodge` only matters for the wild beast's attacks on you. */
export function useMove(s: BattleState, side: Side, index: number, rng: Rng, dodge: Dodge = 'none'): Step[] {
  const att = side === 'you' ? you(s) : s.foe;
  const def = side === 'you' ? s.foe : you(s);
  const steps: Step[] = [];
  if (att.hp <= 0) return steps;
  if (att.stunned) {
    att.stunned = false;
    return [{ kind: 'text', text: BATTLE_TEXT.stunnedSkip(named(att)) }];
  }
  const bm = att.moves[index];
  if (!bm || !canUse(bm)) return steps;
  const move = bm.move;
  bm.recharge = bm.rechargeTurns + 1; // +1: the end of this round takes one off
  const n = hitsOf(move);
  const hits: number[] = [];
  let crit = false;
  if (move.power !== 'nessuno') {
    for (let i = 0; i < n && def.hp > 0; i++) {
      const h = hitDamage(att, def, move, rng, n > 1);
      let dmg = h.damage;
      if (side === 'foe' && dodge === 'perfect') dmg = 0;
      else if (side === 'foe' && dodge === 'graze') dmg = Math.round(dmg * BATTLE.dodge.grazeMult);
      def.hp = Math.max(0, def.hp - dmg);
      if (def.guard > 0 && dmg > 0) def.guard--;
      hits.push(dmg);
      crit ||= h.crit;
    }
  }
  const eff = effectiveness(move, def);
  steps.push({
    kind: 'attack',
    side,
    move: move.name,
    type: move.type,
    hits,
    crit,
    dodge: side === 'foe' ? dodge : 'none',
    effect: move.power === 'nessuno' ? null : eff > 1 ? 'super' : eff < 1 ? 'weak' : null,
  });
  // effects on the user
  if (hasFx(move, 'heal')) {
    const amount = Math.round(att.maxHp * BATTLE.fx.healShare);
    att.hp = Math.min(att.maxHp, att.hp + amount);
    steps.push({ kind: 'heal', side, amount });
  }
  if (hasFx(move, 'shield') || hasFx(move, 'dmgReduce') || hasFx(move, 'taunt')) {
    att.guard = BATTLE.fx.guardTurns;
    steps.push({ kind: 'text', text: BATTLE_TEXT.guarding(named(att)) });
  }
  // effects on the target, if the move landed
  const landed = hits.some((h) => h > 0);
  const stunChance = hasFx(move, 'stun') || hasFx(move, 'stunChance') ? BATTLE.fx.stunChance : 0;
  const grabChance = side === 'you' && hasFx(move, 'grab') ? BATTLE.fx.grabSkipChance : 0;
  if (landed && def.hp > 0 && rng() < Math.max(stunChance, grabChance)) {
    def.stunned = true;
    steps.push({ kind: 'text', text: BATTLE_TEXT.stunned(named(def)) });
  }
  if (def.hp <= 0) steps.push({ kind: 'faint', side: side === 'you' ? 'foe' : 'you' });
  return steps;
}

/** The chance a tame attempt holds (like a Poké Ball). */
export function tameChance(s: BattleState, strongestLevel: number, bonus = 1): number {
  const f = s.foe;
  const c = BATTLE.catch;
  let p = c.byStars[speciesOf(f.form).rarity] ?? 0.3;
  if (f.form.unique) p *= c.uniqueMult;
  else if (f.form.variant !== 'comune') p *= c.variantMult;
  p *= 1 - c.hpWeight * (f.hp / f.maxHp);
  p *= Math.pow(c.levelPenalty, Math.max(0, f.level - strongestLevel));
  return Math.max(0, Math.min(1, p * bonus));
}

/** A tame attempt: each shake holds with chance^(1/shakes), so all of them hold with `chance`. */
export function tryTame(s: BattleState, rng: Rng, strongestLevel: number, bonus = 1): Step {
  const per = Math.pow(tameChance(s, strongestLevel, bonus), 1 / BATTLE.catch.shakes);
  let shakes = 0;
  while (shakes < BATTLE.catch.shakes && rng() < per) shakes++;
  const caught = shakes === BATTLE.catch.shakes;
  if (caught) s.over = 'caught';
  return { kind: 'tame', shakes, caught };
}

/**
 * The chance to get away: harder from a stronger beast (levels above yours, rarity) and much harder from a
 * giant; easier if you are faster, and a little easier at each new try.
 */
export function fleeChance(s: BattleState): number {
  const f = BATTLE.flee;
  const me = you(s);
  const p =
    f.base +
    (me.stats.spe > s.foe.stats.spe ? f.fasterBonus : 0) +
    f.perTry * s.fleeTries -
    f.perLevelAbove * Math.max(0, s.foe.level - me.level) -
    f.perStar * (formStars(s.foe.form) - 1) -
    (isGiant(s.foe.form) ? f.giant : 0);
  return Math.min(f.max, Math.max(f.min, p));
}

export function tryFlee(s: BattleState, rng: Rng): boolean {
  const p = fleeChance(s);
  s.fleeTries++;
  const ok = rng() < p;
  if (ok) s.over = 'fled';
  return ok;
}

/** Another beast of your team comes in (it costs your turn, like Pokémon). */
export function switchTo(s: BattleState, index: number): Step[] {
  const f = s.team[index];
  if (!f || f.hp <= 0 || index === s.active) return [];
  s.active = index;
  return [{ kind: 'switch', index }];
}

/** End of a round: recharges tick, and the battle may be over. */
export function endRound(s: BattleState): void {
  for (const f of [...s.team, s.foe]) for (const m of f.moves) m.recharge = Math.max(0, m.recharge - 1);
  if (s.over) return;
  if (s.foe.hp <= 0) s.over = 'won';
  else if (s.team.every((f) => f.hp <= 0)) s.over = 'lost';
}

/** After a faint on your side: the first beast still standing, or -1. */
export const nextStanding = (s: BattleState): number => s.team.findIndex((f) => f.hp > 0);

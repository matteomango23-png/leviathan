// A turn-based battle, 1 against 1, like Pokémon: you pick an action (a move, the backpack, another beast,
// taming, fleeing), the wild beast picks a move, and they happen in order of priority and speed. Moves have PP,
// accuracy and effects (data/moveBattle.ts), conditions and stages work as in Pokémon (status.ts). Pure logic: the battle
// scene animates the steps it returns and asks for the dodge when the wild beast attacks.
import { BATTLE } from '../../data/battle';
import { BATTLE_TEXT } from '../../data/battleText';
import { formStars, isGiant, speciesOf } from '../beasts/forms';
import type { MoveDef } from '../../data/moves';
import type { Rng } from '../math';
import { STAGE_NAMES, STRUGGLE } from '../../data/moveBattle';
import { formType } from '../beasts/forms';
import { canUse, effectiveness, hasFx, hitDamage, hitsOf, named, type Fighter } from './fighter';
import { accuracyMult, changeStage, checkTurn, effectiveStat, giveStatus, residualDamage } from './status';

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
  /** Health lost outside an attack (poison, wounds, recoil), with what the battle says. */
  | { kind: 'hurt'; side: Side; amount: number; text: string }
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

/** The wild beast's choice: its best move with PP against you, sometimes a random one. */
export function chooseFoeMove(s: BattleState, rng: Rng): number {
  const ready = s.foe.moves.map((m, i) => ({ m, i })).filter(({ m }) => canUse(m));
  if (!ready.length) return -1; // no PP left: Lotta disperata
  if (rng() < BATTLE.ai.randomChoice) return ready[Math.floor(rng() * ready.length)]!.i;
  const me = you(s);
  const score = ({ m }: (typeof ready)[number]): number => {
    const r = m.rules;
    if (r.power <= 0) {
      // a move without damage is worth it while it can still do something
      const useful = r.effects.some(
        (e) =>
          (e.kind === 'status' && !me.status) ||
          (e.kind === 'heal' && s.foe.hp < s.foe.maxHp * 0.5) ||
          (e.kind === 'stage' && (e.who === 'self' ? s.foe.stages[e.stat] < 2 : me.stages[e.stat] > -2)),
      );
      return useful ? 50 : 1;
    }
    const stab = m.move.type === formType(s.foe.form) || m.move.type === 'variabile' ? BATTLE.stab : 1;
    return r.power * stab * effectiveness(m.move, me) * hitsOf(m.move) * ((r.accuracy ?? 100) / 100);
  };
  return ready.reduce((a, b) => (score(b) > score(a) ? b : a)).i;
}

/** Who acts first this round: switching, items, taming and fleeing first; then priority; then speed, like Pokémon. */
export function firstSide(s: BattleState, action: Action, rng: Rng): Side {
  if (action.kind !== 'move') return 'you';
  const prio = (f: Fighter, i: number): number => f.moves[i]?.rules.priority ?? 0;
  const p = prio(you(s), action.index) - prio(s.foe, s.foeMove);
  if (p !== 0) return p > 0 ? 'you' : 'foe';
  const a = effectiveStat(you(s), 'spe');
  const b = effectiveStat(s.foe, 'spe');
  return a === b ? (rng() < 0.5 ? 'you' : 'foe') : a > b ? 'you' : 'foe';
}

/** The wild beast's attack can be dodged when it does damage and does not grab you. */
export const foeCanBeDodged = (s: BattleState): boolean => {
  const bm = s.foe.moves[s.foeMove];
  return !bm || (bm.rules.power > 0 && !hasFx(bm.move, 'grab'));
};

const BLOCKED_TEXT = {
  flinch: BATTLE_TEXT.flinched,
  sleep: BATTLE_TEXT.asleep,
  frozen: BATTLE_TEXT.frozen,
  paralyzed: BATTLE_TEXT.paralyzed,
};

/**
 * One fighter uses a move (index -1: Lotta disperata, when no move has PP left). `dodge` only matters for the wild
 * beast's attacks on you. `movesFirst`: the target has not acted yet this round (a flinch only works then).
 */
export function useMove(
  s: BattleState,
  side: Side,
  index: number,
  rng: Rng,
  dodge: Dodge = 'none',
  movesFirst = false,
): Step[] {
  const att = side === 'you' ? you(s) : s.foe;
  const def = side === 'you' ? s.foe : you(s);
  const other: Side = side === 'you' ? 'foe' : 'you';
  const steps: Step[] = [];
  if (att.hp <= 0) return steps;
  const turn = checkTurn(att, rng);
  if (turn.recovered) steps.push({ kind: 'text', text: BATTLE_TEXT[turn.recovered](named(att)) });
  if (turn.blocked) return [...steps, { kind: 'text', text: BLOCKED_TEXT[turn.blocked](named(att)) }];
  const struggle = index < 0 || !att.moves.some(canUse);
  const bm = struggle ? null : att.moves[index];
  if (!struggle && (!bm || !canUse(bm))) return steps;
  const move = bm ? bm.move : { ...att.moves[0]!.move, name: STRUGGLE.name, fx: [] };
  if (bm) bm.pp--;
  const rules = bm ? bm.rules : { power: STRUGGLE.power, accuracy: null, effects: [] };
  // accuracy, like Pokémon: × the user's accuracy stage against the target's evasion
  if (rules.accuracy !== null) {
    const chance = (rules.accuracy / 100) * accuracyMult(att.stages.acc - def.stages.eva);
    if (rng() >= chance)
      return [
        ...steps,
        {
          kind: 'text',
          text: (side === 'you' ? BATTLE_TEXT.uses : BATTLE_TEXT.foeUses)(named(att), move.name),
        },
        { kind: 'text', text: BATTLE_TEXT.missed(named(att)) },
      ];
  }
  const n = rules.power > 0 ? hitsOf(move) : 0;
  const hits: number[] = [];
  let crit = false;
  for (let i = 0; i < n && def.hp > 0; i++) {
    const h = hitDamage(att, def, move, rng, n > 1, struggle ? STRUGGLE.power : undefined);
    let dmg = h.damage;
    if (side === 'foe' && dodge === 'perfect') dmg = 0;
    else if (side === 'foe' && dodge === 'graze') dmg = Math.round(dmg * BATTLE.dodge.grazeMult);
    def.hp = Math.max(0, def.hp - dmg);
    hits.push(dmg);
    crit ||= h.crit;
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
    effect: rules.power <= 0 ? null : eff > 1 ? 'super' : eff < 1 ? 'weak' : null,
  });
  const dealt = hits.reduce((a, b) => a + b, 0);
  if (struggle) {
    const recoil = Math.max(1, Math.floor(att.maxHp * STRUGGLE.recoilShare));
    att.hp = Math.max(0, att.hp - recoil);
    steps.push({ kind: 'hurt', side, amount: recoil, text: BATTLE_TEXT.recoil(named(att)) });
  }
  const landed = rules.power <= 0 || dealt > 0;
  for (const e of rules.effects) {
    if (!landed || rng() >= ('chance' in e ? e.chance : 1)) continue;
    if (e.kind === 'status') {
      if (giveStatus(def, e.status, formType(def.form), rng))
        steps.push({ kind: 'text', text: BATTLE_TEXT.gotStatus[e.status](named(def)) });
      else if (rules.power <= 0) steps.push({ kind: 'text', text: BATTLE_TEXT.noEffect });
    } else if (e.kind === 'stage') {
      const who = e.who === 'self' ? att : def;
      const moved = who.hp > 0 ? changeStage(who, e.stat, e.by) : 0;
      steps.push({ kind: 'text', text: BATTLE_TEXT.stage(named(who), STAGE_NAMES[e.stat], moved, e.by) });
    } else if (e.kind === 'flinch') {
      if (movesFirst && def.hp > 0) def.flinch = true;
    } else if (e.kind === 'heal' || e.kind === 'drain') {
      const want = e.kind === 'heal' ? att.maxHp * e.share : dealt * e.share;
      const amount = Math.min(att.maxHp - att.hp, Math.max(1, Math.floor(want)));
      if (amount > 0 && att.hp > 0) {
        att.hp += amount;
        steps.push({ kind: 'heal', side, amount });
      }
    }
  }
  if (def.hp <= 0) steps.push({ kind: 'faint', side: other });
  if (att.hp <= 0) steps.push({ kind: 'faint', side });
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

/** End of a round: poison and wounds hurt, a flinch wears off, and the battle may be over. */
export function endRound(s: BattleState): Step[] {
  const steps: Step[] = [];
  for (const [side, f] of [
    ['you', you(s)],
    ['foe', s.foe],
  ] as const) {
    f.flinch = false;
    const dmg = s.over ? 0 : residualDamage(f);
    if (!dmg || !f.status) continue;
    f.hp = Math.max(0, f.hp - dmg);
    steps.push({ kind: 'hurt', side, amount: dmg, text: BATTLE_TEXT.residual[f.status](named(f)) });
    if (f.hp <= 0) steps.push({ kind: 'faint', side });
  }
  if (!s.over) {
    if (s.foe.hp <= 0) s.over = 'won';
    else if (s.team.every((f) => f.hp <= 0)) s.over = 'lost';
  }
  return steps;
}

/** After a faint on your side: the first beast still standing, or -1. */
export const nextStanding = (s: BattleState): number => s.team.findIndex((f) => f.hp > 0);

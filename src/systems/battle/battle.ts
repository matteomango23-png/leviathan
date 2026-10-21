// A turn-based battle, 1 against 1, like Pokémon: you pick an action (a move, the backpack, another beast,
// taming, fleeing), the wild beast picks a move, and they happen in order of priority and speed. Moves have PP,
// accuracy and effects (data/battleMoves.ts), conditions and stages work as in Pokémon (status.ts). Pure logic: the
// battle scene animates the steps it returns.
import { BATTLE } from '../../data/battle';
import { BATTLE_TEXT } from '../../data/battleText';
import type { TypeId } from '../../data/rules';
import type { Rng } from '../math';
import {
  REST_SLEEP_TURNS,
  STAGE_NAMES,
  STRUGGLE,
  type BattleMoveDef,
  type StageId,
} from '../../data/moveBattle';
import { formType } from '../beasts/forms';
import {
  averageHits,
  canUse,
  effectiveness,
  hitDamage,
  moveTypeAgainst,
  named,
  noStages,
  rollHits,
  type Fighter,
} from './fighter';
import { accuracyMult, changeStage, checkTurn, effectiveStat, giveStatus, residualDamage } from './status';

export type Side = 'you' | 'foe';

export type Action =
  | { kind: 'move'; index: number }
  | { kind: 'switch'; index: number }
  /** A tame attempt with this shell (ItemDef.shell); none: the weakest you have. */
  | { kind: 'tame'; shell?: string }
  | { kind: 'flee' }
  /** An item on team beast `target` (an index; none: the one in the water), `move` for an Etere. */
  | { kind: 'item'; id: string; target?: number; move?: number };

/** What happened, in order, for the scene to show. */
export type Step =
  | { kind: 'text'; text: string }
  | {
      kind: 'attack';
      side: Side;
      move: string;
      /** The type it hit with (the colour of its effect). */
      type: TypeId;
      hits: number[];
      crit: boolean;
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
  /** Tries left for the wild beast to flee in fear of the superpredator you ride (beasts/mountTraits.ts). */
  foeFleeTries: number;
  /** 'escaped': the wild beast ran away in fear. */
  over: null | 'won' | 'lost' | 'caught' | 'fled' | 'escaped';
  /** The wild beast's move for this round (chosen at the start of the round). */
  foeMove: number;
  /** Its pack waiting to come in, one after the other (block 5b), and the ones already beaten. */
  reserve: Fighter[];
  defeated: { form: Fighter['form']; level: number }[];
}

export const you = (s: BattleState): Fighter => s.team[s.active]!;

export function createBattle(team: Fighter[], foe: Fighter, reserve: Fighter[] = []): BattleState {
  const active = Math.max(
    0,
    team.findIndex((f) => f.hp > 0),
  );
  return { team, active, foe, fleeTries: 0, foeFleeTries: 0, over: null, foeMove: 0, reserve, defeated: [] };
}

/** The wild beast's choice: its best move with PP against you, sometimes a random one. */
export function chooseFoeMove(s: BattleState, rng: Rng): number {
  const ready = s.foe.moves.map((m, i) => ({ m, i })).filter(({ m }) => canUse(m));
  if (!ready.length) return -1; // no PP left: Lotta disperata
  if (rng() < BATTLE.ai.randomChoice) return ready[Math.floor(rng() * ready.length)]!.i;
  const me = you(s);
  const score = ({ m }: (typeof ready)[number]): number => {
    const r = m.move;
    if (r.power <= 0) {
      // a move without damage is worth it while it can still do something
      const useful = r.effects.some(
        (e) =>
          (e.kind === 'status' && !me.status) ||
          ((e.kind === 'heal' || e.kind === 'rest') && s.foe.hp < s.foe.maxHp * 0.5) ||
          (e.kind === 'stage' && (e.who === 'self' ? s.foe.stages[e.stat] < 2 : me.stages[e.stat] > -2)),
      );
      return useful ? 50 : 1;
    }
    const stab = moveTypeAgainst(r, me) === formType(s.foe.form) || r.type === 'variabile' ? BATTLE.stab : 1;
    return r.power * stab * effectiveness(r, me) * averageHits(r) * ((r.accuracy ?? 100) / 100);
  };
  return ready.reduce((a, b) => (score(b) > score(a) ? b : a)).i;
}

/** Who acts first this round: switching, items, taming and fleeing first; then priority; then speed, like Pokémon. */
export function firstSide(s: BattleState, action: Action, rng: Rng): Side {
  if (action.kind !== 'move') return 'you';
  const prio = (f: Fighter, i: number): number => f.moves[i]?.move.priority ?? 0;
  const p = prio(you(s), action.index) - prio(s.foe, s.foeMove);
  if (p !== 0) return p > 0 ? 'you' : 'foe';
  const a = effectiveStat(you(s), 'spe');
  const b = effectiveStat(s.foe, 'spe');
  return a === b ? (rng() < 0.5 ? 'you' : 'foe') : a > b ? 'you' : 'foe';
}

const BLOCKED_TEXT = {
  flinch: BATTLE_TEXT.flinched,
  sleep: BATTLE_TEXT.asleep,
  frozen: BATTLE_TEXT.frozen,
  paralyzed: BATTLE_TEXT.paralyzed,
};

/** The move Lotta disperata stands on (no PP, no effects but its recoil). */
const STRUGGLE_MOVE: BattleMoveDef = {
  id: 'lotta_disperata',
  name: STRUGGLE.name,
  type: 'predatore',
  category: 'fisico',
  power: STRUGGLE.power,
  accuracy: null,
  pp: 1,
  priority: 0,
  effects: [],
  text: '',
};

const ALL_STATS: StageId[] = ['atk', 'def', 'spa', 'spd', 'spe'];

/**
 * One fighter uses a move (index -1: Lotta disperata, when no move has PP left). `movesFirst`: the target has not
 * acted yet this round (a flinch only works then).
 */
export function useMove(s: BattleState, side: Side, index: number, rng: Rng, movesFirst = false): Step[] {
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
  const move = bm ? bm.move : STRUGGLE_MOVE;
  if (bm) bm.pp--;
  // accuracy, like Pokémon: × the user's accuracy stage against the target's evasion
  if (move.accuracy !== null) {
    const chance = (move.accuracy / 100) * accuracyMult(att.stages.acc - def.stages.eva);
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
  const n = move.power > 0 ? rollHits(move, rng) : 0;
  const hits: number[] = [];
  let crit = false;
  for (let i = 0; i < n && def.hp > 0; i++) {
    const h = hitDamage(att, def, move, rng);
    def.hp = Math.max(0, def.hp - h.damage);
    hits.push(h.damage);
    crit ||= h.crit;
  }
  const eff = effectiveness(move, def);
  steps.push({
    kind: 'attack',
    side,
    move: move.name,
    type: moveTypeAgainst(move, def),
    hits,
    crit,
    effect: move.power <= 0 ? null : eff > 1 ? 'super' : eff < 1 ? 'weak' : null,
  });
  const dealt = hits.reduce((a, b) => a + b, 0);
  const hurt = (amount: number): void => {
    att.hp = Math.max(0, att.hp - amount);
    steps.push({ kind: 'hurt', side, amount, text: BATTLE_TEXT.recoil(named(att)) });
  };
  if (struggle) hurt(Math.max(1, Math.floor(att.maxHp * STRUGGLE.recoilShare)));
  const landed = move.power <= 0 || dealt > 0;
  for (const e of move.effects) {
    if (!landed || rng() >= ('chance' in e ? e.chance : 1)) continue;
    if (e.kind === 'status') {
      if (giveStatus(def, e.status, formType(def.form), rng))
        steps.push({ kind: 'text', text: BATTLE_TEXT.gotStatus[e.status](named(def)) });
      else if (move.power <= 0) steps.push({ kind: 'text', text: BATTLE_TEXT.noEffect });
    } else if (e.kind === 'stage') {
      const who = e.who === 'self' ? att : def;
      const moved = who.hp > 0 ? changeStage(who, e.stat, e.by) : 0;
      steps.push({ kind: 'text', text: BATTLE_TEXT.stage(named(who), STAGE_NAMES[e.stat], moved, e.by) });
    } else if (e.kind === 'boostAll') {
      for (const st of ALL_STATS) changeStage(att, st, 1);
      steps.push({ kind: 'text', text: BATTLE_TEXT.boostAll(named(att)) });
    } else if (e.kind === 'haze') {
      att.stages = noStages();
      def.stages = noStages();
      steps.push({ kind: 'text', text: BATTLE_TEXT.haze });
    } else if (e.kind === 'flinch') {
      if (movesFirst && def.hp > 0) def.flinch = true;
    } else if (e.kind === 'recoil') {
      if (dealt > 0) hurt(Math.max(1, Math.floor(dealt * e.share)));
    } else if (e.kind === 'rest') {
      if (att.hp >= att.maxHp) {
        steps.push({ kind: 'text', text: BATTLE_TEXT.noEffect });
        continue;
      }
      const amount = att.maxHp - att.hp;
      att.hp = att.maxHp;
      att.status = 'stordito';
      att.sleepTurns = REST_SLEEP_TURNS;
      steps.push({ kind: 'heal', side, amount });
      steps.push({ kind: 'text', text: BATTLE_TEXT.gotStatus.stordito(named(att)) });
    } else if (e.kind === 'heal' || e.kind === 'drain') {
      const want = e.kind === 'heal' ? att.maxHp * e.share : dealt * e.share;
      const amount = Math.min(att.maxHp - att.hp, Math.max(1, Math.floor(want)));
      if (amount > 0 && att.hp > 0) {
        att.hp += amount;
        steps.push({ kind: 'heal', side, amount });
      } else if (e.kind === 'heal') steps.push({ kind: 'text', text: BATTLE_TEXT.noEffect });
    }
  }
  if (def.hp <= 0) steps.push({ kind: 'faint', side: other });
  if (att.hp <= 0) steps.push({ kind: 'faint', side });
  return steps;
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
    if (s.foe.hp <= 0 && !s.reserve.length)
      s.over = 'won'; // its pack still to come: not yet
    else if (s.team.every((f) => f.hp <= 0)) s.over = 'lost';
  }
  return steps;
}

/** The beaten wild beast's pack sends the next one in (block 5b); false when none is left. */
export function nextFoe(s: BattleState): boolean {
  if (s.foe.hp > 0 || !s.reserve.length) return false;
  const next = s.reserve.shift()!;
  s.defeated.push({ form: s.foe.form, level: s.foe.level });
  s.foe = next;
  s.foeMove = 0;
  return true;
}

/** After a faint on your side: the first beast still standing, or -1. */
export const nextStanding = (s: BattleState): number => s.team.findIndex((f) => f.hp > 0);

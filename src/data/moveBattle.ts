// Leviatano — how each move works in battle, the Pokémon way (owner, 3 ottobre 2026: "copia la logica delle mosse").
// Every move gets power, accuracy, PP, a category (fisico / speciale / stato), a priority and its effects, as in
// Pokémon. They are worked out from the move's power class and its `fx` (which also drive the open sea), with the
// Pokémon move each one resembles in mind; a move can be set by hand in MOVE_OVERRIDES. Values are tuning.
import type { MoveDef } from './moves';
import { PHYSICAL_TYPES } from './stats';

/** The five lasting conditions of Pokémon, with sea names. */
export type StatusId = 'avvelenato' | 'ferito' | 'paralizzato' | 'stordito' | 'congelato';
/** The statistics that can go up and down from −6 to +6 (accuracy and evasion too). */
export type StageId = 'atk' | 'def' | 'spa' | 'spd' | 'spe' | 'acc' | 'eva';
export type Category = 'fisico' | 'speciale' | 'stato';
export const STAGE_NAMES: Record<StageId, string> = {
  atk: 'l\u2019Attacco',
  def: 'la Difesa',
  spa: 'l\u2019Attacco Speciale',
  spd: 'la Difesa Speciale',
  spe: 'la Velocità',
  acc: 'la Precisione',
  eva: 'l\u2019Elusione',
};
export const STATUS_NAMES: Record<StatusId, string> = {
  avvelenato: 'AVV',
  ferito: 'FER',
  paralizzato: 'PAR',
  stordito: 'STO',
  congelato: 'CON',
};

export type MoveEffect =
  | { kind: 'status'; status: StatusId; chance: number }
  | { kind: 'stage'; stat: StageId; by: number; who: 'self' | 'foe'; chance: number }
  | { kind: 'flinch'; chance: number } // the target loses its turn, if it has not moved yet this round
  | { kind: 'heal'; share: number } // the user heals this share of its health
  | { kind: 'drain'; share: number }; // the user heals this share of the damage done

export interface MoveBattle {
  power: number; // 0: no damage
  accuracy: number | null; // % (null: never misses, like Pokémon's "—")
  pp: number;
  category: Category;
  priority: number; // like Pokémon: +1 strikes first (Attacco Rapido), −1 last
  effects: MoveEffect[];
}

/** Power by class, like Pokémon's (Azione 40, Morso 60, Surf 90, Iper Raggio 150). */
export const POWER_BY_CLASS: Record<MoveDef['power'], number> = { nessuno: 0, basso: 40, medio: 60, alto: 90, altissimo: 120 };
/** PP by class, like Pokémon's (weak moves 30–35, strong ones 5–10). */
export const PP_BY_CLASS: Record<MoveDef['power'], number> = { nessuno: 15, basso: 30, medio: 20, alto: 15, altissimo: 5 };
/** Accuracy: the strongest moves miss sometimes (Idropompa 80, Fuocobomba 85), a move that only puts to sleep 75. */
export const ACCURACY = { altissimo: 85, statusOnly: 75, default: 100 };
/** Chance of a move's side effect, like Pokémon's (Morso 30% di tentennare, Geloraggio 10% di congelare). */
export const EFFECT_CHANCE = { side: 0.3, freeze: 0.1, given: 1 };

/** Moves set by hand (by id), over the worked-out ones. */
export const MOVE_OVERRIDES: Record<string, Partial<MoveBattle>> = {};

const num = (fx: string, i = 1): number | undefined => {
  const n = Number(fx.split(':')[i]);
  return Number.isFinite(n) ? n : undefined;
};

/** The battle rules of a move. */
export function moveBattleOf(m: MoveDef): MoveBattle {
  const has = (p: string): string | undefined => m.fx.find((f) => f === p || f.startsWith(`${p}:`));
  const damaging = m.power !== 'nessuno';
  const effects: MoveEffect[] = [];
  const add = (e: MoveEffect): number => effects.push(e);
  const side = (c?: number): number => (damaging ? (c ?? EFFECT_CHANCE.side) : EFFECT_CHANCE.given);

  // stunning: a shock paralyses, frost freezes, anything else makes it lose its turn (or sleep, if that is all it does)
  const stun = has('stun') ?? has('stunChance') ?? has('aura');
  if (stun) {
    const c = stun.startsWith('stunChance') ? num(stun) : undefined;
    if (m.type === 'tempesta') add({ kind: 'status', status: 'paralizzato', chance: side(c) });
    else if (m.type === 'glaciale')
      add({ kind: 'status', status: damaging ? 'congelato' : 'stordito', chance: damaging ? EFFECT_CHANCE.freeze : 1 });
    else if (damaging) add({ kind: 'flinch', chance: c ?? EFFECT_CHANCE.side });
    else add({ kind: 'status', status: 'stordito', chance: 1 });
  }
  if (has('grab') || has('trap') || has('knockback') || has('pull') || has('dragAway') || has('fear'))
    if (!stun) add({ kind: 'flinch', chance: damaging ? EFFECT_CHANCE.side : 1 });
  // poison and wounds: venom (abissale, tempesta) poisons, a bite that tears wounds (Pokémon's burn)
  if (has('bleed'))
    add({
      kind: 'status',
      status: m.type === 'abissale' || m.type === 'tempesta' ? 'avvelenato' : 'ferito',
      chance: side(),
    });
  const cloud = has('cloud');
  if (cloud?.startsWith('cloud:poison')) add({ kind: 'status', status: 'avvelenato', chance: 1 });
  else if (cloud) add({ kind: 'stage', stat: 'acc', by: -1, who: 'foe', chance: 1 });
  if (has('light')) add({ kind: 'stage', stat: 'acc', by: -1, who: 'foe', chance: 1 });
  // the user's guard and strength
  if (has('shield') || has('dmgReduce') || has('parry') || has('invulnerable')) {
    add({ kind: 'stage', stat: 'def', by: 1, who: 'self', chance: 1 });
    add({ kind: 'stage', stat: 'spd', by: 1, who: 'self', chance: 1 });
  }
  if (has('buff')) add({ kind: 'stage', stat: 'spe', by: 2, who: 'self', chance: 1 });
  if (has('invisible') || has('blink')) add({ kind: 'stage', stat: 'eva', by: 1, who: 'self', chance: 1 });
  if (has('reveal') || has('revealMap')) add({ kind: 'stage', stat: 'acc', by: 1, who: 'self', chance: 1 });
  if (has('taunt')) add({ kind: 'stage', stat: 'atk', by: -1, who: 'foe', chance: 1 });
  if (has('slow')) add({ kind: 'stage', stat: 'spe', by: -1, who: 'foe', chance: 1 });
  if (has('armorBreak') || has('weakPoints') || has('ignoreDefense') || has('pierce'))
    add({ kind: 'stage', stat: 'def', by: -1, who: 'foe', chance: damaging ? 0.5 : 1 });
  const heal = has('heal');
  if (heal) add({ kind: 'heal', share: heal.startsWith('heal:team:') ? (num(heal, 2) ?? 0.5) : 0.5 });
  const steal = has('lifesteal');
  if (steal) add({ kind: 'drain', share: 0.5 });
  // a move that does nothing in a battle gets the user ready to strike (like Danzaspada, a little milder)
  if (!damaging && !effects.length) add({ kind: 'stage', stat: 'atk', by: 1, who: 'self', chance: 1 });

  const onlySleeps = !damaging && effects.some((e) => e.kind === 'status' && e.status === 'stordito');
  const selfOnly = !damaging && effects.every((e) => e.kind === 'heal' || (e.kind === 'stage' && e.who === 'self'));
  const out: MoveBattle = {
    power: POWER_BY_CLASS[m.power],
    accuracy: selfOnly
      ? null
      : m.power === 'altissimo'
        ? ACCURACY.altissimo
        : onlySleeps
          ? ACCURACY.statusOnly
          : ACCURACY.default,
    pp: PP_BY_CLASS[m.power],
    category: !damaging ? 'stato' : PHYSICAL_TYPES.includes(m.type) ? 'fisico' : 'speciale',
    priority: has('dash') || has('ambush') ? 1 : has('slowAttack') ? -1 : 0,
    effects,
  };
  return { ...out, ...MOVE_OVERRIDES[m.id] };
}

/** Pokémon's last resort when no move has PP left (Scontro: power 50, the user takes a quarter of its health). */
export const STRUGGLE = { name: 'Lotta disperata', power: 50, recoilShare: 0.25 };

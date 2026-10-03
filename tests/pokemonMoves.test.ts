// Moves the Pokémon way (owner, 3 ottobre 2026): Pokémon's moves with our names, learned by level, at most 4,
// PP, accuracy, categories, priority, conditions and stages.
import { describe, expect, it } from 'vitest';
import { BATTLE_MOVES, BATTLE_MOVE_BY_ID } from '../src/data/battleMoves';
import { LEARNSETS } from '../src/data/learnsets';
import { SPECIES } from '../src/data/species';
import { createBattle, endRound, useMove } from '../src/systems/battle/battle';
import { makeFighter, rollHits, type Fighter } from '../src/systems/battle/fighter';
import { checkTurn, effectiveStat, giveStatus, stageMult } from '../src/systems/battle/status';
import { decideMove, defaultMoves, rememberable } from '../src/systems/beasts/battleMoves';
import { gainXp, xpToNext } from '../src/systems/beasts/growth';
import { makeTeamBeast } from '../src/systems/beasts/team';
import type { GameEvent } from '../src/systems/events';

const rngOf = (v: number) => () => v;
const beast = (id: string, level = 20, known?: string[]) =>
  makeFighter({ speciesId: id, variant: 'comune', seed: 1 }, level, undefined, undefined, [], known);
const tank = (f: Fighter): Fighter => Object.assign(f, { hp: 9999, maxHp: 9999 });

describe('the move list', () => {
  it('every move is a sound Pokémon move: PP, accuracy, category and effects that match', () => {
    const ids = new Set<string>();
    for (const m of BATTLE_MOVES) {
      expect(ids.has(m.id), m.id).toBe(false);
      ids.add(m.id);
      expect(m.pp, m.id).toBeGreaterThan(0);
      if (m.accuracy !== null) expect(m.accuracy > 0 && m.accuracy <= 100, m.id).toBe(true);
      expect(m.category === 'stato', m.id).toBe(m.power === 0);
      if (m.category === 'stato') expect(m.effects.length, m.id).toBeGreaterThan(0);
    }
    expect(BATTLE_MOVES.length).toBeGreaterThan(120);
  });

  it('every species has a learnset of real moves, with at least one damaging move at level 1', () => {
    for (const s of SPECIES) {
      const list = LEARNSETS[s.id];
      expect(list, s.id).toBeDefined();
      for (const e of list!) expect(BATTLE_MOVE_BY_ID[e.move], `${s.id}: ${e.move}`).toBeDefined();
      const first = defaultMoves({ speciesId: s.id, variant: 'comune' }, 1);
      expect(
        first.some((id) => BATTLE_MOVE_BY_ID[id]!.power > 0),
        s.id,
      ).toBe(true);
    }
  });

  it('a wild beast knows the last 4 moves it learned by its level', () => {
    expect(defaultMoves({ speciesId: 'zanna', variant: 'comune' }, 1)).toEqual(['spinta', 'ringhio']);
    expect(defaultMoves({ speciesId: 'zanna', variant: 'comune' }, 13)).toEqual([
      'ringhio',
      'guizzo',
      'azzannata',
      'sguardo_feroce',
    ]);
    // an evolved beast knows its evolution move from the level its line evolves
    expect(defaultMoves({ speciesId: 'squarcio', variant: 'comune' }, 17)).toContain('zanna_lunga');
  });
});

describe('learning moves', () => {
  it('with a free slot a move is learned on its own when the level comes', () => {
    const b = makeTeamBeast('b1', { speciesId: 'zanna', variant: 'comune' }, 4, true);
    expect(b.known).toEqual(['spinta', 'ringhio']);
    const events: GameEvent[] = [];
    gainXp(b, xpToNext(b), events);
    expect(b.known).toEqual(['spinta', 'ringhio', 'guizzo']);
    expect(events).toContainEqual({ type: 'levelUp', uid: 'b1', level: 5, move: 'Guizzo' });
  });

  it('with 4 moves it waits for you: forget one, or give it up', () => {
    const b = makeTeamBeast('b1', { speciesId: 'zanna', variant: 'comune' }, 16, true);
    expect(b.known).toHaveLength(4);
    const events: GameEvent[] = [];
    gainXp(b, xpToNext(b), events);
    const waiting = b.pendingMoves ?? [];
    expect(waiting.length).toBeGreaterThan(0);
    expect(events.some((e) => e.type === 'moveWaiting')).toBe(true);
    const move = waiting[0]!;
    const before = [...b.known];
    expect(decideMove(b, move, 1)).toBe(true);
    expect(b.known[1]).toBe(move);
    expect(b.known).not.toContain(before[1]);
    expect(b.pendingMoves?.includes(move) ?? false).toBe(false);
    expect(rememberable(b.form, b.level, b.known)).toContain(before[1]);
  });

  it('evolving teaches the new stage its evolution move', () => {
    const b = makeTeamBeast('b1', { speciesId: 'zanna', variant: 'comune' }, 15, true);
    b.known = ['spinta'];
    gainXp(b, xpToNext(b), []);
    expect(b.form.speciesId).toBe('squarcio');
    expect(b.known).toContain('zanna_lunga');
  });
});

describe('moves like Pokémon', () => {
  it('stages multiply a statistic like Pokémon', () => {
    expect(stageMult(1)).toBe(1.5);
    expect(stageMult(2)).toBe(2);
    expect(stageMult(-1)).toBeCloseTo(2 / 3);
    expect(stageMult(6)).toBe(4);
  });

  it('poison takes 1/8 of the health at the end of each round, a wound 1/16', () => {
    const s = createBattle([beast('squalo_bianco')], beast('barracuda'));
    s.foe.status = 'avvelenato';
    const hp = s.foe.hp;
    endRound(s);
    expect(hp - s.foe.hp).toBe(Math.max(1, Math.floor(s.foe.maxHp / 8)));
    s.foe.hp = s.foe.maxHp;
    s.foe.status = 'ferito';
    endRound(s);
    expect(s.foe.maxHp - s.foe.hp).toBe(Math.max(1, Math.floor(s.foe.maxHp / 16)));
  });

  it('paralysis halves speed; sleep stops it for some turns, then it wakes', () => {
    const f = beast('squalo_bianco');
    const fast = effectiveStat(f, 'spe');
    f.status = 'paralizzato';
    expect(effectiveStat(f, 'spe')).toBe(fast / 2);
    const g = beast('barracuda');
    expect(giveStatus(g, 'stordito', 'predatore', rngOf(0))).toBe(true);
    let blocked = 0;
    while (checkTurn(g, rngOf(0.9)).blocked === 'sleep') blocked++;
    expect(blocked).toBeGreaterThanOrEqual(1);
    expect(g.status).toBeNull();
  });

  it('a type is immune to its own condition, and a beast holds one condition at a time', () => {
    const f = beast('orca');
    expect(giveStatus(f, 'congelato', 'glaciale', rngOf(0))).toBe(false);
    expect(giveStatus(f, 'avvelenato', 'glaciale', rngOf(0))).toBe(true);
    expect(giveStatus(f, 'ferito', 'glaciale', rngOf(0))).toBe(false);
  });

  it('a raised Attack hits harder', () => {
    const hit = (stage: number): number => {
      const s = createBattle([beast('squalo_bianco', 20, ['azzannata'])], tank(beast('barracuda')));
      s.team[0]!.stages.atk = stage;
      useMove(s, 'you', 0, rngOf(0.5));
      return 9999 - s.foe.hp;
    };
    expect(hit(2)).toBeGreaterThan(hit(0) * 1.6);
  });

  it('a move with recoil hurts its user by a share of the damage', () => {
    const s = createBattle([beast('squalo_bianco', 20, ['carica_suicida'])], tank(beast('barracuda')));
    const me = s.team[0]!;
    useMove(s, 'you', 0, rngOf(0.5));
    const dealt = 9999 - s.foe.hp;
    expect(me.maxHp - me.hp).toBe(Math.floor(dealt / 3));
  });

  it('Letargo heals fully and puts it to sleep', () => {
    const s = createBattle([beast('tricheco', 30, ['letargo'])], beast('barracuda'));
    const me = s.team[0]!;
    me.hp = 1;
    useMove(s, 'you', 0, rngOf(0.5));
    expect(me.hp).toBe(me.maxHp);
    expect(me.status).toBe('stordito');
  });

  it('a 2–5 hit move hits 2 to 5 times', () => {
    const m = BATTLE_MOVE_BY_ID['morsi_raffica']!;
    expect(rollHits(m, rngOf(0))).toBe(2);
    expect(rollHits(m, rngOf(0.5))).toBe(3);
    expect(rollHits(m, rngOf(0.99))).toBe(5);
  });

  it('a flinch only stops a beast that has not moved yet this round', () => {
    const f = beast('barracuda');
    f.flinch = true;
    expect(checkTurn(f, rngOf(0.5)).blocked).toBe('flinch');
    expect(checkTurn(f, rngOf(0.5)).blocked).toBeNull();
  });

  it('with no PP left it struggles and hurts itself', () => {
    const s = createBattle([beast('squalo_bianco')], tank(beast('barracuda')));
    const me = s.team[0]!;
    for (const m of me.moves) m.pp = 0;
    const hp = me.hp;
    const steps = useMove(s, 'you', -1, rngOf(0.5));
    expect(steps.some((st) => st.kind === 'hurt')).toBe(true);
    expect(me.hp).toBeLessThan(hp);
    expect(s.foe.hp).toBeLessThan(9999);
  });
});

describe('moves and PP in the save', () => {
  it('a team beast keeps its moves and spent PP, and starts the next battle with them', async () => {
    const { newSave, parseSave } = await import('../src/systems/save/saveData');
    const { restoreTeam } = await import('../src/systems/save/convert');
    const { fighterFromTeam } = await import('../src/systems/battle/fighter');
    const save = newSave({ x: 0, y: 0 });
    save.team = [
      {
        uid: 'b1',
        form: { speciesId: 'squalo_bianco', variant: 'comune', seed: 3 },
        level: 10,
        hp: 20,
        ko: false,
        inTeam: true,
        xp: 0,
        food: 0,
        known: ['azzannata', 'guizzo'],
        ppUsed: [4, 1],
        pendingMoves: ['muso_terrore'],
      },
    ];
    const b = restoreTeam(parseSave(JSON.stringify(save)))[0]!;
    expect(b.known).toEqual(['azzannata', 'guizzo']);
    expect(b.ppUsed).toEqual([4, 1]);
    expect(b.pendingMoves).toEqual(['muso_terrore']);
    const f = fighterFromTeam(b);
    expect(f.moves[0]!.pp).toBe(f.moves[0]!.maxPp - 4);
  });

  it('an older save gets the moves its level gives, with full PP', async () => {
    const { newSave, parseSave } = await import('../src/systems/save/saveData');
    const { restoreTeam } = await import('../src/systems/save/convert');
    const save = newSave({ x: 0, y: 0 });
    save.team = [
      {
        uid: 'b1',
        form: { speciesId: 'zanna', variant: 'comune' },
        level: 13,
        hp: 20,
        ko: false,
        inTeam: true,
        xp: 0,
        food: 0,
        ppUsed: [3, 3, 3],
      },
    ];
    const b = restoreTeam(parseSave(JSON.stringify(save)))[0]!;
    expect(b.known).toEqual(defaultMoves(b.form, 13));
    expect(b.ppUsed).toBeUndefined();
  });
});

// Moves the Pokémon way (owner, 3 ottobre 2026): PP, accuracy, categories, priority, conditions and stages.
import { describe, expect, it } from 'vitest';
import { MOVES } from '../src/data/moves';
import { moveBattleOf } from '../src/data/moveBattle';
import { createBattle, endRound, useMove } from '../src/systems/battle/battle';
import { makeFighter, type Fighter } from '../src/systems/battle/fighter';
import { checkTurn, effectiveStat, giveStatus, stageMult } from '../src/systems/battle/status';

const rngOf = (v: number) => () => v;
const beast = (id: string, level = 20) => makeFighter({ speciesId: id, variant: 'comune', seed: 1 }, level);
const tank = (f: Fighter): Fighter => Object.assign(f, { hp: 9999, maxHp: 9999 });

describe('moves like Pokémon', () => {
  it('every move has PP, an accuracy and a category that match it', () => {
    for (const m of MOVES) {
      const r = moveBattleOf(m);
      expect(r.pp, m.id).toBeGreaterThan(0);
      if (r.accuracy !== null) expect(r.accuracy > 0 && r.accuracy <= 100, m.id).toBe(true);
      expect(r.category === 'stato', m.id).toBe(m.power === 'nessuno');
      if (r.category === 'stato') expect(r.effects.length, m.id).toBeGreaterThan(0);
    }
  });

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
      const s = createBattle([beast('squalo_bianco')], tank(beast('barracuda')));
      s.team[0]!.stages.atk = stage;
      useMove(s, 'you', 0, rngOf(0.5));
      return 9999 - s.foe.hp;
    };
    expect(hit(2)).toBeGreaterThan(hit(0) * 1.6);
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

describe('PP between battles', () => {
  it('a team beast keeps its spent PP in the save, and starts the next battle with them', async () => {
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
        ppUsed: [4, 1, 0],
      },
    ];
    const b = restoreTeam(parseSave(JSON.stringify(save)))[0]!;
    expect(b.ppUsed).toEqual([4, 1, 0]);
    const f = fighterFromTeam(b);
    expect(f.moves[0]!.pp).toBe(f.moves[0]!.maxPp - 4);
    expect(f.form.seed).toBe(3);
  });
});

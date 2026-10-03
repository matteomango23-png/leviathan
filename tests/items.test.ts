// Items like Pokémon (owner, 3 ottobre 2026): medicine, revives, cures, PP, X items; conditions stay after battle.
import { describe, expect, it } from 'vitest';
import { createBattle } from '../src/systems/battle/battle';
import { battleItemUseful, useBattleItem } from '../src/systems/battle/battleItems';
import { fighterFromTeam, makeFighter } from '../src/systems/battle/fighter';
import { applyCare, canApply, careOfBeast, itemDef, useOnBeast } from '../src/systems/economy/items';
import { makeTeamBeast, maxHpOf } from '../src/systems/beasts/team';
import { restoreTeam } from '../src/systems/save/convert';
import { newSave, parseSave } from '../src/systems/save/saveData';
import { ITEMS } from '../src/data/world';
import { MARKET } from '../src/data/economy';

const beast = () => makeTeamBeast('b1', { speciesId: 'zanna', variant: 'comune', seed: 2 }, 20, true);

describe('items like Pokémon', () => {
  it('every medicine is in the market and has a pocket', () => {
    for (const it of ITEMS.filter((i) => i.use && !i.use.tameMult)) {
      expect(MARKET.items, it.id).toContain(it.id);
      expect(it.pocket, it.id).toBeDefined();
    }
  });

  it('a potion heals up to its amount, never a worn-out beast or a healthy one', () => {
    const b = beast();
    const use = itemDef('alga_rossa')!.use!;
    expect(canApply(use, careOfBeast(b))).toBe(false); // full health
    b.hp = 5;
    const c = careOfBeast(b);
    expect(applyCare(use, c).healed).toBe(Math.min(60, maxHpOf(b) - 5));
    b.ko = true;
    b.hp = 0;
    expect(canApply(use, careOfBeast(b))).toBe(false);
  });

  it('a cure only works on its own condition; a full cure on any', () => {
    const b = beast();
    b.status = 'paralizzato';
    const inv = { antidoto: 1, panacea: 1 };
    expect(useOnBeast(inv, 'antidoto', b)).toBeNull();
    expect(useOnBeast(inv, 'panacea', b)?.cured).toBe('paralizzato');
    expect(b.status).toBeUndefined();
    expect(inv.panacea).toBe(0);
  });

  it('an Etere gives PP back to one move, an Elisir to all', () => {
    const b = beast();
    b.ppUsed = [10, 10, 0, 0];
    const inv = { muschio_luminoso: 1, elisir_abissale: 1 };
    useOnBeast(inv, 'muschio_luminoso', b, 1);
    expect(b.ppUsed).toEqual([10, 0, 0, 0]);
    useOnBeast(inv, 'elisir_abissale', b);
    expect(b.ppUsed).toBeUndefined();
  });

  it('in battle: an X item raises a statistic by 2, a revive brings back a worn-out one', () => {
    const team = [fighterFromTeam(beast()), fighterFromTeam(beast())];
    team[1]!.hp = 0;
    const s = createBattle(team, makeFighter({ speciesId: 'barracuda', variant: 'comune' }, 5));
    useBattleItem(s, 'attacco_x');
    expect(s.team[0]!.stages.atk).toBe(2);
    expect(battleItemUseful(s, 'alga_curativa', 1)).toBe(false);
    expect(battleItemUseful(s, 'ambra_risveglio', 1)).toBe(true);
    useBattleItem(s, 'ambra_risveglio', 1);
    expect(s.team[1]!.hp).toBeGreaterThan(0);
  });

  it('a condition stays after the battle and in the save, like Pokémon', () => {
    const b = beast();
    b.status = 'stordito';
    b.sleepTurns = 2;
    expect(fighterFromTeam(b).status).toBe('stordito');
    const save = newSave({ x: 0, y: 0 });
    save.team = [
      {
        uid: 'b1',
        form: b.form,
        level: 20,
        hp: 30,
        ko: false,
        inTeam: true,
        xp: 0,
        food: 0,
        status: 'avvelenato',
      },
    ];
    expect(restoreTeam(parseSave(JSON.stringify(save)))[0]!.status).toBe('avvelenato');
  });
});

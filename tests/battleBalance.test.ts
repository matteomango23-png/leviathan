// Owner's feedback of 3 ottobre 2026: a level 1 barracuda took a fifth of a level 11 Guscio's health, and Guscio's
// moves did almost nothing. Health and bite are ×10 now (a scratch is 1 of ~100) and levels weigh more.
import { describe, expect, it } from 'vitest';
import { hitDamage, makeFighter } from '../src/systems/battle/fighter';
import { hasAlbinoArt, rollWildForm } from '../src/systems/beasts/forms';
import { restoreTeam } from '../src/systems/save/convert';
import { migrate, newSave } from '../src/systems/save/saveData';

const rng = () => 0.5;
const fighter = (id: string, level: number) => makeFighter({ speciesId: id, variant: 'comune' }, level);

describe('battle balance', () => {
  it('a level 1 beast barely scratches a level 11 one', () => {
    const guscio = fighter('guscio', 11);
    const barracuda = fighter('barracuda', 1);
    for (const { move: m } of barracuda.moves) {
      const hit = hitDamage(barracuda, guscio, m, rng).damage;
      expect(hit / guscio.maxHp, m.name).toBeLessThan(0.08);
    }
  });

  it('a level 11 Guscio beats a level 1 barracuda in two hits of its first move', () => {
    const guscio = fighter('guscio', 11);
    const barracuda = fighter('barracuda', 1);
    const first = guscio.moves.find((m) => m.move.power > 0)!.move;
    expect(hitDamage(guscio, barracuda, first, rng).damage * 2).toBeGreaterThanOrEqual(barracuda.maxHp);
  });

  it('Guscio hits about as hard as Zanna with its best move', () => {
    const foe = fighter('tonno', 11);
    const hit = (id: string) =>
      Math.max(...fighter(id, 11).moves.map((m) => hitDamage(fighter(id, 11), foe, m.move, rng).damage));
    expect(hit('guscio') / hit('zanna')).toBeGreaterThan(0.85);
  });

  it('albinos only where they have pictures of their own; a pale stand-in goes back to the common one', () => {
    expect(hasAlbinoArt('squalo_bianco')).toBe(true);
    expect(hasAlbinoArt('barracuda')).toBe(false);
    expect(rollWildForm('barracuda', () => 0).variant).not.toBe('albino');
    expect(rollWildForm('squalo_bianco', () => 0).variant).toBe('albino');
    const save = newSave({ x: 0, y: 0 });
    save.team = [
      {
        uid: 'b1',
        form: { speciesId: 'varano_nilo', variant: 'albino' },
        level: 12,
        hp: 50,
        ko: false,
        inTeam: true,
        xp: 0,
        food: 0,
      },
    ];
    expect(restoreTeam(save)[0]!.form.variant).toBe('comune');
  });

  it('an old save keeps its beasts as healthy as they were (v12: health × 10)', () => {
    const old = migrate({ game: 'leviatano', version: 11, team: [{ uid: 'b1', hp: 5 }] }, undefined, 12) as {
      team: { hp: number }[];
    };
    expect(old.team[0]!.hp).toBe(50);
  });
});

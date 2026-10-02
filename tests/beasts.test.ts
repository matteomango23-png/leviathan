import { describe, expect, it } from 'vitest';
import { CORALS, DELTA, KELP } from '../src/data/worldLayout';
import { MOVES } from '../src/data/moves';
import { WILD_SPAWNS } from '../src/data/beasts';
import { SPECIES } from '../src/data/species';
import { moveDamage, moveTypeMult } from '../src/systems/beasts/combat';
import {
  WHITE_SHARK_FORMS,
  formKey,
  formLengthM,
  formName,
  formStars,
  type BeastForm,
} from '../src/systems/beasts/forms';
import {
  addTamed,
  makeTeamBeast,
  movesFor,
  strongestLevel,
  toggleInTeam,
  type TeamBeast,
} from '../src/systems/beasts/team';

const shark = (over: Partial<BeastForm> = {}): BeastForm => ({
  speciesId: 'squalo_bianco',
  variant: 'comune',
  ...over,
});
const move = (id: string) => MOVES.find((m) => m.id === id)!;

describe('white shark versions', () => {
  it('has six versions with the sizes of the design document', () => {
    const lengths = Object.fromEntries(
      WHITE_SHARK_FORMS.map((f) => [formKey(f), Math.round(formLengthM(f) * 100) / 100]),
    );
    expect(lengths).toEqual({
      squalo_bianco: 6,
      squalo_bianco_alfa: 6.9,
      squalo_bianco_albino: 6,
      squalo_bianco_albino_finale: 9,
      sfregiato: 7.5,
      squalo_bianco_finale: 9,
    });
  });

  it('names every version and gives rare ones an extra star', () => {
    expect(WHITE_SHARK_FORMS.map(formName)).toEqual([
      'Squalo bianco',
      'Squalo bianco alfa',
      'Squalo bianco albino',
      'Squalo bianco Mega albino',
      'Lo Sfregiato',
      'Squalo bianco Titano',
    ]);
    expect(formStars(shark())).toBe(3);
    expect(formStars(shark({ variant: 'albino' }))).toBe(4);
  });

  it('grows 2% per level from 31, and the Titano stays half a megalodon', () => {
    expect(formLengthM(shark(), 30)).toBe(6);
    expect(formLengthM(shark(), 31)).toBeCloseTo(6.12);
    expect(formLengthM(shark({ final: true }), 50)).toBe(9);
  });
});

describe('damage and types', () => {
  it('applies the type circle', () => {
    expect(moveTypeMult('predatore', 'abissale')).toBe(1.5);
    expect(moveTypeMult('predatore', 'corazzato')).toBeCloseTo(0.66);
    expect(moveTypeMult('predatore', 'predatore')).toBe(1);
  });

  it('scales with bite, power, defence and wounded bonus', () => {
    const bite = move('squalo_bianco_1');
    const frenzy = move('squalo_bianco_3');
    const target = { type: 'predatore' as const, defense: 0.1, hp: 10, maxHp: 10 };
    const a = { type: 'predatore' as const, bite: 2, defense: 0.1 };
    expect(moveDamage(a, bite, target)).toBeCloseTo(2 * 1.6 * 0.9, 1);
    const healthy = moveDamage(a, frenzy, target);
    const wounded = moveDamage(a, frenzy, { ...target, hp: 3 });
    expect(wounded).toBeCloseTo(healthy * 2, 1);
  });
});

describe('team', () => {
  const tame = (all: TeamBeast[], form: BeastForm, level = 5) =>
    addTamed(all, makeTeamBeast(`b${all.length + 1}`, form, level, true));

  it('keeps five in the team, the rest go to the reserve', () => {
    const all: TeamBeast[] = [];
    for (let i = 0; i < 6; i++) tame(all, shark({ variant: i % 2 ? 'albino' : 'alfa' }));
    expect(all.filter((b) => b.inTeam)).toHaveLength(5);
    expect(all[5]!.inTeam).toBe(false);
    expect(toggleInTeam(all, 'b6')).toBe(false); // team is full
    expect(toggleInTeam(all, 'b1')).toBe(true);
    expect(toggleInTeam(all, 'b6')).toBe(true);
  });

  it('measures taming difficulty against the strongest team beast', () => {
    const all: TeamBeast[] = [];
    expect(strongestLevel(all)).toBe(1);
    tame(all, shark(), 4);
    tame(all, shark({ variant: 'albino' }), 9);
    expect(strongestLevel(all)).toBe(9);
  });

  it('unlocks moves at levels 1, 7 and 15', () => {
    const unlocked = (level: number) =>
      movesFor(makeTeamBeast('x', shark(), level, true))
        .filter((m) => m.unlocked)
        .map((m) => m.move.slot);
    expect(unlocked(1)).toEqual([1]);
    expect(unlocked(7)).toEqual([1, 2]);
    expect(unlocked(15)).toEqual([1, 2, 3]);
  });
});

describe('wild spawns data', () => {
  it('only spawns beasts inside their region (visitors elsewhere have their own levels)', () => {
    const regions: Record<string, [number, number]> = {
      baia: [0, DELTA.x0],
      delta: [DELTA.x0, DELTA.x1],
      barriera: [CORALS.reef.xMin, CORALS.reef.xMax],
      foresta: [KELP.forest.xMin, KELP.forest.xMax],
    };
    for (const sp of WILD_SPAWNS) {
      if (sp.level || sp.endless) continue;
      const region = SPECIES.find((x) => x.id === sp.speciesId)?.region ?? '';
      const range = regions[region];
      expect(range, sp.speciesId).toBeDefined();
      expect(sp.area[0]).toBeGreaterThanOrEqual(range![0]);
      expect(sp.area[2]).toBeLessThanOrEqual(range![1]);
    }
  });
});

describe('beast sheet', () => {
  it('shows rarity, type, role, stats and moves with locks and damage', async () => {
    const { buildSheet } = await import('../src/systems/beasts/sheet');
    const s = buildSheet({ speciesId: 'squalo_bianco', variant: 'comune' }, 7);
    expect(s.name).toBe('Squalo bianco');
    expect(s.stars).toBe(3);
    expect(s.rarityName).toBe('Rara');
    expect(s.typeName).toBe('Predatore');
    expect(s.roleName).toBe('Cavalcatura');
    expect(s.moves.map((m) => m.unlocked)).toEqual([true, true, false]);
    expect(s.moves[0]!.damageNext).toBeGreaterThanOrEqual(s.moves[0]!.damageNow);
    expect(s.lengthM).toBe(6);
    expect(s.habitat).toBe('Baia di Portofosco');
    const albino = buildSheet({ speciesId: 'squalo_bianco', variant: 'albino' }, 5);
    expect(albino.special).toBe('albino');
    expect(albino.rarityName).toBe('Epica');
    const wild = buildSheet({ speciesId: 'barracuda', variant: 'comune' });
    expect(wild.levelLabel).toContain('in natura');
  });
});

describe('beasts in the sea are drawn', () => {
  it('every wild beast and every starter stage has a side picture (otherwise it would be invisible)', async () => {
    const { SPRITE_KEYS } = await import('../src/data/sprites.generated');
    const { neededSpriteKeys } = await import('../src/views/neededSprites');
    const loaded = neededSpriteKeys();
    const ids = [
      ...WILD_SPAWNS.map((s) => s.speciesId),
      ...SPECIES.filter((s) => s.starter || s.movesFrom).map((s) => s.id),
    ];
    for (const id of ids) {
      expect(SPRITE_KEYS, id).toContain(id);
      expect(loaded, id).toContain(id);
    }
  });
});

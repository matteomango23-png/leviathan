import { describe, expect, it } from 'vitest';
import { MOVES } from '../src/data/moves';
import { TAMING } from '../src/data/rules';
import { WILD_SPAWNS } from '../src/data/beasts';
import { moveDamage, moveTypeMult } from '../src/systems/beasts/combat';
import {
  WHITE_SHARK_FORMS,
  formKey,
  formLengthM,
  formName,
  formStars,
  type BeastForm,
} from '../src/systems/beasts/forms';
import { attemptTaming, gapFactor, startTaming, type TamingState } from '../src/systems/beasts/taming';
import {
  addTamed,
  isTameable,
  makeTeamBeast,
  movesFor,
  strongestLevel,
  toggleInTeam,
  type TeamBeast,
} from '../src/systems/beasts/team';
import { makeRng } from '../src/systems/math';

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

describe('taming minigame', () => {
  const hitNow = (s: TamingState) => {
    s.t = s.centre / s.speed; // needle exactly on the zone centre
  };
  const missNow = (s: TamingState) => {
    const far = s.centre > 0.5 ? 0 : 1;
    s.t = far / s.speed;
  };

  it('wins with three hits', () => {
    const rng = makeRng(1);
    const s = startTaming(1, 5, 5, rng);
    hitNow(s);
    expect(attemptTaming(s, rng)).toBe('hit');
    hitNow(s);
    expect(attemptTaming(s, rng)).toBe('hit');
    hitNow(s);
    expect(attemptTaming(s, rng)).toBe('win');
  });

  it('forgives three misses and loses on the fourth', () => {
    const rng = makeRng(2);
    const s = startTaming(1, 5, 5, rng);
    for (let i = 0; i < TAMING.missesAllowed; i++) {
      missNow(s);
      expect(attemptTaming(s, rng)).toBe('miss');
    }
    missNow(s);
    expect(attemptTaming(s, rng)).toBe('lose');
  });

  it('gets harder when the wild beast out-levels your strongest beast', () => {
    const rng = makeRng(3);
    const easy = startTaming(1, 5, 5, rng);
    const hard = startTaming(1, 20, 5, rng);
    expect(hard.width).toBeLessThan(easy.width);
    expect(hard.speed).toBeGreaterThan(easy.speed);
    expect(gapFactor(-10)).toBe(1);
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

  it('a duplicate of the common version is not tameable (it flees)', () => {
    const all: TeamBeast[] = [];
    expect(isTameable(all, shark())).toBe(true);
    tame(all, shark());
    expect(isTameable(all, shark())).toBe(false);
    expect(isTameable(all, shark({ variant: 'albino' }))).toBe(true);
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
  it('only spawns beasts that exist, in the bay', () => {
    expect(WILD_SPAWNS.map((s) => s.speciesId)).toEqual(['squalo_bianco']);
  });
});

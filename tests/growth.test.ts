import { describe, expect, it } from 'vitest';
import { PROGRESSION } from '../src/data/rules';
import { XP_RULES } from '../src/data/progression';
import type { GameEvent } from '../src/systems/events';
import { formLengthM } from '../src/systems/beasts/forms';
import {
  feedBeast,
  finalFormAt,
  gainXp,
  isHungry,
  raiseLevel,
  xpReward,
  xpToNext,
} from '../src/systems/beasts/growth';
import { makeTeamBeast, maxHpOf, movesFor } from '../src/systems/beasts/team';
import { createGame } from '../src/systems/game';
import { generateWorld } from '../src/systems/world/worldGen';
import { giveTestBeast } from '../src/systems/testTools';
import { parseSave, serializeSave } from '../src/systems/save/saveData';
import { toSave } from '../src/systems/game';
import { finishBattle } from '../src/systems/battleResult';
import { spawnWild } from '../src/systems/beasts/wildState';

const shark = (level: number) =>
  makeTeamBeast('b1', { speciesId: 'squalo_bianco', variant: 'comune' }, level, true);

describe('experience and levels', () => {
  it('levels up with enough experience and unlocks moves at 7 and 15', () => {
    const b = shark(6);
    const events: GameEvent[] = [];
    gainXp(b, xpToNext(b), events);
    expect(b.level).toBe(7);
    expect(events).toContainEqual({ type: 'levelUp', uid: 'b1', level: 7, move: 'Carica' });
    expect(movesFor(b).filter((m) => m.unlocked)).toHaveLength(2);
  });

  it('can gain several levels at once and keeps the leftover', () => {
    const b = shark(1);
    const need = xpToNext(b) + xpToNext({ ...b, level: 2 });
    gainXp(b, need + 5, []);
    expect(b.level).toBe(3);
    expect(b.xp).toBe(5);
  });

  it('keeps the same share of health when levelling up', () => {
    const b = shark(5);
    b.hp = maxHpOf(b) - 3;
    gainXp(b, xpToNext(b), []);
    expect(b.hp).toBeCloseTo(maxHpOf(b) - 3);
  });

  it('rewards stronger and rarer beasts more, Guardians most', () => {
    const common = xpReward({ speciesId: 'squalo_bianco', variant: 'comune' }, 5, 5);
    expect(xpReward({ speciesId: 'squalo_bianco', variant: 'comune' }, 8, 5)).toBeGreaterThan(common);
    expect(xpReward({ speciesId: 'squalo_bianco', variant: 'albino' }, 5, 5)).toBeCloseTo(
      common * XP_RULES.variantMult,
      -1,
    );
    expect(xpReward({ speciesId: 'squalo_bianco', variant: 'comune' }, 5, 5, true)).toBeCloseTo(
      common * XP_RULES.guardianMult,
      -1,
    );
  });
});

describe('growth 31–50 and final form', () => {
  it('from level 31 needs a full nourishment bar as well as experience', () => {
    const b = shark(30);
    gainXp(b, xpToNext(b) * 3, []);
    expect(b.level).toBe(30);
    expect(b.xp).toBe(xpToNext(b)); // full, waiting
    expect(isHungry(b)).toBe(true);
    const events: GameEvent[] = [];
    for (let i = 0; i < PROGRESSION.nourishmentPerGrowthLevel; i++) feedBeast(b, events);
    expect(b.level).toBe(31);
    expect(b.food).toBe(0);
    expect(events.some((e) => e.type === 'levelUp')).toBe(true);
  });

  it('does not eat when not growing', () => {
    const b = shark(10);
    expect(feedBeast(b, [])).toBe(false);
    expect(b.food).toBe(0);
  });

  it('grows 2% per level from 31', () => {
    const f = { speciesId: 'squalo_bianco', variant: 'comune' } as const;
    expect(formLengthM(f, 30)).toBe(6);
    expect(formLengthM(f, 35)).toBeCloseTo(6 * (1 + 5 * PROGRESSION.growthSizePerLevel));
  });

  it('reaches the final form at 50: Titano, Mega albino; never for the alfa', () => {
    const events: GameEvent[] = [];
    const b = shark(49);
    raiseLevel(b, 1, events);
    expect(b.form.final).toBe(true);
    expect(formLengthM(b.form, b.level)).toBe(9);
    expect(events).toContainEqual({ type: 'finalForm', uid: 'b1' });
    expect(finalFormAt({ speciesId: 'squalo_bianco', variant: 'albino' }, 50)?.final).toBe(true);
    expect(finalFormAt({ speciesId: 'squalo_bianco', variant: 'alfa' }, 50)).toBeNull();
    expect(finalFormAt({ speciesId: 'barracuda', variant: 'comune' }, 50)).toBeNull();
    expect(
      finalFormAt({ speciesId: 'squalo_bianco', variant: 'comune', unique: 'sfregiato' }, 50),
    ).toBeNull();
  });
});

describe('experience in play', () => {
  const battle = (over: 'won' | 'caught' | 'fled' | 'lost') => {
    const g = createGame(generateWorld(), null, 4);
    giveTestBeast(g, { speciesId: 'squalo_bianco', variant: 'comune' }, 10);
    giveTestBeast(g, { speciesId: 'barracuda', variant: 'comune' }, 3);
    const w = g.beasts.wilds[0]!;
    spawnWild(w, { speciesId: 'squalo_bianco', variant: 'comune' }, 4, 900, 200, 1);
    g.beasts.battle = { wildId: w.id, first: 'normal' };
    const [a, bench] = g.beasts.team;
    const events = finishBattle(g, {
      wildId: w.id,
      over,
      team: [
        { uid: a!.uid, hp: 3 },
        { uid: bench!.uid, hp: over === 'lost' ? 0 : 5 },
      ],
      lastActive: a!.uid,
      foe: { form: w.form, level: 4, hp: 2 },
    });
    return { g, a: a!, bench: bench!, w, events };
  };

  it('after a battle won: all the experience to the last fighter, a share to the bench', () => {
    const { g, a, bench, w } = battle('won');
    expect(a.xp).toBe(xpReward(w.form, 4, a.level));
    // the bench (level 3) gets half of its own share: enough here for a level
    const share = Math.floor(xpReward(w.form, 4, 3) * XP_RULES.benchShare);
    expect(bench.level).toBe(4);
    expect(bench.xp).toBe(share - xpToNext({ ...bench, level: 3 }));
    expect(a.hp).toBe(3);
    expect(w.motion).toBe('gone');
    expect(g.beasts.battle).toBeNull();
  });

  it('tamed: it joins the team with the health it had left', () => {
    const { g } = battle('caught');
    const t = g.beasts.team[2]!;
    expect(t.form.speciesId).toBe('squalo_bianco');
    expect(t.level).toBe(4);
    expect(t.hp).toBe(2);
  });

  it('fled: no experience, the beast leaves you alone for a while', () => {
    const { a, w } = battle('fled');
    expect(a.xp).toBe(0);
    expect(w.motion).toBe('roam');
    expect(w.calm).toBeGreaterThan(2);
  });

  it('lost: worn-out beasts are KO and the sea pushes you back', () => {
    const { bench, events } = battle('lost');
    expect(bench.ko).toBe(true);
    expect(events.some((e) => e.type === 'died')).toBe(true);
  });

  it('experience and nourishment are saved', () => {
    const g = createGame(generateWorld(), null, 4);
    giveTestBeast(g, { speciesId: 'squalo_bianco', variant: 'comune' }, 30);
    g.beasts.team[0]!.xp = 123;
    g.beasts.team[0]!.food = 3;
    const back = parseSave(serializeSave(toSave(g, new Date())));
    expect(back.team[0]).toMatchObject({ xp: 123, food: 3 });
  });

  it('a version 3 save gets empty experience bars', () => {
    const g = createGame(generateWorld(), null, 4);
    giveTestBeast(g, { speciesId: 'squalo_bianco', variant: 'comune' }, 5);
    const s = JSON.parse(serializeSave(toSave(g, new Date()))) as Record<string, unknown>;
    s.version = 3;
    for (const b of s.team as Record<string, unknown>[]) {
      delete b.xp;
      delete b.food;
    }
    expect(parseSave(JSON.stringify(s)).team[0]).toMatchObject({ xp: 0, food: 0, level: 5 });
  });
});

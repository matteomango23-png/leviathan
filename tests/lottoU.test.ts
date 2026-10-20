// Lot U (20 ottobre 2026): on its back. The diver sits on the back, never on the dorsal fin; who can be ridden; the
// third forms big in the sea; no beast too small next to a giant in battle; every profile checked for its facing.
import { describe, expect, it } from 'vitest';
import { BATTLE_STAGE } from '../src/data/battle';
import { PROFILE_FACING_CHECKED } from '../src/data/battleFacing';
import { TEAM_RULES } from '../src/data/beasts';
import { BODY_BACKS, BODY_SHAPES } from '../src/data/bodyShapes.generated';
import { BATTLE_ART_BOX, SPRITE_KEYS } from '../src/data/sprites.generated';
import { battleSizes, isGiant, seenPresence, type StageBeast } from '../src/systems/battle/stage';
import { riderSeat } from '../src/systems/beasts/combat';
import { formLengthM, type BeastForm } from '../src/systems/beasts/forms';
import { makeTeamBeast } from '../src/systems/beasts/team';
import { canRide } from '../src/systems/beastPlay';
import { battleArt } from '../src/views/battle/beastArt';

describe('the seat: on the back, never on the dorsal fin (owner: "deve essere attaccato al corpo")', () => {
  const finned = [
    'squalo_bianco',
    'squalo_bianco_alfa',
    'squalo_bianco_alfa_finale',
    'zannarossa',
    'orca_matriarca',
    'orca_matriarca_finale',
    'squalo_martello_preistorico',
    'squalo_elefante',
    'megattera_finale',
  ];
  for (const key of finned)
    it(key, () => {
      const shape = BODY_SHAPES[key]!;
      const back = BODY_BACKS[key]!;
      const pose = { x: 0, y: 0, face: 1 as const, pitch: 0, length: 1, shape };
      const [, onFin] = riderSeat(pose, TEAM_RULES.riderOffset[0], TEAM_RULES.riderOffset[1]);
      const [, onBack] = riderSeat(pose, TEAM_RULES.riderOffset[0], TEAM_RULES.riderOffset[1], back);
      expect(onBack).toBeGreaterThanOrEqual(onFin); // lower or the same (up is negative)
      // and still on the body: never under the spine
      expect(onBack).toBeLessThan(0);
    });

  it('the white shark: clearly lower than the tip of its fin', () => {
    const shape = BODY_SHAPES.squalo_bianco_alfa_finale!;
    const pose = { x: 0, y: 0, face: 1 as const, pitch: 0, length: 1, shape };
    const [, onFin] = riderSeat(pose, TEAM_RULES.riderOffset[0], TEAM_RULES.riderOffset[1]);
    const [, onBack] = riderSeat(
      pose,
      TEAM_RULES.riderOffset[0],
      TEAM_RULES.riderOffset[1],
      BODY_BACKS.squalo_bianco_alfa_finale,
    );
    expect(onBack - onFin).toBeGreaterThan(0.05);
  });
});

describe('who can be ridden (owner, 20 ottobre)', () => {
  const ride = (form: BeastForm) => canRide(makeTeamBeast('t', form, 50, true));
  it("the Varano d'osso, the armoured swordfish and the prehistoric turtle: yes", () => {
    expect(ride({ speciesId: 'varano_nilo', variant: 'albino', final: true })).toBe(true);
    expect(ride({ speciesId: 'pesce_spada', variant: 'comune', final: true })).toBe(true);
    expect(ride({ speciesId: 'tartaruga_marina', variant: 'comune', unique: 'tartaruga_preistorica' })).toBe(
      true,
    );
  });
  it('the sailfish and the giant octopus: no; the small ones of their species neither', () => {
    expect(ride({ speciesId: 'pesce_vela', variant: 'comune' })).toBe(false);
    expect(ride({ speciesId: 'polpo_gigante', variant: 'comune' })).toBe(false);
    expect(ride({ speciesId: 'varano_nilo', variant: 'albino' })).toBe(false);
    expect(ride({ speciesId: 'pesce_spada', variant: 'comune' })).toBe(false);
  });
});

describe('the third forms are big in the sea', () => {
  it("Archelon 14 m, the leatherback 3 m, the Varano d'osso 8,75 m", () => {
    expect(formLengthM({ speciesId: 'archelon', variant: 'comune' })).toBeCloseTo(14);
    expect(formLengthM({ speciesId: 'tartaruga_liuto', variant: 'comune' })).toBeCloseTo(3);
    expect(formLengthM({ speciesId: 'varano_nilo', variant: 'albino', final: true })).toBeCloseTo(8.75);
  });
});

describe('in battle no beast is lost next to a giant (owner: Moby Dick against a pufferfish)', () => {
  const stage = (form: BeastForm, side: 'you' | 'foe'): StageBeast => {
    const art = battleArt(form, side);
    const key = art.textureKey.replace(/^battle-/, '');
    return {
      lengthM: formLengthM(form, 30),
      giant: isGiant(form),
      pictureMult: BATTLE_STAGE.framePictureMult[key] ?? BATTLE_STAGE.pictureMult[form.speciesId],
      box: art.own ? BATTLE_ART_BOX[key] : undefined,
    };
  };
  const moby: BeastForm = { speciesId: 'capodoglio', variant: 'comune', final: true };
  const palla: BeastForm = { speciesId: 'pesce_palla', variant: 'comune' };
  for (const [a, b] of [
    [moby, palla],
    [palla, moby],
  ] as const)
    it(`yours ${a.speciesId}, the wild ${b.speciesId}`, () => {
      for (const aspect of [844 / 390, 667 / 375, 1024 / 768]) {
        const you = stage(a, 'you');
        const foe = stage(b, 'foe');
        const s = battleSizes(you, foe, aspect);
        const sy = seenPresence('you', you, s.you, aspect);
        const sf = seenPresence('foe', foe, s.foe, aspect);
        expect(Math.max(sy, sf) / Math.min(sy, sf)).toBeLessThanOrEqual(
          BATTLE_STAGE.size.maxSeenRatio * 1.01,
        );
        expect(you.lengthM > foe.lengthM ? sy > sf : sf > sy).toBe(true); // the giant still the bigger
      }
    });
});

describe('the side profiles face the right way (head on the right)', () => {
  it('every profile has been checked by eye (data/battleFacing.ts)', () => {
    expect(SPRITE_KEYS.filter((k) => !PROFILE_FACING_CHECKED.includes(k))).toEqual([]);
  });
});

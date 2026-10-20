// Lot T (20 ottobre 2026): the battle. Two beasts in proportion to their lengths, measured by what is in view; the
// same form never looks bigger as the wild one; every battle picture checked for the way it faces.
import { describe, expect, it } from 'vitest';
import { BATTLE_STAGE } from '../src/data/battle';
import { BATTLE_FACING_CHECKED } from '../src/data/battleFacing';
import { SPECIES } from '../src/data/species';
import { BATTLE_ART_BOX, BATTLE_ART_KEYS } from '../src/data/sprites.generated';
import type { Side } from '../src/systems/battle/battle';
import {
  battleSizes,
  cardBox,
  isGiant,
  placePicture,
  seenPresence,
  type StageBeast,
} from '../src/systems/battle/stage';
import { finalFormLevelOf, formLengthM, hasFinalForm, type BeastForm } from '../src/systems/beasts/forms';
import { buildSheet } from '../src/systems/beasts/sheet';
import { battleArt } from '../src/views/battle/beastArt';

const SCREENS = [
  { name: 'iPhone grande', aspect: 844 / 390 },
  { name: 'iPhone piccolo', aspect: 667 / 375 },
  { name: 'iPad', aspect: 1024 / 768 },
];

/** A beast on stage as the battle view makes it (views/battleView.ts setFighter). */
function stage(form: BeastForm, side: Side, level = 20): StageBeast {
  const art = battleArt(form, side);
  const key = art.textureKey.replace(/^battle-/, '');
  return {
    lengthM: formLengthM(form, level),
    giant: isGiant(form),
    pictureMult: BATTLE_STAGE.framePictureMult[key] ?? BATTLE_STAGE.pictureMult[form.speciesId],
    box: art.own ? BATTLE_ART_BOX[key] : undefined,
  };
}

const pictured = SPECIES.filter((s) => BATTLE_ART_KEYS.includes(`${s.id}_front`)).map((s): BeastForm => ({
  speciesId: s.id,
  variant: 'comune',
}));

describe('the same form on both sides (owner: "il nemico sembra molto più grosso")', () => {
  for (const form of pictured)
    it(`${form.speciesId}: yours looks at least as big as the wild one`, () => {
      for (const { name, aspect } of SCREENS) {
        const you = stage(form, 'you');
        const foe = stage(form, 'foe');
        const s = battleSizes(you, foe, aspect);
        const seenYou = seenPresence('you', you, s.you, aspect);
        const seenFoe = seenPresence('foe', foe, s.foe, aspect);
        expect(seenYou, name).toBeGreaterThanOrEqual(seenFoe * 0.99);
      }
    });
});

describe('a longer beast looks bigger', () => {
  const titano: BeastForm = { speciesId: 'squalo_bianco', variant: 'comune', final: true };
  const bianco: BeastForm = { speciesId: 'squalo_bianco', variant: 'comune' };
  const pairs: [BeastForm, BeastForm][] = [
    [titano, bianco], // your Titano and a wild white shark (owner, 20 ottobre)
    [bianco, titano],
    [
      { speciesId: 'folgore', variant: 'comune' },
      { speciesId: 'saetta', variant: 'comune' },
    ],
    [
      { speciesId: 'mosasauro', variant: 'comune' },
      { speciesId: 'pesce_palla', variant: 'comune' },
    ],
    [
      { speciesId: 'guscio', variant: 'comune' },
      { speciesId: 'megalodonte', variant: 'comune' },
    ],
  ];
  for (const [mine, wild] of pairs)
    it(`yours ${mine.speciesId}${mine.final ? ' (finale)' : ''} against ${wild.speciesId}${wild.final ? ' (finale)' : ''}`, () => {
      for (const { name, aspect } of SCREENS) {
        const you = stage(mine, 'you');
        const foe = stage(wild, 'foe');
        const s = battleSizes(you, foe, aspect);
        const seenYou = seenPresence('you', you, s.you, aspect);
        const seenFoe = seenPresence('foe', foe, s.foe, aspect);
        if (you.lengthM > foe.lengthM) expect(seenYou, name).toBeGreaterThan(seenFoe);
        else expect(seenFoe, name).toBeGreaterThan(seenYou);
        expect(Math.min(seenYou, seenFoe), `${name}: still readable`).toBeGreaterThanOrEqual(
          BATTLE_STAGE.size.minSeen * 0.99,
        );
      }
    });
});

describe('the two never overlap', () => {
  it('yours ends left of youRight, the wild one starts right of foeLeft, whatever the pair', () => {
    const P = BATTLE_STAGE.picture;
    for (const { aspect } of SCREENS)
      for (const a of pictured)
        for (const b of [pictured[0]!, pictured[pictured.length - 1]!, a]) {
          const you = stage(a, 'you');
          const foe = stage(b, 'foe');
          const s = battleSizes(you, foe, aspect);
          const by = you.box ?? cardBox();
          const bf = foe.box ?? cardBox();
          const py = placePicture('you', s.you, aspect, 1, by);
          const pf = placePicture('foe', s.foe, aspect, 1, bf);
          const youRight = py.x + (by[2] - P.square / 2) * py.scale;
          const foeLeft = pf.x + (bf[0] - P.square / 2) * pf.scale;
          expect(youRight, `${a.speciesId} vs ${b.speciesId}`).toBeLessThan(foeLeft);
        }
  });
});

describe('the way they face (owner: "queste cose non devono succedere più")', () => {
  it('every battle picture has been checked by eye (data/battleFacing.ts)', () => {
    const missing = BATTLE_ART_KEYS.filter((k) => !BATTLE_FACING_CHECKED.includes(k));
    expect(missing).toEqual([]);
  });
});

describe('the sheet shows the final form (owner: only a dark ball for the hammerhead)', () => {
  it('its name and the level it comes at, after the beast itself', () => {
    const sheet = buildSheet({ speciesId: 'squalo_martello', variant: 'comune' }, 20);
    expect(sheet.evolution.map((e) => e.name)).toEqual(['Squalo martello', 'Squalo martello del Tuono']);
    expect(sheet.evolution[1]!.level).toBe(finalFormLevelOf('squalo_martello'));
    expect(sheet.evolution[0]!.current).toBe(true);
  });

  it('a starter line ends with its final form if it has one; a beast that never changes has no line', () => {
    const zanna = buildSheet({ speciesId: 'zanna', variant: 'comune' }, 10).evolution.map((e) => e.name);
    expect(zanna.slice(0, 3)).toEqual(['Zanna', 'Squarcio', 'Zannarossa']);
    const plain = SPECIES.find((x) => !hasFinalForm(x.id, 'comune') && !x.evolvesTo && !x.movesFrom)!;
    expect(buildSheet({ speciesId: plain.id, variant: 'comune' }, 10).evolution).toEqual([]);
  });
});

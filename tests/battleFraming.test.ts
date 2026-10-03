// Every beast must be well framed in battle, as the wild one and as yours, on a phone and on a tablet in
// landscape, at every size it can have (level 1 to its final form): whole on screen, and never too small
// (owner, 3 ottobre: "deve essere tutto bene visibile… senza uscire dallo schermo").
import { describe, expect, it } from 'vitest';
import { BATTLE_STAGE } from '../src/data/battle';
import { PROGRESSION } from '../src/data/rules';
import { SPECIES, UNIQUE_VARIANTS } from '../src/data/species';
import { BATTLE_ART_BOX } from '../src/data/sprites.generated';
import type { Side } from '../src/systems/battle/battle';
import { battleSize, cardBox, isGiant, placePicture, type StageBeast } from '../src/systems/battle/stage';
import { formKey, formLengthM, type BeastForm } from '../src/systems/beasts/forms';
import { battleArt } from '../src/views/battle/beastArt';

const SCREENS = [
  { name: 'iPhone', w: 844, h: 390 },
  { name: 'iPad', w: 1024, h: 768 },
];
const BOB = 0.012; // the beasts bob up and down by this share of the screen height
const MIN_LONGEST = 0.28; // the drawn beast's longest side, at least this share of the screen height

function allForms(): BeastForm[] {
  const out: BeastForm[] = [];
  for (const s of SPECIES)
    for (const variant of ['comune', 'albino', 'alfa'] as const)
      for (const final of [false, true]) out.push({ speciesId: s.id, variant, final });
  for (const u of UNIQUE_VARIANTS) out.push({ speciesId: u.speciesId, variant: 'comune', unique: u.id });
  return out;
}

/** The beast's opaque box on screen, in pixels. */
function onScreen(side: Side, form: BeastForm, level: number, w: number, h: number) {
  const art = battleArt(form, side);
  const box = art.own ? BATTLE_ART_BOX[art.textureKey.replace(/^battle-/, '')] : undefined;
  const beast: StageBeast = { lengthM: formLengthM(form, level), giant: isGiant(form), box };
  const size = battleSize(side, beast, w / h);
  const b = box ?? cardBox();
  const p = placePicture(side, size, w, h, b);
  const P = BATTLE_STAGE.picture;
  return {
    size,
    left: p.x + (b[0] - P.square / 2) * p.scale,
    right: p.x + (b[2] - P.square / 2) * p.scale,
    top: p.y + (b[1] - P.foot) * p.scale,
    bottom: p.y + (Math.min(b[3], P.foot) - P.foot) * p.scale,
  };
}

describe('battle framing', () => {
  for (const form of allForms())
    for (const side of ['foe', 'you'] as Side[])
      it(`${formKey(form)} as ${side === 'foe' ? 'the wild beast' : 'yours'}`, () => {
        const levels = form.final ? [PROGRESSION.finalFormLevel] : [1, PROGRESSION.finalFormLevel - 1];
        for (const screen of SCREENS)
          for (const level of levels) {
            const r = onScreen(side, form, level, screen.w, screen.h);
            const at = `${screen.name}, level ${level}`;
            const bob = BOB * screen.h;
            expect(r.left, `${at}: left edge`).toBeGreaterThanOrEqual(0);
            expect(r.right, `${at}: right edge`).toBeLessThanOrEqual(screen.w);
            expect(r.top - bob, `${at}: top edge`).toBeGreaterThanOrEqual(0);
            expect(r.bottom - bob, `${at}: bottom edge`).toBeLessThanOrEqual(screen.h);
            const longest = Math.max(r.right - r.left, r.bottom - r.top);
            expect(longest, `${at}: big enough`).toBeGreaterThanOrEqual(MIN_LONGEST * screen.h);
          }
      });
});

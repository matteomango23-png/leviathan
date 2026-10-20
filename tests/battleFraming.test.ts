// Every beast must be well framed in battle, as the wild one and as yours, on a phone and on a tablet in
// landscape, at every size it can have (level 1 to its final form), never too small (owner, 3 ottobre). The wild one
// in its half with its head in view (a giant's tail may leave the screen: owner, 20 ottobre); yours with its head
// and back above its name box (20 ottobre: "coperto dalla scritta").
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
  { name: 'iPhone', w: 844, h: 390, minLongest: 0.28 },
  { name: 'iPad', w: 1024, h: 768, minLongest: 0.25 }, // narrower: less room on each side of the gap
];
const BOB = 0.012; // the beasts bob up and down by this share of the screen height

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
  const pw = (b[2] - b[0]) * p.scale;
  const ph = (Math.min(b[3], P.foot) - b[1]) * p.scale;
  return {
    size,
    area: pw * ph,
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
        const levels = form.final ? [PROGRESSION.maxLevel] : [1, PROGRESSION.maxLevel - 1];
        for (const screen of SCREENS)
          for (const level of levels) {
            const r = onScreen(side, form, level, screen.w, screen.h);
            const at = `${screen.name}, level ${level}`;
            const bob = BOB * screen.h;
            const F = BATTLE_STAGE.fit;
            if (side === 'you') expect(r.top - bob, `${at}: top edge`).toBeGreaterThanOrEqual(0); // (the wild one may leave the top)
            const width = r.right - r.left;
            const height = r.bottom - r.top;
            if (side === 'foe') {
              // the wild one: in its half (its head, on the left, never past foeLeft), at most a little of it out
              // on the right and at the bottom
              expect(r.left, `${at}: left edge`).toBeGreaterThanOrEqual(F.foeLeft * screen.w - 1);
              const inW = (Math.min(r.right, screen.w) - r.left) / width;
              expect(inW, `${at}: width in view`).toBeGreaterThanOrEqual(F.foeKeepW - 0.01);
              // never down behind the commands' menu, at most a little of it out at the top (owner, 20 ottobre)
              expect(r.bottom, `${at}: above the commands`).toBeLessThanOrEqual(F.foeLowest * screen.h + 1);
              const inH = (r.bottom - Math.max(0, r.top)) / height;
              expect(inH, `${at}: height in view`).toBeGreaterThanOrEqual(F.foeKeepH - 0.01);
            } else {
              // yours, like Pokémon: in its half, under the wild one's name box, its head and back above its own
              expect(r.right, `${at}: right edge`).toBeLessThanOrEqual(F.youRight * screen.w + 1);
              expect(r.top, `${at}: top`).toBeGreaterThanOrEqual(F.youTop * screen.h - 1);
              const above = F.youBoxTop * screen.h - r.top;
              const want = Math.min(F.youShowAbove * height, (F.youBoxTop - F.youTop) * screen.h);
              expect(above, `${at}: above its name box`).toBeGreaterThanOrEqual(want - 1);
            }
            const longest = Math.max(r.right - r.left, r.bottom - r.top);
            expect(longest, `${at}: big enough`).toBeGreaterThanOrEqual(screen.minLongest * screen.h);
          }
      });
});

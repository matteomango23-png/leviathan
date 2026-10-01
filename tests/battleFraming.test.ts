// Every beast must be well framed in battle, as the wild one and as yours, on an iPhone in landscape, at the
// biggest size it can have: a huge one may leave the screen a little, but never its head or most of its body.
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { BATTLE_STAGE } from '../src/data/battle';
import { SPECIES, UNIQUE_VARIANTS } from '../src/data/species';
import { BATTLE_ART_KEYS } from '../src/data/sprites.generated';
import type { Side } from '../src/systems/battle/battle';
import { isGiant, placePicture } from '../src/systems/battle/stage';
import { formKey, type BeastForm } from '../src/systems/beasts/forms';

const SCREEN = { w: 844, h: 390 }; // iPhone 14 in landscape (CSS pixels): the narrowest height we support
const MIN_VISIBLE = 0.85; // share of the beast that must be on screen
const MAX_TOP_CUT = 0.12; // share of its height that may go above the top (heads are often up there)

/** All the forms the game knows, to tell giants from the others by their picture's name. */
function allForms(): BeastForm[] {
  const out: BeastForm[] = [];
  for (const s of SPECIES)
    for (const variant of ['comune', 'albino', 'alfa'] as const)
      for (const final of [false, true]) out.push({ speciesId: s.id, variant, final });
  for (const u of UNIQUE_VARIANTS) out.push({ speciesId: u.speciesId, variant: 'comune', unique: u.id });
  return out;
}

/** The biggest share of the screen height a beast can take on this side. */
function worstSize(side: Side, giant: boolean): number {
  const S = BATTLE_STAGE.size;
  const own = giant ? S.giant : S.standard;
  return side === 'foe' ? own * S.foeDistance : Math.min(S.max, own * S.youCloser);
}

async function framing(key: string, side: Side) {
  const base = key.replace(/_(front|back)$/, '');
  const form = allForms().find((f) => formKey(f) === base);
  const giant = form ? isGiant(form) : true; // pictures of beasts not in the data yet: assume a legendary
  const { data, info } = await sharp(`public/sprites/${key}.webp`)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const P = BATTLE_STAGE.picture;
  const p = placePicture(side, worstSize(side, giant), SCREEN.w, SCREEN.h);
  const left = p.x - (P.square / 2) * p.scale;
  const top = p.y - P.foot * p.scale;
  let all = 0;
  let inside = 0;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let y = 0; y < info.height; y += 2)
    for (let x = 0; x < info.width; x += 2) {
      if (data[(y * info.width + x) * 4 + 3]! < 64) continue;
      all++;
      const sx = left + x * p.scale;
      const sy = top + y * p.scale;
      if (sx >= 0 && sx < SCREEN.w && sy >= 0 && sy < SCREEN.h) inside++;
      y0 = Math.min(y0, sy);
      y1 = Math.max(y1, sy);
    }
  return { visible: inside / all, topCut: Math.max(0, -y0) / (y1 - y0), giant };
}

describe('battle framing on an iPhone', () => {
  for (const key of BATTLE_ART_KEYS.filter((k) => /_(front|back)$/.test(k))) {
    const side: Side = key.endsWith('_front') ? 'foe' : 'you';
    it(`${key} as ${side === 'foe' ? 'the wild beast' : 'yours'}`, async () => {
      const f = await framing(key, side);
      expect(f.visible, `${key}: on screen`).toBeGreaterThanOrEqual(MIN_VISIBLE);
      expect(f.topCut, `${key}: cut at the top`).toBeLessThanOrEqual(MAX_TOP_CUT);
    });
  }
});

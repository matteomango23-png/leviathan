// npm run shapes — reads every beast profile in public/sprites/ (1000×460, body line at y=250, head on the right)
// and writes how far the body reaches above and below its spine at a few points from head to tail, as shares of
// the length, to src/data/bodyShapes.generated.ts. The game uses them for collisions against rock, the submarine and
// other beasts (owner, 4 ottobre: the bigger the beast, the more it sank into the rock). Run after `npm run art`.
import { readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const DIR = 'public/sprites';
const OUT = 'src/data/bodyShapes.generated.ts';
const W = 1000;
const H = 460;
const SPINE = 250;
const POINTS = 9; // samples from head (u = 0) to tail (u = 1)
const ALPHA = 128;
const BAND = 12; // columns around each sample (px): the widest reach among them counts
/** The back (where a rider sits): the top of the columns in a wider band, not the highest one but a low share of
 *  them, so a thin dorsal fin rising from the back is left out (owner, 20 ottobre: "il sub sopra la pinna"). */
const BACK_BAND = 130;
const BACK_SHARE = 0.75;

/** For each sample point, the height of the back above the spine (a share of the length, negative), fins left out. */
function backOf(data: Buffer): number[] {
  const out: number[] = [];
  for (let k = 0; k < POINTS; k++) {
    const u = (k + 0.5) / POINTS;
    const cx = Math.round(W * (1 - u));
    const tops: number[] = [];
    for (let x = Math.max(0, cx - BACK_BAND); x <= Math.min(W - 1, cx + BACK_BAND); x++)
      for (let y = 0; y < H; y++)
        if (data[(y * W + x) * 4 + 3]! >= ALPHA) {
          tops.push(y);
          break;
        }
    tops.sort((a, b) => a - b);
    const top = tops.length ? tops[Math.min(tops.length - 1, Math.floor(tops.length * BACK_SHARE))]! : SPINE;
    out.push(Math.round(((Math.min(top, SPINE) - SPINE) / W) * 1000) / 1000);
  }
  return out;
}

async function shapeOf(file: string): Promise<[number, number][] | null> {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== W || info.height !== H) return null;
  const out: [number, number][] = [];
  for (let k = 0; k < POINTS; k++) {
    const u = (k + 0.5) / POINTS;
    const cx = Math.round(W * (1 - u)); // the head is on the right
    let top = SPINE;
    let bottom = SPINE;
    for (let x = Math.max(0, cx - BAND); x <= Math.min(W - 1, cx + BAND); x++)
      for (let y = 0; y < H; y++) {
        if (data[(y * W + x) * 4 + 3]! < ALPHA) continue;
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    const r = (v: number): number => Math.round(((v - SPINE) / W) * 1000) / 1000;
    out.push([r(top), r(bottom)]);
  }
  return out;
}

const files = (await readdir(DIR)).filter((f) => f.endsWith('.webp') && !/_(open|front|back)\.webp$/.test(f));
const lines: string[] = [];
const backs: string[] = [];
for (const f of files.sort()) {
  const shape = await shapeOf(join(DIR, f));
  if (!shape) continue;
  lines.push(`  ${f.replace('.webp', '')}: ${JSON.stringify(shape)},`);
  const { data } = await sharp(join(DIR, f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  backs.push(`  ${f.replace('.webp', '')}: ${JSON.stringify(backOf(data))},`);
}
await writeFile(
  OUT,
  `// Written by \`npm run shapes\` (scripts/body-shapes.ts) from the profiles in public/sprites/: do not edit.
// For each profile, ${POINTS} points from head to tail: how far the body reaches above (negative) and below the
// spine, as shares of the length.
export const BODY_SHAPE_POINTS = ${POINTS};
export const BODY_SHAPES: Readonly<Record<string, readonly (readonly [number, number])[]>> = {
${lines.join('\n')}
};

// The back at the same points, fins left out: where a rider sits (systems/beasts/combat.ts riderSeat).
export const BODY_BACKS: Readonly<Record<string, readonly number[]>> = {
${backs.join('\n')}
};
`,
);
console.log(`${lines.length} profili → ${OUT}`);

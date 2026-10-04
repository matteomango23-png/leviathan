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
for (const f of files.sort()) {
  const shape = await shapeOf(join(DIR, f));
  if (shape) lines.push(`  ${f.replace('.webp', '')}: ${JSON.stringify(shape)},`);
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
`,
);
console.log(`${lines.length} profili → ${OUT}`);

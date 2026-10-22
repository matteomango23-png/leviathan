// The glow pictures (data/glow.ts): from each picture of a glowing beast in public/sprites, only its pixels of the
// glowing colour, softly blurred, into public/glow/ with the same name and frame. Run by `npm run art` after the
// pictures are made (so it always matches them).
import { mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { GLOW, GLOW_ART, type GlowDef } from '../../src/data/glow.ts';

const SUFFIXES = ['', '_open', '_front', '_back', '_front_open', '_back_open'];

/** Hue (degrees), saturation and value (0 … 1) of an RGB pixel. */
function hsv(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max ? d / max : 0, max / 255];
}

/** How much a pixel glows (0 … 1): inside the colour range, soft at its edges. */
export function glowShare(r: number, g: number, b: number, def: GlowDef): number {
  const [h, s, v] = hsv(r, g, b);
  if (h < def.hue[0] || h > def.hue[1]) return 0;
  const ks = Math.min(1, Math.max(0, (s - def.minSat) / 0.15));
  const kv = Math.min(1, Math.max(0, (v - def.minVal) / 0.15));
  return ks * kv;
}

async function makeGlow(src: string, dest: string, def: GlowDef): Promise<number> {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const out = Buffer.alloc(w * h * 4);
  let lit = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const k = glowShare(data[i]!, data[i + 1]!, data[i + 2]!, def) * (data[i + 3]! / 255);
      if (k <= 0) continue;
      lit++;
      // its own colour, lifted towards white at the core
      for (let c = 0; c < 3; c++) out[i + c] = Math.min(255, Math.round(data[i + c]! * 0.5 + 140));
      out[i + 3] = Math.round(k * 255);
    }
  const core = await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toBuffer();
  const blur = Math.max(1, (GLOW_ART.blur * w) / 1000);
  const halo = await sharp(core).blur(blur).linear(GLOW_ART.spill, 0).png().toBuffer();
  await sharp(halo)
    .composite([{ input: core, blend: 'over' }])
    .webp({ quality: 82 })
    .toFile(dest);
  return lit;
}

/** Makes every glow picture; returns lines to print. */
export async function makeGlows(root = 'public'): Promise<string[]> {
  const dir = join(root, 'glow');
  await mkdir(dir, { recursive: true });
  const have = new Set(await readdir(join(root, 'sprites')));
  const lines: string[] = [];
  for (const [key, def] of Object.entries(GLOW))
    for (const suf of SUFFIXES) {
      const name = `${key}${suf}.webp`;
      if (!have.has(name)) continue;
      const lit = await makeGlow(join(root, 'sprites', name), join(dir, name), def);
      lines.push(`✦ ${name} → ${dir} (${lit} px di luce)`);
    }
  return lines;
}

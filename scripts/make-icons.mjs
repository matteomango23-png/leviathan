// Creates the app icons from the great white shark illustration (placeholder until a dedicated icon exists).
// Usage: npm run icons  →  public/icons/*.png
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const SRC = 'public/art/squalo_bianco.webp';
const OUT = 'public/icons';
const CROP = { left: 200, top: 215, width: 440, height: 440 }; // the shark's head in the 640×960 card
const BG = { r: 2, g: 7, b: 12, alpha: 1 };

await mkdir(OUT, { recursive: true });
const head = sharp(SRC).extract(CROP);

for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  await head.clone().resize(size, size).flatten({ background: BG }).png().toFile(`${OUT}/${name}`);
}

// Maskable: Android may cut the corners, keep the head inside the central 80%.
const inner = Math.round(512 * 0.8);
const pad = Math.round((512 - inner) / 2);
await head
  .clone()
  .resize(inner, inner)
  .extend({ top: pad, bottom: 512 - inner - pad, left: pad, right: 512 - inner - pad, background: BG })
  .flatten({ background: BG })
  .png()
  .toFile(`${OUT}/maskable-512.png`);

console.log('Icone create in', OUT);

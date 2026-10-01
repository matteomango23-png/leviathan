// `npm run art`, battle extras (docs/PROMPT-BATTAGLIA.md):
//   bg_<place>_far.jpg                 → public/bg/<place>_far.webp     (whole picture, 1920 wide)
//   bg_<place>_mid|front|ground.jpg    → public/bg/<place>_<layer>.webp (green background removed)
//   conchiglia.jpg, conchiglia_aperta  → public/items/<name>.webp       (black removed, 512×512)
//   icona_<name>.jpg, tipo_<name>.jpg  → public/ui/<name>.webp          (white icon, 160×160, tinted in game)
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import {
  borderColor,
  iconFromBlack,
  opaqueBox,
  removeDarkBackground,
  removeGreenBackground,
  type ExtraName,
  type Raw,
} from './cutout.ts';

export function extraDest(outRoot: string, e: ExtraName): string {
  if (e.kind === 'bg') return join(outRoot, 'bg', `${e.place}_${e.layer}.webp`);
  if (e.kind === 'item') return join(outRoot, 'items', `${e.id}.webp`);
  return join(outRoot, 'ui', `${e.id}.webp`);
}

async function raw(src: string, maxW: number): Promise<Raw> {
  const { data, info } = await sharp(src)
    .resize({ width: maxW, withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** The cut-out pixels cropped to what is visible, as a PNG buffer. */
async function cropped(pixels: Uint8ClampedArray, img: Raw): Promise<{ png: Buffer; w: number; h: number }> {
  const box = opaqueBox(pixels, img.width, img.height) ?? {
    x0: 0,
    y0: 0,
    x1: img.width - 1,
    y1: img.height - 1,
  };
  const w = box.x1 - box.x0 + 1;
  const h = box.y1 - box.y0 + 1;
  const png = await sharp(Buffer.from(pixels.buffer), {
    raw: { width: img.width, height: img.height, channels: 4 },
  })
    .extract({ left: box.x0, top: box.y0, width: w, height: h })
    .png()
    .toBuffer();
  return { png, w, h };
}

export async function makeExtra(src: string, dest: string, e: ExtraName): Promise<string> {
  await mkdir(join(dest, '..'), { recursive: true });
  const webp = { quality: 84, alphaQuality: 90, effort: 5 };
  if (e.kind === 'bg' && e.layer === 'far') {
    await sharp(src).resize({ width: 1920, withoutEnlargement: true }).webp(webp).toFile(dest);
    return 'sfondo intero';
  }
  if (e.kind === 'bg') {
    const img = await raw(src, 1920);
    const cut = removeGreenBackground(img);
    if (e.layer === 'ground') {
      const c = await cropped(cut, img);
      await sharp(c.png).webp(webp).toFile(dest);
      return `pedana ${c.w}×${c.h}`;
    }
    await sharp(Buffer.from(cut.buffer), { raw: { width: img.width, height: img.height, channels: 4 } })
      .webp(webp)
      .toFile(dest);
    return `strato ${img.width}×${img.height}, verde tolto`;
  }
  if (e.kind === 'item') {
    const img = await raw(src, 1400);
    const cut = removeDarkBackground(img, borderColor(img), 4, { low: 4, high: 18, soft: 34 });
    const c = await cropped(cut, img);
    const s = 480 / Math.max(c.w, c.h);
    const body = await sharp(c.png)
      .resize(Math.round(c.w * s), Math.round(c.h * s))
      .toBuffer();
    await sharp({
      create: { width: 512, height: 512, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: body, gravity: 'center' }])
      .webp(webp)
      .toFile(dest);
    return 'oggetto 512×512';
  }
  const img = await raw(src, 800);
  const c = await cropped(iconFromBlack(img), img);
  await sharp(c.png)
    .resize(144, 144, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .extend({ top: 8, bottom: 8, left: 8, right: 8, background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .webp(webp)
    .toFile(dest);
  return 'icona 160×160';
}

// npm run art — turns the images in art-inbox/ into game-ready files.
//   <id>_card.jpg      → public/art/<id>.webp            (vertical illustration, 2:3, 640×960)
//   <id>_side.jpg      → public/sprites/<id>.webp        (profile, black removed, 1000×460, body line y=250)
//   <id>_side_open.jpg → public/sprites/<id>_open.webp   (same, mouth open)
//   <id>_front.jpg, <id>_back.jpg (+ _open) → public/sprites/<id>_front.webp … (battle, three-quarter, 800×800)
// Originals in art-inbox/ are never modified or deleted.
// Options: --force (overwrite existing files), --only=<id>, --out=<folder> (write elsewhere, for checks).
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import {
  bodyLine,
  coverCrop,
  opaqueBox,
  parseInboxName,
  placeProfile,
  removeBlackBackground,
} from './art/cutout.ts';

const INBOX = 'art-inbox';
const FRAME = { w: 1000, h: 460, lineY: 250 };
const CARD = { w: 640, h: 960 };
const BATTLE_PIC = 800; // three-quarter battle pictures: a square
const MARGIN = 4; // px of transparent border kept around the cut-out before scaling

const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.find((a) => a.startsWith('--only='))?.slice(7);
const outRoot = args.find((a) => a.startsWith('--out='))?.slice(6) ?? 'public';

async function knownIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  for (const f of ['src/data/species.ts']) {
    const text = await readFile(f, 'utf8');
    for (const m of text.matchAll(/id: '([a-z0-9_]+)'/g)) ids.add(m[1]!);
  }
  return ids;
}

function baseSpecies(id: string, ids: Set<string>): boolean {
  if (ids.has(id)) return true;
  return [...ids].some((s) => id.startsWith(`${s}_`));
}

async function makeSprite(src: string, dest: string, mirror: boolean): Promise<string> {
  const { data, info } = await (mirror ? sharp(src).flop() : sharp(src))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const cut = removeBlackBackground({ data, width: info.width, height: info.height });
  const box = opaqueBox(cut, info.width, info.height);
  if (!box) throw new Error('immagine vuota dopo lo scontorno (è tutta nera?)');
  const x0 = Math.max(0, box.x0 - MARGIN);
  const y0 = Math.max(0, box.y0 - MARGIN);
  const x1 = Math.min(info.width - 1, box.x1 + MARGIN);
  const y1 = Math.min(info.height - 1, box.y1 + MARGIN);
  const cropW = x1 - x0 + 1;
  const cropH = y1 - y0 + 1;
  const line = bodyLine(cut, info.width, box) - y0;
  const p = placeProfile(cropW, cropH, line, FRAME);
  const w = Math.max(1, Math.round(cropW * p.scale));
  const h = Math.max(1, Math.round(cropH * p.scale));
  const body = await sharp(Buffer.from(cut.buffer), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .extract({ left: x0, top: y0, width: cropW, height: cropH })
    .resize(w, h, { kernel: 'lanczos3' })
    .png()
    .toBuffer();
  await sharp({
    create: { width: FRAME.w, height: FRAME.h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: body, left: p.left, top: p.top }])
    .webp({ quality: 86, alphaQuality: 90, effort: 5 })
    .toFile(dest);
  return `${w}×${h}, linea del corpo a y=${FRAME.lineY}`;
}

/** A three-quarter picture for battle: black removed, cropped, centred in a square, feet on the bottom. */
async function makeBattlePicture(src: string, dest: string): Promise<string> {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cut = removeBlackBackground({ data, width: info.width, height: info.height });
  const box = opaqueBox(cut, info.width, info.height);
  if (!box) throw new Error('immagine vuota dopo lo scontorno (è tutta nera?)');
  const x0 = Math.max(0, box.x0 - MARGIN);
  const y0 = Math.max(0, box.y0 - MARGIN);
  const cropW = Math.min(info.width - 1, box.x1 + MARGIN) - x0 + 1;
  const cropH = Math.min(info.height - 1, box.y1 + MARGIN) - y0 + 1;
  const scale = Math.min((BATTLE_PIC - 40) / cropW, (BATTLE_PIC - 40) / cropH);
  const w = Math.max(1, Math.round(cropW * scale));
  const h = Math.max(1, Math.round(cropH * scale));
  const body = await sharp(Buffer.from(cut.buffer), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .extract({ left: x0, top: y0, width: cropW, height: cropH })
    .resize(w, h, { kernel: 'lanczos3' })
    .png()
    .toBuffer();
  await sharp({
    create: {
      width: BATTLE_PIC,
      height: BATTLE_PIC,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: body, left: Math.round((BATTLE_PIC - w) / 2), top: BATTLE_PIC - 20 - h }])
    .webp({ quality: 86, alphaQuality: 90, effort: 5 })
    .toFile(dest);
  return `${w}×${h} in un quadrato ${BATTLE_PIC}×${BATTLE_PIC}`;
}

async function makeCard(src: string, dest: string): Promise<string> {
  const meta = await sharp(src).metadata();
  const c = coverCrop(meta.width!, meta.height!, CARD.w / CARD.h);
  await sharp(src)
    .extract(c)
    .resize(CARD.w, CARD.h, { kernel: 'lanczos3' })
    .webp({ quality: 84, effort: 5 })
    .toFile(dest);
  return `ritaglio 2:3 da ${meta.width}×${meta.height}`;
}

/** Writes src/data/sprites.generated.ts: which beast sprites exist (so the game never asks for a missing one). */
async function writeSpriteList(): Promise<void> {
  const files = (await readdir('public/sprites')).filter((f) => f.endsWith('.webp'));
  const battle = files.filter((f) => /_(front|back)(_open)?\.webp$/.test(f)).map((f) => f.slice(0, -5));
  const profiles = files.filter((f) => !battle.includes(f.slice(0, -5)));
  const keys = profiles.filter((f) => !f.endsWith('_open.webp')).map((f) => f.slice(0, -5));
  const open = profiles.filter((f) => f.endsWith('_open.webp')).map((f) => f.slice(0, -10));
  const art = (await readdir('public/art')).filter((f) => f.endsWith('.webp')).map((f) => f.slice(0, -5));
  const list = (a: string[]) =>
    a
      .sort()
      .map((k) => `  '${k}',`)
      .join('\n');
  const text =
    `// Generated by \`npm run art\`: do not edit by hand.\n` +
    `// Beast sprites available in public/sprites (closed mouth), those with an open-mouth version,\n` +
    `// and card illustrations in public/art.\n` +
    `export const SPRITE_KEYS: readonly string[] = [\n${list(keys)}\n];\n\n` +
    `export const OPEN_SPRITE_KEYS: readonly string[] = [\n${list(open)}\n];\n\n` +
    `export const ART_KEYS: readonly string[] = [\n${list(art)}\n];\n\n` +
    `// Three-quarter battle pictures (<id>_front for the wild one, <id>_back for yours, + _open).\n` +
    `export const BATTLE_ART_KEYS: readonly string[] = [\n${list(battle)}\n];\n`;
  await writeFile('src/data/sprites.generated.ts', text, 'utf8');
}

async function main(): Promise<void> {
  if (!existsSync(INBOX)) {
    console.log(`Manca la cartella ${INBOX}/.`);
    return;
  }
  const ids = await knownIds();
  await mkdir(join(outRoot, 'art'), { recursive: true });
  await mkdir(join(outRoot, 'sprites'), { recursive: true });
  const files = (await readdir(INBOX)).sort();
  let made = 0;
  let skipped = 0;
  let errors = 0;
  for (const file of files) {
    const parsed = parseInboxName(file);
    if (!parsed) {
      if (!/\.txt$/i.test(file))
        console.log(
          `? ${file}: nome non riconosciuto (usa <id>_card, <id>_side, <id>_side_open, <id>_front, <id>_back)`,
        );
      continue;
    }
    if (only && parsed.id !== only) continue;
    if (!baseSpecies(parsed.id, ids))
      console.log(`! ${file}: "${parsed.id}" non corrisponde a nessuna bestia di src/data/species.ts`);
    const dest =
      parsed.kind === 'card'
        ? join(outRoot, 'art', `${parsed.id}.webp`)
        : parsed.kind === 'side' || parsed.kind === 'side_open'
          ? join(outRoot, 'sprites', `${parsed.id}${parsed.kind === 'side_open' ? '_open' : ''}.webp`)
          : join(outRoot, 'sprites', `${parsed.id}_${parsed.kind}.webp`);
    if (existsSync(dest) && !force) {
      skipped++;
      continue;
    }
    try {
      const src = join(INBOX, file);
      const note =
        parsed.kind === 'card'
          ? await makeCard(src, dest)
          : parsed.kind === 'side' || parsed.kind === 'side_open'
            ? await makeSprite(src, dest, parsed.mirror)
            : await makeBattlePicture(src, dest);
      console.log(`✓ ${file} → ${dest} (${note})`);
      made++;
    } catch (e) {
      console.log(`✗ ${file}: ${e instanceof Error ? e.message : String(e)}`);
      errors++;
    }
  }
  if (outRoot === 'public') await writeSpriteList();
  console.log(
    `\nFatto: ${made} create, ${skipped} già presenti (non toccate${force ? '' : ': usa --force per rifarle'}), ${errors} errori.`,
  );
  if (errors) process.exitCode = 1;
}

await main();

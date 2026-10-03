// npm run art — turns the images in art-inbox/ into game-ready files.
//   <id>_card.jpg      → public/art/<id>.webp            (vertical illustration, 2:3, 640×960)
//   <id>_side.jpg      → public/sprites/<id>.webp        (profile, black removed, 1000×460, body line y=250)
//   <id>_side_open.jpg → public/sprites/<id>_open.webp   (same, mouth open)
//   <id>_front.jpg, <id>_back.jpg (+ _open) → public/sprites/<id>_front.webp … (battle, three-quarter, 800×800)
// Originals in art-inbox/ are never modified or deleted.
// Options: --force (overwrite existing files), --only=<id>, --out=<folder> (write elsewhere, for checks).
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import {
  bodyLine,
  type CutoutOptions,
  borderColor,
  coverCrop,
  clearEnclosedBackground,
  eraseRects,
  fadeCutEdges,
  opaqueBox,
  parseExtraName,
  parseInboxName,
  placeProfile,
  removeBlackBackground,
  removeDarkBackground,
  removeGreenBackground,
  onGreenScreen,
  fillMouth,
} from './art/cutout.ts';
import { extraDest, makeExtra } from './art/extras.ts';
import { keepLargest } from './art/layers.ts';

const INBOX = 'art-inbox';
const FRAME = { w: 1000, h: 460, lineY: 250 };
const CARD = { w: 640, h: 960 };
const BATTLE_PIC = 800; // three-quarter battle pictures: a square
// Three-quarter pictures: dark creatures, so a tight threshold, and a soft band that fades dark glow halos.
const BATTLE_CUTOUT: CutoutOptions = { low: 3, high: 16, soft: 34 };
// Pictures with a lit floor or a coloured glow in the background need a looser threshold.
const BATTLE_CUTOUT_LOOSE: Record<string, CutoutOptions> = {
  coccodrillo_marino_leggendario_front: { low: 14, high: 60, soft: 80 }, // a lit grey floor under it
  coccodrillo_marino_leggendario_back: { low: 12, high: 50, soft: 70 },
  megattera_back: { low: 8, high: 44, soft: 60 }, // a teal glow around it
  squalo_martello_preistorico_back: { low: 20, high: 34, soft: 24 }, // a navy vignette around it
  squalo_bianco_front: { low: 1, high: 4, soft: 8 }, // its belly is almost as dark as the background (owner, 3 ottobre)
};
// Pictures with something under the creature (a rock stand): this share of the height is cut from the bottom
// (the cut then fades like any fin out of frame).
const BATTLE_CROP_BOTTOM: Record<string, number> = {
  manta_front: 0.16,
};
// Stray bits to erase, as rectangles [x0, y0, x1, y1] in shares of the (mirrored) source picture.
const BATTLE_ERASE: Record<string, number[][]> = {
  squalo_bianco_back: [[0.82, 0.25, 1, 0.5]], // a blurred far fin that looked like a blood splash by the snout
  squalo_volpe_back: [
    [0.56, 0, 1, 0.43],
    [0.3, 0, 0.56, 0.3],
  ], // a cloud of dark specks above it
};
// Coiled bodies with background shut between the loops (systems: clearEnclosedBackground).
const BATTLE_ENCLOSED = ['folgore_front', 'folgore_back', 'scintilla_front', 'scintilla_back'];
// Side profiles on a textured dark-grey background (not flat black): cut like the battle pictures.
const TEXTURED_DARK: CutoutOptions = { low: 24, high: 40, soft: 50 };
const NAVY_VIGNETTE: CutoutOptions = { low: 20, high: 34, soft: 24 };
// Profiles of dark beasts on a dark, speckled background (the owner's pictures from 2 ottobre on): cut from the
// border inwards like the battle pictures (the dark body is never eaten into), then keep the beast alone (stray
// specks and light glows around it go).
// Stray light in a profile picture, as rectangles [x0, y0, x1, y1] in shares of the picture.
const SIDE_ERASE: Record<string, number[][]> = {
  scorfano_side: [
    [0.7, 0, 1, 0.34],
    [0.42, 0, 0.7, 0.26],
  ],
};
const SIDE_FLOOD: CutoutOptions = { low: 3, high: 16, soft: 30 };
const SIDE_FLOOD_SPECIES = [
  'tonno',
  'delfino',
  'pesce_luna',
  'scorfano',
  'pesce_napoleone',
  'pesce_spada',
  'squalo_volpe',
  'tricheco',
  'elefante_marino',
  'foca_leopardo',
  'narvalo',
  'beluga',
  'coccodrillo_nilo',
  'varano_nilo',
  'squalo_martello_preistorico',
  'tartaruga_preistorica',
];
const SIDE_CUTOUT_LOOSE: Record<string, CutoutOptions> = {
  capodoglio_side: TEXTURED_DARK,
  capodoglio_side_open: TEXTURED_DARK,
  // a navy vignette behind it, lighter around the beast
  squalo_martello_preistorico_side_flip: NAVY_VIGNETTE,
  squalo_martello_preistorico_side_open_flip: NAVY_VIGNETTE,
};
// Open mouths with a dark throat that the cut took for background: rectangles (shares of the picture) to refill.
const SIDE_MOUTH: Record<string, number[]> = {
  squalo_martello_side_open: [0.76, 0.42, 0.875, 0.88], // the throat
};
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
  const raw = { data, width: info.width, height: info.height };
  const loose = SIDE_CUTOUT_LOOSE[basename(src, extname(src))];
  const radius = Math.max(2, Math.round(Math.min(info.width, info.height) * 0.006));
  const flood = SIDE_FLOOD_SPECIES.some((id) => basename(src).startsWith(`${id}_side`));
  const green = onGreenScreen(raw);
  let cut = green
    ? removeGreenBackground(raw)
    : loose
      ? removeDarkBackground(raw, borderColor(raw), radius, loose)
      : flood
        ? removeDarkBackground(raw, borderColor(raw), radius, SIDE_FLOOD)
        : removeBlackBackground(raw);
  eraseRects(cut, info.width, info.height, SIDE_ERASE[basename(src, extname(src))] ?? []);
  if (flood) keepLargest(cut, info.width, info.height);
  // a textured dark-grey background (not flat black) survives the plain cut and fills the whole frame:
  // cut again like those (SIDE_CUTOUT_LOOSE)
  const first = opaqueBox(cut, info.width, info.height);
  if (
    !green &&
    !loose &&
    first &&
    first.x1 - first.x0 > info.width * 0.95 &&
    first.y1 - first.y0 > info.height * 0.95
  )
    cut = removeDarkBackground(raw, borderColor(raw), radius, TEXTURED_DARK);
  const mouth = SIDE_MOUTH[basename(src, extname(src))];
  if (mouth) fillMouth(raw, cut, mouth);
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

/**
 * A three-quarter picture for battle: background removed, cropped, centred in a square, feet on the bottom.
 * A thin border is trimmed first (screenshots often have a frame) and the background colour is read from
 * the edges, so dark navy backgrounds go as well as black ones.
 */
async function makeBattlePicture(src: string, dest: string, mirror: boolean, name: string): Promise<string> {
  const meta = await sharp(src).metadata();
  const inset = Math.round(Math.min(meta.width!, meta.height!) * 0.012);
  const trimmed = sharp(src).extract({
    left: inset,
    top: inset,
    width: meta.width! - inset * 2,
    height: meta.height! - inset * 2 - Math.round(meta.height! * (BATTLE_CROP_BOTTOM[name] ?? 0)),
  });
  const { data, info } = await (mirror ? trimmed.flop() : trimmed)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const raw = { data, width: info.width, height: info.height };
  const radius = Math.max(2, Math.round(Math.min(info.width, info.height) * 0.006));
  const cut = onGreenScreen(raw)
    ? removeGreenBackground(raw)
    : removeDarkBackground(raw, borderColor(raw), radius, BATTLE_CUTOUT_LOOSE[name] ?? BATTLE_CUTOUT);
  eraseRects(cut, info.width, info.height, BATTLE_ERASE[name] ?? []);
  if (BATTLE_ENCLOSED.includes(name)) clearEnclosedBackground(raw, cut, borderColor(raw));
  // the newer pictures have specks and glows around the beast: keep the beast alone
  if (SIDE_FLOOD_SPECIES.some((id) => name.startsWith(`${id}_`))) keepLargest(cut, info.width, info.height);
  fadeCutEdges(cut, info.width, info.height); // a fin out of frame fades instead of ending in a straight cut
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
/** "  'sprites/x.webp': 'ab12cd34'," lines for every picture in the folders the game loads from. */
async function icebergShapes(): Promise<string> {
  const dir = join('public', 'world');
  if (!existsSync(dir)) return '{}';
  const out: Record<string, unknown> = {};
  for (const f of (await readdir(dir)).filter((x) => x.endsWith('.json')).sort())
    out[f.replace(/\.json$/, '')] = JSON.parse(await readFile(join(dir, f), 'utf8'));
  return JSON.stringify(out, null, 1);
}

async function hashes(): Promise<string> {
  const lines: string[] = [];
  for (const dir of ['sprites', 'art', 'bg', 'items', 'ui', 'world']) {
    if (!existsSync(join('public', dir))) continue;
    for (const f of (await readdir(join('public', dir))).filter((x) => x.endsWith('.webp')).sort()) {
      const h = createHash('md5')
        .update(await readFile(join('public', dir, f)))
        .digest('hex')
        .slice(0, 8);
      lines.push(`  '${dir}/${f}': '${h}',`);
    }
  }
  return lines.join('\n');
}

/**
 * How much a battle picture's shape hides its size: its longest side over sqrt(width × height) of what is drawn.
 * A turtle seen from behind (wide and flat) or a hammerhead head-on looks small next to a square picture.
 */
async function battleShapes(battle: string[]): Promise<string> {
  const out: string[] = [];
  for (const k of battle.sort()) {
    const { data, info } = await sharp(`public/sprites/${k}.webp`)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const box = opaqueBox(data, info.width, info.height);
    if (!box) continue;
    const w = box.x1 - box.x0 + 1;
    const h = box.y1 - box.y0 + 1;
    const flat = Math.max(w, h) / Math.sqrt(w * h);
    if (flat > 1.05) out.push(`  '${k}': ${flat.toFixed(2)},`);
  }
  return `{\n${out.join('\n')}\n}`;
}

async function writeSpriteList(): Promise<void> {
  const files = (await readdir('public/sprites')).filter((f) => f.endsWith('.webp'));
  const battle = files.filter((f) => /_(front|back)(_open)?\.webp$/.test(f)).map((f) => f.slice(0, -5));
  const profiles = files.filter((f) => !battle.includes(f.slice(0, -5)));
  const keys = profiles.filter((f) => !f.endsWith('_open.webp')).map((f) => f.slice(0, -5));
  const open = profiles.filter((f) => f.endsWith('_open.webp')).map((f) => f.slice(0, -10));
  const art = (await readdir('public/art')).filter((f) => f.endsWith('.webp')).map((f) => f.slice(0, -5));
  const names = async (dir: string): Promise<string[]> =>
    existsSync(dir) ? (await readdir(dir)).filter((f) => f.endsWith('.webp')).map((f) => f.slice(0, -5)) : [];
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
    `export const BATTLE_ART_KEYS: readonly string[] = [\n${list(battle)}\n];\n\n` +
    `// Battle pictures much wider than tall (or the other way): longest side / sqrt(width × height).\n` +
    `export const BATTLE_ART_FLAT: Readonly<Record<string, number>> = ${await battleShapes([...battle])};\n\n` +
    `// Painted battle backgrounds (public/bg/<place>_<layer>), the taming shell (public/items), icons (public/ui).\n` +
    `export const BG_KEYS: readonly string[] = [\n${list(await names('public/bg'))}\n];\n\n` +
    `export const ITEM_ART_KEYS: readonly string[] = [\n${list(await names('public/items'))}\n];\n\n` +
    `export const UI_ICON_KEYS: readonly string[] = [\n${list(await names('public/ui'))}\n];\n\n` +
    `// Painted walls and icebergs of the world (public/world); icebergs with their waterline and solid mask.\n` +
    `export const WORLD_ART_KEYS: readonly string[] = [\n${list(await names('public/world'))}\n];\n\n` +
    `export const ICEBERG_SHAPES: Readonly<Record<string, { w: number; h: number; waterline: number; mask: string[] }>> = ${await icebergShapes()};\n\n` +
    `// A fingerprint of each picture: added to its address, so a phone never shows an old copy (data/assets.ts).\n` +
    `export const ASSET_HASHES: Readonly<Record<string, string>> = {\n${await hashes()}\n};\n`;
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
    if (file.startsWith('_')) continue; // set aside by hand (e.g. a discarded alternative)
    const extra = parseExtraName(file);
    if (extra) {
      const dest = extraDest(outRoot, extra);
      if (only) continue;
      if (existsSync(dest) && !force) {
        skipped++;
        continue;
      }
      try {
        console.log(`✓ ${file} → ${dest} (${await makeExtra(join(INBOX, file), dest, extra)})`);
        made++;
      } catch (e) {
        console.log(`✗ ${file}: ${e instanceof Error ? e.message : String(e)}`);
        errors++;
      }
      continue;
    }
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
            : await makeBattlePicture(src, dest, parsed.mirror, `${parsed.id}_${parsed.kind}`);
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

// npm run art:video [-- --only=<id>] — turns the owner's green-screen videos (art-inbox/video/<id>/*.mp4) into frames
// for the animals animated from a video (scripts/art/videoClips.ts):
//   public/prove/<id>/<clip>/000.webp …  frames cut out of the green, all on the crop of the whole clip (no shaking)
//   public/prove/<id>/<clip>.json        fps, frame count and size, the first and last silhouette's box
// A swim (`loop`) keeps only the stretch that closes on itself best. Originals are never modified or deleted.
// ffmpeg comes from the ffmpeg-static dev dependency (no ffmpeg on the owner's PC; docs/DECISIONS.md).
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import sharp from 'sharp';
import { opaqueBox, removeGreenBackground, type Box } from './cutout.ts';
import { keepLargest } from './layers.ts';
import { VIDEO_ANIMALS, type VideoClip } from './videoClips.ts';

const ffmpeg = createRequire(import.meta.url)('ffmpeg-static') as string;
const INBOX = 'art-inbox/video';
const OUT = 'public/prove';
/** The videos are read at this width (720p is more than the frames need, and keeps memory low). */
const READ_W = 960;

/** Every frame of a stretch of the video, as RGBA. */
function readFrames(
  file: string,
  c: VideoClip,
): Promise<{ frames: Uint8ClampedArray[]; w: number; h: number }> {
  const w = READ_W;
  const h = Math.round((w * 9) / 16 / 2) * 2; // the videos are 16:9
  const size = w * h * 4;
  return new Promise((done, fail) => {
    const args = ['-loglevel', 'error', '-ss', `${c.from}`, '-to', `${c.to}`, '-i', file];
    args.push('-vf', `fps=${c.fps},scale=${w}:${h}`, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-');
    const p = spawn(ffmpeg, args);
    const frames: Uint8ClampedArray[] = [];
    let cur = new Uint8ClampedArray(size);
    let at = 0;
    p.stdout.on('data', (chunk: Buffer) => {
      let o = 0;
      while (o < chunk.length) {
        const n = Math.min(size - at, chunk.length - o);
        cur.set(chunk.subarray(o, o + n), at);
        at += n;
        o += n;
        if (at === size) {
          frames.push(cur);
          cur = new Uint8ClampedArray(size);
          at = 0;
        }
      }
    });
    p.stderr.on('data', (d: Buffer) => process.stderr.write(d));
    p.on('error', fail);
    p.on('close', (code) =>
      code === 0 ? done({ frames, w, h }) : fail(new Error(`ffmpeg ${code} on ${file}`)),
    );
  });
}

/** The green taken away, only the animal kept (no specks of the particles). */
function cutOut(px: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
  const out = removeGreenBackground({ data: px, width: w, height: h }, 24, 80);
  keepLargest(out, w, h);
  return out;
}

/** How different two frames look (alpha-weighted brightness on a coarse grid). */
function difference(a: Uint8ClampedArray, b: Uint8ClampedArray, w: number, h: number): number {
  let sum = 0;
  let n = 0;
  for (let y = 0; y < h; y += 6)
    for (let x = 0; x < w; x += 6) {
      const o = (y * w + x) * 4;
      const la = ((a[o]! + a[o + 1]! + a[o + 2]!) * a[o + 3]!) / 765;
      const lb = ((b[o]! + b[o + 1]! + b[o + 2]!) * b[o + 3]!) / 765;
      sum += Math.abs(la - lb);
      n++;
    }
  return sum / n;
}

/** The stretch [from, to) whose end looks most like its start (to is the frame that would repeat `from`). */
function bestLoop(frames: Uint8ClampedArray[], w: number, h: number, minFrames: number): [number, number] {
  let best: [number, number] = [0, frames.length];
  let score = Infinity;
  for (let a = 0; a < frames.length / 2; a++)
    for (let b = a + minFrames; b < frames.length; b++) {
      const d = difference(frames[a]!, frames[b]!, w, h);
      if (d < score) {
        score = d;
        best = [a, b];
      }
    }
  return best;
}

function union(boxes: Box[], w: number, h: number, pad: number): Box {
  return {
    x0: Math.max(0, Math.min(...boxes.map((b) => b.x0)) - pad),
    y0: Math.max(0, Math.min(...boxes.map((b) => b.y0)) - pad),
    x1: Math.min(w - 1, Math.max(...boxes.map((b) => b.x1)) + pad),
    y1: Math.min(h - 1, Math.max(...boxes.map((b) => b.y1)) + pad),
  };
}

async function makeClip(id: string, c: VideoClip): Promise<void> {
  const file = join(INBOX, id, c.file);
  if (!existsSync(file)) throw new Error(`manca ${file}`);
  const { frames: raw, w, h } = await readFrames(file, c);
  let frames = raw.map((f) => cutOut(f, w, h));
  let loop: [number, number] | null = null;
  if (c.loop) {
    loop = bestLoop(frames, w, h, Math.round((c.minLoop ?? 1) * c.fps));
    frames = frames.slice(loop[0], loop[1]);
  }
  const boxes = frames.map((f) => opaqueBox(f, w, h)).filter((b): b is Box => !!b);
  const crop = union(boxes, w, h, 4);
  const cw = crop.x1 - crop.x0 + 1;
  const ch = crop.y1 - crop.y0 + 1;
  const scale = c.width / cw;
  const fw = c.width;
  const fh = Math.round(ch * scale);
  const dir = join(OUT, id, c.name);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  let bytes = 0;
  for (const [i, f] of frames.entries()) {
    const buf = await sharp(Buffer.from(f.buffer), { raw: { width: w, height: h, channels: 4 } })
      .extract({ left: crop.x0, top: crop.y0, width: cw, height: ch })
      .resize(fw, fh)
      .webp({ quality: 80, alphaQuality: 90, effort: 5 })
      .toBuffer();
    bytes += buf.length;
    await writeFile(join(dir, `${String(i).padStart(3, '0')}.webp`), buf);
  }
  const rel = (b: Box | undefined): number[] =>
    b ? [b.x0, b.y0, b.x1, b.y1].map((v, k) => Math.round((v - (k % 2 ? crop.y0 : crop.x0)) * scale)) : [];
  const info = {
    fps: c.fps,
    frames: frames.length,
    w: fw,
    h: fh,
    face: c.face,
    loop: !!c.loop,
    // the silhouette at the start and at the end, in frame pixels [x0, y0, x1, y1]: its length and where its body is
    first: rel(boxes[0]),
    last: rel(boxes[boxes.length - 1]),
  };
  await writeFile(join(OUT, id, `${c.name}.json`), JSON.stringify(info, null, 2) + '\n');
  const kb = Math.round(bytes / 1024);
  const cut = loop ? ` (anello: fotogrammi ${loop[0]}–${loop[1]} di ${raw.length})` : '';
  console.log(`${id}/${c.name}: ${frames.length} fotogrammi ${fw}×${fh}, ${kb} KB${cut}`);
}

const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
for (const [id, clips] of Object.entries(VIDEO_ANIMALS)) {
  if (only && only !== id) continue;
  for (const c of clips) await makeClip(id, c);
}

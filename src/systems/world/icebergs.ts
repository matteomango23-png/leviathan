// Icebergs (the owner's pictures): where they float and which points of them are solid ice. Their shape comes
// from the picture itself (a coarse mask written by `npm run art`), so you bump into the ice you see.
import { ENDLESS } from '../../data/endless';
import { ICEBERG_SHAPES } from '../../data/sprites.generated';
import {
  ICEBERG_CLEAR_MARGIN,
  ICEBERG_MAX_DRAFT,
  ICEBERG_WIDTH,
  ICEBERGS,
  ICEBERGS_PER_STRETCH,
  type IcebergPlace,
} from '../../data/worldArt';
import { WORLD } from '../../data/worldLayout';
import { hash2 } from '../math';
import { biomeOf } from './stretches';

export interface IcebergBox {
  id: string;
  left: number;
  top: number;
  w: number;
  h: number;
}

/** Where an iceberg's picture goes: its waterline on the sea surface. Null if its picture is missing. */
export function icebergBox(p: IcebergPlace): IcebergBox | null {
  const shape = ICEBERG_SHAPES[p.id];
  const w = ICEBERG_WIDTH[p.id];
  if (!shape || !w) return null;
  let h = (w * shape.h) / shape.w;
  let width = w;
  // never down to the sea floor: a tall picture is drawn smaller
  const draft = (1 - shape.waterline) * h;
  if (draft > ICEBERG_MAX_DRAFT) {
    const k = ICEBERG_MAX_DRAFT / draft;
    h *= k;
    width *= k;
  }
  return { id: p.id, left: p.x - width / 2, top: WORLD.surfaceY - shape.waterline * h, w: width, h };
}

/** Is this point inside the ice of one of these icebergs? */
export function inIceberg(boxes: IcebergBox[], x: number, y: number): boolean {
  for (const b of boxes) {
    if (x < b.left || x >= b.left + b.w || y < b.top || y >= b.top + b.h) continue;
    const mask = ICEBERG_SHAPES[b.id]!.mask;
    const row = mask[Math.floor(((y - b.top) / b.h) * mask.length)];
    if (row && row[Math.floor(((x - b.left) / b.w) * row.length)] === '1') return true;
  }
  return false;
}

const HAND_MADE: IcebergBox[] = ICEBERGS.map(icebergBox).filter((b): b is IcebergBox => b !== null);

/** Is x under (or next to) one of these icebergs? There the old blocky ice is left out. */
export const nearIceberg = (boxes: IcebergBox[], x: number): boolean =>
  boxes.some((b) => x > b.left - ICEBERG_CLEAR_MARGIN && x < b.left + b.w + ICEBERG_CLEAR_MARGIN);

/** The painted icebergs that may cover x: the Mare di Ghiaccio's, or those of the stretch of the endless sea. */
export function icebergsNear(x: number): IcebergBox[] {
  if (x < ENDLESS.startX) return HAND_MADE;
  const k = Math.floor((x - ENDLESS.startX) / ENDLESS.stretch);
  // only the Banchisa stretches have icebergs
  return [k - 1, k, k + 1].flatMap((j) => (biomeOf(j).ice ? icebergsOfStretch(j) : []));
}

const cache = new Map<number, IcebergBox[]>();
const KINDS = Object.keys(ICEBERG_WIDTH);

/** The icebergs of a Banchisa stretch of the endless sea (fixed by the seed), away from its ends. */
export function icebergsOfStretch(k: number): IcebergBox[] {
  const hit = cache.get(k);
  if (hit) return hit;
  const out: IcebergBox[] = [];
  const x0 = ENDLESS.startX + k * ENDLESS.stretch + ENDLESS.blend;
  const span = ENDLESS.stretch - 2 * ENDLESS.blend;
  for (let i = 0; i < ICEBERGS_PER_STRETCH; i++) {
    const id = KINDS[Math.floor(hash2(k * 3.3 + i, ENDLESS.seed + 9) * KINDS.length)]!;
    // one in each half of the stretch, so two never overlap
    const x = x0 + ((i + 0.2 + hash2(k + i * 7.1, 41) * 0.6) / ICEBERGS_PER_STRETCH) * span;
    const b = icebergBox({ id, x });
    if (b) out.push(b);
  }
  cache.set(k, out);
  return out;
}

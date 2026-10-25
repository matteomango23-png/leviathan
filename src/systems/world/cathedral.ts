// The Cattedrale (lot M3, data/galleries.ts CATHEDRAL): swimming (or driving) into its cave finds it, like the other
// landmarks (landmarks.ts): "Hai scoperto…", and it shows on the map of the Grandi fosse from then on. Pure logic.
import { CATHEDRAL } from '../../data/galleries';
import type { GameEvent } from '../events';
import { cathedralGallery } from './galleryShape';
import { landmarkKey } from './landmarks';

/** Inside its cave: found. */
export function discoverCathedral(
  g: { seen: Set<string>; diver: { x: number; y: number } },
  events: GameEvent[],
): void {
  const key = landmarkKey(CATHEDRAL.id);
  if (g.seen.has(key)) return;
  const c = cathedralGallery()?.caves[0];
  if (!c) return;
  const dx = (g.diver.x - c.x) / c.rx;
  const dy = (g.diver.y - c.y) / c.ry;
  if (dx * dx + dy * dy > 1) return;
  g.seen.add(key);
  events.push({ type: 'landmarkFound', name: CATHEDRAL.name });
}

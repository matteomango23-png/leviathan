// The chests in the caves of the Gallerie holding the abyssal ship's rare parts (data/abyss.ts): one in the
// Cattedrale, the others in the caves of the galleries counted from the west. Each stands on the cave's own floor,
// clear of its columns and of its air pocket. Pure: the same sea, the same chests.
import { ABYSS_BUILD, ABYSS_PARTS } from '../../data/abyss';
import { PROP_ART } from '../../data/worldArt';
import type { WreckDef } from '../../data/economy';
import { gallerySites, type Gallery } from './galleries';
import type { TileMap } from './tileMap';

/** Keep this far (units) from the cave's air pocket. */
const AIR_CLEAR = 30;
/** How uneven (units) the floor under it may be. */
const FLAT = 3;

/** Where the chest stands: in its last cave first, from the middle outwards, the first flat stretch of the cave's own
 *  floor clear of columns and air (the other caves after, if that one has none). */
function spot(map: TileMap, g: Gallery): { x: number; y: number } | null {
  for (const c of [...g.caves].reverse())
    for (let i = 0; i < 36; i++) {
      const share = (i % 2 ? -1 : 1) * (0.1 + Math.floor(i / 2) * 0.04);
      const x = c.x + share * c.rx;
      if (map.solidAt(x, c.y)) continue; // a column
      if (g.airs.some((a) => Math.abs(a.x - x) < AIR_CLEAR)) continue;
      const floor = map.floorBelow(x, c.y);
      if (floor <= c.y || floor >= c.y + c.ry + 24) continue;
      // flat under its whole width (it stands in front of the rock there: no gap under it, no corner through it)
      const half = PROP_ART.chest.width * 0.6;
      if ([-half, half].every((dx) => Math.abs(map.floorBelow(x + dx, c.y) - floor) <= FLAT))
        return { x, y: c.y };
    }
  return null;
}

export function galleryChests(map: TileMap): WreckDef[] {
  const all = gallerySites();
  const others = all.filter((g) => !g.cathedral).sort((a, b) => a.mouth.x - b.mouth.x);
  return ABYSS_PARTS.flatMap((p) => {
    if (!('gallery' in p.where)) return [];
    const g = p.where.gallery === 'cathedral' ? all.find((x) => x.cathedral) : others[p.where.gallery];
    const at = g && spot(map, g);
    if (!g || !at) return [];
    return [
      {
        id: `forziere_galleria_${g.k}`,
        name: g.cathedral ? 'Forziere della Cattedrale' : 'Forziere delle Gallerie',
        x: Math.round(at.x),
        y: Math.round(at.y),
        reward: { teeth: ABYSS_BUILD.chestTeeth, part: p.id },
      },
    ];
  });
}

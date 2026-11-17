// The Compagnia's three ships in 3D (owner, 17 novembre 2026: "Preferisco che mi crei un modello tu in 3D per la nave
// nemica, simile a quello che sarà il suo asset 2D"): the whaler — a trawler's hull with its high bow, the harpoon
// gun at the bow, the wheelhouse aft, its funnel, the mast with its boom and a boat; the hunting ship — long and low,
// two gun turrets, a stepped bridge, its funnel and radar mast; the U-Boat — the cigar, its tower, the deck gun, the
// diving planes and the propeller. With the points where its windows shine, fires burn and its funnel smokes.
// Proportions in data/turret.ts HULL_MODELS. Pure logic.
import type { EnemyClassId } from '../../data/company';
import { HULL_3D, HULL_MODELS } from '../../data/turret';
import { box, cigarHull, halfBeamAt, sheerAt, shipHull3d, type Face, type V3 } from './hull3d';

export interface HullModel {
  faces: Face[];
  /** Portholes and windows (lit by night), points on deck where fire shows, the funnel's top. */
  windows: V3[];
  fires: V3[];
  funnel: V3 | null;
  /** The bow's and the stern's points at the waterline (the spray, the wake). */
  bow: V3;
  stern: V3;
}

/** A funnel with the Compagnia's band near its top. */
function funnel(x: number, w: number, z0: number, z1: number): Face[] {
  const half = w * 0.36;
  return [
    ...box(x - w / 2, x + w / 2, -half, half, z0, z1 - 1.1, 'funnel'),
    ...box(x - w / 2 - 0.05, x + w / 2 + 0.05, -half - 0.05, half + 0.05, z1 - 1.1, z1 - 0.4, 'band'),
    ...box(x - w / 2, x + w / 2, -half, half, z1 - 0.4, z1, 'funnel'),
  ];
}

/** Portholes along both sides between these shares of the length. */
function portholes(length: number, beam: number, z: number, from: number, to: number, n: number): V3[] {
  const out: V3[] = [];
  for (let i = 0; i < n; i++) {
    const x = (from + ((to - from) * i) / Math.max(1, n - 1)) * length;
    const b = halfBeamAt(x, length, beam) + 0.05;
    out.push({ x, y: -b, z }, { x, y: b, z });
  }
  return out;
}

function whaler(L: number, fb: number, draft: number): HullModel {
  const M = HULL_MODELS.baleniera;
  const B = L * M.beam;
  const faces = shipHull3d(L, fb, draft, M.beam, M.bowRise);
  const H = M.house;
  const w = (B / 2) * H.width;
  const top = fb + H.height;
  faces.push(...box(H.from * L, H.to * L, -w, w, fb, top, 'top'));
  faces.push(...box(H.from * L - 0.3, H.to * L + 0.3, -w - 0.2, w + 0.2, top, top + 0.25, 'metal'));
  const fw = M.funnel.width * L;
  faces.push(...funnel(M.funnel.at * L, fw, top, fb + M.funnel.height + H.height * 0.5));
  // the mast, its crosstree and its boom over the hold
  const mx = M.mast.at * L;
  const mz = sheerAt(mx, L, fb, M.bowRise);
  faces.push(...box(mx - 0.18, mx + 0.18, -0.18, 0.18, mz, mz + M.mast.height, 'metal'));
  faces.push(
    ...box(
      mx - 0.12,
      mx + 0.12,
      -B * 0.3,
      B * 0.3,
      mz + M.mast.height - 1.6,
      mz + M.mast.height - 1.3,
      'metal',
    ),
  );
  faces.push(
    ...box(
      mx - L * 0.16,
      mx,
      -0.12,
      0.12,
      mz + M.mast.height * 0.45,
      mz + M.mast.height * 0.45 + 0.24,
      'metal',
    ),
  );
  // the harpoon gun on its post at the bow
  const hx = M.harpoon.at * L;
  const hz = sheerAt(hx, L, fb, M.bowRise);
  faces.push(...box(hx - 0.35, hx + 0.35, -0.35, 0.35, hz, hz + 1.1, 'metal'));
  faces.push(...box(hx - 0.6, hx + 2.4, -0.16, 0.16, hz + 1.1, hz + 1.4, 'metal'));
  // a boat on its davits, to one side aft
  const bx = M.boat.at * L;
  faces.push(...box(bx - L * 0.07, bx + L * 0.07, B * 0.22, B * 0.46, fb + 0.5, fb + 1.3, 'top'));
  return {
    faces,
    windows: [
      ...portholes(L, M.beam, fb * 0.55, -0.32, 0.25, 6),
      { x: H.to * L + 0.05, y: -w * 0.5, z: top - 1 },
      { x: H.to * L + 0.05, y: 0, z: top - 1 },
      { x: H.to * L + 0.05, y: w * 0.5, z: top - 1 },
    ],
    fires: [
      { x: -0.3 * L, y: 0, z: fb },
      { x: 0.05 * L, y: 0, z: fb },
      { x: 0.28 * L, y: 0, z: sheerAt(0.28 * L, L, fb, M.bowRise) },
    ],
    funnel: { x: M.funnel.at * L, y: 0, z: fb + M.funnel.height + H.height * 0.5 },
    bow: { x: L / 2, y: 0, z: 0 },
    stern: { x: -L / 2, y: 0, z: 0 },
  };
}

function hunter(L: number, fb: number, draft: number): HullModel {
  const M = HULL_MODELS.caccia;
  const B = L * M.beam;
  const faces = shipHull3d(L, fb, draft, M.beam, M.bowRise);
  const H = M.house;
  const w = (B / 2) * H.width;
  const z1 = fb + H.height;
  const z2 = z1 + H.height * 0.8;
  faces.push(...box(H.from * L, H.to * L, -w, w, fb, z1, 'top'));
  const ux0 = (H.from + 0.04) * L;
  const ux1 = (H.to - 0.02) * L;
  faces.push(...box(ux0, ux1, -w * 0.75, w * 0.75, z1, z2, 'top'));
  faces.push(...box(ux0 - 0.3, ux1 + 0.3, -w * 0.8, w * 0.8, z2, z2 + 0.25, 'metal'));
  const fw = M.funnel.width * L;
  faces.push(...funnel(M.funnel.at * L, fw, fb, fb + M.funnel.height + H.height));
  // the radar mast over the bridge
  const mx = M.mast.at * L;
  faces.push(...box(mx - 0.2, mx + 0.2, -0.2, 0.2, z2, fb + M.mast.height, 'metal'));
  faces.push(
    ...box(
      mx - 0.15,
      mx + 0.15,
      -B * 0.28,
      B * 0.28,
      fb + M.mast.height - 1.8,
      fb + M.mast.height - 1.4,
      'metal',
    ),
  );
  // the gun turrets, their barrels out towards their end of the ship
  for (const at of M.turrets) {
    const x = at * L;
    const z = sheerAt(x, L, fb, M.bowRise);
    const r = Math.min(B * 0.32, 2.2);
    faces.push(...box(x - r, x + r, -r * 0.9, r * 0.9, z, z + 1.5, 'top'));
    const dir = Math.sign(at);
    for (const y of [-0.45, 0.45]) {
      const xa = x + dir * r * 0.8;
      const xb = x + dir * (r + 4.5);
      faces.push(...box(Math.min(xa, xb), Math.max(xa, xb), y - 0.14, y + 0.14, z + 0.7, z + 0.98, 'metal'));
    }
  }
  return {
    faces,
    windows: [
      ...portholes(L, M.beam, fb * 0.55, -0.3, 0.3, 7),
      { x: ux1 + 0.05, y: -w * 0.4, z: z2 - 0.8 },
      { x: ux1 + 0.05, y: 0, z: z2 - 0.8 },
      { x: ux1 + 0.05, y: w * 0.4, z: z2 - 0.8 },
    ],
    fires: [
      { x: -0.25 * L, y: 0, z: fb },
      { x: 0.02 * L, y: 0, z: z1 },
      { x: 0.22 * L, y: 0, z: sheerAt(0.22 * L, L, fb, M.bowRise) },
    ],
    funnel: { x: M.funnel.at * L, y: 0, z: fb + M.funnel.height + H.height },
    bow: { x: L / 2, y: 0, z: 0 },
    stern: { x: -L / 2, y: 0, z: 0 },
  };
}

function uboat(L: number): HullModel {
  const M = HULL_MODELS.uboot;
  const R = L * HULL_3D.cigar;
  const faces = cigarHull(L);
  // the deck casing along its back, the tower, its bridge rail
  faces.push(...box(-0.36 * L, 0.36 * L, -R * 0.32, R * 0.32, R * 0.82, R * 1.02, 'deck'));
  const tx = M.tower.at * L;
  const tl = (M.tower.length * L) / 2;
  const tz = R + M.tower.height;
  faces.push(...box(tx - tl, tx + tl, -R * 0.3, R * 0.3, R * 0.9, tz, 'side'));
  faces.push(...box(tx - tl * 0.6, tx + tl * 0.2, -0.12, 0.12, tz, tz + 2.2, 'metal'));
  // the deck gun ahead of the tower
  const gx = M.gun.at * L;
  faces.push(...box(gx - 0.4, gx + 0.4, -0.4, 0.4, R * 1.02, R * 1.02 + 1.1, 'metal'));
  faces.push(...box(gx - 0.5, gx + 3.2, -0.14, 0.14, R * 1.02 + 0.9, R * 1.02 + 1.18, 'metal'));
  // the diving planes at the bow and the stern, the rudder and the propeller
  for (const [at, span] of [
    [0.4, 1.5],
    [-0.44, 1.7],
  ] as const)
    faces.push(...box(at * L - 1, at * L + 1, -R * span, R * span, -0.1, 0.1, 'metal'));
  faces.push(...box(-0.5 * L - 1.4, -0.5 * L - 0.2, -0.1, 0.1, -R * 0.9, R * 0.9, 'metal'));
  faces.push(...box(-0.5 * L - 0.3, -0.5 * L + 0.1, -R * 0.55, R * 0.55, -0.15, 0.15, 'metal'));
  faces.push(...box(-0.5 * L - 0.3, -0.5 * L + 0.1, -0.15, 0.15, -R * 0.55, R * 0.55, 'metal'));
  return {
    faces,
    windows: [{ x: tx + tl, y: 0, z: tz - 0.8 }],
    fires: [
      { x: tx, y: 0, z: tz },
      { x: 0.25 * L, y: 0, z: R },
    ],
    funnel: null,
    bow: { x: L / 2, y: 0, z: 0 },
    stern: { x: -L / 2, y: 0, z: 0 },
  };
}

/** The 3D model of this class of the Compagnia, `length` long (m). */
export function enemyModel(cls: EnemyClassId, length: number): HullModel {
  if (cls === 'uboot') return uboat(length);
  const M = HULL_MODELS[cls];
  const make = cls === 'caccia' ? hunter : whaler;
  return make(length, length * M.freeboard, length * M.draft);
}

const extents = new Map<string, { top: number; draft: number; beam: number }>();

/** How the model stands for the rounds (m): the top of its hull and houses (not its masts and barrels), its keel's
 *  depth, its beam. The shots strike what you see. */
export function enemyExtent(cls: EnemyClassId, length: number): { top: number; draft: number; beam: number } {
  const key = `${cls}-${length}`;
  let x = extents.get(key);
  if (!x) {
    const solid = enemyModel(cls, length).faces.filter((f) => f.part !== 'metal');
    const pts = solid.flatMap((f) => f.pts);
    x = {
      top: Math.max(...pts.map((p) => p.z)),
      draft: -Math.min(...pts.map((p) => p.z)),
      beam: 2 * Math.max(...pts.map((p) => Math.abs(p.y))),
    };
    extents.set(key, x);
  }
  return x;
}

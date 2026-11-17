// A 3D hull drawn in the turret's view (owner, 17 novembre 2026: "si vede lo scafo da sotto… in modo abbastanza
// sommario 3D"; "Preferisco che mi crei un modello tu in 3D per la nave nemica"): the faces of a model
// (systems/turret/hullModels.ts) projected, the farthest first, each part in its colour (the side in the class's
// tint) lit from the sky — the roofs and deck brighter, the keel darker — darkened by night, fading into the mist or
// the water with distance; seen from under the water only what is under the surface, from above only what is above.
// Broken in two, each half drawn apart with its end rising. Look only.
import Phaser from 'phaser';
import { HULL_3D } from '../../data/turret';
import { placeV3, type Face, type Part, type V3 } from '../../systems/turret/hull3d';
import { project, type Camera } from '../../systems/turret/projection';
import { mix } from './turretLook';

/** How much light each part takes (the flat ones by their facing too). */
const PART_SHADE: Record<Part, number> = {
  bottom: 0.7,
  boot: 0.95,
  side: 1,
  deck: 0.95,
  top: 1,
  metal: 1,
  funnel: 1,
  band: 1,
};

export interface HullPose {
  a: number;
  s: number;
  heading: number;
  /** Its waterline's depth (m; 0 afloat), and the water it took in (it leans bow down and sits lower). */
  depth: number;
  list: number;
  /** Broken: −1 the stern half, 1 the bow half, drawn `gap` m apart, its end rising by `tilt` (radians). */
  half?: { side: -1 | 1; gap: number; tilt: number };
}

/** A point of the model where the pose puts it in the duel (m). */
export function posed(v: V3, pose: HullPose): { a: number; s: number; z: number } {
  let { x, z } = v;
  if (pose.half) {
    // the broken end rises as the middle goes down
    z += Math.abs(x) * Math.sin(pose.half.tilt);
    x += pose.half.side * pose.half.gap;
  }
  return placeV3({ x, y: v.y, z: z - x * Math.sin(pose.list) }, pose.a, pose.s, pose.heading, pose.depth);
}

export interface HullLook {
  /** The class's tint for its sides; how dark the night makes it (0 … 1). */
  tint: number;
  night: number;
  fog: number;
  fade: (d: number) => number;
  /** The camera under the water. */
  under: boolean;
}

export class TurretHull3d {
  readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, box: Phaser.GameObjects.Container) {
    this.g = scene.add.graphics();
    box.add(this.g);
  }

  clear(): void {
    this.g.clear();
  }

  /** Draws these faces in this pose from the camera at `you` (duel coordinates). */
  draw(cam: Camera, you: { a: number; s: number }, faces: Face[], pose: HullPose, look: HullLook): void {
    const g = this.g;
    const flat = { ...cam, roll: 0 };
    const C = HULL_3D.colours;
    const drawn: { pts: { x: number; y: number }[]; depth: number; colour: number }[] = [];
    for (const f of faces) {
      const world = f.pts.map((v) => posed(v, pose));
      const cz = world.reduce((s, p) => s + p.z, 0) / world.length;
      if (look.under ? cz > 0.3 : cz < -0.5) continue;
      const pts: { x: number; y: number }[] = [];
      let far = 0;
      for (const p of world) {
        const s = project(flat, { a: p.a - you.a, s: p.s - you.s, z: p.z });
        if (!s) break;
        pts.push({ x: s.x - cam.w / 2, y: s.y - cam.h / 2 });
        far += Math.hypot(p.a - you.a, p.s - you.s, p.z - cam.height);
      }
      if (pts.length !== world.length) continue;
      const dist = far / pts.length;
      // lit from the sky: flat faces brighter (the keel's darker), the sides by which way they face
      const n = normal(world);
      const flatness = f.part === 'bottom' ? -0.25 * n.z : 0.35 * n.z;
      const light = (0.55 + flatness + 0.12 * n.a) * PART_SHADE[f.part];
      const base = f.part === 'side' ? look.tint : C[f.part as Exclude<Part, 'side'>];
      const lit = mix(0x000000, base, Math.max(0.15, Math.min(1.15, light)));
      const dark = mix(lit, 0x06090c, look.night * 0.75);
      drawn.push({ pts, depth: dist, colour: mix(dark, look.fog, 1 - look.fade(dist)) });
    }
    drawn.sort((a, b) => b.depth - a.depth);
    for (const d of drawn) {
      g.fillStyle(d.colour, 1);
      const [p0] = d.pts;
      for (let i = 1; i + 1 < d.pts.length; i++)
        g.fillTriangle(p0!.x, p0!.y, d.pts[i]!.x, d.pts[i]!.y, d.pts[i + 1]!.x, d.pts[i + 1]!.y);
    }
  }
}

/** How flat a face is (z: 0 upright … 1 flat) and how much it faces along the duel (a), from three corners. */
function normal(p: { a: number; s: number; z: number }[]): { a: number; z: number } {
  const [a, b, c] = p as [(typeof p)[0], (typeof p)[0], (typeof p)[0]];
  const u = { a: b.a - a.a, s: b.s - a.s, z: b.z - a.z };
  const v = { a: c.a - a.a, s: c.s - a.s, z: c.z - a.z };
  const n = { a: u.s * v.z - u.z * v.s, s: u.z * v.a - u.a * v.z, z: u.a * v.s - u.s * v.a };
  const len = Math.hypot(n.a, n.s, n.z) || 1;
  return { a: Math.abs(n.a / len), z: Math.abs(n.z / len) };
}

// A rough 3D hull drawn in the turret's view (owner, 17 novembre 2026: "si vede lo scafo da sotto… in modo abbastanza
// sommario 3D"): the faces of systems/turret/hull3d.ts projected, the farthest first, lit from above (the bottom
// darker), in the colour of its class, fading into the mist or the water with distance; seen from under the water
// only what is under the surface, from above it only what is above. Its propeller churns bubbles. Look only.
import Phaser from 'phaser';
import { HULL_3D } from '../../data/turret';
import { cigar3d, placeV3, shipHull3d, type Face } from '../../systems/turret/hull3d';
import { project, type Camera } from '../../systems/turret/projection';
import { mix } from './turretLook';

/** Which part of the hull, which colour (the class's tint for the sides). */
const PART_SHADE = { bottom: 0.55, side: 1, deck: 0.8, top: 1.1 };

export interface HullPose {
  a: number;
  s: number;
  heading: number;
  /** Its waterline's depth (m; 0 afloat), and the water it took in (it leans and sits lower). */
  depth: number;
  list: number;
}

export class TurretHull3d {
  readonly g: Phaser.GameObjects.Graphics;
  private faces: Face[] = [];
  private key = '';

  constructor(scene: Phaser.Scene, box: Phaser.GameObjects.Container) {
    this.g = scene.add.graphics();
    box.add(this.g);
  }

  /** The model for this ship (built once per kind). */
  shape(key: string, length: number, freeboard: number, draft: number, uboat: boolean): void {
    if (key === this.key) return;
    this.key = key;
    this.faces = uboat ? cigar3d(length) : shipHull3d(length, freeboard, draft);
  }

  clear(): void {
    this.g.clear();
  }

  /**
   * Draws it from the camera at `you` (duel coordinates), tinted `tint`, faded towards `fog` by `fade(distance)`;
   * `under`: the camera is under the water (only the faces under the surface show), else only those above.
   */
  draw(
    cam: Camera,
    you: { a: number; s: number },
    pose: HullPose,
    tint: number,
    fog: number,
    fade: (d: number) => number,
    under: boolean,
    alpha = 1,
  ): void {
    const g = this.g;
    const flat = { ...cam, roll: 0 };
    const drawn: { pts: { x: number; y: number }[]; depth: number; colour: number }[] = [];
    for (const f of this.faces) {
      const world = f.pts.map((v) => {
        // leaning bow down with the water it took in
        const lv = { ...v, z: v.z - v.x * Math.sin(pose.list) };
        return placeV3(lv, pose.a, pose.s, pose.heading, pose.depth);
      });
      const cz = world.reduce((s, p) => s + p.z, 0) / world.length;
      if (under ? cz > 0.2 : cz < -0.4) continue;
      const pts: { x: number; y: number }[] = [];
      let far = 0;
      for (const p of world) {
        const s = project(flat, { a: p.a - you.a, s: p.s - you.s, z: p.z });
        if (!s) break;
        pts.push({ x: s.x - cam.w / 2, y: s.y - cam.h / 2 });
        far += Math.hypot(p.a - you.a, p.s - you.s, p.z - cam.height);
      }
      if (pts.length !== world.length) continue;
      // (a closed shape drawn farthest first: the faces behind are covered by those in front)
      const dist = far / pts.length;
      // lit from above: the flat faces (deck, roofs, keel) brighter or darker by their part
      const n = Math.abs(normalZ(world));
      const light = Math.max(0.25, 0.6 + 0.4 * n) * PART_SHADE[f.part];
      const base = f.part === 'bottom' ? HULL_3D.bottom : f.part === 'deck' ? HULL_3D.deck : tint;
      const lit = mix(0x000000, base, Math.min(1, light));
      drawn.push({ pts, depth: dist, colour: mix(lit, fog, 1 - fade(dist)) });
    }
    drawn.sort((a, b) => b.depth - a.depth);
    for (const d of drawn) {
      g.fillStyle(d.colour, alpha);
      const [p0] = d.pts;
      for (let i = 1; i + 1 < d.pts.length; i++)
        g.fillTriangle(p0!.x, p0!.y, d.pts[i]!.x, d.pts[i]!.y, d.pts[i + 1]!.x, d.pts[i + 1]!.y);
    }
  }
}

/** How much a face looks up (−1 down … 1 up), from its first three corners. */
function normalZ(p: { a: number; s: number; z: number }[]): number {
  const [a, b, c] = p as [(typeof p)[0], (typeof p)[0], (typeof p)[0]];
  const u = { a: b.a - a.a, s: b.s - a.s, z: b.z - a.z };
  const v = { a: c.a - a.a, s: c.s - a.s, z: c.z - a.z };
  const n = { a: u.s * v.z - u.z * v.s, s: u.z * v.a - u.a * v.z, z: u.a * v.s - u.s * v.a };
  const len = Math.hypot(n.a, n.s, n.z) || 1;
  return Math.abs(n.z / len) * (n.z >= 0 ? 1 : -1);
}

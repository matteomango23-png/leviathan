// The turret's view (owner, 17 novembre 2026): a camera on your ship's turret looking where the gun points. A point of
// the duel's plane — ahead along your course, to your side (right > 0), and up from the sea — is projected on the
// screen; the horizon tilts with the ship's roll. Pure logic, shared by the views and the tests.
import { TURRET } from '../../data/turret';

/** The camera: where the gun points (yaw: 0 ahead, right > 0; pitch: up > 0), its height above the sea now (m), its
 *  roll (radians) and the screen. */
export interface Camera {
  yaw: number;
  pitch: number;
  height: number;
  roll: number;
  w: number;
  h: number;
}

/** A point of the duel: ahead (m), side (m, right > 0), up (m above the calm sea). */
export interface P3 {
  a: number;
  s: number;
  z: number;
}

/** Pixels from the screen's middle to its edge, over the tangent of half the view. */
export const focal = (cam: Camera): number => cam.w / 2 / Math.tan(TURRET.fov / 2);

/** In front of the camera: how far (m, along its look), how far right and up of it (m). */
export function toCamera(cam: Camera, p: P3): { depth: number; right: number; up: number } {
  const ca = Math.cos(cam.yaw);
  const sa = Math.sin(cam.yaw);
  const d = p.a * ca + p.s * sa;
  const right = -p.a * sa + p.s * ca;
  const z = p.z - cam.height;
  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  return { depth: d * cp + z * sp, right, up: -d * sp + z * cp };
}

/** The screen point of a point of the duel (null behind the camera), and how many pixels a metre is there. */
export function project(cam: Camera, p: P3): { x: number; y: number; scale: number } | null {
  const c = toCamera(cam, p);
  if (c.depth < 0.5) return null;
  const f = focal(cam);
  const x0 = (f * c.right) / c.depth;
  const y0 = (-f * c.up) / c.depth;
  const cr = Math.cos(cam.roll);
  const sr = Math.sin(cam.roll);
  return { x: cam.w / 2 + x0 * cr - y0 * sr, y: cam.h / 2 + x0 * sr + y0 * cr, scale: f / c.depth };
}

/** Where the horizon crosses the middle of the screen (y) before the roll: far points sink to it as they recede. */
export const horizonY = (cam: Camera): number => cam.h / 2 + focal(cam) * Math.tan(cam.pitch);

/** How far away the sea is seen at this screen row (pre-roll y below the horizon), in metres. */
export function seaDistanceAt(cam: Camera, y: number): number {
  const below = Math.atan((y - cam.h / 2) / focal(cam)) - cam.pitch;
  if (below <= 0) return Infinity;
  return cam.height / Math.tan(below);
}

/** The screen row (pre-roll) where the sea this far away is seen. */
export function rowOfDistance(cam: Camera, d: number): number {
  return cam.h / 2 + focal(cam) * Math.tan(Math.atan(cam.height / d) + cam.pitch);
}

/** The yaw that looks at a point of the duel. */
export const yawTo = (p: { a: number; s: number }): number => Math.atan2(p.s, p.a);

/** An angle brought within −π … π. */
export function wrapAngle(a: number): number {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
}

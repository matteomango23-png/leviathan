// A Compagnia vessel seen from the inside view (owner, 17 novembre 2026: "Preferisco che mi crei un modello tu in 3D
// per la nave nemica, simile a quello che sarà il suo asset 2D"): always its 3D model (systems/turret/hullModels.ts),
// from every side, above the water and below, rocking on the waves, leaning and sitting lower with the water it took
// in; its bow spray and wake, its windows by night, fire on its deck, smoke from its funnel, its gun flashing before
// it fires, the glow of its store. Sunk, it breaks in two: the halves part, their ends rise, and they go down. The
// sea's nearer bands go over its hull (TurretScene). Look only.
import { ENEMY_CLASSES, HIT_ZONES } from '../../data/company';
import { HULL_3D } from '../../data/turret';
import type { EnemyVessel } from '../../systems/company/enemyState';
import { foeGun } from '../../systems/turret/foeAi';
import type { FoeInView, InsideState } from '../../systems/turret/insideState';
import { splitHalves, type Face, type V3 } from '../../systems/turret/hull3d';
import { enemyModel, type HullModel } from '../../systems/turret/hullModels';
import { project, type Camera } from '../../systems/turret/projection';
import { shipModel, shipPicture } from '../../systems/ship/model';
import type { SoftPuffs } from '../softPuffs';
import { posed, type HullLook, type HullPose, type TurretHull3d } from './turretHull3d';
import { through, type TurretColours } from './turretLook';

/** Where it is on screen now (pre-roll, round the middle), for the effects. */
export interface ShipOnScreen {
  x: number;
  y: number;
  px: number;
  dist: number;
}

interface Built {
  model: HullModel;
  halves: [Face[], Face[]];
  Hm: number;
}

export class TurretShip {
  private readonly built = new Map<string, Built>();
  private model!: HullModel;
  private halves!: [Face[], Face[]];
  private Hm = 0;

  /** The model of this vessel's class (built once per class). */
  private build(e: EnemyVessel): void {
    let b = this.built.get(e.cls);
    if (!b) {
      const pose = { model: ENEMY_CLASSES[e.cls].look };
      const m = shipModel(pose);
      const pic = shipPicture(pose);
      const model = enemyModel(e.cls, m.lengthM * 0.9);
      b = { model, halves: splitHalves(model.faces), Hm: m.lengthM * pic.aspect };
      this.built.set(e.cls, b);
    }
    ({ model: this.model, halves: this.halves, Hm: this.Hm } = b);
  }

  /** Draws it (the hull's layer cleared once a frame by the scene); returns where it is on screen (null: behind). */
  update(
    cam: Camera,
    c: TurretColours,
    d: InsideState,
    f: FoeInView,
    e: EnemyVessel,
    time: number,
    lights: SoftPuffs,
    smoke: SoftPuffs,
    hull: TurretHull3d,
    under: { on: boolean; water: number; see: number },
  ): ShipOnScreen | null {
    const def = ENEMY_CLASSES[e.cls];
    this.build(e);
    const flat = { ...cam, roll: 0 };
    const rel = { a: f.a - d.you.a, s: f.s - d.you.s };
    const at = project(flat, { a: rel.a, s: rel.s, z: 0 });
    if (!at) return null;
    const dist = Math.hypot(rel.a, rel.s);
    const out = { x: at.x - cam.w / 2, y: at.y - cam.h / 2, px: at.scale, dist };
    // an enemy U-Boat under the water is never seen from above it
    const uboat = f.depth > 1;
    if (!under.on && uboat) return out;
    const sinking = Math.max(0, e.sinkT);
    const rough = c.rough;
    const pose: HullPose = {
      a: f.a,
      s: f.s,
      heading: f.heading,
      depth:
        f.depth +
        HIT_ZONES.waterline.sink * e.dmg.flood * this.Hm +
        sinking * sinking * 0.35 +
        sinking * 0.6 +
        (uboat ? 0 : Math.sin(time * 1.1 + e.id) * 0.25 * (1 + rough * 2)),
      list: HIT_ZONES.waterline.list * e.dmg.flood + Math.sin(time * 0.7 + e.id) * 0.01 * (1 + rough * 3),
    };
    const look: HullLook = {
      tint: def.tint,
      night: under.on ? 0 : c.night,
      fog: under.on ? under.water : c.mist,
      fade: under.on
        ? (x: number): number => Math.exp(-((x / under.see) ** 1.5) * 1.2)
        : (x: number): number => through(c, x),
      under: under.on,
    };
    const you = { a: d.you.a, s: d.you.s };
    if (sinking <= 0) hull.draw(cam, you, this.model.faces, pose, look);
    else
      this.halves.forEach((faces, i) =>
        hull.draw(cam, you, faces, { ...pose, half: this.half(i, sinking) }, look),
      );
    // a point of the model on screen (pre-roll, round the middle)
    const pt = (v: V3, p = pose): { x: number; y: number; scale: number } | null => {
      const w = posed(v, p);
      const s = project(flat, { a: w.a - d.you.a, s: w.s - d.you.s, z: w.z });
      return s && { x: s.x - cam.w / 2, y: s.y - cam.h / 2, scale: s.scale };
    };
    if (sinking > 0) {
      const mid = pt({ x: 0, y: 0, z: 0 });
      if (mid && !under.on) {
        smoke.puff(
          mid.x,
          mid.y - 3 * mid.scale,
          9 * mid.scale,
          0x2a2622,
          0.55 * Math.max(0, 1 - sinking / 10),
        );
        lights.puff(
          mid.x,
          mid.y - 2 * mid.scale,
          6 * mid.scale,
          0xff8a2a,
          0.7 * Math.max(0, 1 - sinking / 3),
        );
      }
      return out;
    }
    if (!under.on) this.details(c, d, f, e, out, pt, time, lights, smoke, cam);
    return out;
  }

  /** The halves apart: the gap and the rise grow as it goes down. */
  private half(i: number, t: number): NonNullable<HullPose['half']> {
    return { side: i === 0 ? -1 : 1, gap: Math.min(4, t * 0.9), tilt: Math.min(0.5, t * 0.16) };
  }

  /** Its spray and wake, windows, fire, funnel smoke, gun flash and store's glow (above the water). */
  private details(
    c: TurretColours,
    d: InsideState,
    f: FoeInView,
    e: EnemyVessel,
    s: ShipOnScreen,
    pt: (v: V3) => { x: number; y: number; scale: number } | null,
    time: number,
    lights: SoftPuffs,
    smoke: SoftPuffs,
    cam: Camera,
  ): void {
    const M = this.model;
    const seen = through(c, s.dist);
    const speed = Math.min(1, Math.abs(f.speed) / 8);
    // the bow cutting the sea, the wake behind
    const bow = pt(M.bow);
    if (bow) smoke.puff(bow.x, bow.y, 3 * bow.scale * (0.5 + speed), 0xe8f2f4, 0.55 * speed * seen);
    for (let i = 0; i < 4; i++) {
      const w = pt({ x: M.stern.x - i * 6, y: 0, z: 0 });
      if (w) smoke.puff(w.x, w.y, (3 + i * 2) * w.scale, 0xdde8ec, 0.35 * speed * seen * (1 - i / 4));
    }
    // its windows by night, seen far through the dark
    if (c.night > 0.25)
      for (const v of M.windows) {
        const p = pt(v);
        if (p) lights.puff(p.x, p.y, 0.6 * p.scale, HULL_3D.window, 0.75 * c.night * Math.max(0.3, seen));
      }
    // the funnel's black smoke, blown back
    if (M.funnel)
      for (let i = 0; i < 3; i++) {
        const p = pt({ ...M.funnel, x: M.funnel.x - i * 2.5, z: M.funnel.z + i * 1.4 });
        if (p) smoke.puff(p.x, p.y, (1.6 + i) * p.scale, 0x1c1916, 0.45 * (1 - i / 3) * seen);
      }
    // fire on deck
    if (e.dmg.fire > 0) {
      const k = Math.min(1, e.dmg.fire / 2);
      M.fires.forEach((v, i) => {
        const p = pt(v);
        if (!p) return;
        const flick = 0.7 + 0.3 * Math.sin(time * 17 + i * 2.1);
        lights.puff(p.x, p.y, 3.5 * p.scale * flick, 0xff8a2a, 0.85 * k);
        smoke.puff(p.x + Math.sin(time + i) * 2 * p.scale, p.y - 6 * p.scale, 7 * p.scale, 0x2a2622, 0.4 * k);
      });
    }
    // its gun flashing red before it fires
    if (f.aimAt && f.aimT > 0) {
      const g = foeGun(f, e);
      const gp = project({ ...cam, roll: 0 }, { a: g.a - d.you.a, s: g.s - d.you.s, z: g.z });
      if (gp)
        lights.puff(
          gp.x - cam.w / 2,
          gp.y - cam.h / 2,
          4 * s.px,
          0xff3020,
          0.9 * (0.6 + 0.4 * Math.sin(time * 30)),
        );
    }
    // the glow of its store: the master stroke
    const mag = ENEMY_CLASSES[e.cls].magazine;
    const pic = shipPicture({ model: ENEMY_CLASSES[e.cls].look });
    const L = shipModel({ model: ENEMY_CLASSES[e.cls].look }).lengthM * 0.9;
    const mp = pt({ x: (mag.u - 0.5) * L, y: 0, z: Math.max(0.5, (pic.waterline - mag.v) * this.Hm) });
    if (mp) lights.puff(mp.x, mp.y, 1.6 * mp.scale, 0xffb040, (0.35 + 0.25 * Math.sin(time * 4)) * seen);
  }
}

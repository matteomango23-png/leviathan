// The Compagnia's vessel seen from the turret (owner, 17 novembre 2026): its picture as big as its distance makes it,
// narrower when it turns towards or away from you, rocking on the waves, its hull cut at the waterline (the sea in
// front hides the rest: TurretScene puts it among the sea's bands); its wake and bow spray, its portholes by night,
// fire on its deck, its gun flashing before it fires, the glow of its store. Sunk, its two halves tilt apart and go
// down. When paintings of the enemies seen from the bow and the stern come (Gemini), they replace the side view by
// the angle. Look only.
import Phaser from 'phaser';
import { ENEMY_CLASSES } from '../../data/company';
import { HULL_3D } from '../../data/turret';
import type { TurretHull3d } from './turretHull3d';
import { HIT_ZONES } from '../../data/company';
import type { EnemyVessel } from '../../systems/company/enemyState';
import { foeGun } from '../../systems/turret/duelAi';
import type { DuelState } from '../../systems/turret/duelState';
import { project, type Camera } from '../../systems/turret/projection';
import { shipArt, shipModel, shipPicture } from '../../systems/ship/model';
import type { SoftPuffs } from '../softPuffs';
import { mix, through, type TurretColours } from './turretLook';

/** Where it is on screen now (pre-roll, round the middle), for the effects. */
export interface ShipOnScreen {
  x: number;
  y: number;
  px: number;
  dist: number;
}

export class TurretShip {
  readonly img: Phaser.GameObjects.Image;
  readonly halves: [Phaser.GameObjects.Image, Phaser.GameObjects.Image];
  private key = '';

  constructor(scene: Phaser.Scene, box: Phaser.GameObjects.Container) {
    this.img = scene.add.image(0, 0, '__WHITE');
    this.halves = [scene.add.image(0, 0, '__WHITE'), scene.add.image(0, 0, '__WHITE')];
    box.add([this.img, ...this.halves]);
  }

  /** Draws it; returns where it is on screen (null: behind you). */
  update(
    cam: Camera,
    c: TurretColours,
    d: DuelState,
    e: EnemyVessel,
    time: number,
    lights: SoftPuffs,
    smoke: SoftPuffs,
    hull: TurretHull3d,
    under: { on: boolean; water: number; see: number },
  ): ShipOnScreen | null {
    const def = ENEMY_CLASSES[e.cls];
    hull.clear();
    const pose = { model: def.look };
    const m = shipModel(pose);
    const pic = shipPicture(pose);
    const key = `world-${shipArt(pose).closed}`;
    if (key !== this.key) {
      this.key = key;
      for (const im of [this.img, ...this.halves]) im.setTexture(key);
    }
    const rel = { a: d.foe.a - d.you.a, s: d.foe.s - d.you.s };
    const flat = { ...cam, roll: 0 };
    const at = project(flat, { a: rel.a, s: rel.s, z: 0 });
    const all = [this.img, ...this.halves];
    if (!at) {
      for (const im of all) im.setVisible(false);
      return null;
    }
    const dist = Math.hypot(rel.a, rel.s);
    // the rough 3D hull: always under the water (seen from beneath), and above it when the ship points its bow or
    // stern at you (no painting of those sides yet); an enemy U-Boat under the water is never seen from above
    const sideOn = Math.abs(Math.sin(d.foe.heading - Math.atan2(rel.s, rel.a)));
    const uboat = d.foe.depth > 1;
    if (under.on || uboat || sideOn < HULL_3D.sideBelow) {
      for (const im of all) im.setVisible(false);
      if (!under.on && uboat) return { x: at.x - cam.w / 2, y: at.y - cam.h / 2, px: at.scale, dist };
      const Hm = m.lengthM * pic.aspect;
      hull.shape(
        `${def.look}-${uboat}`,
        m.lengthM * 0.9,
        (pic.waterline - pic.deckY) * Hm,
        (pic.keel - pic.waterline) * Hm,
        uboat,
      );
      const sinking = Math.max(0, e.sinkT);
      const tint = mix(def.tint, 0x06090c, under.on ? 0 : c.night * 0.8);
      const fog = under.on ? under.water : c.mist;
      const fade = under.on
        ? (x: number): number => Math.exp(-((x / under.see) ** 1.5) * 1.2)
        : (x: number): number => through(c, x);
      hull.draw(
        cam,
        { a: d.you.a, s: d.you.s },
        {
          a: d.foe.a,
          s: d.foe.s,
          heading: d.foe.heading,
          depth:
            d.foe.depth +
            HIT_ZONES.waterline.sink * e.dmg.flood * Hm +
            sinking * sinking * 0.35 +
            sinking * 0.6,
          list: HIT_ZONES.waterline.list * e.dmg.flood + Math.min(0.5, sinking * 0.1),
        },
        tint,
        fog,
        fade,
        under.on,
      );
      return { x: at.x - cam.w / 2, y: at.y - cam.h / 2, px: at.scale, dist };
    }
    const px = at.scale;
    const W = this.img.width;
    const H = this.img.height;
    // narrower as it turns its bow or stern to you; the bow to the right when it goes right across the view
    const los = Math.atan2(rel.s, rel.a);
    const turn = Math.max(0.28, Math.abs(Math.sin(d.foe.heading - los)));
    const dir = Math.sin(d.foe.heading - cam.yaw) >= 0 ? 1 : -1;
    const sx = ((m.lengthM * px) / W) * turn * dir;
    const sy = (m.lengthM * pic.aspect * px) / H;
    const bob = Math.sin(time * 1.1 + e.id) * 0.5 * px * (1 + c.rough * 2);
    const roll =
      Math.sin(time * 0.8 + e.id) * (0.02 + c.rough * 0.05) + HIT_ZONES.waterline.list * e.dmg.flood * dir;
    const tint = mix(mix(def.tint, c.mist, 1 - through(c, dist)), 0x06090c, c.night * 0.8);
    const y = at.y - cam.h / 2 + bob + HIT_ZONES.waterline.sink * e.dmg.flood * m.lengthM * pic.aspect * px;
    const x = at.x - cam.w / 2;
    const cut = Math.round(H * Math.min(1, pic.waterline + 0.05));
    if (e.sinkT <= 0) {
      this.halves.forEach((h) => h.setVisible(false));
      this.img
        .setVisible(true)
        .setOrigin(0.5, pic.waterline)
        .setPosition(x, y)
        .setScale(sx, sy)
        .setRotation(roll)
        .setTint(tint)
        .setCrop(0, 0, W, cut);
    } else {
      // broken in two: the halves tilt apart, the middle first, and go down
      this.img.setVisible(false);
      const t = e.sinkT;
      const tilt = Math.min(0.5, t * 0.18);
      const down = (t * t * 0.35 + t * 0.6) * px;
      this.halves.forEach((h, i) => {
        const side = i === 0 ? -1 : 1;
        h.setVisible(true)
          .setOrigin(0.5, pic.waterline)
          .setPosition(x + side * W * Math.abs(sx) * 0.03 * Math.min(1, t), y + down)
          .setScale(sx, sy)
          .setRotation(roll + side * tilt * (dir > 0 ? 1 : -1))
          .setTint(mix(tint, 0x06090c, Math.min(0.8, t * 0.08)))
          .setCrop(i === 0 ? 0 : W / 2, 0, W / 2, cut);
      });
      smoke.puff(x, y - 3 * px, 9 * px, 0x2a2622, 0.55 * Math.max(0, 1 - t / 10));
      lights.puff(x, y - 2 * px, 6 * px, 0xff8a2a, 0.7 * Math.max(0, 1 - t / 3));
      return { x, y, px, dist };
    }
    this.details(cam, c, d, e, { x, y, px, dist }, sx, sy, time, lights, smoke);
    return { x, y, px, dist };
  }

  /** Its wake, portholes, fire, gun flash and store's glow. */
  private details(
    cam: Camera,
    c: TurretColours,
    d: DuelState,
    e: EnemyVessel,
    s: ShipOnScreen,
    sx: number,
    sy: number,
    time: number,
    lights: SoftPuffs,
    smoke: SoftPuffs,
  ): void {
    const pose = { model: ENEMY_CLASSES[e.cls].look };
    const pic = shipPicture(pose);
    const W = this.img.width;
    const H = this.img.height;
    // a point of its picture on screen
    const pt = (u: number, v: number): { x: number; y: number } => ({
      x: s.x + (u - 0.5) * W * sx,
      y: s.y + (v - pic.waterline) * H * sy,
    });
    const seen = through(c, s.dist);
    const speed = Math.min(1, Math.abs(d.foe.speed) / 8);
    // the bow cutting the sea, the wake behind
    const bow = pt(0.97, pic.waterline);
    smoke.puff(bow.x, bow.y, 3 * s.px * (0.5 + speed), 0xe8f2f4, 0.55 * speed * seen);
    for (let i = 0; i < 4; i++) {
      const w = pt(0.02 - i * 0.12, pic.waterline);
      smoke.puff(w.x, w.y + i * 0.3 * s.px, (3 + i * 2) * s.px, 0xdde8ec, 0.35 * speed * seen * (1 - i / 4));
    }
    // its portholes by night, seen far through the dark
    if (c.night > 0.3)
      for (let i = 0; i < 5; i++) {
        const p = pt(0.3 + i * 0.1, pic.waterline - 0.1);
        lights.puff(p.x, p.y, 1.4 * s.px, 0xffd27a, 0.7 * c.night * Math.max(0.3, seen));
      }
    // fire on deck
    if (e.dmg.fire > 0) {
      const k = Math.min(1, e.dmg.fire / 2);
      for (let i = 0; i < 3; i++) {
        const p = pt(0.35 + i * 0.13, pic.deckY);
        const flick = 0.7 + 0.3 * Math.sin(time * 17 + i * 2.1);
        lights.puff(p.x, p.y, 3.5 * s.px * flick, 0xff8a2a, 0.85 * k);
        smoke.puff(p.x + Math.sin(time + i) * 2 * s.px, p.y - 6 * s.px, 7 * s.px, 0x2a2622, 0.4 * k);
      }
    }
    // its gun flashing red before it fires
    if (d.foe.aimAt && d.foe.aimT > 0) {
      const g = foeGun(d, e);
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
    const mp = pt(mag.u, mag.v);
    lights.puff(mp.x, mp.y, 1.6 * s.px, 0xffb040, (0.35 + 0.25 * Math.sin(time * 4)) * seen);
  }
}

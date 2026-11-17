// The Compagnia dell'Olio Nero's vessels (systems/company/): until their paintings come, each borrows one of our
// ships' pictures, darkened and rusty (data/company.ts ENEMY_CLASSES look, tint). They ride the waves like your ship,
// a U-Boat seen through the water; over each, an eye that fills as it grows wary (grey calm, amber searching, red
// hunting) and its hull once struck. Sunk, it breaks in two (views/shipBreak.ts). Look only.
import Phaser from 'phaser';
import { ENEMY_CLASSES, HIT_ZONES } from '../data/company';
import { SHIP_MODELS } from '../data/fleet';
import { WORLD } from '../data/worldLayout';
import { WORLD_ART_KEYS } from '../data/sprites.generated';
import { enemyPose, type CompanyState, type EnemyVessel } from '../systems/company/enemyState';
import { newRide, settleRide, stepRide, type RideState } from '../systems/ride';
import { seaHeight, type SeaNow } from '../systems/sea';
import { shipHeight, shipPoint } from '../systems/ship/geometry';
import { shipArt, shipLength, shipPicture } from '../systems/ship/model';
import { freshHatches } from '../systems/ship/ship';
import { waterOver } from './seaFx';
import { ShipBreak } from './shipBreak';
import { ShipPictures } from './shipPictures';
import { deckFire, SoftPuffs } from './softPuffs';

/** The eye's colours by what it is doing. */
const EYE = { calm: 0x9aa3a8, suspicious: 0xffc23d, lost: 0xff8a2a, hunting: 0xff3b2e } as const;
/** Its marks' size on screen (CSS-ish pixels at zoom 1 → divided by the zoom). Tuning. */
const MARK = { eye: 9, gap: 12, bar: 26 };

interface Drawn {
  pics: ShipPictures | null;
  ride: RideState;
  top: number;
}

export class EnemyView {
  private readonly drawn = new Map<number, Drawn>();
  private readonly fx: Phaser.GameObjects.Graphics;
  private readonly marks: Phaser.GameObjects.Graphics;
  private readonly breaks: ShipBreak;
  /** Fires on their decks (in front of the hull) and the glow of the store of the one you fight (over the dark). */
  private readonly flames: SoftPuffs;
  private readonly glints: SoftPuffs;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
    glowLayer: Phaser.GameObjects.Layer,
  ) {
    const wreck = scene.add.graphics();
    this.fx = scene.add.graphics();
    layer.add([wreck, this.fx]);
    this.marks = scene.add.graphics();
    glowLayer.add(this.marks); // seen in the dark too
    this.breaks = new ShipBreak(scene, layer, wreck);
    this.flames = new SoftPuffs(scene, layer, false);
    this.glints = new SoftPuffs(scene, glowLayer, true);
  }

  private drawnOf(e: EnemyVessel): Drawn {
    let d = this.drawn.get(e.id);
    if (!d) {
      const look = ENEMY_CLASSES[e.cls].look;
      const m = SHIP_MODELS.find((x) => x.id === look)!;
      const art = shipArt({ model: m.id });
      const painted = WORLD_ART_KEYS.includes(art.closed);
      const pics = painted ? new ShipPictures(this.scene, this.layer, art, m.bays) : null;
      pics?.tint(ENEMY_CLASSES[e.cls].tint);
      d = { pics, ride: newRide(), top: 0 };
      this.drawn.set(e.id, d);
    }
    return d;
  }

  /** @param view the world on screen (the vessels off it show as an arrow at its edge, out of battle) */
  update(
    c: CompanyState,
    time: number,
    dt: number,
    sea: SeaNow,
    zoom: number,
    view: Phaser.Geom.Rectangle,
  ): void {
    this.fx.clear();
    this.marks.clear();
    this.flames.begin();
    this.glints.begin();
    const sinking = new Map<number, number>();
    const seaY = (wx: number): number => WORLD.surfaceY - seaHeight(wx, time, sea, sea.water);
    for (const e of c.enemies) {
      const d = this.drawnOf(e);
      const pose = enemyPose(e);
      const L = shipLength(pose);
      const H = shipHeight(pose);
      const pic = shipPicture(pose);
      const under = Math.min(1, e.dive / Math.max(1, H * pic.waterline));
      if (under > 0.02) settleRide(d.ride);
      else stepRide(d.ride, e.x, e.face, L, sea, time, dt);
      // the water it took in: lower in the sea (company/hullDamage.ts)
      d.top =
        WORLD.surfaceY -
        pic.waterline * H +
        e.dive -
        d.ride.h * (1 - under) +
        H * HIT_ZONES.waterline.sink * e.dmg.flood;
      if (e.sinkT > 0) {
        d.pics?.hide();
        sinking.set(e.id, e.sinkT);
        const art = shipArt(pose);
        this.breaks.start(e.id, {
          key: `world-${art.closed}`,
          tint: ENEMY_CLASSES[e.cls].tint,
          x: e.x,
          top: d.top,
          w: L,
          h: H,
          face: e.face,
        });
        continue;
      }
      const look = {
        model: pose.model,
        face: e.face,
        hatches: freshHatches(pose),
        prop: e.speed > 1 ? 1 : 0,
        mouthT: 0,
      };
      const wet = Math.min(1, under / 0.5);
      // and leaning, its bow down
      const pitch = d.ride.p * (1 - under) - HIT_ZONES.waterline.list * e.dmg.flood;
      d.pics?.place(look, e.x, d.top, 1, pitch, wet > 0 ? seaY : null, time, wet);
      this.drawHurt(e, time, c.battle?.foe === e.id && !c.battle.result, zoom);
      if (wet < 1) waterOver(this.fx, e.x - L / 2, e.x + L / 2, d.top + H * 1.05, time, sea, 1 - wet);
      this.drawMarks(e, e.x, d.top - MARK.gap / zoom, zoom);
      if (!c.battle) this.drawArrow(e, view, zoom);
    }
    // the vessels gone (sunk and under), their pictures with them
    for (const [id, d] of this.drawn)
      if (!c.enemies.some((e) => e.id === id)) {
        d.pics?.destroy();
        this.drawn.delete(id);
      }
    this.breaks.update(sinking, time, sea);
    this.flames.end();
    this.glints.end();
  }

  /** A fire on its deck, flickering, its smoke rising; in battle, the glow of its store (the master stroke). */
  private drawHurt(e: EnemyVessel, time: number, foe: boolean, zoom: number): void {
    const pose = enemyPose(e);
    deckFire(this.flames, pose, e.dmg.fire, time);
    if (foe) {
      const m = ENEMY_CLASSES[e.cls].magazine;
      const p = shipPoint(pose, m.u, m.v);
      this.glints.puff(p.x, p.y, 10 / zoom, 0xffb040, 0.35 + 0.25 * Math.sin(time * 4));
    }
  }

  /** Out of battle, a vessel off the screen shows as an arrow at its edge, with its eye. */
  private drawArrow(e: EnemyVessel, view: Phaser.Geom.Rectangle, zoom: number): void {
    const m = 22 / zoom;
    if (e.x > view.left && e.x < view.right) return;
    const side = e.x > view.right ? 1 : -1;
    const x = side > 0 ? view.right - m : view.left + m;
    const y = Math.min(view.bottom - m, Math.max(view.top + m * 2, WORLD.surfaceY - m));
    const g = this.marks;
    const s = 7 / zoom;
    g.fillStyle(EYE[e.phase], 0.9);
    g.fillTriangle(x + side * s, y, x - side * s * 0.6, y - s, x - side * s * 0.6, y + s);
    this.drawMarks(e, x - side * s * 2.2, y - s * 2.2, zoom);
  }

  /** The eye of its alert over it, filling as it grows wary, and its hull once struck. */
  private drawMarks(e: EnemyVessel, x: number, y: number, zoom: number): void {
    const g = this.marks;
    const s = MARK.eye / zoom;
    const color = EYE[e.phase];
    g.lineStyle(1.4 / zoom, color, 0.95);
    // an almond eye: two arcs; the pupil grows with the alert
    g.beginPath();
    g.moveTo(x - s, y);
    g.lineTo(x - s * 0.5, y - s * 0.45);
    g.lineTo(x + s * 0.5, y - s * 0.45);
    g.lineTo(x + s, y);
    g.lineTo(x + s * 0.5, y + s * 0.45);
    g.lineTo(x - s * 0.5, y + s * 0.45);
    g.closePath();
    g.strokePath();
    g.fillStyle(color, 0.95).fillCircle(x, y, s * (0.12 + 0.3 * e.alert));
    const max = ENEMY_CLASSES[e.cls].hull;
    if (e.hull < max) {
      const w = MARK.bar / zoom;
      const h = 2.2 / zoom;
      const by = y + s * 0.9;
      g.fillStyle(0x000000, 0.6).fillRect(x - w / 2, by, w, h);
      g.fillStyle(e.hull / max > 0.35 ? 0xd9b25c : 0xff4a3a, 1).fillRect(
        x - w / 2,
        by,
        (w * e.hull) / max,
        h,
      );
    }
  }
}

// The speedboat or jet ski (block 4b): the owner's painting with its waterline on the sea surface, the hull under it
// bluer as seen through the water, bobbing on the waves and lifting its bow at speed; with the engine pushing its
// "running" picture fades in (the jets of the Expedition Hunter 2's boat). A wake and bubbles behind it, no foam
// dots (owner, 8 ottobre). Look only: systems/boat.ts moves it.
import Phaser from 'phaser';
import { rideWaves, type SeaWeather } from '../systems/sea';
import { BOAT_MODELS, type BoatModel } from '../data/boats';
import { WORLD_ART_KEYS } from '../data/sprites.generated';
import { WORLD } from '../data/worldLayout';
import { boatLength, boatModel, boatTopSpeed, type BoatState } from '../systems/boat';
import { ShipFx } from './shipFx';

const UNDERWATER_TINT = 0x6f97a6;

/** One boat's pictures, each cut at the waterline: closed above/below, then running above/below. */
class BoatPictures {
  readonly parts: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, m: BoatModel) {
    for (const key of [m.art, m.moving])
      if (key && WORLD_ART_KEYS.includes(key))
        this.parts.push(scene.add.image(0, 0, `world-${key}`), scene.add.image(0, 0, `world-${key}`));
    layer.add(this.parts);
    for (const [i, im] of this.parts.entries()) {
      const cut = Math.round(m.picture.waterline * im.height);
      if (i % 2) im.setCrop(0, cut, im.width, im.height - cut).setTint(UNDERWATER_TINT);
      else im.setCrop(0, 0, im.width, cut);
      im.setVisible(false);
    }
  }

  hide(): void {
    for (const im of this.parts) im.setVisible(false);
  }
}

export class BoatView {
  private readonly pics = new Map<string, BoatPictures>();
  private readonly fx: Phaser.GameObjects.Graphics;
  /** Smoke from its reactors (behind it). */
  private readonly smoke: ShipFx;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    for (const m of BOAT_MODELS) this.pics.set(m.id, new BoatPictures(scene, layer, m));
    // its smoke in front of it: the nozzles are at the very stern, behind the hull it was hidden (owner, 9 ottobre)
    const smoke = scene.add.graphics();
    this.fx = scene.add.graphics();
    layer.add([smoke, this.fx]);
    this.smoke = new ShipFx(smoke, this.fx);
  }

  /** @param hidden in the hold behind its closed hatch @param sea the weather's waves and wind: it rides them */
  update(b: BoatState, time: number, hidden: boolean, sea: SeaWeather, dt = 1 / 60): void {
    this.fx.clear();
    this.puffs(b, hidden, dt);
    for (const [id, p] of this.pics) if (id !== b.model || !b.owned || hidden) p.hide();
    const pics = this.pics.get(b.model);
    if (!b.owned || hidden || !pics?.parts.length) return;
    const m = boatModel(b.model);
    const L = boatLength(b);
    const H = L * m.picture.aspect;
    const k = Math.min(1, b.speed / boatTopSpeed(b));
    const onWater = b.bay === 'out';
    // short, it rides every wave: up and down, bow up and down (owner, 9 ottobre); the bow lifts as it speeds up
    const ride = onWater ? rideWaves(b.x, L, b.face, time, sea) : { heave: 0, pitch: 0 };
    const bob = -ride.heave;
    const pitch = onWater ? ride.pitch + k * 0.06 : 0;
    const top = b.y - m.picture.waterline * H + bob - k * 2;
    const running = Math.min(1, Math.max(0, (b.prop - 0.05) / 0.25));
    for (const [i, im] of pics.parts.entries()) {
      const alpha = i >= 2 ? running : 1;
      const sc = L / im.width;
      im.setVisible(alpha > 0.01)
        .setPosition(b.x, top + H / 2)
        .setScale(sc * b.face, sc)
        .setRotation(-b.face * pitch)
        .setAlpha(alpha);
    }
    if (onWater) this.drawWake(b, m, L, H, top, k, time);
  }

  /** Its reactors smoke while it pushes, on the water (owner, 9 ottobre). */
  private puffs(b: BoatState, hidden: boolean, dt: number): void {
    const m = boatModel(b.model);
    const L = boatLength(b);
    const H = L * m.picture.aspect;
    const top = b.y - m.picture.waterline * H;
    const on = b.owned && !hidden && b.bay === 'out' && b.prop > 0.05;
    const sources = on
      ? (m.reactors ?? []).map((r) => ({
          x: b.x + b.face * (r.u - 0.5) * L,
          y: top + r.v * H,
          size: r.size * b.prop,
        }))
      : [];
    this.smoke.puff(sources, b.prop, L / 180, dt);
  }

  /** The wake behind it, and bubbles where its engine churns the water. */
  private drawWake(
    b: BoatState,
    m: BoatModel,
    L: number,
    H: number,
    top: number,
    k: number,
    time: number,
  ): void {
    const g = this.fx;
    const stern = b.x + b.face * (m.picture.propX - 0.5) * L;
    if (k > 0.03)
      for (let i = 0; i < 12; i++) {
        const t = (time * (1 + k * 1.5) + i / 12) % 1;
        g.fillStyle(0xe8f2f4, 0.3 * k * (1 - t));
        g.fillEllipse(
          stern - b.face * t * (30 + 110 * k),
          WORLD.surfaceY + Math.sin(i * 1.9),
          4 + t * 10,
          1.2 + t,
        );
      }
    if (b.prop < 0.03) return;
    const y = top + m.picture.propY * H;
    for (let i = 0; i < 10; i++) {
      const t = (time * (1.6 + b.prop * 2) + i / 10) % 1;
      g.lineStyle(0.5, 0xdff8ff, 0.6 * b.prop * (1 - t));
      g.strokeCircle(
        stern - b.face * t * (16 + 30 * b.prop),
        Math.max(y, WORLD.surfaceY + 2) + t * 4,
        0.5 + t,
      );
    }
  }
}

// The speedboat or jet ski (block 4b): the owner's painting with its waterline on the sea surface, the hull under it
// bluer as seen through the water, bobbing on the waves and lifting its bow at speed; with the engine pushing its
// "running" picture fades in (the jets of the Expedition Hunter 2's boat). A wake and bubbles behind it, no foam
// dots (owner, 8 ottobre). Look only: systems/boat.ts moves it.
import Phaser from 'phaser';
import { BOAT_MODELS, type BoatModel } from '../data/boats';
import { WORLD_ART_KEYS } from '../data/sprites.generated';
import { WORLD } from '../data/worldLayout';
import { boatLength, boatModel, boatTopSpeed, type BoatState } from '../systems/boat';

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

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    for (const m of BOAT_MODELS) this.pics.set(m.id, new BoatPictures(scene, layer, m));
    this.fx = scene.add.graphics();
    layer.add(this.fx);
  }

  /** @param hidden in the hold behind its closed hatch @param waves the weather's waves (1 = calm) */
  update(b: BoatState, time: number, hidden: boolean, waves: number): void {
    this.fx.clear();
    for (const [id, p] of this.pics) if (id !== b.model || !b.owned || hidden) p.hide();
    const pics = this.pics.get(b.model);
    if (!b.owned || hidden || !pics?.parts.length) return;
    const m = boatModel(b.model);
    const L = boatLength(b);
    const H = L * m.picture.aspect;
    const k = Math.min(1, b.speed / boatTopSpeed(b));
    const onWater = b.bay === 'out';
    const sea = Math.min(3, waves);
    // bobbing on the swell; the bow lifts as it speeds up
    const bob = onWater ? Math.sin(time * 2.6) * 1.2 * sea : 0;
    const pitch = onWater ? Math.sin(time * 2.1 + 0.7) * 0.025 * sea + k * 0.06 : 0;
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

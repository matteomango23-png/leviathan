// The diver placeholder (vector-style, as in prototype/prova-realistica.html), animated in pieces:
// body plus two fins that kick. Also draws the speargun's darts in flight and the aim guide.
import Phaser from 'phaser';
import { DIVER, HARPOON } from '../data/diver';
import type { DiverState } from '../systems/diver';
import type { HarpoonState } from '../systems/harpoon';
import { DIVER_BODY_ORIGIN, DIVER_TEX_SCALE, FIN_TEX, TEX } from './textures';

/** The body texture spans ~3.6 local units for the whole diver including fins. */
const LOCAL_LENGTH = 3.6;

export class DiverView {
  private readonly root: Phaser.GameObjects.Container;
  private readonly finA: Phaser.GameObjects.Image;
  private readonly finB: Phaser.GameObjects.Image;
  /** The speargun's shots as glowing dots, each with two fading ones behind (owner, 12 novembre 2026: "puntini, non
   *  frecce"): a pool, three per shot. */
  private readonly shotDots: Phaser.GameObjects.Image[] = [];
  private readonly aimDots: Phaser.GameObjects.Image[] = [];
  private kick = 0;
  private tilt = 0;
  /** Eased facing: goes from -1 to 1 through a short turn instead of flipping at once. */
  private faceAnim = 1;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    const s = 1 / DIVER_TEX_SCALE;
    const hip = (y: number): [number, number] => [-1.65, y];
    const mkFin = (y: number): Phaser.GameObjects.Image => {
      const [hx, hy] = hip(y);
      return scene.add
        .image(hx, hy, TEX.diverFin)
        .setOrigin(1, FIN_TEX.pivotY / FIN_TEX.h)
        .setScale(s);
    };
    this.finA = mkFin(0.02).setTint(0xb8c4c8);
    this.finB = mkFin(0.16);
    const body = scene.add
      .image(-DIVER_BODY_ORIGIN.x, -DIVER_BODY_ORIGIN.y, TEX.diverBody)
      .setOrigin(0, 0)
      .setScale(s);
    this.root = scene.add.container(0, 0, [this.finA, body, this.finB]);
    for (let i = 0; i < HARPOON.shotPool * 3; i++)
      this.shotDots.push(scene.add.image(0, 0, TEX.dot).setTint(0xe6f6ff).setVisible(false));
    for (let r = HARPOON.aimDotsFrom; r < HARPOON.aimDotsTo; r += 5) {
      this.aimDots.push(scene.add.image(0, 0, TEX.dot).setTint(0x5ff3d6).setScale(0.12).setVisible(false));
    }
    layer.add([...this.shotDots, ...this.aimDots, this.root]);
  }

  /** Hidden while the diver sits on Aurelio's boat (the story view draws the scene). */
  setHidden(hidden: boolean): void {
    this.root.setVisible(!hidden);
    if (hidden) for (const dot of this.shotDots) dot.setVisible(false); // shown again by update()
  }

  private easeFace(face: number, dt: number): number {
    const step = dt / 0.22; // seconds for a full turn
    this.faceAnim += Math.max(-step * 2, Math.min(step * 2, face - this.faceAnim));
    const f = this.faceAnim;
    return Math.sign(f || face) * Math.max(0.15, Math.abs(f));
  }

  /**
   * @param rider when riding a beast: where the diver sits and the beast's pitch
   */
  update(
    d: DiverState,
    h: HarpoonState,
    aim: number | null,
    dt: number,
    time: number,
    rider: { x: number; y: number; pitch: number } | null = null,
  ): void {
    const speed = Math.hypot(d.vx, d.vy);
    this.kick += dt * (rider ? 0.8 : 2 + speed * 0.05);
    const k = Math.sin(this.kick * 5);
    this.finA.setRotation(0.25 * k - 0.05);
    this.finB.setRotation(-0.25 * k + 0.05);

    const scale = DIVER.lengthUnits / LOCAL_LENGTH;
    // swimming: the diver leans into the way he goes, head down when diving straight down (owner: he just slid
    // down); drifting slowly he stays level
    const swimming = Phaser.Math.Clamp((speed - DIVER.tilt.fromSpeed) / DIVER.tilt.fullSpeed, 0, 1);
    const wantTilt = rider
      ? rider.pitch
      : Phaser.Math.Clamp(Math.atan2(d.vy, Math.abs(d.vx)) * swimming, -DIVER.tilt.max, DIVER.tilt.max);
    this.tilt += (wantTilt - this.tilt) * Math.min(1, dt * 6);
    const blink = d.invulnerable > 0 && !d.dead && Math.floor(time * 12) % 2 === 0;
    this.root
      .setPosition(rider ? rider.x : d.x, rider ? rider.y : d.y)
      .setScale(this.easeFace(d.face, dt) * scale, scale)
      .setRotation(this.tilt * d.face)
      .setAlpha(d.dead ? 0.5 : blink ? 0.55 : 1);

    // the speargun's shots: a bright dot, two fainter ones trailing it
    this.shotDots.forEach((dot, i) => {
      const shot = h.shots[Math.floor(i / 3)];
      const k = i % 3;
      dot.setVisible(!!shot && shot.dist > k * HARPOON.trailStep);
      if (!shot) return;
      const v = Math.hypot(shot.vx, shot.vy) || 1;
      const back = k * HARPOON.trailStep;
      dot
        .setPosition(shot.x - (shot.vx / v) * back, shot.y - (shot.vy / v) * back)
        .setScale(HARPOON.dotScale * (1 - k * 0.3))
        .setAlpha([1, 0.45, 0.2][k]!);
    });

    // aim guide while dragging the weapon button
    let i = 0;
    for (let r = HARPOON.aimDotsFrom; r < HARPOON.aimDotsTo; r += 5) {
      const dot = this.aimDots[i++]!;
      dot.setVisible(aim !== null && !d.dead);
      if (aim !== null) dot.setPosition(d.x + Math.cos(aim) * r, d.y + Math.sin(aim) * r);
    }
  }
}

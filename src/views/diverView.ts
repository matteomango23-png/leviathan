// The diver placeholder (vector-style, as in prototype/prova-realistica.html), animated in pieces:
// body plus two fins that kick. Also draws the harpoon line and the aim guide.
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
  private readonly line: Phaser.GameObjects.Graphics;
  private readonly tip: Phaser.GameObjects.Image;
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
    this.line = scene.add.graphics();
    this.tip = scene.add.image(0, 0, TEX.dot).setTint(0xd9e6e8).setScale(0.35);
    for (let r = HARPOON.aimDotsFrom; r < HARPOON.aimDotsTo; r += 5) {
      this.aimDots.push(scene.add.image(0, 0, TEX.dot).setTint(0x5ff3d6).setScale(0.12).setVisible(false));
    }
    layer.add([this.line, this.tip, ...this.aimDots, this.root]);
  }

  /** Hidden while the diver sits on Aurelio's boat (the story view draws the scene). */
  setHidden(hidden: boolean): void {
    this.root.setVisible(!hidden);
    this.line.setVisible(!hidden); // redrawn every frame by update()
    if (!hidden) return; // the tip is shown again by update() while a shot is out
    this.tip.setVisible(false);
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
    const wantTilt = rider
      ? rider.pitch
      : Phaser.Math.Clamp(Math.atan2(d.vy, Math.abs(d.vx) + 30) * 0.5, -0.35, 0.35);
    this.tilt += (wantTilt - this.tilt) * Math.min(1, dt * 6);
    const blink = d.invulnerable > 0 && !d.dead && Math.floor(time * 12) % 2 === 0;
    this.root
      .setPosition(rider ? rider.x : d.x, rider ? rider.y : d.y)
      .setScale(this.easeFace(d.face, dt) * scale, scale)
      .setRotation(this.tilt * d.face)
      .setAlpha(d.dead ? 0.5 : blink ? 0.55 : 1);

    // harpoon rope and tip
    this.line.clear();
    const shot = h.shot;
    this.tip.setVisible(!!shot);
    if (shot) {
      const hx = (rider ? rider.x : d.x) + d.face * DIVER.lengthUnits * 0.28;
      const hy = (rider ? rider.y : d.y) + DIVER.lengthUnits * 0.05;
      this.line.lineStyle(0.35, 0xb9c7c9, 0.8);
      this.line.lineBetween(hx, hy, shot.x, shot.y);
      this.tip.setPosition(shot.x, shot.y);
    }

    // aim guide while dragging the weapon button
    let i = 0;
    for (let r = HARPOON.aimDotsFrom; r < HARPOON.aimDotsTo; r += 5) {
      const dot = this.aimDots[i++]!;
      dot.setVisible(aim !== null && !d.dead);
      if (aim !== null) dot.setPosition(d.x + Math.cos(aim) * r, d.y + Math.sin(aim) * r);
    }
  }
}

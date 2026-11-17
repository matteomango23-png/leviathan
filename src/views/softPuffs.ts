// Soft rounds of smoke, fire or light for the sea battles (views/ordnanceView.ts, enemyView.ts, aimView.ts): the
// lamp's halo picture tinted, from a pool reused every frame. Look only.
import Phaser from 'phaser';
import { HALO_TEX, TEX } from './textures';
import { shipHeight, shipPoint } from '../systems/ship/geometry';
import { shipPicture } from '../systems/ship/model';

/** Soft rounds of smoke or light: the lamp's halo picture (a gradient to nothing), tinted, from a pool reused every
 *  frame. Never a drawn disc with an edge (the owner's rule of no circles of code). */
export class SoftPuffs {
  private readonly pool: Phaser.GameObjects.Image[] = [];
  private used = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer | Phaser.GameObjects.Container,
    private readonly add: boolean,
  ) {}

  begin(): void {
    this.used = 0;
  }

  puff(x: number, y: number, r: number, color: number, alpha: number): void {
    if (alpha <= 0.005 || r <= 0) return;
    let im = this.pool[this.used];
    if (!im) {
      im = this.scene.add.image(0, 0, TEX.halo);
      if (this.add) im.setBlendMode(Phaser.BlendModes.ADD);
      this.layer.add(im);
      this.pool.push(im);
    }
    this.used++;
    im.setVisible(true)
      .setPosition(x, y)
      .setScale(r / HALO_TEX.radius)
      .setTint(color)
      .setAlpha(Math.min(1, alpha));
  }

  end(): void {
    for (let i = this.used; i < this.pool.length; i++) this.pool[i]!.setVisible(false);
  }
}

/** A fire on a ship's deck (a sea battle, company/hullDamage.ts): flames flickering along it, smoke rising; `fire`:
 *  its seconds left (it fades in its last two). */
export function deckFire(
  puffs: SoftPuffs,
  pose: { x: number; face: 1 | -1; dive?: number; model: string },
  fire: number,
  time: number,
): void {
  const k = Math.min(1, fire / 2);
  if (k <= 0) return;
  const H = shipHeight(pose);
  const deck = shipPicture(pose).deckY;
  for (let i = 0; i < 3; i++) {
    const p = shipPoint(pose, 0.32 + i * 0.16, deck);
    const flick = 0.7 + 0.3 * Math.sin(time * 17 + i * 2.1);
    puffs.puff(p.x, p.y - 2, H * 0.12 * flick, 0xff8a2a, 0.9 * k);
    puffs.puff(p.x + Math.sin(time + i) * 3, p.y - H * 0.35, H * 0.25, 0x2a2622, 0.45 * k);
  }
}

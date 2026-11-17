// The turret's view under the water (owner, 17 novembre 2026: "deve funzionare anche sott'acqua… si vede lo scafo da
// sotto"): the water lighter towards the surface and black below, darker deeper and by night; above, the surface seen
// from beneath, rippled and bright, fading into the blue far away; shafts of light by day; the snow of particles
// drifting past. Drawn round the screen's middle in the roll's container (TurretScene). Look only.
import Phaser from 'phaser';
import { UNDERWATER } from '../../data/turret';
import { focal, horizonY, type Camera } from '../../systems/turret/projection';
import { mix } from './turretLook';

const BG = 'turret-under';
const RAY = 'turret-ray';
const ROWS = 128;
const GLOW = 'turret-surface-glow';

/** The water's colour at this depth (m). */
export function waterAt(depth: number, night: number): number {
  const c = UNDERWATER.colours;
  let col = c[c.length - 1]![1];
  for (let i = 0; i + 1 < c.length; i++) {
    const [d0, a] = c[i]!;
    const [d1, b] = c[i + 1]!;
    if (depth <= d1) {
      col = mix(a, b, (depth - d0) / (d1 - d0));
      break;
    }
  }
  return mix(col, 0x010304, night * 0.85);
}

/** How far one sees under the water now (m). */
export const seeUnder = (night: number): number =>
  UNDERWATER.seeM + (UNDERWATER.nightSeeM - UNDERWATER.seeM) * night;

/** The surface's light from beneath: nothing at the horizon, full overhead. */
function paintGlow(scene: Phaser.Scene): void {
  if (scene.textures.exists(GLOW)) return;
  const t = scene.textures.createCanvas(GLOW, 4, 128)!;
  const g = t.context;
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 128);
  t.refresh();
}

function paintRay(scene: Phaser.Scene): void {
  if (scene.textures.exists(RAY)) return;
  const t = scene.textures.createCanvas(RAY, 64, 256)!;
  const g = t.context;
  const across = g.createLinearGradient(0, 0, 64, 0);
  across.addColorStop(0, 'rgba(255,255,255,0)');
  across.addColorStop(0.5, 'rgba(255,255,255,1)');
  across.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = across;
  g.fillRect(0, 0, 64, 256);
  g.globalCompositeOperation = 'destination-in';
  const down = g.createLinearGradient(0, 0, 0, 256);
  down.addColorStop(0, 'rgba(0,0,0,1)');
  down.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = down;
  g.fillRect(0, 0, 64, 256);
  t.refresh();
}

export class TurretUnder {
  private readonly bg: Phaser.GameObjects.Image;
  /** The surface from beneath: its light. */
  private readonly glow: Phaser.GameObjects.Image;
  private readonly rays: Phaser.GameObjects.Image[] = [];
  private readonly snow: Phaser.GameObjects.Graphics;
  private readonly flakes = Array.from({ length: UNDERWATER.snow }, () => ({
    x: Math.random() * 2 - 1,
    y: Math.random() * 2 - 1,
    z: 0.3 + Math.random(),
  }));
  private painted = '';
  private lastYaw = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    box: Phaser.GameObjects.Container,
  ) {
    if (!scene.textures.exists(BG)) scene.textures.createCanvas(BG, 4, ROWS);
    paintRay(scene);
    this.bg = scene.add.image(0, 0, BG).setOrigin(0.5, 0.5);
    box.add(this.bg);
    paintGlow(scene);
    this.glow = scene.add.image(0, 0, GLOW).setOrigin(0.5, 1);
    box.add(this.glow);
    for (let i = 0; i < 5; i++) {
      const r = scene.add.image(0, 0, RAY).setOrigin(0.5, 0).setBlendMode(Phaser.BlendModes.ADD);
      box.add(r);
      this.rays.push(r);
    }
    this.snow = scene.add.graphics();
    box.add(this.snow);
  }

  /** Every part of it at once (above the water it is all hidden). */
  setVisible(on: boolean): void {
    for (const o of [this.bg, this.glow, ...this.rays, this.snow]) o.setVisible(on);
  }

  private paint(top: number, bottom: number): void {
    const key = `${top}-${bottom}`;
    if (key === this.painted) return;
    this.painted = key;
    const t = this.scene.textures.get(BG) as Phaser.Textures.CanvasTexture;
    const g = t.context;
    for (let i = 0; i < ROWS; i++) {
      g.fillStyle = `#${mix(top, bottom, (i / (ROWS - 1)) ** 0.8)
        .toString(16)
        .padStart(6, '0')}`;
      g.fillRect(0, i, 4, 1);
    }
    t.refresh();
  }

  /** @param depth how deep the eye is (m); @param night 0 day … 1 night */
  update(cam: Camera, depth: number, night: number, time: number, span: number): void {
    const f = focal(cam);
    const hy = horizonY(cam) - cam.h / 2;
    const water = waterAt(depth, night);
    const light = mix(UNDERWATER.surfaceLight, water, Math.min(1, depth / 40 + night * 0.85));
    this.paint(mix(water, light, 0.45), waterAt(depth + 60, night));
    this.bg.setPosition(0, 0).setDisplaySize(span * 2, span * 2);
    // the surface from below: its light overhead fading towards the horizon
    const top = -span;
    const tall = Math.max(10, hy - top);
    this.glow
      .setPosition(0, hy)
      .setDisplaySize(span * 2, tall)
      .setTint(light)
      .setAlpha(Math.max(0, 1 - depth / 90));
    // shafts of daylight, swaying, fixed in the water as the turret turns
    this.rays.forEach((r, i) => {
      const yaw = (i - 2) * 0.35 - cam.yaw * 0.6;
      const x = f * Math.tan(Math.atan2(Math.sin(yaw), Math.cos(yaw))) + Math.sin(time * 0.3 + i) * 20;
      r.setPosition(x, hy - f * 0.4)
        .setDisplaySize(f * (0.08 + 0.04 * (i % 2)), f * 1.6)
        .setRotation(0.25 + Math.sin(time * 0.2 + i) * 0.05)
        .setTint(UNDERWATER.surfaceLight)
        .setAlpha((1 - night) * Math.max(0, 1 - depth / 45) * 0.22);
    });
    this.drawSnow(cam, time, span);
  }

  /** Particles drifting past, moving across as the turret turns. */
  private drawSnow(cam: Camera, time: number, span: number): void {
    const g = this.snow.clear();
    const turned = cam.yaw - this.lastYaw;
    this.lastYaw = cam.yaw;
    for (const fl of this.flakes) {
      fl.x -= turned * 0.9 * fl.z;
      fl.y -= 0.0006 * fl.z;
      if (fl.x < -1) fl.x += 2;
      if (fl.x > 1) fl.x -= 2;
      if (fl.y < -1) fl.y += 2;
      const sway = Math.sin(time * 0.7 + fl.z * 9) * 0.01;
      g.fillStyle(0xd8eef2, 0.25 + 0.35 * fl.z).fillRect(
        (fl.x + sway) * span,
        fl.y * span,
        1.2 * fl.z + 0.6,
        1.2 * fl.z + 0.6,
      );
    }
  }
}

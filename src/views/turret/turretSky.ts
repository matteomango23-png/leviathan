// The turret's sky (owner, 17 novembre 2026): from the colour high up to the pale band at the horizon, the clouds of
// the weather drifting with the wind and turning with the turret, the stars by night, the lightning of a storm.
// Drawn round the screen's middle in a container the roll turns (TurretScene). Look only.
import Phaser from 'phaser';
import type { WeatherLook } from '../../data/weather';
import { focal, horizonY, type Camera } from '../../systems/turret/projection';
import { mix, type TurretColours } from './turretLook';

const SKY_KEY = 'turret-sky';
const CLOUD_KEY = 'turret-clouds';
const HAZE_KEY = 'turret-haze';
const ROWS = 128;

function paintClouds(scene: Phaser.Scene): void {
  if (scene.textures.exists(CLOUD_KEY)) return;
  const W = 1024;
  const H = 256;
  const t = scene.textures.createCanvas(CLOUD_KEY, W, H)!;
  const g = t.context;
  // soft heaps of cloud of every size, wrapped at the sides so the band tiles without a seam
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * W;
    const y = H * (0.15 + Math.random() * 0.75);
    const r = 10 + Math.random() ** 2 * 120;
    for (const dx of [-W, 0, W]) {
      const grad = g.createRadialGradient(x + dx, y, 0, x + dx, y, r);
      grad.addColorStop(0, `rgba(255,255,255,${0.06 + Math.random() * 0.14})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(x + dx - r, y - r, r * 2, r * 2);
    }
  }
  // fading out above and below: never a band with an edge
  g.globalCompositeOperation = 'destination-in';
  const fade = g.createLinearGradient(0, 0, 0, H);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(0.35, 'rgba(0,0,0,1)');
  fade.addColorStop(0.8, 'rgba(0,0,0,1)');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = fade;
  g.fillRect(0, 0, W, H);
  t.refresh();
}

function paintHaze(scene: Phaser.Scene): void {
  if (scene.textures.exists(HAZE_KEY)) return;
  const t = scene.textures.createCanvas(HAZE_KEY, 4, 64)!;
  const g = t.context;
  const grad = g.createLinearGradient(0, 0, 0, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.5, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 64);
  t.refresh();
}

export class TurretSky {
  private readonly sky: Phaser.GameObjects.Image;
  private readonly clouds: Phaser.GameObjects.TileSprite;
  private readonly stars: Phaser.GameObjects.Graphics;
  /** The mist along the horizon, drawn over the far sea (TurretScene puts it after the sea). */
  readonly haze: Phaser.GameObjects.Image;
  private readonly flash: Phaser.GameObjects.Rectangle;
  private painted = '';
  private readonly starDirs = Array.from({ length: 70 }, (_, i) => ({
    yaw: (i * 2.399) % (Math.PI * 2),
    up: 0.05 + ((i * 0.618) % 1) * 0.5,
    a: 0.4 + ((i * 0.37) % 1) * 0.6,
  }));

  constructor(
    private readonly scene: Phaser.Scene,
    box: Phaser.GameObjects.Container,
  ) {
    if (!scene.textures.exists(SKY_KEY)) scene.textures.createCanvas(SKY_KEY, 4, ROWS);
    paintClouds(scene);
    paintHaze(scene);
    this.sky = scene.add.image(0, 0, SKY_KEY).setOrigin(0.5, 1);
    this.stars = scene.add.graphics();
    this.clouds = scene.add.tileSprite(0, 0, 10, 10, CLOUD_KEY).setOrigin(0.5, 1);
    this.haze = scene.add.image(0, 0, HAZE_KEY).setOrigin(0.5, 0.5);
    this.flash = scene.add.rectangle(0, 0, 10, 10, 0xe8f0ff, 0);
    box.add([this.sky, this.stars, this.clouds]);
  }

  /** Above the water only. */
  setVisible(on: boolean): void {
    for (const o of [this.sky, this.stars, this.clouds, this.haze]) o.setVisible(on);
  }

  /** The gradient, painted again only when its colours change. */
  private paint(c: TurretColours): void {
    const key = `${c.skyTop}-${c.skyHorizon}`;
    if (key === this.painted) return;
    this.painted = key;
    const t = this.scene.textures.get(SKY_KEY) as Phaser.Textures.CanvasTexture;
    const g = t.context;
    for (let i = 0; i < ROWS; i++) {
      const k = (i / (ROWS - 1)) ** 1.7;
      g.fillStyle = `#${mix(c.skyTop, c.skyHorizon, k).toString(16).padStart(6, '0')}`;
      g.fillRect(0, i, 4, 1);
    }
    t.refresh();
  }

  /** @param span how far the container's drawing must reach each way (px: the screen's diagonal) */
  update(cam: Camera, c: TurretColours, w: WeatherLook, flash: number, time: number, span: number): void {
    this.paint(c);
    const hy = horizonY(cam) - cam.h / 2;
    const f = focal(cam);
    this.sky.setPosition(0, hy + 2).setDisplaySize(span * 2, span + hy + 2 + span * 0.2);
    this.clouds
      .setPosition(0, hy - f * 0.04)
      .setSize(span * 2, Math.max(40, f * 0.8))
      .setTint(mix(0xffffff, c.skyTop, 0.35 + 0.5 * c.night))
      .setAlpha(Math.min(0.95, w.clouds * 0.9 + 0.08));
    this.clouds.tilePositionX = cam.yaw * f * 0.9 + time * (4 + w.wind * 22);
    this.haze
      .setPosition(0, hy)
      .setDisplaySize(span * 2, f * 0.09)
      .setTint(c.mist)
      .setAlpha(0.55 + 0.35 * w.fog);
    // the stars by a clear night, fixed in the sky as the turret turns
    const g = this.stars.clear();
    const clear = c.night * (1 - w.clouds);
    if (clear > 0.05)
      for (const s of this.starDirs) {
        let dy = s.yaw - cam.yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        if (Math.abs(dy) > 0.9) continue;
        const x = f * Math.tan(dy);
        const y = hy - f * Math.tan(s.up);
        g.fillStyle(0xdfe8ff, s.a * clear).fillRect(x, y, 1.6, 1.6);
      }
    this.flashOver(flash);
  }

  /** The lightning: the whole view goes white for an instant (the flash rectangle is screen-wide, outside the roll). */
  private flashOver(flash: number): void {
    this.flash.setFillStyle(0xe8f0ff, Math.min(0.75, flash * 3));
  }

  /** The lightning's rectangle, placed by the scene over everything but the glass. */
  get lightning(): Phaser.GameObjects.Rectangle {
    return this.flash;
  }
}

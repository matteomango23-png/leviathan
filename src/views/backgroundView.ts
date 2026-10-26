// Screen-space background behind the rock: water colour by depth (tinted by the region's look, systems/seaLook.ts)
// and sky; the distant ridges: views/seaRidges.ts. The light shafts and the particles in the water: views/seaLight.ts.
import Phaser from 'phaser';
import { troughDepth } from '../systems/sea';
import { SEA } from '../data/diver';
import { WEATHER } from '../data/weather';
import { WORLD } from '../data/worldLayout';
import { rampColor } from '../systems/math';
import { waterTint, type LookMix } from '../systems/seaLook';
import { SeaRidges } from './seaRidges';

export interface ViewInfo {
  /** World point at the centre of the screen. */
  cx: number;
  cy: number;
  /** Screen pixels per world unit. */
  zoom: number;
  /** Screen size in pixels. */
  w: number;
  h: number;
}

const WATER_KEY = 'bg-water';
const WATER_ROWS = 128;

export class BackgroundView {
  private readonly water: Phaser.GameObjects.Image;
  private readonly waterTex: Phaser.Textures.CanvasTexture;
  private readonly ridges: SeaRidges;
  private lastWaterY = NaN;
  private lastTint = '';
  private lastClouds = 0;
  private lastWaves = NaN;
  private lastSize = '';

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.waterTex = scene.textures.exists(WATER_KEY)
      ? (scene.textures.get(WATER_KEY) as Phaser.Textures.CanvasTexture)
      : scene.textures.createCanvas(WATER_KEY, 2, WATER_ROWS)!;
    this.water = scene.add.image(0, 0, WATER_KEY).setOrigin(0, 0);
    layer.add(this.water);
    this.ridges = new SeaRidges(scene, layer);
  }

  /** Water by depth and the sky above it, greyer and darker under clouds (0..1). */
  /** @param below how far under the resting line the sky goes on (the deepest trough: the waves' view draws the
   *  sea above it) */
  private paintWater(v: ViewInfo, clouds: number, below: number, tint: [number, number, number]): void {
    const g = this.waterTex.context;
    const top = v.cy - v.h / 2 / v.zoom;
    const span = v.h / v.zoom;
    const mix = (a: string, b: string): { red: number; green: number; blue: number } => {
      const ca = Phaser.Display.Color.HexStringToColor(a);
      const cb = Phaser.Display.Color.HexStringToColor(b);
      const m = (x: number, y: number): number => x + (y - x) * clouds;
      return { red: m(ca.red, cb.red), green: m(ca.green, cb.green), blue: m(ca.blue, cb.blue) };
    };
    const skySpan = Math.max(SEA.skyFade, WORLD.surfaceY - top);
    const sky0 = mix(SEA.skyTop, WEATHER.skyStorm.top);
    const sky1 = mix(SEA.skyBottom, WEATHER.skyStorm.bottom);
    for (let i = 0; i < WATER_ROWS; i++) {
      const wy = top + ((i + 0.5) / WATER_ROWS) * span;
      let c: [number, number, number];
      if (wy < WORLD.surfaceY + below) {
        // from the horizon up to the top of the view, however wide it is (owner, 9 ottobre: with the big ships'
        // far view, all but a thin strip of it was the darkest colour)
        const t = Phaser.Math.Clamp(1 - (WORLD.surfaceY - wy) / skySpan, 0, 1);
        c = [
          sky0.red + (sky1.red - sky0.red) * t,
          sky0.green + (sky1.green - sky0.green) * t,
          sky0.blue + (sky1.blue - sky0.blue) * t,
        ];
      } else {
        const w = rampColor(SEA.waterByY, wy);
        c = [Math.min(255, w[0] * tint[0]), Math.min(255, w[1] * tint[1]), Math.min(255, w[2] * tint[2])];
      }
      g.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
      g.fillRect(0, i, 2, 1);
    }
    this.waterTex.refresh();
  }

  /** @param weather cloud cover (darker sky) and the waves (WeatherLook); @param look the region's look here */
  update(
    v: ViewInfo,
    weather: { clouds: number; rays: number; waves?: number; wind?: number } = { clouds: 0, rays: 1 },
    look: LookMix = { a: 'costa', b: 'costa', t: 0 },
  ): void {
    const size = `${v.w}x${v.h}`;
    if (size !== this.lastSize) {
      this.lastSize = size;
      this.lastWaterY = NaN;
    }
    const tint = waterTint(look);
    const tintKey = tint.map((k) => k.toFixed(2)).join();
    const waves = weather.waves ?? 1;
    if (
      !(Math.abs(v.cy - this.lastWaterY) < 0.5) ||
      Math.abs(weather.clouds - this.lastClouds) > 0.02 ||
      Math.abs(waves - this.lastWaves) > 0.02 ||
      tintKey !== this.lastTint
    ) {
      this.lastTint = tintKey;
      this.lastWaterY = v.cy;
      this.lastClouds = weather.clouds;
      this.lastWaves = waves;
      this.paintWater(
        v,
        weather.clouds,
        troughDepth({ waves: weather.waves ?? 1, wind: weather.wind ?? 0 }),
        tint,
      );
    }
    this.water.setDisplaySize(v.w, v.h);
    this.ridges.update(v, look);
  }
}

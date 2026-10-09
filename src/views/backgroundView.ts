// Screen-space background behind the rock: water colour by depth, sky, light rays,
// distant painted ridges with parallax and drifting marine snow (prototype/prova-realistica.html).
import Phaser from 'phaser';
import { SEA } from '../data/diver';
import { WEATHER } from '../data/weather';
import { WORLD } from '../data/worldLayout';
import { hash2, rampColor } from '../systems/math';

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

interface Ridge {
  images: Phaser.GameObjects.Image[];
  fill: Phaser.GameObjects.Rectangle;
  key: string;
  width: number;
  height: number;
}

const WATER_KEY = 'bg-water';
const WATER_ROWS = 128;

function ridgeLine(t: number, seed: number, amp: number, freq: number): number {
  let y = 0;
  for (let o = 1; o <= 4; o++)
    y += (Math.sin(t * freq * o * 1.7 + seed * o * 3.1 + Math.sin(t * freq * 0.5 * o + seed)) * amp) / o;
  return y;
}

export class BackgroundView {
  private readonly water: Phaser.GameObjects.Image;
  private readonly waterTex: Phaser.Textures.CanvasTexture;
  private readonly rays: Phaser.GameObjects.Graphics;
  private readonly snow: Phaser.GameObjects.Graphics;
  private readonly far: Ridge;
  private readonly mid: Ridge;
  private readonly flakes: { x: number; y: number; z: number; a: number }[] = [];
  private lastWaterY = NaN;
  private lastClouds = 0;
  private lastSize = '';

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
  ) {
    this.waterTex = scene.textures.exists(WATER_KEY)
      ? (scene.textures.get(WATER_KEY) as Phaser.Textures.CanvasTexture)
      : scene.textures.createCanvas(WATER_KEY, 2, WATER_ROWS)!;
    this.water = scene.add.image(0, 0, WATER_KEY).setOrigin(0, 0);
    layer.add(this.water);
    this.rays = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    layer.add(this.rays);
    this.far = this.makeRidge('bg-far', SEA.far.top);
    this.mid = this.makeRidge('bg-mid', SEA.mid.top);
    this.snow = scene.add.graphics();
    layer.add(this.snow);
    for (let i = 0; i < SEA.snow.count; i++)
      this.flakes.push({ x: hash2(i, 1), y: hash2(i, 2), z: 0.2 + hash2(i, 3), a: 0.2 + hash2(i, 4) * 0.5 });
  }

  private makeRidge(key: string, color: string): Ridge {
    const images = [0, 1].map(() => {
      const im = this.scene.add.image(0, 0, '__WHITE').setOrigin(0, 0);
      this.layer.add(im);
      return im;
    });
    const fill = this.scene.add
      .rectangle(0, 0, 10, 10, Phaser.Display.Color.HexStringToColor(color).color)
      .setOrigin(0, 0);
    this.layer.add(fill);
    return { images, fill, key, width: 1, height: 1 };
  }

  /** Paints a ridge strip as wide as two screens (it repeats sideways). */
  private paintRidge(r: Ridge, seed: number, w: number, h: number, kind: 'far' | 'mid'): void {
    const def = kind === 'far' ? SEA.far : SEA.mid;
    const width = Math.ceil(w * 2);
    const height = Math.ceil(h * (kind === 'far' ? 0.5 : 0.35));
    if (this.scene.textures.exists(r.key)) this.scene.textures.remove(r.key);
    const tex = this.scene.textures.createCanvas(r.key, width, height)!;
    const g = tex.context;
    const base = height * (kind === 'far' ? 0.45 : 0.4);
    const grad = g.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, def.top);
    grad.addColorStop(1, def.bottom);
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, height);
    for (let x = 0; x <= width; x += 6) {
      const t = (x / width) * Math.PI * 2;
      const amp = kind === 'far' ? height * 0.22 : height * 0.18;
      g.lineTo(
        x,
        base +
          ridgeLine(t, seed, amp, kind === 'far' ? 1 : 2) +
          (kind === 'far' ? Math.sin(t * 2) * height * 0.1 : 0),
      );
    }
    g.lineTo(width, height);
    g.closePath();
    g.fill();
    if (kind === 'far') {
      for (let i = 0; i < 7; i++) {
        const x = hash2(i + 1, 9) * width;
        const sw = (0.03 + hash2(i, 7) * 0.03) * w;
        const sh = (0.35 + hash2(i, 8) * 0.5) * height;
        g.fillStyle = '#0a212c';
        g.beginPath();
        g.moveTo(x - sw, height);
        g.lineTo(x - sw * 0.6, height - sh);
        g.lineTo(x - sw * 0.1, height - sh * 1.08);
        g.lineTo(x + sw * 0.5, height - sh * 0.9);
        g.lineTo(x + sw, height);
        g.fill();
      }
    } else {
      for (let i = 0; i < 12; i++) {
        const x = hash2(i + 30, 5) * width;
        const t = (x / width) * Math.PI * 2;
        const y = base + ridgeLine(t, seed, height * 0.18, 2);
        const rr = (0.02 + hash2(i, 6) * 0.03) * w;
        const rg = g.createRadialGradient(x - rr * 0.3, y - rr * 0.4, rr * 0.1, x, y, rr);
        rg.addColorStop(0, '#1d3a42');
        rg.addColorStop(1, '#08161c');
        g.fillStyle = rg;
        g.beginPath();
        for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.3) {
          const k = rr * (0.8 + 0.25 * Math.sin(a * 3 + i));
          g.lineTo(x + Math.cos(a) * k * 1.3, y + Math.sin(a) * k * 0.8);
        }
        g.fill();
      }
    }
    tex.refresh();
    r.width = width;
    r.height = height;
    for (const im of r.images) im.setTexture(r.key);
    r.fill.fillColor = Phaser.Display.Color.HexStringToColor(def.bottom).color;
  }

  private placeRidge(r: Ridge, v: ViewInfo, kind: 'far' | 'mid'): void {
    const def = kind === 'far' ? SEA.far : SEA.mid;
    const parV = def.parallax * 0.9 + 0.1;
    const top = v.h / 2 + (def.baseY - v.cy) * v.zoom * parV - r.height * 0.45;
    const off = (((v.cx * v.zoom * def.parallax) % r.width) + r.width) % r.width;
    r.images[0]!.setPosition(-off, top);
    r.images[1]!.setPosition(-off + r.width, top);
    const fillTop = Math.max(0, top + r.height - 1);
    r.fill.setPosition(0, fillTop).setSize(v.w, Math.max(0, v.h - fillTop));
    r.fill.setVisible(fillTop < v.h);
  }

  /** Water by depth and the sky above it, greyer and darker under clouds (0..1). */
  private paintWater(v: ViewInfo, clouds: number): void {
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
      if (wy < WORLD.surfaceY) {
        // from the horizon up to the top of the view, however wide it is (owner, 9 ottobre: with the big ships'
        // far view, all but a thin strip of it was the darkest colour)
        const t = Phaser.Math.Clamp(1 - (WORLD.surfaceY - wy) / skySpan, 0, 1);
        c = [
          sky0.red + (sky1.red - sky0.red) * t,
          sky0.green + (sky1.green - sky0.green) * t,
          sky0.blue + (sky1.blue - sky0.blue) * t,
        ];
      } else c = rampColor(SEA.waterByY, wy);
      g.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
      g.fillRect(0, i, 2, 1);
    }
    this.waterTex.refresh();
  }

  /** @param weather cloud cover (darker sky) and strength of the light rays (WeatherLook) */
  update(
    v: ViewInfo,
    time: number,
    weather: { clouds: number; rays: number } = { clouds: 0, rays: 1 },
  ): void {
    const size = `${v.w}x${v.h}`;
    if (size !== this.lastSize) {
      this.lastSize = size;
      this.paintRidge(this.far, 1, v.w, v.h, 'far');
      this.paintRidge(this.mid, 5, v.w, v.h, 'mid');
      this.lastWaterY = NaN;
    }
    if (!(Math.abs(v.cy - this.lastWaterY) < 0.5) || Math.abs(weather.clouds - this.lastClouds) > 0.02) {
      this.lastWaterY = v.cy;
      this.lastClouds = weather.clouds;
      this.paintWater(v, weather.clouds);
    }
    this.water.setDisplaySize(v.w, v.h);
    this.placeRidge(this.far, v, 'far');
    this.placeRidge(this.mid, v, 'mid');

    // light rays from the surface, fading with depth
    const rays = this.rays;
    rays.clear();
    const fade = (1 - Phaser.Math.Clamp((v.cy - WORLD.surfaceY) / SEA.lightRays.fadeY, 0, 1)) * weather.rays;
    if (fade > 0) {
      const t0 = v.h / 2 + (WORLD.surfaceY - v.cy) * v.zoom;
      const len = v.h * 1.2;
      rays.fillStyle(0x96d2e1, SEA.lightRays.alpha * fade);
      for (let i = 0; i < SEA.lightRays.count; i++) {
        const span = v.w * 1.3;
        const x =
          (((((i * 0.19 + time * 0.003) * span - v.cx * v.zoom * 0.1) % span) + span) % span) - v.w * 0.15;
        rays.fillPoints(
          [
            new Phaser.Math.Vector2(x, t0),
            new Phaser.Math.Vector2(x + v.w * 0.04, t0),
            new Phaser.Math.Vector2(x + v.w * 0.16, t0 + len),
            new Phaser.Math.Vector2(x + v.w * 0.09, t0 + len),
          ],
          true,
        );
      }
    }

    // marine snow drifting slowly downwards, with parallax
    const snow = this.snow;
    snow.clear();
    const surfaceScreen = v.h / 2 + (WORLD.surfaceY - v.cy) * v.zoom;
    const px = Math.max(1, v.h / 400);
    for (const f of this.flakes) {
      const x = (((f.x * v.w - v.cx * v.zoom * f.z * 0.5) % v.w) + v.w) % v.w;
      const y = (((f.y * v.h - v.cy * v.zoom * f.z * 0.5 + time * 8 * px * f.z) % v.h) + v.h) % v.h;
      if (y < surfaceScreen) continue;
      snow.fillStyle(0xbed7dc, f.a * SEA.snow.alpha);
      const r = f.z * 1.6 * px;
      snow.fillRect(x, y, r, r);
    }
  }
}

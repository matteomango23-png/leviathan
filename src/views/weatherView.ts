// The weather on screen (look only): clouds in the sky behind the world, and over everything rain or snow
// falling down to the surface, mist on the water and lightning flashes. All of it fades out with depth.
import Phaser from 'phaser';
import { CAMERA } from '../data/diver';
import { WEATHER, type WeatherLook } from '../data/weather';
import { WORLD } from '../data/worldLayout';
import { hash2 } from '../systems/math';
import { depthMetres } from '../systems/world/zones';
import type { ViewInfo } from './backgroundView';

const CLOUD_KEY = 'weather-clouds';
const FOG_KEY = 'weather-fog';
const CLOUD_W = 1024;
const CLOUD_H = 256;

interface Drop {
  x: number; // 0..1 of the screen width
  y: number; // 0..1 of the fall (top of the sky to the surface)
  z: number; // 0.5..1.5: nearer drops are longer and faster
}

/** How much of the weather is felt at a depth (1 at the surface, 0 from WEATHER.dimDepthM down). */
export function weatherReach(worldY: number): number {
  return Math.max(0, 1 - depthMetres(worldY) / WEATHER.dimDepthM);
}

export class WeatherView {
  private readonly clouds: Phaser.GameObjects.Image[];
  private readonly fog: Phaser.GameObjects.Image;
  private readonly fall: Phaser.GameObjects.Graphics;
  private readonly flash: Phaser.GameObjects.Rectangle;
  private readonly drops: Drop[] = [];
  private bolt: { x: number; y: number }[] = [];
  private flashLeft = 0;

  constructor(scene: Phaser.Scene, bgLayer: Phaser.GameObjects.Layer, overlay: Phaser.GameObjects.Layer) {
    if (!scene.textures.exists(CLOUD_KEY)) paintClouds(scene);
    if (!scene.textures.exists(FOG_KEY)) paintFog(scene);
    this.clouds = [0, 1].map(() => {
      const im = scene.add
        .image(0, 0, CLOUD_KEY)
        .setOrigin(0, 0)
        .setTint(WEATHER.cloudColor)
        .setVisible(false);
      bgLayer.add(im);
      return im;
    });
    this.fog = scene.add.image(0, 0, FOG_KEY).setOrigin(0, 0).setTint(WEATHER.fogColor).setVisible(false);
    this.fall = scene.add.graphics();
    this.flash = scene.add
      .rectangle(0, 0, 10, 10, WEATHER.flashColor, 0)
      .setOrigin(0, 0)
      .setBlendMode(Phaser.BlendModes.ADD);
    overlay.add([this.fog, this.fall, this.flash]);
    const n = Math.max(WEATHER.rainDrops, WEATHER.snowFlakes);
    for (let i = 0; i < n; i++) this.drops.push({ x: hash2(i, 31), y: hash2(i, 32), z: 0.5 + hash2(i, 33) });
  }

  /** A lightning flash starts: a bolt somewhere over the sea. */
  lightning(v: ViewInfo): void {
    this.flashLeft = WEATHER.lightningSeconds;
    const x0 = v.w * (0.15 + Math.random() * 0.7);
    const top = v.h / 2 + (CAMERA.minY - v.cy) * v.zoom;
    const bottom = v.h / 2 + (WORLD.surfaceY - v.cy) * v.zoom;
    this.bolt = [];
    const steps = 9;
    let x = x0;
    for (let i = 0; i <= steps; i++) {
      this.bolt.push({ x, y: top + ((bottom - top) * i) / steps });
      x += (Math.random() - 0.5) * v.w * 0.04;
    }
  }

  update(v: ViewInfo, look: WeatherLook, cold: number, time: number, dt: number): void {
    const reach = weatherReach(v.cy);
    // the sky's top: where the swimming camera stops, or the top of the screen when the view is wider than that (the
    // big ships' far view: owner, 9 ottobre, the mist ended in a hard line across the sky)
    const skyTop = Math.min(0, v.h / 2 + (CAMERA.minY - v.cy) * v.zoom);
    const surface = v.h / 2 + (WORLD.surfaceY - v.cy) * v.zoom;
    const skyVisible = surface > 0;

    // clouds: a strip of soft dark blobs drifting with the wind, over the upper sky
    const cloudAlpha = look.clouds * 0.85;
    const bandH = surface - skyTop;
    const showClouds = skyVisible && cloudAlpha > 0.01;
    const cw = v.w * 1.2;
    const off = (((time * (4 + look.wind * 30) * (v.w / 800) + v.cx * v.zoom * 0.05) % cw) + cw) % cw;
    this.clouds.forEach((im, i) => {
      im.setVisible(showClouds);
      if (!showClouds) return;
      im.setDisplaySize(cw, bandH * 0.8)
        .setPosition(-off + i * cw, skyTop - bandH * 0.05)
        .setAlpha(cloudAlpha);
    });

    // mist on the water: thickest just above the surface
    const showFog = skyVisible && look.fog > 0.01;
    this.fog.setVisible(showFog);
    if (showFog) {
      const below = 18 * v.zoom;
      this.fog
        .setPosition(0, skyTop)
        .setDisplaySize(v.w, surface + below - skyTop)
        .setAlpha(look.fog * 0.6);
    }

    // rain or snow, down to the surface
    const g = this.fall;
    g.clear();
    if (skyVisible) this.drawFall(g, v, look, cold, skyTop, Math.min(surface, v.h), time, dt);

    // lightning: a bolt in the sky and a flash over the whole screen, fading with depth
    this.flashLeft = Math.max(0, this.flashLeft - dt);
    const k = this.flashLeft / WEATHER.lightningSeconds;
    const flicker = k > 0 ? k * (0.6 + 0.4 * Math.sin(time * 70)) : 0;
    this.flash.setSize(v.w, v.h).setFillStyle(WEATHER.flashColor, flicker * 0.45 * reach);
    if (k > 0.3 && skyVisible && this.bolt.length) {
      g.lineStyle(Math.max(1.5, v.h / 300), WEATHER.flashColor, Math.min(1, k * 1.4));
      g.strokePoints(this.bolt.map((p) => new Phaser.Math.Vector2(p.x, p.y)));
    }
  }

  private drawFall(
    g: Phaser.GameObjects.Graphics,
    v: ViewInfo,
    look: WeatherLook,
    cold: number,
    top: number,
    bottom: number,
    time: number,
    dt: number,
  ): void {
    const span = bottom - top;
    if (span <= 0) return;
    const px = Math.max(1, v.h / 400);
    const rain = Math.round(WEATHER.rainDrops * look.precip * (1 - cold));
    const snow = Math.round(WEATHER.snowFlakes * look.precip * cold);
    const slant = 0.15 + look.wind * 0.45;
    if (rain > 0) {
      g.lineStyle(Math.max(1, px * 0.7), WEATHER.rainColor, 0.35);
      for (let i = 0; i < rain; i++) {
        const d = this.drops[i]!;
        d.y += (dt * 1.6 * d.z * v.h) / span;
        d.x += (dt * 1.6 * d.z * slant * v.h) / v.w;
        if (d.y > 1) {
          d.y -= 1;
          d.x = Math.random();
        }
        const x = ((((d.x - v.cx * v.zoom * 0.0004) % 1) + 1) % 1) * v.w;
        const y = top + d.y * span;
        const len = 9 * px * d.z;
        g.lineBetween(x, y, x - slant * len, y - len);
      }
      // little splashes where the drops hit the water
      if (bottom < v.h) {
        g.lineStyle(Math.max(1, px * 0.6), WEATHER.rainColor, 0.4);
        const n = Math.round(rain * 0.2);
        for (let i = 0; i < n; i++) {
          const x = hash2(i, Math.floor(time * 12)) * v.w;
          const w = 2.5 * px;
          g.lineBetween(x - w, bottom - px, x - w * 0.3, bottom - 2.5 * px);
          g.lineBetween(x + w, bottom - px, x + w * 0.3, bottom - 2.5 * px);
        }
      }
    }
    if (snow > 0) {
      for (let i = 0; i < snow; i++) {
        const d = this.drops[this.drops.length - 1 - i]!;
        d.y += (dt * 0.22 * d.z * v.h) / span;
        d.x += (dt * (0.02 + look.wind * 0.12) * d.z * v.h) / v.w;
        if (d.y > 1) {
          d.y -= 1;
          d.x = Math.random();
        }
        const sway = Math.sin(time * 1.3 + i) * 6 * px;
        const x = ((((d.x - v.cx * v.zoom * 0.0004) % 1) + 1) % 1) * v.w + sway;
        const y = top + d.y * span;
        g.fillStyle(WEATHER.snowColor, 0.5 + 0.35 * (d.z - 0.5));
        g.fillCircle(x, y, 1.3 * px * d.z);
      }
    }
  }
}

/** A strip of soft cloud blobs, repeating sideways (white: tinted by the view). */
function paintClouds(scene: Phaser.Scene): void {
  const tex = scene.textures.createCanvas(CLOUD_KEY, CLOUD_W, CLOUD_H)!;
  const c = tex.context;
  for (let i = 0; i < 46; i++) {
    const x = hash2(i, 3) * CLOUD_W;
    const y = CLOUD_H * (0.15 + hash2(i, 4) * 0.55);
    const r = CLOUD_H * (0.12 + hash2(i, 5) * 0.22);
    // drawn three times across the seam so the strip repeats without a cut
    for (const dx of [-CLOUD_W, 0, CLOUD_W]) {
      const gr = c.createRadialGradient(x + dx, y, 0, x + dx, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.55)');
      gr.addColorStop(0.6, 'rgba(255,255,255,0.25)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr;
      c.save();
      c.translate(x + dx, y);
      c.scale(1.9, 0.75);
      c.translate(-(x + dx), -y);
      c.beginPath();
      c.arc(x + dx, y, r, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  }
  tex.refresh();
}

/** A vertical band of mist, clear at the top and thickest near the bottom (just above the water). */
function paintFog(scene: Phaser.Scene): void {
  const tex = scene.textures.createCanvas(FOG_KEY, 4, 128)!;
  const c = tex.context;
  const gr = c.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); // nothing at the top: no edge, however tall the band
  gr.addColorStop(0.75, 'rgba(255,255,255,0.85)');
  gr.addColorStop(0.85, 'rgba(255,255,255,0.7)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gr;
  c.fillRect(0, 0, 4, 128);
  tex.refresh();
}

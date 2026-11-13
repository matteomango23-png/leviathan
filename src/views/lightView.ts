// True darkness: a half-resolution mask filled with black by depth, with the lamp cone and a halo erased,
// then a warm glow added on top and a vignette (prototype/prova-realistica.html, "darkness + lamp").
import Phaser from 'phaser';
import { NIGHT_VISION } from '../data/abyss';
import { DIVER, LIGHT } from '../data/diver';
import { rampNumber } from '../systems/math';
import { depthMetres } from '../systems/world/zones';
import type { ViewInfo } from './backgroundView';
import { CONE_TEX, HALO_TEX, TEX } from './textures';
import { DELTA, WORLD } from '../data/worldLayout';
import { NIGHT } from '../data/daynight';
import { nightDarkAt } from '../systems/dayNight';
import type { Beam } from '../systems/ship/floodlight';

const NIGHT_KEY = 'night-grad';
const NIGHT_ROWS = 96;

/** Mixes two 0xRRGGBB colours (t = 0: a, 1: b). */
function mixColor(a: number, b: number, t: number): number {
  const ch = (c: number, sh: number): number => (c >> sh) & 255;
  const m = (sh: number): number => Math.round(ch(a, sh) + (ch(b, sh) - ch(a, sh)) * t) << sh;
  return m(16) | m(8) | m(0);
}

interface LampInfo {
  x: number; // world
  y: number;
  angle: number; // radians
  face: 1 | -1;
  /** Lamp upgrades: longer and wider cone. */
  lengthMult?: number;
  widthMult?: number;
}

export class LightView {
  private mask: Phaser.GameObjects.RenderTexture;
  private readonly warm: Phaser.GameObjects.Image;
  private readonly vignette: Phaser.GameObjects.Image;
  private readonly flash: Phaser.GameObjects.Rectangle;
  private maskSize = '';
  /** 0 by day … 1 at night: the darkness row by row by depth (lot N1b), the diver's halo smaller. */
  private night = 0;
  private readonly nightTex: Phaser.Textures.CanvasTexture;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
  ) {
    this.mask = this.makeMask(64, 64);
    this.nightTex = scene.textures.exists(NIGHT_KEY)
      ? (scene.textures.get(NIGHT_KEY) as Phaser.Textures.CanvasTexture)
      : scene.textures.createCanvas(NIGHT_KEY, 1, NIGHT_ROWS)!;
    this.warm = scene.add
      .image(0, 0, TEX.cone)
      .setOrigin(0, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(LIGHT.warmColor)
      .setAlpha(LIGHT.warmAlpha);
    this.vignette = scene.add.image(0, 0, TEX.vignette).setOrigin(0, 0).setAlpha(LIGHT.vignetteAlpha);
    this.flash = scene.add.rectangle(0, 0, 10, 10, 0x961414, 0).setOrigin(0, 0);
    layer.add([this.warm, this.vignette, this.flash]);
  }

  private makeMask(w: number, h: number): Phaser.GameObjects.RenderTexture {
    const rt = this.scene.add.renderTexture(0, 0, w, h).setOrigin(0, 0);
    this.layer.addAt(rt, 0);
    return rt;
  }

  /** The time of day for the next frames (systems/dayNight.ts nightness). */
  setNight(night: number): void {
    this.night = night;
  }

  /** The night's darkness as a column of rows down the screen (each row by its own depth), as a texture. */
  private paintNight(v: ViewInfo, color: number): void {
    const g = this.nightTex.context;
    const [r, gr, b] = [(color >> 16) & 255, (color >> 8) & 255, color & 255];
    g.clearRect(0, 0, 1, NIGHT_ROWS);
    for (let i = 0; i < NIGHT_ROWS; i++) {
      const wy = v.cy + (((i + 0.5) / NIGHT_ROWS) * v.h - v.h / 2) / v.zoom;
      const a = nightDarkAt((wy - WORLD.surfaceY) / WORLD.unitsPerMetre) * this.night;
      g.fillStyle = `rgba(${r},${gr},${b},${a.toFixed(3)})`;
      g.fillRect(0, i, 1, 1);
    }
    this.nightTex.refresh();
  }

  /** Screen darkness (0..1) at a world depth (without the murk of the Delta). */
  static darknessAt(worldY: number): number {
    return rampNumber(LIGHT.darknessByDepthM, depthMetres(worldY));
  }

  /**
   * @param flash red overlay strength (hurt, low oxygen), 0..1
   * @param fade black fade (death), 0..1
   * @param murk murky water (the Delta), 0..1: darker and brownish
   * @param weatherDim extra darkness from clouds and storms, already faded with depth
   */
  update(
    v: ViewInfo,
    lamp: LampInfo,
    flash: number,
    fade: number,
    glows: { x: number; y: number; r: number; a?: number }[] = [],
    murk = 0,
    weatherDim = 0,
    /** The abyssal submarine's night vision (0 … 1): the darkness opens (views/nightVisionView.ts). */
    night = 0,
    /** Floodlights and the light under the ship: beams, not round spots (lot N1b: no circles in the dark). */
    beams: Beam[] = [],
  ): void {
    const s = LIGHT.maskScale;
    const mw = Math.ceil(v.w * s);
    const mh = Math.ceil(v.h * s);
    const size = `${mw}x${mh}`;
    if (size !== this.maskSize) {
      this.maskSize = size;
      this.mask.destroy();
      this.mask = this.makeMask(mw, mh);
    }
    this.mask.setScale(v.w / this.mask.width, v.h / this.mask.height);

    const sx = v.w / 2 + (lamp.x - v.cx) * v.zoom;
    const sy = v.h / 2 + (lamp.y - v.cy) * v.zoom;
    const diverPx = DIVER.lengthUnits * v.zoom;
    const lx = sx + Math.cos(lamp.angle) * diverPx * LIGHT.coneOffsetDiver;
    const ly = sy + Math.sin(lamp.angle) * diverPx * LIGHT.coneOffsetDiver;
    const coneLen = v.w * LIGHT.coneLengthView * (lamp.lengthMult ?? 1);
    const coneScale = (coneLen * s) / CONE_TEX.length;

    const dark =
      Math.min(1, LightView.darknessAt(v.cy) + DELTA.murk.darkness * murk + weatherDim) *
      (1 - NIGHT_VISION.clear * night);
    const color = murk > 0 ? mixColor(LIGHT.darkColor, DELTA.murk.tint, murk) : LIGHT.darkColor;
    const rt = this.mask;
    rt.clear();
    rt.fill(color, dark);
    // the night over it, row by row by depth (opened by the night vision as the day's darkness is)
    if (this.night > 0.005) {
      this.paintNight(v, color);
      rt.stamp(NIGHT_KEY, undefined, 0, 0, {
        originX: 0,
        originY: 0,
        scaleX: mw,
        scaleY: mh / NIGHT_ROWS,
        alpha: 1 - NIGHT_VISION.clear * night,
      });
    }
    const halo = 1 - (1 - NIGHT.haloMult) * this.night;
    rt.stamp(TEX.halo, undefined, sx * s, sy * s, {
      scale: (diverPx * LIGHT.haloRadiusDiver * halo * s) / HALO_TEX.radius,
      blendMode: Phaser.BlendModes.ERASE,
    });
    for (const gl of glows) {
      const gx = v.w / 2 + (gl.x - v.cx) * v.zoom;
      const gy = v.h / 2 + (gl.y - v.cy) * v.zoom;
      const r = gl.r * v.zoom;
      if (gx < -r || gy < -r || gx > v.w + r || gy > v.h + r) continue;
      rt.stamp(TEX.halo, undefined, gx * s, gy * s, {
        scale: (r * s) / HALO_TEX.radius,
        alpha: gl.a ?? 0.8,
        blendMode: Phaser.BlendModes.ERASE,
      });
    }
    for (const bm of beams) {
      const k = (bm.len * v.zoom * s) / CONE_TEX.length;
      rt.stamp(
        TEX.cone,
        undefined,
        (v.w / 2 + (bm.x - v.cx) * v.zoom) * s,
        (v.h / 2 + (bm.y - v.cy) * v.zoom) * s,
        {
          originX: 0,
          originY: 0.5,
          rotation: bm.angle,
          scaleX: k,
          scaleY: k * bm.width,
          alpha: 0.9,
          blendMode: Phaser.BlendModes.ERASE,
        },
      );
    }
    rt.stamp(TEX.cone, undefined, lx * s, ly * s, {
      originX: 0,
      originY: 0.5,
      rotation: lamp.angle,
      scaleX: coneScale,
      scaleY: coneScale * (lamp.widthMult ?? 1),
      blendMode: Phaser.BlendModes.ERASE,
    });
    rt.render();

    // by night the lamps' light is warmer and shows more (owner, 13 novembre 2026: "un pochino sul giallo")
    this.warm
      .setTint(mixColor(LIGHT.warmColor, NIGHT.lampWarm, this.night))
      .setAlpha(LIGHT.warmAlpha + (NIGHT.lampWarmAlpha - LIGHT.warmAlpha) * this.night)
      .setPosition(lx, ly)
      .setRotation(lamp.angle)
      .setScale(
        (coneLen * 0.95) / CONE_TEX.length,
        ((coneLen * 0.95) / CONE_TEX.length) * (lamp.widthMult ?? 1),
      );
    this.vignette.setDisplaySize(v.w, v.h);
    this.flash.setSize(v.w, v.h);
    if (fade > 0) this.flash.setFillStyle(0x000000, fade);
    else this.flash.setFillStyle(0x961414, flash * 0.45);
  }
}

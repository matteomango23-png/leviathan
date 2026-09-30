// True darkness: a half-resolution mask filled with black by depth, with the lamp cone and a halo erased,
// then a warm glow added on top and a vignette (prototype/prova-realistica.html, "darkness + lamp").
import Phaser from 'phaser';
import { DIVER, LIGHT } from '../data/diver';
import { rampNumber } from '../systems/math';
import { depthMetres } from '../systems/world/zones';
import type { ViewInfo } from './backgroundView';
import { CONE_TEX, HALO_TEX, TEX } from './textures';

export interface LampInfo {
  x: number; // world
  y: number;
  angle: number; // radians
  face: 1 | -1;
}

export class LightView {
  private mask: Phaser.GameObjects.RenderTexture;
  private readonly warm: Phaser.GameObjects.Image;
  private readonly vignette: Phaser.GameObjects.Image;
  private readonly flash: Phaser.GameObjects.Rectangle;
  private maskSize = '';

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
  ) {
    this.mask = this.makeMask(64, 64);
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

  /** Screen darkness (0..1) at a world depth. */
  static darknessAt(worldY: number): number {
    return rampNumber(LIGHT.darknessByDepthM, depthMetres(worldY));
  }

  /**
   * @param flash red overlay strength (hurt, low oxygen), 0..1
   * @param fade black fade (death), 0..1
   */
  update(v: ViewInfo, lamp: LampInfo, flash: number, fade: number): void {
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
    const coneLen = v.w * LIGHT.coneLengthView;

    const dark = LightView.darknessAt(v.cy);
    const rt = this.mask;
    rt.clear();
    rt.fill(LIGHT.darkColor, dark);
    rt.stamp(TEX.halo, undefined, sx * s, sy * s, {
      scale: (diverPx * LIGHT.haloRadiusDiver * s) / HALO_TEX.radius,
      blendMode: Phaser.BlendModes.ERASE,
    });
    rt.stamp(TEX.cone, undefined, lx * s, ly * s, {
      originX: 0,
      originY: 0.5,
      rotation: lamp.angle,
      scale: (coneLen * s) / CONE_TEX.length,
      blendMode: Phaser.BlendModes.ERASE,
    });
    rt.render();

    this.warm
      .setPosition(lx, ly)
      .setRotation(lamp.angle)
      .setScale((coneLen * 0.95) / CONE_TEX.length);
    this.vignette.setDisplaySize(v.w, v.h);
    this.flash.setSize(v.w, v.h);
    if (fade > 0) this.flash.setFillStyle(0x000000, fade);
    else this.flash.setFillStyle(0x961414, flash * 0.45);
  }
}

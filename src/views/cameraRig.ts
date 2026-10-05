// Three cameras drawn in order: background (screen space), world (zoomed, follows the diver),
// overlay (screen space: darkness and light). Each only draws its own layer.
import Phaser from 'phaser';
import { CAMERA } from '../data/diver';
import type { ViewInfo } from './backgroundView';

export interface Layers {
  bg: Phaser.GameObjects.Layer;
  world: Phaser.GameObjects.Layer;
  front: Phaser.GameObjects.Layer;
  overlay: Phaser.GameObjects.Layer;
}

export class CameraRig {
  readonly layers: Layers;
  private readonly bgCam: Phaser.Cameras.Scene2D.Camera;
  private readonly worldCam: Phaser.Cameras.Scene2D.Camera;
  private readonly overlayCam: Phaser.Cameras.Scene2D.Camera;
  cx: number;
  cy: number;

  constructor(
    scene: Phaser.Scene,
    private readonly worldW: number,
    private readonly worldH: number,
    startX: number,
    startY: number,
  ) {
    this.layers = {
      bg: scene.add.layer(),
      world: scene.add.layer(),
      front: scene.add.layer(),
      overlay: scene.add.layer(),
    };
    const { bg, world, front, overlay } = this.layers;
    this.bgCam = scene.cameras.main;
    this.worldCam = scene.cameras.add(0, 0, scene.scale.width, scene.scale.height);
    this.overlayCam = scene.cameras.add(0, 0, scene.scale.width, scene.scale.height);
    this.bgCam.ignore([world, front, overlay]);
    this.worldCam.ignore([bg, overlay]);
    this.overlayCam.ignore([bg, world, front]);
    this.cx = startX;
    this.cy = startY;
    this.resize(scene.scale.width, scene.scale.height);
  }

  get zoom(): number {
    return this.worldCam.zoom;
  }

  /** How much sea is visible vertically, and how far above the surface the view may go (wider at the helm). */
  private viewH: number = CAMERA.viewHeightUnits;
  private minY: number = CAMERA.minY;

  resize(w: number, h: number): void {
    for (const c of [this.bgCam, this.worldCam, this.overlayCam]) c.setSize(w, h);
    this.worldCam.setZoom(h / this.viewH);
    this.clampAndApply();
  }

  /** A glide from one view to another (boarding, docking): from where the camera is, along one curve. */
  private blend: { t: number; cx: number; cy: number; viewH: number; minY: number } | null = null;
  private blendE = 1;

  /** Starts a glide: the next setView/follow calls move zoom and position together, over CAMERA.boardBlend. */
  startBlend(): void {
    this.blend = { t: 0, cx: this.cx, cy: this.cy, viewH: this.viewH, minY: this.minY };
  }

  /** Eases the view to this height (world units) and top limit: wider at the helm of the ship. */
  setView(viewHeight: number, minY: number, dt: number, snap = false): void {
    const b = this.blend;
    if (b && !snap) {
      b.t = Math.min(1, b.t + dt / CAMERA.boardBlend);
      const e = (this.blendE = b.t * b.t * (3 - 2 * b.t));
      this.viewH = b.viewH + (viewHeight - b.viewH) * e;
      this.minY = b.minY + (minY - b.minY) * e;
      this.worldCam.setZoom(this.worldCam.height / this.viewH);
      this.clampAndApply();
      return;
    }
    const k = snap ? 1 : Math.min(1, dt * 1.6);
    if (Math.abs(viewHeight - this.viewH) < 0.05 && Math.abs(minY - this.minY) < 0.05) return;
    this.viewH += (viewHeight - this.viewH) * k;
    this.minY += (minY - this.minY) * k;
    this.worldCam.setZoom(this.worldCam.height / this.viewH);
    this.clampAndApply();
  }

  private clampAndApply(): void {
    const z = this.worldCam.zoom;
    const halfW = this.worldCam.width / 2 / z;
    const halfH = this.worldCam.height / 2 / z;
    this.cx = Phaser.Math.Clamp(this.cx, halfW, Math.max(halfW, this.worldW - halfW));
    this.cy = Phaser.Math.Clamp(this.cy, this.minY + halfH, Math.max(this.minY + halfH, this.worldH - halfH));
    this.worldCam.centerOn(this.cx, this.cy);
  }

  /** Eases towards a target; `snap` jumps straight there (start, respawn, import). */
  follow(tx: number, ty: number, dt: number, snap = false): void {
    const b = this.blend;
    if (b && !snap) {
      this.cx = b.cx + (tx - b.cx) * this.blendE;
      this.cy = b.cy + (ty - b.cy) * this.blendE;
      if (b.t >= 1) this.blend = null;
      this.clampAndApply();
      return;
    }
    if (snap) this.blend = null;
    const k = snap ? 1 : Math.min(1, dt * CAMERA.follow);
    this.cx += (tx - this.cx) * k;
    this.cy += (ty - this.cy) * k;
    this.clampAndApply();
  }

  /** A jolt of the view; `strength` 1 = a hit on the diver, less for lighter knocks. */
  shake(strength = 1): void {
    this.worldCam.shake(120 + 80 * strength, 0.004 * strength);
  }

  /** The world rectangle currently on screen. */
  worldView(): Phaser.Geom.Rectangle {
    const z = this.worldCam.zoom;
    const w = this.worldCam.width / z;
    const h = this.worldCam.height / z;
    return new Phaser.Geom.Rectangle(this.cx - w / 2, this.cy - h / 2, w, h);
  }

  viewInfo(): ViewInfo {
    return {
      cx: this.cx,
      cy: this.cy,
      zoom: this.worldCam.zoom,
      w: this.worldCam.width,
      h: this.worldCam.height,
    };
  }

  /** Screen pixel (canvas pixels) → world point. */
  toWorld(px: number, py: number): { x: number; y: number } {
    const z = this.worldCam.zoom;
    return {
      x: this.cx + (px - this.worldCam.width / 2) / z,
      y: this.cy + (py - this.worldCam.height / 2) / z,
    };
  }
}

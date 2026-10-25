// The abyssal submarine's night vision (owner, 23 ottobre 2026; data/abyss.ts NIGHT_VISION): the whole screen green
// like a military visor, a little simplified (fine lines, a light grain), the darkness opened (views/lightView.ts),
// and a green sonar wave going out all round every few seconds, lighting for a moment the rock it touches. Drawn
// over the darkness, in screen pixels like it.
import Phaser from 'phaser';
import { NIGHT_VISION as NV } from '../data/abyss';
import { sonarEdges } from '../systems/subSonar';
import type { TileMap } from '../systems/world/tileMap';
import type { ViewInfo } from './backgroundView';

/** Samples across the wave's reach, for the rock it lights: close together, so the soft spots overlap into one
 *  glowing line along the rock (owner's iron rule: no dots, no circles). */
const CELLS = Math.round((2 * NV.waveReach) / NV.spotStep);
/** At most this many lit spots at once. */
const MAX_SPOTS = 1400;

interface Hit {
  x: number;
  y: number;
  /** Units from where the wave started. */
  d: number;
}

/** A soft green spot, bright in the middle, fading to nothing (no edge). */
function spotTexture(scene: Phaser.Scene): string {
  const key = 'nv-spot';
  if (scene.textures.exists(key)) return key;
  const n = 32;
  const tex = scene.textures.createCanvas(key, n, n)!;
  const g = tex.getContext();
  const grad = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  grad.addColorStop(0, 'rgba(170,255,190,1)');
  grad.addColorStop(0.35, 'rgba(60,255,120,0.45)');
  grad.addColorStop(1, 'rgba(40,255,100,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, n, n);
  tex.refresh();
  return key;
}

/** The visor's fine lines and grain, made once and slid each frame. */
function visorTexture(scene: Phaser.Scene, key: string, grain: boolean): string {
  if (scene.textures.exists(key)) return key;
  const n = 128;
  const tex = scene.textures.createCanvas(key, n, n)!;
  const g = tex.getContext();
  const img = g.createImageData(n, n);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const o = (y * n + x) * 4;
      const v = grain ? Math.random() * 255 : y % 3 === 0 ? 255 : 0;
      img.data.set([v, v, v, grain ? v : 255], o);
    }
  g.putImageData(img, 0, 0);
  tex.refresh();
  return key;
}

export class NightVisionView {
  private readonly tint: Phaser.GameObjects.Rectangle;
  private readonly glowWash: Phaser.GameObjects.Rectangle;
  private readonly lines: Phaser.GameObjects.TileSprite;
  private readonly grain: Phaser.GameObjects.TileSprite;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly spots: Phaser.GameObjects.Image[] = [];
  private wave: { x: number; y: number; t: number; hits: Hit[] } | null = null;
  private next = 0;
  /** 0 … 1 while it switches on (a short fade, never a cut). */
  private on = 0;

  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    private readonly map: TileMap,
  ) {
    // everything green: the scene multiplied by green, then a faint green wash so the darkest stays green too
    this.tint = scene.add
      .rectangle(0, 0, 1, 1, NV.tint)
      .setOrigin(0)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.glowWash = scene.add
      .rectangle(0, 0, 1, 1, 0x0b3a18)
      .setOrigin(0)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.lines = scene.add.tileSprite(0, 0, 1, 1, visorTexture(scene, 'nv-lines', false)).setOrigin(0);
    this.lines.setBlendMode(Phaser.BlendModes.MULTIPLY).setTint(0x2a6a3a);
    this.grain = scene.add.tileSprite(0, 0, 1, 1, visorTexture(scene, 'nv-grain', true)).setOrigin(0);
    this.grain.setBlendMode(Phaser.BlendModes.ADD).setTint(0x3aff7a);
    this.ring = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    const tex = spotTexture(scene);
    for (let i = 0; i < MAX_SPOTS; i++)
      this.spots.push(scene.add.image(0, 0, tex).setBlendMode(Phaser.BlendModes.ADD).setVisible(false));
    layer.add([this.tint, this.glowWash, this.lines, this.grain, this.ring, ...this.spots]);
    this.hide();
  }

  private hide(): void {
    for (const o of [this.tint, this.glowWash, this.lines, this.grain, this.ring]) o.setVisible(false);
    for (const s of this.spots) s.setVisible(false);
  }

  /** How much it is on now (0 … 1), for the darkness to open as much. */
  get share(): number {
    return this.on;
  }

  /** @param from the submarine (the wave starts there); null: off */
  update(v: ViewInfo, from: { x: number; y: number } | null, time: number, dt: number): void {
    this.on = Math.max(0, Math.min(1, this.on + (from ? dt : -dt) * 4));
    if (this.on <= 0) {
      this.hide();
      this.wave = null;
      return;
    }
    const k = this.on;
    // the visor: a green screen, its fine lines and grain
    for (const r of [this.tint, this.glowWash]) r.setVisible(true).setSize(v.w, v.h);
    this.tint.setFillStyle(mix(0xffffff, NV.tint, k));
    this.glowWash.setAlpha(k);
    this.lines
      .setVisible(true)
      .setSize(v.w, v.h)
      .setAlpha(NV.lines * k);
    this.grain
      .setVisible(true)
      .setSize(v.w, v.h)
      .setAlpha(NV.grain * k)
      .setTilePosition(Math.random() * 128, Math.random() * 128);
    // the sonar wave: a new one every few seconds from the submarine
    if (from && time >= this.next) {
      this.next = time + NV.waveEvery;
      const hits = sonarEdges(this.map, from.x, from.y, NV.waveReach, CELLS).map((e) => ({
        x: from.x + e.x * NV.waveReach,
        y: from.y + e.y * NV.waveReach,
        d: Math.hypot(e.x, e.y) * NV.waveReach,
      }));
      this.wave = { x: from.x, y: from.y, t: time, hits };
    }
    this.ring.clear();
    let n = 0;
    const w = this.wave;
    if (w) {
      const radius = (time - w.t) * NV.waveSpeed;
      const sx = v.w / 2 + (w.x - v.cx) * v.zoom;
      const sy = v.h / 2 + (w.y - v.cy) * v.zoom;
      // the ring itself, faint, fading as it goes
      if (radius < NV.waveReach) {
        const fadeOut = 1 - radius / NV.waveReach;
        for (const [wid, a] of [
          [18, 0.03],
          [10, 0.05],
          [5, 0.07],
          [2, 0.1],
        ] as const)
          this.ring.lineStyle(wid, NV.tint, a * fadeOut * k).strokeCircle(sx, sy, radius * v.zoom);
      }
      // the rock it has just touched glows, then fades
      const size = NV.spotSize * v.zoom;
      for (const h of w.hits) {
        const since = (radius - h.d) / NV.waveSpeed;
        if (since < 0 || since > NV.glowSeconds || n >= MAX_SPOTS) continue;
        const px = v.w / 2 + (h.x - v.cx) * v.zoom;
        const py = v.h / 2 + (h.y - v.cy) * v.zoom;
        if (px < -size || py < -size || px > v.w + size || py > v.h + size) continue;
        this.spots[n++]!.setVisible(true)
          .setPosition(px, py)
          .setDisplaySize(size, size)
          .setAlpha((1 - since / NV.glowSeconds) * NV.spotAlpha * k);
      }
      if (radius > NV.waveReach + NV.glowSeconds * NV.waveSpeed) this.wave = null;
    }
    this.ring.setVisible(true);
    for (let i = n; i < this.spots.length; i++) this.spots[i]!.setVisible(false);
  }
}

/** A colour between two (0 … 1). */
function mix(a: number, b: number, t: number): number {
  const ch = (s: number): number => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

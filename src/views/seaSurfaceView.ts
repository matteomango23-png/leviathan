// The sea's surface with its waves (owner, 9 ottobre 2026: "il mare deve essere più vivo", and no straight line of
// water anywhere). The painted background stops its water at the deepest a trough can reach (backgroundView, with
// troughDepth); from there up to the wave line this draws the sea itself, solid, in the water's own colour, so the
// only edge is the moving surface. Drawn behind the vehicles, which ride the same waves (systems/ride.ts).
import Phaser from 'phaser';
import { SEA } from '../data/diver';
import { WORLD } from '../data/worldLayout';
import { rampColor } from '../systems/math';
import { troughDepth, waveHeight, type SeaWeather } from '../systems/sea';

const STEP = 4; // units between the points of the wave line

export class SeaSurfaceView {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.g = scene.add.graphics();
    layer.add(this.g);
  }

  update(view: Phaser.Geom.Rectangle, time: number, sea: SeaWeather): void {
    const g = this.g.clear();
    const y0 = WORLD.surfaceY;
    const deep = y0 + troughDepth(sea);
    if (view.y > deep + 4 || view.bottom < y0 - 60) return;
    const c = rampColor(SEA.waterByY, deep + 6);
    g.fillStyle(Phaser.Display.Color.GetColor(c[0], c[1], c[2]), 1);
    const x0 = Math.floor(view.x / STEP) * STEP - STEP;
    const line: { x: number; y: number }[] = [];
    for (let x = x0; x <= view.right + STEP; x += STEP) {
      const a = y0 - waveHeight(x, time, sea);
      const b = y0 - waveHeight(x + STEP, time, sea);
      line.push({ x, y: a });
      // well below the background's edge (its painted rows are coarse), so no gap or seam shows between them
      g.fillTriangle(x, a, x + STEP, b, x + STEP, deep + 12);
      g.fillTriangle(x, a, x + STEP, deep + 12, x, deep + 12);
    }
    const s = Phaser.Display.Color.RGBStringToColor(SEA.surfaceLine);
    g.lineStyle(0.8, s.color, s.alphaGL);
    g.beginPath();
    line.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
    g.strokePath();
  }
}

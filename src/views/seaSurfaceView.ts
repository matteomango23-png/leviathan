// The sea's surface with its waves (owner, 9 ottobre 2026: "il mare deve essere più vivo"): where a crest rises
// above the resting line it is filled with sea, where a trough dips below it the sky shows, so in a storm the sea
// visibly heaves. Drawn behind the vehicles (they ride the same waves: systems/sea.ts). Look only.
import Phaser from 'phaser';
import { SEA } from '../data/diver';
import { WEATHER } from '../data/weather';
import { WORLD } from '../data/worldLayout';
import { rampColor } from '../systems/math';
import { waveHeight, type SeaWeather } from '../systems/sea';

const STEP = 4; // units between the points of the wave line

export class SeaSurfaceView {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.g = scene.add.graphics();
    layer.add(this.g);
  }

  /** @param clouds the weather's cloud cover (the sky in the troughs darkens with it) */
  update(view: Phaser.Geom.Rectangle, time: number, sea: SeaWeather, clouds: number): void {
    const g = this.g.clear();
    const y0 = WORLD.surfaceY;
    if (view.y > y0 + 40 || view.bottom < y0 - 40) return;
    const water = rampColor(SEA.waterByY, y0 + 12);
    const sky0 = Phaser.Display.Color.HexStringToColor(SEA.skyBottom);
    const sky1 = Phaser.Display.Color.HexStringToColor(WEATHER.skyStorm.bottom);
    const mix = (a: number, b: number): number => Math.round(a + (b - a) * clouds);
    const sky = Phaser.Display.Color.GetColor(
      mix(sky0.red, sky1.red),
      mix(sky0.green, sky1.green),
      mix(sky0.blue, sky1.blue),
    );
    const sea0 = Phaser.Display.Color.GetColor(water[0], water[1], water[2]);
    const x0 = Math.floor(view.x / STEP) * STEP - STEP;
    // a strip between the resting line and the wave line, as two triangles
    const strip = (x: number, ya: number, yb: number): void => {
      g.fillTriangle(x, y0, x, y0 - ya, x + STEP, y0 - yb);
      g.fillTriangle(x, y0, x + STEP, y0 - yb, x + STEP, y0);
    };
    // crests: sea above the line; troughs: sky below it; then the bright line of the surface itself
    const line: { x: number; y: number }[] = [];
    for (let x = x0; x <= view.right + STEP; x += STEP) {
      line.push({ x, y: y0 - waveHeight(x, time, sea) });
      const a = waveHeight(x, time, sea);
      const b = waveHeight(x + STEP, time, sea);
      if (a > 0 || b > 0) {
        g.fillStyle(sea0, 1);
        strip(x, Math.max(0, a), Math.max(0, b));
      }
      if (a < 0 || b < 0) {
        g.fillStyle(sky, 1);
        strip(x, Math.min(0, a), Math.min(0, b));
      }
    }
    const c = Phaser.Display.Color.RGBStringToColor(SEA.surfaceLine);
    g.lineStyle(0.8, c.color, c.alphaGL);
    g.beginPath();
    line.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
    g.strokePath();
  }
}

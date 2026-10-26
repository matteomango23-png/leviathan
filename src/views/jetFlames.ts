// The reactors' flames of the abyssal ship and submarine (owner, 25 ottobre 2026: "focherelli stile reattore
// azzurrino viola, tipo quelli dei jet", only while the engine runs): a soft flame out of each nozzle, white-blue at
// the nozzle, then blue and violet, fading to nothing (no edge), flickering, longer with more throttle. Drawn behind
// the hull, so the hull covers its root. The vehicles' views place them (shipView.ts, submarineView.ts).
import Phaser from 'phaser';
import { JET_FLAME as J } from '../data/ship';

/** One nozzle now: where it is (world), which way the flame goes (radians), how wide the nozzle is, how lit. */
export interface Jet {
  x: number;
  y: number;
  angle: number;
  width: number;
  /** 0 … 1: off … full throttle. */
  power: number;
}

/** The flame, made once: bright at its left middle, fading out to the right and to the sides. */
function flameTexture(scene: Phaser.Scene): string {
  const key = 'jet-flame';
  if (scene.textures.exists(key)) return key;
  const w = 128;
  const h = 48;
  const tex = scene.textures.createCanvas(key, w, h)!;
  const g = tex.getContext();
  g.save();
  g.scale(1, h / 2 / w);
  const grad = g.createRadialGradient(0, w, 0, 0, w, w);
  grad.addColorStop(0, 'rgba(235,248,255,1)');
  grad.addColorStop(0.18, 'rgba(110,205,255,0.95)');
  grad.addColorStop(0.5, 'rgba(140,96,255,0.5)');
  grad.addColorStop(1, 'rgba(110,60,220,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, 2 * w);
  g.restore();
  tex.refresh();
  return key;
}

export class JetFlames {
  private readonly images: Phaser.GameObjects.Image[];

  /** Made before the vehicle's pictures, so they stay behind it (the layer draws in the order things are added). */
  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    const key = flameTexture(scene);
    this.images = Array.from({ length: J.most * 2 }, () =>
      scene.add.image(0, 0, key).setOrigin(0, 0.5).setBlendMode(Phaser.BlendModes.ADD).setVisible(false),
    );
    layer.add(this.images);
  }

  /** Each jet a flame and a shorter brighter core; the others hidden. */
  update(jets: Jet[], time: number): void {
    let n = 0;
    const image = (): Phaser.GameObjects.Image => this.images[n++]!.setVisible(true);
    jets.slice(0, J.most).forEach((j, i) => {
      if (j.power <= 0.01) return;
      const flicker = 1 + J.flicker * (Math.sin(time * 31 + i * 2.1) * 0.6 + Math.sin(time * 53 + i) * 0.4);
      const len = j.width * (J.idleLength + (J.fullLength - J.idleLength) * j.power) * flicker;
      for (const [lenK, widK, a] of [
        [1, 1, J.alpha],
        [0.45, 0.6, J.alpha],
      ] as const)
        image()
          .setPosition(j.x, j.y)
          .setRotation(j.angle)
          .setDisplaySize(len * lenK, j.width * J.spread * widK)
          .setAlpha(a * Math.min(1, j.power * 3));
    });
    for (let i = n; i < this.images.length; i++) this.images[i]!.setVisible(false);
  }
}

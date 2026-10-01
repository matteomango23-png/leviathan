// The taming shell (like a Poké Ball): flies in an arc spinning, opens in a burst of light, the beast turns
// into light and is drawn in, the shell falls on the ground and shakes; it holds with a golden flash or
// breaks open. Uses the painted shell (`item-conchiglia`) when it exists, otherwise a drawn spiral shell.
import Phaser from 'phaser';
import { tweenTo } from './tween';

export const SHELL_KEY = 'item-conchiglia';
export const SHELL_OPEN_KEY = 'item-conchiglia-aperta';

export class TameShell {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly image: Phaser.GameObjects.Image;
  private s: {
    x: number;
    y: number;
    r: number;
    wiggle: number;
    glow: number;
    spin: number;
    open: number;
  } | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    this.glow = scene.add.graphics().setDepth(18).setBlendMode(Phaser.BlendModes.ADD);
    this.g = scene.add.graphics().setDepth(19);
    this.image = scene.add.image(0, 0, '__WHITE').setDepth(19).setVisible(false);
  }

  private tween(props: Record<string, number>, ms: number, ease = 'Sine.easeInOut'): Promise<void> {
    return tweenTo(this.scene, this.s!, props, ms, false, ease);
  }

  /** Throws from `from` to `to` (screen pixels); `onOpen` runs when it opens over the beast. */
  async throw(
    from: { x: number; y: number },
    to: { x: number; y: number },
    ground: number,
    onOpen: () => Promise<void>,
  ): Promise<void> {
    const h = this.scene.scale.height;
    this.s = { x: from.x, y: from.y, r: h * 0.04, wiggle: 0, glow: 0, spin: 0, open: 0 };
    const arc = { k: 0 };
    await new Promise<void>((done) =>
      this.scene.tweens.add({
        targets: arc,
        k: 1,
        duration: 650,
        ease: 'Sine.easeOut',
        onUpdate: () => {
          const s = this.s!;
          s.x = from.x + (to.x - from.x) * arc.k;
          s.y = from.y + (to.y - from.y) * arc.k - Math.sin(arc.k * Math.PI) * h * 0.28;
          s.spin = arc.k * 14;
        },
        onComplete: () => done(),
      }),
    );
    await this.tween({ open: 1, glow: 1 }, 160);
    await onOpen();
    await this.tween({ open: 0, glow: 0.3 }, 140);
    await this.tween({ y: ground }, 380, 'Bounce.easeOut');
  }

  async shake(): Promise<void> {
    await this.tween({ wiggle: Math.PI * 2 }, 420);
    if (this.s) this.s.wiggle = 0;
  }

  async end(caught: boolean): Promise<void> {
    if (caught) await this.tween({ glow: 1.4 }, 300);
    else await this.tween({ open: 1, glow: 1 }, 150);
    await this.tween({ glow: 0, r: 0 }, 250);
    this.s = null;
  }

  update(): void {
    const g = this.g.clear();
    const glow = this.glow.clear();
    const s = this.s;
    this.image.setVisible(false);
    if (!s || s.r <= 0) return;
    const x = s.x + Math.sin(s.wiggle) * s.r * 0.5;
    const tilt = Math.sin(s.wiggle) * 0.4 + (s.spin % (Math.PI * 2));
    glow.fillStyle(0x7ff3e0, 0.25 * s.glow);
    glow.fillCircle(x, s.y, s.r * (2 + s.glow * 2.5));
    glow.fillStyle(0xffffff, 0.5 * s.open);
    glow.fillCircle(x, s.y, s.r * 1.2 * s.open);
    const key = s.open > 0.5 && this.scene.textures.exists(SHELL_OPEN_KEY) ? SHELL_OPEN_KEY : SHELL_KEY;
    if (this.scene.textures.exists(key)) {
      this.image
        .setTexture(key)
        .setVisible(true)
        .setPosition(x, s.y)
        .setRotation(tilt)
        .setScale((s.r * 2.6) / this.image.width);
      return;
    }
    // drawn shell: a pale cone with bronze bands and a teal rune glowing
    const c = Math.cos(tilt);
    g.fillStyle(0x2a1d12, 0.6);
    g.fillEllipse(x + 2, s.y + s.r * 0.15, s.r * 2, s.r * 1.4);
    g.fillStyle(0xf0dcb8, 1);
    g.fillEllipse(x, s.y, s.r * 2, s.r * 1.45);
    g.lineStyle(Math.max(1.5, s.r * 0.14), 0xa0763e, 1);
    for (let k = 1; k <= 3; k++) g.strokeCircle(x + c * s.r * 0.18, s.y, s.r * (0.82 - k * 0.2));
    g.fillStyle(0x5ff3d6, 0.6 + 0.4 * s.glow);
    g.fillCircle(x + c * s.r * 0.18, s.y, s.r * 0.12);
  }
}

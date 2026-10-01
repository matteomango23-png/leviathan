// What the battle looks like: a dark sea with light from above and a sea floor, the wild beast up on the
// right facing left and yours lower on the left facing right (like Pokémon), both swimming in place along
// the spine. Lunges, hits with numbers, fainting, the dodge ring around your beast, the taming shell.
import Phaser from 'phaser';
import { formLengthM, formKey, type BeastForm } from '../systems/beasts/forms';
import { ringProgress, type DodgeRing } from '../systems/battle/dodge';
import type { Side } from '../systems/battle/battle';
import { BeastSprite, resolveSpriteKey } from './beastView';

interface Pose {
  form: BeastForm | null;
  dx: number;
  dy: number;
  flash: number;
  alpha: number;
  jaw: number;
  phase: number;
}

const newPose = (): Pose => ({ form: null, dx: 0, dy: 0, flash: 0, alpha: 1, jaw: 0, phase: 0 });

export class BattleView {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly fx: Phaser.GameObjects.Graphics;
  private readonly sprites: Record<Side, BeastSprite>;
  private readonly poses: Record<Side, Pose> = { you: newPose(), foe: newPose() };
  private readonly motes: { x: number; y: number; s: number }[] = [];
  private shell: { t: number; x: number; y: number; wiggle: number; glow: number } | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    this.bg = scene.add.graphics();
    const layer = scene.add.layer();
    this.sprites = { foe: new BeastSprite(scene, layer), you: new BeastSprite(scene, layer) };
    this.fx = scene.add.graphics();
    for (let i = 0; i < 40; i++)
      this.motes.push({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random() });
  }

  private get w(): number {
    return this.scene.scale.width;
  }
  private get h(): number {
    return this.scene.scale.height;
  }

  /** Where each beast swims (screen pixels). */
  anchor(side: Side): { x: number; y: number } {
    return side === 'foe' ? { x: this.w * 0.68, y: this.h * 0.36 } : { x: this.w * 0.3, y: this.h * 0.64 };
  }

  private lengthPx(side: Side, form: BeastForm): number {
    const L = this.w * 0.075 * formLengthM(form);
    const px = Math.max(this.w * 0.17, Math.min(this.w * 0.4, L));
    return side === 'you' ? px * 1.1 : px; // yours is a little closer
  }

  setFighter(side: Side, form: BeastForm): void {
    Object.assign(this.poses[side], newPose(), { form });
  }

  private drawSea(time: number): void {
    const g = this.bg.clear();
    const { w, h } = this;
    const bands = 18;
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(0x0e3a44),
        Phaser.Display.Color.ValueToColor(0x020a10),
        100,
        t * 100,
      );
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
      g.fillRect(0, (h * i) / bands, w, h / bands + 1);
    }
    // light from above
    for (let i = 0; i < 5; i++) {
      const x = w * (0.1 + i * 0.22) + Math.sin(time * 0.3 + i) * w * 0.03;
      g.fillStyle(0x9fd6dc, 0.035);
      g.fillTriangle(x - w * 0.03, 0, x + w * 0.05, 0, x + w * 0.12, h * 0.9);
    }
    // the sea floor where your beast swims
    g.fillStyle(0x050c10, 1);
    g.fillEllipse(w * 0.3, h * 1.02, w * 0.9, h * 0.32);
    g.fillStyle(0x07141a, 1);
    g.fillEllipse(w * 0.72, h * 0.6, w * 0.5, h * 0.12);
    // drifting marine snow
    g.fillStyle(0xcfe6e8, 0.35);
    for (const m of this.motes) {
      const y = (m.y + time * 0.012 * m.s) % 1;
      g.fillCircle(m.x * w + Math.sin(time * 0.5 + m.x * 9) * 6, y * h, m.s * 1.4);
    }
  }

  update(dt: number, time: number, ring: { r: DodgeRing; t: number } | null): void {
    this.drawSea(time);
    for (const side of ['foe', 'you'] as Side[]) {
      const p = this.poses[side];
      const s = this.sprites[side];
      if (!p.form) {
        s.hide();
        continue;
      }
      p.phase += dt * 2.2;
      p.flash = Math.max(0, p.flash - dt);
      p.jaw = Math.max(0, p.jaw - dt);
      const a = this.anchor(side);
      const key = resolveSpriteKey(formKey(p.form), p.form.speciesId) ?? formKey(p.form);
      s.update({
        key,
        x: a.x + p.dx,
        y: a.y + p.dy + Math.sin(p.phase * 0.6) * this.h * 0.01,
        face: side === 'foe' ? -1 : 1,
        pitch: Math.sin(p.phase * 0.4) * 0.05,
        pitchV: 0,
        phase: p.phase,
        jaw: p.jaw,
        length: this.lengthPx(side, p.form),
        flash: p.flash,
        alpha: p.alpha,
        pale: p.form.variant === 'albino' && !p.form.unique && key !== formKey(p.form),
      });
    }
    this.drawFx(ring);
  }

  private drawFx(ring: { r: DodgeRing; t: number } | null): void {
    const g = this.fx.clear();
    const you = this.poses.you;
    if (ring && you.form) {
      const a = this.anchor('you');
      const r0 = this.lengthPx('you', you.form) * 0.3;
      const k = ringProgress(ring.r, ring.t);
      g.lineStyle(Math.max(2, this.h * 0.006), 0xffd9a0, 0.9);
      g.strokeCircle(a.x, a.y, r0);
      g.lineStyle(Math.max(3, this.h * 0.01), 0xff5a3c, 0.9);
      g.strokeCircle(a.x, a.y, r0 * (1 + 2.6 * (1 - k)));
    }
    if (this.shell) {
      const sh = this.shell;
      const r = this.h * 0.03;
      g.fillStyle(0xffe6b0, 0.25 + 0.5 * sh.glow);
      g.fillCircle(sh.x + Math.sin(sh.wiggle) * r * 0.6, sh.y, r * (1.8 + sh.glow));
      g.fillStyle(0xf2dcb4, 1);
      g.fillEllipse(sh.x + Math.sin(sh.wiggle) * r * 0.6, sh.y, r * 1.6, r * 1.2);
    }
  }

  private tween(target: object, props: Record<string, number>, ms: number, yoyo = false): Promise<void> {
    return new Promise((done) =>
      this.scene.tweens.add({
        targets: target,
        ...props,
        duration: ms,
        yoyo,
        ease: 'Sine.easeInOut',
        onComplete: () => done(),
      }),
    );
  }

  /** The attacker lunges at the other one, jaws open. */
  async lunge(side: Side): Promise<void> {
    const p = this.poses[side];
    p.jaw = 0.5;
    const dir = side === 'you' ? 1 : -1;
    await this.tween(p, { dx: dir * this.w * 0.2, dy: -dir * this.h * 0.12 }, 170, true);
  }

  /** A hit on a side: a flash, a shake and the damage number floating up. */
  async hit(side: Side, damage: number, crit: boolean): Promise<void> {
    const p = this.poses[side];
    p.flash = 0.25;
    const a = this.anchor(side);
    const txt = this.scene.add
      .text(a.x, a.y - this.h * 0.08, damage > 0 ? `-${damage}` : '0', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${Math.round(this.h * (crit ? 0.07 : 0.055))}px`,
        fontStyle: 'bold',
        color: crit ? '#ffd278' : '#ff8a70',
        stroke: '#000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.scene.tweens.add({
      targets: txt,
      y: txt.y - this.h * 0.08,
      alpha: 0,
      duration: 800,
      onComplete: () => txt.destroy(),
    });
    if (crit) this.scene.cameras.main.shake(180, 0.006);
    await this.tween(p, { dx: p.dx + (side === 'you' ? -1 : 1) * this.w * 0.012 }, 60, true);
  }

  /** A perfect dodge: your beast slips aside. */
  async dodgeAside(): Promise<void> {
    await this.tween(this.poses.you, { dy: this.h * 0.1 }, 140, true);
  }

  async faint(side: Side): Promise<void> {
    const p = this.poses[side];
    await this.tween(p, { dy: this.h * 0.15, alpha: 0 }, 650);
  }

  async swimOut(side: Side): Promise<void> {
    await this.tween(this.poses[side], { dx: (side === 'you' ? -1 : 1) * this.w * 0.5, alpha: 0 }, 350);
  }

  async swimIn(side: Side, form: BeastForm): Promise<void> {
    this.setFighter(side, form);
    const p = this.poses[side];
    p.dx = (side === 'you' ? -1 : 1) * this.w * 0.5;
    p.alpha = 0;
    await this.tween(p, { dx: 0, alpha: 1 }, 450);
  }

  /** Taming: the shell flies to the wild beast, it fades into the light, the shell shakes. */
  async tame(shakes: number, caught: boolean): Promise<void> {
    const from = this.anchor('you');
    const to = this.anchor('foe');
    this.shell = { t: 0, x: from.x, y: from.y, wiggle: 0, glow: 0 };
    await this.tween(this.shell, { x: to.x, y: to.y + this.h * 0.06 }, 450);
    await this.tween(this.poses.foe, { alpha: 0 }, 250);
    for (let i = 0; i < shakes; i++) {
      await this.tween(this.shell, { wiggle: Math.PI * 2 }, 420);
      this.shell.wiggle = 0;
      await new Promise((r) => window.setTimeout(r, 250));
    }
    if (caught) {
      await this.tween(this.shell, { glow: 1 }, 300);
      await this.tween(this.shell, { glow: 0 }, 300);
    } else await this.tween(this.poses.foe, { alpha: 1 }, 200);
    this.shell = null;
  }
}

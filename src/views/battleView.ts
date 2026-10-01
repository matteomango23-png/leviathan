// What the battle looks like: a dark sea with light from above, the wild beast up on the right and yours
// closer, bottom left, seen from behind (like Pokémon). Each beast is a picture: its three-quarter image when
// it exists (`<id>_front` for the wild one, `<id>_back` for yours, docs/ART.md), otherwise its card
// illustration with dark soft edges. Breathing, wind-up and lunge, claw marks and a burst in the colour of the
// move's type, flash and shake, fainting, the taming shell with its three shakes.
import Phaser from 'phaser';
import { TYPES, type TypeId } from '../data/rules';
import { ART_KEYS, BATTLE_ART_KEYS } from '../data/sprites.generated';
import { formKey, type BeastForm } from '../systems/beasts/forms';
import type { Side } from '../systems/battle/battle';

interface Pose {
  key: string | null;
  dx: number;
  dy: number;
  scale: number;
  alpha: number;
  tint: number;
  white: number; // 0..1: turning into light (taming)
  breath: number;
}

const newPose = (): Pose => ({
  key: null,
  dx: 0,
  dy: 0,
  scale: 1,
  alpha: 1,
  tint: 0xffffff,
  white: 0,
  breath: Math.random() * 6,
});

/** The picture of a form in battle and whether it is a three-quarter image (true) or the card (false). */
export function battleArt(form: BeastForm, side: Side): { url: string; textureKey: string; own: boolean } {
  const key = formKey(form);
  const suffix = side === 'foe' ? '_front' : '_back';
  for (const k of [key, form.speciesId])
    if (BATTLE_ART_KEYS.includes(`${k}${suffix}`))
      return { url: `sprites/${k}${suffix}.webp`, textureKey: `battle-${k}${suffix}`, own: true };
  const card = ART_KEYS.includes(key) ? key : form.speciesId; // a variant without its own card uses the species'
  return { url: `art/${card}.webp`, textureKey: `card-${card}`, own: false };
}

export class BattleView {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly fx: Phaser.GameObjects.Graphics;
  private readonly images: Record<Side, Phaser.GameObjects.Image>;
  private readonly poses: Record<Side, Pose> = { you: newPose(), foe: newPose() };
  private readonly own: Record<Side, boolean> = { you: false, foe: false };
  private readonly motes: { x: number; y: number; s: number }[] = [];
  private shell: { x: number; y: number; wiggle: number; glow: number; spin: number } | null = null;
  private sparks: { x: number; y: number; vx: number; vy: number; t: number; color: number }[] = [];
  private claws: { x: number; y: number; t: number; color: number }[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    this.bg = scene.add.graphics();
    this.images = {
      foe: scene.add.image(0, 0, '__WHITE').setVisible(false),
      you: scene.add.image(0, 0, '__WHITE').setVisible(false),
    };
    this.fx = scene.add.graphics();
    for (let i = 0; i < 40; i++)
      this.motes.push({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random() });
  }

  /** A card illustration with its edges faded to transparent (an ellipse), made once per card. */
  private faded(key: string): string {
    const fk = `${key}-faded`;
    if (this.scene.textures.exists(fk)) return fk;
    const src = this.scene.textures.get(key).getSourceImage() as HTMLImageElement;
    const w = src.width;
    const h = src.height;
    const tex = this.scene.textures.createCanvas(fk, w, h)!;
    const ctx = tex.getContext();
    ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.translate(w / 2, h / 2);
    ctx.scale(1, h / w);
    const g = ctx.createRadialGradient(0, 0, w * 0.18, 0, 0, w * 0.5);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.65, 'rgba(0,0,0,0.9)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-w / 2, -w / 2, w, w);
    tex.refresh();
    return fk;
  }

  private get w(): number {
    return this.scene.scale.width;
  }
  private get h(): number {
    return this.scene.scale.height;
  }

  /** Where each beast is (screen pixels) and how tall it is drawn. */
  anchor(side: Side): { x: number; y: number; size: number } {
    return side === 'foe'
      ? { x: this.w * 0.68, y: this.h * 0.33, size: this.h * 0.5 }
      : { x: this.w * 0.27, y: this.h * 0.7, size: this.h * 0.72 };
  }

  setFighter(side: Side, form: BeastForm): void {
    const art = battleArt(form, side);
    Object.assign(this.poses[side], newPose(), { key: art.textureKey });
    this.own[side] = art.own;
  }

  private drawSea(time: number): void {
    const g = this.bg.clear();
    const { w, h } = this;
    const bands = 18;
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(0x0d3540),
        Phaser.Display.Color.ValueToColor(0x02080d),
        100,
        t * 100,
      );
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
      g.fillRect(0, (h * i) / bands, w, h / bands + 1);
    }
    for (let i = 0; i < 5; i++) {
      const x = w * (0.1 + i * 0.22) + Math.sin(time * 0.3 + i) * w * 0.03;
      g.fillStyle(0x9fd6dc, 0.035);
      g.fillTriangle(x - w * 0.03, 0, x + w * 0.05, 0, x + w * 0.12, h * 0.9);
    }
    g.fillStyle(0x040b10, 1);
    g.fillEllipse(w * 0.68, h * 0.55, w * 0.42, h * 0.1); // the rock the wild beast hovers over
    g.fillStyle(0xcfe6e8, 0.35);
    for (const m of this.motes) {
      const y = (m.y + time * 0.012 * m.s) % 1;
      g.fillCircle(m.x * w + Math.sin(time * 0.5 + m.x * 9) * 6, y * h, m.s * 1.4);
    }
  }

  update(dt: number, time: number): void {
    this.drawSea(time);
    for (const side of ['foe', 'you'] as Side[]) {
      const p = this.poses[side];
      const im = this.images[side];
      if (!p.key || !this.scene.textures.exists(p.key)) {
        im.setVisible(false);
        continue;
      }
      // cards fade into the sea; real three-quarter pictures are cut out already
      const key = this.own[side] ? p.key : this.faded(p.key);
      if (im.texture.key !== key) im.setTexture(key);
      const a = this.anchor(side);
      p.breath += dt;
      const breathe = 1 + Math.sin(p.breath * 1.6) * 0.012;
      const s = (a.size / im.height) * p.scale;
      const x = a.x + p.dx;
      const y = a.y + p.dy + Math.sin(p.breath * 0.9) * this.h * 0.008;
      im.setVisible(true)
        .setPosition(x, y)
        .setScale(s * (side === 'you' && !this.own.you ? -1 : 1), s * breathe) // the card of your beast, mirrored
        .setAlpha(p.alpha);
      if (p.white > 0)
        im.setTintMode(Phaser.TintModes.FILL)
          .setTint(0xfff6dc)
          .setAlpha(p.alpha * (0.4 + 0.6 * p.white));
      else im.setTintMode(Phaser.TintModes.MULTIPLY).setTint(p.tint);
    }
    this.drawFx(dt);
  }

  private drawFx(dt: number): void {
    const g = this.fx.clear();
    this.claws = this.claws.filter((c) => (c.t -= dt) > 0);
    for (const c of this.claws) {
      const k = 1 - c.t / 0.35;
      const len = this.h * 0.18;
      g.lineStyle(Math.max(3, this.h * 0.012) * (1 - k), c.color, 1 - k * 0.6);
      for (let i = -1; i <= 1; i++) {
        const ox = i * this.h * 0.04;
        g.lineBetween(
          c.x + ox - len * 0.5,
          c.y - len * 0.5 + len * k * 0.2,
          c.x + ox + len * 0.5 * k,
          c.y + len * 0.5 * k,
        );
      }
    }
    this.sparks = this.sparks.filter((p) => (p.t -= dt) > 0);
    for (const p of this.sparks) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      g.fillStyle(p.color, Math.min(1, p.t * 2));
      g.fillCircle(p.x, p.y, Math.max(2, this.h * 0.008) * Math.min(1, p.t * 2));
    }
    if (this.shell) {
      const sh = this.shell;
      const r = this.h * 0.035;
      const x = sh.x + Math.sin(sh.wiggle) * r * 0.7;
      g.fillStyle(0xffe6b0, 0.15 + 0.5 * sh.glow);
      g.fillCircle(x, sh.y, r * (1.8 + sh.glow * 1.5));
      // a spiral shell: a pale cone with a few turns
      g.fillStyle(0xf2dcb4, 1);
      g.fillEllipse(x, sh.y, r * 1.8, r * 1.3);
      g.lineStyle(Math.max(1.5, r * 0.12), 0xb08a5a, 1);
      for (let k = 1; k <= 3; k++)
        g.strokeCircle(x + Math.cos(sh.spin + k) * r * 0.2, sh.y, r * (0.75 - k * 0.18));
    }
  }

  private burst(x: number, y: number, color: number, n = 18): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = this.h * (0.3 + Math.random() * 0.6);
      this.sparks.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        t: 0.35 + Math.random() * 0.35,
        color,
      });
    }
  }

  private tween(
    target: object,
    props: Record<string, number>,
    ms: number,
    yoyo = false,
    ease = 'Sine.easeInOut',
  ): Promise<void> {
    return new Promise((done) =>
      this.scene.tweens.add({
        targets: target,
        ...props,
        duration: ms,
        yoyo,
        ease,
        onComplete: () => done(),
      }),
    );
  }

  /** Wind-up, then the attacker lunges at the other one. */
  async lunge(side: Side): Promise<void> {
    const p = this.poses[side];
    const dir = side === 'you' ? 1 : -1;
    await this.tween(p, { dx: -dir * this.w * 0.03, scale: 0.95 }, 120);
    await this.tween(
      p,
      { dx: dir * this.w * 0.22, dy: -dir * this.h * 0.18, scale: 1.08 },
      140,
      false,
      'Quad.easeIn',
    );
    void this.tween(p, { dx: 0, dy: 0, scale: 1 }, 260);
  }

  /** A hit: claw marks and a burst in the move's type colour, a flash, a shake, the number floating up. */
  async hit(side: Side, damage: number, crit: boolean, type: TypeId | 'variabile'): Promise<void> {
    const p = this.poses[side];
    const a = this.anchor(side);
    const color =
      type === 'variabile' ? 0xffffff : Phaser.Display.Color.HexStringToColor(TYPES[type].color).color;
    if (damage > 0) {
      this.claws.push({ x: a.x, y: a.y, t: 0.35, color: 0xffffff });
      this.burst(a.x, a.y, color, crit ? 30 : 16);
      this.scene.cameras.main.shake(crit ? 220 : 120, crit ? 0.01 : 0.005);
    }
    const txt = this.scene.add
      .text(a.x, a.y - a.size * 0.3, damage > 0 ? `-${damage}` : 'Schivato!', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${Math.round(this.h * (crit ? 0.075 : 0.06))}px`,
        fontStyle: 'bold',
        color: damage <= 0 ? '#c8fff4' : crit ? '#ffd278' : '#ff8a70',
        stroke: '#000',
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    this.scene.tweens.add({
      targets: txt,
      y: txt.y - this.h * 0.1,
      alpha: 0,
      duration: 900,
      onComplete: () => txt.destroy(),
    });
    if (damage <= 0) return;
    p.tint = 0xff9a8a;
    await this.tween(p, { dx: (side === 'you' ? -1 : 1) * this.w * 0.015 }, 50, true);
    await this.tween(p, { dx: (side === 'you' ? -1 : 1) * this.w * 0.01 }, 50, true);
    p.tint = 0xffffff;
  }

  /** A perfect dodge: your beast slips aside. */
  async dodgeAside(): Promise<void> {
    await this.tween(this.poses.you, { dx: -this.w * 0.08, dy: this.h * 0.06 }, 120, true);
  }

  async faint(side: Side): Promise<void> {
    const p = this.poses[side];
    p.tint = 0x777777;
    await this.tween(p, { dy: this.h * 0.2, alpha: 0, scale: 0.9 }, 700);
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

  /** Taming: the shell flies in an arc, the beast turns into light and is drawn in, the shell shakes. */
  async tame(shakes: number, caught: boolean): Promise<void> {
    const from = this.anchor('you');
    const to = this.anchor('foe');
    const foe = this.poses.foe;
    this.shell = { x: from.x, y: from.y - from.size * 0.3, wiggle: 0, glow: 0, spin: 0 };
    const arc = { k: 0 };
    const sx = this.shell.x;
    const sy = this.shell.y;
    await new Promise<void>((done) =>
      this.scene.tweens.add({
        targets: arc,
        k: 1,
        duration: 600,
        ease: 'Sine.easeOut',
        onUpdate: () => {
          const s = this.shell!;
          s.x = sx + (to.x - sx) * arc.k;
          s.y = sy + (to.y - sy) * arc.k - Math.sin(arc.k * Math.PI) * this.h * 0.25;
          s.spin = arc.k * 12;
        },
        onComplete: () => done(),
      }),
    );
    await this.tween(foe, { white: 1 }, 200);
    await this.tween(foe, { scale: 0.05, alpha: 0 }, 300, false, 'Quad.easeIn');
    await this.tween(this.shell, { y: to.y + to.size * 0.25 }, 300, false, 'Bounce.easeOut');
    for (let i = 0; i < shakes; i++) {
      await new Promise((r) => window.setTimeout(r, 350));
      await this.tween(this.shell, { wiggle: Math.PI * 2 }, 380);
      this.shell.wiggle = 0;
    }
    await new Promise((r) => window.setTimeout(r, 250));
    if (caught) {
      this.burst(this.shell.x, this.shell.y, 0xffe6a0, 30);
      await this.tween(this.shell, { glow: 1 }, 300, true);
    } else {
      this.burst(this.shell.x, this.shell.y, 0xffffff, 20);
      Object.assign(foe, { scale: 1, white: 0 });
      await this.tween(foe, { alpha: 1 }, 200);
    }
    this.shell = null;
  }
}

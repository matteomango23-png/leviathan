// What the battle looks like: a layered, moving sea (views/battle/backdrop.ts), the wild beast on its patch of
// seabed up on the right and yours closer, bottom left, seen from behind (like Pokémon). Each beast is its
// three-quarter picture (`<id>_front` / `<id>_back`, docs/ART.md) or, until it exists, its card with soft
// edges; it is drawn in proportion to its real length (systems/battle/stage.ts). Beasts float and sway,
// wind up and lunge leaving bubbles, flash and recoil when hit, sink when they faint.
import Phaser from 'phaser';
import { BATTLE_PALETTES, BATTLE_STAGE, type BattlePlace } from '../data/battle';
import type { MoveTypeId } from '../data/rules';
import type { Side } from '../systems/battle/battle';
import { battleSize } from '../systems/battle/stage';
import { formLengthM, type BeastForm } from '../systems/beasts/forms';
import { battleArt, fadedCard } from './battle/beastArt';
import { damageNumber } from './battle/damageNumber';

import { BattleBackdrop, DEPTH, type PaintedLayers } from './battle/backdrop';
import { TameShell } from './battle/tameShell';
import { TypeFx } from './battle/typeFx';

/** Battle pictures are 800×800 with the beast's longest side 760 px, its lowest point at y = 780. */
const PIC = { box: 760, foot: 780 / 800 };

interface Pose {
  key: string | null;
  own: boolean; // a real three-quarter picture (true) or the card (false)
  size: number; // share of the screen height
  dx: number;
  dy: number;
  scale: number;
  alpha: number;
  tint: number;
  flash: number; // 0..1: white flash when hit
  white: number; // 0..1: turning into light (taming)
  rot: number;
  t: number; // own clock, for idle motion
}

const newPose = (): Pose => ({
  key: null,
  own: false,
  size: 0.4,
  dx: 0,
  dy: 0,
  scale: 1,
  alpha: 1,
  tint: 0xffffff,
  flash: 0,
  white: 0,
  rot: 0,
  t: Math.random() * 10,
});

const wait = (ms: number): Promise<void> => new Promise((r) => window.setTimeout(r, ms));

export class BattleView {
  private readonly backdrop: BattleBackdrop;
  private readonly fx: TypeFx;
  private readonly shell: TameShell;
  private readonly images: Record<Side, Phaser.GameObjects.Image>;
  private readonly shadows: Record<Side, Phaser.GameObjects.Image>;
  /** A soft light behind each beast, so dark bodies stand out from the dark water. */
  private readonly backlights: Record<Side, Phaser.GameObjects.Image>;
  private readonly poses: Record<Side, Pose> = { you: newPose(), foe: newPose() };

  constructor(
    private readonly scene: Phaser.Scene,
    place: BattlePlace,
    painted: PaintedLayers,
  ) {
    this.backdrop = new BattleBackdrop(scene, place, painted);
    const shadow = (): Phaser.GameObjects.Image =>
      scene.add.image(0, 0, 'bt-blob').setTint(0x000000).setDepth(7);
    this.shadows = { foe: shadow(), you: shadow() };
    const ray = Phaser.Display.Color.HexStringToColor(BATTLE_PALETTES[place].ray).color;
    const backlight = (depth: number): Phaser.GameObjects.Image =>
      scene.add.image(0, 0, 'bt-blob').setTint(ray).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth);
    this.backlights = { foe: backlight(9), you: backlight(11) };
    this.images = {
      foe: scene.add.image(0, 0, '__WHITE').setVisible(false).setDepth(10),
      you: scene.add.image(0, 0, '__WHITE').setVisible(false).setDepth(12),
    };
    this.fx = new TypeFx(scene);
    this.shell = new TameShell(scene);
  }

  private get w(): number {
    return this.scene.scale.width;
  }
  private get h(): number {
    return this.scene.scale.height;
  }

  /** The ground under each beast (screen pixels), moving with the camera drift. */
  private ground(side: Side): { x: number; y: number } {
    const a = BATTLE_STAGE.anchors[side];
    const d = this.backdrop.shift(DEPTH.ground);
    return { x: a.x * this.w + d.x, y: a.y * this.h + d.y };
  }

  /** The centre of a beast's body and its height in pixels (for effects, numbers, the shell). */
  centre(side: Side): { x: number; y: number; size: number } {
    const g = this.ground(side);
    const size = this.poses[side].size * this.h;
    return { x: g.x + this.poses[side].dx, y: g.y - size * 0.5 + this.poses[side].dy, size };
  }

  setFighter(side: Side, form: BeastForm, level: number): void {
    const art = battleArt(form, side);
    Object.assign(this.poses[side], newPose(), {
      key: art.textureKey,
      own: art.own,
      size: battleSize(formLengthM(form, level), side),
    });
  }

  update(dt: number, time: number): void {
    const grounds = { foe: this.ground('foe'), you: this.ground('you') };
    for (const side of ['foe', 'you'] as Side[]) {
      const p = this.poses[side];
      const px = p.size * this.h;
      this.backdrop.setGroundWidth(side, Math.min(this.w * 0.75, Math.max(this.w * 0.2, px * 1.25)));
      const im = this.images[side];
      const sh = this.shadows[side];
      const bl = this.backlights[side];
      if (!p.key || !this.scene.textures.exists(p.key)) {
        im.setVisible(false);
        sh.setVisible(false);
        bl.setVisible(false);
        continue;
      }
      const key = p.own ? p.key : fadedCard(this.scene, p.key);
      if (im.texture.key !== key) im.setTexture(key);
      p.t += dt;
      // big beasts move slower and heavier
      const slow = 1 / (0.7 + p.size);
      const bob = Math.sin(p.t * 1.1 * slow) * this.h * 0.012;
      const sway = Math.sin(p.t * 0.7 * slow) * 0.025;
      const breathe = 1 + Math.sin(p.t * 1.6 * slow) * 0.015;
      const hover = BATTLE_STAGE.hover * this.h;
      const g = grounds[side];
      const s = (px / (p.own ? PIC.box : im.height)) * p.scale;
      const mirror = side === 'you' && !p.own ? -1 : 1; // the card of your beast, mirrored
      im.setVisible(true)
        .setOrigin(0.5, p.own ? PIC.foot : 0.9)
        .setPosition(g.x + p.dx, g.y - hover + bob + p.dy)
        .setRotation(sway + p.rot)
        .setScale(s * mirror * breathe, s / breathe)
        .setAlpha(p.alpha);
      if (p.white > 0 || p.flash > 0)
        im.setTintMode(Phaser.TintModes.FILL)
          .setTint(p.white > 0 ? 0xfff6dc : 0xffffff)
          .setAlpha(p.alpha * (p.white > 0 ? 0.4 + 0.6 * p.white : 0.5 + 0.5 * p.flash));
      else im.setTintMode(Phaser.TintModes.MULTIPLY).setTint(p.tint);
      // the shadow on the seabed shrinks when the beast rises
      const lift = Math.max(0, -p.dy) / this.h;
      sh.setVisible(true)
        .setPosition(g.x + p.dx * 0.8, g.y)
        .setScale((px * 1.0) / 256 / (1 + lift * 3), (px * 0.16) / 256)
        .setAlpha(0.5 * p.alpha * (1 - Math.min(0.7, lift * 2)));
      bl.setVisible(true)
        .setPosition(g.x + p.dx, g.y - hover - px * 0.5 + p.dy)
        .setScale((px * 1.5) / 256, (px * 1.2) / 256)
        .setAlpha((0.13 + 0.03 * Math.sin(p.t * 0.8)) * p.alpha);
    }
    this.backdrop.update(dt, time, grounds);
    this.fx.update(dt);
    this.shell.update();
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

  /** Wind-up (pulls back, coils), then the attacker shoots at the other one leaving bubbles, and comes back. */
  async lunge(side: Side): Promise<void> {
    const p = this.poses[side];
    const dir = side === 'you' ? 1 : -1;
    await this.tween(
      p,
      { dx: -dir * this.w * 0.035, dy: dir * this.h * 0.02, scale: 0.94, rot: -dir * 0.06 },
      220,
    );
    const from = this.centre(side);
    this.fx.trail(from.x, from.y, from.size);
    await this.tween(
      p,
      {
        dx: dir * this.w * 0.26,
        dy: -dir * this.h * 0.24,
        scale: side === 'you' ? 0.9 : 1.12,
        rot: dir * 0.08,
      },
      150,
      false,
      'Quad.easeIn',
    );
    const mid = this.centre(side);
    this.fx.trail(mid.x, mid.y, mid.size);
    void this.tween(p, { dx: 0, dy: 0, scale: 1, rot: 0 }, 380, false, 'Back.easeOut');
  }

  /** A hit: the type's effect, a white flash and a recoil, a shake, the number floating up. */
  async hit(side: Side, damage: number, crit: boolean, type: MoveTypeId, strong = false): Promise<void> {
    const p = this.poses[side];
    const c = this.centre(side);
    if (damage > 0) {
      this.fx.impact(type, c.x, c.y, c.size, crit);
      const cam = this.scene.cameras.main;
      cam.shake(crit || strong ? 260 : 140, crit || strong ? 0.012 : 0.006);
      if (crit || strong) {
        cam.zoomTo(1.06, 90, 'Quad.easeOut');
        window.setTimeout(() => cam.zoomTo(1, 260, 'Sine.easeInOut'), 160);
      }
    }
    damageNumber(this.scene, c, damage, crit);
    if (damage <= 0) return;
    const away = side === 'you' ? -1 : 1;
    p.flash = 1;
    p.tint = 0xff8f80;
    void this.tween(p, { flash: 0 }, 220);
    await this.tween(p, { dx: away * this.w * 0.03, rot: away * 0.08 }, 70, true);
    await this.tween(p, { dx: away * this.w * 0.012 }, 60, true);
    p.tint = 0xffffff;
  }

  /** A perfect dodge: your beast slips aside. */
  async dodgeAside(): Promise<void> {
    await this.tween(this.poses.you, { dx: -this.w * 0.08, dy: this.h * 0.06, rot: -0.1 }, 130, true);
  }

  async faint(side: Side): Promise<void> {
    const p = this.poses[side];
    p.tint = 0x666666;
    await this.tween(
      p,
      { dy: this.h * 0.18, alpha: 0, scale: 0.92, rot: (side === 'you' ? -1 : 1) * 0.3 },
      900,
    );
  }

  async swimOut(side: Side): Promise<void> {
    await this.tween(this.poses[side], { dx: (side === 'you' ? -1 : 1) * this.w * 0.55, alpha: 0 }, 380);
  }

  async swimIn(side: Side, form: BeastForm, level: number): Promise<void> {
    this.setFighter(side, form, level);
    const p = this.poses[side];
    p.dx = (side === 'you' ? -1 : 1) * this.w * 0.55;
    p.alpha = 0;
    await this.tween(p, { dx: 0, alpha: 1 }, 520, false, 'Cubic.easeOut');
  }

  /** Taming: the shell flies in an arc, the beast turns into light and is drawn in, the shell shakes. */
  async tame(shakes: number, caught: boolean): Promise<void> {
    const from = this.centre('you');
    const to = this.centre('foe');
    const foe = this.poses.foe;
    const ground = this.ground('foe').y - this.h * 0.03;
    await this.shell.throw({ x: from.x, y: from.y - from.size * 0.2 }, to, ground, async () => {
      await this.tween(foe, { white: 1 }, 220);
      await this.tween(foe, { scale: 0.05, alpha: 0 }, 300, false, 'Quad.easeIn');
    });
    for (let i = 0; i < shakes; i++) {
      await wait(380);
      await this.shell.shake();
    }
    await wait(250);
    const at = { x: to.x, y: ground };
    if (caught) this.fx.impact('corazzato', at.x, at.y, this.h * 0.3, true);
    else {
      this.fx.impact('variabile', at.x, at.y, this.h * 0.3, false);
      Object.assign(foe, { scale: 1, white: 0 });
      void this.tween(foe, { alpha: 1 }, 220);
    }
    await this.shell.end(caught);
  }
}

// What the battle looks like: a layered, moving sea (views/battle/backdrop.ts), the wild beast on its patch of
// seabed up on the right and yours closer, bottom left, seen from behind (like Pokémon). Each beast is its
// three-quarter picture (`<id>_front` / `<id>_back`, docs/ART.md) or, until it exists, its card with soft
// edges. Sizes are relative to each other, giants always huge (systems/battle/stage.ts). Beasts come out of
// the dark, float and sway, wind up and lunge leaving bubbles, flash and recoil when hit, sink when they
// faint; rare ones sparkle.
import Phaser from 'phaser';
import { BATTLE_ART_FLAT } from '../data/sprites.generated';
import { BATTLE_PALETTES, BATTLE_STAGE, type BattlePlace } from '../data/battle';
import type { MoveTypeId } from '../data/rules';
import type { Side } from '../systems/battle/battle';
import { battleSizes, isGiant, placePicture, type StageBeast } from '../systems/battle/stage';
import { formLengthM, type BeastForm } from '../systems/beasts/forms';
import { battleArt, beastAura, fadedCard } from './battle/beastArt';
import { damageNumber } from './battle/damageNumber';
import { newPose, poseTint, type Pose } from './battle/pose';
import { BattleBackdrop, DEPTH, type PaintedLayers } from './battle/backdrop';
import { TameShell } from './battle/tameShell';
import { TypeFx } from './battle/typeFx';
import { tweenTo } from './battle/tween';

/** Battle pictures are 800×800 with the beast's longest side 760 px, its lowest point at y = 780. */
const PIC = { box: BATTLE_STAGE.picture.box, foot: BATTLE_STAGE.picture.foot / BATTLE_STAGE.picture.square };

const wait = (ms: number): Promise<void> => new Promise((r) => window.setTimeout(r, ms));

export class BattleView {
  private readonly backdrop: BattleBackdrop;
  private readonly fx: TypeFx;
  private readonly shell: TameShell;
  private readonly images: Record<Side, Phaser.GameObjects.Image>;
  private readonly shadows: Record<Side, Phaser.GameObjects.Image>;
  /** A soft light behind each beast, so dark bodies stand out from the dark water. */
  private readonly backlights: Record<Side, Phaser.GameObjects.Image>;
  private readonly rayColor: number;
  private readonly poses: Record<Side, Pose> = { you: newPose(), foe: newPose() };
  /** Length and giant flag of each beast on stage, for the relative sizes. */
  private readonly stage: Record<Side, StageBeast | null> = { you: null, foe: null };

  constructor(
    private readonly scene: Phaser.Scene,
    place: BattlePlace,
    painted: PaintedLayers,
  ) {
    this.backdrop = new BattleBackdrop(scene, place, painted);
    const shadow = (): Phaser.GameObjects.Image =>
      scene.add.image(0, 0, 'bt-blob').setTint(0x000000).setDepth(7);
    this.shadows = { foe: shadow(), you: shadow() };
    this.rayColor = Phaser.Display.Color.HexStringToColor(BATTLE_PALETTES[place].ray).color;
    const backlight = (depth: number): Phaser.GameObjects.Image =>
      scene.add.image(0, 0, 'bt-blob').setBlendMode(Phaser.BlendModes.ADD).setDepth(depth);
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
    const d = this.backdrop.shift(DEPTH.ground);
    const p = placePicture(side, this.poses[side].size, this.w, this.h); // the same rule the framing test checks
    return { x: p.x + d.x, y: p.y + BATTLE_STAGE.hover * this.h + d.y };
  }

  /** The centre of a beast's body and its height in pixels (for effects, numbers, the shell). */
  centre(side: Side): { x: number; y: number; size: number } {
    const g = this.ground(side);
    const size = this.poses[side].size * this.h;
    return { x: g.x + this.poses[side].dx, y: g.y - size * 0.5 + this.poses[side].dy, size };
  }

  /** Puts a beast on stage (hidden: only known, so the other one is sized against it from the start). */
  setFighter(side: Side, form: BeastForm, level: number, hidden = false): void {
    const art = battleArt(form, side);
    const aura = beastAura(form);
    this.stage[side] = {
      lengthM: formLengthM(form, level),
      giant: isGiant(form),
      pictureMult: BATTLE_STAGE.pictureMult[form.speciesId],
      flat: art.own ? BATTLE_ART_FLAT[art.textureKey.replace(/^battle-/, '')] : undefined,
    };
    Object.assign(this.poses[side], newPose(), {
      key: art.textureKey,
      own: art.own,
      alpha: hidden ? 0 : 1,
      aura: aura.level,
      auraColor: aura.color,
    });
    const you = this.stage.you ?? this.stage.foe!;
    const foe = this.stage.foe ?? this.stage.you!;
    const sizes = battleSizes(you, foe);
    for (const s of ['you', 'foe'] as Side[]) {
      this.poses[s].target = sizes[s];
      if (s === side) this.poses[s].size = sizes[s]; // the newcomer starts at its size, the other eases
    }
  }

  /** Whether the wild beast is a giant (its entrance shakes the sea). */
  foeIsGiant(): boolean {
    return !!this.stage.foe?.giant;
  }

  update(dt: number, time: number): void {
    const grounds = { foe: this.ground('foe'), you: this.ground('you') };
    for (const side of ['foe', 'you'] as Side[]) {
      const p = this.poses[side];
      p.size += (p.target - p.size) * Math.min(1, dt * 3);
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
      else im.setTintMode(Phaser.TintModes.MULTIPLY).setTint(poseTint(p));
      // the shadow on the seabed shrinks when the beast rises
      const lift = Math.max(0, -p.dy) / this.h;
      sh.setVisible(true)
        .setPosition(g.x + p.dx * 0.8, g.y)
        .setScale((px * 1.0) / 256 / (1 + lift * 3), (px * 0.16) / 256)
        .setAlpha(0.5 * p.alpha * (1 - Math.min(0.7, lift * 2)));
      bl.setVisible(true)
        .setPosition(g.x + p.dx, g.y - hover - px * 0.5 + p.dy)
        .setScale((px * 1.5) / 256, (px * 1.2) / 256)
        .setTint(p.aura === 2 ? p.auraColor : this.rayColor)
        .setAlpha((p.aura === 2 ? 0.22 : 0.13) * (1 + 0.25 * Math.sin(p.t * 0.8)) * p.alpha * (1 - p.dark));
      if (p.aura && p.alpha > 0.6 && p.dark < 0.3 && Math.random() < dt * (p.aura === 2 ? 14 : 5))
        this.fx.sparkle(
          g.x + p.dx + (Math.random() - 0.5) * px * 0.9,
          g.y - hover - Math.random() * px + p.dy,
          px,
          p.auraColor,
        );
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
    ease?: string,
  ): Promise<void> {
    return tweenTo(this.scene, target, props, ms, yoyo, ease);
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

  /**
   * The wild beast comes out of the dark: a black silhouette that drifts in and takes its colours. A giant
   * makes the sea rumble (a long low shake and the camera leaning in).
   */
  async emerge(): Promise<void> {
    const p = this.poses.foe;
    Object.assign(p, { dark: 1, alpha: 0, dx: this.w * 0.06 });
    if (this.foeIsGiant()) {
      const cam = this.scene.cameras.main;
      cam.shake(1400, 0.004);
      cam.zoomTo(1.05, 700, 'Sine.easeOut');
      window.setTimeout(() => cam.zoomTo(1, 900, 'Sine.easeInOut'), 1300);
    }
    await this.tween(p, { alpha: 1 }, 450);
    await this.tween(p, { dark: 0, dx: 0 }, this.foeIsGiant() ? 1300 : 900, false, 'Sine.easeOut');
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

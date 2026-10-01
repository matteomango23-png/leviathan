// Draws the wild beasts and the mount you ride, and works out where the rider sits. Rare beasts (albino,
// alfa, legendary, Guardians) shimmer with a pale glow so you notice them in the dark. Health is shown in
// battle, not in the open sea.
import Phaser from 'phaser';
import { TEAM_RULES } from '../data/beasts';
import { activeBeast } from '../systems/beastPlay';
import { artKeysOf, formKey, type BeastForm } from '../systems/beasts/forms';
import { SPRITE_KEYS } from '../data/sprites.generated';
import { isInWater, isRare } from '../systems/beasts/wildState';
import type { GameState } from '../systems/game';
import { BeastSprite } from './beastView';

const spriteOf = (form: BeastForm): string =>
  artKeysOf(form).find((k) => SPRITE_KEYS.includes(k)) ?? formKey(form);

/** An albino without its own sprite yet is drawn with the species' one, lightened. */
const isPaleSprite = (form: BeastForm): boolean =>
  form.variant === 'albino' && !form.unique && spriteOf(form) !== formKey(form);

export class BeastsLayer {
  private readonly wild: BeastSprite[];
  private readonly mount: BeastSprite;
  private readonly glow: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, g: GameState) {
    this.glow = scene.add.graphics();
    layer.add(this.glow);
    this.wild = g.beasts.wilds.map(() => new BeastSprite(scene, layer));
    this.mount = new BeastSprite(scene, layer);
  }

  /** Where the diver sits on the ridden beast (world), or null on foot. */
  riderPose(g: GameState): { x: number; y: number; pitch: number } | null {
    const c = g.beasts.mount;
    if (!g.beasts.riding || !c) return null;
    const [fwd, up] = TEAM_RULES.riderOffset;
    const cos = Math.cos(c.pitch);
    const sin = Math.sin(c.pitch);
    const lx = fwd * c.length;
    const ly = up * c.length;
    return { x: c.x + (lx * cos - ly * sin) * c.face, y: c.y + lx * sin + ly * cos, pitch: c.pitch };
  }

  /** Rare beasts in the water: they light up the dark a little (for the light mask). */
  glowSpots(g: GameState): { x: number; y: number; r: number }[] {
    return g.beasts.wilds
      .filter((w) => isInWater(w) && isRare(w))
      .map((w) => ({ x: w.x, y: w.y, r: w.length * 0.5 }));
  }

  update(g: GameState, time: number): void {
    this.glow.clear();
    g.beasts.wilds.forEach((w, i) => {
      const s = this.wild[i]!;
      if (!isInWater(w)) {
        s.hide();
        return;
      }
      if (isRare(w)) {
        const pulse = 0.5 + 0.5 * Math.sin(time * 2.4 + w.id);
        this.glow.fillStyle(0xdff6ff, 0.05 + 0.05 * pulse);
        this.glow.fillEllipse(w.x, w.y, w.length * 1.3, w.length * 0.5);
        this.glow.fillStyle(0xffffff, 0.5 * pulse);
        for (let k = 0; k < 4; k++) {
          const a = time * 0.8 + k * 1.6 + w.id;
          this.glow.fillCircle(
            w.x + Math.cos(a) * w.length * 0.45,
            w.y + Math.sin(a * 1.3) * w.length * 0.14,
            0.9,
          );
        }
      }
      s.update({
        key: spriteOf(w.form),
        pale: isPaleSprite(w.form),
        x: w.x,
        y: w.y,
        face: w.face,
        pitch: w.pitch,
        pitchV: w.pitchV,
        phase: w.phase,
        jaw: w.jaw,
        length: w.length,
        flash: w.flash,
        alpha: 1,
        turn: w.turn,
        turnFrom: w.turnFrom,
      });
    });
    const c = g.beasts.mount;
    const b = activeBeast(g);
    if (c && b)
      this.mount.update({
        key: spriteOf(b.form),
        pale: isPaleSprite(b.form),
        x: c.x,
        y: c.y,
        face: c.face,
        pitch: c.pitch,
        pitchV: c.pitchV,
        phase: c.phase,
        jaw: c.jaw,
        length: c.length,
        flash: c.flash,
        alpha: c.alpha,
        turn: c.turn,
        turnFrom: c.turnFrom,
      });
    else this.mount.hide();
  }
}

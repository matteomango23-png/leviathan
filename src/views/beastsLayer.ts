// Draws wild beasts and your companion, and works out where the rider sits and which health bars to show.
import Phaser from 'phaser';
import { TEAM_RULES } from '../data/beasts';
import { activeBeast } from '../systems/beastPlay';
import { formKey, type BeastForm } from '../systems/beasts/forms';
import { maxHpOf } from '../systems/beasts/team';
import { isInWater } from '../systems/beasts/wild';
import type { GameState } from '../systems/game';
import { BeastSprite, resolveSpriteKey } from './beastView';

const spriteOf = (form: BeastForm): string =>
  resolveSpriteKey(formKey(form), form.speciesId) ?? formKey(form);
import type { BarInfo } from './combatView';

/** An albino without its own sprite yet is drawn with the species' one, lightened. */
const isPaleSprite = (form: BeastForm): boolean =>
  form.variant === 'albino' && !form.unique && spriteOf(form) !== formKey(form);

export class BeastsLayer {
  private readonly wild: BeastSprite[];
  private readonly companion: BeastSprite;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, g: GameState) {
    this.wild = g.beasts.wilds.map(() => new BeastSprite(scene, layer));
    this.companion = new BeastSprite(scene, layer);
  }

  /** Where the diver sits on the ridden beast (world), or null on foot. */
  riderPose(g: GameState): { x: number; y: number; pitch: number } | null {
    const c = g.beasts.companion;
    if (!g.beasts.riding || !c) return null;
    const [fwd, up] = TEAM_RULES.riderOffset;
    const cos = Math.cos(c.pitch);
    const sin = Math.sin(c.pitch);
    const lx = fwd * c.length;
    const ly = up * c.length;
    return { x: c.x + (lx * cos - ly * sin) * c.face, y: c.y + lx * sin + ly * cos, pitch: c.pitch };
  }

  update(g: GameState): BarInfo[] {
    const bars: BarInfo[] = [];
    g.beasts.wilds.forEach((w, i) => {
      const s = this.wild[i]!;
      if (!isInWater(w)) {
        s.hide();
        return;
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
      // the Guardian's health is the big bar at the top of the screen (ui/bossBar.ts)
      const wantsBar = w.barTime > 0 || w.mood === 'tired' || w.mood === 'angry' || w.mood === 'taming';
      if (wantsBar && !w.boss) {
        bars.push({
          x: w.x,
          y: w.y - w.length * 0.2,
          width: w.length * 0.5,
          frac: w.hp / w.maxHp,
          color: w.mood === 'tired' || w.mood === 'taming' ? 0x5ff3d6 : 0xd94a3f,
          notch: true,
          tired: w.mood === 'tired',
          stunned: w.stun > 0,
        });
      }
    });
    const c = g.beasts.companion;
    const b = activeBeast(g);
    if (c && b) {
      this.companion.update({
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
        rage: c.frenzy > 0,
      });
      if (c.state !== 'leaving' && (b.hp < maxHpOf(b) || c.flash > 0))
        bars.push({
          x: c.x,
          y: c.y - c.length * 0.2,
          width: c.length * 0.4,
          frac: b.hp / maxHpOf(b),
          color: 0x86d89a,
          notch: false,
          tired: false,
          stunned: false,
        });
    } else this.companion.hide();
    return bars;
  }
}

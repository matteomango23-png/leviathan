// Draws the wild beasts and the mount you ride, and works out where the rider sits. Rare beasts (albino,
// alfa, legendary, Guardians) shimmer with a pale glow so you notice them in the dark. Health is shown in
// battle, not in the open sea.
import Phaser from 'phaser';
import { BEAST_TEMPER, CETACEANS, TEAM_RULES } from '../data/beasts';
import { activeBeast } from '../systems/beastPlay';
import { artKeysOf, formKey, speciesOf, type BeastForm } from '../systems/beasts/forms';
import { SPRITE_KEYS } from '../data/sprites.generated';
import { isInWater, isRare } from '../systems/beasts/wildState';
import type { GameState } from '../systems/game';
import { BeastSprite } from './beastView';

const spriteOf = (form: BeastForm): string =>
  artKeysOf(form).find((k) => SPRITE_KEYS.includes(k)) ?? formKey(form);

/** An albino without its own sprite yet is drawn with the species' one, lightened. */
const isPaleSprite = (form: BeastForm): boolean =>
  form.variant === 'albino' && !form.unique && spriteOf(form) !== formKey(form);

/** Where the rest of a school swims, as shares of the leader's length (behind it, above and below). */
const SCHOOL_PLACES: [number, number][] = [
  [0.55, -0.32],
  [0.7, 0.3],
  [1.15, -0.05],
  [1.4, 0.38],
];

const MAX_SCHOOL = Math.max(0, ...Object.values(BEAST_TEMPER).map((t) => t.school ?? 0));

export class BeastsLayer {
  private readonly wild: BeastSprite[];
  /** The rest of a school (barracudas): drawn around the leader, who is the one you fight. */
  private readonly school: BeastSprite[][];
  private readonly mount: BeastSprite;
  private readonly glow: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, g: GameState) {
    this.glow = scene.add.graphics();
    layer.add(this.glow);
    this.wild = g.beasts.wilds.map(() => new BeastSprite(scene, layer));
    this.school = g.beasts.wilds.map((w) =>
      Array.from(
        // an endless slot can be any species: room for the biggest school
        { length: w.spawn.endless ? MAX_SCHOOL : (BEAST_TEMPER[w.spawn.speciesId]?.school ?? 0) },
        () => new BeastSprite(scene, layer),
      ),
    );
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
    const b = activeBeast(g);
    const ly = up * c.length * (b ? (speciesOf(b.form).girth ?? 1) : 1);
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
      const mates = this.school[i] ?? [];
      if (!isInWater(w)) {
        s.hide();
        for (const m of mates) m.hide();
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
        girth: speciesOf(w.form).girth,
        whale: CETACEANS.includes(w.form.speciesId),
        flash: w.flash,
        alpha: 1,
        turn: w.turn,
        turnFrom: w.turnFrom,
      });
      // the school: behind and around the leader, each a little out of step
      const schoolSize = BEAST_TEMPER[w.form.speciesId]?.school ?? 0;
      mates.forEach((m, k) => {
        if (k >= schoolSize) {
          m.hide();
          return;
        }
        const [bx, by] = SCHOOL_PLACES[k % SCHOOL_PLACES.length]!;
        const wob = Math.sin(time * 1.3 + k * 2.1) * 0.08;
        m.update({
          key: spriteOf(w.form),
          pale: isPaleSprite(w.form),
          x: w.x - w.face * w.length * bx,
          y: w.y + w.length * (by + wob),
          face: w.face,
          pitch: w.pitch,
          pitchV: w.pitchV,
          phase: w.phase + 1.3 * (k + 1),
          jaw: 0,
          length: w.length * (0.82 + 0.06 * k),
          whale: CETACEANS.includes(w.form.speciesId),
          flash: w.flash,
          alpha: 1,
          turn: w.turn,
          turnFrom: w.turnFrom,
        });
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
        girth: speciesOf(b.form).girth,
        whale: CETACEANS.includes(b.form.speciesId),
        flash: c.flash,
        alpha: c.alpha,
        turn: c.turn,
        turnFrom: c.turnFrom,
      });
    else this.mount.hide();
  }
}

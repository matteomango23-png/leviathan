// Draws the wild beasts and the mount you ride, and works out where the rider sits. Rare beasts are told by their
// pictures and size: no glow around them any more (owner, 16 ottobre 2026: "fa schifo"). Health is shown in
// battle, not in the open sea.
import Phaser from 'phaser';
import { temperOf } from '../systems/beasts/roam';
import { isWorn, type WildBeast } from '../systems/beasts/wildState';
import { PACK } from '../data/beasts';
import type { Mount } from '../systems/beasts/mount';
import type { TeamBeast } from '../systems/beasts/team';
import { CLARITY } from '../data/sea';
import { shapeShare } from '../systems/clarity';
import { BEAST_TEMPER, TEAM_RULES } from '../data/beasts';
import { activeBeast } from '../systems/beastPlay';
import { artKeysOf, backOfForm, formKey, speciesOf, swimLook, type BeastForm } from '../systems/beasts/forms';
import { riderSeat } from '../systems/beasts/combat';
import { riderForwardOf } from '../systems/beasts/mountTraits';
import { seatLag } from '../systems/beasts/seat';
import { SPRITE_KEYS } from '../data/sprites.generated';
import { isInWater } from '../systems/beasts/wildState';
import type { GameState } from '../systems/game';
import { BeastSprite } from './beastView';
import { PackTrail } from './packFormation';

const spriteOf = (form: BeastForm): string =>
  artKeysOf(form).find((k) => SPRITE_KEYS.includes(k)) ?? formKey(form);

/** An albino without its own sprite yet is drawn with the species' one, lightened. */
const isPaleSprite = (form: BeastForm): boolean =>
  form.variant === 'albino' && !form.unique && spriteOf(form) !== formKey(form);

const MAX_SCHOOL = Math.max(0, ...Object.values(BEAST_TEMPER).map((t) => t.school ?? 0));

/** A colour between two (0 … 1). */
function mixTint(a: number, b: number, t: number): number {
  const ch = (sh: number): number =>
    Math.round(((a >> sh) & 255) + (((b >> sh) & 255) - ((a >> sh) & 255)) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

export class BeastsLayer {
  private readonly wild: BeastSprite[];
  /** The rest of a school (barracudas): drawn around the leader, who is the one you fight. */
  private readonly school: BeastSprite[][];
  private readonly mount: BeastSprite;
  /** Your companions (systems/pack.ts): two with you and one leaving, at most. */
  private readonly pack: BeastSprite[];
  /** How much each wild beast shows as a dark shape now (easing towards the water's own), and the last time. */
  private readonly shapeNow: number[] = [];
  private lastTime = NaN;
  /** Each leader's wake, for its pack to follow (packFormation.ts). */
  private readonly trails: PackTrail[] = [];
  /** The health a wild beast has left after your weapons wore it down (systems/swimFight.ts), over it. */
  private readonly bars: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, g: GameState) {
    this.wild = g.beasts.wilds.map(() => new BeastSprite(scene, layer));
    this.school = g.beasts.wilds.map((w) =>
      Array.from(
        // an endless slot can be any species: room for the biggest school
        { length: w.spawn.endless ? MAX_SCHOOL : (BEAST_TEMPER[w.spawn.speciesId]?.school ?? 0) },
        () => new BeastSprite(scene, layer),
      ),
    );
    this.mount = new BeastSprite(scene, layer);
    this.bars = scene.add.graphics();
    layer.add(this.bars);
    this.pack = Array.from({ length: PACK.size + 1 }, () => new BeastSprite(scene, layer));
  }

  /** Where the diver sits on the ridden beast (world), or null on foot. */
  riderPose(g: GameState): { x: number; y: number; pitch: number } | null {
    const c = g.beasts.mount;
    if (!g.beasts.riding || !c) return null;
    const b = activeBeast(g);
    const sp = b ? speciesOf(b.form) : undefined;
    const [fwd, up] = riderSeat(
      c,
      b ? riderForwardOf(b.form) : TEAM_RULES.riderOffset[0],
      TEAM_RULES.riderOffset[1],
      b ? backOfForm(b.form) : undefined,
    );
    const cos = Math.cos(c.pitch);
    const sin = Math.sin(c.pitch);
    const lx = fwd * c.length;
    const ly = up * c.length * (sp?.girth ?? 1);
    // climbing on: from where you were into the seat (systems/beasts/seat.ts)
    const lag = c.seatFrom ? seatLag(c.seatT ?? 0) : 0;
    return {
      x: c.x + (lx * cos - ly * sin) * c.face + (c.seatFrom?.x ?? 0) * lag,
      y: c.y + lx * sin + ly * cos + (c.seatFrom?.y ?? 0) * lag,
      pitch: c.pitch * (1 - lag),
    };
  }

  /** @param shapes murky water (clarity.ts): how murky, and where your light is (the beasts far from it are dark
   *  shapes) */
  /** A thin bar over a wounded wild beast: what it has left (red when worn down to the limit). */
  private woundBar(x: number, y: number, length: number, wounds: number): void {
    const w = Math.max(14, Math.min(40, length * 0.4));
    const left = 1 - wounds;
    this.bars.fillStyle(0x02070c, 0.7).fillRect(x - w / 2 - 0.6, y - 0.6, w + 1.2, 3.2);
    this.bars.fillStyle(left <= 0.5 ? 0xe0533c : 0xe6c45a, 0.95).fillRect(x - w / 2, y, w * left, 2);
  }

  /**
   * Its mood over it (owner, 24 ottobre: the fight before the battle must read at a glance): a pulsing red mark when
   * it hunts you (it will bite: it goes first), a yellow one when it is wary or limping away worn down; none calm.
   */
  private moodMark(w: WildBeast, time: number): void {
    const hunting = temperOf(w) === 'aggressive' && !isWorn(w) && (w.mood === 'chase' || !!w.stalk);
    const wary = !hunting && ((w.provoked ?? 0) > 0 || isWorn(w) || w.mood === 'flee');
    if (!hunting && !wary) return;
    const y = w.y - w.length * 0.32 - (w.wounds ? 6 : 3);
    const pulse = hunting ? 0.6 + 0.4 * Math.sin(time * 8) : 0.85;
    const r = hunting ? 2.2 : 1.8;
    this.bars.fillStyle(0x02070c, 0.6 * pulse).fillCircle(w.x, y, r + 0.8);
    this.bars.fillStyle(hunting ? 0xe0533c : 0xe6c45a, pulse).fillCircle(w.x, y, r);
  }

  update(g: GameState, time: number, shapes: { murk: number; x: number; y: number } | null = null): void {
    const dt = Number.isNaN(this.lastTime) ? 1 : Math.max(0, Math.min(1, time - this.lastTime));
    this.lastTime = time;
    // out of the picture nothing is drawn (owner, 11 ottobre: slow with many beasts and their packs under the ship)
    const v = g.beasts.view;
    const unseen = (x: number, y: number, len: number): boolean =>
      !!v && (x + len < v.x || x - len > v.x + v.width || y + len < v.y || y - len > v.y + v.height);
    this.bars.clear();
    g.beasts.wilds.forEach((w, i) => {
      const s = this.wild[i]!;
      const mates = this.school[i] ?? [];
      if (!isInWater(w)) {
        s.hide();
        for (const m of mates) m.hide();
        this.shapeNow[i] = NaN;
        return;
      }
      // a dark shape little by little (owner, 9 ottobre: seen, then a shape a second later at a stroke)
      const want = shapes ? shapeShare(shapes.murk, Math.hypot(w.x - shapes.x, w.y - shapes.y)) : 0;
      const was = this.shapeNow[i] ?? NaN;
      const now = Number.isNaN(was) ? want : was + (want - was) * Math.min(1, dt * CLARITY.shapesEase);
      this.shapeNow[i] = now;
      const shade = now > 0.01 ? mixTint(0xffffff, CLARITY.shapeTint, now) : undefined;
      if (unseen(w.x, w.y, w.length)) s.hide();
      else
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
          ...swimLook(w.form),
          flash: w.flash,
          alpha: 1,
          shade,
        });
      if (w.wounds && !unseen(w.x, w.y, w.length))
        this.woundBar(w.x, w.y - w.length * 0.32, w.length, w.wounds);
      if (!unseen(w.x, w.y, w.length)) this.moodMark(w, time);
      // its pack: as many as are left (block 5b), each following the leader's wake a moment behind
      const schoolSize = Math.min(BEAST_TEMPER[w.form.speciesId]?.school ?? 0, w.pack);
      const trail = (this.trails[i] ??= new PackTrail());
      trail.push({ t: time, x: w.x, y: w.y, face: w.face, pitch: w.pitch }, w.mood, dt);
      mates.forEach((m, k) => {
        if (k >= schoolSize) {
          m.hide();
          return;
        }
        const at = trail.mate(time, k, w.length, time);
        if (!at || unseen(at.x, at.y, w.length)) {
          m.hide();
          return;
        }
        m.update({
          key: spriteOf(w.form),
          pale: isPaleSprite(w.form),
          x: at.x,
          y: at.y,
          face: at.face,
          pitch: at.pitch,
          pitchV: w.pitchV,
          phase: w.phase + 1.3 * (k + 1),
          jaw: 0,
          length: w.length * (0.82 + 0.06 * k),
          ...swimLook(w.form),
          flash: w.flash,
          alpha: 1,
          shade,
        });
      });
    });
    drawOwn(this.mount, g.beasts.mount, activeBeast(g));
    // your companions (systems/pack.ts)
    this.pack.forEach((sp, i) => {
      const c = g.beasts.pack[i];
      drawOwn(sp, c, c && g.beasts.team.find((x) => x.uid === c.uid));
    });
  }
}

/** One of your beasts in the water: the one you ride or a companion. */
function drawOwn(s: BeastSprite, c: Mount | null | undefined, b: TeamBeast | undefined): void {
  if (!c || !b) return s.hide();
  s.update({
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
    ...swimLook(b.form),
    flash: c.flash,
    alpha: c.alpha,
  });
}

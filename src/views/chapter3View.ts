// Chapter 3 in the world: the amphitheatre's red corals, the winches on its terraces and the chains that hold the
// Re Corallo (to the winches, and the middle one up to the Vedova's ship). Before he rises he struggles at the
// bottom of the bowl; beaten, he lies there exhausted until the last chain breaks.
import Phaser from 'phaser';
import { ARENA, CORAL_KING } from '../data/chapter3';
import { WORLD } from '../data/worldLayout';
import { chainPoints, kingDown, kingRestY } from '../systems/chapter3';
import { formLengthUnits } from '../systems/beasts/forms';
import { isInWater } from '../systems/beasts/wildState';
import type { GameState } from '../systems/game';
import { hash2 } from '../systems/math';
import { arenaFloor } from '../systems/world/arena';
import { BeastSprite } from './beastView';

const KING_FORM = { speciesId: CORAL_KING.speciesId, variant: 'comune' as const };
const CORAL_COLORS = [0xa3263a, 0xc8484a, 0x8a2a4a, 0xd06a50];

export class Chapter3View {
  private readonly corals: Phaser.GameObjects.Graphics;
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly king: BeastSprite;
  private readonly length = formLengthUnits(KING_FORM, CORAL_KING.level);

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.corals = scene.add.graphics();
    layer.add(this.corals); // behind him
    this.king = new BeastSprite(scene, layer);
    this.g = scene.add.graphics();
    layer.add(this.g);
    this.drawCorals();
  }

  /** Red coral fans and branches along the terraces (fixed: drawn once). */
  private drawCorals(): void {
    const c = this.corals;
    for (let i = 0; i < 46; i++) {
      const x = ARENA.x - ARENA.rx + 4 + hash2(i, 3.1) * (ARENA.rx * 2 - 8);
      const floor = arenaFloor(x);
      if (floor === null) continue;
      const h = 5 + hash2(i, 7.7) * 12;
      const color = CORAL_COLORS[i % CORAL_COLORS.length]!;
      c.lineStyle(1.1, color, 0.95);
      for (let b = 0; b < 4; b++) {
        const a = -Math.PI / 2 + (b - 1.5) * 0.35 + (hash2(i, b) - 0.5) * 0.3;
        c.lineBetween(x, floor, x + Math.cos(a) * h, floor + Math.sin(a) * h);
      }
      c.fillStyle(color, 0.8).fillCircle(x, floor - h * 0.85, 1.2);
    }
  }

  update(g: GameState, time: number): void {
    const f = this.g.clear();
    const step = g.story.step;
    const wild = g.beasts.wilds.find((w) => w.storyBoss);
    const active = step === 'chapter2Done' || step === 'freeKing';
    const out = !!wild && isInWater(wild);
    // where the chains hold him: the beast in the water, or chained at the bottom of the bowl
    let kx = ARENA.x;
    let ky = kingRestY(ARENA.x);
    if (out && wild) {
      kx = wild.x;
      ky = wild.y;
      this.king.hide();
    } else if (active) {
      const down = kingDown(g);
      this.king.update({
        key: CORAL_KING.speciesId,
        x: kx + (down ? 0 : Math.sin(time * 5) * 1.5),
        y: ky,
        face: 1,
        pitch: down ? 0.12 : 0,
        pitchV: 0,
        phase: down ? 0 : time * 6,
        jaw: 0,
        length: this.length,
        flash: 0,
        alpha: 1,
      });
    } else this.king.hide();
    if (!active) return;
    const broken = g.chapter3.chains;
    chainPoints().forEach((p, i) => {
      const done = broken[i]! <= 0;
      if (!p.toShip) {
        // the winch: an iron drum on a post
        f.fillStyle(0x2a2420, 1).fillRect(p.x - 2.5, p.y - 8, 5, 12);
        f.fillStyle(0x4a3426, 1).fillCircle(p.x, p.y - 8, 3.6);
        f.lineStyle(1, 0x6a3a1c, 1).strokeCircle(p.x, p.y - 8, 3.6);
      } else {
        f.lineStyle(1.6, 0x6a3a1c, 1).strokeCircle(p.x, p.y, 3); // the shackle on the middle chain
      }
      f.lineStyle(1.4, 0x4a3426, 1);
      if (done) {
        // a broken end dangling from the winch (or from the ship)
        const top = p.toShip ? WORLD.surfaceY : p.y - 8;
        f.lineBetween(p.x, top, p.x + Math.sin(time + i) * 3, top + 18);
        return;
      }
      const pull = Math.sin(time * 2.3 + i) * (kingDown(g) ? 1 : 4);
      const from = p.toShip ? { x: CORAL_KING.shipX, y: WORLD.surfaceY + 4 } : { x: p.x, y: p.y - 8 };
      const mx = (from.x + kx) / 2 + pull;
      const my = (from.y + ky) / 2 + (p.toShip ? 0 : 6);
      f.lineBetween(from.x, from.y, mx, my);
      f.lineBetween(mx, my, kx, ky);
    });
  }

  /** The winches glow faintly once he is down, so you find them in the dark. */
  glowSpots(g: GameState): { x: number; y: number; r: number }[] {
    if (g.story.step !== 'freeKing') return [];
    return chainPoints()
      .filter((_, i) => g.chapter3.chains[i]! > 0)
      .map((p) => ({ x: p.x, y: p.y - 6, r: kingDown(g) ? 16 : 8 }));
  }
}

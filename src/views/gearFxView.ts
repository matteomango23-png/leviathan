// Effects of weapons and backpack: darts and net in flight, net bursts, electric pulses,
// the sardine swarm circling the diver and the turtle's shield.
import Phaser from 'phaser';
import { SWARM_RULES } from '../data/economy';
import { SARDINE } from '../data/diver';
import type { GameEvent } from '../systems/events';
import type { GameState } from '../systems/game';
import { SARDINE_TEX, TEX } from './textures';

export class GearFxView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly ring: Phaser.GameObjects.Image[] = [];
  private pulses: { x: number; y: number; r: number; t: number }[] = [];

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.g = scene.add.graphics();
    layer.add(this.g);
    const scale = (SARDINE.lengthUnits * 0.8) / SARDINE_TEX.w;
    for (let i = 0; i < SWARM_RULES.ringFish; i++) {
      const im = scene.add.image(0, 0, TEX.sardine).setScale(scale).setVisible(false);
      this.ring.push(im);
    }
    layer.add(this.ring);
  }

  onEvents(events: GameEvent[]): void {
    for (const e of events)
      if (e.type === 'areaPulse') this.pulses.push({ x: e.x, y: e.y, r: e.radius, t: 0.5 });
  }

  update(gs: GameState, pos: { x: number; y: number }, dt: number, time: number): void {
    const g = this.g;
    g.clear();
    for (const p of gs.weapons.projectiles) {
      if (p.kind === 'dart') {
        const len = Math.hypot(p.vx, p.vy) || 1;
        g.lineStyle(0.6, 0xd9e6e8, 0.9);
        g.lineBetween(p.x - (p.vx / len) * 5, p.y - (p.vy / len) * 5, p.x, p.y);
      } else {
        g.lineStyle(0.4, 0xc8b88a, 0.9);
        g.strokeCircle(p.x, p.y, 4);
        g.lineBetween(p.x - 4, p.y, p.x + 4, p.y);
        g.lineBetween(p.x, p.y - 4, p.x, p.y + 4);
      }
    }
    for (const b of gs.weapons.bursts) {
      const r = 26 * (1 - b.t * 0.6);
      g.lineStyle(0.5, 0xc8b88a, b.t * 1.6);
      g.strokeCircle(b.x, b.y, r);
      for (let a = 0; a < Math.PI; a += Math.PI / 4)
        g.lineBetween(
          b.x - Math.cos(a) * r,
          b.y - Math.sin(a) * r,
          b.x + Math.cos(a) * r,
          b.y + Math.sin(a) * r,
        );
    }
    this.pulses = this.pulses.filter((p) => (p.t -= dt) > 0);
    for (const p of this.pulses) {
      g.lineStyle(1.2, 0xb07bff, p.t * 1.6);
      g.strokeCircle(p.x, p.y, p.r * (1 - p.t));
      g.lineStyle(0.6, 0xffe08a, p.t * 1.4);
      g.strokeCircle(p.x, p.y, p.r * (1 - p.t) * 0.8);
    }
    // turtle shield
    if (gs.beasts.effects.shield > 0) {
      g.lineStyle(0.8, 0xd9a24a, 0.5 + 0.2 * Math.sin(time * 5));
      g.strokeCircle(pos.x, pos.y, 10);
    }
    if (gs.beasts.effects.guardTime > 0 && gs.beasts.companion) {
      g.fillStyle(0xd9a24a, 0.08);
      g.fillCircle(pos.x, pos.y, 40);
    }
    // sardine swarm around the diver
    const decoy = gs.beasts.decoy;
    this.ring.forEach((im, i) => {
      im.setVisible(!!decoy);
      if (!decoy) return;
      const a = time * 2.2 + (i / this.ring.length) * Math.PI * 2;
      const r = SWARM_RULES.ringRadius + Math.sin(time * 3 + i) * 3;
      const x = pos.x + Math.cos(a) * r;
      const y = pos.y + Math.sin(a) * r * 0.7;
      const flip = Math.sin(a) > 0;
      im.setPosition(x, y).setRotation(a + Math.PI / 2 + (flip ? Math.PI : 0));
    });
  }
}

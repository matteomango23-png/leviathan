// What a sea battle shows of the shots to come (owner, 17 novembre 2026): while you drag from the gun's button, the
// first stretch of your shell's arc (only the start: the aim is yours); each Compagnia gun glinting red before it
// fires; and where their shells in the air will fall, a red mark on the water to get away from. Look only.
import Phaser from 'phaser';
import { BATTLE } from '../data/company';
import { WORLD } from '../data/worldLayout';
import { enemyGun } from '../systems/company/enemyFire';
import { landingX, shellPath } from '../systems/company/ordnance';
import { gunPoint, yourWeapon } from '../systems/company/yourFire';
import type { GameState } from '../systems/game';
import { SoftPuffs } from './softPuffs';

/** How long a whole arc is drawn for at most (s), before the share that shows. Tuning. */
const ARC_SECONDS = 3;

export class AimView {
  private readonly dots: SoftPuffs;

  constructor(scene: Phaser.Scene, glowLayer: Phaser.GameObjects.Layer) {
    this.dots = new SoftPuffs(scene, glowLayer, true);
  }

  update(g: GameState, aim: number | null, time: number, zoom: number): void {
    this.dots.begin();
    const c = g.company;
    const px = 1 / zoom; // one screen pixel in the world
    if (c.battle && aim !== null && g.ship.aboard) {
      const weapon = yourWeapon(g, 'shell');
      if (weapon) {
        const path = shellPath(gunPoint(g), aim, weapon, ARC_SECONDS * BATTLE.arcShare, 14);
        path.forEach((p, i) => this.dots.puff(p.x, p.y, 7 * px, 0xffe0a0, 0.9 * (1 - i / path.length)));
      }
    }
    const pulse = 0.6 + 0.4 * Math.sin(time * 14);
    for (const e of c.enemies) {
      if (e.sinkT > 0 || !e.aimAt || e.aimT <= 0) continue;
      const gun = enemyGun(e);
      this.dots.puff(gun.x, gun.y, 16 * px, 0xff3020, 0.9 * pulse);
    }
    for (const s of c.shots) {
      if (s.from !== 'enemy') continue;
      const x = landingX(s);
      if (x === null) continue;
      this.dots.puff(x, WORLD.surfaceY, 22 * px, 0xff4030, 0.55 * pulse);
    }
    this.dots.end();
  }
}

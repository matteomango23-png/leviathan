// Which way the light points (split from worldViews.ts in the cleanup of 17 novembre 2026): a vehicle's headlight
// where its nose points, at once, turning with the hull on the waves (owner, 8 ottobre for the boat and 13 novembre
// 2026 for the ship and the submarine: no slow turns through the sea); the diver's lamp follows his aim gently and
// turns round with him at once. Look only.
import type { GameState } from '../systems/game';
import { lampAim } from '../systems/submarine';

export class LampTurn {
  angle: number;
  /** Which way the diver faced last frame (his lamp mirrors with him when he turns). */
  private face: 1 | -1 = 1;

  constructor(aim: number) {
    this.angle = aim;
  }

  /** @param tilt how the vehicle's hull is turned now (radians) */
  update(g: GameState, tilt: number, dt: number): number {
    const d = g.diver;
    let da = lampAim(g) - this.angle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    if (g.boat.aboard || g.ship.aboard || g.sub.aboard) this.angle = lampAim(g) + tilt;
    else if (d.face !== this.face) this.angle = lampAim(g);
    else this.angle += da * Math.min(1, dt * 6);
    this.face = d.face;
    return this.angle;
  }
}

// The Compagnia dell'Olio Nero's views together (systems/company/): its vessels, the shots and bursts, and what a
// sea battle shows of the shots to come. Look only.
import Phaser from 'phaser';
import type { CameraRig } from './cameraRig';
import type { GameEvent } from '../systems/events';
import type { GameState } from '../systems/game';
import type { SeaNow } from '../systems/sea';
import { AimView } from './aimView';
import { EnemyView } from './enemyView';
import { OrdnanceView } from './ordnanceView';

export class CompanyViews {
  private readonly enemies: EnemyView;
  private readonly ordnance: OrdnanceView;
  private readonly aim: AimView;

  constructor(scene: Phaser.Scene, rig: CameraRig) {
    const L = rig.layers;
    this.enemies = new EnemyView(scene, L.world, L.glow);
    this.ordnance = new OrdnanceView(scene, L.world, L.glow);
    this.aim = new AimView(scene, L.glow);
  }

  /** @param aim your gun's aim while you drag (radians) or null */
  update(g: GameState, rig: CameraRig, sea: SeaNow, aim: number | null, dt: number): void {
    const zoom = rig.zoom;
    this.enemies.update(g.company, g.time, dt, sea, zoom, rig.worldView());
    this.ordnance.update(g.company, dt);
    this.aim.update(g, aim, g.time, zoom);
  }

  onEvent(e: GameEvent): void {
    this.ordnance.onEvent(e);
  }

  /** The flashes of the guns and the bursts light the dark (views/lightView.ts). */
  glowSpots(): { x: number; y: number; r: number; a: number }[] {
    return this.ordnance.glowSpots();
  }
}

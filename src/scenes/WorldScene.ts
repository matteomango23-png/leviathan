// World: runs the game step and draws the sea. No rules live here, only wiring and drawing.
import Phaser from 'phaser';
import { CAMERA, DIVER, SAVE } from '../data/diver';
import type { GameEvent } from '../systems/events';
import { applySave, createGame, stepGame, toSave, type GameState } from '../systems/game';
import type { SaveData } from '../systems/save/saveData';
import { backupBrokenSave, loadFromStorage, writeToStorage } from '../systems/save/storage';
import { generateWorld } from '../systems/world/worldGen';
import { BackgroundView } from '../views/backgroundView';
import { CameraRig } from '../views/cameraRig';
import { DiverView } from '../views/diverView';
import { EffectsView } from '../views/effectsView';
import { FishView } from '../views/fishView';
import { KelpView } from '../views/kelpView';
import { LightView } from '../views/lightView';
import { TerrainView } from '../views/terrainView';
import type { SceneData, Session } from './session';

export class WorldScene extends Phaser.Scene {
  private session!: Session;
  private state!: GameState;
  private rig!: CameraRig;
  private bg!: BackgroundView;
  private terrain!: TerrainView;
  private kelp!: KelpView;
  private fishView!: FishView;
  private diverView!: DiverView;
  private effects!: EffectsView;
  private light!: LightView;
  private saveTimer = 0;
  private hurtFlash = 0;
  private lampAngle = 0;

  constructor() {
    super('World');
  }

  init(data: SceneData): void {
    this.session = data.session;
  }

  create(): void {
    const map = generateWorld();
    const loaded = loadFromStorage();
    if (!loaded.ok) {
      backupBrokenSave();
      this.time.delayedCall(800, () =>
        this.session.emit('toast', `Salvataggio non leggibile (${loaded.error}). Ne ho tenuto una copia.`),
      );
    }
    this.state = createGame(map, loaded.ok ? loaded.save : null);
    this.session.game = this.state;
    const d = this.state.diver;

    this.rig = new CameraRig(this, map.width, map.height, d.x, d.y);
    const L = this.rig.layers;
    this.bg = new BackgroundView(this, L.bg);
    this.terrain = new TerrainView(this, L.world, map);
    this.kelp = new KelpView(this, L.world, L.front, map);
    this.fishView = new FishView(this, L.world, this.state.fish);
    this.diverView = new DiverView(this, L.world);
    this.effects = new EffectsView(this, L.world);
    this.light = new LightView(this, L.overlay);
    this.lampAngle = d.aim;

    this.rig.follow(d.x + d.face * CAMERA.lookAhead, d.y, 0, true);
    this.terrain.update(this.rig.worldView(), true);

    this.scale.on('resize', this.onResize, this);
    this.session.on('importSave', this.onImport, this);
    this.session.on('saveNow', this.save, this);
    const onHide = (): void => {
      if (document.visibilityState === 'hidden') this.save();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', this.save);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.onResize, this);
      this.session.off('importSave', this.onImport, this);
      this.session.off('saveNow', this.save, this);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', this.save);
    });
  }

  private onResize(size: Phaser.Structs.Size): void {
    this.rig.resize(size.width, size.height);
    this.terrain.update(this.rig.worldView(), true);
  }

  private readonly save = (): void => {
    writeToStorage(toSave(this.state, new Date()));
  };

  private onImport(save: SaveData): void {
    applySave(this.state, save);
    writeToStorage(toSave(this.state, new Date()));
    const d = this.state.diver;
    this.rig.follow(d.x, d.y, 0, true);
    this.terrain.update(this.rig.worldView(), true);
    this.session.emit('toast', 'Salvataggio caricato.');
  }

  private handleEvents(events: GameEvent[]): void {
    for (const e of events) {
      if (e.type === 'bubble') this.effects.bubble(e.x, e.y);
      else if (e.type === 'dash')
        for (let i = 0; i < 5; i++) this.effects.bubble(e.x + Math.random() * 8 - 4, e.y);
      else if (e.type === 'hurt') {
        this.hurtFlash = 0.5;
        this.rig.shake();
      } else if (e.type === 'harpoonHitRock') this.effects.puff(e.x, e.y, 3, 0x9aaaaa, 30);
      else if (e.type === 'fishCaught') this.save();
      else if (e.type === 'respawned') this.rig.follow(this.state.diver.x, this.state.diver.y, 0, true);
    }
    if (events.length) this.session.emit('gameEvents', events);
  }

  override update(_time: number, deltaMs: number): void {
    const dt = Math.min(0.05, deltaMs / 1000);
    const g = this.state;
    const input = this.session.input;
    if (this.session.tapScreen) {
      const dpr = this.scale.width / Math.max(1, this.sys.game.canvas.clientWidth);
      input.shotAt = this.rig.toWorld(this.session.tapScreen.x * dpr, this.session.tapScreen.y * dpr);
      this.session.tapScreen = null;
    }
    const events = stepGame(g, input, dt);
    input.shotAt = null;
    input.dash = false;
    this.handleEvents(events);

    this.saveTimer += dt;
    if (this.saveTimer >= SAVE.autosaveSeconds) {
      this.saveTimer = 0;
      if (!g.diver.dead) this.save();
    }

    const d = g.diver;
    this.rig.follow(d.x + d.face * CAMERA.lookAhead, d.y, dt);
    const view = this.rig.worldView();
    this.terrain.update(view);
    this.bg.update(this.rig.viewInfo(), g.time);
    this.kelp.update(view, g.time);
    this.fishView.update(g.fish, view, g.time, dt);
    this.diverView.update(d, g.harpoon, input.fireHeld ? input.aim : null, dt, g.time);
    this.effects.update(view, g.time, dt);

    let da = d.aim - this.lampAngle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    this.lampAngle += da * Math.min(1, dt * 6);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    const lowO2 =
      d.o2 < d.maxO2 * DIVER.oxygen.lowFraction && !d.dead ? 0.25 + 0.18 * Math.sin(g.time * 6) : 0;
    const fade = d.dead ? Phaser.Math.Clamp(1.4 - d.deadTime * 0.6, 0, 1) : 0;
    this.light.update(
      this.rig.viewInfo(),
      { x: d.x, y: d.y, angle: this.lampAngle, face: d.face },
      Math.max(this.hurtFlash, lowO2),
      fade,
    );
  }
}

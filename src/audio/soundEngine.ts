// The game's sound: one Web Audio context, a master volume with the on/off switch, the sea ambience (with the open
// sea's music beyond a kilometre) and the battle music crossfading. Browsers (iPhone above all) only start sound after a touch: the context is
// resumed on the first one. Owned by the Session (no globals); scenes tell it what is happening.
import { AUDIO, STORM_SOUND } from '../data/audio';
import { StormSound } from './stormSound';
import { SEA_MUSIC } from '../data/music';
import { BattleMusic } from './battleMusic';
import { SeaAmbience, type SeaMoment } from './seaAmbience';
import { EngineSound } from './engineSound';
import { SeaMusic } from './seaMusic';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sea: SeaAmbience | null = null;
  private music: BattleMusic | null = null;
  private openSea: SeaMusic | null = null;
  private storm: StormSound | null = null;
  private engines: EngineSound | null = null;
  private battle = false;
  private on = readEnabled();

  constructor() {
    const unlock = (): void => {
      this.start();
      void this.ctx?.resume();
    };
    for (const ev of ['pointerdown', 'keydown', 'touchend'])
      window.addEventListener(ev, unlock, { capture: true, passive: true });
  }

  get enabled(): boolean {
    return this.on;
  }

  setEnabled(on: boolean): void {
    this.on = on;
    try {
      localStorage.setItem(AUDIO.storageKey, on ? '1' : '0');
    } catch {
      // storage blocked: the choice lasts until the page closes
    }
    this.applyMaster();
  }

  /** Every frame in the sea. */
  updateSea(m: SeaMoment, dt: number): void {
    if (!this.ctx || this.ctx.state !== 'running' || this.battle) {
      this.engines?.update(null, null);
      return;
    }
    this.sea?.update(m, dt);
    const o = this.openSea;
    if (o) o.set(o.playing ? m.km > SEA_MUSIC.offKm : m.km > SEA_MUSIC.fromKm);
  }

  /**
   * Every frame: the engines (null: off, or not yours to hear). `shipNear` 1 next to the ship … 0 far from it: a
   * running engine is heard less the farther you swim (owner, 8 ottobre).
   */
  updateEngines(ship: number | null, sub: number | null, shipNear = 1): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    this.engines?.update(this.battle ? null : ship, this.battle ? null : sub, shipNear);
  }

  /** The sea stops (pause, menus): the engines fall silent at once (they are not updated while it waits). */
  silence(): void {
    this.engines?.update(null, null);
    this.storm?.setRain(0);
  }

  /** The ship's engine starting or stopping, heard as near as you are (1 aboard … 0 far). */
  engineStartStop(start: boolean, near: number): void {
    if (this.ctx?.state === 'running' && !this.battle) this.engines?.startStop(start, near);
  }

  /** The rain where you are, 0 … 1 (muffled under water: the caller lowers it). */
  setRain(level: number): void {
    if (this.ctx?.state === 'running') this.storm?.setRain(this.battle ? 0 : level);
  }

  /** Thunder after a flash, a moment later (sound is slower than light), `near` 0 … 1. */
  thunder(near: number): void {
    if (this.ctx?.state !== 'running' || this.battle) return;
    const [a, b] = STORM_SOUND.thunder.delay;
    this.storm?.thunder(a + Math.random() * (b - a), near);
  }

  /** The radar's parking-sensor beep (block 5c). */
  radarBeep(): void {
    if (this.ctx?.state === 'running' && !this.battle) this.engines?.beep();
  }

  /** The sonar's ping. */
  sonarPing(): void {
    if (this.ctx?.state === 'running' && !this.battle) this.engines?.ping();
  }

  /** A battle opens (true) or ends (false): the music takes over from the sea, and back. */
  setBattle(on: boolean): void {
    if (on === this.battle) return;
    this.battle = on;
    if (on) this.silence(); // the World scene waits under the battle: nobody updates the engines
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.sea?.fadeTo(on ? 0 : 1, t, AUDIO.fade);
    if (on) this.openSea?.set(false, AUDIO.fade); // after the battle the sea brings it back
    if (on) this.music?.play(t);
    else this.music?.stop(t, AUDIO.fade);
  }

  private start(): void {
    if (this.ctx) return;
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.applyMaster();
    this.sea = new SeaAmbience(this.ctx, this.master);
    this.music = new BattleMusic(this.ctx, this.master);
    this.engines = new EngineSound(this.ctx, this.master);
    this.openSea = new SeaMusic(this.ctx, this.master);
    this.storm = new StormSound(this.ctx, this.master);
    if (this.battle) {
      this.sea.fadeTo(0, this.ctx.currentTime, 0.01);
      this.music.play(this.ctx.currentTime);
    }
  }

  private applyMaster(): void {
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(this.on ? AUDIO.master : 0, this.ctx.currentTime, 0.05);
  }
}

function readEnabled(): boolean {
  try {
    return localStorage.getItem(AUDIO.storageKey) !== '0';
  } catch {
    return true;
  }
}

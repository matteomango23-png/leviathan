// The game's sound: one Web Audio context, a master volume with the on/off switch, the sea ambience and the
// battle music crossfading. Browsers (iPhone above all) only start sound after a touch: the context is
// resumed on the first one. Owned by the Session (no globals); scenes tell it what is happening.
import { AUDIO } from '../data/audio';
import { BattleMusic } from './battleMusic';
import { SeaAmbience, type SeaMoment } from './seaAmbience';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sea: SeaAmbience | null = null;
  private music: BattleMusic | null = null;
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
    if (!this.ctx || this.ctx.state !== 'running' || this.battle) return;
    this.sea?.update(m, dt);
  }

  /** A battle opens (true) or ends (false): the music takes over from the sea, and back. */
  setBattle(on: boolean): void {
    if (on === this.battle) return;
    this.battle = on;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.sea?.fadeTo(on ? 0 : 1, t, AUDIO.fade);
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

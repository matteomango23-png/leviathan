// The game's sound: one Web Audio context, a master volume with the on/off switch, the sea ambience (with the open
// sea's music beyond a kilometre) and the battle music crossfading. Browsers (iPhone above all) only start sound after a touch: the context is
// resumed on the first one. Owned by the Session (no globals); scenes tell it what is happening.
import { AUDIO, STALK_TOLL, STORM_SOUND } from '../data/audio';
import { StormSound } from './stormSound';
import { PORT_MUSIC, SEA_MUSIC, TITLE_MUSIC } from '../data/music';
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
  private port: SeaMusic | null = null;
  private title: SeaMusic | null = null;
  /** The title menu is showing (its own dark music). */
  private onTitle = false;
  /** A menu open over the sea: the pause menu or the port (its own music). */
  private menu: 'pause' | 'port' | null = null;
  private storm: StormSound | null = null;
  private engines: EngineSound | null = null;
  private battle = false;
  /** A hunter is stalking you: the battle music plays (stalkTension). */
  private stalking = false;
  private on = readEnabled();

  constructor() {
    // the first touch, click or key starts the sound (owner, 15 ottobre: it began only after touching the settings).
    // iPhone counts only the end of a touch or a click as a gesture (its start may be a scroll; owner, 22 ottobre:
    // "finché non clicco spesso l'audio non parte") and wants a sound played inside it: a silent instant does it.
    // Every later touch wakes it again if the phone stopped it (coming back to the app, a call…).
    const unlock = (): void => {
      this.start();
      this.wake();
    };
    for (const ev of ['pointerup', 'touchend', 'click', 'keydown'])
      window.addEventListener(ev, unlock, { capture: true, passive: true });
    // leaving the app: silent at once, no sound or music behind your back (owner, 20 ottobre); back to it: try at
    // once (if iOS keeps it "interrupted", the next touch wakes it), the game waiting in its pause menu
    const back = (): void => {
      if (document.visibilityState === 'hidden') this.hush();
      else {
        this.wake();
        this.applyMaster(AUDIO.unlockFade);
      }
    };
    document.addEventListener('visibilitychange', back);
    window.addEventListener('pageshow', back);
    window.addEventListener('pagehide', () => this.hush());
    window.addEventListener('focus', back);
  }

  /** Resumes the context if the browser or the phone stopped it, with a silent instant played (iOS unlock). */
  private wake(): void {
    const c = this.ctx;
    if (!c || c.state === 'running') return;
    // when it comes alive the sound rises gently, never at a stroke (owner, 22 ottobre: "parte proprio di botto")
    void c
      .resume()
      .then(() => this.applyMaster(AUDIO.unlockFade))
      .catch(() => undefined);
    try {
      const src = c.createBufferSource();
      src.buffer = c.createBuffer(1, 1, c.sampleRate);
      src.connect(c.destination);
      src.start(0);
    } catch {
      // a closed context: nothing to wake
    }
  }

  /** Silent now (no fade) and the sound stopped, until the app is back. */
  private hush(): void {
    const c = this.ctx;
    if (!c || !this.master) return;
    this.master.gain.cancelScheduledValues(c.currentTime);
    this.master.gain.setValueAtTime(0, c.currentTime);
    if (c.state === 'running') void c.suspend().catch(() => undefined);
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

  /** The sea stops (a battle): the engines and the rain fall silent (they are not updated while it waits). */
  silence(): void {
    this.engines?.update(null, null);
    this.storm?.setRain(0);
  }

  /**
   * A menu opens over the sea (pause, port) or closes (null): no more cutting everything at once (owner, 19 ottobre).
   * The engines and the rain fade, the sea goes on far away; at the port its own calm music plays.
   */
  menus(kind: 'pause' | 'port' | null): void {
    if (kind === this.menu) return;
    this.menu = kind;
    if (kind) this.silence();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (!this.battle) this.sea?.fadeTo(kind ? AUDIO.menuSea : 1, t, AUDIO.menuFade);
    // no music in the pause (owner, 20 ottobre): the sea brings it back when you are out there again
    if (kind) this.openSea?.set(false, AUDIO.menuFade);
    this.port?.set(kind === 'port');
  }

  /** The title menu shows (true) or the sea starts (false): its dark music fades in or out. */
  titleMusic(on: boolean): void {
    this.onTitle = on;
    this.title?.set(on);
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

  /** A hunter's warning before its charge (beasts/stalk.ts): a low toll, twice. */
  chargeWarn(): void {
    const c = this.ctx;
    if (!c || c.state !== 'running' || this.battle || !this.master) return;
    for (const [at, hz] of STALK_TOLL.notes) {
      const o = c.createOscillator();
      const gain = c.createGain();
      o.type = 'triangle';
      o.frequency.value = hz;
      const t = c.currentTime + at;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(STALK_TOLL.volume, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + STALK_TOLL.length);
      o.connect(gain).connect(this.master);
      o.start(t);
      o.stop(t + STALK_TOLL.length + 0.05);
    }
  }

  /** While a hunter stalks you, the battle music rises (the "Lo Squalo" pulse), and fades when it is over. */
  stalkTension(on: boolean): void {
    if (on === this.stalking || this.battle || !this.ctx) return;
    this.stalking = on;
    const t = this.ctx.currentTime;
    if (on) this.music?.play(t);
    else this.music?.stop(t, AUDIO.fade * 3);
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
    this.stalking = false;
  }

  private start(): void {
    if (this.ctx) return;
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    // iPhone: play like a music app, not like a ringtone (so the silent switch does not mute the game); set before
    // the sound is made, as Apple asks
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = 'playback';
    // a larger buffer: fewer crackles when the phone is busy (owner, 15 ottobre: "l'audio gracchia")
    this.ctx = new Ctx({ latencyHint: 'playback' });
    this.master = this.ctx.createGain();
    this.master.gain.value = 0; // it rises once the sound is alive (wake)
    // everything through a limiter: the sum never reaches the top and crackles (owner, 26 ottobre)
    const L = AUDIO.limiter;
    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = L.threshold;
    limiter.knee.value = L.knee;
    limiter.ratio.value = L.ratio;
    limiter.attack.value = L.attack;
    limiter.release.value = L.release;
    this.master.connect(limiter).connect(this.ctx.destination);
    if (this.ctx.state === 'running') this.applyMaster(AUDIO.unlockFade);
    this.sea = new SeaAmbience(this.ctx, this.master);
    this.music = new BattleMusic(this.ctx, this.master);
    this.engines = new EngineSound(this.ctx, this.master);
    this.openSea = new SeaMusic(this.ctx, this.master);
    this.port = new SeaMusic(this.ctx, this.master, PORT_MUSIC);
    this.title = new SeaMusic(this.ctx, this.master, TITLE_MUSIC);
    if (this.onTitle) this.title.set(true); // the sound started on the title menu
    const open = this.menu;
    this.menu = null;
    if (open) this.menus(open); // the sound started with a menu already open
    this.storm = new StormSound(this.ctx, this.master);
    if (this.battle) {
      this.sea.fadeTo(0, this.ctx.currentTime, 0.01);
      this.music.play(this.ctx.currentTime);
    }
  }

  /** The master volume, reached over about `seconds` (a quick change unless the sound has just come alive). */
  private applyMaster(seconds = 0.15): void {
    if (!this.ctx || !this.master) return;
    if (document.visibilityState === 'hidden') return; // away from the app it stays silent
    this.master.gain.setTargetAtTime(this.on ? AUDIO.master : 0, this.ctx.currentTime, seconds / 3);
  }
}

function readEnabled(): boolean {
  try {
    return localStorage.getItem(AUDIO.storageKey) !== '0';
  } catch {
    return true;
  }
}

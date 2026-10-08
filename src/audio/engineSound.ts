// The engines and the sonar (owner, 5 ottobre 2026): a deep throbbing diesel for the ship, a thin electric whine
// for the submarine, both louder and higher with the throttle; and the sonar's ping (with its echo) while it is on.
// Synthesized, no audio files. Numbers in data/audio.ts (ENGINE_SOUND).
import { ENGINE_SOUND } from '../data/audio';

interface Motor {
  osc: OscillatorNode;
  gain: GainNode;
  filter: BiquadFilterNode;
}

export class EngineSound {
  private readonly ship: Motor;
  private readonly sub: Motor;
  private readonly throb: OscillatorNode;

  constructor(
    private readonly ctx: AudioContext,
    private readonly dest: AudioNode,
  ) {
    this.ship = this.motor('sawtooth', ENGINE_SOUND.ship.cutoff);
    this.sub = this.motor('triangle', ENGINE_SOUND.sub.cutoff);
    // the diesel's throb: a slow wobble of the ship's volume, on its own stage after the volume (owner, 8 ottobre: added
    // straight to the volume, the wobble was heard even with the engine off)
    const wobble = ctx.createGain();
    wobble.gain.value = 1;
    this.ship.gain.disconnect();
    this.ship.gain.connect(wobble).connect(dest);
    this.throb = ctx.createOscillator();
    this.throb.frequency.value = ENGINE_SOUND.ship.throbHz;
    const depth = ctx.createGain();
    depth.gain.value = 0.35;
    this.throb.connect(depth).connect(wobble.gain);
    this.throb.start();
  }

  private motor(type: OscillatorType, cutoff: number): Motor {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    osc.connect(filter).connect(gain).connect(this.dest);
    osc.start();
    return { osc, gain, filter };
  }

  /**
   * @param ship 0…1 how hard the ship's engine works (null: off); @param sub the same for the submarine (null: not in it)
   * @param shipNear 1 next to the ship … 0 out of earshot
   */
  update(ship: number | null, sub: number | null, shipNear = 1): void {
    const t = this.ctx.currentTime;
    const set = (
      m: Motor,
      def: { freq: [number, number]; volume: [number, number] },
      v: number | null,
      near = 1,
    ): void => {
      const on = v !== null;
      const k = Math.max(0, Math.min(1, v ?? 0));
      m.osc.frequency.setTargetAtTime(def.freq[0] + (def.freq[1] - def.freq[0]) * k, t, ENGINE_SOUND.glide);
      m.gain.gain.setTargetAtTime(
        on ? (def.volume[0] + (def.volume[1] - def.volume[0]) * k) * near : 0,
        t,
        ENGINE_SOUND.glide,
      );
    };
    set(this.ship, ENGINE_SOUND.ship, ship, shipNear);
    set(this.sub, ENGINE_SOUND.sub, sub);
  }

  /** One sonar ping, and its faint echo. */
  ping(): void {
    const p = ENGINE_SOUND.ping;
    for (const [delay, gain] of [
      [0, 1],
      [p.echoDelay, p.echoGain],
    ] as const) {
      const at = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(p.freq, at);
      osc.frequency.exponentialRampToValueAtTime(p.freq * 0.92, at + p.seconds);
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(p.volume * gain, at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, at + p.seconds);
      osc.connect(g).connect(this.dest);
      osc.start(at);
      osc.stop(at + p.seconds + 0.05);
    }
  }

  /**
   * The ship's engine starting (owner, 8 ottobre): a few uneven coughs of the starter, then a rumble rising to the
   * idle; or stopping: the rumble sinking to nothing. near: 1 aboard … 0 out of earshot.
   */
  startStop(start: boolean, near: number): void {
    if (near <= 0) return;
    const S = ENGINE_SOUND.startStop;
    const at = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    filter.type = 'lowpass';
    filter.frequency.value = ENGINE_SOUND.ship.cutoff;
    const [lo, hi] = S.freq;
    osc.frequency.setValueAtTime(start ? lo : hi, at);
    osc.frequency.exponentialRampToValueAtTime(start ? hi : lo, at + S.seconds);
    g.gain.setValueAtTime(0, at);
    if (start)
      // the starter's coughs: short bursts, then the engine catches
      for (let k = 0; k < S.coughs; k++) {
        const c = at + k * S.coughGap;
        g.gain.linearRampToValueAtTime(S.volume * near, c + 0.03);
        g.gain.linearRampToValueAtTime(S.volume * near * 0.2, c + S.coughGap * 0.8);
      }
    else g.gain.linearRampToValueAtTime(S.volume * near, at + 0.05);
    g.gain.linearRampToValueAtTime(start ? S.volume * near : 0.0001, at + S.seconds);
    g.gain.exponentialRampToValueAtTime(0.0001, at + S.seconds + 0.25);
    osc.connect(filter).connect(g).connect(this.dest);
    osc.start(at);
    osc.stop(at + S.seconds + 0.3);
  }
}

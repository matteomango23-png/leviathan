// The open sea's music (data/music.ts, owner 9 ottobre 2026): a slow dirge sung by a low choir, a bass voice on
// the melody every other time round, a breathing drone and a far drum, all in a long echo. It fades in beyond a
// kilometre from the coast and out back under it; scheduled a bar at a time ahead on the audio clock. The same engine
// plays the harbour's calm piece (PORT_MUSIC) in the port's menu (owner, 19 ottobre).
import { MUSIC_ECHO_MAX, noteHz, SEA_MUSIC, VOICE_TONE, type MusicSpec, type VoiceSpec } from '../data/music';

export class SeaMusic {
  private readonly out: GainNode;
  private readonly bus: GainNode;
  /** Its echo: joined only while it plays (owner, 26 ottobre: three long echoes running always, even silent, were
   *  too much for the iPhone's sound and it crackled). */
  private readonly verb: ConvolverNode;
  private verbOn = false;
  private timer: number | null = null;
  private drone: OscillatorNode[] = [];
  private on = false;
  private bar = 0;
  private pass = 0;
  private nextAt = 0;

  /** @param m the piece: the open sea's (SEA_MUSIC) or the harbour's (PORT_MUSIC) */
  constructor(
    private readonly ctx: AudioContext,
    dest: AudioNode,
    private readonly m: MusicSpec = SEA_MUSIC,
  ) {
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(dest);
    this.bus = ctx.createGain();
    const dry = ctx.createGain();
    dry.gain.value = this.m.reverb.dry;
    this.bus.connect(dry).connect(this.out);
    this.verb = ctx.createConvolver();
    this.verb.buffer = echo(ctx, Math.min(this.m.reverb.seconds, MUSIC_ECHO_MAX));
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = this.m.reverb.cutoff;
    const wet = ctx.createGain();
    wet.gain.value = this.m.reverb.wet;
    this.verb.connect(tone).connect(wet).connect(this.out);
  }

  /** The echo joins while the piece plays, and leaves once it has died away. */
  private echoOn(on: boolean): void {
    if (on === this.verbOn) return;
    this.verbOn = on;
    if (on) this.bus.connect(this.verb);
    else this.bus.disconnect(this.verb);
  }

  get playing(): boolean {
    return this.on;
  }

  /** In the open sea (true) or not: fades in or out (in `fade` seconds, or the music's own); a fade back in goes on
   *  from where it was. */
  set(on: boolean, fade = on ? this.m.fadeIn : this.m.fadeOut): void {
    if (on === this.on) return;
    this.on = on;
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(this.out.gain.value, t);
    this.out.gain.setTargetAtTime(on ? this.m.volume : 0, t, fade / 3);
    if (!on) {
      window.setTimeout(() => this.halt(), fade * 1000 * 1.5);
      return;
    }
    this.echoOn(true);
    if (this.timer !== null) return; // still fading out: it goes on
    this.bar = 0;
    this.pass = 0;
    this.nextAt = t + 0.1;
    this.startDrone(t);
    this.timer = window.setInterval(() => this.schedule(), this.m.tickMs);
    this.schedule();
  }

  /** Silent now (a fade out over): nothing more is scheduled. */
  private halt(): void {
    if (this.on || this.timer === null) return;
    window.clearInterval(this.timer);
    this.timer = null;
    for (const o of this.drone) o.stop();
    this.drone = [];
    this.echoOn(false);
  }

  private schedule(): void {
    const barS = (60 / this.m.bpm) * this.m.beatsPerBar;
    while (this.nextAt < this.ctx.currentTime + this.m.lookahead) {
      this.playBar(this.bar, this.nextAt, barS);
      this.nextAt += barS;
      if (++this.bar >= this.m.bars.length) {
        this.bar = 0;
        this.pass++;
      }
    }
  }

  private playBar(i: number, at: number, barS: number): void {
    const b = this.m.bars[i]!;
    for (const n of this.m.chords[b.chord]) this.sing(noteHz(n), at, barS, this.m.choir);
    if (this.pass % this.m.melodyEvery === 0) {
      const beatS = 60 / this.m.bpm;
      let t = at;
      for (const [n, beats] of b.melody) {
        if (n !== null) this.sing(noteHz(n), t, beats * beatS, this.m.lead);
        t += beats * beatS;
      }
    }
    if (this.m.drum.bars.includes(i)) this.drum(at);
  }

  /** A sung note: two detuned soft waves with a vibrato, through the vowel's formants (VOICE_TONE). */
  private sing(hz: number, at: number, len: number, v: VoiceSpec): void {
    const c = this.ctx;
    const env = c.createGain();
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(v.volume, at + v.attack);
    env.gain.setValueAtTime(v.volume, at + Math.max(v.attack, len));
    env.gain.setTargetAtTime(0, at + Math.max(v.attack, len), v.release / 3);
    const soft = c.createBiquadFilter();
    soft.type = 'lowpass';
    soft.frequency.value = VOICE_TONE.cutoff;
    soft.connect(this.bus);
    env.connect(soft);
    const mix = c.createGain();
    for (const [f, g] of v.formants) {
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f;
      bp.Q.value = VOICE_TONE.formantQ;
      const lvl = c.createGain();
      lvl.gain.value = g * VOICE_TONE.formantGain;
      mix.connect(bp).connect(lvl).connect(env);
    }
    const end = at + Math.max(v.attack, len) + v.release * 1.5;
    const lfo = c.createOscillator();
    const depth = c.createGain();
    lfo.frequency.value = v.vibratoHz * (0.9 + Math.random() * 0.2);
    depth.gain.value = v.vibratoCents;
    lfo.connect(depth);
    lfo.start(at);
    lfo.stop(end);
    for (const side of [-1, 1]) {
      const o = c.createOscillator();
      o.type = VOICE_TONE.wave;
      o.frequency.value = hz;
      o.detune.value = side * v.detuneCents;
      depth.connect(o.detune);
      o.connect(mix);
      o.start(at + Math.random() * 0.08); // the singers do not all start together
      o.stop(end);
    }
  }

  /** The drone under the music, breathing. */
  private startDrone(at: number): void {
    const c = this.ctx;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = this.m.drone.cutoff;
    const g = c.createGain();
    g.gain.value = this.m.drone.volume;
    const lfo = c.createOscillator();
    const depth = c.createGain();
    lfo.frequency.value = 1 / this.m.drone.breathS;
    depth.gain.value = this.m.drone.volume * this.m.drone.breathDepth;
    lfo.connect(depth).connect(g.gain);
    f.connect(g).connect(this.bus);
    const oscs = this.m.drone.notes.map((n) => {
      const o = c.createOscillator();
      o.type = VOICE_TONE.wave;
      o.frequency.value = noteHz(n);
      o.connect(f);
      return o;
    });
    for (const o of [lfo, ...oscs]) o.start(at);
    this.drone = [lfo, ...oscs];
  }

  /** A far drum: a deep sine falling in pitch, long. */
  private drum(at: number): void {
    const c = this.ctx;
    const [from, to] = this.m.drum.freq;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(from, at);
    o.frequency.exponentialRampToValueAtTime(to, at + 0.3);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(this.m.drum.volume, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, at + this.m.drum.seconds);
    o.connect(g).connect(this.bus);
    o.start(at);
    o.stop(at + this.m.drum.seconds + 0.05);
  }
}

/** The echo's impulse: stereo noise dying away over `seconds`. */
function echo(ctx: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp((-6.9 * i) / len);
  }
  return buf;
}

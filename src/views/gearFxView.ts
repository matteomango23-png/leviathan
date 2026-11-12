// Effects of weapons and backpack: darts and net in flight, net bursts, the sardine swarm round the diver.
import Phaser from 'phaser';
import { SWARM_RULES } from '../data/economy';
import { SARDINE } from '../data/diver';
import type { GameState } from '../systems/game';
import { SARDINE_TEX, TEX } from './textures';

/** One sardine of the ball: its own circle on a sphere round the diver, its own pace. */
interface BallFish {
  body: Phaser.GameObjects.Image;
  tail: Phaser.GameObjects.Image;
  r: number;
  tilt: number; // the circle's tilt (0 = seen flat from the side)
  roll: number; // and its turn round the line of sight: the circles cross every way and fill the ball
  spin: number;
  a: number;
  scatter: number; // which way it swims off (radians)
}

export class GearFxView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly ball: BallFish[] = [];
  /** 0 = gone … 1 = round you; it grows when called and shrinks when it ends. */
  private on = 0;
  private centre: { x: number; y: number } | null = null;
  private last = 0;
  private scale = 1;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.g = scene.add.graphics();
    layer.add(this.g);
    const R = SWARM_RULES;
    const scale = SARDINE.lengthUnits / SARDINE_TEX.w; // the same sardines as the schools (views/fishView.ts)
    for (let i = 0; i < R.ballFish; i++) {
      const u = (i * 0.618034) % 1; // spread evenly, without a pattern
      const v = (i * 0.414214) % 1;
      const tail = scene.add.image(0, 0, TEX.sardineTail).setOrigin(1, 0.5).setScale(scale).setVisible(false);
      const body = scene.add.image(0, 0, TEX.sardine).setScale(scale).setVisible(false);
      this.ball.push({
        body,
        tail,
        r: R.ballRadius[0] + (R.ballRadius[1] - R.ballRadius[0]) * u,
        tilt: (v - 0.5) * Math.PI * 0.9,
        roll: ((i * 0.5698403) % 1) * Math.PI,
        spin: R.ballSpin[0] + (R.ballSpin[1] - R.ballSpin[0]) * ((i * 0.7548777) % 1),
        a: u * Math.PI * 2,
        scatter: v * Math.PI * 2,
      });
    }
    layer.add(this.ball.flatMap((f) => [f.tail, f.body]));
    this.scale = scale;
  }

  update(gs: GameState, pos: { x: number; y: number }, time: number): void {
    const dt = Math.min(0.05, Math.max(0, time - this.last));
    this.last = time;
    this.drawShots(gs);
    this.drawBall(!!gs.beasts.decoy, pos, dt);
  }

  private drawShots(gs: GameState): void {
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
  }

  /**
   * The sardines' ball (owner, 12 novembre 2026: the ring was "bruttissimo"): they swim in from around you, swirl
   * each on its own tilted circle round a centre that follows you a little late, the far side of the ball darker,
   * and at the end they scatter away and fade instead of vanishing.
   */
  private drawBall(called: boolean, pos: { x: number; y: number }, dt: number): void {
    const R = SWARM_RULES;
    const was = this.on;
    this.on = called
      ? Math.min(1, this.on + dt / R.gatherSeconds)
      : Math.max(0, this.on - dt / R.scatterSeconds);
    if (this.on <= 0) {
      if (was > 0 || this.centre)
        for (const f of this.ball) {
          f.body.setVisible(false);
          f.tail.setVisible(false);
        }
      this.centre = null;
      return;
    }
    // while it scatters the ball stays where it was: you swim (or sail) away from it
    if (!this.centre) this.centre = { ...pos };
    else if (called) {
      const k = Math.min(1, R.follow * dt);
      this.centre.x += (pos.x - this.centre.x) * k;
      this.centre.y += (pos.y - this.centre.y) * k;
    }
    const c = this.centre;
    const ease = this.on * this.on * (3 - 2 * this.on);
    // gathering: from far round you to their places; scattering: out along their own way
    const out = (1 - ease) * R.scatterReach;
    for (const f of this.ball) {
      f.a += f.spin * dt;
      const ca = Math.cos(f.a);
      const sa = Math.sin(f.a);
      const depth = sa * Math.sin(f.tilt); // -1 behind you … 1 in front
      // on its circle, then turned by its roll; its heading the same way
      const [px, py] = [ca * f.r, sa * Math.cos(f.tilt) * f.r];
      const [vx, vy] = [-sa * f.r, ca * Math.cos(f.tilt) * f.r];
      const [cr, sr] = [Math.cos(f.roll), Math.sin(f.roll)];
      const x = c.x + px * cr - py * sr + Math.cos(f.scatter) * out;
      const y = c.y + (px * sr + py * cr) * R.squash + Math.sin(f.scatter) * out;
      // heading: the way it swims on its circle (plus the scatter), never upside down
      const hx = vx * cr - vy * sr + Math.cos(f.scatter) * (1 - ease) * 40;
      const hy = (vx * sr + vy * cr) * R.squash + Math.sin(f.scatter) * (1 - ease) * 40;
      // drawn like the schools' sardines: tail wagging, a silver glint as they turn, the far side of the ball darker
      const angle = Math.atan2(hy, hx);
      const flip = Math.cos(angle) < 0;
      const k = this.scale;
      const glint = 0.5 + 0.5 * Math.sin(angle * 2 + f.a * 3);
      const shade = Math.round((150 + 75 * glint) * (0.78 + 0.22 * depth));
      const tint = Phaser.Display.Color.GetColor(shade, Math.min(255, shade + 8), Math.min(255, shade + 14));
      f.body
        .setVisible(true)
        .setPosition(x, y)
        .setRotation(angle)
        .setScale(k, flip ? -k : k)
        .setAlpha(ease)
        .setTint(tint);
      const back = SARDINE.lengthUnits * 0.44;
      f.tail
        .setVisible(true)
        .setPosition(x - Math.cos(angle) * back, y - Math.sin(angle) * back)
        .setRotation(angle + Math.sin(f.a * 9 + f.scatter) * 0.45 * (flip ? -1 : 1))
        .setScale(k, flip ? -k : k)
        .setAlpha(ease)
        .setTint(tint);
    }
  }
}

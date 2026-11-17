// The inside view in first person (owner, 17 novembre 2026: "è come se switchassi da view outside a view inside… anche
// semplicemente navigare ed esplorare"): opened by "Vista interna" at the helm, over the world that keeps running
// (WorldScene steps it, hidden). It steps the view (systems/turret/), writes your ship and the vessels back into the
// world each frame, and draws the sky, the sea or the water, every vessel near in 3D, the shots and the turret's
// glass; it sounds the guns. "Vista esterna", your ship gone down, or the sea calling you (a beast's battle, Aurelio
// speaking) close it.
import Phaser from 'phaser';
import { ENEMY_CLASSES, WEAPONS } from '../data/company';
import { INSIDE, TURRET } from '../data/turret';
import { nightness } from '../systems/dayNight';
import { eyeHeight, stepInside, turretPoint, type InsideEvent } from '../systems/turret/inside';
import { closeInside, joinFoes, openInside, syncWorld } from '../systems/turret/insideWorld';
import { foeFrom, type FoeInView, type InsideState } from '../systems/turret/insideState';
import { TurretHull3d } from '../views/turret/turretHull3d';
import { seeUnder, TurretUnder, waterAt } from '../views/turret/turretUnder';
import { landingOf } from '../systems/turret/ballistics';
import { project, yawTo, type Camera } from '../systems/turret/projection';
import { shipModel, shipTopSpeed } from '../systems/ship/model';
import { WORLD } from '../data/worldLayout';
import { weatherLook } from '../systems/weather';
import type { GameState } from '../systems/game';
import { TurretControls } from '../ui/turretControls';
import { SoftPuffs } from '../views/softPuffs';
import { TurretFx } from '../views/turret/turretFx';
import { TurretGlass } from '../views/turret/turretGlass';
import { turretColours } from '../views/turret/turretLook';
import { TurretSea } from '../views/turret/turretSea';
import { TurretShip } from '../views/turret/turretShip';
import { TurretSky } from '../views/turret/turretSky';
import type { Session } from './session';

interface TurretData {
  session: Session;
}

/** How hard a blow on your ship shakes the view. Tuning. */
const TURRET_SHAKE = 0.012;

/** The vessel the arrow and the distance point at: the nearest hunting you, else the nearest afloat. */
export function targetOf(g: GameState, d: InsideState): FoeInView | null {
  const afloat = d.foes.filter((f) => (g.company.enemies.find((e) => e.id === f.id)?.sinkT ?? 1) <= 0);
  const hunting = afloat.filter((f) => g.company.enemies.find((e) => e.id === f.id)?.phase === 'hunting');
  const pick = hunting.length ? hunting : afloat;
  return pick.sort((a, b) => foeFrom(d, a).dist - foeFrom(d, b).dist)[0] ?? null;
}

export class TurretScene extends Phaser.Scene {
  private session!: Session;
  private inside!: InsideState;
  private box!: Phaser.GameObjects.Container;
  private sky!: TurretSky;
  private sea!: TurretSea;
  private ship!: TurretShip;
  private hull!: TurretHull3d;
  private under!: TurretUnder;
  private fx!: TurretFx;
  private smoke!: SoftPuffs;
  private glows!: SoftPuffs;
  private glass!: TurretGlass;
  private controls!: TurretControls;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private closing = false;
  /** The eye was under the water last frame (crossing the surface splashes the glass). */
  private wasUnder = false;
  /** The lightning's flash last frame (a new one thunders). */
  private lastFlash = 0;
  private joinT = 0;

  constructor() {
    super('Turret');
  }

  init(data: TurretData): void {
    this.session = data.session;
    this.closing = false;
    this.wasUnder = false;
  }

  create(): void {
    const g = this.session.game!;
    this.inside = openInside(g);
    this.cameras.main.setBackgroundColor(0x000000).fadeIn(260, 2, 8, 14);
    this.box = this.add.container(0, 0);
    this.under = new TurretUnder(this, this.box);
    this.sky = new TurretSky(this, this.box);
    this.sea = new TurretSea(this, this.box);
    this.box.add(this.sky.haze);
    this.ship = new TurretShip();
    this.hull = new TurretHull3d(this, this.box);
    this.smoke = new SoftPuffs(this, this.box, false);
    this.fx = new TurretFx(this, this.box);
    this.glows = new SoftPuffs(this, this.box, true);
    this.add.existing(this.sky.lightning.setOrigin(0, 0));
    this.glass = new TurretGlass(this);
    const top = shipTopSpeed(g.ship) / WORLD.unitsPerMetre;
    this.controls = new TurretControls(Math.min(1, this.inside.you.speed / Math.max(1, top)));
    const kb = this.input.keyboard;
    this.keys = kb
      ? (kb.addKeys('W,S,A,D,Q,E,T,UP,DOWN,LEFT,RIGHT,SPACE,ONE,TWO,ESC') as Record<
          string,
          Phaser.Input.Keyboard.Key
        >)
      : {};
    this.events.once('shutdown', () => this.controls.destroy());
  }

  /** The keyboard on a computer, added to the fingers. */
  private keyboard(dt: number): void {
    const k = this.keys;
    const i = this.controls.input;
    if (!k.W) return;
    if (k.W.isDown) i.throttle = Math.min(1, i.throttle + dt * 0.6);
    if (k.S!.isDown) i.throttle = Math.max(-0.3, i.throttle - dt * 0.6);
    // A, D and the arrows turn the turret (under way the ship follows it)
    const right = k.RIGHT!.isDown || k.D!.isDown ? 1 : 0;
    const left = k.LEFT!.isDown || k.A!.isDown ? 1 : 0;
    i.yaw += (right - left) * TURRET.keyRad * dt * 0.5;
    i.pitch += ((k.UP!.isDown ? 1 : 0) - (k.DOWN!.isDown ? 1 : 0)) * TURRET.keyRad * dt * 0.3;
    if (k.SPACE!.isDown) i.firing = i.gunShot = true;
    if (Phaser.Input.Keyboard.JustDown(k.ONE!)) this.controls.weapon = 'mg';
    if (Phaser.Input.Keyboard.JustDown(k.TWO!)) this.controls.weapon = 'gun';
    if (Phaser.Input.Keyboard.JustDown(k.ESC!)) this.controls.exit = true;
    // a U-Boat: Q up, E down, T a torpedo
    const dive = (k.E!.isDown ? 1 : 0) - (k.Q!.isDown ? 1 : 0);
    if (dive) i.dive = dive;
    if (Phaser.Input.Keyboard.JustDown(k.T!)) i.torpedo = true;
  }

  /** Sounds, flashes, cracks and banners of what happened. */
  private onEvents(g: GameState, events: InsideEvent[]): void {
    const sound = this.session.sound;
    const d = this.inside;
    const near = (p: { a: number; s: number }): number =>
      Math.max(0, 1 - Math.hypot(p.a - d.you.a, p.s - d.you.s) / 500);
    for (const e of events) {
      if (e.type === 'shot') {
        sound.gun(e.kind === 'mg' ? 'mg' : e.kind === 'dart' ? 'clank' : 'gun', e.kind === 'dart' ? 0.5 : 1);
        if (e.kind !== 'dart') this.glass.fired(e.kind !== 'mg');
        if (e.kind !== 'mg' && e.kind !== 'dart') this.cameras.main.shake(160, 0.005);
      } else if (e.type === 'foeShot') sound.gun('gun', near(e.p) * 0.8);
      else if (e.type === 'hit' && e.target === 'foe')
        sound.gun(e.kind === 'mg' ? 'clank' : 'burst', near(e.p));
      else if (e.type === 'dartHit') sound.gun('clank', near(e.p) * 0.7);
      else if (e.type === 'hit' && e.target === 'you') {
        sound.gun('burst', 1);
        this.glass.hit(this.scale.width, this.scale.height);
        this.cameras.main.shake(260, TURRET_SHAKE);
      } else if (e.type === 'splash' && e.kind !== 'mg') sound.gun('burst', near(e.p) * 0.5);
      else if (e.type === 'zone' && e.target === 'foe' && e.zone === 'magazine')
        this.controls.show('Deposito centrato!');
      else if (e.type === 'torpHit' || (e.type === 'chargeBurst' && e.hit)) {
        sound.gun('burst', 1);
        this.cameras.main.shake(420, e.type === 'torpHit' && e.target === 'foe' ? 0.007 : TURRET_SHAKE);
        if (e.type !== 'torpHit' || e.target === 'you') this.glass.hit(this.scale.width, this.scale.height);
      } else if (e.type === 'chargeBurst') {
        sound.gun('burst', near(e.p) * 0.7);
        this.cameras.main.shake(200, 0.004);
      } else if (e.type === 'foeAlert' && e.phase === 'hunting') {
        const v = g.company.enemies.find((x) => x.id === e.foe);
        sound.chargeWarn();
        if (v) this.controls.show(`${ENEMY_CLASSES[v.cls].name}: ti ha scoperto!`);
      } else if (e.type === 'sunk') {
        this.controls.show(`${e.name} affondata!`);
        this.cameras.main.shake(500, 0.006);
      } else if (e.type === 'lost') this.controls.show('Affondato…');
    }
    this.fx.onEvents(events);
  }

  /** The gun's mark on the sea: where a shell fired now would fall (with the roll, on screen), and how far. */
  private gunMark(cam: Camera): { x: number; y: number; dist: number } | null {
    const g = this.session.game!;
    const d = this.inside;
    const gun = shipModel(g.ship).weapons.find((w) => WEAPONS[w].kind === 'shell');
    if (this.controls.weapon !== 'gun' || !gun || eyeHeight(d) < 0) return null;
    const land = landingOf('you', gun, turretPoint(d), d.yaw, d.pitch);
    if (!land) return null;
    const p = project(cam, { a: land.a - d.you.a, s: land.s - d.you.s, z: 0 });
    return p && { x: p.x, y: p.y, dist: Math.hypot(land.a - d.you.a, land.s - d.you.s) };
  }

  override update(_t: number, deltaMs: number): void {
    const g = this.session.game;
    if (!g || this.closing) return;
    // the sea calls you out: a beast's battle, Aurelio speaking
    if (g.beasts.battle || g.story.dialogue) return this.close();
    const dt = Math.min(0.05, deltaMs / 1000);
    const d = this.inside;
    this.controls.sample();
    this.keyboard(dt);
    const input = this.controls.input;
    d.weapon = this.controls.weapon;
    // vessels coming near join the view
    if ((this.joinT -= dt) <= 0) {
      this.joinT = 1;
      joinFoes(g, d);
    }
    const events = stepInside(g, d, input, dt);
    syncWorld(g, d);
    // the engine's sound follows your lever (WorldScene)
    this.session.input.helm.throttle = Math.max(0, input.throttle);
    this.controls.consume();
    if (g.weather.flash > this.lastFlash + 0.3) this.session.sound.thunder(1);
    this.lastFlash = g.weather.flash;
    this.onEvents(g, events);
    this.draw(g, dt);
    if (this.controls.exit || (d.lost !== null && d.lost > INSIDE.lostSeconds)) this.close();
  }

  private draw(g: GameState, dt: number): void {
    const d = this.inside;
    const w = this.scale.width;
    const h = this.scale.height;
    const look = weatherLook(g.weather);
    const t = g.time;
    const waves = look.waves;
    // you on the waves: the view rolls and heaves, more in a storm, leaning with the water you took in; under the
    // water the waves hardly move you
    const eye = eyeHeight(d);
    const underNow = eye < 0;
    const sway = underNow ? 0.15 : 1;
    const roll =
      TURRET.roll * waves * sway * Math.sin(t * TURRET.rollSpeed) + (g.company.yourDmg.flood ?? 0) * 0.08;
    const cam: Camera = {
      yaw: d.yaw,
      pitch: d.pitch + 0.006 * waves * sway * Math.sin(t * 0.8 + 1),
      height: eye + (underNow ? 0 : TURRET.heave * waves * Math.sin(t * TURRET.heaveSpeed + 1.3)),
      roll,
      w,
      h,
    };
    if (underNow !== this.wasUnder) {
      this.glass.dunk(underNow);
      this.session.sound.gun('burst', 0.3);
    }
    this.wasUnder = underNow;
    const c = turretColours(look, nightness(g.day));
    const span = Math.hypot(w, h) / 2 + 30;
    this.box.setPosition(w / 2, h / 2).setRotation(roll);
    this.sky.setVisible(!underNow);
    this.under.setVisible(underNow);
    if (underNow) {
      this.sea.hide();
      this.under.update(cam, -eye, c.night, t, span);
    } else {
      this.sky.update(cam, c, look, g.weather.flash, t, span);
      this.sea.update(cam, c, d.you.a, d.you.s, waves, t, span);
    }
    this.sky.lightning.setSize(w, h).setVisible(!underNow);
    this.smoke.begin();
    this.glows.begin();
    this.hull.clear();
    const water = { on: underNow, water: waterAt(-eye, c.night), see: seeUnder(c.night) };
    // every vessel, the farthest first; the sea's nearer bands go over the nearest one's hull
    let nearest = Infinity;
    for (const f of [...d.foes].sort((a, b) => foeFrom(d, b).dist - foeFrom(d, a).dist)) {
      const e = g.company.enemies.find((x) => x.id === f.id);
      if (!e) continue;
      const seen = this.ship.update(cam, c, d, f, e, t, this.glows, this.smoke, this.hull, water);
      if (seen) nearest = Math.min(nearest, seen.dist);
    }
    if (nearest < Infinity && !underNow) {
      const k = this.sea.fartherThan(nearest);
      const next = this.sea.bands[k]?.water;
      const at = next ? this.box.getIndex(next) : this.box.length;
      this.box.moveTo(this.hull.g, Math.max(0, at - 1));
    }
    this.fx.update(cam, c, d, dt, this.glows, this.smoke);
    this.smoke.end();
    this.glows.end();
    const target = targetOf(g, d);
    this.glass.update(w, h, dt, look.precip, look.wind, this.gunMark(cam), {
      yaw: d.yaw,
      bow: d.you.heading,
      foe: target ? yawTo(foeFrom(d, target)) : null,
    });
    this.controls.update(g, d, target, dt);
  }

  /** Back outside: the world has your ship and the vessels where the view left them. */
  private close(): void {
    if (this.closing) return;
    this.closing = true;
    const g = this.session.game!;
    closeInside(g, this.inside);
    Object.assign(this.session.input.helm, {
      throttle: g.ship.speed > 0 ? Math.max(0, this.controls.input.throttle) : 0,
      dir: g.ship.face,
    });
    this.session.inBattle = false;
    this.scene.stop();
    this.session.emit('insideClosed');
    this.session.emit('battle', false);
  }
}

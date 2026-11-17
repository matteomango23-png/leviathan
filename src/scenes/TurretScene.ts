// The turret in first person (owner, 17 novembre 2026: "una view in prima persona su una mitragliatrice o una
// cannoniera… un gioco nel gioco"): opened by "Armi" with the arena's tick on, over the paused sea. It steps the duel
// (systems/turret/), the weather and the hour, and draws the sky, the sea, the enemy, the shots and the turret's
// glass; it sounds the guns. "Timone", or a while after the end, closes it and gives the sea back.
import Phaser from 'phaser';
import { WEAPONS } from '../data/company';
import { DUEL, TURRET } from '../data/turret';
import { nightness, stepDay } from '../systems/dayNight';
import { closeDuel, eyeHeight, stepDuel, turretPoint, type DuelEvent } from '../systems/turret/duel';
import { TurretHull3d } from '../views/turret/turretHull3d';
import { seeUnder, TurretUnder, waterAt } from '../views/turret/turretUnder';
import { foeFromYou, type DuelState } from '../systems/turret/duelState';
import { landingOf } from '../systems/turret/ballistics';
import { project, yawTo, type Camera } from '../systems/turret/projection';
import { shipModel, shipTopSpeed } from '../systems/ship/model';
import { WORLD } from '../data/worldLayout';
import { stepWeather, weatherLook } from '../systems/weather';
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
  duel: DuelState;
}

export class TurretScene extends Phaser.Scene {
  private session!: Session;
  private duel!: DuelState;
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
  /** Seconds of slow motion left (the deciding blow). */
  private slow = 0;
  private closing = false;

  constructor() {
    super('Turret');
  }

  init(data: TurretData): void {
    this.session = data.session;
    this.duel = data.duel;
    this.closing = false;
    this.slow = 0;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x000000).fadeIn(260, 2, 8, 14);
    this.box = this.add.container(0, 0);
    this.under = new TurretUnder(this, this.box);
    this.sky = new TurretSky(this, this.box);
    this.sea = new TurretSea(this, this.box);
    this.box.add(this.sky.haze);
    this.ship = new TurretShip(this, this.box);
    this.hull = new TurretHull3d(this, this.box);
    this.smoke = new SoftPuffs(this, this.box, false);
    this.fx = new TurretFx(this, this.box);
    this.glows = new SoftPuffs(this, this.box, true);
    this.add.existing(this.sky.lightning.setOrigin(0, 0));
    this.glass = new TurretGlass(this);
    const g = this.session.game!;
    const top = shipTopSpeed(g.ship) / WORLD.unitsPerMetre;
    this.controls = new TurretControls(Math.min(1, this.duel.you.speed / Math.max(1, top)));
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
    if (k.S!.isDown) i.throttle = Math.max(0, i.throttle - dt * 0.6);
    const side = (k.D!.isDown ? 1 : 0) - (k.A!.isDown ? 1 : 0);
    if (side) i.side = side;
    else if (this.keySide) i.side = 0;
    this.keySide = side !== 0;
    i.yaw += ((k.RIGHT!.isDown ? 1 : 0) - (k.LEFT!.isDown ? 1 : 0)) * TURRET.keyRad * dt * 0.5;
    i.pitch += ((k.UP!.isDown ? 1 : 0) - (k.DOWN!.isDown ? 1 : 0)) * TURRET.keyRad * dt * 0.3;
    if (Phaser.Input.Keyboard.JustDown(k.SPACE!)) i.gunShot = true;
    if (k.SPACE!.isDown) i.firing = true;
    else if (Phaser.Input.Keyboard.JustUp(k.SPACE!)) i.firing = false;
    if (Phaser.Input.Keyboard.JustDown(k.ONE!)) this.controls.weapon = 'mg';
    if (Phaser.Input.Keyboard.JustDown(k.TWO!)) this.controls.weapon = 'gun';
    if (Phaser.Input.Keyboard.JustDown(k.ESC!)) this.controls.exit = true;
    // a U-Boat: Q up, E down, T a torpedo
    const dive = (k.E!.isDown ? 1 : 0) - (k.Q!.isDown ? 1 : 0);
    if (dive) i.dive = dive;
    else if (this.keyDive) i.dive = 0;
    this.keyDive = dive !== 0;
    if (Phaser.Input.Keyboard.JustDown(k.T!)) i.torpedo = true;
  }

  /** "Avvicina/Allontana" held on the keyboard (let go, it stops). */
  private keySide = false;
  private keyDive = false;
  /** The eye was under the water last frame (crossing the surface splashes the glass). */
  private wasUnder = false;

  /** Sounds, flashes and cracks of what happened. */
  private onEvents(events: DuelEvent[]): void {
    const sound = this.session.sound;
    const dist = (p: { a: number; s: number }): number =>
      Math.hypot(p.a - this.duel.you.a, p.s - this.duel.you.s);
    const near = (p: { a: number; s: number }): number => Math.max(0, 1 - dist(p) / 500);
    for (const e of events) {
      if (e.type === 'shot') {
        sound.gun(e.kind === 'mg' ? 'mg' : 'gun', 1);
        this.glass.fired(e.kind !== 'mg');
        if (e.kind !== 'mg') this.cameras.main.shake(140, 0.004);
      } else if (e.type === 'foeShot') sound.gun('gun', near(e.p) * 0.8);
      else if (e.type === 'hit' && e.target === 'foe')
        sound.gun(e.kind === 'mg' ? 'clank' : 'burst', near(e.p));
      else if (e.type === 'hit' && e.target === 'you') {
        sound.gun('burst', 1);
        this.glass.hit(this.scale.width, this.scale.height);
        this.cameras.main.shake(260, TURRET_SHAKE);
      } else if (e.type === 'splash' && e.kind !== 'mg') sound.gun('burst', near(e.p) * 0.5);
      else if (e.type === 'zone' && e.target === 'foe' && e.zone === 'magazine')
        this.controls.show('Deposito centrato!');
      else if (e.type === 'torpHit' || (e.type === 'chargeBurst' && e.hit)) {
        sound.gun('burst', 1);
        this.cameras.main.shake(420, e.type === 'torpHit' && e.target === 'foe' ? 0.006 : TURRET_SHAKE);
        if (e.type !== 'torpHit' || e.target === 'you') this.glass.hit(this.scale.width, this.scale.height);
      } else if (e.type === 'chargeBurst') {
        sound.gun('burst', near(e.p) * 0.7);
        this.cameras.main.shake(200, 0.004);
      } else if (e.type === 'end') {
        this.controls.show(e.result === 'victory' ? 'Vittoria!' : 'Affondato…');
        if (e.result === 'victory') this.slow = 1.1;
      }
    }
    this.fx.onEvents(events);
  }

  /** The gun's mark on the sea: where a shell fired now would fall (with the roll, on screen), and how far. */
  private gunMark(cam: Camera): { x: number; y: number; dist: number } | null {
    const g = this.session.game!;
    const gun = shipModel(g.ship).weapons.find((w) => WEAPONS[w].kind === 'shell');
    if (this.controls.weapon !== 'gun' || !gun) return null;
    const land = landingOf('you', gun, turretPoint(this.duel), this.duel.yaw, this.duel.pitch);
    if (!land) return null;
    const p = project(cam, { a: land.a - this.duel.you.a, s: land.s - this.duel.you.s, z: 0 });
    return p && { x: p.x, y: p.y, dist: Math.hypot(land.a - this.duel.you.a, land.s - this.duel.you.s) };
  }

  override update(_t: number, deltaMs: number): void {
    const g = this.session.game;
    if (!g || this.closing) return;
    const real = Math.min(0.05, deltaMs / 1000);
    this.slow = Math.max(0, this.slow - real);
    const dt = real * (this.slow > 0 ? 0.3 : 1);
    this.keyboard(real);
    const input = this.controls.input;
    this.duel.weapon = this.controls.weapon;
    const events = stepDuel(g, this.duel, input, dt);
    this.controls.consume();
    if (stepWeather(g.weather, dt)) this.session.sound.thunder(1);
    stepDay(g.day, dt, g.rng, true);
    g.time += dt;
    this.onEvents(events);
    const w = this.scale.width;
    const h = this.scale.height;
    const look = weatherLook(g.weather);
    const t = g.time;
    // you on the waves: the view rolls and heaves, more in a storm, leaning with the water you took in
    const waves = look.waves;
    // under the water the waves hardly move you
    const eye = eyeHeight(this.duel);
    const underNow = eye < 0;
    const sway = underNow ? 0.15 : 1;
    const roll =
      TURRET.roll * waves * sway * Math.sin(t * TURRET.rollSpeed) + (g.company.yourDmg.flood ?? 0) * 0.08;
    const cam: Camera = {
      yaw: this.duel.yaw,
      pitch: this.duel.pitch + 0.006 * waves * sway * Math.sin(t * 0.8 + 1),
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
      this.sea.update(cam, c, this.duel.you.a, this.duel.you.s, waves, t, span);
    }
    this.sky.lightning.setSize(w, h).setVisible(!underNow);
    this.smoke.begin();
    this.glows.begin();
    const e = g.company.enemies.find((x) => x.id === this.duel.foeId);
    const water = { on: underNow, water: waterAt(-eye, c.night), see: seeUnder(c.night) };
    const seen = e
      ? this.ship.update(cam, c, this.duel, e, t, this.glows, this.smoke, this.hull, water)
      : null;
    // the ship among the sea's bands: the nearer ones, rising in a storm, go over its hull
    if (seen && !underNow) {
      const k = this.sea.fartherThan(seen.dist);
      const next = this.sea.bands[k]?.water;
      const at = next ? this.box.getIndex(next) : this.box.length;
      for (const im of [this.ship.img, ...this.ship.halves, this.hull.g])
        this.box.moveTo(im, Math.max(0, at - 1));
    }
    this.fx.update(cam, c, this.duel, dt, this.glows, this.smoke);
    this.smoke.end();
    this.glows.end();
    const foe = foeFromYou(this.duel);
    this.glass.update(w, h, real, look.precip, look.wind, this.gunMark(cam), {
      yaw: this.duel.yaw,
      foe: e && e.sinkT <= 0 ? yawTo(foe) : null,
    });
    this.controls.update(g, this.duel, real);
    if (this.controls.exit || (this.duel.end && this.duel.end.t > DUEL.endSeconds)) this.close();
  }

  /** Back to the sea: the duel gives the world its places. */
  private close(): void {
    if (this.closing) return;
    this.closing = true;
    const g = this.session.game!;
    closeDuel(g, this.duel);
    this.session.inBattle = false;
    this.scene.stop();
    this.scene.resume('World');
    this.session.emit('battle', false);
  }
}

/** How hard a blow on your ship shakes the view. Tuning. */
const TURRET_SHAKE = 0.012;

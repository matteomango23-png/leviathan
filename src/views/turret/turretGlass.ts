// Inside the turret (owner, 17 novembre 2026: "deve essere figa la torretta all'interno… il vetro un pochino tendente
// al rosso"): the armoured frame with its rivets round a window of reddish glass, darker at the edges; the reticle
// with the gun's range marks; the bearing tape at the top with the enemy's mark; the barrels below kicking back at
// each shot and flashing; cracks where you were hit, rain running down the glass, the red flash of a blow. Screen
// space, over everything. Look only.
import Phaser from 'phaser';
import { TURRET, TURRET_LOOK } from '../../data/turret';
import { SoftPuffs } from '../softPuffs';
import { FRAME, paintFrame, paintTint, TINT, WIN } from './turretFrame';

/** A filled four-sided shape (two triangles). */
function quad(
  g: Phaser.GameObjects.Graphics,
  ...p: [number, number, number, number, number, number, number, number]
): void {
  g.fillTriangle(p[0], p[1], p[2], p[3], p[4], p[5]).fillTriangle(p[0], p[1], p[4], p[5], p[6], p[7]);
}

interface Crack {
  lines: [number, number, number, number][];
  t: number;
}

export class TurretGlass {
  private readonly tint: Phaser.GameObjects.Image;
  /** The reddish pane over the whole view. */
  private readonly pane: Phaser.GameObjects.Rectangle;
  private readonly frame: Phaser.GameObjects.Image;
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly red: Phaser.GameObjects.Rectangle;
  /** The barrels' flashes, under the frame. */
  private readonly flare: SoftPuffs;
  private cracks: Crack[] = [];
  private size = '';
  private kick = 0;
  private hitT = 0;
  private readonly drops = Array.from({ length: 40 }, () => ({
    x: Math.random(),
    y: Math.random(),
    v: 0.4 + Math.random(),
  }));

  constructor(private readonly scene: Phaser.Scene) {
    paintTint(scene);
    this.pane = scene.add
      .rectangle(0, 0, 10, 10, TURRET_LOOK.pane, 1)
      .setOrigin(0, 0)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.tint = scene.add.image(0, 0, TINT).setOrigin(0, 0).setTint(TURRET_LOOK.glass);
    this.g = scene.add.graphics();
    this.flare = new SoftPuffs(scene, scene.add.container(0, 0), true);
    this.red = scene.add.rectangle(0, 0, 10, 10, 0xc01808, 0).setOrigin(0, 0);
    this.frame = scene.add.image(0, 0, '__WHITE').setOrigin(0, 0);
  }

  /** The eye goes under the water (or comes out): water runs down the glass; the pane turns blue-green under. */
  dunk(under: boolean): void {
    this.dunkT = 1.4;
    this.pane.setFillStyle(under ? TURRET_LOOK.paneUnder : TURRET_LOOK.pane, 1);
  }

  private dunkT = 0;

  /** A shot of yours: the barrels kick back. */
  fired(heavy: boolean): void {
    this.kick = heavy ? 1 : Math.max(this.kick, 0.35);
  }

  /** You were hit: a crack, the red flash. */
  hit(w: number, h: number): void {
    this.hitT = TURRET_LOOK.hitFlash;
    const cx = w * (0.15 + Math.random() * 0.7);
    const cy = h * (0.15 + Math.random() * 0.55);
    const lines: Crack['lines'] = [];
    for (let i = 0; i < 9; i++) {
      let x = cx;
      let y = cy;
      let a = (i / 9) * Math.PI * 2 + Math.random() * 0.4;
      for (let j = 0; j < 4; j++) {
        const len = h * (0.02 + Math.random() * 0.05);
        const nx = x + Math.cos(a) * len;
        const ny = y + Math.sin(a) * len;
        lines.push([x, y, nx, ny]);
        x = nx;
        y = ny;
        a += (Math.random() - 0.5) * 0.8;
      }
    }
    this.cracks.push({ lines, t: 0 });
  }

  /** @param mark the gun's mark on the sea (where a shell would fall), or null for the machine gun */
  update(
    w: number,
    h: number,
    dt: number,
    precip: number,
    wind: number,
    mark: { x: number; y: number; dist: number } | null,
    bearing: { yaw: number; bow: number; foe: number | null },
  ): void {
    const key = `${w}x${h}`;
    if (key !== this.size) {
      this.size = key;
      paintFrame(this.scene, w, h);
      this.frame.setTexture(FRAME);
    }
    this.pane.setSize(w, h);
    this.tint.setDisplaySize(w, h).setAlpha(TURRET_LOOK.glassAlpha);
    this.frame.setDisplaySize(w, h);
    this.hitT = Math.max(0, this.hitT - dt);
    this.red.setSize(w, h).setFillStyle(0xc01808, (this.hitT / TURRET_LOOK.hitFlash) * 0.45);
    const g = this.g.clear();
    this.rain(g, w, h, dt, Math.max(precip, this.dunkT > 0 ? 1 : 0), wind);
    // just through the surface: a burst of drops runs down the glass
    this.dunkT = Math.max(0, this.dunkT - dt);
    this.reticle(g, w, h, mark);
    this.tape(g, w, h, bearing);
    this.flare.begin();
    this.barrels(g, w, h, dt, this.flare);
    this.flare.end();
    this.cracks = this.cracks.filter((c) => (c.t += dt) < TURRET_LOOK.crackSeconds);
    for (const c of this.cracks) {
      const a = 1 - c.t / TURRET_LOOK.crackSeconds;
      g.lineStyle(1.4, 0xf4e6dc, 0.75 * a);
      for (const [x0, y0, x1, y1] of c.lines) g.lineBetween(x0, y0, x1, y1);
    }
  }

  private rain(
    g: Phaser.GameObjects.Graphics,
    w: number,
    h: number,
    dt: number,
    precip: number,
    wind: number,
  ): void {
    if (precip < 0.05) return;
    const n = Math.round(this.drops.length * precip);
    for (let i = 0; i < n; i++) {
      const d = this.drops[i]!;
      d.y += d.v * dt * 0.5;
      d.x += wind * dt * 0.05;
      if (d.y > 1) Object.assign(d, { y: 0, x: Math.random() });
      if (d.x > 1) d.x -= 1;
      const x = d.x * w;
      const y = d.y * h;
      g.lineStyle(1.2, 0xcfe0ea, 0.35).lineBetween(x, y, x - wind * 4, y + 8 + d.v * 6);
    }
  }

  private reticle(
    g: Phaser.GameObjects.Graphics,
    w: number,
    h: number,
    mark: { x: number; y: number; dist: number } | null,
  ): void {
    const cx = w / 2;
    const cy = h / 2;
    const r = h * 0.05;
    const col = TURRET_LOOK.reticle;
    g.lineStyle(1.6, col, 0.9);
    g.lineBetween(cx - r * 2.4, cy, cx - r * 0.6, cy).lineBetween(cx + r * 0.6, cy, cx + r * 2.4, cy);
    g.lineBetween(cx, cy - r * 1.6, cx, cy - r * 0.6).lineBetween(cx, cy + r * 0.6, cx, cy + r * 1.2);
    // corner brackets
    for (const sx of [-1, 1])
      for (const sy of [-1, 1]) {
        g.lineBetween(cx + sx * r * 1.4, cy + sy * r * 1.4, cx + sx * r * 1.4, cy + sy * r * 0.9);
        g.lineBetween(cx + sx * r * 1.4, cy + sy * r * 1.4, cx + sx * r * 0.9, cy + sy * r * 1.4);
      }
    g.fillStyle(col, 1).fillRect(cx - 1.5, cy - 1.5, 3, 3);
    // the gun's mark on the sea: a diamond where the shell would fall, linked to the middle
    if (mark) {
      const s = r * 0.45;
      g.lineStyle(1.2, col, 0.5).lineBetween(cx, cy + r * 1.2, mark.x, mark.y - s);
      g.lineStyle(2, col, 1);
      g.strokePoints(
        [
          new Phaser.Math.Vector2(mark.x, mark.y - s),
          new Phaser.Math.Vector2(mark.x + s, mark.y),
          new Phaser.Math.Vector2(mark.x, mark.y + s),
          new Phaser.Math.Vector2(mark.x - s, mark.y),
        ],
        true,
      );
    }
  }

  private tape(
    g: Phaser.GameObjects.Graphics,
    w: number,
    h: number,
    b: { yaw: number; bow: number; foe: number | null },
  ): void {
    const y = h * (WIN.top + 0.035);
    const half = w * 0.22;
    const span = 0.6; // radians shown either side
    g.lineStyle(1, TURRET_LOOK.reticle, 0.6).lineBetween(w / 2 - half, y, w / 2 + half, y);
    for (let deg = -180; deg < 180; deg += 10) {
      let a = (deg * Math.PI) / 180 - b.yaw;
      a = Math.atan2(Math.sin(a), Math.cos(a));
      if (Math.abs(a) > span) continue;
      const x = w / 2 + (a / span) * half;
      g.lineBetween(x, y, x, y - (deg % 90 === 0 ? 9 : deg % 30 === 0 ? 6 : 3));
    }
    g.fillStyle(TURRET_LOOK.reticle, 1).fillTriangle(w / 2, y + 2, w / 2 - 4, y + 8, w / 2 + 4, y + 8);
    // where your bow points: a pale ship's outline under the line
    let bow = b.bow - b.yaw;
    bow = Math.atan2(Math.sin(bow), Math.cos(bow));
    const bx = w / 2 + Math.max(-1, Math.min(1, bow / span)) * half;
    g.fillStyle(0xf0e2c8, Math.abs(bow) > span ? 0.45 : 0.9).fillTriangle(
      bx,
      y + 4,
      bx - 4,
      y + 14,
      bx + 4,
      y + 14,
    );
    g.fillRect(bx - 4, y + 14, 8, 4);
    if (b.foe !== null) {
      let a = b.foe - b.yaw;
      a = Math.atan2(Math.sin(a), Math.cos(a));
      const x = w / 2 + Math.max(-1, Math.min(1, a / span)) * half;
      g.fillStyle(0xff3020, 1).fillTriangle(x, y - 11, x - 5, y - 19, x + 5, y - 19);
      // out of the window: a red arrow at its side, so it never vanishes
      if (Math.abs(a) > TURRET.fov / 2) {
        const side = Math.sign(a);
        const ax = side > 0 ? w * (1 - WIN.side) - 26 : w * WIN.side + 26;
        const ay = h * 0.5;
        g.fillStyle(0xff3020, 0.8).fillTriangle(
          ax + side * 14,
          ay,
          ax - side * 6,
          ay - 16,
          ax - side * 6,
          ay + 16,
        );
      }
    }
  }

  private barrels(g: Phaser.GameObjects.Graphics, w: number, h: number, dt: number, flare: SoftPuffs): void {
    this.kick = Math.max(0, this.kick - dt * 6);
    const base = h * (1 - WIN.bottom * 0.3);
    const tip = h * 0.7 + this.kick * h * 0.05;
    for (const side of [-1, 1]) {
      const bx = w / 2 + side * w * 0.12;
      const tx = w / 2 + side * w * 0.05;
      const wb = w * 0.04;
      const wt = w * 0.014;
      // the barrel, its lit side and its dark side, and the flash hider at its end
      quad(g.fillStyle(0x0b0908, 1), bx - wb, base, tx - wt, tip, tx + wt, tip, bx + wb, base);
      quad(
        g.fillStyle(0x5a4a3e, 0.8),
        bx - wb * 0.55,
        base,
        tx - wt * 0.5,
        tip,
        tx - wt * 0.1,
        tip,
        bx - wb * 0.1,
        base,
      );
      quad(g.fillStyle(0x2a221d, 1), bx + wb * 0.35, base, tx + wt * 0.4, tip, tx + wt, tip, bx + wb, base);
      g.fillStyle(0x15110f, 1).fillRect(tx - wt * 1.4, tip - h * 0.012, wt * 2.8, h * 0.03);
      g.fillStyle(0x6a584a, 0.6).fillRect(tx - wt * 1.4, tip - h * 0.012, wt * 2.8, h * 0.006);
      if (this.kick > 0.2) flare.puff(tx, tip - h * 0.015, w * 0.03 * this.kick, 0xffc070, this.kick);
    }
  }
}

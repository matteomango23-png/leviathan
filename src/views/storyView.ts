// What the story adds to the world: the Company ship with a whale dragged in chains, Nonno Aurelio (on his
// boat with you during the opening, then on the pier), Portofosco burning, and the clues on the sea floor.
import Phaser from 'phaser';
import { PORT } from '../data/economy';
import { VEDOVA } from '../data/chapter2';
import { CORAL_KING } from '../data/chapter3';
import { SCENES } from '../data/story';
import { COAST, WORLD } from '../data/worldLayout';
import { formLengthUnits } from '../systems/beasts/forms';
import type { StoryState } from '../systems/story';
import { landHeight } from '../systems/world/worldGen';
import { BeastSprite } from './beastView';
import { PORT_HOUSES } from './placesView';

const S = WORLD.surfaceY;

type Anchor = { x: number; y: number; hp: number };
const SHIP = SCENES.ship;
const WHALE = { speciesId: SHIP.whaleSpecies, variant: 'comune' } as const;
const PIER_FIRE_X = COAST.shoreX + 12; // where the pier catches fire, near the shore

/** The ship in its own coordinates: bow at x = 0 heading east, waterline at y = 0. */
function drawShip(g: Phaser.GameObjects.Graphics): void {
  const L = SHIP.length;
  g.fillStyle(0x0c0f12, 1);
  g.fillPoints(
    [
      new Phaser.Math.Vector2(-L, -7),
      new Phaser.Math.Vector2(4, -10),
      new Phaser.Math.Vector2(-6, 5),
      new Phaser.Math.Vector2(-L + 8, 5),
    ],
    true,
  );
  g.fillStyle(0x4a2414, 1); // rust along the waterline
  g.fillRect(-L + 6, 0, L - 10, 1.6);
  g.fillStyle(0x15191d, 1);
  g.fillRect(-L * 0.62, -19, 26, 12); // cabin
  g.fillRect(-L * 0.4, -36, 7, 20); // smokestack
  g.fillStyle(0x5a1a12, 1);
  g.fillRect(-L * 0.4, -31, 7, 2.5); // the Company's red band
  g.fillStyle(0xffb060, 0.9);
  for (let i = 0; i < 3; i++) g.fillRect(-L * 0.6 + i * 7, -15, 2.4, 2.4); // lit portholes
  g.fillStyle(0x0c0f12, 1);
  g.fillRect(-L + 4, -34, 1.4, 28); // mast with the black flag
  g.fillTriangle(-L + 5, -34, -L + 20, -30, -L + 5, -26);
}

/** A human silhouette standing on a deck (feet at x, y); with a lantern if lit. */
function drawPerson(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  lantern: boolean,
  sitting = false,
): void {
  const h = sitting ? 5 : 8;
  g.fillStyle(0x0b0e11, 1);
  g.fillRect(x - 1.6, y - h, 3.2, h);
  g.fillCircle(x, y - h - 1.8, 1.8);
  if (!lantern) return;
  g.fillStyle(0xffd9a0, 0.95);
  g.fillCircle(x + 3, y - h * 0.45, 1.1);
}

export class StoryView {
  private readonly ship: Phaser.GameObjects.Graphics;
  private readonly fx: Phaser.GameObjects.Graphics;
  private readonly people: Phaser.GameObjects.Graphics;
  private readonly clues: Phaser.GameObjects.Graphics;
  private readonly whale: BeastSprite;
  private readonly whaleLength = formLengthUnits(WHALE);
  private drawnPeople = '';
  private drawnClues = '';

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.clues = scene.add.graphics();
    this.whale = new BeastSprite(scene, layer);
    this.ship = scene.add.graphics();
    drawShip(this.ship);
    this.fx = scene.add.graphics();
    this.people = scene.add.graphics();
    layer.add([this.clues, this.ship, this.fx, this.people]);
  }

  private drawPeople(s: StoryState): void {
    const key = s.step === 'intro' ? 'boat' : s.step === 'off' ? 'none' : 'pier';
    if (key === this.drawnPeople) return;
    this.drawnPeople = key;
    const g = this.people.clear();
    if (key === 'boat') {
      drawPerson(g, SCENES.boat.x + 4, S - 6, true); // Aurelio
      drawPerson(g, SCENES.boat.x - 3, S - 6, false, true); // you, sitting
    } else if (key === 'pier') drawPerson(g, PORT.x - 18, S - 8, true);
  }

  private drawClues(s: StoryState): void {
    const key = s.step === 'findShark' ? s.clues.join() : 'none';
    if (key === this.drawnClues) return;
    this.drawnClues = key;
    const g = this.clues.clear();
    if (s.step !== 'findShark' && s.step !== 'returnToAurelio') return;
    for (const c of s.spots) {
      const found = s.clues.includes(c.id);
      if (c.id === 'olio') {
        g.fillStyle(0x050404, found ? 0.6 : 0.85);
        g.fillEllipse(c.x, c.y + 3, 26, 5);
      }
      // rusty chain links on the floor
      g.lineStyle(1.2, found ? 0x4a2c1c : 0x8a4a24, 1);
      for (let i = 0; i < 4; i++) g.strokeEllipse(c.x - 6 + i * 4, c.y + 2 + (i % 2), 4, 2.4);
    }
  }

  private drawShipScene(s: StoryState, anchors: Anchor[], time: number): void {
    const f = this.fx;
    // chapter 2: the Vedova's ship at anchor in the Delta, until the whale is freed
    // chapter 3: then above the amphitheatre of the Barriera Rossa, until the Re Corallo is free
    const inDelta = s.step === 'chapter1Done' || s.step === 'freeWhale';
    const anchored = !s.ship && (inDelta || s.step === 'chapter2Done' || s.step === 'freeKing');
    if (!s.ship && !anchored) {
      this.ship.setVisible(false);
      this.whale.hide();
      return;
    }
    const x = s.ship ? s.ship.x : inDelta ? VEDOVA.shipX : CORAL_KING.shipX;
    const bob = Math.sin(time * 1.3) * 0.8;
    this.ship.setVisible(true).setPosition(x, S + bob);
    // smoke from the stack
    for (let i = 0; i < 6; i++) {
      const t = (time * 0.6 + i / 6) % 1;
      f.fillStyle(0x1a1c1e, 0.5 * (1 - t));
      f.fillCircle(x - SHIP.length * 0.4 + 3 - t * 30, S - 38 - t * 34, 3 + t * 9);
    }
    if (anchored && inDelta) {
      this.drawChainedWhale(anchors, time);
      return;
    }
    if (anchored) {
      this.whale.hide();
      return;
    }
    if (!s.ship?.whale) {
      this.whale.hide();
      return;
    }
    // the whale dragged behind, half out of the water, with chains to the stern
    const head = x - SHIP.length - SHIP.whaleGap;
    const len = this.whaleLength;
    const wx = head - len * 0.45;
    this.whale.update({
      key: SHIP.whaleSpecies,
      x: wx,
      y: S + len * 0.07,
      face: 1,
      pitch: 0.03,
      pitchV: 0,
      phase: time * 1.2,
      jaw: 0,
      length: len,
      flash: 0,
      alpha: 1,
    });
    f.lineStyle(1.1, 0x2a2622, 1);
    for (const dy of [-1, 2, 5]) f.lineBetween(x - SHIP.length + 4, S - 2, head - 6, S + dy);
    f.lineStyle(1.6, 0x3a2a20, 1);
    f.strokeEllipse(head - len * 0.14, S + len * 0.05, 6, len * 0.16); // the iron collar
  }

  /** The whale under the keel, pulling at chains that run to the anchors on the sea floor. */
  private drawChainedWhale(anchors: Anchor[], time: number): void {
    const f = this.fx;
    const len = this.whaleLength;
    const { x, y } = VEDOVA.whale;
    const pull = Math.sin(time * 0.9) * 3;
    this.whale.update({
      key: SHIP.whaleSpecies,
      x: x + pull,
      y,
      face: -1,
      pitch: Math.sin(time * 0.7) * 0.08,
      pitchV: 0,
      phase: time * 1.8,
      jaw: 0,
      length: len,
      flash: 0,
      alpha: 1,
    });
    const collar = { x: x + pull - len * 0.28, y: y + len * 0.02 };
    f.lineStyle(1.8, 0x3a2a20, 1);
    f.strokeEllipse(collar.x, collar.y, 7, len * 0.17);
    for (const a of anchors) {
      // the anchor: an iron post with a ring, broken ones leaning over
      const broken = a.hp <= 0;
      f.fillStyle(0x2a2420, 1);
      if (broken) f.fillTriangle(a.x - 3, a.y + 3, a.x + 9, a.y - 1, a.x + 8, a.y + 3);
      else f.fillRect(a.x - 2.5, a.y - 9, 5, 12);
      f.lineStyle(1.2, broken ? 0x3a2a20 : 0x6a3a1c, 1);
      f.strokeCircle(a.x, a.y - (broken ? 1 : 9), 2.4);
      if (broken) continue;
      // the chain, taut when the whale pulls
      f.lineStyle(1.3, 0x4a3426, 1);
      const sag = 6 - pull;
      const mx = (a.x + collar.x) / 2;
      const my = (a.y - 9 + collar.y) / 2 + sag;
      f.lineBetween(a.x, a.y - 9, mx, my);
      f.lineBetween(mx, my, collar.x, collar.y);
    }
  }

  private drawFire(s: StoryState, time: number): void {
    const heat = s.step === 'pier' ? 1 : s.step === 'findShark' ? 0.45 : 0;
    if (!heat) return;
    const f = this.fx;
    const flame = (x: number, base: number, size: number, seed: number): void => {
      // a flickering tongue: dark red outside, orange, a yellow core
      const flick = 0.75 + 0.25 * Math.sin(time * 11 + seed) + 0.15 * Math.sin(time * 23 + seed * 3);
      const tall = size * flick * heat;
      const sway = Math.sin(time * 6 + seed) * size * 0.15;
      const layers: [number, number, number][] = [
        [0xa3261a, 1, 0.8],
        [0xe8641e, 0.72, 0.9],
        [0xffd060, 0.4, 0.95],
      ];
      for (const [color, k, a] of layers) {
        f.fillStyle(color, a);
        f.fillTriangle(x - size * 0.36 * k, base, x + size * 0.36 * k, base, x + sway * k, base - tall * k);
      }
    };
    for (const [hx, w, h] of PORT_HOUSES) {
      const base = S - landHeight(hx + w / 2) + 1 - h;
      f.fillStyle(0xff7a30, 0.12 * heat); // glow on the smoke
      f.fillCircle(hx + w / 2, base - 6, w * 0.9);
      for (let i = 0; i < 4; i++) flame(hx + w * (0.12 + i * 0.26), base + 2, 9 + (i % 2) * 5, hx + i * 1.7);
      // sparks rising
      for (let i = 0; i < 4; i++) {
        const t = (time * 0.9 + i / 4 + hx * 0.013) % 1;
        f.fillStyle(0xffc070, (1 - t) * heat);
        f.fillCircle(hx + w * 0.5 + Math.sin(t * 9 + i) * 6, base - 6 - t * 34, 0.7);
      }
      for (let i = 0; i < 3; i++) {
        const t = (time * 0.4 + i / 3 + hx * 0.01) % 1;
        f.fillStyle(0x121315, 0.45 * (1 - t) * heat);
        f.fillCircle(hx + w / 2 - t * 18, base - 10 - t * 40, 4 + t * 10);
      }
    }
    // the pier burns near the shore
    for (let i = 0; i < 3; i++) flame(PIER_FIRE_X + i * 11, S - 8, 7 + (i % 2) * 3, 40 + i * 2.3);
  }

  update(s: StoryState, anchors: Anchor[], time: number): void {
    this.fx.clear();
    this.drawPeople(s);
    this.drawClues(s);
    this.drawShipScene(s, anchors, time);
    this.drawFire(s, time);
  }

  /** Warm light from the fire and the lanterns, a faint glow on clues not yet found (they cut the darkness). */
  glowSpots(s: StoryState, anchors: Anchor[]): { x: number; y: number; r: number }[] {
    const out: { x: number; y: number; r: number }[] = [];
    if (s.step === 'freeWhale')
      for (const a of anchors) if (a.hp > 0) out.push({ x: a.x, y: a.y - 6, r: 14 });
    if (s.step === 'pier' || s.step === 'findShark')
      for (const [hx, w] of PORT_HOUSES) out.push({ x: hx + w / 2, y: S - 20, r: 26 });
    if (s.step === 'findShark')
      for (const c of s.spots) if (!s.clues.includes(c.id)) out.push({ x: c.x, y: c.y, r: 12 });
    return out;
  }
}

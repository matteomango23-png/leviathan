// The Ocean's Nightmare's gadgets in the sea (part 4d, owner 9 ottobre 2026): the drone on its scouting round (its
// painting and a small light), the sphere with its pulsing red glow, and the red shocks running through the beast it
// holds still.
import Phaser from 'phaser';
import { SPHERE } from '../data/nightmare';
import { WORLD_ART_KEYS } from '../data/sprites.generated';
import { WORLD } from '../data/worldLayout';
import { isHeld } from '../systems/beastState';
import { isInWater } from '../systems/beasts/wildState';
import type { GameState } from '../systems/game';
import { reconOut, sphereBay } from '../systems/ship/gadgets';
import { subLength, subModel } from '../systems/submarine';
import { placeGlow } from './submarineView';
import { hatchT } from '../systems/ship/ship';

const SPHERE_ART = 'sfera_nightmare';
const RED = 0xff3a2a;

export class NightmareView {
  private readonly drone: Phaser.GameObjects.Image;
  private readonly droneGlow: Phaser.GameObjects.Image;
  private readonly sphere: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly shocks: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.drone = scene.add.image(0, 0, '__WHITE').setVisible(false);
    this.droneGlow = scene.add.image(0, 0, '__WHITE').setVisible(false).setBlendMode(Phaser.BlendModes.ADD);
    this.sphere = scene.add.image(0, 0, '__WHITE').setVisible(false);
    this.glow = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.shocks = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    layer.add([this.glow, this.drone, this.droneGlow, this.sphere, this.shocks]);
  }

  update(g: GameState, time: number): void {
    const glow = this.glow.clear();
    this.shocks.clear();
    const r = g.gadgets.recon;
    const out = g.ship.owned && reconOut(g);
    this.drone.setVisible(false);
    this.droneGlow.setVisible(false);
    if (out) {
      const art = subModel(g.sub.model).art;
      const L = subLength(g.sub);
      if (WORLD_ART_KEYS.includes(art)) {
        const key = `world-${art}`;
        if (this.drone.texture.key !== key) this.drone.setTexture(key);
        const sc = L / this.drone.width;
        const y = r.y + Math.sin(time * 3) * 0.6;
        this.drone
          .setVisible(true)
          .setPosition(r.x, y)
          .setScale(sc * r.face, sc);
        placeGlow(this.droneGlow, art, r.x, y, 0, L, r.face, time);
      }
      glow.fillStyle(0xbfe8ff, 0.12).fillCircle(r.x + r.face * L * 0.55, r.y, 10);
    }
    const sp = g.gadgets.sphere;
    const bay = g.ship.owned ? sphereBay(g.ship) : -1;
    const away = bay >= 0 && sp.phase !== 'dock';
    // in its bay it shows as the hatch opens (owner, 9 ottobre: open the bay, see the sphere)
    const shown = away ? 1 : bay >= 0 ? hatchT(g.ship, bay) : 0;
    this.sphere.setVisible(false);
    if (shown <= 0.01) return;
    const size = SPHERE.sizeM * WORLD.unitsPerMetre;
    const pulse = 0.5 + 0.5 * Math.sin(time * Math.PI * 2 * SPHERE.pulseHz);
    if (WORLD_ART_KEYS.includes(SPHERE_ART)) {
      const key = `world-${SPHERE_ART}`;
      if (this.sphere.texture.key !== key) this.sphere.setTexture(key);
      this.sphere
        .setVisible(true)
        .setPosition(sp.x, sp.y)
        .setRotation(away ? time * 0.4 : 0)
        .setScale(size / this.sphere.width)
        .setAlpha(shown);
    }
    // its red glow, breathing: many faint rings, so it fades softly into the dark
    const rings = 14;
    for (let i = 0; i < rings; i++) {
      const k = 0.85 - (i / rings) * 0.6;
      glow
        .fillStyle(RED, 0.028 * (0.5 + pulse) * shown)
        .fillCircle(sp.x, sp.y, size * k * (0.9 + 0.1 * pulse));
    }
    if (sp.phase !== 'hold') return;
    // the beast it holds: a red shock runs through it now and then
    const w = g.beasts.wilds.find((x) => isInWater(x) && isHeld(g.beasts.held, x));
    const phase = (time % SPHERE.shockEvery) / SPHERE.shockEvery;
    if (!w || phase > 0.22) return;
    const fade = 1 - phase / 0.22;
    const half = w.length / 2;
    const s = this.shocks;
    for (let line = 0; line < 3; line++) {
      s.lineStyle(line === 0 ? 2.2 : 1.2, line === 0 ? 0xffd0c8 : RED, fade * (line === 0 ? 0.9 : 0.7));
      s.beginPath();
      const seed = Math.floor(time / SPHERE.shockEvery) * 7 + line * 13;
      for (let i = 0; i <= 10; i++) {
        const x = w.x - half + (w.length * i) / 10;
        const y = w.y + (Math.sin(seed + i * 2.7) * 0.5 + (i % 2 ? 0.3 : -0.3)) * w.length * 0.12;
        if (i === 0) s.moveTo(x, y);
        else s.lineTo(x, y);
      }
      s.strokePath();
    }
    // the tether from the sphere to the beast
    s.lineStyle(1, RED, 0.5 * fade).lineBetween(sp.x, sp.y, w.x, w.y);
  }

  /** Lights in the dark: the sphere's glow, the drone's lamp. */
  glowSpots(g: GameState): { x: number; y: number; r: number }[] {
    const out: { x: number; y: number; r: number }[] = [];
    if (g.ship.owned && reconOut(g)) out.push({ x: g.gadgets.recon.x, y: g.gadgets.recon.y, r: 26 });
    const sp = g.gadgets.sphere;
    if (g.ship.owned && sphereBay(g.ship) >= 0 && sp.phase !== 'dock')
      out.push({ x: sp.x, y: sp.y, r: SPHERE.sizeM * WORLD.unitsPerMetre * 0.8 });
    return out;
  }
}

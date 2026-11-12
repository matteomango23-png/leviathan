// The black smokers of the trenches (lot M4; world/smokers.ts): the owner's painted chimneys planted on the floor
// (plant.ts, behind the terrain so the rock hides their foot) and, from each mouth, a plume of hot black water rising
// and widening, made of soft puffs (never a drawn circle) glowing faintly with the heat over the darkness, plus the
// glow of the mouth. Only the ones
// near the camera are drawn.
import Phaser from 'phaser';
import { ENDLESS } from '../data/endless';
import { WORLD_ART_KEYS } from '../data/sprites.generated';
import { PROP_ART, SMOKER_LOOK } from '../data/worldArt';
import { CATHEDRAL } from '../data/galleries';
import { stretchAt } from '../systems/world/stretches';
import { smokerMouths, smokersOf } from '../systems/world/smokers';
import type { TileMap } from '../systems/world/tileMap';
import { plant } from './plant';
import { TEX } from './textures';

export class SmokerView {
  private readonly rocks: Phaser.GameObjects.Image[] = [];
  private readonly puffs: Phaser.GameObjects.Image[] = [];
  private readonly shrooms: Phaser.GameObjects.Image[] = [];
  private readonly placed = new Map<string, { bottom: number; scale: number }>();
  private readonly painted = PROP_ART.smokers.every((s) => WORLD_ART_KEYS.includes(s.art));
  private mouths: { x: number; y: number; r: number }[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: TileMap,
    /** Behind the terrain: the rock of the floor hides the chimney's foot (plant.ts). */
    private readonly under: Phaser.GameObjects.Container,
    /** Over the darkness: the plume's faint heat glow (black smoke vanished in the dark of the deep). */
    private readonly glowLayer: Phaser.GameObjects.Layer,
  ) {}

  update(view: Phaser.Geom.Rectangle, time: number): void {
    const S = ENDLESS.smokers;
    const L = SMOKER_LOOK;
    let rocks = 0;
    let puffs = 0;
    let shrooms = 0;
    this.mouths = [];
    if (this.painted && view.right >= ENDLESS.startX)
      for (let k = stretchAt(view.x) - 1; k <= stretchAt(view.right) + 1; k++)
        for (const s of smokersOf(k)) {
          const def = PROP_ART.smokers[s.art]!;
          const h = def.width * def.aspect;
          if (s.x + def.width < view.x || s.x - def.width > view.right) continue;
          if (s.y - h - S.plumeHeight > view.bottom || s.y < view.y) continue;
          const key = `${Math.round(s.x)}:${Math.round(s.y)}`;
          let at = this.placed.get(key);
          if (!at) {
            at = plant(this.map, s.x, s.y, def.width, h);
            this.placed.set(key, at);
          }
          let im = this.rocks[rocks];
          if (!im) {
            im = this.scene.add.image(0, 0, `world-${def.art}`).setOrigin(0.5, 1);
            this.under.add(im);
            this.rocks.push(im);
          }
          rocks++;
          im.setTexture(`world-${def.art}`)
            .setScale((def.width / im.width) * at.scale)
            .setPosition(s.x, at.bottom)
            .setVisible(true);
          // glowing mushrooms on the floor round it (the Gallerie's pictures), planted like it
          for (const [j, u] of L.mushroomsAt.entries()) {
            const art = CATHEDRAL.mushrooms[(s.art + j) % CATHEDRAL.mushrooms.length]!;
            if (!WORLD_ART_KEYS.includes(art)) continue;
            const mx = s.x + u * def.width;
            const mk = `${key}:${j}`;
            let mat = this.placed.get(mk);
            let sh = this.shrooms[shrooms];
            if (!sh) {
              sh = this.scene.add.image(0, 0, `world-${art}`).setOrigin(0.5, 1);
              this.under.add(sh);
              this.shrooms.push(sh);
            }
            shrooms++;
            sh.setTexture(`world-${art}`);
            const mh = (L.mushroomWidth * sh.height) / sh.width;
            if (!mat) {
              mat = plant(this.map, mx, s.y, L.mushroomWidth, mh);
              this.placed.set(mk, mat);
            }
            sh.setScale((L.mushroomWidth / sh.width) * mat.scale)
              .setPosition(mx, mat.bottom)
              .setVisible(true);
            this.mouths.push({ x: mx, y: mat.bottom - mh * 0.5, r: L.mushroomGlow });
          }
          for (const [m, mouth] of smokerMouths(s, at.bottom).entries()) {
            this.mouths.push({ x: mouth.x, y: mouth.y, r: L.glow });
            // the plume: puffs rising one after the other, each widening and fading, swaying a little
            for (let i = 0; i < L.puffs; i++) {
              const t = (time * L.rise + i / L.puffs + m * 0.37 + k * 0.11) % 1;
              let p = this.puffs[puffs];
              if (!p) {
                p = this.scene.add.image(0, 0, TEX.dot).setTint(L.color).setBlendMode(Phaser.BlendModes.ADD);
                this.glowLayer.add(p);
                this.puffs.push(p);
              }
              puffs++;
              const up = t * S.plumeHeight;
              const sway = Math.sin(time * 0.8 + i * 1.7 + m) * up * 0.06;
              const size = (S.plumeRadius + up * S.plumeGrow) * 2 * L.puffSize;
              p.setPosition(mouth.x + sway + up * L.drift, mouth.y - up)
                .setDisplaySize(size, size)
                .setAlpha(L.alpha * (1 - t) * Math.min(1, t * 10))
                .setVisible(true);
            }
          }
        }
    for (let i = rocks; i < this.rocks.length; i++) this.rocks[i]!.setVisible(false);
    for (let i = puffs; i < this.puffs.length; i++) this.puffs[i]!.setVisible(false);
    for (let i = shrooms; i < this.shrooms.length; i++) this.shrooms[i]!.setVisible(false);
  }

  /** The glowing mouths, for the darkness mask. */
  glowSpots(): { x: number; y: number; r: number }[] {
    return this.mouths;
  }
}

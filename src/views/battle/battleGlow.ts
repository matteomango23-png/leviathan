// A beast's glow in battle (data/glow.ts; owner, 21 ottobre 2026: the runes "anche quando combattono"): its glow
// picture laid over its three-quarter image like light, in upright slices so a pulse can run along it like a shock.
import Phaser from 'phaser';
import { assetUrl } from '../../data/assets';
import { GLOW_KEYS } from '../../data/sprites.generated';
import { glowAt, glowOf } from '../../systems/glowPulse';

const SLICES = 8;
const glowTexture = (picture: string): string => `glow-${picture}`;

/** The glow picture to load with a battle picture (`<id>_front` / `<id>_back`), if it has one. */
export function battleGlowArt(picture: string): { url: string; textureKey: string } | null {
  return GLOW_KEYS.includes(picture)
    ? { url: assetUrl(`glow/${picture}.webp`), textureKey: glowTexture(picture) }
    : null;
}

export class BattleGlow {
  private readonly parts: Phaser.GameObjects.Image[] = [];
  private picture = '';

  constructor(
    private readonly scene: Phaser.Scene,
    depth: number,
  ) {
    for (let i = 0; i < SLICES; i++)
      this.parts.push(
        scene.add
          .image(0, 0, '__WHITE')
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(depth)
          .setVisible(false),
      );
  }

  /** Over this image, showing this battle picture (its key without `battle-`), at time t (seconds). */
  update(im: Phaser.GameObjects.Image, picture: string, t: number, lit: boolean): void {
    const def = glowOf(picture);
    const tk = glowTexture(picture);
    if (!lit || !def || !im.visible || !this.scene.textures.exists(tk)) {
      for (const p of this.parts) p.setVisible(false);
      return;
    }
    if (picture !== this.picture) {
      this.picture = picture;
      const { width: w, height: h } = this.scene.textures.get(tk).getSourceImage();
      this.parts.forEach((p, i) => p.setTexture(tk).setCrop((i * w) / SLICES, 0, w / SLICES + 1, h));
    }
    // the wild one looks left (its head on the left), yours swims away to the right
    const headLeft = picture.endsWith('_front');
    this.parts.forEach((p, i) => {
      const along = headLeft ? i / (SLICES - 1) : 1 - i / (SLICES - 1);
      p.setVisible(true)
        .setOrigin(im.originX, im.originY)
        .setPosition(im.x, im.y)
        .setRotation(im.rotation)
        .setScale(im.scaleX, im.scaleY)
        .setAlpha(im.alpha * glowAt(def, t, along));
    });
  }
}

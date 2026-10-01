// The picture of a beast in battle: its three-quarter image (`<id>_front` for the wild one, `<id>_back` for
// yours, docs/ART.md) or, until it exists, its card illustration with soft faded edges.
import type Phaser from 'phaser';
import { ART_KEYS, BATTLE_ART_KEYS } from '../../data/sprites.generated';
import type { Side } from '../../systems/battle/battle';
import { formKey, type BeastForm } from '../../systems/beasts/forms';
import { rarityTier } from '../../systems/battle/stage';

/** The picture of a form in battle and whether it is a three-quarter image (true) or the card (false). */
export function battleArt(form: BeastForm, side: Side): { url: string; textureKey: string; own: boolean } {
  const key = formKey(form);
  const suffix = side === 'foe' ? '_front' : '_back';
  for (const k of [key, form.speciesId])
    if (BATTLE_ART_KEYS.includes(`${k}${suffix}`))
      return { url: `sprites/${k}${suffix}.webp`, textureKey: `battle-${k}${suffix}`, own: true };
  const card = ART_KEYS.includes(key) ? key : form.speciesId; // a variant without its own card uses the species'
  return { url: `art/${card}.webp`, textureKey: `card-${card}`, own: false };
}

/** A card illustration with its edges faded to transparent (an ellipse), made once per card. */
export function fadedCard(scene: Phaser.Scene, key: string): string {
  const fk = `${key}-faded`;
  if (scene.textures.exists(fk)) return fk;
  const src = scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const w = src.width;
  const h = src.height;
  const tex = scene.textures.createCanvas(fk, w, h)!;
  const ctx = tex.getContext();
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.translate(w / 2, h / 2);
  ctx.scale(1, h / w);
  const g = ctx.createRadialGradient(0, 0, w * 0.18, 0, 0, w * 0.5);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(0.65, 'rgba(0,0,0,0.9)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-w / 2, -w / 2, w, w);
  tex.refresh();
  return fk;
}

/** The glow and sparkles of a rare beast (rarityTier): gold for giants, pale for albinos, red for alphas. */
export function beastAura(form: BeastForm): { level: 0 | 1 | 2; color: number } {
  const level = rarityTier(form);
  const color =
    form.variant === 'albino' ? 0xfff0f6 : form.variant === 'alfa' && level < 2 ? 0xff7a5c : 0xffd27a;
  return { level, color };
}

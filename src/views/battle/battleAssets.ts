// What a battle loads before it starts: the pictures of the beasts that may appear (your team and the wild
// one), the painted background layers of the place and the taming shell, when they exist.
import type Phaser from 'phaser';
import { assetUrl } from '../../data/assets';
import type { BattlePlace } from '../../data/battle';
import { BG_KEYS, ITEM_ART_KEYS } from '../../data/sprites.generated';
import type { BattleState } from '../../systems/battle/battle';
import type { PaintedLayers } from './backdrop';
import { battleArt } from './beastArt';
import { SHELL_KEY } from './tameShell';

const LAYERS = ['far', 'mid', 'front', 'ground'] as const;

/** The painted layers of one place that exist (bg/<place>_<layer>.webp), as texture keys. */
function ownLayers(place: BattlePlace): PaintedLayers {
  const out: PaintedLayers = {};
  for (const layer of LAYERS) if (BG_KEYS.includes(`${place}_${layer}`)) out[layer] = `bgp-${place}-${layer}`;
  return out;
}

/**
 * The painted background of a place. A place with none of its own borrows the bay's (the backdrop tints it
 * with the place's colour and draws its props on top) until its own are painted.
 */
export function paintedLayers(place: BattlePlace): PaintedLayers {
  const mine = ownLayers(place);
  if (Object.keys(mine).length || place === 'baia') return mine;
  const bay = ownLayers('baia');
  return Object.keys(bay).length ? { ...bay, borrowed: true } : {};
}

export function loadBattleArt(scene: Phaser.Scene, s: BattleState, place: BattlePlace): Promise<void> {
  const wanted = [battleArt(s.foe.form, 'foe'), ...s.team.map((f) => battleArt(f.form, 'you'))];
  const painted = paintedLayers(place);
  for (const layer of LAYERS) {
    const key = painted[layer]; // bgp-<place>-<layer>
    if (key)
      wanted.push({ url: assetUrl(`bg/${key.split('-')[1]}_${layer}.webp`), textureKey: key, own: true });
  }
  if (ITEM_ART_KEYS.includes('conchiglia'))
    wanted.push({ url: assetUrl('items/conchiglia.webp'), textureKey: SHELL_KEY, own: true });
  for (const a of wanted) if (!scene.textures.exists(a.textureKey)) scene.load.image(a.textureKey, a.url);
  if (!scene.load.list.size) return Promise.resolve();
  return new Promise((done) => {
    scene.load.once('complete', () => done());
    scene.load.start();
  });
}

// What a battle loads before it starts: the pictures of the beasts that may appear (your team and the wild
// one), the painted background layers of the place and the taming shell, when they exist.
import type Phaser from 'phaser';
import type { BattlePlace } from '../../data/battle';
import { BG_KEYS, ITEM_ART_KEYS } from '../../data/sprites.generated';
import type { BattleState } from '../../systems/battle/battle';
import type { PaintedLayers } from './backdrop';
import { battleArt } from './beastArt';
import { SHELL_KEY, SHELL_OPEN_KEY } from './tameShell';

/** The painted background layers of a place that exist (bg/<place>_<layer>.webp). */
export function paintedLayers(place: BattlePlace): PaintedLayers {
  const out: PaintedLayers = {};
  for (const layer of ['far', 'mid', 'front', 'ground'] as const)
    if (BG_KEYS.includes(`${place}_${layer}`)) out[layer] = `bgp-${place}-${layer}`;
  return out;
}

export function loadBattleArt(scene: Phaser.Scene, s: BattleState, place: BattlePlace): Promise<void> {
  const wanted = [battleArt(s.foe.form, 'foe'), ...s.team.map((f) => battleArt(f.form, 'you'))];
  for (const [layer, key] of Object.entries(paintedLayers(place)))
    wanted.push({ url: `bg/${place}_${layer}.webp`, textureKey: key, own: true });
  for (const [file, key] of [
    ['conchiglia', SHELL_KEY],
    ['conchiglia_aperta', SHELL_OPEN_KEY],
  ] as const)
    if (ITEM_ART_KEYS.includes(file)) wanted.push({ url: `items/${file}.webp`, textureKey: key, own: true });
  for (const a of wanted) if (!scene.textures.exists(a.textureKey)) scene.load.image(a.textureKey, a.url);
  if (!scene.load.list.size) return Promise.resolve();
  return new Promise((done) => {
    scene.load.once('complete', () => done());
    scene.load.start();
  });
}

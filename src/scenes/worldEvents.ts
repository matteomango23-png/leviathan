// What the sea shows for a game event (WorldScene's handleEvents keeps what changes the game: saving, battles,
// the port, sounds): bubbles, spray, dust, feathers, the camera's jolts. And the gulls snapped up by a beast on its
// leap out of the water (breach.ts). Split from WorldScene in the cleanup of 19 ottobre 2026.
import { WORLD } from '../data/worldLayout';
import { mountAteBird } from '../systems/beastPlay';
import { eatBirdsNear, type BirdsState } from '../systems/birds';
import type { GameEvent } from '../systems/events';
import type { GameState } from '../systems/game';
import type { CameraRig } from '../views/cameraRig';
import type { EffectsView } from '../views/effectsView';
import type { TerrainView } from '../views/terrainView';

interface EventLooks {
  effects: EffectsView;
  rig: CameraRig;
  terrain: TerrainView;
  g: GameState;
}

/** Draws what an event looks like in the sea. */
export function showEvent(e: GameEvent, v: EventLooks): void {
  const { effects, rig, g } = v;
  if (e.type === 'bubble') effects.bubble(e.x, e.y);
  else if (e.type === 'dash') for (let i = 0; i < 5; i++) effects.bubble(e.x + Math.random() * 8 - 4, e.y);
  // a leap out of the water on a beast (breach.ts): spray going up, a big splash coming down
  else if (e.type === 'breach') effects.puff(e.x, e.y, 14, 0xe6f3f7, 70);
  else if (e.type === 'breachSplash') {
    // back in the water: a splash as big as the fall, no jolt of the screen (owner, 19 ottobre: "sembra che bughi")
    const k = Math.min(1, e.speed / 120);
    effects.puff(e.x, e.y, Math.round(6 + 14 * k), 0xe6f3f7, 20 + 40 * k);
    for (let i = 0; i < Math.round(4 + 8 * k); i++)
      effects.bubble(e.x + Math.random() * 24 - 12, e.y + 6 + Math.random() * 10);
  } else if (e.type === 'birdEaten')
    effects.puff(e.x, e.y, 10, 0xf4f6f8, 35); // feathers
  else if (e.type === 'hurt') rig.shake();
  else if (e.type === 'harpoonHitRock') effects.puff(e.x, e.y, 3, 0x9aaaaa, 30);
  else if (e.type === 'bonesBroken' || e.type === 'gateOpened') {
    v.terrain.invalidateTiles(e.tiles);
    const dust = e.type === 'gateOpened' ? 0x8a9488 : 0xd8ccb0;
    for (const i of e.tiles.slice(0, 6))
      effects.puff(g.map.tileOf(i).tx * 8 + 4, g.map.tileOf(i).ty * 8 + 4, 3, dust, 60);
    rig.shake();
  } else if (e.type === 'beastGulp') {
    // a mouthful of fish: silver scales and bubbles burst from its jaws
    effects.puff(e.x, e.y, Math.min(12, 4 + e.count), 0xcfdde4, 26);
    for (let i = 0; i < Math.min(10, e.count); i++)
      effects.bubble(e.x + Math.random() * 12 - 6, e.y + Math.random() * 6 - 3);
  } else if (e.type === 'subRammed') {
    // a blow on the hull: a light jolt and a few bubbles (owner, 4 ottobre: much lighter than before)
    rig.shake(e.by === 'beast' ? 0.45 : 0.2);
    effects.puff(e.x, e.y, 2, 0x2a2b2e, 10);
    for (let i = 0; i < 3; i++) effects.bubble(e.x + Math.random() * 12 - 6, e.y - 4);
  } else if (e.type === 'tilesChanged') v.terrain.invalidateTiles(e.tiles);
  else if (e.type === 'iceCracked' && Math.random() < 0.3)
    effects.puff(e.x, WORLD.surfaceY + 2, 3, 0xe6f2f8, 20 + e.speed * 0.2);
  else if (e.type === 'hatchMoved') rig.shake(0.15);
  else if (e.type === 'boatBumped')
    rig.shake(0.6); // the speedboat into the ice
  else if (e.type === 'shipDamaged') rig.shake(0.5); // a blow to the ship's hull (block 5c)
}

/** On a leap out of the water the beast snaps up the gulls in front of its jaws (owner, 16 ottobre): the events go
 *  out with the next game step, its message and feathers with them. */
export function snapGulls(g: GameState, birds: BirdsState): void {
  const d = g.diver;
  const mount = g.beasts.mount;
  if (!d.airborne || !g.beasts.riding || !mount) return;
  const mouthX = d.x + d.face * mount.length * 0.45;
  for (const b of eatBirdsNear(birds, mouthX, d.y, mount.length * 0.3 + 4))
    mountAteBird(g, b.x, b.y, g.story.pending);
}

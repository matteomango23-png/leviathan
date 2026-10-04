import { beforeAll, describe, expect, it } from 'vitest';
import { bodyCircles, type BodyPose } from '../src/systems/beasts/combat';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

/** A humpback (90 units) swimming east towards a wall, in open water at depth y. */
function whaleBeforeWall(y: number): BodyPose & { vx: number; vy: number } {
  const pose = { x: 0, y, face: 1 as const, pitch: 0, length: 90 };
  for (let x = 1800; x < 9000; x += 2) {
    const free = !map.hitShape(x, y, bodyCircles({ ...pose, x }));
    const freeBehind = !map.hitShape(x - 60, y, bodyCircles({ ...pose, x: x - 60 }));
    if (free && freeBehind && map.solidAt(x + 50, y)) return { ...pose, x, vx: 60, vy: 0 };
  }
  throw new Error('no wall found');
}

describe('collisioni lungo tutto il corpo (4 ottobre)', () => {
  it('una bestia grande si ferma con la testa fuori dalla roccia, non solo il centro', () => {
    const w = whaleBeforeWall(160);
    for (let i = 0; i < 90; i++) {
      w.vx = 60;
      map.moveBody(w, bodyCircles(w), 1 / 30);
    }
    const head = bodyCircles(w).at(-1)!;
    expect(map.hitCircle(w.x + head.dx, w.y + head.dy, head.r)).toBe(false);
    // with only the middle circle (as before) it would push its head deep into the wall
    const old = whaleBeforeWall(160);
    for (let i = 0; i < 90; i++) {
      old.vx = 60;
      map.moveBody(old, 90 * 0.07, 1 / 30);
    }
    expect(map.solidAt(old.x + 0.45 * 90, old.y)).toBe(true);
  });

  it('una bestia incastrata nella roccia può uscirne (non resta ferma)', () => {
    const w = whaleBeforeWall(160);
    w.x += 30; // its head is now in the rock
    expect(map.hitShape(w.x, w.y, bodyCircles(w))).toBe(true);
    const x0 = w.x;
    for (let i = 0; i < 30; i++) {
      w.vx = -40;
      map.moveBody(w, bodyCircles(w), 1 / 30);
    }
    expect(w.x).toBeLessThan(x0 - 10);
  });
});

describe('in superficie (4 ottobre: in groppa al cetaceo l’aria non si ricaricava)', () => {
  it('un cetaceo che risale col muso in su arriva con il centro alla superficie', () => {
    const w = { x: 0, y: 120, vx: 0, vy: -60, face: 1 as const, pitch: -0.6, length: 90 };
    // open water near the surface
    for (let x = 2000; x < 9000; x += 4) {
      if (
        !map.hitShape(x, 60, bodyCircles({ ...w, x, y: 60 })) &&
        !map.hitShape(x, 120, bodyCircles({ ...w, x }))
      ) {
        w.x = x;
        break;
      }
    }
    for (let i = 0; i < 90; i++) {
      w.vy = -60;
      map.moveBody(w, bodyCircles(w), 1 / 30);
    }
    expect(w.y).toBeLessThanOrEqual(map.surfaceY + 90 * 0.07 + 0.01);
  });
});

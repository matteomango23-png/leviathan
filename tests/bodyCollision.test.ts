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

describe('forma vera delle bestie (4 ottobre: più sono grandi più entravano nella roccia)', () => {
  it('ogni profilo ha la sua forma, e quella della megattera è più alta dei vecchi cerchi', async () => {
    const { BODY_SHAPES } = await import('../src/data/bodyShapes.generated');
    const { SPRITE_KEYS } = await import('../src/data/sprites.generated');
    for (const k of SPRITE_KEYS) expect(BODY_SHAPES[k], k).toBeDefined();
    const { shapeOfForm } = await import('../src/systems/beasts/forms');
    const whale = { x: 0, y: 0, face: 1 as const, pitch: 0, length: 144 };
    const real = bodyCircles({ ...whale, shape: shapeOfForm({ speciesId: 'megattera', variant: 'comune' }) });
    const old = bodyCircles(whale);
    expect(Math.max(...real.map((c) => c.r))).toBeGreaterThan(Math.max(...old.map((c) => c.r)) * 1.3);
  });

  it('in groppa la battaglia parte quando la selvatica tocca la tua bestia', async () => {
    const { bodiesTouch } = await import('../src/systems/beasts/combat');
    const mine = { x: 0, y: 100, face: 1 as const, pitch: 0, length: 140 };
    const wild = { x: 75, y: 100, face: -1 as const, pitch: 0, length: 40 };
    expect(bodiesTouch(mine, wild)).toBe(true); // its head reaches your whale's head, far from you on its back
    expect(bodiesTouch(mine, { ...wild, x: 200 })).toBe(false);
  });
});

describe('il sottomarino è solido (4 ottobre)', () => {
  it('il sub e le bestie non gli passano attraverso', async () => {
    const { pushOutOfSub, newSub } = await import('../src/systems/submarine');
    const s = { ...newSub(null), owned: true, x: 500, y: 200 };
    const diver = { x: 500, y: 203, vx: 0, vy: -30 };
    expect(pushOutOfSub(s, diver, [{ dx: 0, dy: 0, r: 4 }])).toBe(true);
    expect(Math.abs(diver.y - 200)).toBeGreaterThan(8);
    const beast = { x: 470, y: 200, vx: 40, vy: 0 };
    pushOutOfSub(s, beast, [{ dx: 10, dy: 0, r: 8 }]);
    expect(beast.vx).toBeLessThanOrEqual(0.001); // it does not push on into the hull
  });
});

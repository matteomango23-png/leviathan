// Moves of the other Baia beasts: barracuda, sea turtle, torpedo ray.
import { beforeAll, describe, expect, it } from 'vitest';
import { summonCompanion } from '../src/systems/beasts/companion';
import { companionAttack, useMove, type MoveContext } from '../src/systems/beasts/moves';
import { makeTeamBeast } from '../src/systems/beasts/team';
import { createWild, spawnWild } from '../src/systems/beasts/wild';
import { WILD_SPAWNS } from '../src/data/beasts';
import { makeRng } from '../src/systems/math';
import { generateWorld } from '../src/systems/world/worldGen';
import type { TileMap } from '../src/systems/world/tileMap';
import type { GameEvent } from '../src/systems/events';
import { contextAction, createBeasts } from '../src/systems/beastPlay';
import { createGame } from '../src/systems/game';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

function setup(speciesId: string, level: number) {
  const b = makeTeamBeast('b1', { speciesId, variant: 'comune' }, level, true);
  const c = summonCompanion(b, { x: 900, y: 200, face: 1 }, map);
  Object.assign(c, { x: 900, y: 200, face: 1, pitch: 0 });
  const w = createWild(9, WILD_SPAWNS[0]!);
  spawnWild(w, { speciesId: 'squalo_bianco', variant: 'comune' }, 5, makeRng(1), 0);
  Object.assign(w, { motion: 'cruise', x: 900 + c.length * 0.6, y: 200 });
  const events: GameEvent[] = [];
  const ctx: MoveContext = {
    wilds: [w],
    map,
    events,
    rng: makeRng(2),
    effects: { shield: 0, guardTime: 0, guardMult: 1 },
    tameable: () => true,
  };
  return { b, c, w, ctx, events };
}

describe('barracuda', () => {
  it('Morso rapido bites twice', () => {
    const { b, c, ctx, events } = setup('barracuda', 1);
    expect(useMove(b, c, 1, ctx).ok).toBe(true);
    expect(events.filter((e) => e.type === 'damage')).toHaveLength(2);
  });

  it('Branco d’argento doubles its attack speed', () => {
    const { b, c, ctx } = setup('barracuda', 15);
    expect(useMove(b, c, 3, ctx).ok).toBe(true);
    expect(c.haste).toBeGreaterThan(0);
  });
});

describe('sea turtle (support)', () => {
  it('Guscio protettivo shields the diver, Muraglia di pietra halves team damage', () => {
    const { b, c, ctx } = setup('tartaruga_marina', 15);
    useMove(b, c, 2, ctx);
    expect(ctx.effects.shield).toBe(1);
    useMove(b, c, 3, ctx);
    expect(ctx.effects.guardMult).toBe(0.5);
    expect(ctx.effects.guardTime).toBe(5);
  });

  it('uses its support moves by itself as a companion', () => {
    const { b, c, w, ctx } = setup('tartaruga_marina', 15);
    companionAttack(b, c, w, ctx);
    expect(ctx.effects.guardTime > 0 || ctx.effects.shield > 0).toBe(true);
  });
});

describe('torpedo ray', () => {
  it('Campo elettrico stuns nearby beasts', () => {
    const { b, c, w, ctx, events } = setup('torpedine', 7);
    useMove(b, c, 2, ctx);
    expect(w.stun).toBeGreaterThan(0);
    expect(events.some((e) => e.type === 'areaPulse')).toBe(true);
  });
});

describe('riding', () => {
  it('only mounts (cavalcatura) can be ridden', () => {
    const g = createGame(map, null, 1);
    g.beasts = createBeasts([makeTeamBeast('b1', { speciesId: 'barracuda', variant: 'comune' }, 3, true)]);
    g.beasts.companion = summonCompanion(g.beasts.team[0]!, g.diver, map);
    Object.assign(g.beasts.companion, { x: g.diver.x, y: g.diver.y });
    expect(contextAction(g)).toBeNull();
    g.beasts = createBeasts([
      makeTeamBeast('b1', { speciesId: 'squalo_bianco', variant: 'comune' }, 3, true),
    ]);
    g.beasts.companion = summonCompanion(g.beasts.team[0]!, g.diver, map);
    Object.assign(g.beasts.companion, { x: g.diver.x, y: g.diver.y });
    expect(contextAction(g)).toBe('cavalca');
  });
});

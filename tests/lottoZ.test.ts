// Lot Z (20 ottobre 2026): a wild giant drifts slowly to show its tail and never goes down behind the commands; the
// submarine left in the sea comes back to the hold when you lose your senses; the title menu's music fits its bars.
import { describe, expect, it } from 'vitest';
import { BATTLE_STAGE } from '../src/data/battle';
import { TITLE_MUSIC } from '../src/data/music';
import { SUBMARINE } from '../src/data/submarine';
import { WORLD } from '../src/data/worldLayout';
import { BATTLE_ART_BOX } from '../src/data/sprites.generated';
import { battleSizes, cardBox, foeFloor, foeSway, isGiant, placePicture } from '../src/systems/battle/stage';
import { formLengthM, type BeastForm } from '../src/systems/beasts/forms';
import { createGame } from '../src/systems/game';
import { wakeOnShip } from '../src/systems/vehicles';
import { generateWorld } from '../src/systems/world/worldGen';
import { battleArt } from '../src/views/battle/beastArt';
import { giveSub, giveVessels } from './helpers/vessels';
import type { GameEvent } from '../src/systems/events';

const map = generateWorld();
const SCREENS = [
  { w: 667, h: 375 },
  { w: 932, h: 430 },
];

function stageOf(form: BeastForm, side: 'you' | 'foe', level: number) {
  const art = battleArt(form, side);
  const box = art.own ? BATTLE_ART_BOX[art.textureKey.replace(/^battle-/, '')] : undefined;
  return { lengthM: formLengthM(form, level), giant: isGiant(form), box };
}

/** The opaque box of a beast on screen (px), standing where it stands at `size`, its picture × k (a giant farther
 *  away shrinks around the point it rests on: battleView). */
function boxOf(
  side: 'you' | 'foe',
  size: number,
  w: number,
  h: number,
  box = cardBox(),
  floor: number,
  k = 1,
) {
  const P = BATTLE_STAGE.picture;
  const p = placePicture(side, size, w, h, box, floor);
  return {
    left: p.x + (box[0] - P.square / 2) * p.scale * k,
    right: p.x + (box[2] - P.square / 2) * p.scale * k,
    top: p.y + (box[1] - P.foot) * p.scale * k,
    bottom: p.y + (Math.min(box[3], P.foot) - P.foot) * p.scale * k,
  };
}

describe('a wild giant swims farther away and back (owner: "vederlo tutto", "avanti e indietro")', () => {
  const giants: BeastForm[] = [
    { speciesId: 'capodoglio', variant: 'comune', final: true }, // Moby Dick
    { speciesId: 'megalodonte', variant: 'comune', final: true },
    { speciesId: 'megattera', variant: 'comune', final: true },
  ];
  const yours: BeastForm = { speciesId: 'pesce_palla', variant: 'comune' };
  const { farShare, period } = BATTLE_STAGE.giantDrift;

  it('at its farthest it is whole on screen, never below its ground, and never smaller than farShare', () => {
    for (const { w, h } of SCREENS) {
      const floor = foeFloor(h);
      for (const f of giants) {
        const foe = stageOf(f, 'foe', 60);
        const s = battleSizes(stageOf(yours, 'you', 30), foe, w / h, floor);
        const box = foe.box ?? cardBox();
        const near = boxOf('foe', s.foe, w, h, box, floor);
        expect(near.top, `${f.speciesId} is cut at the top at ${w}`).toBeLessThan(0); // the case the owner saw
        expect(foeSway(0, s.foe, w, h, box, floor)).toBeCloseTo(1, 6); // it starts as big as now
        const k = foeSway(period / 2, s.foe, w, h, box, floor);
        expect(k).toBeGreaterThanOrEqual(farShare - 1e-9);
        expect(k).toBeLessThan(1);
        const far = boxOf('foe', s.foe, w, h, box, floor, k);
        // whole, back and tail (owner, 20 ottobre: "svelare tutto il corpo, coda compresa")
        const m = BATTLE_STAGE.fit.margin * h;
        expect(k, `${f.speciesId} whole at ${w}`).toBeGreaterThan(farShare + 1e-6);
        expect(far.top).toBeGreaterThanOrEqual(m - 1);
        expect(far.right).toBeLessThanOrEqual(w - m + 1);
        // never below the point it rests on, the floor kept above the commands
        expect(far.bottom).toBeLessThanOrEqual(boxOf('foe', s.foe, w, h, box, floor, 0).bottom + 0.5);
      }
    }
  });

  it('a beast in full view stays as it is', () => {
    for (const { w, h } of SCREENS) {
      const floor = foeFloor(h);
      expect(foeSway(period / 2, 0.3, w, h, cardBox(), floor)).toBe(1);
    }
  });
});

describe('the submarine left in the sea comes back (owner: "sottomarino bloccato in profondità")', () => {
  it('waking on the ship, it is in the hold again, even deeper than your suit', () => {
    const g = createGame(map, null, 4);
    giveVessels(g);
    Object.assign(g.ship, { bay: 'out', aboard: false });
    Object.assign(g.sub, { aboard: false, x: g.ship.x + 300, y: WORLD.surfaceY + 3000 });
    const events: GameEvent[] = [];
    expect(wakeOnShip(g, events)).toBe(true);
    expect(g.ship.bay).toBe('docked');
    expect(events).toContainEqual({ type: 'subRecovered', toShip: true });
  });

  it('with no ship, it goes back to its mooring at Portofosco', () => {
    const g = createGame(map, null, 4);
    giveSub(g);
    Object.assign(g.sub, { aboard: false, x: SUBMARINE.mooredX + 2000, y: WORLD.surfaceY + 900 });
    const events: GameEvent[] = [];
    expect(wakeOnShip(g, events)).toBe(false);
    expect(g.sub.x).toBe(SUBMARINE.mooredX);
    expect(events).toContainEqual({ type: 'subRecovered', toShip: false });
  });
});

describe('the title menu music', () => {
  it('every bar of its melody fills its three beats', () => {
    for (const bar of TITLE_MUSIC.bars)
      expect(bar.melody.reduce((a, [, b]) => a + b, 0)).toBe(TITLE_MUSIC.beatsPerBar);
  });
});

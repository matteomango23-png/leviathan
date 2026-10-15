// Lotto C (owner, 15 ottobre 2026): the drone's report runs out, outposts found from afar, your craft on the sonar,
// the rare versions seen, the team balls swapped, the starter chosen once.
import { beforeAll, describe, expect, it } from 'vitest';
import { OUTPOSTS } from '../src/data/economy';
import { RECON } from '../src/data/nightmare';
import { WORLD } from '../src/data/worldLayout';
import { rareVersions } from '../src/systems/beasts/rareVersions';
import { swapInTeam, teamMembers } from '../src/systems/beasts/team';
import { chartAround } from '../src/systems/chart';
import { discoverOutposts, outpostKey } from '../src/systems/economy/places';
import type { GameEvent } from '../src/systems/events';
import { createGame } from '../src/systems/game';
import { stepGadgets } from '../src/systems/ship/gadgets';
import { ownMarks } from '../src/systems/ship/ownMarks';
import { chooseStarter, STARTERS } from '../src/systems/starter';
import { giveTestBeast } from '../src/systems/testTools';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';
import { giveVessels } from './helpers/vessels';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

describe('the drone report', () => {
  it('is good for RECON.reportSeconds, then it runs out', () => {
    const g = createGame(map, null, 4);
    giveVessels(g);
    const r = g.gadgets.recon;
    Object.assign(r, { report: [], reportAge: 0 });
    stepGadgets(g, RECON.reportSeconds - 1, []);
    expect(r.report).not.toBeNull();
    stepGadgets(g, 2, []);
    expect(r.report).toBeNull();
  });
});

describe('outposts', () => {
  it('are found 400 m away, before you reach them', () => {
    const g = createGame(map, null, 4);
    const o = OUTPOSTS[0]!;
    g.diver.x = o.x - 400 * WORLD.unitsPerMetre;
    const ev: GameEvent[] = [];
    discoverOutposts(g, ev);
    expect(g.seen.has(outpostKey(o.id))).toBe(true);
  });
});

describe('your craft in the water', () => {
  it('show on the sonar (and the speedboat on the chart)', () => {
    const g = createGame(map, null, 4);
    giveVessels(g);
    g.boat.owned = true;
    Object.assign(g.boat, { bay: 'out', x: g.ship.x + 60 * WORLD.unitsPerMetre });
    Object.assign(g.gadgets.recon, {
      phase: 'out',
      x: g.ship.x - 30 * WORLD.unitsPerMetre,
      y: WORLD.surfaceY + 120,
    });
    const marks = ownMarks(g);
    expect(marks.map((m) => m.kind)).toEqual(expect.arrayContaining(['boat', 'drone']));
    expect(Math.round(marks.find((m) => m.kind === 'boat')!.dxM)).toBe(60);
    expect(chartAround(g).marks.some((m) => m.kind === 'boat')).toBe(true);
  });
});

describe('the bestiary', () => {
  it('lists the rare versions seen, not only the tamed ones', () => {
    const g = createGame(map, null, 4);
    g.seen.add('squalo_bianco_alfa');
    giveTestBeast(g, { speciesId: 'barracuda', variant: 'alfa' }, 5);
    const v = rareVersions(g);
    expect(v.find((r) => r.form.speciesId === 'squalo_bianco' && r.form.variant === 'alfa')?.state).toBe(
      'seen',
    );
    expect(v.find((r) => r.form.speciesId === 'barracuda' && r.form.variant === 'alfa')?.state).toBe('tamed');
    expect(v.some((r) => r.state === 'unknown')).toBe(true);
  });
});

describe('the team balls', () => {
  it('two of them change places: the first leads', () => {
    const g = createGame(map, null, 4);
    giveTestBeast(g, { speciesId: 'barracuda', variant: 'comune' }, 5);
    giveTestBeast(g, { speciesId: 'squalo_bianco', variant: 'comune' }, 5);
    const [a, b] = teamMembers(g.beasts.team);
    expect(swapInTeam(g.beasts.team, a!.uid, b!.uid)).toBe(true);
    expect(teamMembers(g.beasts.team)[0]!.uid).toBe(b!.uid);
  });
});

describe('the starter', () => {
  it('is chosen once: a second tap adds nothing', () => {
    const g = createGame(map, null, 4);
    const before = g.beasts.team.length;
    const id = STARTERS[0]!.id;
    expect(chooseStarter(g, id, [])).not.toBeNull();
    expect(chooseStarter(g, id, [])).toBeNull();
    expect(g.beasts.team.length).toBe(before + 1);
  });
});

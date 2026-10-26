// Lot T1 (owner, 26 ottobre 2026): the bounties as a path from the easiest beasts to the legends, followed in the
// diary (5 common, 2 alpha or albino, 1 legend), paid at once; the market's requests for beasts; the sonar's floor.
import { beforeAll, describe, expect, it } from 'vitest';
import { BEAST_REQUESTS, BOUNTY_RULES } from '../src/data/bounties';
import { PORTO_FANGO } from '../src/data/economy';
import { HUNTS } from '../src/data/hunts';
import { WORLD } from '../src/data/worldLayout';
import { addTamed, makeTeamBeast } from '../src/systems/beasts/team';
import { beastPrice } from '../src/systems/economy/beastSale';
import { priceAt, requestsAt, sellAtPort } from '../src/systems/economy/beastRequests';
import { acceptBounty, boardBounties, bountyBeaten, followedBounties } from '../src/systems/economy/bounties';
import { bountyPath } from '../src/systems/economy/bountyPath';
import type { GameEvent } from '../src/systems/events';
import { createGame, toSave, type GameState } from '../src/systems/game';
import { sonarReadout } from '../src/systems/hunts';
import { parseSave } from '../src/systems/save/saveData';
import { landmarkSites } from '../src/systems/world/landmarks';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

const atPort = (): GameState => {
  const g = createGame(map, null, 4);
  g.port = PORTO_FANGO;
  return g;
};

describe('il percorso delle taglie', () => {
  it('tutte le bestie del mare, dalle più facili alle più difficili, ognuna con un posto dove trovarla', () => {
    const common = bountyPath('comune');
    expect(common.length).toBeGreaterThan(30);
    for (let i = 1; i < common.length; i++)
      expect(common[i]!.levels[0]).toBeGreaterThanOrEqual(common[i - 1]!.levels[0]);
    for (const b of [...common, ...bountyPath('rara')]) {
      expect(b.where, b.id).toMatch(/m$/);
      expect(b.reward, b.id).toBeGreaterThan(0);
    }
    // the cheapest small fish pay little, the biggest predators thousands, a rare one more
    expect(common[0]!.reward).toBeLessThanOrEqual(200);
    expect(common.at(-1)!.reward).toBeGreaterThan(1000);
    const rare = bountyPath('rara').find((b) => b.form.speciesId === common[0]!.form.speciesId);
    if (rare) expect(rare.reward).toBeGreaterThan(common[0]!.reward);
  });

  it('al massimo 10 per fila; chiusa una, entra la successiva; una bestia già battuta si salta', () => {
    const g = atPort();
    const row = boardBounties(g, 'comune');
    expect(row).toHaveLength(BOUNTY_RULES.visible);
    // the second one already beaten on your own: skipped, the 11th comes in
    g.gear.bounties.beaten.push(row[1]!.id);
    const after = boardBounties(g, 'comune');
    expect(after.map((b) => b.id)).not.toContain(row[1]!.id);
    expect(after.at(-1)!.id).toBe(bountyPath('comune')[BOUNTY_RULES.visible]!.id);
  });

  it('si accettano solo al porto, fino a 5 comuni e 2 rari; pagate subito una volta sola', () => {
    const g = atPort();
    const row = boardBounties(g, 'comune');
    for (const b of row.slice(0, 5)) expect(acceptBounty(g, b.id)).toBeNull();
    expect(acceptBounty(g, row[5]!.id)).not.toBeNull();
    expect(followedBounties(g, 'comune')).toHaveLength(5);
    const rare = boardBounties(g, 'rara');
    expect(acceptBounty(g, rare[0]!.id)).toBeNull();
    expect(acceptBounty(g, rare[1]!.id)).toBeNull();
    expect(acceptBounty(g, rare[2]!.id)).not.toBeNull();
    g.port = null;
    g.gear.bounties.followed = [];
    expect(acceptBounty(g, row[0]!.id)).not.toBeNull(); // at sea: no

    g.port = PORTO_FANGO;
    acceptBounty(g, row[0]!.id);
    g.port = null;
    const teeth = g.gear.teeth;
    const ev: GameEvent[] = [];
    bountyBeaten(g, row[0]!.form, false, ev);
    bountyBeaten(g, row[0]!.form, true, ev);
    expect(g.gear.teeth).toBe(teeth + row[0]!.reward);
    expect(ev.filter((e) => e.type === 'bountyClosed')).toHaveLength(1);
    expect(boardBounties(g, 'comune').map((b) => b.id)).not.toContain(row[0]!.id);
  });

  it('il leggendario seguito paga circa 10.000 denti, una volta', () => {
    const g = atPort();
    const h = HUNTS.find((x) => x.form.unique)!;
    g.huntPinned = h.id;
    const ev: GameEvent[] = [];
    bountyBeaten(g, { speciesId: h.form.speciesId, variant: 'comune', unique: h.form.unique }, false, ev);
    bountyBeaten(g, { speciesId: h.form.speciesId, variant: 'comune', unique: h.form.unique }, true, ev);
    expect(g.gear.teeth).toBe(BOUNTY_RULES.reward.legend);
  });

  it('taglie e richieste si salvano; una partita vecchia parte da zero', () => {
    const g = atPort();
    const b = boardBounties(g, 'comune')[0]!;
    acceptBounty(g, b.id);
    g.gear.bounties.beaten.push('squalo_bianco');
    const back = createGame(map, parseSave(JSON.stringify(toSave(g, new Date()))), 4);
    expect(back.gear.bounties.followed).toEqual([b.id]);
    expect(back.gear.bounties.beaten).toContain('squalo_bianco');
    const old = JSON.parse(JSON.stringify(toSave(g, new Date())));
    delete old.gear.bounties;
    delete old.gear.requestsMet;
    const fresh = createGame(map, parseSave(JSON.stringify(old)), 4);
    expect(fresh.gear.bounties.followed).toEqual([]);
    expect(fresh.gear.requestsMet).toEqual([]);
  });
});

describe('le richieste del mercato', () => {
  it('il porto chiede alcune bestie del percorso e le paga di più; soddisfatta, entra un’altra', () => {
    const g = atPort();
    const reqs = requestsAt(g, PORTO_FANGO.id);
    expect(reqs).toHaveLength(BEAST_REQUESTS.count);
    const want = reqs[0]!;
    addTamed(g.beasts.team, makeTeamBeast('b1', { ...want.form }, 10, true));
    addTamed(g.beasts.team, makeTeamBeast('b2', { speciesId: 'tonno', variant: 'comune' }, 10, true));
    const beast = g.beasts.team.find((x) => x.uid === 'b1')!;
    beast.inTeam = false;
    expect(priceAt(g, beast)).toBe(Math.round(beastPrice(beast) * want.mult));
    const teeth = g.gear.teeth;
    expect(sellAtPort(g, 'b1')).toBeGreaterThan(0);
    expect(g.gear.teeth).toBeGreaterThan(teeth);
    expect(requestsAt(g, PORTO_FANGO.id).map((r) => r.id)).not.toContain(want.id);
    expect(requestsAt(g, PORTO_FANGO.id)).toHaveLength(BEAST_REQUESTS.count);
  });
});

describe('il sonar della nave', () => {
  it('sotto il Grande Arco il fondale è quello vero, non la cima dell’arco', () => {
    const g = createGame(map, null, 4);
    const arch = landmarkSites().find((s) => s.def.id === 'grande_arco')!;
    Object.assign(g.ship, { owned: true, x: arch.x, sonarOn: true, speed: 0 });
    const r = sonarReadout(g);
    expect(r.floorM).toBeGreaterThan(Math.round((arch.ground - WORLD.surfaceY) / WORLD.unitsPerMetre) - 4);
  });
});

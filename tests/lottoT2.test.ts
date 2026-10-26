// Lot T2 (owner, 26 ottobre 2026): the market's requests almost always common beasts, paid two to three times; the
// barter, several common beasts of a species for its albino or alpha.
import { beforeAll, describe, expect, it } from 'vitest';
import { BARTER, BEAST_REQUESTS } from '../src/data/bounties';
import { PORTS, PORTO_FANGO } from '../src/data/economy';
import { formKey, hasAlbinoArt, hasAlfaArt, wildLevelRange } from '../src/systems/beasts/forms';
import { addTamed, makeTeamBeast } from '../src/systems/beasts/team';
import { barter, barterGive, barterOffers, barterStock } from '../src/systems/economy/barter';
import { requestsAt } from '../src/systems/economy/beastRequests';
import { createGame, toSave, type GameState } from '../src/systems/game';
import { parseSave } from '../src/systems/save/saveData';
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

describe('le richieste del mercato', () => {
  it('quasi tutte bestie comuni, pagate da 2 a 3 volte', () => {
    const g = atPort();
    let all = 0;
    let rare = 0;
    for (let epoch = 0; epoch < 200; epoch++) {
      g.playTime = epoch * BEAST_REQUESTS.refreshSeconds;
      for (const p of PORTS)
        for (const r of requestsAt(g, p.id)) {
          all++;
          if (r.form.variant !== 'comune') rare++;
          expect(r.mult).toBeGreaterThanOrEqual(BEAST_REQUESTS.priceMult[0]);
          expect(r.mult).toBeLessThanOrEqual(BEAST_REQUESTS.priceMult[1]);
        }
    }
    expect(all).toBeGreaterThan(1000);
    expect(rare / all).toBeLessThan(0.03);
  });
});

describe('il baratto', () => {
  it('3 scambi per porto, solo per specie con albino o alfa; più rara, più bestie', () => {
    const g = atPort();
    const offers = barterOffers(g, PORTO_FANGO.id);
    expect(offers).toHaveLength(BARTER.count);
    for (const o of offers) {
      expect(o.from.variant).toBe('comune');
      expect(o.to.variant === 'albino' ? hasAlbinoArt(o.id) : hasAlfaArt(o.id)).toBe(true);
    }
    expect(barterGive({ speciesId: 'squalo_bianco', variant: 'albino' })).toBeGreaterThan(
      barterGive({ speciesId: 'barracuda', variant: 'albino' }),
    );
  });

  it('con abbastanza bestie in riserva si scambia; poi entra un altro scambio', () => {
    const g = atPort();
    const o = barterOffers(g, PORTO_FANGO.id)[0]!;
    addTamed(g.beasts.team, makeTeamBeast('keep', { speciesId: 'tonno', variant: 'comune' }, 5, true));
    for (let i = 0; i < o.give - 1; i++) {
      const b = makeTeamBeast(`c${i}`, { ...o.from }, 8 + i, false);
      g.beasts.team.push(b);
    }
    expect(barter(g, PORTO_FANGO.id, o.id)).toBeNull(); // one short
    g.beasts.team.push(makeTeamBeast('more', { ...o.from }, 30, true)); // in the team: not taken
    expect(barterStock(g, o)).toHaveLength(o.give - 1);
    g.beasts.team.push(makeTeamBeast('last', { ...o.from }, 9, false));
    const got = barter(g, PORTO_FANGO.id, o.id)!;
    expect(got.form).toEqual(o.to);
    expect(got.level).toBe(wildLevelRange(o.to)[0]);
    expect(g.beasts.team.filter((b) => formKey(b.form) === formKey(o.from)).map((b) => b.uid)).toEqual([
      'more',
    ]);
    expect(barterOffers(g, PORTO_FANGO.id).map((x) => x.id)).not.toContain(o.id);
    expect(barterOffers(g, PORTO_FANGO.id)).toHaveLength(BARTER.count);
  });

  it('i baratti fatti si salvano; una partita vecchia parte da zero', () => {
    const g = atPort();
    g.gear.barterDone.push(`${PORTO_FANGO.id}:0:barracuda`);
    const back = createGame(map, parseSave(JSON.stringify(toSave(g, new Date()))), 4);
    expect(back.gear.barterDone).toEqual(g.gear.barterDone);
    const old = JSON.parse(JSON.stringify(toSave(g, new Date())));
    delete old.gear.barterDone;
    expect(createGame(map, parseSave(JSON.stringify(old)), 4).gear.barterDone).toEqual([]);
  });
});

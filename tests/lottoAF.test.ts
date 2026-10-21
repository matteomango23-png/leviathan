// Lot AF (21 ottobre 2026): the bestiary in families, smallest to rarest; and nothing stuck any more: a leap that
// lands on an iceberg, an islet or the ship slides back into the sea, a big beast slips under the belly of an iceberg,
// a body caught in rock swims out, and sardines never swim into the ice.
import { describe, expect, it } from 'vitest';
import { RIDE_BREACH } from '../src/data/beasts';
import { BESTIARY_FAMILIES } from '../src/data/bestiaryOrder';
import { GAME_SPECIES } from '../src/data/species';
import { TILE } from '../src/data/worldLayout';
import { landOn, stepAirborne } from '../src/systems/breach';
import { bestiaryEntries, speciesStages } from '../src/systems/beasts/bestiaryEntries';
import { pushOutOfHull, type HullPart } from '../src/systems/hull';
import { makeRng } from '../src/systems/math';
import { stepFish, type Fish, type FishState, type School } from '../src/systems/fish';
import { TileMap } from '../src/systems/world/tileMap';

const DT = 1 / 60;
const T = 10; // tile size of the little test seas
const SURFACE = 100;

/** A little sea: water everywhere, rock where `solid(tx, ty)` says. */
function sea(solid: (tx: number, ty: number) => boolean): TileMap {
  const m = new TileMap(100, 60, T, SURFACE);
  for (let ty = 0; ty < 60; ty++) for (let tx = 0; tx < 100; tx++) if (solid(tx, ty)) m.set(tx, ty, TILE.ice);
  return m;
}

describe('il bestiario con un filo logico (proprietario, 21 ottobre)', () => {
  it('ogni bestia del gioco compare una volta sola, in una famiglia', () => {
    const ids = BESTIARY_FAMILIES.flatMap((f) => f.ids);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(GAME_SPECIES.map((s) => s.id).sort());
  });

  it('le linee evolutive stanno vicine e in ordine; lo squalo più raro chiude gli squali', () => {
    const order = bestiaryEntries()
      .filter((e) => e.kind === 'specie')
      .map((e) => e.form.speciesId);
    for (const s of GAME_SPECIES) {
      const line = speciesStages(s.id).map((x) => x.id);
      const at = line.map((id) => order.indexOf(id));
      for (let i = 1; i < at.length; i++) expect(at[i]).toBe(at[i - 1]! + 1);
    }
    const sharks = BESTIARY_FAMILIES.find((f) => f.name === 'Squali')!.ids;
    expect(sharks.at(-1)).toBe('megalodonte');
    expect(order.indexOf('squalo_mako')).toBeLessThan(order.indexOf('squalo_bianco'));
    const turtles = BESTIARY_FAMILIES.find((f) => f.name === 'Tartarughe')!.ids;
    expect(turtles.at(-1)).toBe('archelon'); // the starter's line closes its family
  });

  it("i numeri seguono il nuovo ordine e l'albino sta accanto alla sua specie", () => {
    const e = bestiaryEntries();
    expect(e[0]!.num).toBe(1);
    for (let i = 1; i < e.length; i++) expect(e[i]!.num).toBeGreaterThanOrEqual(e[i - 1]!.num);
    const white = e.findIndex((x) => x.form.speciesId === 'squalo_bianco' && x.kind === 'specie');
    expect(e[white + 1]!.form.speciesId).toBe('squalo_bianco');
  });
});

describe('i salti contro le cose solide (proprietario: "rimango bloccato")', () => {
  it('atterrando su un iceberg rimbalza e scivola indietro in acqua, senza restare incastrato', () => {
    // an iceberg from 3 tiles above the surface down to the sea floor, columns 40 … 60
    const m = sea((tx, ty) => tx >= 40 && tx <= 60 && ty >= 7);
    const d = { x: 360, y: SURFACE - 5, vx: 90, vy: -80, airborne: true as boolean | undefined };
    for (let t = 0; t < 8 && d.airborne; t += DT)
      stepAirborne(d, SURFACE, DT, [], (dt) => m.moveBody(d, 6, dt, false));
    expect(d.airborne).toBe(false); // back in the sea
    expect(d.x).toBeLessThan(400); // on the side it came from
    expect(m.hitCircle(d.x, d.y, 6)).toBe(false);
  });

  it('atterrando sulla nave scivola giù, senza lo scatto sotto la chiglia', () => {
    const hull: HullPart[] = [
      { x: 0, y: SURFACE, r: 12, link: true },
      { x: 120, y: SURFACE, r: 12 },
    ];
    const d = { x: 60, y: SURFACE - 40, vx: 0, vy: 60 };
    let biggest = 0;
    let landed = false;
    // until it is back down in the sea past the hull (in this test there is no water to slow it)
    for (let t = 0; t < 4 && d.y < SURFACE + 20; t += DT) {
      const [px, py] = [d.x, d.y];
      d.vy += RIDE_BREACH.gravity * DT;
      d.x += d.vx * DT;
      d.y += d.vy * DT;
      const falling = d.vy > 0;
      if (pushOutOfHull(hull, d, [{ dx: 0, dy: 0, r: 8 }]) && falling && d.vy <= 0.5) {
        landOn(d, -1);
        landed = true;
      }
      biggest = Math.max(biggest, Math.hypot(d.x - px, d.y - py));
    }
    expect(landed).toBe(true);
    expect(biggest).toBeLessThan(5); // no snap: never more than a normal step
    expect(d.x).toBeLessThan(-12); // slid off the end of the hull
  });
});

describe('mai incastrati (proprietario: "la pinna dorsale impigliata nell\'iceberg")', () => {
  it('una bestia grande sotto la pancia di un iceberg ci scivola sotto e passa', () => {
    // the belly of an iceberg: its underside slopes down from 120 to 160 across columns 40 … 60
    const m = sea((tx, ty) => tx >= 40 && tx <= 60 && ty * T < 120 + (tx - 40) * 2);
    const body = [-30, -15, 0, 15, 30].map((dx) => ({ dx, dy: 0, r: 8 }));
    const b = { x: 300, y: 128, vx: 0, vy: 0 };
    for (let t = 0; t < 10; t += DT) {
      b.vx = 50;
      b.vy = 0;
      m.moveBody(b, body, DT);
    }
    expect(b.x).toBeGreaterThan(650); // past the iceberg
  });

  it('un corpo dentro la roccia ne esce, sotto la superficie', () => {
    const m = sea((tx, ty) => tx >= 40 && tx <= 60 && ty >= 5 && ty <= 30);
    const b = { x: 500, y: 200, vx: 0, vy: 0 };
    for (let t = 0; t < 4; t += DT) m.moveBody(b, 8, DT, false);
    expect(m.hitCircle(b.x, b.y, 8)).toBe(false);
    expect(b.y).toBeGreaterThan(SURFACE);
  });
});

describe('le sardine non entrano negli iceberg', () => {
  it('un banco con la meta oltre il ghiaccio non ci finisce dentro', () => {
    const m = sea((tx, ty) => tx >= 40 && tx <= 60 && ty >= 5 && ty <= 30);
    const sc: School = { x: 300, y: 200, tx: 800, ty: 200, t: 99, roam: [250, 150, 900, 280] };
    const one = (k: number): Fish => ({
      kind: 'sardina',
      ...{ x: 290 + k * 3, y: 195 + k, vx: 0, vy: 0, alive: true, hooked: false, respawn: 0 },
      ...{ school: sc, ox: (k - 5) * 4, oy: (k % 3) * 4 - 4, phase: k },
    });
    const fish: FishState = { schools: [sc], fish: Array.from({ length: 10 }, (_, k) => one(k)) };
    const rng = makeRng(4);
    for (let t = 0; t < 20; t += DT) {
      // far away (out of sight) and close by
      stepFish(fish, m, { x: t < 10 ? 5000 : sc.x, y: 200, alive: true }, t, DT, rng);
      for (const f of fish.fish) expect(m.solidAt(f.x, f.y)).toBe(false);
      expect(m.solidAt(sc.x, sc.y)).toBe(false);
    }
  });
});

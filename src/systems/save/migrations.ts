// The migrations of the save (saveData.ts applies them): each turns a save of one version into the next. Never edit
// an existing one: add the next.
import { SUB_MODELS, SUBMARINE } from '../../data/submarine';
import { isFiniteNumber, isObject } from './guards';

/** A migration turns a save of version `from` into version `from + 1`. */
export interface Migration {
  from: number;
  migrate: (old: Record<string, unknown>) => Record<string, unknown>;
}

/** Real migrations of the game, in order. Never edit one: add the next. */
export const MIGRATIONS: Migration[] = [
  // v1 → v2 (tappa 2): tamed beasts, respawn sanctuary, broken tiles
  { from: 1, migrate: (o) => ({ ...o, team: [], sanctuary: null, brokenTiles: [] }) },
  // v2 → v3 (tappa 3): equipment and economy start empty (the game fills in defaults)
  { from: 2, migrate: (o) => ({ ...o, gear: null }) },
  // v3 → v4 (tappa 4): tamed beasts gain experience and a nourishment bar
  {
    from: 3,
    migrate: (o) => ({
      ...o,
      team: Array.isArray(o.team) ? o.team.map((b) => (isObject(b) ? { ...b, xp: 0, food: 0 } : b)) : o.team,
    }),
  },
  // v4 → v5 (tappa 5): the story; older saves pick it up from where the player is
  { from: 4, migrate: (o) => ({ ...o, story: null }) },
  // v5 → v6 (tappa 6): the Delta widened the world by 520 units (65 tiles) at x 1940; the map had 720 columns.
  // Broken tiles are stored as row × columns + column: re-number them, and move a diver saved in the east.
  {
    from: 5,
    migrate: (o) => {
      const [oldCols, at, add] = [720, 1940, 520];
      const newCols = oldCols + add / 8;
      const tiles = Array.isArray(o.brokenTiles) ? o.brokenTiles : [];
      const brokenTiles = tiles.map((i) => {
        if (typeof i !== 'number') return i;
        const tx = i % oldCols;
        const ty = Math.floor(i / oldCols);
        return ty * newCols + tx + (tx * 8 >= at ? add / 8 : 0);
      });
      const d = o.diver;
      const diver = isObject(d) && isFiniteNumber(d.x) && d.x >= at ? { ...d, x: d.x + add } : d;
      return { ...o, brokenTiles, diver };
    },
  },
  // v6 → v7 (tappa 10): the coast. The world grew from 785 to 1207 columns: the land and the pier moved 150 east,
  // a beach came before the bay, the bay was stretched ×1.6 from x 1700, the Isola delle Mangrovie came before the
  // Delta (also ×1.6, from x 5000) and the open sea moved 3372 east. The bone wall and the bones closing the lair
  // got new tiles: if they were broken, they stay broken.
  {
    from: 6,
    migrate: (o) => {
      const moveX = (x: number): number =>
        x < 300 ? x + 150 : x < 1940 ? 1700 + (x - 110) * 1.6 : x < 2460 ? 5000 + (x - 1940) * 1.6 : x + 3372;
      const [oldCols, newCols] = [785, 1207];
      const old = new Set(Array.isArray(o.brokenTiles) ? o.brokenTiles : []);
      const wasBroken = (tx0: number, tx1: number, rows: number[]): boolean =>
        rows.some((ty) => {
          for (let tx = tx0; tx <= tx1; tx++) if (old.has(ty * oldCols + tx)) return true;
          return false;
        });
      const brokenTiles: number[] = [];
      const breakAll = (tx0: number, tx1: number, rows: number[]): void => {
        for (const ty of rows) for (let tx = tx0; tx <= tx1; tx++) brokenTiles.push(ty * newCols + tx);
      };
      if (wasBroken(25, 60, [125, 126, 127, 128])) breakAll(230, 288, [125, 126, 127, 128]); // the bone wall
      if (wasBroken(94, 101, [45, 46])) breakAll(343, 350, [45, 46]); // the bones over the lair
      const d = o.diver;
      const diver = isObject(d) && isFiniteNumber(d.x) ? { ...d, x: Math.round(moveX(d.x)) } : d;
      return { ...o, brokenTiles, diver, homePort: 'portofosco' };
    },
  },
  // v7 → v8 (2 ottobre): taming uses a shell from the backpack; old games receive the starting 5 once
  // (literal, as saved then: data may change later)
  {
    from: 7,
    migrate: (o) => {
      const gear = isObject(o.gear) ? o.gear : null;
      if (!gear) return o;
      const inv = isObject(gear.inventory) ? gear.inventory : {};
      const had = isFiniteNumber(inv.conchiglia) ? inv.conchiglia : 0;
      return { ...o, gear: { ...gear, inventory: { ...inv, conchiglia: had + 5 } } };
    },
  },
  // v8 → v9 (tappa 12): the boat. Not in older saves: the game gives it again if chapter 1 is over.
  { from: 8, migrate: (o) => ({ ...o, boat: null }) },
  // v9 → v10 (tappa 13): the legends; none defeated yet
  { from: 9, migrate: (o) => ({ ...o, legendsGone: [] }) },
  // v10 → v11 (tappa 16): the boat becomes Aurelio's bathyscaphe, where the boat was
  {
    from: 10,
    migrate: (o) => {
      const boat = isObject(o.boat) && isFiniteNumber(o.boat.x) ? o.boat.x : null;
      const rest: Record<string, unknown> = { ...o };
      delete rest.boat;
      const first = SUB_MODELS[0]!;
      const sub =
        boat === null
          ? null
          : { x: boat, y: SUBMARINE.restY, model: first.id, models: [first.id], hull: first.hull };
      return { ...rest, sub };
    },
  },
  // v11 → v12 (3 ottobre 2026): beast health is ×10 (data/species.ts ROLE_BASE)
  {
    from: 11,
    migrate: (o) => ({
      ...o,
      team: Array.isArray(o.team)
        ? o.team.map((b) => (isObject(b) && isFiniteNumber(b.hp) ? { ...b, hp: b.hp * 10 } : b))
        : o.team,
    }),
  },
  // v12 → v13 (3 ottobre 2026): statistics follow the Pokémon formula (data/stats.ts): the old health means nothing
  // any more, so every beast comes back healed (restoreTeam caps it at its new maximum)
  {
    from: 12,
    migrate: (o) => ({
      ...o,
      team: Array.isArray(o.team)
        ? o.team.map((b) => (isObject(b) ? { ...b, hp: Number.MAX_SAFE_INTEGER, ko: false } : b))
        : o.team,
    }),
  },
  // v13 → v14 (4 ottobre 2026): the expedition ship. Not in older saves: the game gives it if chapter 4 is over.
  { from: 13, migrate: (o) => ({ ...o, ship: null }) },
  // v14 → v15 (4 ottobre 2026): fuel, full tanks to start with (checkedSub / checkedShip fill a missing one);
  // the sanctuaries are gone
  {
    from: 14,
    migrate: (o) => {
      const rest: Record<string, unknown> = { ...o };
      delete rest.sanctuary;
      return rest;
    },
  },
  // v15 → v16 (4 ottobre 2026): the hunting diary, empty
  { from: 15, migrate: (o) => ({ ...o, hunts: {} }) },
  // v16 → v17 (8 ottobre 2026): the story is paused. Its beasts leave the team (owner), the chapters are gone:
  // with the ship the sea is open, without it Aurelio waits at Porto Fango with ship and submarine.
  { from: 16, migrate: migrateTo17 },
  // v17 → v18 (8 ottobre 2026): the fleet. Your ship is the Aurelia; the parts bought for it and the submarines
  // bought on their own are gone, their teeth given back; the submarine is the Aurelia's bathyscaphe again.
  { from: 17, migrate: migrateTo18 },
  // v18 → v19 (8 ottobre 2026, block 4b): a hatch per bay (`hatches`), and the speedboat (none yet in v18 ships)
  {
    from: 18,
    migrate: (o) => {
      const ship = isObject(o.ship) ? { ...o.ship, hatches: [o.ship.hatchOpen === true] } : o.ship;
      if (isObject(ship)) delete ship.hatchOpen;
      return { ...o, ship, boat: null };
    },
  },
  // v19 → v20 (8 ottobre 2026): you may own several ships (the shipyard keeps the others moored)
  { from: 19, migrate: (o) => ({ ...o, fleet: [] }) },
];

function migrateTo18(o: Record<string, unknown>): Record<string, unknown> {
  // prices of the time (data/ship.ts and data/submarine.ts at v0.48.0)
  const partPrice: Record<string, number> = { serbatoio: 900, sonar_profondo: 1500, motori: 2500 };
  const subPrice: Record<string, number> = { squalo_ferro: 1800, leviatano_ottone: 6000 };
  let refund = 0;
  let ship = o.ship;
  if (isObject(ship)) {
    const parts = Array.isArray(ship.upgrades) ? ship.upgrades : [];
    for (const p of parts) refund += partPrice[String(p)] ?? 0;
    const rest: Record<string, unknown> = { ...ship, model: 'aurelia' };
    delete rest.upgrades;
    ship = rest;
  }
  let sub = o.sub;
  if (isObject(sub)) {
    const models = Array.isArray(sub.models) ? sub.models : [];
    for (const m of models) refund += subPrice[String(m)] ?? 0;
    sub = { ...sub, model: 'batiscafo', models: ['batiscafo'] };
  }
  const gear = isObject(o.gear) ? { ...o.gear } : o.gear;
  if (isObject(gear) && refund) gear.teeth = (isFiniteNumber(gear.teeth) ? gear.teeth : 0) + refund;
  return { ...o, ship, sub, gear };
}

function migrateTo17(o: Record<string, unknown>): Record<string, unknown> {
  const storySpecies = ['re_corallo', 'piovra'];
  const storyUniques = ['sfregiato'];
  const isStoryBeast = (b: unknown): boolean => {
    const f = isObject(b) && isObject(b.form) ? b.form : null;
    return !!f && (storySpecies.includes(String(f.speciesId)) || storyUniques.includes(String(f.unique)));
  };
  let team = o.team;
  if (Array.isArray(team)) {
    // a beast of the team that leaves: the first ones of the reserve take its place
    let free = team.filter((b) => isStoryBeast(b) && isObject(b) && b.inTeam).length;
    team = team
      .filter((b) => !isStoryBeast(b))
      .map((b) => {
        if (free > 0 && isObject(b) && !b.inTeam) {
          free--;
          return { ...b, inTeam: true };
        }
        return b;
      });
  }
  let story: unknown = null;
  if (isObject(o.story)) {
    const old = o.story;
    const seen = Array.isArray(old.seen) && old.seen.includes('starter') ? ['starter'] : [];
    if (old.step === 'intro' || old.step === 'tutorial') {
      // the old guided dive had four tasks: swim, fish, dash, surface (a fifth, tame, comes before surface)
      const t = typeof old.tutorial === 'number' ? old.tutorial : 0;
      story = { step: old.step, tutorial: t >= 3 ? t + 1 : t, count: 0, seen };
    } else story = { step: o.ship ? 'free' : 'toPortoFango', tutorial: 0, count: 0, seen };
  }
  const gear = isObject(o.gear) ? { ...o.gear } : o.gear;
  if (isObject(gear)) delete gear.guardians;
  return { ...o, team, story, gear };
}

// Lot AD-2 (21 ottobre 2026): what sets one mount apart from another. Four bars from its data, the depth it takes you
// to, its talent by its type, and the fear a superpredator puts in smaller game (docs/PROPOSTA-RUOLI.md).
import { describe, expect, it } from 'vitest';
import { RIDE_TALENTS } from '../src/data/beasts';
import { SPECIES } from '../src/data/species';
import { TILE } from '../src/data/worldLayout';
import { canBreakBones, useBreakBones } from '../src/systems/abilities';
import { createBattle } from '../src/systems/battle/battle';
import { makeFighter } from '../src/systems/battle/fighter';
import { foeTriesFlee } from '../src/systems/battle/tameFlee';
import type { BeastForm } from '../src/systems/beasts/forms';
import {
  fearOf,
  isApex,
  mountBars,
  mountDepthM,
  openingFor,
  ridesForm,
  talentOf,
} from '../src/systems/beasts/mountTraits';
import { headOf } from '../src/systems/beasts/combat';
import { callMount } from '../src/systems/beasts/mount';
import { makeTeamBeast } from '../src/systems/beasts/team';
import type { GameEvent } from '../src/systems/events';
import { createGame } from '../src/systems/game';
import { makeRng } from '../src/systems/math';
import { generateWorld } from '../src/systems/world/worldGen';

const map = generateWorld();
const F = (speciesId: string, extra: Partial<BeastForm> = {}): BeastForm => ({
  speciesId,
  variant: 'comune',
  ...extra,
});

describe('four bars on the sheet (owner: "velocità, endurance, quante sardine mangia")', () => {
  it('the white shark is faster and tires sooner than the whale shark, which has the biggest mouth', () => {
    const mako = mountBars(F('squalo_bianco'), 30);
    const whale = mountBars(F('squalo_balena'), 30);
    expect(mako.speed).toBeGreaterThan(whale.speed);
    expect(mako.stamina).toBeLessThan(whale.stamina);
    expect(whale.bite).toBeGreaterThan(mako.bite);
    expect(whale.bite).toBe(5);
  });

  it('the sperm whale takes you deepest, and every bar of every mount is 1 … 5', () => {
    const deepest = SPECIES.filter((s) => ridesForm(F(s.id)) && s.type !== 'variabile').sort(
      (a, b) => mountDepthM(F(b.id), 40) - mountDepthM(F(a.id), 40),
    )[0]!;
    expect(['capodoglio', 'plesiosauro', 'livyatan']).toContain(deepest.id);
    for (const s of SPECIES.filter((x) => ridesForm(F(x.id))))
      for (const v of Object.values(mountBars(F(s.id), 40))) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(5);
      }
  });
});

describe('talents by type', () => {
  it('a Predatore dashing into a wild beast takes it by surprise (Assalto); not without the dash, not another type', () => {
    expect(openingFor({ form: F('squalo_bianco') }, true, 'foe')).toBe('you');
    expect(openingFor({ form: F('squalo_bianco') }, false, 'foe')).toBe('foe');
    expect(openingFor({ form: F('megattera') }, true, 'normal')).toBe('normal');
    expect(openingFor(null, true, 'normal')).toBe('normal');
  });

  it('a Corazzato you ride breaks the ancient bones even below the level of Sfondamento (Ariete)', () => {
    const g = createGame(map, null, 4);
    const b = makeTeamBeast('a1', F('archelon'), 5, true);
    g.beasts.team = [b];
    g.beasts.mount = callMount(b, g.diver, g.map, true);
    const m = g.beasts.mount!;
    m.state = 'ride';
    g.beasts.riding = true;
    const h = headOf(m);
    const T = g.map.tileSize;
    g.map.set(Math.floor(h.x / T), Math.floor(h.y / T), TILE.bone);
    expect(talentOf(b.form)).toBe('corazzato');
    expect(canBreakBones(g)).toBe(true);
    const ev: GameEvent[] = [];
    useBreakBones(g, ev);
    expect(ev.some((e) => e.type === 'bonesBroken')).toBe(true);
  });

  it('a Glaciale you ride breaks the ice (Rompighiaccio)', () => {
    const g = createGame(map, null, 4);
    const b = makeTeamBeast('o1', F('orca'), 30, true);
    g.beasts.team = [b];
    g.beasts.mount = callMount(b, g.diver, g.map, true);
    const m = g.beasts.mount!;
    m.state = 'ride';
    g.beasts.riding = true;
    const h = headOf(m);
    const T = g.map.tileSize;
    g.map.set(Math.floor(h.x / T), Math.floor(h.y / T), TILE.ice);
    expect(canBreakBones(g)).toBe(true);
    const ev: GameEvent[] = [];
    useBreakBones(g, ev);
    expect(ev).toContainEqual(expect.objectContaining({ type: 'bonesBroken', ice: true }));
    expect(g.map.get(Math.floor(h.x / T), Math.floor(h.y / T))).toBe(TILE.water);
  });
});

describe('the superpredators\' fear (owner: "almeno una trentina di livelli in più… una decina per la paralisi")', () => {
  it('who is a superpredator', () => {
    expect(isApex(F('squalo_bianco'))).toBe(true);
    expect(isApex(F('orca'))).toBe(true);
    expect(isApex(F('megattera'))).toBe(false);
    expect(isApex(F('barracuda'))).toBe(false);
  });

  it('30 levels above: it keeps away and tries to flee 1 or 2 times; 29: nothing; a boss never', () => {
    const shark = { form: F('squalo_bianco'), level: 60 };
    const scared = fearOf(shark, { level: 30 }, 0.99);
    expect(scared.keepAway).toBe(true);
    expect(scared.fleeTries).toBe(2);
    expect(fearOf(shark, { level: 30 }, 0).fleeTries).toBe(1);
    expect(fearOf(shark, { level: 31 }, 0.5)).toEqual({ keepAway: false, fleeTries: 0, frozen: false });
    expect(fearOf(shark, { level: 1, boss: 'Il Guardiano' }, 0.5).fleeTries).toBe(0);
    expect(fearOf({ form: F('megattera'), level: 90 }, { level: 1 }).keepAway).toBe(false);
  });

  it('frozen with fear for a turn only by a legendary predator 10 levels above', () => {
    const megalodon = { form: F('megalodonte'), level: 50 };
    expect(fearOf(megalodon, { level: 40 }).frozen).toBe(true);
    expect(fearOf(megalodon, { level: 41 }).frozen).toBe(false);
    expect(fearOf({ form: F('squalo_bianco'), level: 90 }, { level: 1 }).frozen).toBe(false); // not a legend
  });

  it('in battle it tries to flee instead of attacking, and getting away ends the battle with nothing', () => {
    const s = createBattle([makeFighter(F('squalo_bianco'), 60)], makeFighter(F('barracuda'), 20));
    s.foeFleeTries = 2;
    const always = makeRng(1);
    let got = false;
    for (let i = 0; i < 2 && !got; i++) got = !!foeTriesFlee(s, () => (i === 0 ? 0.99 : 0.01));
    expect(got).toBe(true);
    expect(s.over).toBe('escaped');
    expect(foeTriesFlee(s, always)).toBeNull(); // no try left
    expect(RIDE_TALENTS.fleeChance).toBeGreaterThan(0);
  });
});

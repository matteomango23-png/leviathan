// The owner's second round of feedback (2 ottobre 2026): bigger bites harder, final forms are the strongest
// stage, Sfondamento from level 16 for Predatori and Corazzati, a hint near ancient bones, wild level floors
// by size and rarity, battle picture sizes, resting at the port.
import { beforeAll, describe, expect, it } from 'vitest';
import { ABILITIES, TEAM_RULES } from '../src/data/beasts';
import { BATTLE_STAGE } from '../src/data/battle';
import { statsAt, SPECIES } from '../src/data/species';
import { TILE } from '../src/data/worldLayout';
import { canBreakBones } from '../src/systems/abilities';
import { battleSize } from '../src/systems/battle/stage';
import { breaksBones, rollWildLevel, wildLevelFloor, type BeastForm } from '../src/systems/beasts/forms';
import type { GameEvent } from '../src/systems/events';
import { createGame, enterPort, restAtPort, stepGame } from '../src/systems/game';
import { emptyInput } from '../src/systems/input';
import { makeRng } from '../src/systems/math';
import { giveTestBeast } from '../src/systems/testTools';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

const sp = (id: string) => SPECIES.find((s) => s.id === id)!;
const form = (speciesId: string, variant: BeastForm['variant'] = 'comune'): BeastForm => ({
  speciesId,
  variant,
});

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

describe('stats', () => {
  it('a bigger beast bites harder at the same level (white shark over barracuda)', () => {
    expect(statsAt(sp('squalo_bianco'), 20).atk).toBeGreaterThan(statsAt(sp('barracuda'), 20).atk);
  });

  it('each stage of a starter line bites harder than the one before, at the same level', () => {
    const hits = (id: string): number => Math.max(statsAt(sp(id), 40).atk, statsAt(sp(id), 40).spa);
    for (const line of [
      ['zanna', 'squarcio', 'zannarossa'],
      ['guscio', 'rocciaguscio', 'archelon'],
      ['scintilla', 'saetta', 'folgore'],
    ])
      for (let i = 1; i < line.length; i++)
        expect(hits(line[i]!), line[i]).toBeGreaterThan(hits(line[i - 1]!));
  });

  it('the sea crocodile of the Delta is common enough for its numbers', () => {
    expect(sp('coccodrillo_marino').rarity).toBe(2);
  });
});

describe('Sfondamento', () => {
  it('Predatori and Corazzati learn it at level 16; the white shark is born with it', () => {
    const L = ABILITIES.sfondamento.level;
    expect(breaksBones(form('zanna'), L - 1)).toBe(false);
    expect(breaksBones(form('squarcio'), L)).toBe(true);
    expect(breaksBones(form('rocciaguscio'), L)).toBe(true);
    expect(breaksBones(form('saetta'), 30)).toBe(false); // Tempesta
    expect(breaksBones(form('squalo_bianco'), 1)).toBe(true);
  });

  function atBones(speciesId: string, level: number) {
    const g = createGame(map, null, 3);
    giveTestBeast(g, form(speciesId), level);
    let bone = -1;
    for (let i = 0; i < map.data.length && bone < 0; i++) if (map.data[i] === TILE.bone) bone = i;
    const bx = (bone % map.cols) * 8 + 4;
    const by = Math.floor(bone / map.cols) * 8 + 4;
    return { g, bx, by };
  }

  it('a beast with Sfondamento swimming with you breaks the bones next to you', () => {
    const { g, bx, by } = atBones('zanna', 16); // a Predatore of level 16: it follows you, it does not carry you
    const hold = (): void => void Object.assign(g.diver, { x: bx - 16, y: by, vx: 0, vy: 0, face: 1 });
    hold();
    stepGame(g, { ...emptyInput(), summon: 0 }, 1 / 30);
    for (let t = 0; t < TEAM_RULES.arriveSeconds + 0.5; t += 1 / 30) {
      hold();
      stepGame(g, emptyInput(), 1 / 30);
    }
    expect(g.beasts.mount?.state).toBe('follow');
    expect(canBreakBones(g)).toBe(true);
    const ev = stepGame(g, { ...emptyInput(), action: true }, 1 / 30);
    expect(ev.some((e) => e.type === 'bonesBroken')).toBe(true);
  });

  it('near bones with nobody able to break them, a hint says what is needed (not every frame)', () => {
    const { g, bx, by } = atBones('zanna', 5);
    const events: GameEvent[] = [];
    for (let t = 0; t < 3; t += 1 / 30) {
      Object.assign(g.diver, { x: bx - 20, y: by, vx: 0, vy: 0 });
      events.push(...stepGame(g, emptyInput(), 1 / 30));
    }
    const hints = events.filter((e) => e.type === 'bonesHint');
    expect(hints).toHaveLength(1);
    expect(hints[0]).toEqual({ type: 'bonesHint', breakerUid: null });
  });
});

describe('wild levels', () => {
  it('bigger and rarer beasts are never weak: white shark 15+, its alfa 20+, hammerhead and tiger 11+', () => {
    expect(wildLevelFloor(form('squalo_bianco'))).toBe(15);
    expect(wildLevelFloor(form('squalo_bianco', 'alfa'))).toBe(20);
    expect(wildLevelFloor(form('squalo_martello'))).toBe(11);
    expect(wildLevelFloor(form('squalo_tigre'))).toBe(11);
    expect(wildLevelFloor(form('barracuda'))).toBe(1);
  });

  it('a rolled level is never under the floor, and now and then one is far stronger', () => {
    const rng = makeRng(7);
    const levels = Array.from({ length: 2000 }, () => rollWildLevel(form('squalo_bianco'), rng));
    expect(Math.min(...levels)).toBeGreaterThanOrEqual(15);
    const outliers = levels.filter((l) => l > 15 + 2).length / levels.length;
    expect(outliers).toBeGreaterThan(0.02);
    expect(outliers).toBeLessThan(0.1);
  });
});

describe('battle picture sizes', () => {
  it('a coiled moray is drawn smaller and a flat manta bigger than their length alone says', () => {
    const plain = battleSize('foe', { lengthM: 3, giant: false }, 3);
    const moray = battleSize(
      'foe',
      { lengthM: 3, giant: false, pictureMult: BATTLE_STAGE.pictureMult.murena },
      3,
    );
    expect(moray).toBeLessThan(plain);
    expect(BATTLE_STAGE.pictureMult.manta).toBeGreaterThan(1);
  });
});

describe('the port', () => {
  it('resting heals you and the team without restocking the shop', () => {
    const g = createGame(map, null, 3);
    giveTestBeast(g, form('zanna'), 5);
    enterPort(g);
    g.gear.shopBought = { esca: 2 };
    g.diver.hp = 1;
    g.beasts.team[0]!.hp = 0;
    g.beasts.team[0]!.ko = true;
    restAtPort(g);
    expect(g.diver.hp).toBe(g.diver.maxHp);
    expect(g.beasts.team[0]!.ko).toBe(false);
    expect(g.gear.shopBought).toEqual({ esca: 2 });
  });
});

// Lot U1 (owner, 12 novembre 2026: "non è spiegato nulla"): the first bay's small beasts at levels a level-5 starter
// can beat, the arrow to the guided dive's goal, the ship already moored, Aurelio's new tips, the step-by-step
// tutorial's buttons.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { COAST_LEVELS, WILD_SPAWNS } from '../src/data/beasts';
import { COACH } from '../src/data/coach';
import { PORT, PORTO_FANGO } from '../src/data/economy';
import { TIPS, TUTORIAL } from '../src/data/story';
import { rollWildLevel } from '../src/systems/beasts/forms';
import { makeRng } from '../src/systems/math';
import { portStart } from '../src/systems/economy/places';
import { createGame, stepGame, type GameState } from '../src/systems/game';
import { emptyInput } from '../src/systems/input';
import { shipArrow, storyGoal } from '../src/systems/shipPointer';
import { createStory, shipWaitsAtDock } from '../src/systems/story';
import { stepTips } from '../src/systems/tips';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

const guided = (task: (typeof TUTORIAL)[number]['id']): GameState => {
  const g = createGame(map, null, 7);
  g.story.step = 'tutorial';
  g.story.tutorial = TUTORIAL.findIndex((t) => t.id === task);
  return g;
};

describe('la baia di Portofosco', () => {
  it('le bestie piccole escono tra il 3 e il 7, gli squali in visita restano forti', () => {
    const small = WILD_SPAWNS.filter((s) => s.levels);
    expect(small.length).toBeGreaterThan(10);
    const rng = makeRng(3);
    for (const s of small)
      for (let i = 0; i < 20; i++) {
        const lv = rollWildLevel({ speciesId: s.speciesId, variant: 'comune' }, rng, s.band, s.levels);
        expect(lv).toBeGreaterThanOrEqual(COAST_LEVELS.firstBay[0]);
        expect(lv).toBeLessThanOrEqual(COAST_LEVELS.firstBay[1]);
      }
    for (const id of ['squalo_martello', 'squalo_tigre', 'squalo_toro'])
      expect(
        WILD_SPAWNS.filter((s) => s.speciesId === id).every((s) => !s.levels),
        id,
      ).toBe(true);
  });
});

describe('la freccia gialla', () => {
  it('segue i compiti della prima immersione, poi indica la nave', () => {
    const fish = guided('fish');
    const sardine = storyGoal(fish)!;
    expect(fish.fish.fish.some((f) => f.kind === 'sardina' && f.x === sardine.x && f.y === sardine.y)).toBe(
      true,
    );
    expect(storyGoal(guided('surface'))).toEqual(portStart(PORT));
    const tame = guided('tame');
    const beast = storyGoal(tame);
    if (beast) expect(tame.beasts.wilds.some((w) => w.x === beast.x && w.level <= 7 + 2)).toBe(true);
    const away = createGame(map, null, 7);
    away.story.step = 'toPortoFango';
    expect(storyGoal(away)).toEqual(portStart(PORTO_FANGO));
    // once the ship is yours the arrow goes back to it
    away.ship.owned = true;
    away.beasts.view = { x: away.diver.x - 9000, y: away.diver.y, width: 400, height: 200 };
    expect(shipArrow(away)).not.toBeNull();
  });
});

describe('la nave di Aurelio', () => {
  it('si vede già al molo finché non è tua', () => {
    const g = createGame(map, null, 7);
    g.story.step = 'toPortoFango';
    expect(shipWaitsAtDock(g)).toBe(true);
    g.ship.owned = true;
    expect(shipWaitsAtDock(g)).toBe(false);
  });
});

describe('i consigli nuovi di Aurelio', () => {
  it('compagni, pescato e bestie grandi si spiegano già nella prima immersione', () => {
    for (const id of ['tipPack', 'tipSell', 'tipBigBeasts'])
      expect(TIPS.find((t) => t.id === id)?.early, id).toBe(true);
    const s = createStory(null, true, false);
    s.step = 'tutorial';
    stepTips(s, [{ type: 'fishCaught', fishId: 'sardina' } as never]);
    expect(s.dialogue).toBe('tipSell');
    const t = createStory(null, true, false);
    t.step = 'tutorial';
    stepTips(t, [{ type: 'portArrived' }]);
    expect(t.dialogue).toBeNull(); // the others wait for the open sea
  });
});

describe('il tutorial passo passo', () => {
  it('ogni passo indica un pulsante che esiste nell’interfaccia', () => {
    const dir = join(__dirname, '../src/ui');
    const src = readdirSync(dir)
      .filter((f) => f.endsWith('.ts'))
      .map((f) => readFileSync(join(dir, f), 'utf8'))
      .join('\n');
    const tabs = (file: string): string[] =>
      [...readFileSync(join(dir, file), 'utf8').matchAll(/\['([a-z]+)', '[A-Z][^']*', '[a-z]+'\]/g)].map(
        (m) => m[1]!,
      );
    const names = new Set([
      ...[...src.matchAll(/(?:coach = |\[[a-zA-Z.]+, )'([a-z-]+)'/g)].map((m) => m[1]!),
      ...tabs('portMenu.ts').map((t) => `port-${t}`),
      ...tabs('cockpit.ts').map((t) => `cockpit-${t}`),
    ]);
    for (const steps of Object.values(COACH))
      for (const st of steps) expect(names.has(st.target), st.target).toBe(true);
  });
});

describe('lo sciame di sardine', () => {
  it('non sale a bordo con te', () => {
    const g = createGame(map, null, 7);
    g.beasts.decoy = { id: 'sciame_sardine', t: 8 };
    g.ship.owned = true;
    g.ship.aboard = true;
    stepGame(g, emptyInput(), 1 / 60);
    expect(g.beasts.decoy).toBeNull();
  });
});

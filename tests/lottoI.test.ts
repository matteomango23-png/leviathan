// Lotto I (owner, 16 ottobre 2026): in the bestiary each version with pictures of its own is a beast of its own,
// beside its species; the rare versions are the alphas with their own pictures; a sheet shows its line of
// evolutions; in the water only the team, at the helm also the ship's hold, at a harbour also the pen.
import { beforeAll, describe, expect, it } from 'vitest';
import { ART_KEYS } from '../src/data/sprites.generated';
import {
  bestiaryEntries,
  entryState,
  evolutionLine,
  rareAlphas,
} from '../src/systems/beasts/bestiaryEntries';
import { formKey, formName, type BeastForm } from '../src/systems/beasts/forms';
import { addTamed, makeTeamBeast, type TeamBeast } from '../src/systems/beasts/team';
import { holdRoom, moveBeast, placeOf, reachable } from '../src/systems/beasts/hold';
import { createGame, toSave, type GameState } from '../src/systems/game';
import { parseSave } from '../src/systems/save/saveData';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

const keys = (forms: BeastForm[]): string[] => forms.map(formKey);

describe('il bestiario', () => {
  const entries = bestiaryEntries();
  const at = (key: string): number => entries.findIndex((e) => formKey(e.form) === key);

  it('l’albino e le evoluzioni dello squalo bianco sono bestie a sé, subito accanto', () => {
    const i = at('squalo_bianco');
    expect(keys(entries.slice(i, i + 5).map((e) => e.form))).toEqual([
      'squalo_bianco',
      'squalo_bianco_finale',
      'squalo_bianco_albino',
      'squalo_bianco_albino_finale',
      'squalo_bianco_alfa_finale',
    ]);
    expect(entries[i + 2]!.kind).toBe('albino');
    expect(entries[i + 1]!.num).toBe(entries[i]!.num);
  });

  it('nessuna voce in più senza immagini proprie', () => {
    for (const e of entries.filter((x) => x.kind !== 'specie'))
      expect(ART_KEYS, formKey(e.form)).toContain(formKey(e.form));
    expect(at('barracuda_albino')).toBe(-1);
    expect(at('coccodrillo_marino_finale')).toBe(-1);
  });

  it('con solo lo squalo albino, lo squalo comune resta "visto" e l’albino è "domato"', () => {
    const g = {
      seen: new Set(['squalo_bianco', 'squalo_bianco_albino']),
      beasts: { team: [] as TeamBeast[] },
    };
    g.beasts.team.push(makeTeamBeast('b1', { speciesId: 'squalo_bianco', variant: 'albino' }, 10, true));
    const shark = entries[at('squalo_bianco')]!;
    const albino = entries[at('squalo_bianco_albino')]!;
    expect(entryState(shark, g)).toBe('seen');
    expect(entryState(albino, g)).toBe('tamed');
  });

  it('le versioni rare: solo gli alfa con immagini proprie', () => {
    const alfa = keys(rareAlphas());
    expect(alfa).toContain('squalo_bianco_alfa');
    expect(alfa).toContain('orca_alfa'); // the matriarch's pictures (alfaArt)
    expect(alfa).not.toContain('barracuda_alfa');
  });

  it('la catena delle evoluzioni', () => {
    expect(keys(evolutionLine({ speciesId: 'squarcio', variant: 'comune' }))).toEqual([
      'zanna',
      'squarcio',
      'zannarossa',
    ]);
    expect(keys(evolutionLine({ speciesId: 'squalo_bianco', variant: 'comune' }))).toEqual([
      'squalo_bianco',
      'squalo_bianco_finale',
    ]);
    expect(evolutionLine({ speciesId: 'squalo_bianco', variant: 'alfa' }).map(formName)).toEqual([
      'Squalo bianco alfa',
      'Squalo bianco Re Alfa',
    ]);
    expect(keys(evolutionLine({ speciesId: 'varano_nilo', variant: 'albino' }))).toEqual([
      'varano_nilo_albino',
      'varano_nilo_albino_finale',
    ]);
    expect(evolutionLine({ speciesId: 'barracuda', variant: 'comune' })).toHaveLength(1);
  });
});

describe('squadra, stiva, recinto', () => {
  const shark = (uid: string): TeamBeast =>
    makeTeamBeast(uid, { speciesId: 'squalo_bianco', variant: 'comune' }, 10, true);

  it('domata: in squadra, poi in stiva, poi al Recinto', () => {
    const g = { ship: { owned: true, model: 'eh1' }, beasts: { team: [] as TeamBeast[] } }; // 2 places
    for (let i = 1; i <= 8; i++) addTamed(g.beasts.team, shark(`b${i}`), holdRoom(g));
    expect(g.beasts.team.map(placeOf)).toEqual([
      'team',
      'team',
      'team',
      'team',
      'team',
      'hold',
      'hold',
      'pen',
    ]);
  });

  it('in plancia non si arriva al Recinto; al porto la stiva solo con la nave ormeggiata', () => {
    expect(reachable('ship', false)).toEqual(['team', 'hold']);
    expect(reachable('port', false)).toEqual(['team', 'pen']);
    expect(reachable('port', true)).toEqual(['team', 'hold', 'pen']);
    const g = {
      ship: { owned: true, model: 'eh1' },
      beasts: { team: [] as TeamBeast[], mount: null as { uid: string } | null },
    };
    for (let i = 1; i <= 7; i++) addTamed(g.beasts.team, shark(`b${i}`), holdRoom(g));
    // b8 waits at the pen: from the helm it cannot be reached
    addTamed(g.beasts.team, shark('b8'), holdRoom(g));
    expect(moveBeast(g, 'b8', 'hold', reachable('ship', false))).toBe(false);
    expect(moveBeast(g, 'b6', 'pen', reachable('ship', false))).toBe(false);
    // at the port with the ship: hold → pen, pen → hold
    expect(moveBeast(g, 'b6', 'pen', reachable('port', true))).toBe(true);
    expect(moveBeast(g, 'b8', 'hold', reachable('port', true))).toBe(true);
    // the beast in the water stays where it is
    g.beasts.mount = { uid: 'b1' };
    expect(moveBeast(g, 'b1', 'hold', reachable('ship', false))).toBe(false);
  });

  it('il salvataggio tiene chi è in stiva', () => {
    const g: GameState = createGame(map, null, 4);
    g.beasts.team.push(
      shark('b1'),
      { ...shark('b2'), inTeam: false, aboard: true },
      { ...shark('b3'), inTeam: false },
    );
    const back = createGame(map, parseSave(JSON.stringify(toSave(g, new Date()))), 4);
    expect(back.beasts.team.map(placeOf)).toEqual(['team', 'hold', 'pen']);
  });
});

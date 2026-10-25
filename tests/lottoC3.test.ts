// Lot C3 (25 ottobre 2026): the props still drawn with code are the owner's paintings now (vents, chests, weapon
// wrecks, corals, kelp, bone walls, the forest's galleon), and no card says "in arrivo" for what is in the game.
import { describe, expect, it } from 'vitest';
import { parseExtraName } from '../scripts/art/cutout';
import { SHIP_MODELS } from '../src/data/fleet';
import { WORLD_ART_KEYS } from '../src/data/sprites.generated';
import { PROP_ART, SCENERY_ART } from '../src/data/worldArt';
import { bayRows } from '../src/systems/ship/bayStats';

describe('lotto C3', () => {
  it('ci sono tutte le immagini dei pezzi dipinti', () => {
    const keys = [
      ...PROP_ART.corals,
      ...PROP_ART.kelp,
      PROP_ART.bones,
      PROP_ART.vent,
      PROP_ART.chest.plain,
      PROP_ART.chest.locked,
      PROP_ART.chest.buried,
      PROP_ART.weaponWreck.art,
      SCENERY_ART.wreck,
      ...SCENERY_ART.arenaCorals,
    ];
    for (const k of keys) expect(WORLD_ART_KEYS, k).toContain(k);
  });

  it('lo script delle immagini riconosce i nomi nuovi', () => {
    for (const n of ['sfiato_aria', 'relitto_arma', 'forziere', 'forziere_incrostato', 'corallo_3', 'alga_2'])
      expect(parseExtraName(`${n}.jpg`)).toEqual({ kind: 'world', id: n });
    expect(parseExtraName('trama_ossa.jpg')).toEqual({ kind: 'texture', id: 'trama_ossa' });
  });

  it('nessuna card di un mezzo dice "in arrivo" per qualcosa che c’è già', () => {
    for (const m of SHIP_MODELS)
      for (const r of bayRows(m))
        expect(`${m.id}: ${r.label} ${r.text}`).not.toMatch(/in arrivo|prossime versioni/i);
  });
});

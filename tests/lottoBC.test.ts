// Lot BC (22 ottobre 2026, block 6): each battle move has its own look (owner: "animazioni diverse per le mosse, oggi
// tutte uguali"): a bite, a charge, a tail sweep, a shot from afar, rings of force, a glow on itself, waves at the other.
import { describe, expect, it } from 'vitest';
import { BATTLE_MOVES, BATTLE_MOVE_BY_ID } from '../src/data/battleMoves';
import { MOVE_ANIM } from '../src/data/moveAnims';
import { moveAnimOf } from '../src/systems/battle/moveAnim';

const anim = (id: string) => moveAnimOf(BATTLE_MOVE_BY_ID[id]!);

describe('le mosse animate', () => {
  it('ogni mossa ha la sua animazione, e le eccezioni sono mosse vere', () => {
    const kinds = new Set(['bite', 'ram', 'tail', 'ranged', 'burst', 'self', 'hex']);
    for (const m of BATTLE_MOVES) expect(kinds.has(moveAnimOf(m)), m.id).toBe(true);
    for (const id of Object.keys(MOVE_ANIM)) expect(BATTLE_MOVE_BY_ID[id], id).toBeDefined();
  });

  it('un morso morde, una carica carica, una coda spazza, un getto vola, un terremoto scuote', () => {
    expect(anim('azzannata')).toBe('bite');
    expect(anim('carica_preistorica')).toBe('ram');
    expect(anim('colpo_coda')).toBe('tail');
    expect(anim('getto_acqua')).toBe('ranged');
    expect(anim('scossa_fondale')).toBe('burst');
  });

  it('chi si rinforza o si cura si illumina; chi indebolisce manda onde', () => {
    expect(anim('corazza_ferro')).toBe('self');
    expect(anim('rigenerazione')).toBe('self');
    expect(anim('ringhio')).toBe('hex');
    expect(anim('nube_inchiostro')).toBe('hex');
  });

  it('ci sono tutti i tipi di animazione, non una sola', () => {
    expect(new Set(BATTLE_MOVES.map(moveAnimOf)).size).toBe(7);
  });
});

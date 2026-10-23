// Quick fixes of 23 ottobre 2026: the opening screen's tap no longer presses the title menu under it; the shipyard
// without the Yacht tab and with the Abyssal one; a ship's page with a tab for each picture (the ship, each vehicle),
// compared with the ship in use or its vehicle of the same kind.
import { describe, expect, it } from 'vitest';
import { SPLASH } from '../src/data/diver';
import { SHIP_CATEGORIES, SHIP_MODELS } from '../src/data/fleet';
import { pageTabs } from '../src/systems/ship/pageTabs';
import { isGuarded } from '../src/ui/splash';

const ship = (id: string) => SHIP_MODELS.find((m) => m.id === id)!;

describe('la schermata d’apertura non preme il menu', () => {
  it('ignora i tocchi subito dopo il suo, non dopo', () => {
    expect(isGuarded(null, 1000)).toBe(false);
    expect(isGuarded(1000, 1000 + SPLASH.guardMs / 2)).toBe(true);
    expect(isGuarded(1000, 1000 + SPLASH.guardMs + 1)).toBe(false);
  });
});

describe('le categorie del cantiere', () => {
  it('niente più yacht: il Poseidon è tra le navi da spedizione; c’è la categoria abissali', () => {
    expect(SHIP_MODELS.every((m) => (m.category as string) !== 'yacht')).toBe(true);
    expect(ship('poseidon').category).toBe('spedizione');
    expect(SHIP_CATEGORIES.map((c) => c.id)).toEqual(['spedizione', 'uboat', 'abissale']);
    expect(SHIP_CATEGORIES.find((c) => c.id === 'abissale')!.empty).toBeTruthy();
  });
});

describe('la scheda di una nave, una linguetta per foto', () => {
  it('prima la nave, poi un mezzo per stiva, ciascuno con le sue righe', () => {
    const m = ship('eh2');
    const tabs = pageTabs(m, null);
    expect(tabs.map((t) => t.title)).toEqual([m.name, ...m.bays.map((b) => b.name)]);
    expect(tabs[0]!.rows.some((r) => r.key === 'knots')).toBe(true);
    expect(tabs[1]!.rows.every((r) => r.key.startsWith('sub.'))).toBe(true);
    expect(tabs[2]!.rows.every((r) => r.key.startsWith('boat.'))).toBe(true);
    // no ship yet: nothing to compare
    expect(tabs.every((t) => t.compareName === null && !t.compare.length)).toBe(true);
  });

  it('il sottomarino si confronta col sottomarino della nave in uso, il motoscafo con la moto d’acqua', () => {
    const tabs = pageTabs(ship('eh2'), ship('imperium'));
    expect(tabs[0]!.compareName).toBe(ship('imperium').name);
    expect(tabs[1]!.compareName).toBe('Sottomarino imperiale');
    expect(tabs[1]!.compare.every((r) => r.group === 'Sottomarino imperiale')).toBe(true);
    expect(tabs[2]!.compareName).toBe('Moto d’acqua');
  });

  it('un mezzo che la nave in uso non ha non si confronta; la stessa nave nemmeno', () => {
    const vsAurelia = pageTabs(ship('poseidon'), ship('aurelia')); // Aurelia has no boat
    expect(vsAurelia[1]!.compareName).toBeNull();
    expect(pageTabs(ship('eh2'), ship('eh2')).every((t) => t.compareName === null)).toBe(true);
  });
});

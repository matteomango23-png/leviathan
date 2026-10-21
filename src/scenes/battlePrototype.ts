// The battle prototype (?battaglia in the address): the test team against a random wild beast of the bay or the
// delta, or the one asked for, to try sizes and pictures:
// ?battaglia&nemico=tartaruga_marina&variante=albino&finale&unico=sfregiato&mio=orca&miovariante=alfa&miofinale
import { BATTLE_PROTOTYPE } from '../data/battle';
import { createBattle, type BattleState } from '../systems/battle/battle';
import { makeFighter } from '../systems/battle/fighter';
import type { BeastForm } from '../systems/beasts/forms';
import type { Rng } from '../systems/math';

export function prototypeBattle(rng: Rng): { state: BattleState; items: Record<string, number> } {
  // the prototype (?battaglia): the test team against a random wild beast of the bay or the delta
  const P = BATTLE_PROTOTYPE;
  const mine = new URLSearchParams(window.location.search).get('mio'); // ?battaglia&mio=orca: your first beast
  const q0 = new URLSearchParams(window.location.search);
  const myForm = (): BeastForm => ({
    speciesId: mine!,
    variant: (['albino', 'alfa'] as const).find((v) => v === q0.get('miovariante')) ?? 'comune',
    ...(q0.has('miofinale') ? { final: true } : {}),
    ...(q0.get('miounico') ? { unique: q0.get('miounico')! } : {}),
  });
  const team = P.team.map((t, i) =>
    makeFighter(i === 0 && mine ? myForm() : { speciesId: t.speciesId, variant: 'comune' }, t.level),
  );
  const pick = P.foes[Math.floor(rng() * P.foes.length)]!;
  const [a, b] = pick.level;
  const roll = rng();
  const variant = roll < P.variantChance / 2 ? 'albino' : roll < P.variantChance ? 'alfa' : 'comune';
  const form: BeastForm = { speciesId: pick.speciesId, variant };
  // for trying sizes and pictures: ?battaglia&nemico=tartaruga_marina&variante=albino&finale&unico=sfregiato&mio=orca
  const q = new URLSearchParams(window.location.search);
  const asked = q.get('nemico');
  if (asked) {
    form.speciesId = asked;
    form.variant = (['albino', 'alfa'] as const).find((v) => v === q.get('variante')) ?? 'comune';
    if (q.has('finale')) form.final = true;
    if (q.get('unico')) form.unique = q.get('unico')!;
  }
  return {
    state: createBattle(team, makeFighter(form, a + Math.floor(rng() * (b - a + 1)))),
    items: { ...P.items },
  };
}

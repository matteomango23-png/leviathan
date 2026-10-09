// How big an echo sounds on the sonar (block 5a, owner 9 ottobre 2026): five sizes from a beast's length, the
// legends apart; each ship's sonar names only as many as it is good for, the others join the nearest smaller one it
// names (a weak sonar hears "small" and "big", as before). Pure logic, data/hunts.ts SONAR.
import { SONAR, type EchoClass } from '../data/hunts';
import type { BeastForm } from './beasts/forms';
import { formLengthM } from './beasts/forms';

const ORDER: EchoClass[] = ['piccola', 'media', 'grande', 'enorme', 'leggendaria'];

/** Its true size: a legend (a unique beast), or by its length. */
export function trueClass(form: BeastForm): EchoClass {
  if (form.unique) return 'leggendaria';
  const m = formLengthM(form);
  let c: EchoClass = 'piccola';
  for (const [k, from] of SONAR.classes) if (m >= from) c = k;
  return c;
}

/** As a sonar telling apart `classes` sizes names it. */
export function heardClass(c: EchoClass, classes: number): EchoClass {
  const named = SONAR.named[classes] ?? SONAR.named[2]!;
  let best = named[0]!;
  for (const n of named) if (ORDER.indexOf(n) <= ORDER.indexOf(c)) best = n;
  return best;
}

/** Bigger than "media": what the helm counts as a big echo. */
export const isBigClass = (c: EchoClass): boolean => ORDER.indexOf(c) >= ORDER.indexOf('grande');

/** In words, for one echo or many: "grande" / "grandi". */
export const CLASS_PLURAL: Record<EchoClass, string> = {
  piccola: 'piccole',
  media: 'medie',
  grande: 'grandi',
  enorme: 'enormi',
  leggendaria: 'leggendarie',
};

// The bestiary's entries (owner, 16 ottobre 2026: "gli albini sono proprio degli animali diversi", "vedere le
// evoluzioni come animali distinti, uno vicino all'altro"): every species, and right after it each version of it that
// has pictures of its own (the albino, the final forms) as a beast of its own. An alpha stays a rare version, and
// only with its own pictures. Each entry is seen or tamed by its own form. Pure logic.
import { GAME_SPECIES, SPECIES } from '../../data/species';
import { ART_KEYS } from '../../data/sprites.generated';
import { formKey, hasAlbinoArt, hasFinalForm, type BeastForm, type Variant } from './forms';
import type { TeamBeast } from './team';

export type EntryKind = 'specie' | 'albino' | 'evoluzione';

export interface BestiaryEntry {
  form: BeastForm;
  kind: EntryKind;
  /** The species' number in the bestiary (an albino or a final form shares it). */
  num: number;
}

const ownArt = (form: BeastForm): boolean => ART_KEYS.includes(formKey(form));

/** A final form of this version, if it has pictures of its own. */
function finalOf(speciesId: string, variant: Variant): BeastForm | null {
  const f: BeastForm = { speciesId, variant, final: true };
  return hasFinalForm(speciesId, variant) && ownArt(f) ? f : null;
}

export function bestiaryEntries(): BestiaryEntry[] {
  const out: BestiaryEntry[] = [];
  GAME_SPECIES.forEach((s, i) => {
    const num = i + 1;
    out.push({ form: { speciesId: s.id, variant: 'comune' }, kind: 'specie', num });
    const finale = finalOf(s.id, 'comune');
    if (finale) out.push({ form: finale, kind: 'evoluzione', num });
    if (hasAlbinoArt(s.id)) out.push({ form: { speciesId: s.id, variant: 'albino' }, kind: 'albino', num });
    for (const v of ['albino', 'alfa'] as const) {
      const f = finalOf(s.id, v);
      if (f) out.push({ form: f, kind: 'evoluzione', num });
    }
  });
  return out;
}

/** The alphas with pictures of their own (their own sprite, or the species' alfaArt like the matriarch orca). */
export function rareAlphas(): BeastForm[] {
  return GAME_SPECIES.filter((s) => ART_KEYS.includes(`${s.id}_alfa`) || !!s.alfaArt).map((s) => ({
    speciesId: s.id,
    variant: 'alfa' as const,
  }));
}

/** Whether a tamed beast counts for this entry: the species entry takes the common and alfa beasts of it. */
export function countsFor(entry: BestiaryEntry, b: TeamBeast): boolean {
  const f = entry.form;
  if (b.form.speciesId !== f.speciesId || b.form.unique) return false;
  if (f.final) return !!b.form.final && b.form.variant === f.variant;
  if (b.form.final) return false;
  return f.variant === 'albino' ? b.form.variant === 'albino' : b.form.variant !== 'albino';
}

export function entryState(
  entry: BestiaryEntry,
  g: { seen: Set<string>; beasts: { team: readonly TeamBeast[] } },
): 'tamed' | 'seen' | 'unknown' {
  if (g.beasts.team.some((b) => countsFor(entry, b))) return 'tamed';
  const key = entry.kind === 'specie' ? entry.form.speciesId : formKey(entry.form);
  return g.seen.has(key) ? 'seen' : 'unknown';
}

/**
 * A beast's line of forms, for the icons on its sheet: the stages before and after it (evolvesTo), then its final form;
 * an albino or an alpha: itself and its own final form. Only forms with pictures of their own.
 */
export function evolutionLine(form: BeastForm): BeastForm[] {
  if (form.unique) return [form];
  const v = form.variant;
  if (v !== 'comune') {
    const base: BeastForm = { speciesId: form.speciesId, variant: v };
    const f = finalOf(form.speciesId, v);
    return f ? [base, f] : [base];
  }
  // back to the first stage, then forward
  let first = form.speciesId;
  for (;;) {
    const prev = SPECIES.find((s) => s.evolvesTo === first);
    if (!prev) break;
    first = prev.id;
  }
  const line: BeastForm[] = [];
  for (let id: string | undefined = first; id; id = SPECIES.find((s) => s.id === id)?.evolvesTo)
    line.push({ speciesId: id, variant: 'comune' });
  const last = line[line.length - 1]!;
  const f = finalOf(last.speciesId, 'comune');
  if (f) line.push(f);
  return line;
}

/** Whether you know a form (seen or tamed): an evolution icon you do not know is a shadow on the sheet. */
export function knowsForm(
  form: BeastForm,
  g: { seen: Set<string>; beasts: { team: readonly TeamBeast[] } },
): boolean {
  const key = formKey(form);
  if (g.beasts.team.some((b) => formKey(b.form) === key)) return true;
  return form.variant === 'comune' && !form.final ? g.seen.has(form.speciesId) : g.seen.has(key);
}

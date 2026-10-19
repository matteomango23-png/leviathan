// The test gallery (owner, 19 ottobre 2026: "sto perdendo ore a catturarli"): every beast with pictures, one after
// another, in the sea, as an opponent and as a companion, in a throwaway game that is never saved. Part of the test
// tools (testTools.ts): to be removed with them before the game is finished.
import { GALLERY } from '../data/beasts';
import { PROGRESSION } from '../data/rules';
import { UNIQUE_VARIANTS } from '../data/species';
import { SPRITE_KEYS } from '../data/sprites.generated';
import { bay } from '../data/worldLayout';
import { bestiaryEntries, rareAlphas } from './beasts/bestiaryEntries';
import { formKey, wildLevelRange, type BeastForm } from './beasts/forms';
import { addTamed, makeTeamBeast, teamMembers } from './beasts/team';
import { removeWild } from './beasts/wildState';
import { requestBattle } from './encounters';
import { dismount } from './beastState';
import type { GameEvent } from './events';
import type { GameState } from './game';
import { healAll, spawnTestBeast } from './testTools';

/** Every form to try, in the bestiary's order: each species with its final forms and albino, then the alphas with
 *  pictures of their own, then the unique beasts. No doubles. */
export function galleryForms(): BeastForm[] {
  const out: BeastForm[] = [
    ...bestiaryEntries().map((e) => e.form),
    ...rareAlphas(),
    ...UNIQUE_VARIANTS.map((u) => ({
      speciesId: u.speciesId,
      variant: 'comune' as const,
      unique: u.id,
    })).filter((f) => SPRITE_KEYS.includes(formKey(f))),
  ];
  const seen = new Set<string>();
  return out.filter((f) => {
    const k = formKey(f);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** The level it is tried at: a final form at the level it comes at, the others at the top of their wild levels. */
export function galleryLevel(form: BeastForm): number {
  return form.final ? PROGRESSION.finalFormLevel : wildLevelRange(form)[1];
}

/** Where the throwaway game starts: in open water in the bay, a strong beast in the team to fight with. */
export function setUpGallery(g: GameState): void {
  Object.assign(g.diver, { x: bay(GALLERY.bayX), y: g.map.surfaceY + GALLERY.depth, vx: 0, vy: 0, face: 1 });
  const fighter = makeTeamBeast(
    `b${g.beasts.nextUid++}`,
    { ...GALLERY.fighter },
    PROGRESSION.finalFormLevel,
    true,
  );
  addTamed(g.beasts.team, fighter);
}

/** The beast of the gallery swimming in the sea now (its wild's id), so the next one takes its place. */
export interface GalleryState {
  wildId: number | null;
  /** The uid of the gallery's companion in the team. */
  companion: string | null;
}

export const newGalleryState = (): GalleryState => ({ wildId: null, companion: null });

function clearWild(g: GameState, s: GalleryState): void {
  const w = g.beasts.wilds.find((x) => x.id === s.wildId);
  if (w) removeWild(w, GALLERY.respawnSeconds);
  s.wildId = null;
}

/** "In mare": it appears by the diver and swims about, calm (it does not attack). */
export function showInSea(g: GameState, s: GalleryState, form: BeastForm): void {
  clearWild(g, s);
  spawnTestBeast(g, form, galleryLevel(form));
  const w = newest(g, form);
  if (!w) return;
  w.calm = GALLERY.calmSeconds;
  s.wildId = w.id;
}

/** "Avversario": it appears and the battle opens at once. */
export function fightIt(g: GameState, s: GalleryState, form: BeastForm, events: GameEvent[]): void {
  healAll(g);
  clearWild(g, s);
  spawnTestBeast(g, form, galleryLevel(form));
  const w = newest(g, form);
  if (!w) return;
  s.wildId = w.id;
  requestBattle(g, w, 'normal', events);
}

/** "Compagno": in the team in place of the gallery's last companion (the fighter stays); returns its team slot,
 *  to be called at the diver's side. */
export function makeCompanion(g: GameState, s: GalleryState, form: BeastForm, events: GameEvent[]): number {
  const team = g.beasts.team;
  // the beast at your side (the last companion, or the fighter) swims off first: you climb down if riding
  if (g.beasts.mount) {
    dismount(g, events);
    g.beasts.mount = null;
  }
  const old = team.findIndex((b) => b.uid === s.companion);
  if (old >= 0) team.splice(old, 1);
  const b = makeTeamBeast(`b${g.beasts.nextUid++}`, { ...form }, galleryLevel(form), true);
  addTamed(team, b);
  s.companion = b.uid;
  healAll(g);
  return teamMembers(team).findIndex((x) => x.uid === b.uid);
}

/** The wild beast just made of this form (spawnTestBeast reuses a wild of the same species, or the first). */
function newest(g: GameState, form: BeastForm) {
  const k = formKey(form);
  return g.beasts.wilds.find((w) => w.motion !== 'gone' && formKey(w.form) === k);
}

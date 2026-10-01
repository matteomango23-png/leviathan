// The first beast (owner's decision of 1 ottobre 2026, like the starters of Pokémon): with no beast you cannot
// battle, so you cannot tame either. Right after the opening Aurelio lets you pick one of three young
// prehistoric beasts; a save with no beasts gets the same choice as soon as it is loaded.
import { STARTER } from '../data/story';
import { SPECIES, type SpeciesDef } from '../data/species';
import { addTamed, makeTeamBeast, type TeamBeast } from './beasts/team';
import type { GameEvent } from './events';

/** What the choice needs from the game. */
export interface StarterWorld {
  beasts: { team: TeamBeast[]; nextUid: number };
  story: { step: string; seen: string[] };
  seen: Set<string>;
}

/** The three beasts offered, in the order they are shown. */
export const STARTERS: SpeciesDef[] = SPECIES.filter((s) => s.starter);

/** The choice is on screen: no beast at all, not chosen yet, and the opening is over. */
export function needsStarter(g: Pick<StarterWorld, 'beasts' | 'story'>): boolean {
  const step = g.story.step;
  return (
    g.beasts.team.length === 0 && !g.story.seen.includes('starter') && step !== 'off' && step !== 'intro'
  );
}

/** You pick one: it joins your team at its starting level. */
export function chooseStarter(g: StarterWorld, speciesId: string, events: GameEvent[]): TeamBeast | null {
  if (!STARTERS.some((s) => s.id === speciesId)) return null;
  const b = addTamed(
    g.beasts.team,
    makeTeamBeast(`b${g.beasts.nextUid++}`, { speciesId, variant: 'comune' }, STARTER.level, true),
  );
  g.seen.add(speciesId);
  g.story.seen.push('starter');
  events.push({ type: 'tamed', uid: b.uid, toTeam: true });
  return b;
}

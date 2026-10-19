// Aurelio's tips (owner, 16 ottobre 2026: "un tutorial che ti spiega un pochino tutte le varie robe, soprattutto come
// usare la barca, come trovare l'animale"): each one is a short dialogue opened once, the first time its moment
// comes (data/story.ts TIPS), never during the opening and the guided first dive (which have their own guide), one
// at a time. They can be switched off and read again in the Guida. Pure logic.
import { TIPS, TIPS_OFF, type TipTrigger } from '../data/story';
import type { GameEvent } from './events';
import { openDialogue, type StoryState } from './story';

/** Which tip moments this step's events bring. */
function triggers(events: readonly GameEvent[]): Set<TipTrigger> {
  const out = new Set<TipTrigger>();
  for (const e of events) {
    if (e.type === 'wildAppeared') {
      if (e.legend) out.add('legendAppeared');
    } else if (e.type === 'tamed') {
      if (!e.toTeam) out.add('tamedOutOfTeam');
    } else if (
      e.type === 'shipBoarded' ||
      e.type === 'rumourHeard' ||
      e.type === 'echoFound' ||
      e.type === 'boarded' ||
      e.type === 'boatBoarded' ||
      e.type === 'mounted' ||
      e.type === 'portArrived'
    )
      out.add(e.type);
  }
  return out;
}

export const tipsOn = (s: StoryState): boolean => !s.seen.includes(TIPS_OFF);

export function setTipsOn(s: StoryState, on: boolean): void {
  s.seen = s.seen.filter((x) => x !== TIPS_OFF);
  if (!on) s.seen.push(TIPS_OFF);
}

/** At the end of a game step: the first tip whose moment came and that was never shown opens. */
export function stepTips(s: StoryState, events: GameEvent[]): void {
  if (s.dialogue || !tipsOn(s) || (s.step !== 'toPortoFango' && s.step !== 'free')) return;
  const now = triggers(events);
  if (!now.size) return;
  const tip = TIPS.find((t) => now.has(t.on) && !s.seen.includes(t.id));
  if (tip) openDialogue(s, tip.id, events);
}

// The step-by-step tutorial on screen (data/coach.ts; owner, 12 novembre 2026: "ti dicono dove toccare e che cosa
// fare"): the screen dims, the button of the step is lit in a glowing frame and Aurelio's bubble says what it does,
// with Avanti and Salta. A button not on the screen now is skipped. Each round once (story.seen), not with Aurelio's
// tips switched off.
import { COACH, coachSeen, type CoachRound } from '../data/coach';
import { SPEAKERS } from '../data/story';
import type { StoryState } from '../systems/story';
import { tipsOn } from '../systems/tips';
import { el } from './dom';

const PAD = 6; // px around the lit button
const GAP = 12; // px between it and the bubble

const visible = (e: HTMLElement): boolean => {
  if (e.closest('[hidden]')) return false;
  const r = e.getBoundingClientRect();
  const st = getComputedStyle(e);
  return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none';
};

/** Is this round still to be shown? */
export const coachDue = (s: StoryState, r: CoachRound): boolean =>
  tipsOn(s) && !s.seen.includes(coachSeen(r));

/** Shows a round if it is due. @returns whether it opened (onEnd comes when it closes) */
export function runCoach(s: StoryState, r: CoachRound, onEnd: () => void = () => {}): boolean {
  if (!coachDue(s, r)) return false;
  s.seen.push(coachSeen(r));
  const steps = COACH[r]
    .map((st) => ({ ...st, el: document.querySelector<HTMLElement>(`[data-coach="${st.target}"]`) }))
    .filter((st): st is typeof st & { el: HTMLElement } => !!st.el && visible(st.el));
  if (!steps.length) {
    onEnd();
    return false;
  }
  const root = el('div', 'coach', document.getElementById('ui') ?? document.body);
  const hole = el('div', 'coach-hole', root);
  const bubble = el('div', 'coach-bubble', root);
  el('div', 'coach-who', bubble, SPEAKERS.aurelio);
  const text = el('p', 'coach-text', bubble);
  const foot = el('div', 'coach-foot', bubble);
  const count = el('span', 'coach-count', foot);
  const skip = el('button', 'pbtn coach-skip', foot, 'Salta');
  const next = el('button', 'pbtn primary', foot, 'Avanti');
  let i = 0;
  const close = (): void => {
    window.removeEventListener('resize', place);
    root.remove();
    onEnd();
  };
  function place(): void {
    const st = steps[i];
    if (!st || !root.isConnected) return;
    const r = st.el.getBoundingClientRect();
    Object.assign(hole.style, {
      left: `${r.left - PAD}px`,
      top: `${r.top - PAD}px`,
      width: `${r.width + PAD * 2}px`,
      height: `${r.height + PAD * 2}px`,
    });
    const b = bubble.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // below the button if it fits, else above, else beside it
    let top = r.bottom + PAD + GAP;
    if (top + b.height > vh - 8) top = r.top - PAD - GAP - b.height;
    let left = r.left + r.width / 2 - b.width / 2;
    if (top < 8) {
      top = Math.min(vh - b.height - 8, Math.max(8, r.top + r.height / 2 - b.height / 2));
      left = r.right + PAD + GAP + b.width < vw - 8 ? r.right + PAD + GAP : r.left - PAD - GAP - b.width;
    }
    bubble.style.left = `${Math.max(8, Math.min(vw - b.width - 8, left))}px`;
    bubble.style.top = `${Math.max(8, top)}px`;
  }
  const show = (): void => {
    text.textContent = steps[i]!.text;
    count.textContent = `${i + 1} / ${steps.length}`;
    next.textContent = i === steps.length - 1 ? 'Ho capito' : 'Avanti';
    // a tab low in a scrolling rail comes into sight first
    steps[i]!.el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    place();
    requestAnimationFrame(place); // again once the bubble has its new text's size
  };
  next.addEventListener('click', () => {
    if (++i >= steps.length) close();
    else show();
  });
  skip.addEventListener('click', close);
  window.addEventListener('resize', place);
  show();
  return true;
}

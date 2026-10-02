// Aurelio's jobs (data/portJobs.ts): the story step between the first dive and the burning pier. Progress comes
// from the game's events (fish caught, battles won, beasts tamed) and from the team's levels; each job done pays
// its teeth; with all four done, back at the pier of Portofosco the story goes on.
import { JOBS_TEXT, PORT_JOBS, type PortJob } from '../data/portJobs';
import { portAt } from './economy/places';
import type { GameEvent } from './events';
import { setStep, type StoryWorld } from './story';

/** How far a job is (0 … its goal count). */
export function jobProgress(g: StoryWorld, job: PortJob): number {
  if (job.goal.kind === 'level') return Math.max(0, ...g.beasts.team.map((b) => b.level));
  return g.story.jobs[job.id] ?? 0;
}

const goalCount = (job: PortJob): number => (job.goal.kind === 'level' ? job.goal.level : job.goal.count);
export const jobDone = (g: StoryWorld, job: PortJob): boolean => jobProgress(g, job) >= goalCount(job);

/** What each event adds to a job. */
function counts(job: PortJob, e: GameEvent): number {
  const goal = job.goal;
  if (goal.kind === 'fish' && e.type === 'fishCaught' && e.fishId === goal.fish) return 1;
  if (goal.kind === 'beat' && e.type === 'battleWon' && e.speciesId === goal.species) return 1;
  if (goal.kind === 'tame' && e.type === 'tamed') return 1;
  return 0;
}

/** One step of the jobs (stepStory, step 'portJobs'). */
export function stepPortJobs(g: StoryWorld, events: GameEvent[]): void {
  const s = g.story;
  const paid = s.seen; // "lavoro:<id>" once its teeth are paid
  for (const job of PORT_JOBS) {
    if (paid.includes(`lavoro:${job.id}`)) continue;
    for (const e of events) {
      const n = counts(job, e);
      if (n) s.jobs[job.id] = Math.min(goalCount(job), (s.jobs[job.id] ?? 0) + n);
    }
    if (!jobDone(g, job)) continue;
    paid.push(`lavoro:${job.id}`);
    g.gear.teeth += job.reward;
    events.push({ type: 'storyNote', text: JOBS_TEXT.jobDone(job.done, job.reward) });
    events.push({ type: 'storyStep', step: s.step });
  }
  // all done: back at the pier the story goes on (the pier burns)
  if (PORT_JOBS.every((j) => paid.includes(`lavoro:${j.id}`)) && portAt(g.diver, g.map)?.id === 'portofosco')
    setStep(s, 'pier', events);
}

/** The goal under the hearts during the jobs. */
export function jobsObjective(g: StoryWorld): string {
  const left = PORT_JOBS.filter((j) => !g.story.seen.includes(`lavoro:${j.id}`));
  const next = left[0];
  if (!next) return JOBS_TEXT.allDone;
  const n = next.goal.kind === 'level' ? '' : ` (${jobProgress(g, next)}/${goalCount(next)})`;
  return JOBS_TEXT.objective(next.text + n, PORT_JOBS.length - left.length, PORT_JOBS.length);
}

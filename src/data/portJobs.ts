// Leviatano — Aurelio's jobs at the port (tappa 17, owner's decision of 3 ottobre 2026: "prima un po' di mini
// missioni del porto, per livellare gli animali e arrivare naturalmente ad avere una squadra"). After the first
// dive and before the pier burns, four small jobs: they teach fishing, fighting, taming and growing.
// Values marked "tuning" are a first pass: change them here, never in systems.

export type JobGoal =
  | { kind: 'fish'; fish: string; count: number }
  | { kind: 'beat'; species: string; count: number }
  | { kind: 'tame'; count: number }
  | { kind: 'level'; level: number };

export interface PortJob {
  id: string;
  text: string; // under the hearts while it is the next one
  done: string; // the message when it is done
  goal: JobGoal;
  reward: number; // teeth
}

export const PORT_JOBS: PortJob[] = [
  {
    id: 'sardine',
    text: 'Pesca 5 sardine per il mercato',
    done: 'Sardine consegnate: il mercante ti paga.',
    goal: { kind: 'fish', fish: 'sardina', count: 5 },
    reward: 25,
  },
  {
    id: 'barracuda',
    text: 'I barracuda rubano dalle reti: vinci 2 battaglie contro i barracuda della Baia',
    done: 'I barracuda girano alla larga dalle reti.',
    goal: { kind: 'beat', species: 'barracuda', count: 2 },
    reward: 40,
  },
  {
    id: 'doma',
    text: 'Doma una bestia selvatica con la Conchiglia del domatore',
    done: 'Una bestia nuova nella tua squadra.',
    goal: { kind: 'tame', count: 1 },
    reward: 40,
  },
  {
    id: 'livello',
    text: 'Porta il tuo primo compagno al livello 9',
    done: 'Il tuo compagno è cresciuto.',
    goal: { kind: 'level', level: 9 }, // tuning
    reward: 50,
  },
];

/** The marks the save keeps for the jobs paid (in the story's "seen" list). */
export const jobMarkIds = (): string[] => PORT_JOBS.map((j) => `lavoro:${j.id}`);

export const JOBS_TEXT = {
  objective: (job: string, done: number, total: number): string => `Lavori di Aurelio (${done}/${total}): ${job}`,
  allDone: 'Lavori finiti: torna da Aurelio al molo di Portofosco',
  jobDone: (text: string, reward: number): string => `${text} +${reward} denti.`,
};

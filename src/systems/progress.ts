// What a game step is worth: experience for the team when a wild beast is exhausted, mission progress,
// the deepest point reached. Runs after everything else in stepGame (game.ts), reading its events.
import { XP_RULES } from '../data/progression';
import { activeBeast } from './beastState';
import { formLengthUnits, speciesOf } from './beasts/forms';
import { gainXp, xpReward } from './beasts/growth';
import { teamMembers } from './beasts/team';
import type { BackpackWorld } from './economy/backpack';
import type { GameEvent } from './events';
import { signalMissions } from './economy/missions';
import { depthMetres } from './world/zones';

/**
 * Experience for an exhausted (or fleeing, already-owned) wild beast: all of it to the beast in the water,
 * a share to the rest of the team (GDD "Livelli"). Each appearance gives experience once.
 */
function awardExperience(g: BackpackWorld, events: GameEvent[]): void {
  const out: GameEvent[] = [];
  for (const e of events) {
    if (e.type !== 'wildExhausted' && e.type !== 'wildFled') continue;
    const w = g.beasts.wilds.find((x) => x.id === e.id);
    if (!w || w.xpGiven) continue;
    w.xpGiven = true;
    const xp = xpReward(w.form, w.level, !!w.guardian);
    const inWater = activeBeast(g);
    for (const b of teamMembers(g.beasts.team)) {
      if (b.ko) continue;
      gainXp(b, b === inWater ? xp : xp * XP_RULES.benchShare, out);
    }
  }
  const c = g.beasts.companion;
  const b = activeBeast(g);
  // a growing beast gets longer (levels 31–50) or changes into its final form
  if (c && b && out.some((e) => (e.type === 'levelUp' || e.type === 'finalForm') && e.uid === b.uid))
    c.length = formLengthUnits(b.form, b.level);
  events.push(...out);
}

function stepMissionsAndDepth(g: BackpackWorld, events: GameEvent[]): void {
  const d = g.diver;
  const depth = depthMetres(d.y);
  const done: string[] = [];
  if (!d.dead && depth > g.gear.deepestM) {
    g.gear.deepestM = depth;
    done.push(...signalMissions(g.gear, { kind: 'depth', metres: depth }));
  }
  for (const e of events) {
    if (e.type === 'fishCaught') done.push(...signalMissions(g.gear, { kind: 'catch', fish: e.fishId }));
    else if (e.type === 'wreckOpened')
      done.push(...signalMissions(g.gear, { kind: 'openWreck', wreck: e.id }));
    else if (e.type === 'wildExhausted') {
      const w = g.beasts.wilds.find((x) => x.id === e.id);
      if (w) done.push(...signalMissions(g.gear, { kind: 'exhaust', species: w.form.speciesId }));
    } else if (e.type === 'tamed') {
      const b = g.beasts.team.find((x) => x.uid === e.uid);
      if (b) done.push(...signalMissions(g.gear, { kind: 'tame', region: speciesOf(b.form).region }));
    }
  }
  for (const id of done) events.push({ type: 'missionComplete', id });
}

export function stepProgress(g: BackpackWorld, events: GameEvent[]): void {
  awardExperience(g, events);
  stepMissionsAndDepth(g, events);
}

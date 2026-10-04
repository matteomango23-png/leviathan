// What a game step is worth: mission progress and the deepest point reached (experience comes from
// battles, battleResult.ts). Runs after everything else in stepGame (game.ts), reading its events.
import { speciesOf } from './beasts/forms';
import type { BackpackWorld } from './economy/backpack';
import type { GameEvent } from './events';
import { signalMissions } from './economy/missions';
import { depthMetres } from './world/zones';
import { kmFromCoast } from './world/stretches';

function stepMissionsAndDepth(g: BackpackWorld, events: GameEvent[]): void {
  const d = g.diver;
  const depth = depthMetres(d.y);
  const done: string[] = [];
  if (!d.dead && depth > g.gear.deepestM) {
    g.gear.deepestM = depth;
    done.push(...signalMissions(g.gear, { kind: 'depth', metres: depth }));
  }
  // how far out you are (expeditions: at the helm you are where the ship is)
  if (!d.dead) done.push(...signalMissions(g.gear, { kind: 'reachKm', km: kmFromCoast(d.x) }));
  for (const e of events) {
    if (e.type === 'tracesFound') done.push(...signalMissions(g.gear, { kind: 'hunt', hunt: e.id }));
    else if (e.type === 'fishCaught') done.push(...signalMissions(g.gear, { kind: 'catch', fish: e.fishId }));
    else if (e.type === 'wreckOpened')
      done.push(...signalMissions(g.gear, { kind: 'openWreck', wreck: e.id }));
    else if (e.type === 'battleWon')
      done.push(...signalMissions(g.gear, { kind: 'exhaust', species: e.speciesId }));
    else if (e.type === 'tamed') {
      const b = g.beasts.team.find((x) => x.uid === e.uid);
      if (b) done.push(...signalMissions(g.gear, { kind: 'tame', region: speciesOf(b.form).region }));
    }
  }
  for (const id of done) events.push({ type: 'missionComplete', id });
}

export function stepProgress(g: BackpackWorld, events: GameEvent[]): void {
  stepMissionsAndDepth(g, events);
}

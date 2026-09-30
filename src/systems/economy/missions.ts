// The harbour board: accept up to MAX_ACTIVE_MISSIONS, progress counts after accepting,
// claim the teeth at the port.
import { MAX_ACTIVE_MISSIONS, MISSIONS, type MissionDef } from '../../data/economy';
import type { GearState } from './gear';

export const missionById = (id: string): MissionDef | undefined => MISSIONS.find((m) => m.id === id);

export function goalCount(m: MissionDef): number {
  const g = m.goal;
  if (g.kind === 'openWreck') return 1;
  if (g.kind === 'depth') return g.metres;
  return g.count;
}

/** Missions you can accept now (not done, not active, prerequisites met). */
export function boardMissions(s: GearState): MissionDef[] {
  const ms = s.missions;
  return MISSIONS.filter(
    (m) =>
      !ms.done.includes(m.id) && !ms.active.includes(m.id) && (!m.requires || ms.done.includes(m.requires)),
  );
}

export function acceptMission(s: GearState, id: string): boolean {
  const m = missionById(id);
  if (!m || !boardMissions(s).some((x) => x.id === id)) return false;
  if (s.missions.active.length >= MAX_ACTIVE_MISSIONS) return false;
  s.missions.active.push(id);
  s.missions.progress[id] = m.goal.kind === 'depth' ? Math.floor(s.deepestM) : 0;
  return true;
}

export function isComplete(s: GearState, id: string): boolean {
  const m = missionById(id);
  return !!m && (s.missions.progress[id] ?? 0) >= goalCount(m);
}

/** Pays the reward of a completed mission. Returns the teeth earned (0 if not complete). */
export function claimMission(s: GearState, id: string): number {
  const m = missionById(id);
  if (!m || !s.missions.active.includes(id) || !isComplete(s, id)) return 0;
  s.missions.active = s.missions.active.filter((x) => x !== id);
  s.missions.done.push(id);
  delete s.missions.progress[id];
  s.teeth += m.reward;
  return m.reward;
}

export type MissionSignal =
  | { kind: 'catch'; fish: string }
  | { kind: 'sell'; count: number }
  | { kind: 'exhaust'; species: string }
  | { kind: 'tame'; region: string }
  | { kind: 'openWreck'; wreck: string }
  | { kind: 'depth'; metres: number };

/** Advances active missions. Returns ids that just became complete. */
export function signalMissions(s: GearState, sig: MissionSignal): string[] {
  const done: string[] = [];
  for (const id of s.missions.active) {
    const m = missionById(id);
    if (!m) continue;
    const g = m.goal;
    const before = isComplete(s, id);
    const p = s.missions.progress[id] ?? 0;
    if (g.kind === 'catch' && sig.kind === 'catch' && sig.fish === g.fish) s.missions.progress[id] = p + 1;
    else if (g.kind === 'sell' && sig.kind === 'sell') s.missions.progress[id] = p + sig.count;
    else if (g.kind === 'exhaust' && sig.kind === 'exhaust' && sig.species === g.species)
      s.missions.progress[id] = p + 1;
    else if (g.kind === 'tame' && sig.kind === 'tame' && sig.region === g.region)
      s.missions.progress[id] = p + 1;
    else if (g.kind === 'openWreck' && sig.kind === 'openWreck' && sig.wreck === g.wreck)
      s.missions.progress[id] = 1;
    else if (g.kind === 'depth' && sig.kind === 'depth')
      s.missions.progress[id] = Math.max(p, Math.floor(sig.metres));
    if (!before && isComplete(s, id)) done.push(id);
  }
  return done;
}

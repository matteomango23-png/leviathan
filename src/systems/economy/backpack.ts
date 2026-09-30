// Using what is in the backpack during a dive: pick a weapon, use an item, call a swarm.
import { ITEM_RULES } from '../../data/economy';
import { PROGRESSION } from '../../data/rules';
import { SWARMS } from '../../data/world';
import { activeBeast, type BeastWorld } from '../beastState';
import type { GameEvent } from '../events';
import { maxHpOf, teamMembers } from '../beasts/team';
import { cleanBackpack, slotKind, type GearState } from './gear';

export interface BackpackWorld extends BeastWorld {
  gear: GearState;
  /** Seconds before each swarm can be called again (not saved). */
  swarmCooldowns: Record<string, number>;
}

/** Items and swarms bound to the diver: the sardine swarm binds after SWARMS.bindCount sardines. */
export function checkSwarmBinding(
  g: BackpackWorld,
  fishCaught: Record<string, number>,
  events: GameEvent[],
): void {
  for (const s of SWARMS) {
    if (g.gear.swarms.includes(s.id)) continue;
    const fish = s.id === 'sciame_sardine' ? 'sardina' : null; // other swarms arrive with their regions
    if (fish && (fishCaught[fish] ?? 0) >= s.bindCount) {
      g.gear.swarms.push(s.id);
      g.seen.add(s.id);
      events.push({ type: 'swarmBound', id: s.id });
    }
  }
}

function useItem(g: BackpackWorld, id: string, events: GameEvent[]): boolean {
  const gear = g.gear;
  if ((gear.inventory[id] ?? 0) <= 0) return false;
  const d = g.diver;
  const team = teamMembers(g.beasts.team);
  const target = activeBeast(g) ?? team.find((b) => b.ko || b.hp < maxHpOf(b)) ?? team[0];
  switch (id) {
    case 'bolla_aria':
      if (d.o2 >= d.maxO2) return false;
      d.o2 = d.maxO2;
      break;
    case 'alga_curativa':
      if (!target || (target.hp >= maxHpOf(target) && !target.ko)) return false;
      target.hp = maxHpOf(target);
      target.ko = false;
      break;
    case 'krill_dorato':
      if (!target || target.level >= PROGRESSION.maxLevel) return false;
      target.level = Math.min(PROGRESSION.maxLevel, target.level + ITEM_RULES.krillLevels);
      target.hp = maxHpOf(target);
      break;
    case 'esca':
      // the beasts of the zone come now (if they are not around already)
      for (const w of g.beasts.wilds)
        if (w.motion === 'gone') w.respawn = Math.min(w.respawn, ITEM_RULES.lureSeconds);
        else if (w.motion === 'hidden') w.t = Math.min(w.t, ITEM_RULES.lureSeconds);
      break;
    case 'arpione_mitico':
      g.beasts.mythic = ITEM_RULES.mythicWindowSeconds;
      break;
    default:
      return false;
  }
  gear.inventory[id] = (gear.inventory[id] ?? 0) - 1;
  cleanBackpack(gear);
  events.push({ type: 'itemUsed', id });
  return true;
}

function callSwarm(g: BackpackWorld, id: string, events: GameEvent[]): boolean {
  const s = SWARMS.find((x) => x.id === id);
  if (!s || !g.gear.swarms.includes(id) || (g.swarmCooldowns[id] ?? 0) > 0 || g.diver.dead) return false;
  const absorb = Number(s.fx.find((f) => f.startsWith('absorbHits:'))?.split(':')[1] ?? 0);
  g.beasts.decoy = { id, t: s.duration, absorb };
  g.swarmCooldowns[id] = s.cooldown;
  events.push({ type: 'swarmSummoned', id });
  return true;
}

/** A backpack slot was tapped (0..2). */
export function useSlot(g: BackpackWorld, slot: number, events: GameEvent[]): boolean {
  const id = g.gear.backpack[slot];
  if (!id) return false;
  const k = slotKind(id);
  if (k === 'weapon') {
    g.gear.activeWeapon = g.gear.activeWeapon === id ? 'arpione' : id;
    return true;
  }
  if (k === 'swarm') return callSwarm(g, id, events);
  if (k === 'item') return useItem(g, id, events);
  return false;
}

export function stepSwarmCooldowns(g: BackpackWorld, dt: number): void {
  for (const k of Object.keys(g.swarmCooldowns)) g.swarmCooldowns[k] = Math.max(0, g.swarmCooldowns[k]! - dt);
}

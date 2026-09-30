// Sanctuaries: stand still inside one and hearts, oxygen and your whole team (KO included) heal
// gradually in about PROGRESSION.sanctuaryHealSeconds. The last one reached is where you wake up.
import { SANCTUARY_RULES } from '../data/beasts';
import { PROGRESSION } from '../data/rules';
import { SANCTUARIES } from '../data/worldLayout';
import type { DiverState } from './diver';
import type { GameEvent } from './events';
import { maxHpOf, type TeamBeast } from './beasts/team';
import type { TileMap } from './world/tileMap';

export interface Sanctuary {
  name: string;
  x: number;
  /** World y of the sanctuary's centre (just above the floor it stands on). */
  y: number;
}

export function placeSanctuaries(map: TileMap): Sanctuary[] {
  return SANCTUARIES.map((s) => {
    const floor = map.floorBelow(s.x, s.y);
    return { name: s.name, x: s.x, y: floor - 14 };
  });
}

export interface SanctuaryState {
  list: Sanctuary[];
  /** Index of the respawn sanctuary, or null for the start. */
  current: number | null;
  inside: number | null;
  heartProgress: number;
  /** True while something is being healed (for the glow and the message). */
  healing: boolean;
}

export function sanctuaryAt(list: Sanctuary[], x: number, y: number): number | null {
  const i = list.findIndex((s) => Math.hypot(x - s.x, y - s.y) < SANCTUARY_RULES.radius);
  return i >= 0 ? i : null;
}

export function stepSanctuaries(
  s: SanctuaryState,
  d: DiverState,
  team: TeamBeast[],
  dt: number,
  events: GameEvent[],
): boolean {
  const inside = d.dead ? null : sanctuaryAt(s.list, d.x, d.y);
  if (inside !== null && s.inside !== inside && s.current !== inside) {
    s.current = inside;
    events.push({ type: 'sanctuaryReached', index: inside });
  }
  s.inside = inside;
  if (inside === null || Math.hypot(d.vx, d.vy) > SANCTUARY_RULES.stillSpeed) return false;

  const k = dt / PROGRESSION.sanctuaryHealSeconds;
  let healing = false;
  if (d.hp < d.maxHp) {
    healing = true;
    s.heartProgress += d.maxHp * k;
    while (s.heartProgress >= 1 && d.hp < d.maxHp) {
      s.heartProgress -= 1;
      d.hp++;
    }
  } else s.heartProgress = 0;
  if (d.o2 < d.maxO2) {
    healing = true;
    d.o2 = Math.min(d.maxO2, d.o2 + d.maxO2 * k);
  }
  for (const b of team) {
    const max = maxHpOf(b);
    if (b.hp < max || b.ko) {
      healing = true;
      b.hp = Math.min(max, b.hp + max * k);
      if (b.hp >= max && b.ko) b.ko = false;
    }
  }
  return healing;
}

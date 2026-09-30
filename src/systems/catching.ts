// Catching fish: a fish that reaches the diver heals a missing heart (or refills the air), otherwise it
// goes into the bag to sell. Also: new creatures for the bestiary.
import { FISH } from '../data/world';
import { checkSwarmBinding, type BackpackWorld } from './economy/backpack';
import type { GameEvent } from './events';
import { takeFish, type Fish } from './fish';

export interface CatchWorld extends BackpackWorld {
  fishCaught: Record<string, number>;
}

export function markSeen(g: CatchWorld, id: string, events: GameEvent[]): void {
  if (g.seen.has(id)) return;
  g.seen.add(id);
  events.push({ type: 'creatureSeen', id });
}

/** A fish reaches the diver: eaten if it heals a missing heart, otherwise into the bag to sell. */
export function catchFish(g: CatchWorld, f: Fish, events: GameEvent[]): void {
  takeFish(f);
  const kind = f.kind;
  const def = FISH.find((x) => x.id === kind);
  const count = (g.fishCaught[kind] ?? 0) + 1;
  g.fishCaught[kind] = count;
  let healed = false;
  if (def?.effect === 'cuore' && g.diver.hp < g.diver.maxHp) {
    g.diver.hp++;
    healed = true;
  } else if (def?.effect === 'ossigeno' && g.diver.o2 < g.diver.maxO2) {
    g.diver.o2 = g.diver.maxO2;
    healed = true;
  } else g.gear.bag[kind] = (g.gear.bag[kind] ?? 0) + 1;
  markSeen(g, kind, events);
  events.push({ type: 'fishCaught', fishId: kind, count, healed });
  checkSwarmBinding(g, g.fishCaught, events);
}

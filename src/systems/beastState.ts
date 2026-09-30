// Shared state of everything about beasts, and the small actions used by several systems.
import { WILD_SPAWNS } from '../data/beasts';
import type { DiverState } from './diver';
import type { GameEvent } from './events';
import type { Rng } from './math';
import { sendAway, type Companion } from './beasts/companion';
import type { MoveEffects } from './beasts/moves';
import type { TamingState } from './beasts/taming';
import { startRecallCooldown, type TeamBeast } from './beasts/team';
import { createWild, type WildBeast } from './beasts/wild';
import type { SanctuaryState } from './sanctuary';
import type { TileMap } from './world/tileMap';

export interface Decoy {
  id: string; // swarm id
  t: number; // seconds left
  absorb: number; // hits it can still take
}

export interface BeastState {
  wilds: WildBeast[];
  team: TeamBeast[];
  companion: Companion | null;
  riding: boolean;
  taming: TamingState | null;
  nextUid: number;
  effects: MoveEffects;
  /** A swarm summoned from the backpack around the diver. */
  decoy: Decoy | null;
  /** Seconds the mythic harpoon stays armed after using it. */
  mythic: number;
  /** A Guardian fight is on: no other wild beast comes. */
  arena: boolean;
}

export interface BeastWorld {
  map: TileMap;
  rng: Rng;
  diver: DiverState;
  beasts: BeastState;
  sanctuaries: SanctuaryState;
  seen: Set<string>;
  brokenTiles: number[];
}

export function createBeasts(team: TeamBeast[]): BeastState {
  const wilds = WILD_SPAWNS.map((s, i) => {
    const w = createWild(i + 1, s);
    w.respawn = 2 + i * 3;
    return w;
  });
  const maxUid = team.reduce((m, b) => Math.max(m, Number(b.uid.replace(/\D/g, '')) || 0), 0);
  return {
    wilds,
    team,
    companion: null,
    riding: false,
    taming: null,
    nextUid: maxUid + 1,
    effects: { shield: 0, guardTime: 0, guardMult: 1 },
    decoy: null,
    mythic: 0,
    arena: false,
  };
}

export const activeBeast = (g: BeastWorld): TeamBeast | undefined =>
  g.beasts.companion ? g.beasts.team.find((b) => b.uid === g.beasts.companion!.uid) : undefined;

export function dismount(g: BeastWorld, events: GameEvent[]): void {
  if (!g.beasts.riding) return;
  g.beasts.riding = false;
  g.diver.y -= 10;
  g.diver.vy = -30;
  events.push({ type: 'dismounted' });
}

export function recall(g: BeastWorld, events: GameEvent[]): void {
  const c = g.beasts.companion;
  if (!c || c.state === 'leaving') return;
  dismount(g, events);
  sendAway(c, g.diver.x);
  const b = activeBeast(g);
  if (b) {
    startRecallCooldown(b);
    events.push({ type: 'recalled', uid: b.uid });
  }
}

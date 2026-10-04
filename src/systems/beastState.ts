// Shared state of everything about beasts in the open sea, and the small actions used by several systems.
import { WILD_SPAWNS } from '../data/beasts';
import type { DiverState } from './diver';
import type { GameEvent } from './events';
import type { Rng } from './math';
import { sendAway, type Mount } from './beasts/mount';
import type { TeamBeast } from './beasts/team';
import { createWild, type WildBeast } from './beasts/wildState';
import type { TileMap } from './world/tileMap';

export interface Decoy {
  id: string; // swarm id
  t: number; // seconds left: while it lasts, the swarm hides you and no beast comes at you
}

/** A battle about to start: which wild beast, and who strikes first. */
export interface BattleRequest {
  wildId: number;
  /** 'you': you hit it from behind (it loses its first turn) · 'foe': it touched you (a free attack). */
  first: 'you' | 'foe' | 'normal';
}

export interface BeastState {
  wilds: WildBeast[];
  team: TeamBeast[];
  /** The beast you called to ride (swimming to you, carrying you, or leaving). */
  mount: Mount | null;
  riding: boolean;
  nextUid: number;
  /** A swarm summoned from the backpack around the diver. */
  decoy: Decoy | null;
  /** A Guardian fight is on: no other wild beast comes. */
  arena: boolean;
  /** Set when a battle must start (the World scene opens it and pauses the sea). */
  battle: BattleRequest | null;
  /** Legends defeated: gone forever (saved). */
  gone: string[];
  /** You are on your boat: no wild beast reaches you, no beast can be called. */
  aboard: boolean;
  /** Wild beasts your companion already warned you about (until they go back into the dark). */
  sensed: number[];
  /** A bait: these species come to you for a while. */
  lure: { species: string[]; t: number } | null;
  /** Seconds before the hint about ancient bones can show again. */
  boneHintT: number;
  /** The last species that came out of the dark (they come back less soon; not saved). */
  recent: string[];
}

export interface BeastWorld {
  map: TileMap;
  rng: Rng;
  diver: DiverState;
  beasts: BeastState;
  seen: Set<string>;
  brokenTiles: number[];
}

export function createBeasts(team: TeamBeast[], gone: string[] = []): BeastState {
  const wilds = WILD_SPAWNS.map((s, i) => {
    const w = createWild(i + 1, s);
    w.respawn = 1 + i * 2;
    return w;
  });
  const maxUid = team.reduce((m, b) => Math.max(m, Number(b.uid.replace(/\D/g, '')) || 0), 0);
  return {
    wilds,
    team,
    mount: null,
    riding: false,
    nextUid: maxUid + 1,
    decoy: null,
    arena: false,
    battle: null,
    boneHintT: 0,
    lure: null,
    sensed: [],
    aboard: false,
    gone: [...gone],
    recent: [],
  };
}

export const activeBeast = (g: BeastWorld): TeamBeast | undefined =>
  g.beasts.mount ? g.beasts.team.find((b) => b.uid === g.beasts.mount!.uid) : undefined;

/** You climb down: the mount swims back into the dark. */
export function dismount(g: BeastWorld, events: GameEvent[]): void {
  const m = g.beasts.mount;
  if (g.beasts.riding) {
    g.beasts.riding = false;
    g.diver.y -= 6;
    g.diver.vy = -30;
    events.push({ type: 'dismounted' });
  }
  if (m && m.state !== 'leaving') sendAway(m, g.diver.x);
}

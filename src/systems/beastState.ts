// Shared state of everything about beasts in the open sea, and the small actions used by several systems.
import { TEAM_RULES, WILD_SPAWNS } from '../data/beasts';
import { seatPoint } from './beasts/seat';
import type { Stamina } from './stamina';
import type { DiverState } from './diver';
import type { GameEvent } from './events';
import type { Rng } from './math';
import { sendAway, type Mount } from './beasts/mount';
import type { TeamBeast } from './beasts/team';
import { createWild, type WildBeast } from './beasts/wildState';
import { newResidents, type ResidentsState } from './beasts/residents';
import type { TileMap } from './world/tileMap';

interface Decoy {
  id: string; // swarm id
  t: number; // seconds left: while it lasts, the swarm hides you and no beast comes at you
}

/** A battle about to start: which wild beast, and who strikes first. */
export interface BattleRequest {
  wildId: number;
  /** 'you': you hit it from behind (it loses its first turn) · 'foe': it touched you (a free attack). */
  first: 'you' | 'foe' | 'normal';
  /** The fear of the superpredator you ride (beasts/mountTraits.ts): its tries to flee, frozen its first turn. */
  fear?: { fleeTries: number; frozen: boolean };
  /** The beast of yours that goes first (you tapped it to face the hunter after you). */
  lead?: string;
}

/**
 * A beast held still by the Ocean's Nightmare's sphere (part 4d): a resident of the endless sea (by its id, out for
 * real or not) or a wild one of the coast (by its slot); where it is held, and for how many seconds more.
 */
export interface Held {
  resident?: string;
  wild?: number;
  x: number;
  y: number;
  left: number;
}

export interface BeastState {
  wilds: WildBeast[];
  team: TeamBeast[];
  /** The beast you called to ride (swimming to you, carrying you, or leaving). */
  mount: Mount | null;
  /** The companions swimming with you (systems/pack.ts; owner, 21 ottobre: up to PACK.size; not saved). */
  pack: Mount[];
  riding: boolean;
  nextUid: number;
  /** A swarm summoned from the backpack around the diver. */
  decoy: Decoy | null;
  /** Set when a battle must start (the World scene opens it and pauses the sea). */
  battle: BattleRequest | null;
  /** Legends defeated: gone forever (saved). */
  gone: string[];
  /** You are on your boat: no wild beast reaches you, no beast can be called. */
  aboard: boolean;
  /** Wild beasts your companion already warned you about (until they go back into the dark). */
  sensed: number[];
  /** A bait: these species come to you for a while; a fine one makes one an alfa or an albino this often. */
  lure: { species: string[]; t: number; rare?: number } | null;
  /** Seconds before the hint about ancient bones can show again. */
  boneHintT: number;
  /** The last species that came out of the dark (they come back less soon; not saved). */
  recent: string[];
  /** The beasts living in the endless sea: who is out, who is gone (not saved; beasts/residents.ts). */
  residents: ResidentsState;
  /** The beast the sphere holds still (not saved). */
  held: Held | null;
  /** What the camera shows now (world units; set by the World scene, not saved): beasts come out of the dark and go
   *  back into it only outside it (owner, 9 ottobre: in the U-Boat they popped up on screen). */
  view: ViewRect | null;
  /** The light under the still ship (block 5b; not saved): where it shines and how far it calls the beasts. */
  light: { x: number; reach: number } | null;
  /** Each team beast's stamina when ridden (stamina.ts; not saved), by uid. */
  stamina: Record<string, Stamina>;
}

export interface ViewRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Is this point on screen, or within `margin` units of its edges? (No view known: never.) */
export const onScreen = (v: ViewRect | null, x: number, y: number, margin: number): boolean =>
  !!v && x > v.x - margin && x < v.x + v.width + margin && y > v.y - margin && y < v.y + v.height + margin;

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
    w.respawn = s.endless ? 1 : 1 + i * 2; // the endless sea's residents are already there
    return w;
  });
  const maxUid = team.reduce((m, b) => Math.max(m, Number(b.uid.replace(/\D/g, '')) || 0), 0);
  return {
    wilds,
    team,
    mount: null,
    pack: [],
    riding: false,
    nextUid: maxUid + 1,
    decoy: null,
    battle: null,
    boneHintT: 0,
    lure: null,
    sensed: [],
    aboard: false,
    gone: [...gone],
    recent: [],
    residents: newResidents(),
    held: null,
    view: null,
    stamina: {},
    light: null,
  };
}

/** Is this wild beast the one the sphere holds? */
export const isHeld = (h: Held | null, w: WildBeast): boolean =>
  !!h && h.left > 0 && (h.resident ? w.spawn.resident === h.resident : h.wild === w.id);

export const activeBeast = (g: BeastWorld): TeamBeast | undefined =>
  g.beasts.mount ? g.beasts.team.find((b) => b.uid === g.beasts.mount!.uid) : undefined;

/** The companions swimming with you (not the ones leaving), each with its team beast. */
export function packMembers(g: BeastWorld): { m: Mount; b: TeamBeast }[] {
  const out: { m: Mount; b: TeamBeast }[] = [];
  for (const m of g.beasts.pack) {
    const b = g.beasts.team.find((x) => x.uid === m.uid);
    if (b && m.state !== 'leaving') out.push({ m, b });
  }
  return out;
}

/** Is this team beast in the water with you (ridden, called or in the pack)? */
export const isOut = (g: BeastWorld, uid: string): boolean =>
  (g.beasts.mount?.uid === uid && g.beasts.mount.state !== 'leaving') ||
  g.beasts.pack.some((m) => m.uid === uid && m.state !== 'leaving');

/** You climb down: the mount swims back into the dark. */
export function dismount(g: BeastWorld, events: GameEvent[]): void {
  const m = g.beasts.mount;
  const d = g.diver;
  const wasRiding = g.beasts.riding;
  if (wasRiding) {
    g.beasts.riding = false;
    // you leave from your seat with a little push up, at its pace: no jump (owner, 22 ottobre)
    const b = activeBeast(g);
    if (m && b) Object.assign(d, seatPoint(m, b.form));
    d.vx = (m?.vx ?? d.vx) * 0.6;
    d.vy = (m?.vy ?? 0) * 0.6 - TEAM_RULES.dismountPush;
    events.push({ type: 'dismounted' });
  }
  if (m && m.state !== 'leaving') sendAway(m, d.x, wasRiding);
}

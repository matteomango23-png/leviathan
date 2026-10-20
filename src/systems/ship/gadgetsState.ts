// The state of the Ocean's Nightmare's gadgets (ship/gadgets.ts: the drone; ship/sphere.ts: the sphere) and what
// both use: the world they look at, and gliding towards a point.
import type { BeastState } from '../beastState';
import type { SubState } from '../submarine';
import type { Contact, Target } from '../tracking';
import { shipModel } from './model';
import type { ShipState } from './ship';

/** One beast in the drone's report, as it found it. */
export interface ReconEntry {
  target: Target;
  name: string;
  speciesId: string;
  lengthM: number;
  level?: number;
  depthM: number;
  /** Metres from the ship when it was found (west < 0). */
  dxM: number;
}

export interface GadgetsState {
  recon: {
    phase: 'idle' | 'out' | 'back';
    /** A round of every beast (the Nightmare's scouting) or one beast to plant a tracker on (the Krill Hunter's). */
    mode: 'scout' | 'tracker';
    x: number;
    y: number;
    face: 1 | -1;
    queue: Contact[];
    /** Seconds after the current beast. */
    t: number;
    found: ReconEntry[];
    /** The last report (null: none yet, or run out) and its age in seconds (RECON.reportSeconds). */
    report: ReconEntry[] | null;
    reportAge: number;
  };
  sphere: { phase: 'dock' | 'go' | 'hold' | 'back'; x: number; y: number; cooldown: number };
  /** The beast you follow (saved when it is a resident of the endless sea) and its name. */
  target: Target | null;
  targetName: string;
  /** Followed by a tracker dart (block 5a): seconds before its trace runs out (null: no limit, the drone's pick). */
  trackLeft: number | null;
}

export interface GadgetsWorld {
  ship: ShipState;
  sub: SubState;
  beasts: BeastState;
  seen: Set<string>;
  gadgets: GadgetsState;
}

export function newGadgets(
  target: { target: Target; name: string } | null = null,
  trackLeft: number | null = null,
): GadgetsState {
  return {
    recon: {
      phase: 'idle',
      mode: 'scout',
      x: 0,
      y: 0,
      face: 1,
      queue: [],
      t: 0,
      found: [],
      report: null,
      reportAge: 0,
    },
    sphere: { phase: 'dock', x: 0, y: 0, cooldown: 0 },
    target: target?.target ?? null,
    targetName: target?.name ?? '',
    trackLeft: target ? trackLeft : null,
  };
}

export const sphereBay = (s: { model: string }): number =>
  shipModel(s).bays.findIndex((b) => b.kind === 'sphere');
/** Moves a point toward another at `speed`; true when it got there (within `reach`). */
export function glide(
  p: { x: number; y: number },
  to: { x: number; y: number },
  speed: number,
  reach: number,
  dt: number,
): boolean {
  const dx = to.x - p.x;
  const dy = to.y - p.y;
  const d = Math.hypot(dx, dy);
  if (d <= reach) return true;
  const step = Math.min(d, speed * dt);
  p.x += (dx / d) * step;
  p.y += (dy / d) * step;
  return d - step <= reach;
}

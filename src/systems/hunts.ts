// The hunts (data/hunts.ts, owner's decisions of 4 ottobre 2026): the legends and the prehistoric giants live in
// dens and are found in four steps, kept in the hunting diary (saved): the rumour heard at a harbour or an outpost,
// the anomalous echo on the ship's sonar (close enough, in its weather), the traces under water by the den, then
// the beast itself, which comes out of its den only in its weather. Also the sonar's readout at the helm.
import { HUNT_RULES, HUNTS, type HuntDef } from '../data/hunts';
import { WILD_SPAWNS, type WildSpawnDef } from '../data/beasts';
import { SEA_REGIONS } from '../data/regions';
import { WORLD } from '../data/worldLayout';
import type { WeatherId } from '../data/weather';
import type { PortDef } from '../data/economy';
import type { GameEvent } from './events';
import { createWild, isInWater, type WildBeast } from './beasts/wildState';
import { formLengthM } from './beasts/forms';
import { sonarMult } from './ship/ship';
import type { TeamBeast } from './beasts/team';
import type { TileMap } from './world/tileMap';

/** Where a hunt has got to (saved). */
export interface HuntProgress {
  heard?: boolean;
  echo?: boolean;
  traces?: boolean;
}
export type HuntsState = Record<string, HuntProgress>;

/** The den of a hunt in the world: its point, above the floor. */
export interface Den {
  id: string;
  x: number;
  y: number;
}

/** The dens, sat above the real floor (a den deeper than the floor there moves up). */
export function placeDens(map: TileMap): Den[] {
  return HUNTS.map((h) => {
    const want = WORLD.surfaceY + h.depthM * WORLD.unitsPerMetre;
    const floor = map.floorBelow(h.x, WORLD.surfaceY + 10);
    return { id: h.id, x: h.x, y: Math.max(WORLD.surfaceY + 20, Math.min(want, floor - 40)) };
  });
}

/** The waters each hunted beast comes out in: a wild slot per hunt, around its den. */
export function huntSpawns(dens: Den[]): WildSpawnDef[] {
  return HUNTS.map((h, i) => {
    const d = dens[i]!;
    return {
      speciesId: h.form.speciesId,
      area: [
        d.x - HUNT_RULES.denHalfWidth,
        d.y - HUNT_RULES.denHalfHeight,
        d.x + HUNT_RULES.denHalfWidth,
        d.y + HUNT_RULES.denHalfHeight,
      ],
      respawnSeconds: [20, 40],
      hunt: h.id,
      form: h.form.unique ? { unique: h.form.unique } : undefined,
    };
  });
}

/** Adds the hunted beasts' slots to the wild beasts (ids after the ordinary ones). */
export function addHuntSlots(wilds: WildBeast[], dens: Den[]): void {
  huntSpawns(dens).forEach((s, i) => {
    const w = createWild(WILD_SPAWNS.length + 1 + i, s);
    w.respawn = 5;
    wilds.push(w);
  });
}

/** The weather now (the one it is turning into, past half way). */
export const weatherNow = (w: { from: WeatherId; to: WeatherId; blend: number }): WeatherId =>
  w.blend < 0.5 ? w.from : w.to;

export const conditionMet = (h: HuntDef, weather: WeatherId): boolean =>
  h.condition === 'sempre' || h.condition === weather;

/** Still out there: a legend not tamed nor gone (a giant can always be hunted again). */
export function huntOpen(h: HuntDef, gone: readonly string[], team: readonly TeamBeast[]): boolean {
  const u = h.form.unique;
  return !u || (!gone.includes(u) && !team.some((b) => b.form.unique === u));
}

/** Which hunts a harbour's people talk about: the coast's harbours the near seas, each outpost its region and
 *  the next one. */
export function rumoursAt(port: PortDef): HuntDef[] {
  const i = SEA_REGIONS.findIndex((r) => r.id === port.id);
  const regions: string[] =
    i < 0
      ? ['costa', SEA_REGIONS[0]!.id, SEA_REGIONS[1]!.id]
      : [SEA_REGIONS[i]!.id, SEA_REGIONS[i + 1]?.id ?? ''];
  return HUNTS.filter((h) => regions.includes(h.region));
}

/** At a harbour you hear its rumours: they go in the diary. */
export function hearRumours(hunts: HuntsState, port: PortDef, events: GameEvent[]): void {
  for (const h of rumoursAt(port)) {
    const p = (hunts[h.id] ??= {});
    if (p.heard) continue;
    p.heard = true;
    events.push({ type: 'rumourHeard', name: h.name });
  }
}

export interface HuntWorld {
  hunts: HuntsState;
  dens: Den[];
  weather: { from: WeatherId; to: WeatherId; blend: number };
  ship: { aboard: boolean; x: number; upgrades: string[] };
  diver: { x: number; y: number; dead: boolean };
  beasts: { wilds: WildBeast[]; gone: string[]; team: TeamBeast[] };
}

/**
 * One step of the hunts: the sonar hears the echo of a den (at the helm, rumour heard, close, in its weather);
 * under water by the den you find its traces; the hunted beast's slot comes out only when its hunt is ready.
 */
export function stepHunts(g: HuntWorld, events: GameEvent[]): void {
  const weather = weatherNow(g.weather);
  HUNTS.forEach((h, i) => {
    const den = g.dens[i]!;
    const p = (g.hunts[h.id] ??= {});
    const open = huntOpen(h, g.beasts.gone, g.beasts.team);
    const now = conditionMet(h, weather);
    if (
      open &&
      p.heard &&
      !p.echo &&
      now &&
      g.ship.aboard &&
      Math.abs(g.ship.x - den.x) < HUNT_RULES.sonarRange * sonarMult(g.ship)
    ) {
      p.echo = true;
      events.push({
        type: 'echoFound',
        name: h.name,
        depthM: Math.round((den.y - WORLD.surfaceY) / WORLD.unitsPerMetre),
      });
    }
    const d = g.diver;
    if (
      open &&
      p.echo &&
      !p.traces &&
      !d.dead &&
      Math.hypot(d.x - den.x, d.y - den.y) < HUNT_RULES.traceRadius
    ) {
      p.traces = true;
      events.push({ type: 'tracesFound', id: h.id, text: h.traces });
    }
    // its slot: held back until the hunt is ready (it stays in the water once out, until you swim away)
    const slot = g.beasts.wilds.find((w) => w.spawn.hunt === h.id);
    if (slot && !isInWater(slot) && !(open && p.traces && now)) slot.respawn = Math.max(slot.respawn, 1);
  });
}

export interface SonarEcho {
  /** What it is, as far as the sonar tells. */
  label: string;
  /** Metres ahead (+ east) and depth. */
  dx: number;
  depthM: number;
}

/**
 * The sonar at the helm: the depth of the floor under the ship, the echoes of big beasts near it, the anomalous
 * echoes of the dens it has heard.
 */
export function sonarReadout(g: HuntWorld & { map: TileMap }): { floorM: number; echoes: SonarEcho[] } {
  const x = g.ship.x;
  const m = (u: number): number => Math.round(u / WORLD.unitsPerMetre);
  const floorM = m(g.map.floorBelow(x, WORLD.surfaceY + 30) - WORLD.surfaceY);
  const echoes: SonarEcho[] = [];
  for (const w of g.beasts.wilds) {
    if (!isInWater(w) || Math.abs(w.x - x) > HUNT_RULES.bigEchoRange) continue;
    if (formLengthM(w.form) < HUNT_RULES.bigEchoM) continue;
    echoes.push({ label: 'eco grande', dx: m(w.x - x), depthM: m(w.y - WORLD.surfaceY) });
  }
  HUNTS.forEach((h, i) => {
    const den = g.dens[i]!;
    if (!g.hunts[h.id]?.echo || Math.abs(den.x - x) > HUNT_RULES.sonarRange * 2 * sonarMult(g.ship)) return;
    if (!huntOpen(h, g.beasts.gone, g.beasts.team)) return;
    echoes.push({ label: 'eco anomala', dx: m(den.x - x), depthM: m(den.y - WORLD.surfaceY) });
  });
  echoes.sort((a, b) => Math.abs(a.dx) - Math.abs(b.dx));
  return { floorM, echoes };
}

/** For the diary: the region of a hunt by name. */
export function huntRegionName(h: HuntDef): string {
  if (h.region === 'costa') return 'Delta delle Mangrovie';
  return SEA_REGIONS.find((r) => r.id === h.region)?.name ?? h.region;
}

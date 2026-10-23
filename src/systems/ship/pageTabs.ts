// The tabs of a ship's page (owner, 23 ottobre 2026: "fai swipe dalla foto della nave a quella del sottomarino o
// motoscafo e vedo le stat di quello vs sottomarino/motoscafo attuale"): the ship first, then each vehicle in its
// hatches, each with only its own numbers and those to compare them with — the ship in use for the ship, the vehicle
// of the same kind on the ship in use for a vehicle. Pure; ui/shipPage.ts draws them.
import type { BayDef, BayKind, ShipModelDef } from '../../data/fleet';
import { shipStats, type StatRow } from './stats';

export interface PageTab {
  title: string;
  /** Its picture in public/art (it may not be painted yet). */
  card: string;
  rows: StatRow[];
  /** The same rows of what it is compared with (none: nothing to compare). */
  compare: StatRow[];
  /** What it is compared with (null: nothing). */
  compareName: string | null;
}

/** The family a hatch's vehicle belongs to: a speedboat and a jet ski compare with each other. */
const family = (k: BayKind): string => (k === 'jetski' ? 'boat' : k);

const SHIP_GROUP = 'Nave';

/** @param inUse the ship in use (null: none yet); the same ship compares with nothing */
export function pageTabs(m: ShipModelDef, inUse: ShipModelDef | null): PageTab[] {
  const rows = shipStats(m);
  const other = inUse && inUse.id !== m.id ? inUse : null;
  const theirs = other ? shipStats(other) : [];
  const tabs: PageTab[] = [
    {
      title: m.name,
      card: m.card,
      rows: rows.filter((r) => r.group === SHIP_GROUP),
      compare: theirs.filter((r) => r.group === SHIP_GROUP),
      compareName: other?.name ?? null,
    },
  ];
  for (const b of m.bays) {
    const match: BayDef | undefined = other?.bays.find((x) => family(x.kind) === family(b.kind));
    tabs.push({
      title: b.name,
      card: b.card,
      rows: rows.filter((r) => r.group === b.name),
      compare: match ? theirs.filter((r) => r.group === match.name) : [],
      compareName: match?.name ?? null,
    });
  }
  return tabs;
}

// A ship's numbers, comparable (owner, 8 ottobre 2026: "sonar buono" said nothing, and nothing showed why the
// Expedition Hunter 1 is worth 6000 teeth): real values with their units, a share of the best of the fleet for the
// bars, and the difference from the ship in use. Pure; ui/shipStats.ts draws them.
import { SHIP_MODELS, type ShipModelDef } from '../../data/fleet';
import { HUNT_RULES } from '../../data/hunts';
import { HELM, SHIP } from '../../data/ship';
import { WORLD } from '../../data/worldLayout';
import { autonomyKm } from '../fuelBurn';
import { bayRows } from './bayStats';
import { type StatRow } from './statRow';

export type { StatRow } from './statRow';

const one = (v: number): string => (Math.round(v * 10) / 10).toString().replace('.', ',');
/** How far the ship's sonar hears a big beast and a den, in metres. */
export const sonarMetres = (m: ShipModelDef): { big: number; den: number } => ({
  big: Math.round((HUNT_RULES.bigEchoRange * m.sonar.range) / WORLD.unitsPerMetre),
  den: Math.round((HUNT_RULES.sonarRange * m.sonar.range) / WORLD.unitsPerMetre),
});

/** Every comparable number of a ship, then those of the vehicles in its hatches. */
export function shipStats(m: ShipModelDef): StatRow[] {
  const top = m.knots / HELM.knotsPerUnit;
  const s = sonarMetres(m);
  const g = 'Nave';
  const rows: StatRow[] = [
    {
      key: 'knots',
      group: g,
      label: 'Velocità massima',
      value: m.knots,
      text: `${m.knots} nodi`,
      better: 'high',
      unit: 'nodi',
    },
    {
      key: 'accel',
      group: g,
      label: 'Ripresa',
      value: top / m.accel,
      text: `${one(top / m.accel)} s da ferma a tutta velocità`,
      better: 'low',
      unit: 's',
    },
    {
      key: 'brake',
      group: g,
      label: 'Frenata',
      value: top / m.brake,
      text: `${one(top / m.brake)} s per fermarsi`,
      better: 'low',
      unit: 's',
    },
    {
      key: 'tank',
      group: g,
      label: 'Serbatoio',
      value: m.tank,
      text: `${m.tank} L`,
      better: 'high',
      unit: 'L',
    },
    {
      key: 'range',
      group: g,
      label: 'Autonomia',
      value: Math.round(autonomyKm(m.tank, m.perKm)),
      text: `${Math.round(autonomyKm(m.tank, m.perKm))} km a tutto gas (${m.perKm} L/km)`,
      better: 'high',
      unit: 'km',
    },
    {
      key: 'sonar',
      group: g,
      label: 'Sonar',
      value: s.big,
      text: `sente le bestie fino a ${s.big} m e una tana fino a ${s.den} m; distingue ${m.sonar.classes} grandezze di eco`,
      better: 'high',
      unit: 'm',
    },
    {
      key: 'sonarKnots',
      group: g,
      label: 'Sonar in corsa',
      value: m.sonar.maxKnots,
      text: `funziona sotto i ${m.sonar.maxKnots} nodi`,
      better: 'high',
      unit: 'nodi',
    },
    // block 5c: the hull, what mending it costs, the proximity radar
    {
      key: 'hull',
      group: g,
      label: 'Scafo',
      value: m.hull,
      text: `${m.hull} punti`,
      better: 'high',
      unit: 'punti',
    },
    {
      key: 'repair',
      group: g,
      label: 'Riparazione completa',
      value: Math.round(Math.max(SHIP.hull.giftValue, m.price) * SHIP.hull.fullRepairShare),
      text: `${Math.round(Math.max(SHIP.hull.giftValue, m.price) * SHIP.hull.fullRepairShare)} denti a Porto Fango`,
      better: 'low',
      unit: 'denti',
    },
    {
      key: 'radar',
      group: g,
      label: 'Radar',
      value: SHIP.radar.rangeM,
      text: `di prossimità, ${SHIP.radar.rangeM} m oltre prua e poppa, con bip`,
      better: 'none',
      unit: 'm',
    },
    {
      key: 'pool',
      group: g,
      label: 'Vasca',
      value: m.pool,
      text: m.pool ? `${m.pool} posti per la squadra` : 'nessuna',
      better: 'high',
      unit: 'posti',
    },
    {
      key: 'hold',
      group: g,
      label: 'Stiva per le bestie',
      value: m.hold,
      text: m.hold ? `${m.hold} bestie oltre la squadra` : 'nessuna: solo la squadra',
      better: 'high',
      unit: 'bestie',
    },
    {
      key: 'length',
      group: g,
      label: 'Lunghezza',
      value: m.lengthM,
      text: `${Math.round(m.lengthM * 0.95)} m`,
      better: 'none',
      unit: 'm',
    },
  ];
  // the Krill Hunter's mouth (10 ottobre)
  if (m.art?.mouth)
    rows.push({
      key: 'mouth',
      group: g,
      label: 'Bocca luminosa',
      value: SHIP.mouth.maxSardines,
      text: `attira e mangia fino a ${SHIP.mouth.maxSardines} sardine, poi ricarica ${Math.round(SHIP.mouth.rechargeSeconds / 60)} min`,
      better: 'high',
      unit: 'sardine',
    });
  // a U-Boat dives itself (block 4c)
  if (m.dive)
    rows.push({
      key: 'dive',
      group: g,
      label: 'Immersione',
      value: m.dive.maxDepthM,
      text: `fino a ${m.dive.maxDepthM} m per ${Math.round(m.dive.airSeconds / 60)} minuti`,
      better: 'high',
      unit: 'm',
    });
  rows.push(...bayRows(m)); // the vehicles in its hatches (bayStats.ts)
  return rows;
}

/** The bar of a row: 1 = the best of the ships that have it (the fastest, the quickest to get going…). */
export function statShare(row: StatRow): number {
  const all = SHIP_MODELS.flatMap((m) =>
    shipStats(m)
      .filter((r) => r.key === row.key)
      .map((r) => r.value),
  );
  if (!all.length || row.better === 'none') return Math.min(1, row.value / Math.max(1e-9, ...all));
  if (row.better === 'high') return row.value / Math.max(1e-9, ...all);
  return Math.min(...all) / Math.max(1e-9, row.value);
}

/** The difference from the same row of the ship in use (null: nothing to compare), and whether it is better. */
export function statDiff(row: StatRow, inUse: StatRow[]): { text: string; good: boolean | null } | null {
  const o = inUse.find((r) => r.key === row.key);
  if (!o || row.better === 'none') return null;
  const d = row.value - o.value;
  if (Math.abs(d) < 0.05) return { text: 'uguale', good: null };
  if (row.key === 'sub.sonar') return { text: d > 0 ? 'in più' : 'in meno', good: d > 0 };
  const shown = Math.abs(d) < 10 && !Number.isInteger(d) ? one(Math.abs(d)) : String(Math.round(Math.abs(d)));
  const good = row.better === 'high' ? d > 0 : d < 0;
  return { text: `${d > 0 ? '+' : '−'}${shown}${row.unit ? ` ${row.unit}` : ''}`, good };
}

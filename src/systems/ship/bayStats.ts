// The rows of a ship's card for the vehicles in its hatches: the submarine, the speedboat or jet ski (split from
// stats.ts in the cleanup of 19 ottobre 2026). Pure; stats.ts adds them after the ship's own.
import { BOAT_MODELS } from '../../data/boats';
import { type ShipModelDef } from '../../data/fleet';
import { SHIP } from '../../data/ship';
import { SUB_MODELS } from '../../data/submarine';
import { knots, type StatRow } from './statRow';

/** Every comparable number of the vehicles in a ship's hatches. */
export function bayRows(m: ShipModelDef): StatRow[] {
  const rows: StatRow[] = [];
  for (const b of m.bays) {
    const sub = b.kind === 'sub' ? SUB_MODELS.find((x) => x.id === b.model) : undefined;
    const boat = BOAT_MODELS.find((x) => x.id === b.model);
    if (sub) {
      const v = b.name;
      rows.push(
        {
          key: 'sub.speed',
          group: v,
          label: 'Velocità',
          value: knots(sub.speed),
          text: `${knots(sub.speed)} nodi`,
          better: 'high',
          unit: 'nodi',
        },
        {
          key: 'sub.depth',
          group: v,
          label: 'Profondità',
          value: sub.maxDepthM,
          text: `fino a ${sub.maxDepthM} m`,
          better: 'high',
          unit: 'm',
        },
        {
          key: 'sub.hull',
          group: v,
          label: 'Scafo',
          value: sub.hull,
          text: `${sub.hull} punti`,
          better: 'high',
          unit: 'punti',
        },
        {
          key: 'sub.tank',
          group: v,
          label: 'Serbatoio',
          value: sub.tank,
          text: `${sub.tank} L`,
          better: 'high',
          unit: 'L',
        },
        {
          key: 'sub.sonar',
          group: v,
          label: 'Sonar',
          value: sub.scope?.rangeM ?? 0,
          text: sub.scope
            ? `a 360° sul vetro, fino a ${sub.scope.rangeM} m, ${sub.scope.classes} grandezze`
            : 'no',
          better: 'high',
          unit: 'm',
        },
        {
          key: 'sub.remote',
          group: v,
          label: 'Da remoto',
          value: sub.recon || sub.remoteTracker ? 1 : 0,
          text: sub.recon
            ? 'ricognizione di tutte le bestie a portata del sonar'
            : sub.remoteTracker
              ? 'pianta il tracker a una bestia scelta sul sonar'
              : 'no',
          better: 'none',
          unit: '',
        },
        {
          key: 'sub.parts',
          group: v,
          label: 'Ricambi',
          value: SHIP.hull.partsSub,
          text: `porta ${SHIP.hull.partsSub} punti di ricambi per la nave`,
          better: 'high',
          unit: 'punti',
        },
      );
    } else if (boat) {
      const v = b.name;
      rows.push(
        {
          key: 'boat.speed',
          group: v,
          label: 'Velocità',
          value: boat.knots,
          text: `${boat.knots} nodi`,
          better: 'high',
          unit: 'nodi',
        },
        {
          key: 'boat.tank',
          group: v,
          label: 'Serbatoio',
          value: boat.tank,
          text: `${boat.tank} L`,
          better: 'high',
          unit: 'L',
        },
        {
          key: 'boat.drums',
          group: v,
          label: 'Fusti',
          value: boat.drums,
          text: `${boat.drums} L di carburante per la nave`,
          better: 'high',
          unit: 'L',
        },
        {
          key: 'boat.parts',
          group: v,
          label: 'Ricambi',
          value: SHIP.hull.partsBoat,
          text: `porta ${SHIP.hull.partsBoat} punti di ricambi per la nave`,
          better: 'high',
          unit: 'punti',
        },
      );
    } else
      rows.push({
        key: `bay.${b.kind}`,
        group: b.name,
        label: 'In arrivo',
        value: 0,
        text: 'arriverà con le prossime versioni',
        better: 'none',
        unit: '',
      });
  }
  return rows;
}

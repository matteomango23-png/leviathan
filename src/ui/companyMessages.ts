// The HUD's messages for the Compagnia dell'Olio Nero at sea (systems/company/): when a vessel grows wary or hunts
// you, when one sinks, your gun with nothing in reach, Silence on and off.
import type { GameEvent } from '../systems/events';

/** Its message; undefined when the event is not one of the Compagnia's. */
export function companyMessage(e: GameEvent): [string, number] | null | undefined {
  switch (e.type) {
    case 'enemyAlert':
      if (e.phase === 'suspicious') return ['Una nave della Compagnia ha notato qualcosa: sta cercando.', 3];
      if (e.phase === 'hunting') return ['Ti hanno visto! La Compagnia ti dà la caccia.', 3];
      if (e.phase === 'lost') return ['Ti hanno perso di vista: cercano dove eri.', 3];
      return null;
    case 'enemySunk':
      return [`${e.name} spezzata in due: affonda!`, 3.5];
    case 'noTarget':
      return [e.weapon === 'siluro' ? 'Nessuna nave davanti a tiro di siluro.' : 'Nessuna nave a tiro.', 2];
    case 'silence':
      return e.on
        ? ['Silenzio: motore e luci spenti. Vai piano, così non ti sentono.', 3.5]
        : ['Motore acceso: ora ti sentono di nuovo.', 2.5];
    case 'hullHit':
      if (e.side !== 'you') return null;
      return e.zone === 'waterline'
        ? ['Falla nello scafo: imbarchi acqua!', 2.5]
        : ['Incendio a bordo! Il cannone è fermo per qualche secondo.', 2.5];
    default:
      return undefined;
  }
}

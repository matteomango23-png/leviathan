// The HUD's messages for the vehicles and the sea's hunts (split from eventMessages.ts in the cleanup of 19 ottobre
// 2026): the boat, the submarine, the ship and its gadgets, the rumours, echoes and traces.
import { BOAT_TEXT } from '../data/boats';
import { SHIP_TEXT } from '../data/ship';
import { SUB_TEXT } from '../data/submarine';
import type { GameEvent } from '../systems/events';
import type { GameState } from '../systems/game';

/** A vehicle's or a hunt's message; undefined when the event is not one of theirs. */
export function vehicleMessage(e: GameEvent, g: GameState): [string, number] | null | undefined {
  switch (e.type) {
    case 'boatCapsized':
      return ['Ribaltato dall’onda! La barca si raddrizza, ma lo scafo ne risente.', 3.5];
    case 'boatHullHalf':
      return ['Il mare grosso sta rovinando lo scafo della barca: rallenta o torna alla nave.', 4];
    case 'vehicleSinking':
      return [
        e.vehicle === 'boat' ? 'Il motoscafo è a pezzi e affonda…' : 'Il sottomarino è a pezzi e affonda…',
        2,
      ];
    case 'boatWrecked':
      return ['Lo scafo della barca ha ceduto: torna alla nave e va riparato al porto.', 5];
    case 'boatRepaired':
      return [`Scafo della barca riparato (${e.cost} denti).`, 3];
    case 'boatBroken':
      return ['La barca è rotta: si ripara al porto.', 3.5];
    case 'boatLeft':
      return ['La barca resta qui ad aspettarti: torna vicino e premi "A bordo".', 3];
    case 'boatBoarded':
      return ['Di nuovo alla guida.', 2];
    case 'boarded':
      return [SUB_TEXT.boarded, 4];
    case 'dove':
      return g.ship.owned && g.ship.bay !== 'out' && !g.sub.aboard
        ? ['La nave resta qui ad aspettarti.', 2]
        : ['Il sottomarino resta qui ad aspettarti.', 2];
    case 'shipGiven':
      return [SHIP_TEXT.given, 7];
    case 'shipBoarded':
      return [SHIP_TEXT.aboard, 4];
    case 'rumourHeard':
      return [`Una voce al porto: ${e.name}. È scritta nel Diario di caccia (cockpit).`, 4];
    case 'echoFound':
      return [`Sonar: un’eco anomala, enorme, a ${e.depthM} m. Cala il sottomarino e cerca le tracce.`, 5];
    case 'tracesFound':
      return [`Tracce: ${e.text}`, 5];
    case 'outpostFound':
      return [`Hai trovato l’${e.name}: attracca qui per curarti, fare rifornimento e comprare.`, 5];
    case 'landmarkFound':
      return [`Hai scoperto: ${e.name}. Ora è segnato sulla mappa.`, 5];
    case 'reconStart':
      return ['Drone in ricognizione: va da tutti gli animali a portata del sonar.', 3.5];
    case 'reconEmpty':
      return ['Il sonar non sente animali: il drone resta nella stiva.', 3.5];
    case 'reconDone':
      return [
        `Il drone è tornato: resoconto pronto, ${e.count} animali. Leggilo nel Cockpit, scheda Drone.`,
        4,
      ];
    case 'sphereGo':
      return [`La sfera parte verso: ${e.name}.`, 3];
    case 'sphereHold':
      return [`La sfera blocca ${e.name} per ${Math.round(e.seconds)} secondi.`, 4];
    case 'sphereFree':
      return [`${e.name} si libera: la sfera torna alla nave.`, 3.5];
    case 'sphereCharging': {
      const s = Math.ceil(e.seconds);
      return [`Sfera in ricarica: ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}.`, 3];
    }
    case 'sphereBusy':
      return ['La sfera è già fuori.', 2.5];
    case 'targetSet':
      return [`Bussola su: ${e.name}. Immergiti e seguila.`, 3.5];
    case 'targetLost':
      return [`Traccia persa: ${e.name}.`, 3.5];
    case 'scanDone':
      return [
        e.known
          ? `Sonar: analisi finita. È ${e.text}. Annotato nel Diario.`
          : `Sonar: analisi finita. ${e.text}: una bestia che non hai mai visto. Annotata nel Diario.`,
        4,
      ];
    case 'shipHullHalf':
      return ['Lo scafo della nave è a metà: riparalo a Porto Fango.', 4];
    case 'shipBroken':
      return [
        'La nave è in avaria: prendi i ricambi a Porto Fango col motoscafo o col sottomarino, oppure chiama il rimorchiatore col razzo.',
        7,
      ];
    case 'shipRammed':
      return ['Una bestia gigante sperona la nave!', 2.5];
    case 'shipMended':
      return [
        e.by === 'parts'
          ? `Ricambi montati: scafo +${Math.round(e.points)}.`
          : `Nave riparata: scafo +${Math.round(e.points)}.`,
        3,
      ];
    case 'droneTrackerHint':
      return [
        'Drone pronto. Per il tracker a distanza: Cockpit → Sonar, tocca un’eco e premi «Manda il drone: tracker». Oppure «Cala drone» per guidarlo tu.',
        6,
      ];
    case 'droneTrackerOut':
      return [`Il drone parte verso ${e.name}: le pianta il tracker e torna.`, 3.5];
    case 'mouthFull':
      return [
        `La balena è sazia (${e.eaten} sardine): riprende a mangiare tra qualche minuto. Lasciala aperta, o chiudila per ripartire.`,
        5,
      ];
    case 'mouthOpen':
      return ['La balena apre la bocca: la luce attira le sardine, e le bestie curiose.', 4];
    case 'mouthShut':
      return [e.eaten > 0 ? `La bocca si chiude: ${e.eaten} sardine nella sacca.` : 'La bocca si chiude.', 4];
    case 'mouthNo':
      return ['La bocca si apre solo a nave ferma.', 3];
    case 'lightOn':
      return [
        'Luce subacquea accesa: le bestie curiose si avvicinano alla nave. Restare a lungo attira anche i predatori.',
        4.5,
      ];
    case 'lightOff':
      return ['Luce subacquea spenta.', 2.5];
    case 'lightNo':
      return ['La luce subacquea si accende solo a nave ferma, con il carburante.', 3];
    case 'lightHunters':
      return ['Sotto la luce arrivano anche i predatori.', 3.5];
    case 'scanLost':
      return ['Sonar: eco persa, analisi interrotta.', 3];
    case 'trackerHit':
      return [`Tracker piantato: ${e.name}. La bussola la segue per 30 minuti.`, 4];
    case 'trackerExpired':
      return [`Il tracker si è spento: traccia di ${e.name} finita.`, 3.5];
    case 'harbourApproach':
      return ['In avvicinamento a Porto Fango: la nave rallenta da sola per attraccare.', 3.5];
    case 'shipWest':
      return [
        'La nave non va più a ovest del porto di Porto Fango: da qui prosegui col sottomarino o a nuoto.',
        4,
      ];
    case 'shipAground':
      return ['Fondale troppo basso: la nave qui non passa.', 3];
    case 'seaEnd':
      return ['Oltre l’Abisso del Leviatano c’è solo tempesta: il mare conosciuto finisce qui.', 4];
    case 'shipHint':
      return [SHIP_TEXT[e.text], 2.5];
    case 'fuelOut':
      if (e.vehicle === 'boat') return [BOAT_TEXT.dry, 4];
      return [e.vehicle === 'ship' ? SHIP_TEXT.fuelOutShip : SHIP_TEXT.fuelOutSub, 5];
    case 'boatLaunched':
    case 'boatDocked':
      return [e.text, 4];
    case 'boatIce':
      return [BOAT_TEXT.ice, 3];
    case 'subAir':
      return ['Aria del sottomarino per 30 secondi: risali!', 4];
    case 'subSurfacing':
      return ['Aria finita: risali subito o esci, stai soffocando!', 4];
    case 'subFlooded':
      return ['Lo scafo ha ceduto e l’acqua entra: risali o esci, o perderai i cuori!', 4];
    case 'diveAir':
      return ['Aria per 30 secondi: risali con la leva!', 4];
    case 'diveSurfacing':
      return ['Aria finita: risali con la leva, stai soffocando!', 4];
    case 'diveTooDeep':
      return ['Più giù lo scafo non regge.', 2.5];
    case 'rescued':
      return [SHIP_TEXT.rescued(e.where, e.teeth), 5];
    case 'subLaunched':
      return [SHIP_TEXT.launched, 4];
    case 'subDocked':
      return [SHIP_TEXT.docked, 3];
    case 'subRammed':
      if (e.by === 'pressure') return [SUB_TEXT.crushed(e.hull, e.max), 2];
      return e.by === 'rock' ? [SUB_TEXT.bumped, 1.5] : [SUB_TEXT.rammed(e.hull, e.max), 2];
    case 'subRecovered':
      return [SHIP_TEXT.subRecovered(e.toShip), 5];
    case 'subWrecked':
      return [e.toShip ? SHIP_TEXT.wreckedToShip(e.teeth) : SUB_TEXT.wrecked(), 6];
    case 'subRepaired':
      return [SUB_TEXT.repaired(e.cost), 3];
    case 'subTooDeep':
      return [SUB_TEXT.tooDeep, 3];
    default:
      return undefined;
  }
}

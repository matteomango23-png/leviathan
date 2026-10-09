// The short message the HUD shows for a game event (Italian), and for how long.
import { FEMININE_SPECIES } from '../data/battleText';
import { BOAT_TEXT } from '../data/boats';
import { BATTLE_MOVE_BY_ID } from '../data/battleMoves';
import { PROGRESSION } from '../data/rules';
import { SHIP_TEXT } from '../data/ship';
import { SUB_TEXT } from '../data/submarine';
import { TEMPLE_TEXT } from '../data/temples';
import { FISH, ITEMS, SWARMS, WEAPONS } from '../data/world';
import { SPECIES } from '../data/species';
import { BONE_TEXT } from '../data/scenery';
import { missionById } from '../systems/economy/missions';
import type { GameEvent } from '../systems/events';
import type { GameState } from '../systems/game';
import { formName } from '../systems/beasts/forms';
import { canRide } from '../systems/beastPlay';

const fishName = (id: string): string =>
  FISH.find((f) => f.id === id)?.name ??
  SPECIES.find((s) => s.id === id)?.name ??
  SWARMS.find((s) => s.id === id)?.name ??
  id;
const itemName = (id: string): string => ITEMS.find((i) => i.id === id)?.name ?? id;
const weaponName = (id: string): string => WEAPONS.find((w) => w.id === id)?.name ?? id;

export function messageFor(e: GameEvent, g: GameState): [string, number] | null {
  const wild = (id: number) => g.beasts.wilds.find((w) => w.id === id);
  const tamed = (uid: string) => g.beasts.team.find((b) => b.uid === uid);
  switch (e.type) {
    case 'creatureSeen':
      return [`Nuova creatura nel bestiario: ${fishName(e.id)}`, 2.6];
    case 'fishCaught':
      return [
        e.healed
          ? `${fishName(e.fishId)}. Un cuore recuperato.`
          : `${fishName(e.fishId)} nella sacca (${g.gear.bag[e.fishId] ?? 0})`,
        1.6,
      ];
    case 'oxygenLow':
      return ['Ossigeno basso. Risali in superficie!', 2.6];
    case 'died':
      return [
        g.ship.owned ? 'Ti risvegli sulla tua nave.' : 'Il mare ti ha respinto: ti risvegli al porto.',
        3,
      ];
    case 'wildAppeared': {
      const w = wild(e.id);
      if (!w) return null;
      if (e.legend)
        return [
          `Qualcosa di antico si muove nel buio… ${formName(w.form)}! Ne esiste una sola: se la sconfiggi sparisce per sempre.`,
          6,
        ];
      if (e.danger)
        return [
          `⚠ Pericolo: ${formName(w.form)} Lv ${w.level}. È molto più forte della tua squadra: meglio evitarlo.`,
          4.5,
        ];
      return e.rare ? [`Qualcosa brilla nel buio: ${formName(w.form)}! Raggiungilo e sfidalo.`, 4] : null;
    }
    case 'beastSensed': {
      const b = tamed(e.uid);
      const w = wild(e.wildId);
      if (!b || !w) return null;
      const side = e.side < 0 ? 'a sinistra' : 'a destra';
      // it names the beasts you already know; a rare one it feels as "something that shines"
      const what =
        w.form.variant !== 'comune' || w.form.unique
          ? 'qualcosa di raro'
          : g.seen.has(w.form.speciesId)
            ? formName(w.form)
            : 'qualcosa';
      return [`${formName(b.form)} si agita: ${what} nel buio ${side}.`, 2.6];
    }
    case 'ventBreath':
      return ['Uno sfiatatoio: respiri le bolle che salgono dal fondale.', 3];
    case 'boatCapsized':
      return ['Ribaltato dall’onda! La barca si raddrizza, ma lo scafo ne risente.', 3.5];
    case 'boatHullHalf':
      return ['Il mare grosso sta rovinando lo scafo della barca: rallenta o torna alla nave.', 4];
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
      return ['Aria finita: il sottomarino risale da solo.', 4];
    case 'diveAir':
      return ['Aria per 30 secondi: risali con la leva!', 4];
    case 'diveSurfacing':
      return ['Aria finita: l’U-Boat risale da solo.', 4];
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
    case 'subWrecked':
      return [e.toShip ? SHIP_TEXT.wreckedToShip(e.teeth) : SUB_TEXT.wrecked(e.teeth), 6];
    case 'bagFull':
      return [
        'Sacca piena: vendi i pesci al porto. Quelli che prendi ora curano e nutrono, ma non li tieni.',
        4.5,
      ];
    case 'subRepaired':
      return [SUB_TEXT.repaired(e.cost), 3];
    case 'subTooDeep':
      return [SUB_TEXT.tooDeep, 3];
    case 'legendGone':
      return [`${e.name} è sconfitta: non tornerà mai più nel mare.`, 5];
    case 'noTeam':
      return null; // the blackout message says it all
    case 'blackout':
      return [
        `La tua squadra è tutta KO: perdi i sensi. Ti risvegli ${e.place} con le bestie curate${e.teethLost ? `. Hai perso ${e.teethLost} denti` : ''}.`,
        5,
      ];
    case 'battleLost':
      return ['La tua squadra è sfinita. Curala al porto o sulla nave.', 3.5];
    case 'tamed': {
      const b = tamed(e.uid);
      return b
        ? [
            e.toTeam
              ? `${formName(b.form)} entra nella tua squadra!`
              : `${formName(b.form)} va in riserva: la squadra è piena.`,
            3.5,
          ]
        : null;
    }
    case 'cannotRide': {
      const b = tamed(e.uid);
      if (!b) return null;
      return [
        e.ko
          ? `${formName(b.form)} è sfinito: curalo prima.`
          : `${formName(b.form)} non si cavalca: combatte in battaglia.`,
        2.6,
      ];
    }
    case 'summoned': {
      const b = tamed(e.uid);
      if (!b) return null;
      const how = canRide(b) ? 'arriva dal buio: sali in sella.' : 'arriva e nuota con te.';
      return [`${formName(b.form)} ${how}`, 1.8];
    }
    case 'beastKo': {
      const b = tamed(e.uid);
      return b ? [`${formName(b.form)} è sfinito. Curalo al porto o sulla nave.`, 3] : null;
    }
    case 'levelUp': {
      const b = tamed(e.uid);
      const move = e.move ? ` Nuova mossa: ${e.move}.` : '';
      return b ? [`${formName(b.form)} sale al livello ${e.level}!${move}`, e.move ? 4 : 2.4] : null;
    }
    case 'moveWaiting': {
      const b = tamed(e.uid);
      // already chosen (at the end of the battle): nothing to say
      const waiting = b?.pendingMoves?.some((id) => BATTLE_MOVE_BY_ID[id]?.name === e.move);
      return b && waiting
        ? [`${formName(b.form)} vuole imparare ${e.move}: apri la sua scheda in Squadra per scegliere.`, 4]
        : null;
    }
    case 'evolveReady': {
      const b = tamed(e.uid);
      return b && b.evolveReady
        ? [
            `${formName(b.form)} è pront${FEMININE_SPECIES.includes(b.form.speciesId) ? 'a' : 'o'} a evolversi: apri la sua scheda in Squadra.`,
            4,
          ]
        : null;
    }
    case 'evolved': {
      const b = tamed(e.uid);
      return b ? [`${e.from} si evolve in ${formName(b.form)}!`, 4.5] : null;
    }
    case 'finalForm': {
      const b = tamed(e.uid);
      return b ? [`Forma finale: ${formName(b.form)}!`, 4.5] : null;
    }
    case 'beastFed': {
      const b = tamed(e.uid);
      return b
        ? [
            `${formName(b.form)} mangia per crescere (${e.food}/${PROGRESSION.nourishmentPerGrowthLevel}).`,
            1.6,
          ]
        : null;
    }
    case 'storyNote':
      return [e.text, 5];
    case 'bonesHint': {
      const b = e.breakerUid ? tamed(e.breakerUid) : undefined;
      return b
        ? [
            `Ossa antiche. ${formName(b.form)} conosce Sfondamento: chiamalo dalla barra in alto e premi Sfonda.`,
            4.5,
          ]
        : [BONE_TEXT.hint, 5];
    }
    case 'bonesBroken':
      return ['Le ossa antiche cedono!', 1.5];
    case 'gateOpened':
      return null; // its storyNote says it
    case 'relicFound':
      return [`${TEMPLE_TEXT.relic(e.name)} ${e.text}`, 6];
    case 'swarmBound':
      return ['Lo sciame di sardine ti segue! Mettilo nello zaino al porto per chiamarlo.', 4];
    case 'swarmSummoned':
      return ['Un muro di sardine ti nasconde: le bestie non ti vedono.', 2];
    case 'itemUsed':
      return [`${itemName(e.id)} usato.`, 1.4];
    case 'tooDeep':
      return ['La pressione sale: la muta non regge questa profondità. Risali!', 3];
    case 'rideAirOut':
      return [`${e.name} ha finito l'aria: ora respiri la tua. Risali a prendere fiato!`, 4];
    case 'missionComplete':
      return [`Missione compiuta: ${missionById(e.id)?.title ?? ''}. Riscuoti i denti al porto.`, 3.5];
    case 'wreckOpened': {
      const parts = [
        e.weapon ? `hai trovato: ${weaponName(e.weapon)}` : '',
        e.teeth ? `${e.teeth} denti` : '',
        e.item ? itemName(e.item) : '',
      ].filter(Boolean);
      return [`Tesoro! ${parts.join(', ')}.${e.weapon ? ' Mettila nello zaino al porto.' : ''}`, 4];
    }
    default:
      return null;
  }
}

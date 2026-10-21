// The short message the HUD shows for a game event (Italian), and for how long.
import { FEMININE_SPECIES } from '../data/battleText';
import { BATTLE_MOVE_BY_ID } from '../data/battleMoves';
import { PROGRESSION } from '../data/rules';
import { TEMPLE_TEXT } from '../data/temples';
import { FISH, ITEMS, SWARMS, WEAPONS } from '../data/world';
import { SPECIES } from '../data/species';
import { BONE_TEXT } from '../data/scenery';
import { missionById } from '../systems/economy/missions';
import type { GameEvent } from '../systems/events';
import type { GameState } from '../systems/game';
import { formName } from '../systems/beasts/forms';
import { canRide } from '../systems/beastPlay';
import { vehicleMessage } from './vehicleMessages';

const fishName = (id: string): string =>
  FISH.find((f) => f.id === id)?.name ??
  SPECIES.find((s) => s.id === id)?.name ??
  SWARMS.find((s) => s.id === id)?.name ??
  id;
const itemName = (id: string): string => ITEMS.find((i) => i.id === id)?.name ?? id;
const weaponName = (id: string): string => WEAPONS.find((w) => w.id === id)?.name ?? id;

export function messageFor(e: GameEvent, g: GameState): [string, number] | null {
  const vehicle = vehicleMessage(e, g); // the boat, the submarine, the ship, the hunts (vehicleMessages.ts)
  if (vehicle !== undefined) return vehicle;
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
    // which beasts are about is not announced any more (owner, 10 ottobre: "una cosa che non serve"): the
    // sonar, the light and your own eyes tell you
    case 'wildAppeared':
    case 'beastSensed':
      return null;
    case 'ventBreath':
      return ['Uno sfiatatoio: respiri le bolle che salgono dal fondale.', 3];
    case 'legendGone':
      return [`${e.name} è sconfitta: torna ferita nella sua tana. Tornerà più avanti.`, 5];
    case 'noTeam':
      return null; // the blackout message says it all
    case 'blackout':
      return [
        `La tua squadra è tutta KO: perdi i sensi. Ti risvegli ${e.place} con le bestie curate${e.teethLost ? `. Hai perso ${e.teethLost} denti` : ''}.`,
        5,
      ];
    case 'mountStunned':
      return [
        e.count > 1 ? 'La scarica stordisce le bestie vicine!' : 'La scarica stordisce la bestia vicina!',
        2,
      ];
    case 'diverWorn':
      return ['Sei senza fiato: niente scatti finché non riprendi le forze.', 3];
    case 'mountWorn':
      return [`${e.name} non ce la fa più: va piano finché non si riprende.`, 3.5];
    case 'birdEaten':
      return [
        e.healed > 0
          ? `Gabbiano preso al volo, in sacca! +${e.healed} PS`
          : 'Gabbiano preso al volo, in sacca!',
        2,
      ];
    case 'battleLost':
      return ['La tua squadra è sfinita. Curala al porto o sulla nave.', 3.5];
    case 'tamed': {
      const b = tamed(e.uid);
      return b
        ? [
            e.toTeam
              ? `${formName(b.form)} entra nella tua squadra!`
              : b.aboard
                ? `${formName(b.form)} va nella stiva della nave: la squadra è piena.`
                : `${formName(b.form)} va al Recinto del porto: la squadra è piena e la nave non ha posto.`,
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
      return [e.ice ? 'Il ghiaccio va in pezzi!' : 'Le ossa antiche cedono!', 1.5];
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

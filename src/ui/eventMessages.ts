// The short message the HUD shows for a game event (Italian), and for how long.
import { PROGRESSION } from '../data/rules';
import { FISH, ITEMS, SWARMS, WEAPONS } from '../data/world';
import { SPECIES } from '../data/species';
import { STORY_NOTES } from '../data/story';
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
        g.sanctuaries.current === null
          ? 'Il mare ti ha respinto in superficie.'
          : 'Ti risvegli al santuario.',
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
    case 'boatGiven':
      return [
        'Aurelio ti lascia la sua barca: è ormeggiata accanto al molo di Portofosco. Sali quando sei in superficie vicino a lei.',
        6,
      ];
    case 'boarded':
      return [
        'Sei sulla tua barca: tu e la squadra riposate. Naviga col joystick, Pesca col pulsante, Tuffati per scendere.',
        4,
      ];
    case 'dove':
      return ['La barca resta qui all\u2019ancora.', 2];
    case 'lineCast':
      return ['Lenza in acqua… aspetta che abbocchi.', 2];
    case 'fishBite':
      return ['Abbocca! Tocca Pesca, presto!', 1];
    case 'fishEscaped':
      return ['Il pesce è scappato.', 1.6];
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
      return ['La tua squadra è sfinita. Curala a un santuario.', 3.5];
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
      return b ? [`${formName(b.form)} è sfinito. Curalo a un santuario.`, 3] : null;
    }
    case 'levelUp': {
      const b = tamed(e.uid);
      const move = e.move ? ` Nuova mossa: ${e.move}.` : '';
      return b ? [`${formName(b.form)} sale al livello ${e.level}!${move}`, e.move ? 4 : 2.4] : null;
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
    case 'guardianAppeared':
      return ['Lo Sfregiato! Il Guardiano della Baia esce dal buio.', 3.5];
    case 'guardianBeaten':
      return [
        e.teeth
          ? `Guardiano sconfitto! +${e.teeth} denti, e c’è di nuovo un Arpione mitico al mercato.`
          : 'Guardiano sconfitto!',
        5,
      ];
    case 'guardianLeft':
      return ['Lo Sfregiato torna nel buio della sua tana.', 3];
    case 'sanctuaryReached':
      return ['Santuario raggiunto: rinascerai qui. Resta fermo per curarti.', 3];
    case 'bonesHint': {
      const b = e.breakerUid ? tamed(e.breakerUid) : undefined;
      return b
        ? [
            `Ossa antiche. ${formName(b.form)} conosce Sfondamento: chiamalo dalla barra in alto e premi Sfonda.`,
            4.5,
          ]
        : [STORY_NOTES.boneHint, 5];
    }
    case 'bonesBroken':
      return ['Le ossa antiche cedono!', 1.5];
    case 'swarmBound':
      return ['Lo sciame di sardine ti segue! Mettilo nello zaino al porto per chiamarlo.', 4];
    case 'swarmSummoned':
      return ['Un muro di sardine ti nasconde: le bestie non ti vedono.', 2];
    case 'itemUsed':
      return [`${itemName(e.id)} usato.`, 1.4];
    case 'tooDeep':
      return ['La muta non regge questa profondità: serve una muta migliore.', 3];
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

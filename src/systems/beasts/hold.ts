// Where each tamed beast is (owner, 16 ottobre 2026: "nei menu solo i 5 che hai con te"; "anche nella barca ti puoi
// portare un tot massimo di animali"; "il recinto al porto per forza"): in the team (up to PROGRESSION.teamSize), in
// the ship's hold (as many as its model carries, ShipModelDef.hold), or waiting at a harbour's pen. From the helm you
// change places between team and hold; at a harbour the pen too, and the hold only with the ship moored there.
// Pure logic.
import { PROGRESSION } from '../../data/rules';
import { shipModel } from '../ship/model';
import { teamMembers, type TeamBeast } from './team';

export type Place = 'team' | 'hold' | 'pen';

interface HoldWorld {
  ship: { owned: boolean; model: string };
  beasts: { team: TeamBeast[]; mount?: { uid: string } | null; pack?: { uid: string }[] };
}

export const placeOf = (b: TeamBeast): Place => (b.inTeam ? 'team' : b.aboard ? 'hold' : 'pen');

/** How many beasts the ship's hold carries (none without a ship). */
export const holdSize = (g: HoldWorld): number => (g.ship.owned ? shipModel(g.ship).hold : 0);

export const inPlace = (g: HoldWorld, p: Place): TeamBeast[] => g.beasts.team.filter((b) => placeOf(b) === p);

/** Free places in the hold. */
export const holdRoom = (g: HoldWorld): number => Math.max(0, holdSize(g) - inPlace(g, 'hold').length);

/** Where you can move beasts from here: at the helm the team and the hold; at a harbour the pen too, and the hold
 *  only with the ship moored there. */
export function reachable(where: 'ship' | 'port', shipHere: boolean): Place[] {
  return where === 'ship' ? ['team', 'hold'] : shipHere ? ['team', 'hold', 'pen'] : ['team', 'pen'];
}

/** Why a beast cannot go there (null: it can). */
export function cannotMove(g: HoldWorld, b: TeamBeast, to: Place, open: readonly Place[]): string | null {
  const from = placeOf(b);
  if (from === to) return 'È già lì.';
  if (!open.includes(from) || !open.includes(to)) return 'Da qui non ci arrivi.';
  if (g.beasts.mount?.uid === b.uid || g.beasts.pack?.some((m) => m.uid === b.uid))
    return 'È in acqua: richiamala prima.';
  if (to === 'team' && teamMembers(g.beasts.team).length >= PROGRESSION.teamSize) return 'Squadra piena.';
  if (to === 'hold' && holdRoom(g) <= 0) return holdSize(g) ? 'Stiva piena.' : 'Questa nave non ha posti.';
  if (from === 'team' && teamMembers(g.beasts.team).length <= 1) return 'Ti serve almeno una bestia con te.';
  return null;
}

export function moveBeast(g: HoldWorld, uid: string, to: Place, open: readonly Place[]): boolean {
  const b = g.beasts.team.find((x) => x.uid === uid);
  if (!b || cannotMove(g, b, to, open)) return false;
  b.inTeam = to === 'team';
  b.aboard = to === 'hold' ? true : undefined;
  return true;
}

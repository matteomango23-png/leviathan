// Aurelio's gifts without playing the start (story.ts): the ship at Porto Fango with the submarine in its hold,
// or the submarine alone.
import { PORTO_FANGO } from '../../src/data/economy';
import { SUBMARINE } from '../../src/data/submarine';
import type { GameState } from '../../src/systems/game';
import { giftShip } from '../../src/systems/ship/ship';
import { giftSub } from '../../src/systems/submarine';

export function giveVessels(g: GameState): void {
  g.story.step = 'free';
  giftSub(g.sub, PORTO_FANGO.shipDock);
  giftShip(g, []);
}

export const giveSub = (g: GameState, x = SUBMARINE.mooredX): void => giftSub(g.sub, x);

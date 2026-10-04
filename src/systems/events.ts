// Things that happened during a game step. Scenes turn them into sounds, toasts and effects.

import type { DialogueId, StoryStep } from '../data/story';

export type GameEvent =
  | { type: 'hurt' }
  | { type: 'died' }
  | { type: 'respawned' }
  | { type: 'oxygenLow' }
  | { type: 'dash'; x: number; y: number }
  | { type: 'bubble'; x: number; y: number }
  | { type: 'harpoonFired' }
  | { type: 'harpoonHitRock'; x: number; y: number }
  | { type: 'fishCaught'; fishId: string; count: number; healed: boolean }
  | { type: 'creatureSeen'; id: string }
  | { type: 'zoneEntered'; name: string }
  // wild beasts and battles
  | { type: 'wildAppeared'; id: number; rare: boolean; legend?: boolean }
  /** A legend defeated: gone from the sea forever. */
  | { type: 'legendGone'; name: string }
  | { type: 'battleStart'; id: number; first: 'you' | 'foe' | 'normal' }
  | { type: 'battleWon'; speciesId: string }
  | { type: 'battleLost' }
  | { type: 'battleFled' }
  | { type: 'noTeam' } // a beast touched you with every beast of yours KO: you black out (blackout)
  | { type: 'blackout'; teethLost: number; place: string }
  // story
  | { type: 'storyStep'; step: StoryStep }
  | { type: 'dialogueOpened'; id: DialogueId }
  | { type: 'storyNote'; text: string }
  // Guardians
  | { type: 'guardianAppeared'; id: number }
  | { type: 'guardianBeaten'; teeth: number }
  | { type: 'guardianLeft' }
  // your team
  | { type: 'tamed'; uid: string; toTeam: boolean }
  | { type: 'summoned'; uid: string }
  // the boat (tappa 12)
  | { type: 'subGiven' }
  /** The hull took a blow: a beast rammed it or it ran into rock. */
  | { type: 'subRammed'; hull: number; max: number; by: 'rock' | 'beast' | 'pressure'; x: number; y: number }
  /** From the beasts: one rammed your submarine (game.ts applies it to the hull). */
  | { type: 'subRammedBy'; lengthM: number; x: number; y: number }
  /** The submarine broke; with the ship it is towed to its hold, you at the helm (`toShip`). */
  | { type: 'subWrecked'; teeth: number; toShip?: boolean }
  | { type: 'subRepaired'; cost: number }
  | { type: 'subTooDeep' }
  /** Your beast swallowed a mouthful of fish at once (a cloud of scales and bubbles). */
  | { type: 'beastGulp'; x: number; y: number; count: number }
  | { type: 'boarded' }
  | { type: 'dove' }
  // the expedition ship (data/ship.ts)
  | { type: 'shipGiven' }
  | { type: 'shipBoarded' }
  | { type: 'shipShallow' }
  /** The ship reached the end of the known sea. */
  | { type: 'seaEnd' }
  /** An outpost of the open sea found (economy/places.ts). */
  | { type: 'outpostFound'; name: string }
  | { type: 'shipHint'; text: 'hatchMoving' | 'hatchOpenStill' }
  | { type: 'hatchMoved'; open: boolean }
  | { type: 'subLaunching' }
  | { type: 'subLaunched' }
  | { type: 'subDocking' }
  | { type: 'subDocked' }
  /** The bow breaks the ice at x (chunks fly). */
  | { type: 'iceCracked'; x: number; speed: number }
  /** A vehicle ran dry (fuel.ts). */
  | { type: 'fuelOut'; vehicle: 'ship' | 'sub' }
  /** The rescue flare: towed somewhere, for some teeth. */
  | { type: 'rescued'; where: string; teeth: number }
  /** Tiles changed (ice broken or frozen again): to redraw. */
  | { type: 'tilesChanged'; tiles: number[] }
  /** You breathe in the bubbles of an air vent of the open sea. */
  | { type: 'ventBreath' }
  /** Your beast feels a wild one in the dark, to the left (-1) or right (1). */
  | { type: 'beastSensed'; uid: string; wildId: number; side: -1 | 1 }
  /** Near ancient bones you cannot break: who in your team could (null: nobody yet). */
  | { type: 'bonesHint'; breakerUid: string | null }
  | { type: 'cannotRide'; uid: string; ko: boolean }
  | { type: 'mounted' }
  | { type: 'dismounted' }
  | { type: 'beastKo'; uid: string }
  | { type: 'levelUp'; uid: string; level: number; move?: string }
  /** It could learn a move but knows 4 already: you choose in its sheet. */
  | { type: 'moveWaiting'; uid: string; move: string }
  /** It can evolve: after the battle, or from its sheet. */
  | { type: 'evolveReady'; uid: string }
  | { type: 'evolved'; uid: string; from: string; fromId: string } // a starter became its next stage
  | { type: 'finalForm'; uid: string }
  | { type: 'beastFed'; uid: string; food: number }
  | { type: 'bonesBroken'; tiles: number[] }
  // the sunken temples (tappa 14)
  | { type: 'gateOpened'; tiles: number[] }
  | { type: 'relicFound'; name: string; text: string }
  // equipment and places
  | { type: 'weaponFired'; weapon: string }
  | { type: 'swarmBound'; id: string }
  | { type: 'swarmSummoned'; id: string }
  | { type: 'itemUsed'; id: string }
  | { type: 'wreckOpened'; id: string; weapon?: string; teeth: number; item?: string }
  | { type: 'portArrived' }
  | { type: 'tooDeep' }
  /** The whale you ride has no air left: you breathe your own again, go up. */
  | { type: 'rideAirOut'; name: string }
  | { type: 'missionComplete'; id: string }
  | { type: 'healed' };

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
  | { type: 'wildAppeared'; id: number; rare: boolean }
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
  | { type: 'boatGiven' }
  | { type: 'boarded' }
  | { type: 'dove' }
  | { type: 'lineCast' }
  | { type: 'fishBite' }
  | { type: 'fishEscaped' }
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
  | { type: 'evolved'; uid: string; from: string; fromId: string } // a starter became its next stage
  | { type: 'finalForm'; uid: string }
  | { type: 'beastFed'; uid: string; food: number }
  | { type: 'bonesBroken'; tiles: number[] }
  // equipment and places
  | { type: 'weaponFired'; weapon: string }
  | { type: 'swarmBound'; id: string }
  | { type: 'swarmSummoned'; id: string }
  | { type: 'itemUsed'; id: string }
  | { type: 'wreckOpened'; id: string; weapon?: string; teeth: number; item?: string }
  | { type: 'portArrived' }
  | { type: 'tooDeep' }
  | { type: 'missionComplete'; id: string }
  | { type: 'sanctuaryReached'; index: number }
  | { type: 'healed' };

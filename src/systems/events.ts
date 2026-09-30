// Things that happened during a game step. Scenes turn them into sounds, toasts and effects.

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
  // beasts
  | { type: 'wildAppeared'; id: number }
  | { type: 'wildBite'; id: number }
  | { type: 'wildRecovered'; id: number }
  | { type: 'wildExhausted'; id: number }
  | { type: 'wildFled'; id: number }
  | {
      type: 'damage';
      x: number;
      y: number;
      amount: number;
      target: 'wild' | 'team' | 'diver';
      blocked?: boolean;
    }
  | { type: 'tamingStarted'; id: number }
  | { type: 'tamingHit' }
  | { type: 'tamingMiss' }
  | { type: 'tamed'; uid: string; toTeam: boolean }
  | { type: 'tamingFailed' }
  | { type: 'summoned'; uid: string }
  | { type: 'recalled'; uid: string }
  | { type: 'mounted' }
  | { type: 'dismounted' }
  | { type: 'beastKo'; uid: string }
  | { type: 'moveUsed'; uid: string; slot: number; x: number; y: number }
  | { type: 'bonesBroken'; tiles: number[] }
  | { type: 'sanctuaryReached'; index: number }
  | { type: 'healed' };

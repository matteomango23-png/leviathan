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
  // Guardians
  | { type: 'tailSwipe'; id: number; dir: 1 | -1 }
  | { type: 'guardianAppeared'; id: number }
  | { type: 'guardianRage' }
  | { type: 'guardianCalls' }
  | { type: 'guardianBeaten'; teeth: number }
  | { type: 'guardianEscaped' }
  | { type: 'guardianLeft' }
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
  | { type: 'levelUp'; uid: string; level: number; move?: string }
  | { type: 'finalForm'; uid: string }
  | { type: 'beastFed'; uid: string; food: number }
  | { type: 'moveUsed'; uid: string; slot: number; x: number; y: number }
  | { type: 'bonesBroken'; tiles: number[] }
  | { type: 'areaPulse'; x: number; y: number; radius: number }
  | { type: 'shieldBlocked' }
  | { type: 'weaponFired'; weapon: string }
  | { type: 'swarmBound'; id: string }
  | { type: 'swarmSummoned'; id: string }
  | { type: 'swarmAbsorbed' }
  | { type: 'itemUsed'; id: string }
  | { type: 'wreckOpened'; id: string; weapon?: string; teeth: number; item?: string }
  | { type: 'portArrived' }
  | { type: 'tooDeep' }
  | { type: 'missionComplete'; id: string }
  | { type: 'sanctuaryReached'; index: number }
  | { type: 'healed' };

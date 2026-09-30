// Leviatano — how beast cards look: rarity colours by stars (like trading-card frames), special frames.
// Decided with the owner on 30 September 2026.

export const RARITY = {
  1: { name: 'Comune', color: '#8a8f92' }, // stone grey
  2: { name: 'Non comune', color: '#4caf6a' }, // green
  3: { name: 'Rara', color: '#3f8fd6' }, // blue
  4: { name: 'Epica', color: '#9a5cd6' }, // violet
  5: { name: 'Leggendaria', color: '#d9a93a' }, // gold
} as const;

/** Special frames drawn over the rarity colour for special versions. */
export const SPECIAL_FRAMES = {
  albino: { label: 'Albino', color: '#f2ece6', glow: '#ff6b6b' },
  alfa: { label: 'Alfa', color: '#2a2f36', glow: '#bff3ff' },
  unique: { label: 'Guardiano', color: '#6e2a1c', glow: '#ff9a4a' },
  final: { label: 'Forma finale', color: '#1d1b2e', glow: '#ffd978' },
} as const;

export const ROLE_NAMES = { cavalcatura: 'Cavalcatura', compagno: 'Compagno', supporto: 'Supporto' } as const;

// The cockpit's colours by ship (owner, 9 ottobre 2026): the same layout, the colours of its ship. The Ocean's
// Nightmare's is dark iron and pulsing red, its sonar red too (cockpit.css `.theme-nightmare`); the abyssal ship's
// and submarine's navy blue and gold (`.theme-abissale`).
import type { ShipModelDef } from '../data/fleet';

/** The sonar screen's colours: "r,g,b" for the ones drawn with transparency. */
export interface SonarPalette {
  bg: string;
  main: string;
  mainHex: string;
  dot: string;
  text: string;
  ship: string;
  odd: string;
  oddHex: string;
  limit: string;
}

const NAVY: SonarPalette = {
  bg: '#020c08',
  main: '93,255,158',
  mainHex: '#5dff9e',
  dot: '180,255,210',
  text: '207,232,216',
  ship: '#cfe8d8',
  odd: '255,120,90',
  oddHex: '#ff785a',
  limit: '255,190,90',
};

const NIGHTMARE: SonarPalette = {
  bg: '#0e0404',
  main: '255,64,52',
  mainHex: '#ff4034',
  dot: '255,175,165',
  text: '240,205,200',
  ship: '#f0cdc8',
  odd: '255,210,90', // the den's echo stands out in amber on the red screen
  oddHex: '#ffd25a',
  limit: '255,140,90',
};

/** The abyssal ship and submarine (owner, 25 ottobre): navy blue and gold, like their hulls. */
const ABYSS: SonarPalette = {
  bg: '#020814',
  main: '232,196,112',
  mainHex: '#e8c470',
  dot: '255,238,200',
  text: '214,224,244',
  ship: '#e8d6a8',
  odd: '120,200,255',
  oddHex: '#78c8ff',
  limit: '255,150,90',
};

export const sonarPalette = (theme: ShipModelDef['cockpitTheme']): SonarPalette =>
  theme === 'nightmare' ? NIGHTMARE : theme === 'abissale' ? ABYSS : NAVY;

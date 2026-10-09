// The steam cockpit of the Expedition Hunters (owner, 9 ottobre 2026): his painted Gemini screens, with every live
// text and button placed exactly on the empty plates, dials and screens painted on them. Rectangles in percent of
// the picture [left, top, right, bottom], measured once on public/bg/cockpit*_far.webp (all 1375×768, the same frame:
// the same top plates and side tabs in the same places).
export type Rect = readonly [number, number, number, number];

/** The pictures (public/bg/<name>.webp) and their shape. */
export const STEAM_ART = {
  aspect: 1375 / 768,
  /** Sonar, Diario, Recinto, Zaino: the big screen. */
  frame: 'bg/cockpitsonar_far.webp',
  /** Plancia: the chart's screen and the four dials. */
  chart: 'bg/cockpitcarta_far.webp',
  /** Plancia, below: the fuel transfer with its lever and the emergency panel. */
  panels: 'bg/cockpitplancia_far.webp',
  /** The carved wall with the dragons: behind the lists and in the side bands. */
  dragons: 'bg/cockpitdraghi_far.webp',
};

/** The frame, the same on every picture. */
export const STEAM_FRAME = {
  title: [2, 2.5, 24, 10.5] as Rect,
  /** The top plates: speed, slow ahead, engine, teeth, back to the helm (the brass one). */
  top: {
    speed: [27, 3, 34, 9] as Rect,
    cruise: [34.5, 2, 50.5, 10.5] as Rect,
    engine: [52, 2, 68, 10.5] as Rect,
    teeth: [70, 3, 78, 9] as Rect,
    helm: [80, 2, 94, 10.5] as Rect,
  },
  /** The five side tabs, top to bottom. */
  tabs: [
    [7.5, 15, 16.7, 29],
    [7.5, 31, 16.7, 45.5],
    [7.5, 47.5, 16.7, 61.5],
    [7.5, 63.5, 16.7, 77],
    [7.5, 79.5, 16.7, 93],
  ] as Rect[],
  /** Crops pasted over the tabs and the helm plate, whatever picture is behind: a dark tab, a lit one, brass. */
  tabOff: { art: 'frame', rect: [7.5, 31, 16.7, 45.5] as Rect },
  tabOn: { art: 'frame', rect: [7.5, 15, 16.7, 29] as Rect },
  brass: { art: 'chart', rect: [80, 2, 94, 10.5] as Rect },
};

/** Sonar: the status on the long plate, the switch on the green one, the screen. */
export const STEAM_SONAR = {
  status: [20, 20.5, 75, 27.5] as Rect,
  switch: [77.5, 20.5, 92.5, 27.5] as Rect,
  screen: [22.5, 35, 89.5, 85] as Rect,
};

/** Diario, Recinto, Zaino: the lists scroll over the dragon wall, in this window. */
export const STEAM_LIST = {
  window: [18.5, 14, 96, 97.5] as Rect,
  /** The part of the dragon picture shown behind them. */
  dragons: [17, 18, 93, 95] as Rect,
};

/** Plancia: a window that scrolls over the chart picture, then the panels below. */
export const STEAM_BRIDGE = {
  window: [17.5, 13, 97, 99] as Rect,
  /** First part (the chart picture, its own coordinates). */
  chart: {
    crop: [17.5, 13, 97, 99] as Rect,
    objective: [21, 19.5, 91, 24.5] as Rect,
    screen: [21, 25, 91.5, 50] as Rect,
    /** The three cream dials and the copper weather one: centre x, centre y, face radius (all % of width). */
    dials: [
      [29.2, 76, 4.9],
      [48.6, 76, 4.9],
      [66.2, 76, 4.9],
    ] as (readonly [number, number, number])[],
    weather: [84.2, 77.5, 6.3] as const,
    /** Under each dial its label. */
    labelY: [89.5, 97] as const,
  },
  /** Second part (the panels picture, its own coordinates). */
  panels: {
    crop: [17.5, 62, 97, 96] as Rect,
    toSub: [19.5, 69.5, 43, 78.5] as Rect,
    toShip: [19.5, 80.5, 38, 89] as Rect,
    note: [56.5, 66, 92.5, 78.5] as Rect,
    flare: [56.5, 79, 80.5, 87.5] as Rect,
  },
};

/** The dials' needle: angles (degrees, 0 = up) at empty and full, along the painted ticks. */
export const STEAM_NEEDLE = { from: -135, to: 135 };

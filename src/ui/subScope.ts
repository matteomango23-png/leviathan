// On the submarine's glass (block 5c, owner 10 ottobre 2026): the round 360° sonar of the submarines that have one
// (the beasts all round, above and below too, as big as they sound) and, on every submarine, an arrow towards the
// mother ship with how far it is, so you do not get lost. On every submarine the rock and ice close around it
// (owner, 24 ottobre), on the ones with a sonar the beasts too. Look only.
import { SHIP } from '../data/ship';
import { WORLD } from '../data/worldLayout';
import type { EchoClass } from '../data/hunts';
import { heardClass, trueClass } from '../systems/echoClass';
import { isInWater } from '../systems/beasts/wildState';
import type { GameState } from '../systems/game';
import { shipModel } from '../systems/ship/model';
import { subModel } from '../systems/subState';
import { sonarEdges } from '../systems/subSonar';
import { SUBMARINE } from '../data/submarine';
import { sonarPalette } from './cockpitTheme';
import { el } from './dom';
import { drawScope, type ScopeDot } from './sweepScope';

const DOT: Record<EchoClass, number> = { piccola: 1.6, media: 2.3, grande: 3.1, enorme: 4, leggendaria: 4.4 };
/** Closer than this to the ship (m), no arrow. */
const NEAR_M = 15;

export class SubScope {
  private readonly root: HTMLDivElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly arrowBox: HTMLDivElement;
  private readonly arrow: HTMLDivElement;
  private readonly arrowText: HTMLDivElement;
  private t = 0;
  private shown = '';

  /** @param big the abyssal submarine's cockpit (its sonar tab): large, in the page */
  constructor(parent: HTMLElement, big = false) {
    this.root = el('div', `sub-scope${big ? ' sub-scope-big' : ''}`, parent);
    this.arrowBox = el('div', 'sub-home', this.root);
    this.arrow = el('div', 'sub-home-arrow', this.arrowBox, '➤');
    this.arrowText = el('div', 'sub-home-text', this.arrowBox);
    this.canvas = el('canvas', 'sub-scope-canvas', this.root);
    this.root.hidden = true;
  }

  update(g: GameState, dt: number): void {
    const s = g.sub;
    this.root.hidden = !s.aboard;
    if (!s.aboard) return;
    this.t += dt;
    // the arrow home
    const ship = g.ship;
    const home = ship.owned && ship.bay !== 'docked';
    const dxM = (ship.x - s.x) / WORLD.unitsPerMetre;
    const dyM = (WORLD.surfaceY + ship.dive - s.y) / WORLD.unitsPerMetre;
    const dist = Math.hypot(dxM, dyM);
    this.arrowBox.hidden = !home || dist < NEAR_M;
    if (!this.arrowBox.hidden) {
      this.arrow.style.transform = `rotate(${Math.atan2(dyM, dxM)}rad)`;
      const text =
        dist >= 1000
          ? `Nave · ${(dist / 1000).toFixed(1).replace('.', ',')} km`
          : `Nave · ${Math.round(dist)} m`;
      if (text !== this.shown) this.arrowText.textContent = this.shown = text;
    }
    // the sonar, if it has one
    const scope = subModel(s.model).scope;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = Math.round(this.canvas.clientWidth * dpr);
    if (this.canvas.width !== size) Object.assign(this.canvas, { width: size, height: size });
    const range = (scope?.rangeM ?? SUBMARINE.edgeScope.rangeM) * WORLD.unitsPerMetre;
    const P = sonarPalette(
      subModel(s.model).cockpitTheme ?? (ship.owned ? shipModel(ship).cockpitTheme : undefined),
    );
    const dots: ScopeDot[] = sonarEdges(g.map, s.x, s.y, range, SUBMARINE.edgeScope.cells).map((e) => ({
      x: e.x,
      y: e.y,
      r: 1.1,
      rgb: e.ice ? '190,230,245' : P.main,
    }));
    for (const w of scope ? g.beasts.wilds : []) {
      if (!isInWater(w)) continue;
      const dx = w.x - s.x;
      const dy = w.y - s.y;
      if (Math.hypot(dx, dy) > range) continue;
      dots.push({
        x: dx / range,
        y: dy / range,
        r: DOT[heardClass(trueClass(w.form), scope!.classes)],
        rgb: P.dot,
      });
    }
    drawScope(ctx, size, dpr, this.t, SHIP.radar.sweepSeconds, dots, P, { halfW: 0, face: s.face });
  }
}

/** The submarine's simple sonar, large, in its cockpit (the abyssal one, owner 25 ottobre); returns its stop. */
export function renderSubSonar(b: HTMLElement, g: GameState): () => void {
  el(
    'p',
    'port-hint',
    b,
    'Il sonar del sottomarino: le bestie vicine come punti, tutte uguali, e la roccia attorno. Per riconoscerle e seguirle serve quello della nave.',
  );
  const scope = new SubScope(b, true);
  let last = performance.now();
  let raf = 0;
  const frame = (now: number): void => {
    scope.update(g, Math.min(0.1, (now - last) / 1000));
    last = now;
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

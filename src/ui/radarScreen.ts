// The surface radar of the cockpit (block 5c, owner 10 ottobre 2026): a round screen with a beam sweeping round,
// the ship in the middle, and what is close to its hull (systems/ship/radar.ts): ice, rock and shallow floor,
// harbour piers, your speedboat and submarine, beasts. The beeps of its parking sensor play at the helm.
import { SHIP } from '../data/ship';
import { WORLD } from '../data/worldLayout';
import type { GameState } from '../systems/game';
import { radarContacts, radarRadiusM, type ContactKind } from '../systems/ship/radar';
import { shipLength, shipModel } from '../systems/ship/model';
import { sonarPalette } from './cockpitTheme';
import { el } from './dom';
import { drawScope, type ScopeDot } from './sweepScope';

const LOOK: Record<ContactKind, { r: number; rgb?: string }> = {
  rock: { r: 1.6 },
  ice: { r: 1.8, rgb: '190,230,255' },
  port: { r: 4, rgb: '255,200,110' },
  boat: { r: 3.2, rgb: '255,255,255' },
  sub: { r: 3.2, rgb: '255,255,255' },
  beast: { r: 2.6, rgb: '255,150,120' },
};

/** Draws the radar into `b`; returns a function that stops it. */
export function renderRadar(b: HTMLElement, g: GameState): () => void {
  const P = sonarPalette(shipModel(g.ship).cockpitTheme);
  const head = el('div', 'sonar-head', b);
  el(
    'div',
    'sonar-status',
    head,
    `Radar di prossimità · ${SHIP.radar.rangeM} m oltre prua e poppa · avvisa con un bip se vai veloce verso un ostacolo`,
  );
  const frame = el('div', 'sonar-frame radar-frame', b);
  const canvas = el('canvas', 'radar-canvas', frame);
  const legend = el('div', 'sonar-legend', b);
  legend.innerHTML =
    '<span><i class="lg floor"></i>roccia e fondale</span><span><i class="lg rd-ice"></i>ghiaccio</span><span><i class="lg rd-port"></i>molo</span><span><i class="lg rd-you"></i>i tuoi mezzi</span><span><i class="lg rd-beast"></i>bestie</span>';
  const ctx = canvas.getContext('2d');
  let dots: ScopeDot[] = [];
  const read = (): void => {
    const R = radarRadiusM(g.ship);
    dots = radarContacts(g).map((c) => ({
      x: c.dxM / R,
      y: c.dyM / R,
      r: LOOK[c.kind].r,
      rgb: LOOK[c.kind].rgb ?? P.main,
    }));
  };
  read();
  let t = 0;
  let readT = 0;
  let last = performance.now();
  let raf = 0;
  const draw = (now: number): void => {
    raf = requestAnimationFrame(draw);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    t += dt;
    if ((readT += dt) > 0.5) {
      readT = 0;
      read();
    }
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = Math.round(Math.min(canvas.clientWidth, canvas.clientHeight) * dpr);
    if (canvas.width !== size) Object.assign(canvas, { width: size, height: size });
    const half = shipLength(g.ship) / WORLD.unitsPerMetre / 2 / radarRadiusM(g.ship);
    drawScope(ctx, size, dpr, t, SHIP.radar.sweepSeconds, dots, P, { halfW: half, face: g.ship.face });
  };
  raf = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(raf);
}

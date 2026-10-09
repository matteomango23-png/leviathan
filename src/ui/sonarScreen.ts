// The sonar screen of the cockpit (owner, 5 ottobre): green curves of the floor under the ship within its range,
// a sweep going back and forth, the echoes as dots (no shapes), the limit each side, and a switch. It hears only
// switched on and under its ship's sonar speed (systems/hunts.ts sonarReadout); the ship pings (sonarPing).
import { SHIP } from '../data/ship';
import type { GameState } from '../systems/game';
import { sonarReadout, type SonarReadout } from '../systems/hunts';
import { shipModel, sonarMaxKnots } from '../systems/ship/model';
import { sonarPalette } from './cockpitTheme';
import { el } from './dom';
import { WORLD } from '../data/worldLayout';

const SWEEP_SECONDS = SHIP.sonar.pingSeconds;

/** Draws the sonar into `b`; returns a function that stops its animation. */
export function renderSonar(b: HTMLElement, g: GameState, redraw: () => void): () => void {
  const P = sonarPalette(shipModel(g.ship).cockpitTheme);
  const head = el('div', 'sonar-head', b);
  const status = el('div', 'sonar-status', head);
  const sw = el(
    'button',
    `pbtn sonar-switch${g.ship.sonarOn ? ' on' : ''}`,
    head,
    g.ship.sonarOn ? 'Spegni il sonar' : 'Accendi il sonar',
  );
  sw.addEventListener('click', () => {
    g.ship.sonarOn = !g.ship.sonarOn;
    redraw();
  });
  const frame = el('div', 'sonar-frame', b);
  const canvas = el('canvas', 'sonar-canvas', frame);
  const legend = el('div', 'sonar-legend', b);
  legend.innerHTML =
    '<span><i class="lg floor"></i>fondale</span><span><i class="lg big"></i>bestia grande</span><span><i class="lg small"></i>animale</span><span><i class="lg odd"></i>eco anomala (tana)</span>';

  // the ship sails on under the cockpit: fresh readings twice a second
  let r: SonarReadout = sonarReadout(g);
  const read = (): void => {
    r = sonarReadout(g);
    status.textContent =
      r.status === 'off'
        ? 'Sonar spento: accendilo per sentire il fondale e le bestie sotto la nave.'
        : r.status === 'fast'
          ? `Troppo veloce: il sonar sente solo sotto ${sonarMaxKnots(g.ship)} nodi.`
          : `In ascolto · portata ${r.rangeM} m per lato · fondale sotto la nave ${r.floorM} m`;
    status.classList.toggle('warn', r.status !== 'on');
  };
  read();
  let readT = 0;

  const ctx = canvas.getContext('2d');
  let raf = 0;
  let last = performance.now();
  let t = 0;
  const seen = new Map<number, number>(); // echo index → time it was last swept (for the fading dots)

  const draw = (now: number): void => {
    raf = requestAnimationFrame(draw);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    t += dt;
    readT += dt;
    if (readT > 0.5) {
      readT = 0;
      read();
    }
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(canvas.clientWidth * dpr);
    const H = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== W || canvas.height !== H) Object.assign(canvas, { width: W, height: H });
    ctx.fillStyle = P.bg;
    ctx.fillRect(0, 0, W, H);
    const on = r.status === 'on';
    // the ship where it is: a U-Boat under water is drawn at its depth (owner, 9 ottobre)
    const shipM = g.ship.dive / WORLD.unitsPerMetre;
    const maxDepth = Math.max(60, shipM + 10, ...r.profile, ...r.echoes.map((e) => e.depthM)) * 1.12;
    const px = (dxM: number): number => W / 2 + (dxM / r.rangeM) * (W / 2 - 12 * dpr);
    const py = (dM: number): number => 14 * dpr + (dM / maxDepth) * (H - 30 * dpr);

    // grid: depth lines and range rings from the ship
    ctx.lineWidth = 1 * dpr;
    ctx.strokeStyle = `rgba(${P.main},0.12)`;
    ctx.fillStyle = `rgba(${P.main},0.45)`;
    ctx.font = `${10 * dpr}px system-ui, sans-serif`;
    const stepM = maxDepth > 400 ? 100 : maxDepth > 160 ? 50 : 20;
    for (let d = stepM; d < maxDepth; d += stepM) {
      ctx.beginPath();
      ctx.moveTo(0, py(d));
      ctx.lineTo(W, py(d));
      ctx.stroke();
      ctx.fillText(`${d} m`, 4 * dpr, py(d) - 3 * dpr);
    }
    for (let k = 1; k <= 4; k++) {
      ctx.beginPath();
      ctx.ellipse(W / 2, py(0), ((W / 2 - 12 * dpr) * k) / 4, ((H - 30 * dpr) * k) / 4, 0, 0, Math.PI);
      ctx.stroke();
    }
    // the limit each side
    ctx.strokeStyle = `rgba(${P.limit},0.6)`;
    ctx.setLineDash([6 * dpr, 6 * dpr]);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(px(s * r.rangeM), py(0));
      ctx.lineTo(px(s * r.rangeM), H);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.fillStyle = `rgba(${P.limit},0.8)`;
    ctx.fillText(`◀ ${r.rangeM} m`, 6 * dpr, H - 6 * dpr);
    const rt = `${r.rangeM} m ▶`;
    ctx.fillText(rt, W - ctx.measureText(rt).width - 6 * dpr, H - 6 * dpr);
    // the ship in the middle: at the top afloat, at its depth when it dives
    ctx.fillStyle = P.ship;
    ctx.fillRect(W / 2 - 14 * dpr, py(shipM) - 6 * dpr, 28 * dpr, 6 * dpr);

    if (!on) return;
    // the sweep: a line going from one side to the other, leaving a glow behind
    const ph = (t % (SWEEP_SECONDS * 2)) / SWEEP_SECONDS; // 0…2
    const sweep = ph < 1 ? -1 + 2 * ph : 3 - 2 * ph; // -1…1…-1
    const side = ph < 1 ? 1 : -1;
    const sxp = px(sweep * r.rangeM);
    const grad = ctx.createLinearGradient(sxp - side * 120 * dpr, 0, sxp, 0);
    grad.addColorStop(0, `rgba(${P.main},0)`);
    grad.addColorStop(1, `rgba(${P.main},0.22)`);
    ctx.fillStyle = grad;
    ctx.fillRect(Math.min(sxp, sxp - side * 120 * dpr), py(0), 120 * dpr, H);
    ctx.strokeStyle = P.mainHex;
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.moveTo(sxp, py(0));
    ctx.lineTo(sxp, H);
    ctx.stroke();

    // the floor: a few green curves, the brightest on the floor itself
    const n = r.profile.length;
    for (let layer = 0; layer < 3; layer++) {
      ctx.strokeStyle = `rgba(${P.main},${layer === 0 ? 0.95 : 0.35 - layer * 0.1})`;
      ctx.lineWidth = (layer === 0 ? 2.2 : 1.2) * dpr;
      ctx.shadowColor = P.mainHex;
      ctx.shadowBlur = layer === 0 ? 8 * dpr : 0;
      ctx.beginPath();
      r.profile.forEach((d, i) => {
        const x = px(-r.rangeM + (2 * r.rangeM * i) / (n - 1));
        const y = py(d) + layer * 7 * dpr;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    // the echoes: dots that light up when the sweep passes and fade after
    r.echoes.forEach((e, i) => {
      const ex = px(e.dx);
      if (Math.abs(ex - sxp) < 10 * dpr) seen.set(i, t);
      const age = t - (seen.get(i) ?? -99);
      const a = Math.max(0.25, 1 - age / (SWEEP_SECONDS * 1.6));
      const odd = e.label === 'eco anomala';
      ctx.fillStyle = odd ? `rgba(${P.odd},${a})` : `rgba(${P.dot},${a})`;
      ctx.shadowColor = odd ? P.oddHex : P.mainHex;
      ctx.shadowBlur = 12 * dpr * a;
      ctx.beginPath();
      ctx.arc(ex, py(e.depthM), (odd ? 6 : e.label === 'eco grande' ? 4.5 : 2.6) * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(${P.text},${a * 0.9})`;
      ctx.fillText(`${e.depthM} m`, ex + 8 * dpr, py(e.depthM) + 4 * dpr);
    });
  };
  raf = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(raf);
}

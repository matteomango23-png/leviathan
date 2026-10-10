// A round scope with a beam sweeping round it (block 5c, owner 10 ottobre 2026: "the ones with the signal turning
// round 360 degrees"): the cockpit's surface radar and the submarines' sonar draw with it. Dots light up as the beam
// passes and fade until it comes round again. Look only.
import type { SonarPalette } from './cockpitTheme';

export interface ScopeDot {
  /** Where, as a share of the scope's radius from its middle (east > 0, down > 0). */
  x: number;
  y: number;
  /** Radius (css px) and colour ("r,g,b"). */
  r: number;
  rgb: string;
}

/** Draws one frame: the rings, the beam at time `t`, the dots, and a mark in the middle (`mark`: half-width, share). */
export function drawScope(
  ctx: CanvasRenderingContext2D,
  size: number,
  dpr: number,
  t: number,
  sweepSeconds: number,
  dots: ScopeDot[],
  P: SonarPalette,
  mark: { halfW: number; face: 1 | -1 } | null,
): void {
  const c = size / 2;
  const rad = c - 3 * dpr;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = P.bg;
  ctx.beginPath();
  ctx.arc(c, c, rad, 0, Math.PI * 2);
  ctx.fill();
  // rings and cross
  ctx.strokeStyle = `rgba(${P.main},0.18)`;
  ctx.lineWidth = 1 * dpr;
  for (let k = 1; k <= 3; k++) {
    ctx.beginPath();
    ctx.arc(c, c, (rad * k) / 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(c - rad, c);
  ctx.lineTo(c + rad, c);
  ctx.moveTo(c, c - rad);
  ctx.lineTo(c, c + rad);
  ctx.stroke();
  // the beam: a line turning, a fading wedge behind it
  const a = ((t / sweepSeconds) % 1) * Math.PI * 2;
  for (let k = 0; k < 14; k++) {
    const b0 = a - (k + 1) * 0.06;
    ctx.fillStyle = `rgba(${P.main},${0.16 * (1 - k / 14)})`;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.arc(c, c, rad, b0, b0 + 0.06);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = P.mainHex;
  ctx.lineWidth = 1.5 * dpr;
  ctx.beginPath();
  ctx.moveTo(c, c);
  ctx.lineTo(c + Math.cos(a) * rad, c + Math.sin(a) * rad);
  ctx.stroke();
  // the dots: bright just after the beam, then fading
  for (const d of dots) {
    const ang = Math.atan2(d.y, d.x);
    const since = (((a - ang) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); // how far the beam has gone past
    const alpha = Math.max(0.2, 1 - since / (Math.PI * 2));
    ctx.fillStyle = `rgba(${d.rgb},${alpha})`;
    ctx.beginPath();
    ctx.arc(c + d.x * rad, c + d.y * rad, d.r * dpr, 0, Math.PI * 2);
    ctx.fill();
  }
  // the ship or the submarine in the middle, its bow towards where it faces
  if (mark) {
    const w = Math.max(3 * dpr, mark.halfW * rad);
    ctx.fillStyle = P.ship;
    ctx.beginPath();
    ctx.moveTo(c - w * mark.face, c - 2 * dpr);
    ctx.lineTo(c + w * 0.8 * mark.face, c - 2 * dpr);
    ctx.lineTo(c + w * mark.face, c);
    ctx.lineTo(c + w * 0.8 * mark.face, c + 2 * dpr);
    ctx.lineTo(c - w * mark.face, c + 2 * dpr);
    ctx.closePath();
    ctx.fill();
  }
  // the rim
  ctx.strokeStyle = `rgba(${P.main},0.5)`;
  ctx.lineWidth = 1.5 * dpr;
  ctx.beginPath();
  ctx.arc(c, c, rad, 0, Math.PI * 2);
  ctx.stroke();
}

// Procedural textures painted once at boot (diver placeholder, small fish, light shapes).
// Shapes follow drawDiver / fish drawing in prototype/prova-realistica.html.
import Phaser from 'phaser';
import { LIGHT } from '../data/diver';

export const TEX = {
  diverBody: 'diver-body',
  diverFin: 'diver-fin',
  sardine: 'sardine',
  sardineTail: 'sardine-tail',
  halo: 'light-halo',
  cone: 'light-cone',
  vignette: 'vignette',
  bubble: 'bubble',
  dot: 'dot',
} as const;

/** Pixels per diver "local unit" in the baked diver textures (local body spans about 3.6 units). */
export const DIVER_TEX_SCALE = 100;
/** Where the diver's centre is inside the body texture (local units from the texture's left/top). */
export const DIVER_BODY_ORIGIN = { x: 1.8, y: 0.5, w: 3.05, h: 1.0 };
export const FIN_TEX = { w: 0.95, h: 0.5, pivotY: 0.25 };
export const CONE_TEX = { length: 512 };
export const HALO_TEX = { radius: 128 };
export const SARDINE_TEX = { w: 64, h: 22 };

function canvasTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  paint: (g: CanvasRenderingContext2D) => void,
): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, Math.ceil(w), Math.ceil(h));
  if (!tex) return;
  paint(tex.context);
  tex.refresh();
}

function paintDiverBody(g: CanvasRenderingContext2D): void {
  const s = DIVER_TEX_SCALE;
  g.save();
  g.scale(s, s);
  g.translate(DIVER_BODY_ORIGIN.x, DIVER_BODY_ORIGIN.y);
  // thighs
  g.fillStyle = '#3a525c';
  g.beginPath();
  g.ellipse(-1.2, 0.12, 0.55, 0.16, 0, 0, Math.PI * 2);
  g.fill();
  // torso
  const torso = g.createLinearGradient(0, -0.25, 0, 0.3);
  torso.addColorStop(0, '#6f8d97');
  torso.addColorStop(0.45, '#3f5a64');
  torso.addColorStop(1, '#1f3139');
  g.fillStyle = torso;
  g.beginPath();
  g.ellipse(-0.1, 0.05, 0.75, 0.27, 0, 0, Math.PI * 2);
  g.fill();
  // air tank
  const tank = g.createLinearGradient(0, -0.45, 0, -0.15);
  tank.addColorStop(0, '#e0a84a');
  tank.addColorStop(1, '#8a5a1e');
  g.fillStyle = tank;
  g.beginPath();
  g.roundRect(-0.65, -0.43, 0.95, 0.24, 0.1);
  g.fill();
  // head and mask
  g.fillStyle = '#4a6570';
  g.beginPath();
  g.arc(0.72, -0.02, 0.22, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(143,227,240,0.9)';
  g.beginPath();
  g.ellipse(0.83, -0.03, 0.09, 0.12, 0, 0, Math.PI * 2);
  g.fill();
  // arm holding the lamp
  g.strokeStyle = '#4a6570';
  g.lineWidth = 0.13;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(0.3, 0.15);
  g.lineTo(0.95, 0.28);
  g.stroke();
  g.fillStyle = '#fff1c2';
  g.beginPath();
  g.arc(1.02, 0.29, 0.07, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function paintFin(g: CanvasRenderingContext2D): void {
  const s = DIVER_TEX_SCALE;
  g.save();
  g.scale(s, s);
  g.translate(FIN_TEX.w, FIN_TEX.pivotY);
  g.fillStyle = '#2a3b42';
  g.beginPath();
  g.moveTo(0, -0.07);
  g.lineTo(-0.9, -0.2);
  g.lineTo(-0.85, 0.2);
  g.closePath();
  g.fill();
  g.fillStyle = '#35505a';
  g.beginPath();
  g.ellipse(-0.12, 0, 0.14, 0.09, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function paintSardine(g: CanvasRenderingContext2D): void {
  const { w, h } = SARDINE_TEX;
  const L = w * 0.46;
  const hh = h * 0.42;
  g.save();
  g.translate(w * 0.5, h / 2);
  const body = g.createLinearGradient(0, -hh, 0, hh);
  body.addColorStop(0, '#24424d');
  body.addColorStop(0.45, '#eaf4f6');
  body.addColorStop(1, '#8aa3ab');
  g.fillStyle = body;
  g.beginPath();
  g.moveTo(L, 0);
  g.quadraticCurveTo(L * 0.6, -hh, 0, -hh * 0.95);
  g.quadraticCurveTo(-L * 0.55, -hh * 0.7, -L, 0);
  g.quadraticCurveTo(-L * 0.55, hh * 0.75, 0, hh);
  g.quadraticCurveTo(L * 0.6, hh * 0.9, L, 0);
  g.fill();
  g.fillStyle = '#08141a';
  g.beginPath();
  g.arc(L * 0.68, -hh * 0.12, Math.max(1, L * 0.07), 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function paintSardineTail(g: CanvasRenderingContext2D): void {
  const { h } = SARDINE_TEX;
  g.fillStyle = '#6f8b95';
  g.beginPath();
  g.moveTo(h * 0.6, h / 2);
  g.lineTo(0, h * 0.05);
  g.lineTo(h * 0.18, h / 2);
  g.lineTo(0, h * 0.95);
  g.closePath();
  g.fill();
}

function paintHalo(g: CanvasRenderingContext2D): void {
  const r = HALO_TEX.radius;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, r * 2, r * 2);
}

/** The lamp: a soft beam, bright in the middle and fading to the sides and to its end (no hard edges). */
function paintCone(g: CanvasRenderingContext2D, h: number): void {
  const L = CONE_TEX.length;
  const a = LIGHT.coneHalfAngle;
  const img = g.createImageData(L, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < L; x++) {
      const dy = y - h / 2;
      const r = Math.hypot(x, dy) / L;
      const side = Math.abs(Math.atan2(dy, Math.max(x, 0.001))) / a; // 0 in the middle, 1 at the edge
      if (r >= 1 || side >= 1) continue;
      const along = Math.pow(1 - r, LIGHT.coneFalloff);
      const across = Math.pow(Math.cos((side * Math.PI) / 2), LIGHT.coneSoftEdge);
      const o = (y * L + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
      img.data[o + 3] = Math.round(255 * along * across);
    }
  }
  g.putImageData(img, 0, 0);
}

function paintVignette(g: CanvasRenderingContext2D, s: number): void {
  const grad = g.createRadialGradient(s / 2, s / 2, s * 0.3, s / 2, s / 2, s * 0.72);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
}

function paintBubble(g: CanvasRenderingContext2D): void {
  g.strokeStyle = 'rgba(200,235,245,0.85)';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(8, 8, 6, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.8)';
  g.fillRect(5, 4, 2, 2);
}

function paintDot(g: CanvasRenderingContext2D): void {
  const grad = g.createRadialGradient(8, 8, 0, 8, 8, 8);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 16, 16);
}

export function createTextures(scene: Phaser.Scene): void {
  const s = DIVER_TEX_SCALE;
  canvasTexture(scene, TEX.diverBody, DIVER_BODY_ORIGIN.w * s, DIVER_BODY_ORIGIN.h * s, paintDiverBody);
  canvasTexture(scene, TEX.diverFin, FIN_TEX.w * s, FIN_TEX.h * s, paintFin);
  canvasTexture(scene, TEX.sardine, SARDINE_TEX.w, SARDINE_TEX.h, paintSardine);
  canvasTexture(scene, TEX.sardineTail, SARDINE_TEX.h * 0.6, SARDINE_TEX.h, paintSardineTail);
  canvasTexture(scene, TEX.halo, HALO_TEX.radius * 2, HALO_TEX.radius * 2, paintHalo);
  const coneH = Math.ceil(2 * CONE_TEX.length * Math.sin(LIGHT.coneHalfAngle)) + 4;
  canvasTexture(scene, TEX.cone, CONE_TEX.length, coneH, (g) => paintCone(g, coneH));
  canvasTexture(scene, TEX.vignette, 256, 256, (g) => paintVignette(g, 256));
  canvasTexture(scene, TEX.bubble, 16, 16, paintBubble);
  canvasTexture(scene, TEX.dot, 16, 16, paintDot);
}

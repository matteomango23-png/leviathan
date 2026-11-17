// The turret's frame and glass, painted once (split from turretGlass.ts, 17 novembre 2026): the armoured frame with
// its rivets round a chamfered window, the console under it, and the glass's tint darker at the edges. Look only.
import Phaser from 'phaser';

export const FRAME = 'turret-frame';
export const TINT = 'turret-tint';

/** The window in the frame (share of the screen): its edges, the console under it. Tuning. */
export const WIN = { top: 0.07, side: 0.035, bottom: 0.2, chamfer: 0.05 };

function windowPath(g: CanvasRenderingContext2D, w: number, h: number): void {
  const t = h * WIN.top;
  const s = w * WIN.side;
  const b = h * (1 - WIN.bottom);
  const c = h * WIN.chamfer;
  g.beginPath();
  g.moveTo(s + c, t);
  g.lineTo(w - s - c, t);
  g.lineTo(w - s, t + c);
  g.lineTo(w - s, b - c);
  g.lineTo(w - s - c, b);
  g.lineTo(s + c, b);
  g.lineTo(s, b - c);
  g.lineTo(s, t + c);
  g.closePath();
}

export function paintFrame(scene: Phaser.Scene, w: number, h: number): void {
  if (scene.textures.exists(FRAME)) scene.textures.remove(FRAME);
  const t = scene.textures.createCanvas(FRAME, w, h)!;
  const g = t.context;
  const metal = g.createLinearGradient(0, 0, 0, h);
  metal.addColorStop(0, '#2b2420');
  metal.addColorStop(0.5, '#191512');
  metal.addColorStop(1, '#0d0b0a');
  g.fillStyle = metal;
  g.fillRect(0, 0, w, h);
  // the console under the window: darker, with a worn edge
  const cons = g.createLinearGradient(0, h * (1 - WIN.bottom), 0, h);
  cons.addColorStop(0, '#3a2f28');
  cons.addColorStop(0.08, '#14110f');
  cons.addColorStop(1, '#070606');
  g.fillStyle = cons;
  g.fillRect(0, h * (1 - WIN.bottom), w, h * WIN.bottom);
  // the window: cut out, with a bevel of light above and shadow below
  g.save();
  windowPath(g, w, h);
  g.globalCompositeOperation = 'destination-out';
  g.fill();
  g.restore();
  g.save();
  windowPath(g, w, h);
  g.lineWidth = 6;
  g.strokeStyle = 'rgba(120,96,78,0.55)';
  g.stroke();
  g.lineWidth = 2;
  g.strokeStyle = 'rgba(0,0,0,0.9)';
  g.stroke();
  g.restore();
  // rivets round the window
  const rivet = (x: number, y: number): void => {
    const r = Math.max(2, h * 0.007);
    const grad = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    grad.addColorStop(0, '#8a7666');
    grad.addColorStop(1, '#1a1412');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  };
  for (let i = 0; i <= 16; i++) {
    rivet(w * (0.06 + 0.88 * (i / 16)), h * WIN.top * 0.5);
    rivet(w * (0.06 + 0.88 * (i / 16)), h * (1 - WIN.bottom * 0.82));
  }
  for (let i = 0; i <= 6; i++) {
    rivet(w * WIN.side * 0.45, h * (0.12 + 0.6 * (i / 6)));
    rivet(w * (1 - WIN.side * 0.45), h * (0.12 + 0.6 * (i / 6)));
  }
  t.refresh();
}

export function paintTint(scene: Phaser.Scene): void {
  if (scene.textures.exists(TINT)) return;
  const t = scene.textures.createCanvas(TINT, 256, 256)!;
  const g = t.context;
  const grad = g.createRadialGradient(128, 128, 30, 128, 128, 180);
  grad.addColorStop(0, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,1)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  t.refresh();
}

// The sea birds on screen: small dark gulls drawn with lines, beating or holding their wings open; a plunging
// bird folds its wings. Drawn vectorially until a painted bird replaces them (docs/ART.md).
import Phaser from 'phaser';
import { BIRDS } from '../data/weather';
import type { BirdsState } from '../systems/birds';

export class BirdsView {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.g = scene.add.graphics();
    layer.add(this.g);
  }

  update(s: BirdsState, view: Phaser.Geom.Rectangle): void {
    const g = this.g;
    g.clear();
    const half = BIRDS.wingspanUnits / 2;
    for (const f of s.flocks) {
      if (!f.active) continue;
      for (const b of f.birds) {
        if (b.x < view.x - half || b.x > view.right + half || b.y < view.y - half || b.y > view.bottom + half)
          continue;
        if (b.dive !== 'none') {
          // wings folded: a dart along its flight
          const sp = Math.hypot(b.vx, b.vy) || 1;
          const ux = b.vx / sp;
          const uy = b.vy / sp;
          g.lineStyle(1.2, BIRDS.color, 1);
          g.lineBetween(
            b.x - ux * half * 0.7,
            b.y - uy * half * 0.7,
            b.x + ux * half * 0.5,
            b.y + uy * half * 0.5,
          );
          continue;
        }
        // wing tips go up and down with the beat; gliding birds hold them slightly raised
        const beat = b.glide > 0 ? -0.15 : Math.sin(b.phase);
        const tipY = b.y - beat * half * 0.55;
        const elbowY = b.y - beat * half * 0.25 - half * 0.12;
        const dir = Math.sign(b.vx) || 1;
        const tipL = { x: b.x - half, y: tipY + half * 0.08 };
        const tipR = { x: b.x + half, y: tipY + half * 0.08 };
        const elbowL = { x: b.x - half * 0.45, y: elbowY };
        const elbowR = { x: b.x + half * 0.45, y: elbowY };
        g.lineStyle(1.3, BIRDS.color, 1);
        g.beginPath();
        g.moveTo(elbowL.x, elbowL.y);
        g.lineTo(b.x, b.y);
        g.lineTo(elbowR.x, elbowR.y);
        g.strokePath();
        // the outer wing darkens to black tips
        g.lineStyle(1, BIRDS.tipColor, 1);
        g.lineBetween(elbowL.x, elbowL.y, tipL.x, tipL.y);
        g.lineBetween(elbowR.x, elbowR.y, tipR.x, tipR.y);
        // body and head, towards where it flies
        g.fillStyle(BIRDS.bellyColor, 1);
        g.fillEllipse(b.x + dir * half * 0.08, b.y + 0.2, half * 0.38, 0.8);
        g.fillCircle(b.x + dir * half * 0.3, b.y + 0.05, 0.5);
      }
    }
  }
}

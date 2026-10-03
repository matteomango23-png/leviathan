// The sea birds on screen: gulls seen from afar, their wings curved and tapering to black tips. The textures are
// painted once on start, one per wing pose (9 poses of the beat) plus one with folded wings for the plunge; each
// bird is an image that picks the pose of its beat. Painted art can replace them later (docs/ART.md).
import Phaser from 'phaser';
import { BIRDS } from '../data/weather';
import type { BirdsState } from '../systems/birds';

const POSES = 9;
const W = 192; // texture size, px
const H = 112;
const SPAN = 180; // wingspan in the texture, px
const poseKey = (i: number): string => `bird-${i}`;
const DIVE_KEY = 'bird-dive';
const BEAK = '#c9a23a';

/** Wings from down (a = −1) to up (a = 1): a gull's "M", the hand bending more than the arm. */
function paintPose(scene: Phaser.Scene, key: string, a: number): void {
  const tex = scene.textures.createCanvas(key, W, H)!;
  const c = tex.context;
  const cx = W / 2;
  const cy = H / 2;
  const half = SPAN / 2;
  for (const side of [-1, 1]) {
    const elbow = { x: cx + side * half * 0.42, y: cy - a * 16 - 5 };
    const tip = { x: cx + side * half * (0.97 - Math.abs(a) * 0.1), y: cy - a * 36 + 4 };
    const grad = c.createLinearGradient(cx, 0, tip.x, 0);
    grad.addColorStop(0, BIRDS.wing);
    grad.addColorStop(0.62, BIRDS.wing);
    grad.addColorStop(0.8, BIRDS.wingTip);
    grad.addColorStop(1, BIRDS.wingTip);
    c.fillStyle = grad;
    c.beginPath();
    // leading edge: shoulder → arm → hand, slightly arched
    c.moveTo(cx + side * 5, cy - 3);
    c.quadraticCurveTo(cx + side * half * 0.22, elbow.y - 6, elbow.x, elbow.y);
    c.quadraticCurveTo(cx + side * half * 0.72, elbow.y + (tip.y - elbow.y) * 0.35 - 3, tip.x, tip.y);
    // trailing edge back to the body: thin at the tip, broad at the arm
    c.quadraticCurveTo(cx + side * half * 0.66, elbow.y + (tip.y - elbow.y) * 0.5 + 8, elbow.x, elbow.y + 11);
    c.quadraticCurveTo(cx + side * half * 0.2, cy + 9, cx + side * 4, cy + 6);
    c.closePath();
    c.fill();
  }
  // body and head (looking right; the view mirrors it)
  c.fillStyle = BIRDS.body;
  c.beginPath();
  c.ellipse(cx + 2, cy + 2, 15, 7, 0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(cx + 16, cy - 1, 6, 5, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = BEAK;
  c.beginPath();
  c.moveTo(cx + 21, cy - 2);
  c.lineTo(cx + 28, cy);
  c.lineTo(cx + 21, cy + 1);
  c.fill();
  tex.refresh();
}

/** Wings folded back along the body, pointing right: a plunging gull. */
function paintDive(scene: Phaser.Scene): void {
  const tex = scene.textures.createCanvas(DIVE_KEY, W, H)!;
  const c = tex.context;
  const cx = W / 2;
  const cy = H / 2;
  c.fillStyle = BIRDS.wing;
  c.beginPath();
  c.moveTo(cx + 20, cy - 4);
  c.quadraticCurveTo(cx - 20, cy - 12, cx - 62, cy - 6);
  c.quadraticCurveTo(cx - 20, cy + 2, cx + 20, cy + 4);
  c.closePath();
  c.fill();
  c.fillStyle = BIRDS.wingTip;
  c.beginPath();
  c.moveTo(cx - 40, cy - 8);
  c.quadraticCurveTo(cx - 52, cy - 8, cx - 62, cy - 6);
  c.quadraticCurveTo(cx - 50, cy - 3, cx - 40, cy - 2);
  c.fill();
  c.fillStyle = BIRDS.body;
  c.beginPath();
  c.ellipse(cx + 4, cy + 1, 22, 6, 0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(cx + 26, cy, 6, 5, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = BEAK;
  c.beginPath();
  c.moveTo(cx + 31, cy - 1);
  c.lineTo(cx + 39, cy + 1);
  c.lineTo(cx + 31, cy + 2);
  c.fill();
  tex.refresh();
}

export class BirdsView {
  private readonly images: Phaser.GameObjects.Image[] = [];
  private readonly scale = BIRDS.wingspanUnits / SPAN;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
  ) {
    for (let i = 0; i < POSES; i++)
      if (!scene.textures.exists(poseKey(i))) paintPose(scene, poseKey(i), -1 + (2 * i) / (POSES - 1));
    if (!scene.textures.exists(DIVE_KEY)) paintDive(scene);
  }

  private image(i: number): Phaser.GameObjects.Image {
    let im = this.images[i];
    if (!im) {
      im = this.scene.add.image(0, 0, poseKey(0)).setScale(this.scale);
      this.layer.add(im);
      this.images[i] = im;
    }
    return im;
  }

  update(s: BirdsState, view: Phaser.Geom.Rectangle): void {
    const half = BIRDS.wingspanUnits / 2;
    let n = 0;
    for (const f of s.flocks) {
      if (!f.active) continue;
      for (const b of f.birds) {
        if (b.x < view.x - half || b.x > view.right + half || b.y < view.y - half || b.y > view.bottom + half)
          continue;
        const im = this.image(n++).setVisible(true).setPosition(b.x, b.y);
        const left = b.vx < 0;
        if (b.dive !== 'none') {
          im.setTexture(DIVE_KEY)
            .setFlipX(left)
            .setRotation(Math.atan2(b.vy, Math.abs(b.vx)) * (left ? -1 : 1));
          continue;
        }
        const a = Math.sin(b.phase); // −1 wings down … 1 wings up
        const pose = Math.round(((a + 1) / 2) * (POSES - 1));
        im.setTexture(poseKey(pose))
          .setFlipX(left)
          .setRotation(Math.max(-0.25, Math.min(0.25, b.vy * 0.02)) * (left ? -1 : 1));
      }
    }
    for (let i = n; i < this.images.length; i++) this.images[i]!.setVisible(false);
  }
}

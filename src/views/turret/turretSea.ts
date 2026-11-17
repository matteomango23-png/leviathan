// The turret's sea (owner, 17 novembre 2026: "il mare deve rendere bene… in tempesta vai su, un pochino giù"): bands
// of a painted ripple from the horizon to under your feet, thinner and finer far away, sliding with your course and
// the turret's turn; the swells of the weather rolling through them, the nearer crests rising over what is behind
// them (a ship may sink behind a swell in a storm); whitecaps when it is rough; the sky's light on the far water and
// the mist that swallows it. Drawn round the screen's middle in the roll's container (TurretScene). Look only.
import Phaser from 'phaser';
import { TURRET } from '../../data/turret';
import { focal, horizonY, seaDistanceAt, type Camera } from '../../systems/turret/projection';
import { mix, through, type TurretColours } from './turretLook';

const WAVES = 'turret-waves';
const FOAM = 'turret-foam';
const TILE = 256;
/** Metres of sea one tile of the ripple covers; bands; the first band's height (px) and how much each grows. Tuning. */
const TILE_M = 9;
const BANDS = 46;
const FIRST = 2;
const GROW = 1.13;

function paint(scene: Phaser.Scene, key: string, foam: boolean): void {
  if (scene.textures.exists(key)) return;
  const t = scene.textures.createCanvas(key, TILE, TILE)!;
  const g = t.context;
  if (!foam) {
    g.fillStyle = '#b8b8b8';
    g.fillRect(0, 0, TILE, TILE);
  }
  // long thin ripples, dark troughs and bright crests, wrapped so the tile repeats without a seam
  for (let i = 0; i < (foam ? 70 : 260); i++) {
    const x = Math.random() * TILE;
    const y = Math.random() * TILE;
    const w = (foam ? 6 : 14) + Math.random() * (foam ? 16 : 46);
    const h = 1 + Math.random() * (foam ? 2.5 : 3.5);
    const light = foam || Math.random() < 0.45;
    g.fillStyle = light ? `rgba(255,255,255,${foam ? 0.75 : 0.28})` : 'rgba(40,40,40,0.28)';
    for (const dx of [-TILE, 0, TILE])
      for (const dy of [-TILE, 0, TILE]) {
        g.beginPath();
        g.ellipse(x + dx, y + dy, w / 2, h / 2, 0, 0, Math.PI * 2);
        g.fill();
      }
  }
  t.refresh();
}

interface Band {
  water: Phaser.GameObjects.TileSprite;
  foam: Phaser.GameObjects.TileSprite;
  /** How far this band is (m), for the ship standing among them. */
  d: number;
}

export class TurretSea {
  readonly bands: Band[] = [];

  constructor(scene: Phaser.Scene, box: Phaser.GameObjects.Container) {
    paint(scene, WAVES, false);
    paint(scene, FOAM, true);
    for (let i = 0; i < BANDS; i++) {
      const water = scene.add.tileSprite(0, 0, 10, 10, WAVES).setOrigin(0.5, 0);
      const foam = scene.add.tileSprite(0, 0, 10, 10, FOAM).setOrigin(0.5, 0);
      box.add([water, foam]);
      this.bands.push({ water, foam, d: 0 });
    }
  }

  /** @param ahead how far your ship has sailed (m), and to the side; @param waves the weather's (1 calm … 3.2) */
  update(
    cam: Camera,
    c: TurretColours,
    ahead: number,
    side: number,
    waves: number,
    time: number,
    span: number,
  ): void {
    const f = focal(cam);
    const hy = horizonY(cam);
    const S = TURRET.swell;
    const len = S.length;
    // the bands from the horizon down, each a little taller than the one before
    let y = hy;
    let h = FIRST;
    // along the look, how far you have come: the ripple slides under you as you sail
    const along = ahead * Math.cos(cam.yaw) + side * Math.sin(cam.yaw);
    const across = -ahead * Math.sin(cam.yaw) + side * Math.cos(cam.yaw);
    // first where each band starts (lifted or dropped by the swell), then each reaches down to the next: never a gap
    const rows = this.bands.map(() => {
      const mid = y + h / 2;
      const d = Math.min(TURRET.horizonM * 2, seaDistanceAt(cam, mid));
      const px = f / d; // pixels per metre there
      // the swell: up and down with the waves, rolling towards you
      const phase = ((along + d) / len) * Math.PI * 2 - time * ((S.speed / len) * Math.PI * 2);
      const lift = Math.max(-h * 2.2, Math.min(h * 2.2, S.height * waves * px * Math.sin(phase)));
      const row = { y, h, mid, d, px, phase, top: y - cam.h / 2 - lift };
      y += h;
      h *= GROW;
      return row;
    });
    rows.forEach((r, i) => {
      const band = this.bands[i]!;
      band.d = r.d;
      const visible = r.y < cam.h + span * 0.4;
      band.water.setVisible(visible);
      band.foam.setVisible(visible && c.rough > 0.05);
      if (!visible) return;
      const next = rows[i + 1];
      const tall = Math.max(r.h, (next ? next.top : r.top + r.h * 3) - r.top) + 3;
      const sc = (r.px * TILE_M) / TILE;
      // the far water takes the sky's pale light, everything fades into the mist
      const sky = Math.max(0, 1 - (r.mid - hy) / (cam.h * 0.3)) * 0.45;
      const tint = mix(mix(c.sea, c.skyHorizon, sky), c.mist, 1 - through(c, r.d));
      for (const tile of [band.water, band.foam]) {
        tile.setPosition(0, r.top).setSize(span * 2, tall);
        tile.tileScaleX = sc;
        tile.tileScaleY = Math.max(0.02, sc * (cam.height / r.d) * 3.2);
        tile.tilePositionX = (cam.yaw * f) / sc + (across * TILE) / TILE_M + time * 3;
        tile.tilePositionY = -((along + r.d) * TILE) / TILE_M;
      }
      band.water.setTint(tint);
      band.foam
        .setTint(mix(0xffffff, c.mist, 1 - through(c, r.d)))
        .setAlpha(c.rough * 0.85 * (0.6 + 0.4 * Math.sin(r.phase)));
    });
  }

  /** Above the water only (update shows the bands it needs again). */
  hide(): void {
    for (const b of this.bands) {
      b.water.setVisible(false);
      b.foam.setVisible(false);
    }
  }

  /** How many bands are farther than d (the ship goes among them, the nearer ones over it). */
  fartherThan(d: number): number {
    return this.bands.filter((b) => b.d > d).length;
  }
}

// Drawn pieces of the battle background (made once on a canvas, then used as images): water, distant
// ridges, the middle layer with its props, the ground under each beast, caustics, light beams, haze,
// foreground rocks and the vignette. They stand in for the painted layers until those arrive.
import type Phaser from 'phaser';
import type { BattlePalette, BattlePlace } from '../../data/battle';
import { makeRng, type Rng } from '../../systems/math';
import { canvas, grain, mix, ridge, type Ctx } from './paint';

export function waterTexture(scene: Phaser.Scene, place: BattlePlace, pal: BattlePalette): string {
  return canvas(scene, `bt-water-${place}`, 512, 288, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 288);
    g.addColorStop(0, pal.top);
    g.addColorStop(0.45, mix(pal.top, pal.bottom, 0.6));
    g.addColorStop(0.75, mix(pal.top, pal.bottom, 0.85));
    g.addColorStop(1, pal.bottom);
    c.fillStyle = g;
    c.fillRect(0, 0, 512, 288);
    const glow = c.createRadialGradient(300, -40, 10, 300, -40, 300);
    glow.addColorStop(0, mix(pal.ray, pal.top, 0.3, 0.55));
    glow.addColorStop(1, mix(pal.ray, pal.top, 1, 0));
    c.fillStyle = glow;
    c.fillRect(0, 0, 512, 288);
  });
}

/** Two bands of distant rock lost in the haze. */
export function farTexture(scene: Phaser.Scene, place: BattlePlace, pal: BattlePalette): string {
  return canvas(scene, `bt-far-${place}`, 1024, 512, (c) => {
    const rng = makeRng(place.length * 97 + 11);
    for (const [base, amp, haze] of [
      [250, 70, 0.45],
      [330, 55, 0.3],
    ] as const) {
      const line = ridge(rng, amp, 6);
      c.beginPath();
      c.moveTo(0, 512);
      for (let x = 0; x <= 1024; x += 8) c.lineTo(x, base + line(x / 1024));
      c.lineTo(1024, 512);
      c.closePath();
      const g = c.createLinearGradient(0, base - amp, 0, 512);
      g.addColorStop(0, mix(pal.rock, pal.fog, haze, 0.95));
      g.addColorStop(1, mix(pal.rock, pal.bottom, 0.5, 1));
      c.fillStyle = g;
      c.fill();
    }
    grain(c, 1024, 512, rng, 0.35);
  });
}

function drawProp(c: Ctx, rng: Rng, pal: BattlePalette): void {
  c.lineCap = 'round';
  if (pal.prop === 'arches') {
    // broken stone arches standing on the seabed
    for (const [x, w, h] of [
      [180, 150, 190],
      [760, 120, 150],
    ] as const) {
      c.lineWidth = 26;
      c.strokeStyle = mix(pal.rock, pal.fog, 0.35);
      c.beginPath();
      c.moveTo(x - w / 2, 470);
      c.lineTo(x - w / 2, 470 - h * 0.6);
      c.quadraticCurveTo(x - w / 2, 470 - h, x, 470 - h);
      c.quadraticCurveTo(x + w * 0.3, 470 - h, x + w * 0.35, 470 - h * 0.9); // broken on the right
      c.stroke();
      c.beginPath();
      c.moveTo(x + w / 2, 470);
      c.lineTo(x + w / 2, 470 - h * 0.45);
      c.stroke();
      c.lineWidth = 3;
      c.strokeStyle = mix(pal.rim, pal.fog, 0.3, 0.55);
      c.beginPath();
      c.moveTo(x - w / 2 - 10, 470 - h * 0.6);
      c.quadraticCurveTo(x - w / 2 - 10, 470 - h - 12, x, 470 - h - 12);
      c.stroke();
    }
  } else if (pal.prop === 'roots') {
    // mangrove roots coming down from the surface
    for (let i = 0; i < 14; i++) {
      const x = rng() * 1024;
      c.lineWidth = 6 + rng() * 14;
      c.strokeStyle = mix(pal.rock, pal.fog, 0.25 + rng() * 0.25);
      c.beginPath();
      c.moveTo(x, -10);
      c.bezierCurveTo(
        x + (rng() - 0.5) * 120,
        150,
        x + (rng() - 0.5) * 160,
        260,
        x + (rng() - 0.5) * 200,
        300 + rng() * 120,
      );
      c.stroke();
    }
  } else {
    // the ribs of a dead whale, arching out of the floor: tapering bones half lost in the dark
    for (let i = 0; i < 7; i++) {
      const x = 120 + i * 120 + (rng() - 0.5) * 30;
      const h = 150 + Math.sin((i / 6) * Math.PI) * 120;
      const steps = 14;
      for (let k = 0; k < steps; k++) {
        const t0 = k / steps;
        const t1 = (k + 1) / steps;
        const at = (t: number): [number, number] => [
          (1 - t) ** 2 * x + 2 * (1 - t) * t * (x - 50) + t * t * (x + 40),
          (1 - t) ** 2 * 470 + 2 * (1 - t) * t * (470 - h) + t * t * (470 - h * 1.05),
        ];
        const [ax, ay] = at(t0);
        const [bx, by] = at(t1);
        c.lineWidth = 11 * (1 - t0 * 0.7);
        c.strokeStyle = mix('#a8a290', pal.rock, 0.62 + t0 * 0.1);
        c.beginPath();
        c.moveTo(ax, ay);
        c.lineTo(bx, by);
        c.stroke();
        c.lineWidth = 2;
        c.strokeStyle = mix('#d8d2bc', pal.rim, 0.5, 0.28 * (1 - t0 * 0.5));
        c.beginPath();
        c.moveTo(ax - 4, ay);
        c.lineTo(bx - 4, by);
        c.stroke();
      }
    }
  }
}

/** Rock walls at the sides, the place's props and a low seabed line, with light on the edges. */
/** Only the place's props (arches, roots, ribs), to lay over a borrowed painted middle layer. */
export function propTexture(scene: Phaser.Scene, place: BattlePlace, pal: BattlePalette): string {
  return canvas(scene, `bt-prop-${place}`, 1024, 512, (c) => {
    const rng = makeRng(place.length * 131 + 5);
    drawProp(c, rng, pal);
    grain(c, 1024, 512, rng, 0.45);
  });
}

export function midTexture(scene: Phaser.Scene, place: BattlePlace, pal: BattlePalette): string {
  return canvas(scene, `bt-mid-${place}`, 1024, 512, (c) => {
    const rng = makeRng(place.length * 131 + 5);
    drawProp(c, rng, pal);
    const floor = ridge(rng, 18, 4);
    const wall = (side: 1 | -1): void => {
      const edge = ridge(rng, 40, 5);
      c.beginPath();
      const x0 = side < 0 ? 0 : 1024;
      c.moveTo(x0, 0);
      for (let y = 0; y <= 512; y += 8) c.lineTo(x0 - side * (130 + edge(y / 512) + (y / 512) * 70), y);
      c.lineTo(x0, 512);
      c.closePath();
      c.fillStyle = mix(pal.rock, pal.bottom, 0.2);
      c.fill();
      c.strokeStyle = mix(pal.rim, pal.rock, 0.2, 0.5);
      c.lineWidth = 3;
      c.stroke();
    };
    wall(-1);
    wall(1);
    c.beginPath();
    c.moveTo(0, 512);
    for (let x = 0; x <= 1024; x += 8) c.lineTo(x, 455 + floor(x / 1024));
    c.lineTo(1024, 512);
    c.closePath();
    const g = c.createLinearGradient(0, 430, 0, 512);
    g.addColorStop(0, mix(pal.ground, pal.fog, 0.3));
    g.addColorStop(1, mix(pal.rock, pal.bottom, 0.4));
    c.fillStyle = g;
    c.fill();
    grain(c, 1024, 512, rng, 0.45);
  });
}

/** The oval of seabed a beast stands on: sand and stones, darker at the edge, soft all around. */
export function groundTexture(scene: Phaser.Scene, place: BattlePlace, pal: BattlePalette): string {
  return canvas(scene, `bt-ground-${place}`, 512, 170, (c) => {
    const rng = makeRng(place.length * 17 + 3);
    c.save();
    c.translate(256, 85);
    c.scale(1, 0.32);
    const g = c.createRadialGradient(0, -40, 20, 0, 0, 250);
    g.addColorStop(0, mix(pal.ground, pal.ray, 0.22, 0.95));
    g.addColorStop(0.45, mix(pal.ground, pal.bottom, 0.15, 0.85));
    g.addColorStop(0.8, mix(pal.ground, pal.bottom, 0.55, 0.45));
    g.addColorStop(1, mix(pal.ground, pal.bottom, 1, 0));
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, 250, 0, Math.PI * 2);
    c.fill();
    for (let i = 0; i < 160; i++) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * 215;
      const r2 = r / 215;
      c.fillStyle = mix(
        pal.ground,
        rng() < 0.5 ? pal.bottom : pal.ray,
        0.2 + rng() * 0.25,
        0.35 * (1 - r2 * r2),
      );
      c.beginPath();
      c.arc(Math.cos(a) * r, Math.sin(a) * r, 1.5 + rng() * 4, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  });
}

/** Rippling light on the seabed (drawn with "add"): a net of bright lines fading towards the edge. */
export function causticTexture(scene: Phaser.Scene, n: number): string {
  return canvas(scene, `bt-caustic-${n}`, 384, 128, (c) => {
    const rng = makeRng(n * 53 + 1);
    c.strokeStyle = 'rgba(210,250,255,0.55)';
    for (let i = 0; i < 70; i++) {
      c.lineWidth = 1 + rng() * 2.5;
      const x = rng() * 384;
      const y = rng() * 128;
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(
        x + (rng() - 0.5) * 60,
        y + (rng() - 0.5) * 30,
        x + (rng() - 0.5) * 90,
        y + (rng() - 0.5) * 40,
      );
      c.stroke();
    }
    c.globalCompositeOperation = 'destination-in';
    c.translate(192, 64);
    c.scale(1, 1 / 3);
    const g = c.createRadialGradient(0, 0, 30, 0, 0, 190);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(-192, -192, 384, 384);
  });
}

/** A beam of light from the surface (white, tinted and drawn with "add"). */
export function rayTexture(scene: Phaser.Scene): string {
  return canvas(scene, 'bt-ray', 64, 512, (c) => {
    for (let x = 0; x < 64; x++) {
      const k = Math.exp(-(((x - 32) / 13) ** 2));
      const g = c.createLinearGradient(0, 0, 0, 512);
      g.addColorStop(0, `rgba(255,255,255,${0.9 * k})`);
      g.addColorStop(0.6, `rgba(255,255,255,${0.35 * k})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(x, 0, 1, 512);
    }
  });
}

/** A soft round puff (haze, glows). */
export function blobTexture(scene: Phaser.Scene): string {
  return canvas(scene, 'bt-blob', 256, 256, (c) => {
    const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
  });
}

/** A dark rock very close to the camera, for the bottom-left corner (mirrored for the right). */
export function cornerTexture(scene: Phaser.Scene, place: BattlePlace, pal: BattlePalette): string {
  return canvas(scene, `bt-corner-${place}`, 512, 384, (c) => {
    const rng = makeRng(place.length * 71 + 9);
    const edge = ridge(rng, 26, 3);
    c.beginPath();
    c.moveTo(0, 384);
    c.lineTo(0, 60);
    for (let t = 0; t <= 1; t += 0.02) {
      const a = t * Math.PI * 0.5;
      const r = 1 + edge(t) / 300;
      c.lineTo(Math.sin(a) * 470 * r, 384 - Math.cos(a) * 320 * r);
    }
    c.lineTo(512, 384);
    c.closePath();
    const g = c.createLinearGradient(0, 60, 300, 384);
    g.addColorStop(0, mix(pal.rock, pal.rim, 0.18));
    g.addColorStop(0.4, pal.plant);
    g.addColorStop(1, '#000000');
    c.fillStyle = g;
    c.fill();
  });
}

/** Dark edges all around the screen. */
export function vignetteTexture(scene: Phaser.Scene): string {
  return canvas(scene, 'bt-vignette', 512, 288, (c) => {
    c.translate(256, 144);
    c.scale(1, 288 / 512);
    const g = c.createRadialGradient(0, 0, 150, 0, 0, 300);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.75)');
    c.fillStyle = g;
    c.fillRect(-256, -300, 512, 600);
  });
}

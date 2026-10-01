// The number that pops over a beast when it is hit (gold for a critical hit), or "Schivato!".
import type Phaser from 'phaser';

/** Shows the damage over the centre of a beast (c), whose picture is c.size pixels tall. */
export function damageNumber(
  scene: Phaser.Scene,
  c: { x: number; y: number; size: number },
  damage: number,
  crit: boolean,
): void {
  const h = scene.scale.height;
  const txt = scene.add
    .text(c.x, c.y - c.size * 0.35, damage > 0 ? `${damage}` : 'Schivato!', {
      fontFamily: '"Baloo 2", system-ui, sans-serif',
      fontSize: `${Math.round(h * (crit ? 0.09 : 0.07))}px`,
      fontStyle: '800',
      color: damage <= 0 ? '#c8fff4' : crit ? '#ffd278' : '#ffffff',
      stroke: damage <= 0 ? '#0b3b36' : crit ? '#7a3a00' : '#7a1d14',
      strokeThickness: Math.max(4, h * 0.012),
    })
    .setOrigin(0.5)
    .setDepth(25)
    .setScale(0.4);
  scene.tweens.add({ targets: txt, scale: 1, duration: 160, ease: 'Back.easeOut' });
  scene.tweens.add({
    targets: txt,
    y: txt.y - h * 0.1,
    alpha: 0,
    delay: 450,
    duration: 600,
    onComplete: () => txt.destroy(),
  });
}

// A Phaser tween as a promise, so battle animations can be written one step after the other.
import type Phaser from 'phaser';

export function tweenTo(
  scene: Phaser.Scene,
  target: object,
  props: Record<string, number>,
  ms: number,
  yoyo = false,
  ease = 'Sine.easeInOut',
): Promise<void> {
  return new Promise((done) =>
    scene.tweens.add({ targets: target, ...props, duration: ms, yoyo, ease, onComplete: () => done() }),
  );
}

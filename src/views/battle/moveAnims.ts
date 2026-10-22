// How a beast moves for each kind of move (data/moveAnims.ts; owner, 22 ottobre 2026): it bites with a lunge, charges
// with its whole body, turns and sweeps with its tail, rears and shoots from afar, throbs and sends rings of force,
// swells and glows, or sends waves at the other. Returns when the blow lands (BattleScene shows the hit then).
import type { MoveAnim } from '../../data/moveAnims';
import type { MoveTypeId } from '../../data/rules';
import type { Side } from '../../systems/battle/battle';
import type { MoveFx } from './moveFx';
import type { Pose } from './pose';
import { typeColor, type TypeFx } from './typeFx';

export interface MoveStage {
  pose: (side: Side) => Pose;
  centre: (side: Side) => { x: number; y: number; size: number };
  tween: (
    target: object,
    props: Record<string, number>,
    ms: number,
    yoyo?: boolean,
    ease?: string,
  ) => Promise<void>;
  fx: TypeFx;
  mfx: MoveFx;
  w: number;
  h: number;
}

const wait = (ms: number): Promise<void> => new Promise((done) => window.setTimeout(done, ms));

/** Pulls back and shoots at the other one (a bite or a charge), leaving bubbles; then back to its place. */
async function lunge(s: MoveStage, side: Side, reach: number, windUp: number, dash: number): Promise<void> {
  const p = s.pose(side);
  const dir = side === 'you' ? 1 : -1;
  await s.tween(
    p,
    { dx: -dir * s.w * 0.035 * windUp, dy: dir * s.h * 0.02, scale: 0.94, rot: -dir * 0.06 },
    220 * windUp,
  );
  const from = s.centre(side);
  s.fx.trail(from.x, from.y, from.size);
  await s.tween(
    p,
    {
      dx: dir * s.w * 0.26 * reach,
      dy: -dir * s.h * 0.24 * reach,
      scale: side === 'you' ? 0.9 : 1.12,
      rot: dir * 0.08,
    },
    dash,
    false,
    'Quad.easeIn',
  );
  const mid = s.centre(side);
  s.fx.trail(mid.x, mid.y, mid.size);
  void s.tween(p, { dx: 0, dy: 0, scale: 1, rot: 0 }, 380, false, 'Back.easeOut');
}

export async function playMove(s: MoveStage, side: Side, anim: MoveAnim, type: MoveTypeId): Promise<void> {
  const other: Side = side === 'you' ? 'foe' : 'you';
  const p = s.pose(side);
  const dir = side === 'you' ? 1 : -1;
  const color = typeColor(type);
  const me = s.centre(side);
  const it = s.centre(other);
  if (anim === 'bite') {
    await lunge(s, side, 1, 1, 150);
    s.mfx.jaws(it.x, it.y, it.size, color);
  } else if (anim === 'ram') {
    await lunge(s, side, 1.2, 1.5, 120);
    s.mfx.rings(it.x, it.y, it.size, 0xffffff);
  } else if (anim === 'tail') {
    // a turn of the body towards the other, the sweep across it, and back
    await s.tween(p, { dx: dir * s.w * 0.06, rot: -dir * 0.35 }, 200);
    s.mfx.sweep(it.x, it.y, it.size, color, dir);
    void s.tween(p, { dx: 0, rot: 0 }, 420, false, 'Back.easeOut');
    await wait(120);
  } else if (anim === 'ranged') {
    // it rears up, and the shot flies across
    await s.tween(p, { dy: -s.h * 0.03, scale: 1.05, rot: -dir * 0.05 }, 200);
    s.mfx.shot(me.x, me.y, it.x, it.y, me.size, color, 0.36);
    void s.tween(p, { dy: 0, scale: 1, rot: 0 }, 360, false, 'Back.easeOut');
    await wait(360);
  } else if (anim === 'burst') {
    // it throbs twice where it is, and rings of force break over the other
    await s.tween(p, { scale: 1.12 }, 140, true);
    await s.tween(p, { scale: 1.12 }, 140, true);
    s.mfx.rings(it.x, it.y, it.size, color);
    await wait(120);
  } else if (anim === 'self') {
    // it swells and glows (it grows stronger, it heals): nothing reaches the other
    s.mfx.aura(me.x, me.y, me.size, color);
    await s.tween(p, { scale: 1.1, dy: -s.h * 0.015 }, 300, true, 'Sine.easeInOut');
  } else {
    // waves at the other (a roar, a cloud, a spell)
    await s.tween(p, { dx: dir * s.w * 0.02, scale: 1.04 }, 160);
    s.mfx.waves(me.x, me.y, it.x, it.y, me.size, color, 0.5);
    void s.tween(p, { dx: 0, scale: 1 }, 300);
    await wait(420);
  }
}

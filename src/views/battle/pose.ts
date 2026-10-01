// How a beast is posed in battle at a given moment: the values the animations tween (offsets, scale, light,
// darkness) and what it looks like (picture, size, aura). Drawing is in views/battleView.ts.

export interface Pose {
  key: string | null;
  own: boolean; // a real three-quarter picture (true) or the card (false)
  size: number; // share of the screen height (eases towards target)
  target: number;
  dx: number;
  dy: number;
  scale: number;
  alpha: number;
  tint: number;
  flash: number; // 0..1: white flash when hit
  white: number; // 0..1: turning into light (taming)
  dark: number; // 0..1: a black silhouette (coming out of the dark)
  rot: number;
  t: number; // own clock, for idle motion
  aura: 0 | 1 | 2; // rare: sparkles; giant or legendary: more sparkles and a golden glow
  auraColor: number;
}

export const newPose = (): Pose => ({
  key: null,
  own: false,
  size: 0.4,
  target: 0.4,
  dx: 0,
  dy: 0,
  scale: 1,
  alpha: 1,
  tint: 0xffffff,
  flash: 0,
  white: 0,
  dark: 0,
  rot: 0,
  t: Math.random() * 10,
  aura: 0,
  auraColor: 0xffffff,
});

/** The multiply tint of a pose: its own tint, darkened towards black by `dark`. */
export function poseTint(p: Pose): number {
  const k = 1 - p.dark;
  const r = ((p.tint >> 16) & 255) * k;
  const g = ((p.tint >> 8) & 255) * k;
  const b = (p.tint & 255) * k;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

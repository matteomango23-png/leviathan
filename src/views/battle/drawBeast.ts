// One beast on the battle stage each frame (views/battleView.ts): its picture floating, swaying and breathing (big
// beasts slower and heavier), tinted when hit or tamed, its shadow on the seabed shrinking as it rises, a soft light
// behind it so dark bodies stand out from the dark water, and sparkles on the rare ones.
import Phaser from 'phaser';
import { BATTLE_STAGE } from '../../data/battle';
import type { Side } from '../../systems/battle/battle';
import { poseTint, type Pose } from './pose';
import type { TypeFx } from './typeFx';
import type { BattleGlow } from './battleGlow';

/** Battle pictures are 800×800 with the beast's longest side 760 px, its lowest point at y = 780. */
const PIC = { box: BATTLE_STAGE.picture.box, foot: BATTLE_STAGE.picture.foot / BATTLE_STAGE.picture.square };

interface BeastParts {
  image: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  backlight: Phaser.GameObjects.Image;
  /** Its runes and eyes that shine (data/glow.ts). */
  glow?: BattleGlow;
}

/**
 * @param g its ground on screen (px)
 * @param px its size now (px)
 * @param h the screen's height (px)
 */
export function drawBeast(
  parts: BeastParts,
  p: Pose,
  side: Side,
  g: { x: number; y: number },
  px: number,
  h: number,
  o: { dt: number; rayColor: number; fx: TypeFx },
): void {
  const { image: im, shadow: sh, backlight: bl } = parts;
  // big beasts move slower and heavier
  const slow = 1 / (0.7 + p.size);
  const bob = Math.sin(p.t * 1.1 * slow) * h * 0.012;
  const sway = Math.sin(p.t * 0.7 * slow) * 0.025;
  const breathe = 1 + Math.sin(p.t * 1.6 * slow) * 0.015;
  const hover = BATTLE_STAGE.hover * h;
  const s = (px / (p.own ? PIC.box : im.height)) * p.scale;
  const mirror = side === 'you' && !p.own ? -1 : 1; // the card of your beast, mirrored
  im.setVisible(true)
    .setOrigin(0.5, p.own ? PIC.foot : 0.9)
    .setPosition(g.x + p.dx, g.y - hover + bob + p.dy)
    .setRotation(sway + p.rot)
    .setScale(s * mirror * breathe, s / breathe)
    .setAlpha(p.alpha);
  if (p.white > 0 || p.flash > 0)
    im.setTintMode(Phaser.TintModes.FILL)
      .setTint(p.white > 0 ? 0xfff6dc : 0xffffff)
      .setAlpha(p.alpha * (p.white > 0 ? 0.4 + 0.6 * p.white : 0.5 + 0.5 * p.flash));
  else im.setTintMode(Phaser.TintModes.MULTIPLY).setTint(poseTint(p));
  // the shadow on the seabed shrinks when the beast rises
  const lift = Math.max(0, -p.dy) / h;
  sh.setVisible(true)
    .setPosition(g.x + p.dx * 0.8, g.y)
    .setScale((px * 1.0) / 256 / (1 + lift * 3), (px * 0.16) / 256)
    .setAlpha(0.5 * p.alpha * (1 - Math.min(0.7, lift * 2)));
  bl.setVisible(true)
    .setPosition(g.x + p.dx, g.y - hover - px * 0.5 + p.dy)
    .setScale((px * 1.5) / 256, (px * 1.2) / 256)
    .setTint(p.aura === 2 ? p.auraColor : o.rayColor)
    .setAlpha((p.aura === 2 ? 0.22 : 0.13) * (1 + 0.25 * Math.sin(p.t * 0.8)) * p.alpha * (1 - p.dark));
  // its own picture's glow, off while it flashes or turns white
  parts.glow?.update(
    im,
    p.own && p.key ? p.key.replace(/^battle-/, '') : '',
    p.t,
    p.white <= 0 && p.flash <= 0,
  );
  if (p.aura && p.alpha > 0.6 && p.dark < 0.3 && Math.random() < o.dt * (p.aura === 2 ? 14 : 5))
    o.fx.sparkle(
      g.x + p.dx + (Math.random() - 0.5) * px * 0.9,
      g.y - hover - Math.random() * px + p.dy,
      px,
      p.auraColor,
    );
}

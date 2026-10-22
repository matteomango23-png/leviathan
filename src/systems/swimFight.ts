// Fighting in the water on your own (owner, 8 and 22 ottobre 2026). Your weapons wear a wild beast down before the
// battle, up to half its health: the shy and calm ones slip away, the aggressive ones turn on you. A hunter that
// reaches you while you swim without a mount bites (a heart, a push) and leaves you a moment before it comes again;
// while one is after you, you can face it (the context button, or a tap on one of your beasts). Riding, the battle
// starts as soon as it touches your beast, as before. Pure logic.
import { BEAST_BODY, SWIM_BITE } from '../data/beasts';
import { HARPOON_WEAKEN, MOUNT_BITE, STALK } from '../data/battle';
import { activeBeast, dismount, type BeastWorld } from './beastState';
import { formName } from './beasts/forms';
import { distanceToBody } from './beasts/combat';
import { temperOf } from './beasts/roam';
import { startStalk, stalkPassed } from './beasts/stalk';
import { maxHpOf, teamMembers } from './beasts/team';
import { isInWater, type WildBeast } from './beasts/wildState';
import { hurtDiver } from './diver';
import type { GameEvent } from './events';

/** The share of its health one hit of 1 damage takes: the higher its level, the less (HARPOON_WEAKEN). */
export const woundPerHit = (level: number): number =>
  HARPOON_WEAKEN.max / (HARPOON_WEAKEN.base + HARPOON_WEAKEN.perLevel * Math.max(1, level));

/** A weapon tip on a wild beast: it loses some health (up to half), and runs or turns on you. True if it hit one. */
export function weaponHitsBeast(
  g: BeastWorld,
  x: number,
  y: number,
  events: GameEvent[],
  damage = 1,
): boolean {
  for (const w of g.beasts.wilds) {
    if (!isInWater(w) || w.calm > 0) continue;
    if (distanceToBody(w, x, y) > BEAST_BODY.weaponHitMargin) continue;
    w.flash = BEAST_BODY.hitFlashSeconds;
    w.wounds = Math.min(HARPOON_WEAKEN.max, (w.wounds ?? 0) + woundPerHit(w.level) * Math.max(1, damage));
    // roused: an aggressive one bolts off the screen and comes back charging, the others flee fast (roam.ts)
    w.provoked = HARPOON_WEAKEN.provokedSeconds;
    w.calm = 0;
    if (temperOf(w) === 'aggressive') startStalk(w, g.diver.x);
    else w.mood = 'flee';
    events.push({ type: 'beastWounded', x, y, left: 1 - w.wounds, worn: w.wounds >= HARPOON_WEAKEN.max });
    return true;
  }
  return false;
}

/** Your strongest beast's level (the start of the game is gentler). */
const strongest = (g: BeastWorld): number => Math.max(0, ...teamMembers(g.beasts.team).map((b) => b.level));

/** A hunter reached you while you swim without a mount: it bites, pushes you off and gives you a moment. */
export function swimBite(g: BeastWorld, w: WildBeast, events: GameEvent[]): void {
  const d = g.diver;
  const S = SWIM_BITE;
  hurtDiver(d, 1, events);
  const dx = d.x - w.x;
  const dy = d.y - w.y;
  const l = Math.hypot(dx, dy) || 1;
  d.vx += (dx / l) * S.push;
  d.vy += (dy / l) * S.push;
  w.jaw = 0.4;
  w.calm = S.truce * (strongest(g) < S.gentleUntilLevel ? S.gentleTruce : 1);
  events.push({ type: 'bitten', x: w.x, y: w.y, name: w.boss });
}

/** The hunter after you now, near enough to face: one stalking you (riding too), or coming at you on your own. */
export function hunterAfterYou(g: BeastWorld): WildBeast | undefined {
  const d = g.diver;
  // nobody to face it with (all KO): it only bites
  if (d.dead || g.beasts.aboard) return undefined;
  if (!teamMembers(g.beasts.team).some((b) => !b.ko && b.hp > 0)) return undefined;
  return g.beasts.wilds.find(
    (w) =>
      isInWater(w) &&
      temperOf(w) === 'aggressive' &&
      distanceToBody(w, d.x, d.y) < SWIM_BITE.engageRadius * (w.stalk ? 2 : 1) &&
      (!!w.stalk || (!g.beasts.riding && (w.mood === 'chase' || w.calm > 0))),
  );
}

const clamp = (v: number, [lo, hi]: [number, number]): number => Math.min(hi, Math.max(lo, v));

/** How much your mount's bite takes off a wild beast (its level against your mount's: MOUNT_BITE). */
const mountWound = (mountLevel: number, level: number): number =>
  woundPerHit(level) * MOUNT_BITE.mult * clamp(mountLevel / Math.max(1, level), MOUNT_BITE.levelRange);

/**
 * Riding, your mount dashed into a wild beast (owner, 22 ottobre: "la cavalcatura morde"): it bites it, wearing it down
 * far more than the harpoon, no battle; the beast is pushed off; a hunter stalks you, the others flee.
 */
export function mountBite(g: BeastWorld, w: WildBeast, events: GameEvent[]): void {
  const mount = activeBeast(g);
  if (!mount) return;
  w.wounds = Math.min(HARPOON_WEAKEN.max, (w.wounds ?? 0) + mountWound(mount.level, w.level));
  w.flash = BEAST_BODY.hitFlashSeconds;
  const d = g.diver;
  const away = Math.sign(w.x - d.x) || 1;
  w.vx = away * MOUNT_BITE.push;
  if (g.beasts.mount) g.beasts.mount.jaw = Math.max(g.beasts.mount.jaw, 0.4);
  if (temperOf(w) === 'aggressive') startStalk(w, d.x);
  else Object.assign(w, { mood: 'flee', provoked: HARPOON_WEAKEN.provokedSeconds, calm: 0 });
  w.calm = Math.max(w.calm, 0.8); // it does not touch you again at once
  events.push({
    type: 'beastWounded',
    x: w.x,
    y: w.y,
    left: 1 - w.wounds,
    worn: w.wounds >= HARPOON_WEAKEN.max,
  });
}

/**
 * A stalking hunter's charge reached you: on your own it bites you (a heart, a push); riding, it bites your mount
 * (its health, by the two levels) and you are thrown off together; dashing into it, the two bites cross. Then it goes
 * on past you and comes again.
 */
export function stalkBite(g: BeastWorld, w: WildBeast, events: GameEvent[]): void {
  stalkPassed(w);
  const d = g.diver;
  const dx = d.x - w.x;
  const dy = d.y - w.y;
  const l = Math.hypot(dx, dy) || 1;
  w.jaw = 0.4;
  const mount = g.beasts.riding ? activeBeast(g) : undefined;
  if (!mount) {
    hurtDiver(d, 1, events);
    d.vx += (dx / l) * SWIM_BITE.push;
    d.vy += (dy / l) * SWIM_BITE.push;
    events.push({ type: 'bitten', x: w.x, y: w.y, name: w.boss });
    return;
  }
  const clash = d.rideDashT !== undefined;
  if (clash) {
    w.wounds = Math.min(HARPOON_WEAKEN.max, (w.wounds ?? 0) + mountWound(mount.level, w.level));
    w.flash = BEAST_BODY.hitFlashSeconds;
  }
  const max = maxHpOf(mount);
  const share =
    STALK.mountBite * clamp(w.level / Math.max(1, mount.level), STALK.mountBiteRange) * (clash ? 0.5 : 1);
  mount.hp = Math.max(0, mount.hp - Math.ceil(max * share));
  d.vx += (dx / l) * SWIM_BITE.push;
  d.vy += (dy / l) * SWIM_BITE.push;
  if (g.beasts.mount) g.beasts.mount.flash = BEAST_BODY.hitFlashSeconds;
  events.push({ type: 'mountBitten', name: formName(mount.form), left: mount.hp / max, clash });
  if (mount.hp <= 0) {
    mount.ko = true;
    dismount(g, events);
  }
}

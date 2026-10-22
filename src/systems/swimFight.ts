// Fighting in the water on your own (owner, 8 and 22 ottobre 2026). Your weapons wear a wild beast down before the
// battle, up to half its health: the shy and calm ones slip away, the aggressive ones turn on you. A hunter that
// reaches you while you swim without a mount bites (a heart, a push) and leaves you a moment before it comes again;
// while one is after you, you can face it (the context button, or a tap on one of your beasts). Riding, the battle
// starts as soon as it touches your beast, as before. Pure logic.
import { BEAST_BODY, SWIM_BITE } from '../data/beasts';
import { HARPOON_WEAKEN } from '../data/battle';
import type { BeastWorld } from './beastState';
import { distanceToBody } from './beasts/combat';
import { temperOf } from './beasts/roam';
import { teamMembers } from './beasts/team';
import { isInWater, type WildBeast } from './beasts/wildState';
import { hurtDiver } from './diver';
import type { GameEvent } from './events';

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
    w.wounds = Math.min(HARPOON_WEAKEN.max, (w.wounds ?? 0) + HARPOON_WEAKEN.perDamage * Math.max(1, damage));
    if (temperOf(w) === 'aggressive') Object.assign(w, { mood: 'chase', charging: true, patrol: undefined });
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

/** The hunter after you now (coming at you, near enough to face), if you swim on your own. */
export function hunterAfterYou(g: BeastWorld): WildBeast | undefined {
  const d = g.diver;
  // nobody to face it with (all KO): it only bites
  if (g.beasts.riding || d.dead || g.beasts.aboard) return undefined;
  if (!teamMembers(g.beasts.team).some((b) => !b.ko && b.hp > 0)) return undefined;
  return g.beasts.wilds.find(
    (w) =>
      isInWater(w) &&
      (w.mood === 'chase' || w.calm > 0) &&
      temperOf(w) === 'aggressive' &&
      distanceToBody(w, d.x, d.y) < SWIM_BITE.engageRadius,
  );
}

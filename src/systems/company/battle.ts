// Battle stations (owner, 17 novembre 2026: "una modalità tipo armare la nave… entri in modalità battaglia"):
// "Armi" at the helm with a Compagnia vessel near, or by itself when one hunts you. The view cuts to a wide fixed
// frame that never zooms and moves only when a ship leaves its middle; the vessel keeps its shooting distance; it
// ends when it sinks, when one of you gets away, or when you sink. Your first shot before it saw you hits harder; the
// deciding blow goes in slow motion. Numbers in data/company.ts BATTLE. Pure logic.
import { BATTLE } from '../../data/company';
import type { GameEvent } from '../events';
import type { GameState } from '../newGame';
import { helmScale } from '../shipCamera';
import { afloatEnemies, metres, type BattleState, type EnemyVessel } from './enemyState';

/** The vessel nearest your ship within "Armi"'s reach, or null. */
export function foeInReach(g: GameState): EnemyVessel | null {
  const s = g.ship;
  if (!s.owned || !s.aboard || s.hull <= 0) return null;
  const near = afloatEnemies(g.company)
    .filter((e) => Math.abs(e.x - s.x) <= metres(BATTLE.armM))
    .sort((a, b) => Math.abs(a.x - s.x) - Math.abs(b.x - s.x));
  return near[0] ?? null;
}

/** "Armi" can be pressed now. */
export const canArm = (g: GameState): boolean => !g.company.battle && !!foeInReach(g);

/** To battle stations against this vessel: the view frames you both. */
export function startBattle(g: GameState, foe: EnemyVessel, events: GameEvent[]): void {
  // wide enough for both in its middle, never more than maxFrame: then it keeps its size to the end
  const base = metres(BATTLE.frameM) * helmScale(g.ship);
  const width = Math.min(
    base * BATTLE.maxFrame,
    Math.max(base, Math.abs(foe.x - g.ship.x) * BATTLE.fitShare),
  );
  g.company.battle = {
    foe: foe.id,
    base,
    cx: (g.ship.x + foe.x) / 2,
    width,
    surprise: foe.phase !== 'hunting',
    slow: 0,
    result: null,
    over: 0,
  };
  events.push({ type: 'navalBattle', surprise: foe.phase !== 'hunting' });
}

/** "Timone": back to the helm's view; the vessel stays where it is. */
export function leaveBattle(g: GameState, events: GameEvent[]): void {
  const b = g.company.battle;
  if (!b || b.result) return;
  b.result = 'left';
  b.over = 3;
  events.push({ type: 'navalBattleEnd', result: 'left' });
}

/** The deciding blow: a moment in slow motion. */
export function slowMotion(b: BattleState | null): void {
  if (b) b.slow = BATTLE.slowmo.seconds;
}

/** How fast the sea runs now (1; less in slow motion). */
export const timeScale = (g: { company: { battle: BattleState | null } }): number =>
  (g.company.battle?.slow ?? 0) > 0 ? BATTLE.slowmo.scale : 1;

/** The view follows the two ships only when one leaves its middle, gently. */
function frame(b: BattleState, xs: number[], dt: number): void {
  const half = (b.width / 2) * BATTLE.deadZone;
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  let want = b.cx;
  if (hi > b.cx + half) want = hi - half;
  if (lo < b.cx - half) want = Math.max(lo + half, hi > b.cx + half ? (lo + hi) / 2 : want);
  const most = b.width * BATTLE.panShare * dt;
  b.cx += Math.max(-most, Math.min(most, want - b.cx));
}

/** One step of the battle: auto-start when hunted, the view, and the end. */
export function stepBattle(g: GameState, dt: number, events: GameEvent[]): void {
  const c = g.company;
  if (!c.battle) {
    const hunter = foeInReach(g);
    if (hunter?.phase === 'hunting') startBattle(g, hunter, events);
    return;
  }
  const b = c.battle;
  // slow motion counts real time
  if (b.slow > 0) b.slow = Math.max(0, b.slow - dt / BATTLE.slowmo.scale);
  const foe = c.enemies.find((e) => e.id === b.foe);
  if (b.result) {
    b.over += dt;
    // it holds on the wreck going down, then back to the helm
    if (b.over > 3 && (!foe || foe.sinkT <= 0 || b.over > 6)) c.battle = null;
    return;
  }
  const s = g.ship;
  const end = (result: NonNullable<BattleState['result']>): void => {
    b.result = result;
    events.push({ type: 'navalBattleEnd', result });
  };
  if (!s.aboard) return end('left');
  if (s.hull <= 0) return end('lost');
  if (!foe) return end('left');
  if (foe.sinkT > 0) return end('victory');
  // (never over because it got far: no ship vanishes; you leave with "Timone" and chase it — owner, 17 novembre)
  frame(b, [s.x, foe.x], dt);
}

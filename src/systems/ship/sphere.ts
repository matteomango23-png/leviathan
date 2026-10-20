// The Ocean's Nightmare's sphere (part 4d, owner 9 ottobre 2026): sent from its open bay to the beast you picked, it
// holds it still for a minute (SPHERE.holdSeconds), then comes back and recharges.
import { SPHERE } from '../../data/nightmare';
import type { GameEvent } from '../events';
import { holdOf, locate } from '../tracking';
import { glide, sphereBay, type GadgetsState, type GadgetsWorld } from './gadgetsState';
import { holdPoint } from './geometry';
import { hatchT } from './ship';

/** "Invia sfera" shows: its bay open (owner, 9 ottobre: open it, send it, close it when it is back), a beast
 *  picked, the sphere home. */
export const canSendSphere = (g: GadgetsWorld): boolean => {
  const bay = sphereBay(g.ship);
  return bay >= 0 && hatchT(g.ship, bay) === 1 && !!g.gadgets.target && g.gadgets.sphere.phase === 'dock';
};

/** The sphere is away (its bay cannot be closed meanwhile). */
export const sphereOut = (g: { gadgets: GadgetsState }): boolean => g.gadgets.sphere.phase !== 'dock';

export function sendSphere(g: GadgetsWorld, events: GameEvent[]): void {
  const sp = g.gadgets.sphere;
  const bay = sphereBay(g.ship);
  if (!canSendSphere(g)) return;
  if (sp.phase !== 'dock') return void events.push({ type: 'sphereBusy' });
  if (sp.cooldown > 0) return void events.push({ type: 'sphereCharging', seconds: sp.cooldown });
  Object.assign(sp, { phase: 'go', ...holdPoint(g.ship, bay) });
  events.push({ type: 'sphereGo', name: g.gadgets.targetName });
}

export function stepSphere(g: GadgetsWorld, dt: number, events: GameEvent[]): void {
  const sp = g.gadgets.sphere;
  const bay = sphereBay(g.ship);
  if (bay < 0) return;
  const home = holdPoint(g.ship, bay);
  const t = g.gadgets.target;
  if (sp.phase === 'dock') {
    sp.cooldown = Math.max(0, sp.cooldown - dt);
    Object.assign(sp, home);
  } else if (sp.phase === 'go') {
    const at = t && locate(g, t);
    if (!t || !at) sp.phase = 'back';
    else if (glide(sp, at, SPHERE.speed, SPHERE.reach, dt)) {
      sp.phase = 'hold';
      g.beasts.held = holdOf(t, at, SPHERE.holdSeconds);
      events.push({ type: 'sphereHold', name: g.gadgets.targetName, seconds: SPHERE.holdSeconds });
    }
  } else if (sp.phase === 'hold') {
    const h = g.beasts.held;
    const at = t && locate(g, t);
    if (h) h.left -= dt;
    if (!h || h.left <= 0 || !at) {
      // its minute is over (a battle that started on it lets it go quietly)
      if (h && at) events.push({ type: 'sphereFree', name: g.gadgets.targetName });
      g.beasts.held = null;
      sp.phase = 'back';
    } else {
      // it floats just above the beast it holds
      sp.x = at.x;
      sp.y = at.y - 18;
    }
  } else if (glide(sp, home, SPHERE.speed, 6, dt)) {
    sp.phase = 'dock';
    sp.cooldown = SPHERE.cooldownSeconds;
  }
}

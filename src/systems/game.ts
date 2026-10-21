// One step of the whole game: diver, weapons, fish, beasts, backpack, wrecks, port and missions.
// Pure logic: no Phaser here, so it can be tested and reused.
import { FEEDING } from '../data/beasts';
import { rideNow, stepRideStamina } from './rideStamina';
import { stepTips } from './tips';
import { diverCurrentMult, seaHeight } from './sea';
import { weatherLook } from './weather';
import { depthMetres } from './world/zones';
import { clearTarget, pickTarget, reconOut, sendSphere, startRecon, stepGadgets } from './ship/gadgets';
import { shootTracker, stepTracker } from './trackerDart';
import { learnFromReport, echoKnown, stepScan } from './sonarScan';
import { XP_RULES } from '../data/progression';
import { DIVER, SARDINE } from '../data/diver';
import { WORLD } from '../data/worldLayout';
import { beastEats } from './feeding';
import { refillTanks, tankRanOut } from './breath';
import { rideTank } from './rideAir';
import { bodyCircles, headOf } from './beasts/combat';
import { formName } from './beasts/forms';
import { isInWater } from './beasts/wildState';
import { activeBeast, mountSpeed, stepBeasts, weaponHitsBeast } from './beastPlay';
import { stepDiver } from './diver';
import { catchFish, markSeen } from './catching';
import { stepSwarmCooldowns, useSlot } from './economy/backpack';
import { diverModifiers } from './economy/gear';
import { feedBeast, fishXp, gainXp, isHungry } from './beasts/growth';
import { stepStory, storyHoldsDiver } from './story';
import { stepProgress } from './progress';
import { needsStarter } from './starter';
import { BLACKOUT } from '../data/battle';
import { discoverOutposts, portAt } from './economy/places';
import { PORT, PORTS } from '../data/economy';
import type { GameEvent } from './events';
import { stepFish, takeFish } from './fish';
import { stepPackHunt } from './beasts/packHunt';
import { stepLight, toggleLight } from './ship/underLight';
import { hasMouth, stepMouth, toggleMouth } from './ship/krillMouth';
import { stepShipRams } from './ship/shipHull';
import { stepPool } from './ship/shipPool';
import { stepHarpoon } from './harpoon';
import type { InputState } from './input';
import { stepProjectiles } from './weapons';
import { zoneAt } from './world/zones';
import { regionAt } from './world/stretches';
import { ENDLESS } from '../data/endless';
import { zoneKey } from './seaMap';
import { stepEndlessSchools, stepVents } from './endlessLife';
import { ramSub, subModel } from './submarine';
import { rescue } from './fuel';
import { stepHunts } from './hunts';
import { inVehicle, pushOutOfVehicles, shipPort, stepVehicles, wakeOnShip } from './vehicles';
import { hitLever, stepTemples } from './temple';

export { toSave } from './save/convert';
export { applySave, createGame, type GameState } from './newGame';
export { enterPort, restAtPort, sellAtPort } from './port';
export { canDashNow, currentAction, respawnPoint, type Action } from './playerActions';
import { doAction, fire, respawnPoint } from './playerActions';
import type { GameState } from './newGame';

export function stepGame(g: GameState, input: InputState, dt: number): GameEvent[] {
  const events: GameEvent[] = g.story.pending.splice(0);
  // the sea waits while a dialogue is on screen, a battle is on or you are choosing your first beast
  if (g.story.dialogue || g.beasts.battle || needsStarter(g)) return events;
  g.time += dt;
  g.playTime += dt;
  const d = g.diver;
  const mods = diverModifiers(g.gear);
  if (d.maxHp !== mods.maxHp) {
    d.maxHp = mods.maxHp;
    d.hp = Math.min(d.hp, d.maxHp);
  }

  if (input.action) doAction(g, events);
  if (input.helmCmd === 'rescue') rescue(g, events); // the flare (fuel.ts)
  if (input.helmCmd === 'recon') startRecon(g, events, (t) => echoKnown(g.sonarScan, t));
  // no diving off while the drone is out: you would see it race through the rock (owner, 9 ottobre)
  if (input.helmCmd === 'dive' && reconOut(g)) input.helmCmd = null;
  if (input.helmCmd === 'sphere') sendSphere(g, events);
  const picked = g.gadgets.recon.report?.[input.pickTarget];
  if (picked) pickTarget(g, picked, events);
  if (input.clearTarget) clearTarget(g);
  if (input.helmCmd === 'tracker') shootTracker(g, events);
  // the light under the hull, or the Krill Hunter's mouth (ship/krillMouth.ts)
  if (input.helmCmd === 'light') {
    if (hasMouth(g.ship)) toggleMouth(g, events);
    else toggleLight(g, events);
  }
  stepLight(g, dt, events); // the light under the still ship calls the beasts (ship/underLight.ts)
  stepMouth(g, dt, events);
  stepShipRams(g, events); // giants ramming the ship (ship/shipHull.ts)
  stepPool(g, dt); // the team resting slowly in the pool aboard (ship/shipPool.ts)
  stepGadgets(g, dt, events);
  // the drone back: its report names the beasts on the sonar (block 5, 10 ottobre)
  if (events.some((e) => e.type === 'reconDone') && g.gadgets.recon.report)
    learnFromReport(g, g.gadgets.recon.report);
  stepTracker(g, dt, events); // the trace of the beast you follow (trackerDart.ts)
  stepScan(g, dt, events); // the sonar's analysis of an echo (sonarScan.ts)
  if (input.slot >= 0) useSlot(g, input.slot, events);
  stepSwarmCooldowns(g, dt);

  const held = storyHoldsDiver(g); // on Aurelio's boat during the opening
  const aboard = !held && stepVehicles(g, input, dt, events); // your ship or your submarine moves you
  g.beasts.aboard = aboard;
  const tank = rideTank(g, g.rideTanks, d.maxO2);
  refillTanks(g.rideTanks, tank, dt);
  if (!held && !aboard) {
    stepDiver(d, input, g.map, dt, g.rng, events, {
      respawnAt: respawnPoint(g),
      mountSpeed: mountSpeed(g),
      ride: rideNow(g),
      // near the surface a storm's current holds you back (sea.ts)
      speedMult: mods.speedMult * diverCurrentMult(depthMetres(d.y), weatherLook(g.weather)),
      o2DrainMult: mods.o2DrainMult,
      canDash: mods.canDash,
      maxDepthY: WORLD.surfaceY + mods.maxDepthM * WORLD.unitsPerMetre,
      body: g.beasts.riding && g.beasts.mount ? bodyCircles(g.beasts.mount) : undefined,
      air: tank,
      // the surface over you with its waves, the same the views draw and the boats ride (floatSurface.ts)
      waterLine: g.map.surfaceY - seaHeight(d.x, g.time, weatherLook(g.weather), g.water),
    });
    const whale = activeBeast(g);
    if (tankRanOut(tank) && whale) events.push({ type: 'rideAirOut', name: formName(whale.form) });
  }
  stepRideStamina(g, input, events, dt); // the dash tires the beast you ride, the others rest (stamina.ts)
  // the submarine is solid: you (or the beast you ride) slide along its hull
  // (not on a leap out of the water: it flies over or past the ship and falls back in the sea, 19 ottobre)
  if (!inVehicle(g) && !held && !d.airborne)
    pushOutOfVehicles(
      g,
      d,
      g.beasts.riding && g.beasts.mount ? bodyCircles(g.beasts.mount) : [{ dx: 0, dy: 0, r: DIVER.radius }],
      false,
      g.beasts.riding,
    );
  // after losing your senses you wake up on your boat
  if (events.some((e) => e.type === 'respawned')) wakeOnShip(g, events);
  stepVents(d, dt, g.timers, events);
  // never stuck in rock (a dismount, a tail swipe or being thrown off can drop you there)
  if (!held && !aboard && !d.dead && !g.beasts.riding && g.map.hitCircle(d.x, d.y, DIVER.radius))
    Object.assign(d, g.map.nearestOpen(d.x, d.y, DIVER.radius + 1));
  if (!held && !aboard) fire(g, input, events); // aboard, the weapon button fishes
  const hitBeast = (x: number, y: number): boolean =>
    hitLever(g, x, y, events) || weaponHitsBeast(g, x, y, events);
  const caught = stepHarpoon(g.harpoon, d, g.fish, g.map, dt, events, hitBeast);
  if (caught) catchFish(g, caught, events);
  stepProjectiles(g.weapons, g.fish, g.map, dt, {
    catchFish: (f) => catchFish(g, f, events),
    hitBeast,
  });

  const beastEvents: GameEvent[] = [];
  stepBeasts(g, input, dt, beastEvents);
  // …and the beasts slide along the submarine too (the ship passes them by): wild ones, and yours with you
  for (const w of g.beasts.wilds) if (isInWater(w)) pushOutOfVehicles(g, w, bodyCircles(w), true);
  const follower = g.beasts.mount;
  if (follower && !g.beasts.riding) pushOutOfVehicles(g, follower, bodyCircles(follower), true);
  events.push(...beastEvents);
  for (const e of beastEvents) {
    if (e.type === 'bonesBroken') g.brokenTiles.push(...e.tiles);
    // a big beast against the submarine's hull (only when you are in it)
    if (e.type === 'subRammedBy' && g.sub.aboard) ramSub(g, e.lengthM, e.x, e.y, events);
  }
  if (beastEvents.some((e) => e.type === 'noTeam')) blackout(g, events);
  stepHunts(g, events);

  const eater = activeBeast(g);
  const eaten = beastEats(g.beasts.mount, eater, g.fish, g.timers, dt);
  // only the fish your beast eats are experience, and only a few a minute (XP_RULES.fishPerMinute); the ones you catch
  // yourself go in the bag (owner, 15 ottobre)
  const t = g.timers;
  t.fishXp = Math.min(XP_RULES.fishPerMinute, t.fishXp + (XP_RULES.fishPerMinute / 60) * dt);
  const worth = Math.min(eaten.length, Math.floor(t.fishXp));
  if (eater && worth > 0) {
    t.fishXp -= worth;
    gainXp(eater, fishXp(eater.level) * worth, events);
  }
  // a growing beast (levels 31–50) keeps the fish for its nourishment bar; the rest go in your bag
  for (const f of eaten) {
    if (eater && isHungry(eater)) {
      takeFish(f);
      feedBeast(eater, events);
    } else catchFish(g, f, events);
  }
  const m = g.beasts.mount;
  if (m && eaten.length >= FEEDING.gulpFrom) {
    const h = headOf(m);
    events.push({ type: 'beastGulp', x: h.x, y: h.y, count: eaten.length });
  }
  // the packs hunt (beasts/packHunt.ts): the sardines flee from them too
  const hunters = stepPackHunt(g, dt);
  // the sardines dodge you as big as you are: in the submarine, the boat or on a beast (owner, 15 ottobre)
  const big = g.sub.aboard
    ? (subModel(g.sub.model).lengthM * WORLD.unitsPerMetre) / 2
    : g.beasts.riding && g.beasts.mount
      ? g.beasts.mount.length / 2
      : 0;
  stepFish(g.fish, g.map, { x: d.x, y: d.y, alive: !d.dead, r: big }, g.time, dt, g.rng, hunters);
  stepEndlessSchools(g.fish, g.map, d, g.rng, g.beasts.view);
  for (const f of g.fish.fish) {
    if (f.alive && !d.dead && Math.hypot(f.x - d.x, f.y - d.y) < SARDINE.seenRadius) {
      markSeen(g, f.kind, events);
      break;
    }
  }

  g.port = g.ship.aboard || g.boat.aboard ? shipPort(g) : portAt(d, g.map);
  discoverOutposts(g, events);
  g.atPort = g.port !== null;
  stepProgress(g, events);
  stepStory(g, dt, events);
  stepTips(g.story, events); // Aurelio's tips, the first time each thing happens
  stepTemples(g, events);
  for (const e of events) if (e.type === 'gateOpened') g.brokenTiles.push(...e.tiles);
  const zone = zoneAt(d.x, d.y);
  if (zone && zone !== g.zone) {
    g.zone = zone;
    g.seen.add(zoneKey(zone)); // for the sea map
    if (d.x >= ENDLESS.startX) g.seen.add(zoneKey(regionAt(d.x).name)); // the region's tab of the map
    events.push({ type: 'zoneEntered', name: zone });
  }
  return events;
}

/**
 * A beast touched you with every beast of yours KO. You black out and wake up on your ship (or at your harbour), a
 * few teeth lost on the way. You are healed; your beasts are not (owner, 15 ottobre: losing on purpose healed them):
 * the ones KO stand again with 1 HP, to be healed in the ship's pool or at a port.
 */
export function blackout(g: GameState, events: GameEvent[]): void {
  const at = respawnPoint(g);
  const d = g.diver;
  Object.assign(d, { x: at.x, y: at.y, vx: 0, vy: 0, hp: d.maxHp, o2: d.maxO2 });
  d.invulnerable = DIVER.invulnerableAfterRespawn;
  for (const b of g.beasts.team) {
    if (!b.ko && b.hp > 0) continue;
    b.hp = 1;
    b.ko = false;
  }
  if (g.beasts.riding) g.beasts.riding = false;
  const teethLost = Math.floor(g.gear.teeth * BLACKOUT.teethLoss);
  g.gear.teeth -= teethLost;
  if (g.sub.aboard) g.sub.aboard = false; // the submarine stays where it was
  const onShip = wakeOnShip(g, events);
  // "sulla tua nave" / "a Portofosco"
  const place = onShip ? 'sulla tua nave' : `a ${(PORTS.find((p) => p.id === g.homePort) ?? PORT).name}`;
  events.push({ type: 'blackout', teethLost, place });
}

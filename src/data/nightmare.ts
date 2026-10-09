// Leviatano — the Ocean's Nightmare's gadgets (part 4d, owner 9 ottobre 2026). Its drone scouts by itself every
// beast the ship's sonar can hear and comes back with a report; you pick one, and from then on a compass shows
// you where it is. The sphere goes by itself to the beast you picked and holds it still for a minute, glowing red,
// a red shock running through the beast. Values are tuning: change them here.

export const RECON = {
  /** Units per second of the drone on its round (you swim at 42). */
  speed: 240,
  /** It visits at most this many beasts, nearest first. */
  maxBeasts: 8,
  /** Close enough to a beast to count it as seen (units). */
  reach: 30,
  /** Seconds it chases one beast before giving it up (it swims off too fast). */
  giveUpSeconds: 10,
  /** The hatch opens while the drone is this close to it (units). */
  hatchNear: 90,
};

export const SPHERE = {
  speed: 180,
  /** Seconds the beast stays still. */
  holdSeconds: 60,
  /** Seconds before it can go again once back in its bay (owner did not ask: 0 takes it away). */
  cooldownSeconds: 180,
  reach: 24,
  /** Its red glow: pulses per second; a red shock through the beast every this many seconds. */
  pulseHz: 1.2,
  shockEvery: 1.4,
  hatchNear: 90,
  /** Its size on screen (metres across). */
  sizeM: 3,
};

export const COMPASS = {
  /** Under this many metres the compass says it is here. */
  hereM: 12,
};

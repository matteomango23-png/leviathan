// Leviatano — experience of tamed beasts (tappa 4). Levels, move unlocks, growth and the XP curve are
// in PROGRESSION (rules.ts); this file says how much experience a fight is worth and who gets it.
// Values marked "tuning" are a first pass: change them here, never in systems.

export const XP_RULES = {
  rewardBase: 12, // tuning: exhausting a wild beast of level L gives rewardBase × L^rewardPower XP
  rewardPower: 1.5,
  variantMult: 1.5, // tuning: albino and alfa are worth more
  guardianMult: 4, // tuning: a Guardian is worth much more
  benchShare: 0.25, // the team beasts not in the water get this share (all of them, if none is in the water)
};

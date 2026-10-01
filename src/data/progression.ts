// Leviatano — experience of tamed beasts (tappa 4). Levels, move unlocks, growth and the XP curve are
// in PROGRESSION (rules.ts); this file says how much experience a fight is worth and who gets it.
// Values marked "tuning" are a first pass: change them here, never in systems.

export const XP_RULES = {
  rewardBase: 18, // tuning: exhausting a wild beast of level L gives rewardBase × L^rewardPower XP
  rewardPower: 1.5,
  variantMult: 1.5, // tuning: albino and alfa are worth more
  guardianMult: 4, // tuning: a Guardian is worth much more
  // tuning: a fish caught or eaten feeds the beast in the water (or the first of the team):
  // fishXpBase + fishXpPerLevel × its level. With these numbers a starter reaches level 16 with ~15 fights
  // and some fishing, 36 with ~20 more, 50 takes long (and nourishment).
  fishXpBase: 3,
  fishXpPerLevel: 1,
  benchShare: 0.25, // the team beasts not in the water get this share (all of them, if none is in the water)
};

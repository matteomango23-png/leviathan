// How bright a beast's glow is (data/glow.ts; owner, 21 ottobre 2026): the runes of Scintilla, Saetta and Folgore
// pulse like a shock, a band of light running from the head to the tail and back; eyes and lures shine steady. Pure.
import { GLOW, GLOW_PULSE, type GlowDef } from '../data/glow';

export const glowOf = (key: string): GlowDef | undefined => GLOW[key.replace(/_(front|back)$/, '')];

/**
 * Its light at time `t` (seconds), at `along` of its body (0 the head … 1 the tail): 0 … 1.
 */
export function glowAt(def: GlowDef, t: number, along: number): number {
  if (def.mode === 'steady') return def.strength;
  const P = GLOW_PULSE;
  // the band runs to the tail and back
  const at = 0.5 - 0.5 * Math.cos((t / P.seconds) * Math.PI * 2);
  const band = Math.exp(-(((along - at) / P.width) ** 2));
  const flicker = 1 + P.flicker * Math.sin(t * P.flickerHz * Math.PI * 2 + along * 9);
  return def.strength * Math.min(1, (P.rest + (1 - P.rest) * band) * flicker);
}

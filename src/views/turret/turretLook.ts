// The turret's colours of the moment (owner, 17 novembre 2026: "il mare deve rendere bene… in tempesta… se è notte
// vedi meno"): sky, sea and mist from the weather and the hour, shared by the sky, the sea and the ship in the
// turret's view. Look only.
import Phaser from 'phaser';
import { TURRET } from '../../data/turret';
import type { WeatherLook } from '../../data/weather';

export interface TurretColours {
  skyTop: number;
  skyHorizon: number;
  sea: number;
  /** The mist the far sea and ships fade into. */
  mist: number;
  /** How far one sees before the mist (m). */
  seeM: number;
  /** 0 by day … 1 at night; how rough the sea is (0 calm … 1 storm). */
  night: number;
  rough: number;
}

const C = (n: number): Phaser.Display.Color => Phaser.Display.Color.IntegerToColor(n);

/** Between two colours (0 … 1). */
export function mix(a: number, b: number, t: number): number {
  const k = Math.max(0, Math.min(1, t));
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(C(a), C(b), 1, k);
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
}

/** Day colours, the storm's and the night's (painted by eye on the turret's frames). Tuning. */
const DAY = { top: 0x3f5b6e, horizon: 0xa9bcc4, sea: 0x24485a, mist: 0x93a7b0 };
const STORM = { top: 0x141a1f, horizon: 0x3b464d, sea: 0x162a33, mist: 0x46525a };
const NIGHT = { top: 0x020406, horizon: 0x0c151c, sea: 0x03080c, mist: 0x0a1218 };

export function turretColours(w: WeatherLook, night: number): TurretColours {
  const storm = Math.max(w.clouds * 0.7, Math.min(1, (w.waves - 1) / 2.2));
  const pick = (k: 'top' | 'horizon' | 'sea' | 'mist'): number =>
    mix(mix(DAY[k], STORM[k], storm), NIGHT[k], night);
  const fogSee = TURRET.fogHorizonM + (TURRET.horizonM - TURRET.fogHorizonM) * (1 - w.fog);
  return {
    skyTop: pick('top'),
    skyHorizon: pick('horizon'),
    sea: pick('sea'),
    mist: pick('mist'),
    seeM: fogSee * (1 - 0.35 * w.precip) * (1 - 0.45 * night),
    night,
    rough: Math.max(0, Math.min(1, (w.waves - 0.8) / 2.4)),
  };
}

/** How much of a thing this far away still shows through the mist (1 near … 0 lost). */
export const through = (c: TurretColours, d: number): number => Math.exp(-((d / c.seeM) ** 1.6) * 2.3);

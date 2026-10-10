// What the helm shows, read from the game each frame (helmInfo.ts) and drawn by helmControls.ts.
/** What the levers drive now, and what the instruments show (from the game, each frame). */
export interface HelmInfo {
  mode: 'ship' | 'sub' | 'boat';
  face: 1 | -1;
  knots: number;
  /** The ship's sonar (only at its helm): its line, and whether it is switched on. */
  sonar?: string;
  sonarOn?: boolean;
  /** The hunt you follow (pinned in the diary), shown at the helm. */
  objective?: string;
  /** Litres left, the full tank, and how far they take you at the throttle you have now. */
  fuel: number;
  tank: number;
  rangeKm: number;
  /** A U-Boat at the helm (block 4c): the dive lever shows. Submarine and U-Boat: the air left and full (seconds). */
  canDive?: boolean;
  air?: number;
  airMax?: number;
  /** Submarine and U-Boat: depth and the model's limit (m). */
  depthM?: number;
  maxDepthM?: number;
  /** The submarine's hull, now and whole (shown in its instruments). */
  hull?: [number, number];
  /** Ship only: which buttons work now; its hatches (one or two) and what they say. */
  hatchCanMove?: boolean;
  hatches?: ({ text: string; open: boolean } | null)[];
  canLaunch?: boolean;
  /** "sottomarino", "drone": for "Cala …". */
  subName?: string;
  /** The Ocean's Nightmare (part 4d): its drone can scout now; the beasts in its last report. */
  canRecon?: boolean;
  /** "Tuffati" shows (not while the drone is out on its round). */
  canDiveOff?: boolean;
  /** Its sphere's bay open with a beast picked: "Invia sfera" (or the time left to recharge it). */
  sphere?: { text: string; ready: boolean };
  canLaunchBoat?: boolean;
  /** "motoscafo", "moto d’acqua": for "Cala …". */
  boatName?: string;
  /** Speedboat only: litres in its drums, and how many they hold. */
  drums?: [number, number];
  /** Ship only: its engine runs (owner, 8 ottobre: a button to switch it off). */
  engineOn?: boolean;
  /** Ship only (block 5b): the light under the hull, on or off. */
  lightOn?: boolean;
  /** Submarine only (block 5a): a wild beast close in front, the tracker dart can be fired. */
  canTrack?: boolean;
  /** Ship only: it is still (owner, 9 ottobre: the hatch and dive buttons show only then). */
  still?: boolean;
}

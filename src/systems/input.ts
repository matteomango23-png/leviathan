// What the player is asking for this frame, whatever the device (touch or keyboard).

export interface InputState {
  /** Swim direction, each axis in [-1, 1]. */
  moveX: number;
  moveY: number;
  /** Harpoon held down (button or key): fires repeatedly in the aim direction. */
  fireHeld: boolean;
  /** Aim angle in radians while the weapon button is dragged or the mouse aims; null = aim where you swim. */
  aim: number | null;
  /** One-off shot at a world point (tap on the right side of the screen, mouse click). */
  shotAt: { x: number; y: number } | null;
  /** Dash pressed this frame. */
  dash: boolean;
  /** Context action pressed this frame (tame, ride, get off). */
  action: boolean;
  /** Move button (1..3) pressed this frame while riding, or 0. */
  move: number;
  /** Team slot (0..4) tapped this frame to call or recall a beast, or -1. */
  summon: number;
  /** Tap during the taming minigame. */
  tameTap: boolean;
  /** Backpack slot (0..2) tapped this frame, or -1. */
  slot: number;
}

export const emptyInput = (): InputState => ({
  moveX: 0,
  moveY: 0,
  fireHeld: false,
  aim: null,
  shotAt: null,
  dash: false,
  action: false,
  move: 0,
  summon: -1,
  tameTap: false,
  slot: -1,
});

/** Clears the one-frame presses after a game step. */
export function consumePresses(input: InputState): void {
  input.shotAt = null;
  input.dash = false;
  input.action = false;
  input.move = 0;
  input.summon = -1;
  input.tameTap = false;
  input.slot = -1;
}

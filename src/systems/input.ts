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
}

export const emptyInput = (): InputState => ({
  moveX: 0,
  moveY: 0,
  fireHeld: false,
  aim: null,
  shotAt: null,
  dash: false,
});

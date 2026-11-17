// Every finger on its own in the turret (owner, 17 novembre 2026: "quando clicchi due pulsanti insieme non funziona
// bene… mentre miro devo sparare o cambiare arma"): each finger takes the role of what it touched first (the trigger,
// the throttle, a button, or the view to turn the turret) and keeps it until it is lifted, even if it slides off the
// button. Any number of fingers at once. No DOM here: ui/turretControls.ts feeds it the pointer events.

export interface TouchHandlers {
  down?(role: string, x: number, y: number): void;
  /** Moved by (dx, dy) since the last move, now at (x, y). */
  move?(role: string, dx: number, dy: number, x: number, y: number): void;
  up?(role: string): void;
}

export class TouchRouter {
  private readonly fingers = new Map<number, { role: string; x: number; y: number }>();

  constructor(private readonly on: TouchHandlers = {}) {}

  down(id: number, role: string, x: number, y: number): void {
    if (this.fingers.has(id)) this.up(id);
    this.fingers.set(id, { role, x, y });
    this.on.down?.(role, x, y);
  }

  move(id: number, x: number, y: number): void {
    const f = this.fingers.get(id);
    if (!f) return;
    const dx = x - f.x;
    const dy = y - f.y;
    f.x = x;
    f.y = y;
    this.on.move?.(f.role, dx, dy, x, y);
  }

  up(id: number): void {
    const f = this.fingers.get(id);
    if (!f) return;
    this.fingers.delete(id);
    this.on.up?.(f.role);
  }

  /** Some finger holds this role now. */
  held(role: string): boolean {
    for (const f of this.fingers.values()) if (f.role === role) return true;
    return false;
  }

  /** All fingers lifted at once (the window lost focus). */
  clear(): void {
    for (const id of [...this.fingers.keys()]) this.up(id);
  }
}

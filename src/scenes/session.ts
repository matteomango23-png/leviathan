// What the scenes share while the game runs. Created once by Boot and handed to each scene
// (no global variables): the world state, the current input and a message bus.
import Phaser from 'phaser';
import type { GameEvent } from '../systems/events';
import type { GameState } from '../systems/game';
import { emptyInput, type InputState } from '../systems/input';
import type { SaveData } from '../systems/save/saveData';
import { SoundEngine } from '../audio/soundEngine';

export interface SessionEvents {
  /** Game events of the last step (World → UI). */
  gameEvents: (events: GameEvent[]) => void;
  /** A short message for the player. */
  toast: (text: string) => void;
  /** Ask to open or close the pause menu. */
  pause: () => void;
  resume: () => void;
  /** A save file was imported and must replace the current game. */
  importSave: (save: SaveData) => void;
  /** Save now (e.g. before exporting). */
  saveNow: () => void;
  /** Leave this game: 'new' starts over (the current one becomes the previous game), 'previous' swaps back. */
  switchGame: (to: 'new' | 'previous') => void;
  /** A battle opens (true) or ends (false): the sea's controls hide meanwhile. */
  battle: (on: boolean) => void;
  /** Test panel: skip to the next kind of weather. */
  skipWeather: () => void;
  /** The diver reached the pier: open the port menu. */
  openPort: () => void;
  /** The Cockpit button at the helm of the ship. */
  openCockpit: () => void;
  /** The Ocean's Nightmare: show the drone's report. */
  openRecon: () => void;
}

export class Session {
  readonly bus = new Phaser.Events.EventEmitter();
  input: InputState = emptyInput();
  /** A tap on the screen to shoot at, in CSS pixels (converted to world by the World scene). */
  tapScreen: { x: number; y: number } | null = null;
  game: GameState | null = null;
  paused = false;
  /** The ship's cockpit is open: the sea goes on under it (owner, 5 ottobre: sail slowly watching the sonar). */
  inCockpit = false;
  /** A battle is on (the World scene is paused under it). */
  inBattle = false;
  /** The sea ambience and the battle music. */
  readonly sound = new SoundEngine();

  constructor() {
    this.on('battle', (on) => this.sound.setBattle(on));
  }

  emit<K extends keyof SessionEvents>(event: K, ...args: Parameters<SessionEvents[K]>): void {
    this.bus.emit(event, ...args);
  }

  on<K extends keyof SessionEvents>(event: K, fn: SessionEvents[K], context?: unknown): void {
    this.bus.on(event, fn, context);
  }

  off<K extends keyof SessionEvents>(event: K, fn: SessionEvents[K], context?: unknown): void {
    this.bus.off(event, fn, context);
  }
}

export interface SceneData {
  session: Session;
}

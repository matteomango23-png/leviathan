// Everything that draws the sea for the World scene (split from WorldScene in the cleanup of 19 ottobre 2026): the
// camera, the painted layers, the vehicles, the beasts, the diver, the birds and the weather, and the light mask.
// It only reads the game state (and steps the look-only weather and birds); the scene runs the game.
import Phaser from 'phaser';
import { CAMERA, DIVER } from '../data/diver';
import { WORLD } from '../data/worldLayout';
import { createBirds, stepBirds, type BirdsState } from '../systems/birds';
import { turbidityAt } from '../systems/clarity';
import type { GameState } from '../systems/game';
import type { InputState } from '../systems/input';
import { lampOf } from '../systems/lamp';
import { subFloodSpots } from '../systems/ship/floodlight';
import { reconOut } from '../systems/ship/gadgets';
import { boatBay, subBay } from '../systems/ship/model';
import { hatchT } from '../systems/ship/ship';
import { atHelmView, cameraAim } from '../systems/shipCamera';
import { storyHoldsDiver } from '../systems/story';
import { lampAim } from '../systems/submarine';
import { inVehicle } from '../systems/vehicles';
import { coldAt, stepWeather, weatherLook } from '../systems/weather';
import type { TileMap } from '../systems/world/tileMap';
import { depthMetres } from '../systems/world/zones';
import { BackgroundView } from '../views/backgroundView';
import { BeastsLayer } from '../views/beastsLayer';
import { SurfaceOver } from '../views/surfaceOver';
import { isInWater } from '../systems/beasts/wildState';
import { activeBeast } from '../systems/beastPlay';
import { BirdsView } from '../views/birdsView';
import { BoatView } from '../views/boatView';
import { CameraRig } from '../views/cameraRig';
import { DeltaView } from '../views/deltaView';
import { DiverView } from '../views/diverView';
import { EffectsView } from '../views/effectsView';
import { FishView } from '../views/fishView';
import { GearFxView } from '../views/gearFxView';
import { HuntView } from '../views/huntView';
import { KelpView } from '../views/kelpView';
import { LightView } from '../views/lightView';
import { NightmareView } from '../views/nightmareView';
import { PlacesView } from '../views/placesView';
import { SceneryView } from '../views/sceneryView';
import { SeaSurfaceView } from '../views/seaSurfaceView';
import { ShipView } from '../views/shipView';
import { StoryView } from '../views/storyView';
import { SubmarineView } from '../views/submarineView';
import { TempleView } from '../views/templeView';
import { TerrainView } from '../views/terrainView';
import { VentView } from '../views/ventView';
import { WeatherView, weatherReach } from '../views/weatherView';
import { WorldArtView } from '../views/worldArtView';
import { snapGulls } from './worldEvents';

/** How fast the murk on screen eases towards the water's own (per second). */
const MURK_EASE = 0.8;

export class WorldViews {
  readonly rig: CameraRig;
  readonly terrain: TerrainView;
  readonly effects: EffectsView;
  readonly ship: ShipView;
  private readonly bg: BackgroundView;
  private readonly kelp: KelpView;
  private readonly vents: VentView;
  private readonly temple: TempleView;
  private readonly worldArt: WorldArtView;
  private readonly sub: SubmarineView;
  private readonly boat: BoatView;
  private readonly hunts: HuntView;
  private readonly fishView: FishView;
  private readonly beasts: BeastsLayer;
  /** The waves' line and the water's veil across a beast half out of the water, in front of it and its rider. */
  private readonly surfaceOver: SurfaceOver;
  private readonly places: PlacesView;
  private readonly story: StoryView;
  private readonly gearFx: GearFxView;
  private readonly diverView: DiverView;
  private readonly light: LightView;
  private readonly weatherView: WeatherView;
  private readonly nightmare: NightmareView;
  private readonly surface: SeaSurfaceView;
  private readonly birdsView: BirdsView;
  /** Weather and sea birds: look only, not part of the game state and not saved. */
  private readonly birds: BirdsState = createBirds();
  private helmView: boolean;
  /** The murk tinting the screen, easing towards the water's own. */
  private murkShown = NaN;
  private lampAngle: number;
  /** The red flash of a blow, fading. */
  hurtFlash = 0;

  constructor(scene: Phaser.Scene, map: TileMap, g: GameState) {
    const d = g.diver;
    this.rig = new CameraRig(scene, map.width, map.height, d.x, d.y);
    const L = this.rig.layers;
    this.bg = new BackgroundView(scene, L.bg);
    this.terrain = new TerrainView(scene, L.world, map);
    this.places = new PlacesView(scene, L.world, g.wrecks);
    this.story = new StoryView(scene, L.world);
    new SceneryView(scene, L.world);
    new DeltaView(scene, L.world, L.front);
    this.kelp = new KelpView(scene, L.world, L.front, map);
    this.vents = new VentView(scene, L.world);
    this.temple = new TempleView(scene, L.world);
    this.worldArt = new WorldArtView(scene, L.world, map);
    this.surface = new SeaSurfaceView(scene, L.world, map); // behind the vehicles that ride its waves
    this.ship = new ShipView(scene, L.world, L.glow);
    this.hunts = new HuntView(scene, L.world);
    this.boat = new BoatView(scene, L.world);
    this.sub = new SubmarineView(scene, L.world, L.glow);
    this.nightmare = new NightmareView(scene, L.world, L.glow);
    this.fishView = new FishView(scene, L.world, g.fish);
    this.beasts = new BeastsLayer(scene, L.world, g);
    this.birdsView = new BirdsView(scene, L.world);
    this.diverView = new DiverView(scene, L.world);
    this.surfaceOver = new SurfaceOver(scene, L.world);
    this.effects = new EffectsView(scene, L.world);
    this.gearFx = new GearFxView(scene, L.world);
    this.light = new LightView(scene, L.overlay);
    this.weatherView = new WeatherView(scene, L.bg, L.overlay);
    this.lampAngle = d.aim;
    const aim0 = cameraAim(g, CAMERA.lookAhead);
    this.rig.setView(aim0.viewH, aim0.minY, 0, true);
    this.rig.follow(aim0.x, aim0.y, 0, true);
    this.helmView = atHelmView(g);
    this.terrain.update(this.rig.worldView(), true);
  }

  /** Draws one frame. @param onThunder lightning struck: how loud its thunder is heard (0…1) */
  update(
    g: GameState,
    input: InputState,
    dt: number,
    onThunder: (loud: number) => void,
    onRain: (r: number) => void,
  ): void {
    const d = g.diver;
    // the helm's view or yours (systems/shipCamera.ts): a change cuts at once behind a short fade, never a glide
    // (owner, 5 ottobre: any glide made the ship slide sideways)
    const helmView = atHelmView(g);
    const cut = helmView !== this.helmView;
    this.helmView = helmView;
    if (cut) this.rig.fadeCut(CAMERA.cutFadeMs);
    const aim = cameraAim(g, g.beasts.riding ? CAMERA.lookAhead * 2 : CAMERA.lookAhead);
    this.rig.setView(aim.viewH, aim.minY, dt, true);
    this.rig.follow(aim.x, aim.y, dt, cut);
    const view = this.rig.worldView();
    const info = this.rig.viewInfo();
    this.terrain.update(view);
    const under = Math.max(0, Math.min(1, depthMetres(d.y) / 20)); // under water the weather is muffled
    if (stepWeather(g.weather, dt)) {
      this.weatherView.lightning(info);
      onThunder(1 - under * 0.7);
    }
    const sky = weatherLook(g.weather);
    onRain(sky.precip * (1 - under));
    const birdView = { x: view.centerX, halfW: view.width / 2 };
    for (const s of stepBirds(this.birds, dt, birdView, sky.birds, sky.wind, g.fish.schools))
      this.effects.puff(s.x, s.y, 5, 0xd8e6ee, 18);
    snapGulls(g, this.birds); // on a leap out of the water (worldEvents.ts)
    this.bg.update(info, g.time, sky);
    this.kelp.update(view, g.time);
    this.vents.update(view, g.time);
    this.temple.update(view, g, g.time);
    this.worldArt.update(view);
    const sea = { ...sky, water: g.water }; // the waves, and the water the hulls push (waterColumns.ts)
    this.surface.update(view, g.time, sea);
    this.ship.update(g.ship, g.time, dt, sea);
    this.hunts.update(g, view, g.time);
    const boatHidden = g.boat.bay === 'docked' && hatchT(g.ship, boatBay(g.ship)) < 0.6;
    this.boat.update(g.boat, g.time, boatHidden, sea, dt);
    // the drone away on its round is drawn by the Nightmare's view, not in the hold
    const inHold = g.ship.bay === 'docked' && (hatchT(g.ship, subBay(g.ship)) < 0.6 || reconOut(g));
    this.sub.update(g.sub, g.time, dt, inHold, sky);
    this.nightmare.update(g, g.time);
    this.fishView.update(g.fish, view, g.time, dt);
    // murky water (clarity.ts): the beasts far from you are dark shapes
    this.beasts.update(g, g.time, { murk: turbidityAt(d.x, d.y, g.time, sky), x: d.x, y: d.y });
    const rider = this.beasts.riderPose(g);
    this.diverView.update(d, g.harpoon, input.fireHeld ? input.aim : null, dt, g.time, rider);
    const nearTop = (y: number, len: number): boolean => Math.abs(y - WORLD.surfaceY) < len;
    this.surfaceOver.update(
      [
        ...(g.beasts.mount && activeBeast(g) ? [g.beasts.mount] : []),
        ...g.beasts.wilds.filter((w) => isInWater(w) && nearTop(w.y, w.length)),
      ],
      g.time,
      sea,
    );
    this.birdsView.update(this.birds, view);
    this.effects.update(g.time, dt);
    this.places.update(g.gear, g.time);
    this.story.update(g.story);
    this.diverView.setHidden(storyHoldsDiver(g) || inVehicle(g)); // at the helm or inside the submarine
    this.gearFx.update(g, rider ?? d, g.time);

    let da = lampAim(g) - this.lampAngle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    // the boat's headlight turns with it at once (owner, 8 ottobre: "direttamente"), the diver's lamp gently
    this.lampAngle += g.boat.aboard ? da : da * Math.min(1, dt * 6);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    const lowO2 =
      d.o2 < d.maxO2 * DIVER.oxygen.lowFraction && !d.dead ? 0.25 + 0.18 * Math.sin(g.time * 6) : 0;
    const fade = d.dead ? Phaser.Math.Clamp(1.4 - d.deadTime * 0.6, 0, 1) : 0;
    // the murk tints the whole screen: only as much as the view is under water (owner, 9 ottobre: launching a boat
    // the screen turned another colour while the camera dipped under the surface, then snapped back)
    const viewWet = Phaser.Math.Clamp((info.cy - WORLD.surfaceY) / (info.h / 2 / info.zoom), 0, 1);
    const murkNow = turbidityAt(info.cx, info.cy, g.time, sky) * viewWet;
    // and it changes softly: no jump on screen whatever changes it (owner, 9 ottobre)
    this.murkShown = Number.isNaN(this.murkShown)
      ? murkNow
      : this.murkShown + (murkNow - this.murkShown) * Math.min(1, dt * MURK_EASE);
    const murk = this.murkShown;
    const glows = [
      ...this.places.glowSpots(g.gear),
      ...this.ship.glowSpots(g.ship, murk), // with its floodlights under water (owner, 15 ottobre)
      ...subFloodSpots(g.sub, murk),
      ...this.nightmare.glowSpots(g),
    ];
    this.light.update(
      info,
      { ...lampOf(g, rider, murk), angle: this.lampAngle, face: d.face },
      Math.max(this.hurtFlash, lowO2),
      fade,
      glows,
      murk,
      sky.dim * weatherReach(info.cy),
    );
    this.weatherView.update(info, sky, coldAt(info.cx), g.time, dt, sea);
  }
}

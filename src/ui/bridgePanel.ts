// The bridge of the cockpit (owner, 5 ottobre: "design da plancia della marina"): the hunt you follow, the chart
// of the next 2 km each side, the dials (fuel of the ship and of the submarine, speed), the weather, moving fuel
// between the two and the rescue flare.
import { HUNTS } from '../data/hunts';
import { boatModel } from '../systems/boat';
import { boatName } from '../systems/ship/boatBay';
import { FUEL, RESCUE, SHIP } from '../data/ship';
import type { WeatherId } from '../data/weather';
import { OPEN_SEA_X } from '../data/worldLayout';
import { chartAround } from '../systems/chart';
import { autonomyKm, canRescue, rescue, transferFuel } from '../systems/fuel';
import { hullMax } from '../systems/ship/shipHull';
import { seaWords, waterWords, windWords } from '../systems/seaReport';
import { turbidityAt } from '../systems/clarity';
import { CLARITY } from '../data/sea';
import { weatherLook } from '../systems/weather';
import { WORLD } from '../data/worldLayout';
import type { GameState } from '../systems/game';
import { knotsOf } from '../systems/helm';
import { huntNextStep, huntOpen, huntRegionName, weatherNow } from '../systems/hunts';
import { shipTank, shipTopSpeed } from '../systems/ship/ship';
import { shipModel } from '../systems/ship/model';
import { subModel } from '../systems/submarine';
import { coldAt, weatherName } from '../systems/weather';
import { kmFromCoast, regionAt } from '../systems/world/endless';
import { el } from './dom';
import { chartStrip, dial } from './instruments';

export interface BridgeContext {
  g: GameState;
  say: (text: string, error?: boolean) => void;
  redraw: () => void;
  /** Fires the rescue flare and closes the cockpit (its message shows in the sea). */
  fired: () => void;
}

const km = (v: number): string => (v < 10 ? v.toFixed(1).replace('.', ',') : `${Math.round(v)}`);
const WEATHER_ICON: Record<WeatherId, string> = {
  sereno: '☀',
  nuvoloso: '☁',
  pioggia: '🌧',
  tempesta: '⛈',
  nebbia: '🌫',
};

function panel(parent: HTMLElement, title: string, cls = ''): HTMLElement {
  const p = el('section', `bridge-panel ${cls}`, parent);
  el('div', 'bridge-panel-title', p, title);
  return p;
}

/** The hunt you follow, with its next step (or how to choose one). */
function objectivePanel(b: HTMLElement, g: GameState): void {
  const p = panel(b, 'Obiettivo seguito', 'objective');
  const h = HUNTS.find((x) => x.id === g.huntPinned);
  if (!h || !huntOpen(h, g.beasts.gone, g.beasts.team)) {
    el('div', 'bridge-objective-none', p, 'Nessuno. Nel Diario apri una caccia e tocca “Segui”.');
    return;
  }
  const pr = g.hunts[h.id];
  el('div', 'bridge-objective-name', p, `🎯 ${h.name} · ${huntRegionName(h)}`);
  const steps = el('div', 'bridge-steps', p);
  for (const [done, label] of [
    [pr?.heard, 'Voce'],
    [pr?.echo, 'Eco'],
    [pr?.traces, 'Tracce'],
    [false, 'Bestia'],
  ] as const)
    el('span', `bridge-step${done ? ' done' : ''}`, steps, `${done ? '✓' : '○'} ${label}`);
  el('div', 'bridge-objective-next', p, `Prossimo passo: ${huntNextStep(h, pr)}.`);
}

export function renderBridge(b: HTMLElement, ctx: BridgeContext): void {
  const { g } = ctx;
  const ship = g.ship;
  const sub = g.sub;
  const wrap = el('div', 'bridge', b);
  objectivePanel(wrap, g);

  const where =
    ship.x > OPEN_SEA_X
      ? `${km(kmFromCoast(ship.x))} km dalla costa · ${regionAt(ship.x).name}`
      : 'lungo la costa';
  chartStrip(
    panel(wrap, `Carta nautica · ±${SHIP.chart.halfKm} km · ${where}`, 'wide'),
    chartAround(g),
    ship.face,
  );

  const dials = el('div', 'bridge-dials', panel(wrap, 'Strumenti', 'wide'));
  const tank = shipTank(ship);
  dial(dials, {
    label: 'Carburante nave',
    share: ship.fuel / tank,
    value: `${Math.round(ship.fuel)}`,
    unit: `L su ${tank}`,
    note: `${km(autonomyKm(ship.fuel, shipModel(ship).perKm))} km a tutto gas`,
    warnBelow: 0.2,
  });
  // its hull (block 5c): mended only at Porto Fango
  dial(dials, {
    label: 'Scafo nave',
    share: ship.hull / hullMax(ship),
    value: `${Math.round(ship.hull)}`,
    unit: `su ${hullMax(ship)}`,
    note: ship.hull <= 0 ? 'in avaria: ricambi da Porto Fango o rimorchiatore' : 'si ripara a Porto Fango',
    warnBelow: 0.5,
  });
  if (sub.owned) {
    const m = subModel(sub.model);
    dial(dials, {
      label: 'Carburante sottomarino',
      share: sub.fuel / m.tank,
      value: `${Math.round(sub.fuel)}`,
      unit: `L su ${m.tank}`,
      note: `${km(autonomyKm(sub.fuel, m.perKm))} km a tutto gas`,
      warnBelow: 0.2,
    });
  }
  const top = knotsOf(shipTopSpeed(ship));
  const kn = knotsOf(ship.speed);
  dial(dials, {
    label: 'Velocità',
    share: kn / top,
    value: `${Math.round(kn)}`, // knotsOf can give 6.4799999…: whole knots on the dial
    unit: 'nodi',
    note:
      kn > 0
        ? `verso ${ship.face > 0 ? 'est ▶' : '◀ ovest'}`
        : `ferma · prua a ${ship.face > 0 ? 'est' : 'ovest'}`,
  });
  const w = weatherNow(g.weather);
  const wx = el('div', 'dial weather', dials);
  el('div', 'weather-icon', wx, coldAt(ship.x) >= 0.5 && w === 'pioggia' ? '❄' : WEATHER_ICON[w]);
  el('div', 'dial-label', wx, 'Meteo');
  el('div', 'dial-note', wx, weatherName(g.weather, ship.x));
  el('div', 'dial-note', wx, `sonar ${ship.sonarOn ? 'acceso' : 'spento'}`);
  // wind, sea and water (owner, 10 ottobre: wind, water quality and visibility in the cockpit)
  const look = weatherLook(g.weather);
  dial(dials, {
    label: 'Vento',
    share: look.wind,
    value: windWords(look.wind),
    unit: '',
    note: seaWords(look).text,
    warnBelow: -1,
  });
  const water = waterWords(turbidityAt(ship.x, WORLD.surfaceY + 40, g.time, look));
  dial(dials, {
    label: 'Acqua',
    share: water.visibilityM / CLARITY.visibilityM,
    value: water.text,
    unit: '',
    note: `visibilità circa ${water.visibilityM} m`,
    warnBelow: 0.5,
  });

  if (sub.owned) {
    const m = subModel(sub.model);
    const docked = ship.bay === 'docked';
    const step = FUEL.transferStep;
    const tp = panel(wrap, 'Travaso carburante', 'transfer');
    if (!docked)
      el('div', 'bridge-hint', tp, 'Il sottomarino è fuori dalla stiva: il travaso si fa con lui a bordo.');
    const row = el('div', 'bridge-buttons', tp);
    const toSub = el('button', 'console-btn', row, `▼ ${step} L al sottomarino`);
    toSub.disabled = !docked || ship.fuel <= 0 || sub.fuel >= m.tank;
    toSub.addEventListener('click', () => {
      ctx.say(`${Math.round(transferFuel(g, true))} L passati al sottomarino.`);
      ctx.redraw();
    });
    const toShip = el('button', 'console-btn', row, `▲ ${step} L alla nave`);
    toShip.disabled = !docked || sub.fuel <= 0 || ship.fuel >= tank;
    toShip.addEventListener('click', () => {
      ctx.say(`${Math.round(transferFuel(g, false))} L passati alla nave.`);
      ctx.redraw();
    });
  }

  if (g.boat.owned) {
    // the speedboat (block 4b): its tank fills from the ship and its drums pour into it when it docks
    const b = g.boat;
    const m = boatModel(b.model);
    const bp = panel(wrap, boatName(ship));
    el(
      'div',
      'bridge-hint',
      bp,
      `Serbatoio ${Math.round(b.fuel)} / ${m.tank} L · fusti ${Math.round(b.drums)} / ${m.drums} L`,
    );
    el(
      'div',
      'bridge-hint',
      bp,
      b.bay === 'docked'
        ? 'Nella stiva. Riempi i fusti a un avamposto: quando rientra li travasa nella nave.'
        : 'È fuori: rientra dal suo portellone aperto con Aggancia.',
    );
  }

  const cost = Math.min(
    g.gear.teeth,
    Math.max(RESCUE.minTeeth, Math.floor(g.gear.teeth * RESCUE.teethShare)),
  );
  const rp = panel(wrap, 'Emergenza', 'danger');
  el('div', 'bridge-hint', rp, `Un rimorchiatore porta la nave al porto più vicino. Costa ${cost} denti.`);
  const flare = el('button', 'console-btn red', el('div', 'bridge-buttons', rp), '🚀 Razzo di soccorso');
  flare.disabled = !canRescue(g);
  flare.addEventListener('click', () => {
    rescue(g, g.story.pending);
    ctx.fired();
  });
}

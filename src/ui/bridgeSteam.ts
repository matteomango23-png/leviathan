// The bridge of the steam cockpit (owner, 9 ottobre 2026): his painted screens, the live data on them. A window
// scrolls over the chart picture (the chart in its screen, the hunt you follow over it, needles turning on the
// cream dials, the weather in the copper one), then over the panels picture (the fuel transfer on its plates by
// the painted lever, the rescue flare on the red plate). Same data and actions as bridgePanel.ts.
import { HUNTS } from '../data/hunts';
import { STEAM_BRIDGE, STEAM_NEEDLE, type Rect } from '../data/cockpitSteam';
import { FUEL, RESCUE } from '../data/ship';
import type { WeatherId } from '../data/weather';
import { boatModel } from '../systems/boat';
import { chartAround } from '../systems/chart';
import { autonomyKm, canRescue, rescue, transferFuel } from '../systems/fuel';
import { knotsOf } from '../systems/helm';
import { huntNextStep, huntOpen, weatherNow } from '../systems/hunts';
import { boatName } from '../systems/ship/boatBay';
import { shipModel } from '../systems/ship/model';
import { shipTank, shipTopSpeed } from '../systems/ship/ship';
import { subModel } from '../systems/submarine';
import { coldAt, weatherName } from '../systems/weather';
import type { BridgeContext } from './bridgePanel';
import { el } from './dom';
import { chartStrip } from './instruments';
import { crop, heightIn, place } from './steamStage';

const km = (v: number): string => (v < 10 ? v.toFixed(1).replace('.', ',') : `${Math.round(v)}`);
const WEATHER_ICON: Record<WeatherId, string> = {
  sereno: '☀',
  nuvoloso: '☁',
  pioggia: '🌧',
  tempesta: '⛈',
  nebbia: '🌫',
};

/** A painted dial brought to life: its needle at `share`, the value in the face, a label under it. */
function gauge(
  part: HTMLElement,
  within: Rect,
  [cx, cy, r]: readonly [number, number, number],
  d: { share: number; value: string; unit: string; label: string; low?: boolean },
): void {
  // the face is round: its height in % of the picture's height (the picture is wider than tall)
  const rh = r * (1375 / 768);
  const face = place(el('div', 'steam-dial'), [cx - r, cy - rh, cx + r, cy + rh], within);
  part.append(face);
  const share = Math.max(0, Math.min(1, d.share));
  const needle = el('div', `steam-needle${d.low ? ' low' : ''}`, face);
  needle.style.transform = `rotate(${STEAM_NEEDLE.from + (STEAM_NEEDLE.to - STEAM_NEEDLE.from) * share}deg)`;
  el('div', 'steam-hub', face);
  el('div', 'steam-dial-value', face, d.value);
  el('div', 'steam-dial-unit', face, d.unit);
  const [y0, y1] = STEAM_BRIDGE.chart.labelY;
  part.append(
    place(el('div', 'steam-label', undefined, d.label), [cx - r * 1.6, y0, cx + r * 1.6, y1], within),
  );
}

function objectiveLine(ctx: BridgeContext): string {
  const g = ctx.g;
  const h = HUNTS.find((x) => x.id === g.huntPinned);
  if (!h || !huntOpen(h, g.beasts.gone, g.beasts.team))
    return 'Nessun obiettivo · nel Diario tocca “Segui” su una caccia';
  return `🎯 ${h.name} · ${huntNextStep(h, g.hunts[h.id])}`;
}

export function renderBridgeSteam(win: HTMLElement, ctx: BridgeContext): void {
  const { g } = ctx;
  const ship = g.ship;
  const sub = g.sub;
  const B = STEAM_BRIDGE;

  // first part: the chart picture
  const A = B.chart;
  const a = crop(el('div', 'steam-part', win), 'chart', A.crop);
  a.style.height = heightIn(A.crop, B.window);
  a.append(place(el('div', 'steam-objective', undefined, objectiveLine(ctx)), A.objective, A.crop));
  const screen = place(el('div', 'steam-chart'), A.screen, A.crop);
  a.append(screen);
  chartStrip(screen, chartAround(g), ship.face);

  const tank = shipTank(ship);
  gauge(a, A.crop, A.dials[0]!, {
    share: ship.fuel / tank,
    value: `${Math.round(ship.fuel)}`,
    unit: `L su ${tank}`,
    label: `Nave · ${km(autonomyKm(ship.fuel, shipModel(ship).perKm))} km`,
    low: ship.fuel / tank < 0.2,
  });
  if (sub.owned) {
    const m = subModel(sub.model);
    gauge(a, A.crop, A.dials[1]!, {
      share: sub.fuel / m.tank,
      value: `${Math.round(sub.fuel)}`,
      unit: `L su ${m.tank}`,
      label: `Sottomarino · ${km(autonomyKm(sub.fuel, m.perKm))} km`,
      low: sub.fuel / m.tank < 0.2,
    });
  } else if (g.boat.owned) {
    const m = boatModel(g.boat.model);
    gauge(a, A.crop, A.dials[1]!, {
      share: g.boat.fuel / m.tank,
      value: `${Math.round(g.boat.fuel)}`,
      unit: `L su ${m.tank}`,
      label: boatName(ship).replace(/^(Il|La) /, ''),
    });
  }
  const kn = knotsOf(ship.speed);
  gauge(a, A.crop, A.dials[2]!, {
    share: kn / knotsOf(shipTopSpeed(ship)),
    value: `${Math.round(kn)}`,
    unit: 'nodi',
    label: kn > 0 ? `Verso ${ship.face > 0 ? 'est ▶' : '◀ ovest'}` : 'Ferma',
  });
  const [wx, wy, wr] = A.weather;
  const wh = wr * (1375 / 768);
  const w = weatherNow(g.weather);
  const weather = place(el('div', 'steam-weather'), [wx - wr, wy - wh, wx + wr, wy + wh], A.crop);
  el('div', 'steam-weather-icon', weather, coldAt(ship.x) >= 0.5 && w === 'pioggia' ? '❄' : WEATHER_ICON[w]);
  el('div', 'steam-weather-name', weather, weatherName(g.weather, ship.x));
  el('div', 'steam-weather-sonar', weather, `sonar ${ship.sonarOn ? 'acceso' : 'spento'}`);
  a.append(weather);

  // second part: the panels picture
  const P = B.panels;
  const p = crop(el('div', 'steam-part', win), 'panels', P.crop);
  p.style.height = heightIn(P.crop, B.window);
  const step = FUEL.transferStep;
  const plate = (r: Rect, label: string, cls: string, disabled: boolean, run: () => void): void => {
    const btn = el('button', `steam-plate ${cls}`, p, label);
    place(btn, r, P.crop);
    btn.disabled = disabled;
    btn.addEventListener('click', run);
  };
  if (sub.owned) {
    const m = subModel(sub.model);
    const docked = ship.bay === 'docked';
    plate(P.toSub, `▼ ${step} L al sottomarino`, '', !docked || ship.fuel <= 0 || sub.fuel >= m.tank, () => {
      ctx.say(`${Math.round(transferFuel(g, true))} L passati al sottomarino.`);
      ctx.redraw();
    });
    plate(P.toShip, `▲ ${step} L alla nave`, 'brass', !docked || sub.fuel <= 0 || ship.fuel >= tank, () => {
      ctx.say(`${Math.round(transferFuel(g, false))} L passati alla nave.`);
      ctx.redraw();
    });
  }
  const cost = Math.min(
    g.gear.teeth,
    Math.max(RESCUE.minTeeth, Math.floor(g.gear.teeth * RESCUE.teethShare)),
  );
  const boat = g.boat.owned
    ? `${boatName(ship)}: ${Math.round(g.boat.fuel)} L, fusti ${Math.round(g.boat.drums)}/${boatModel(g.boat.model).drums} L. `
    : '';
  p.append(
    place(
      el(
        'div',
        'steam-note',
        undefined,
        `${boat}Emergenza: un rimorchiatore porta la nave al porto più vicino (${cost} denti).`,
      ),
      P.note,
      P.crop,
    ),
  );
  plate(P.flare, '🚀 Razzo di soccorso', 'red', !canRescue(g), () => {
    rescue(g, g.story.pending);
    ctx.fired();
  });
}

// The hunting diary (cockpit of the ship, and the board of every harbour). Owner, 5 ottobre 2026: "troppo testo
// messo male" — each rumour is a small card (name, region, four step lights); touching it opens its sheet with
// everything laid out, and a "Segui" button that pins it on the bridge and at the helm (g.huntPinned, saved).
import { CONDITION_TEXT, HUNTS, type HuntDef } from '../data/hunts';
import { WORLD } from '../data/worldLayout';
import type { GameState } from '../systems/game';
import { huntNextStep, huntOpen, huntRegionName } from '../systems/hunts';
import { kmFromCoast } from '../systems/world/endless';
import { el } from './dom';
import { ICONS } from './icons';

const STEPS = ['Voce', 'Eco', 'Tracce', 'Bestia'] as const;

function stepsDone(g: GameState, h: HuntDef): boolean[] {
  const p = g.hunts[h.id];
  return [!!p?.heard, !!p?.echo, !!p?.traces, !huntOpen(h, g.beasts.gone, g.beasts.team)];
}

function outcome(g: GameState, h: HuntDef): string | null {
  if (huntOpen(h, g.beasts.gone, g.beasts.team)) return null;
  return h.form.unique && g.beasts.team.some((t) => t.form.unique === h.form.unique)
    ? 'catturata'
    : 'sconfitta';
}

/** The sheet of one hunt: every piece of it in rows, and the button to follow it. */
function openSheet(parent: HTMLElement, g: GameState, h: HuntDef, redraw: () => void): void {
  const i = HUNTS.indexOf(h);
  const p = g.hunts[h.id]!;
  const root = el('div', 'diary-sheet', parent);
  const card = el('div', 'diary-sheet-card', root);
  root.addEventListener('click', (e) => {
    if (e.target === root) root.remove();
  });
  const head = el('div', 'diary-sheet-head', card);
  el('h3', '', head, h.name);
  const x = el('button', 'sheet-close', head);
  x.innerHTML = ICONS.close;
  x.addEventListener('click', () => root.remove());

  const done = stepsDone(g, h);
  const track = el('div', 'diary-track', card);
  STEPS.forEach((s, k) => {
    const st = el('div', `diary-track-step${done[k] ? ' done' : ''}`, track);
    el('span', 'diary-dot', st, done[k] ? '✓' : `${k + 1}`);
    el('span', '', st, s);
  });

  const rows = el('dl', 'diary-rows', card);
  const row = (k: string, v: string): void => {
    el('dt', '', rows, k);
    el('dd', '', rows, v);
  };
  const den = g.dens[i];
  row('Regione', huntRegionName(h));
  row('Quando', CONDITION_TEXT[h.condition]);
  row('La voce', h.rumour);
  row(
    'Eco anomala',
    p.echo && den
      ? `trovata a ${kmFromCoast(den.x).toFixed(1).replace('.', ',')} km dalla costa, a ${Math.round((den.y - WORLD.surfaceY) / WORLD.unitsPerMetre)} m`
      : 'non ancora: sonar della nave acceso, sotto 10 nodi, col tempo giusto',
  );
  row('Tracce', p.traces ? h.traces : 'non ancora: cala il sottomarino vicino all’eco');
  const out = outcome(g, h);
  row(out ? 'Esito' : 'Prossimo passo', out ? `la bestia è stata ${out}` : huntNextStep(h, p));

  if (!out) {
    const pinned = g.huntPinned === h.id;
    const follow = el(
      'button',
      `pbtn ${pinned ? '' : 'primary'} diary-follow`,
      card,
      pinned ? 'Smetti di seguire' : '🎯 Segui',
    );
    follow.addEventListener('click', () => {
      g.huntPinned = pinned ? null : h.id;
      redraw();
    });
  }
}

export function renderDiary(b: HTMLElement, g: GameState, redraw: () => void): void {
  const heard = HUNTS.filter((h) => g.hunts[h.id]?.heard);
  el(
    'p',
    'port-hint',
    b,
    heard.length
      ? 'Tocca una caccia per vederla tutta e seguirla: l’obiettivo seguito appare in plancia e al timone.'
      : 'Nessuna voce ancora. Ascoltale nei porti e negli avamposti: ognuno parla dei suoi mari.',
  );
  const grid = el('div', 'diary-grid', b);
  for (const h of heard) {
    const done = stepsDone(g, h);
    const out = outcome(g, h);
    const c = el(
      'button',
      `diary-card${out ? ' closed' : ''}${g.huntPinned === h.id ? ' pinned' : ''}`,
      grid,
    );
    const top = el('div', 'diary-card-top', c);
    el('span', 'diary-card-name', top, h.name);
    if (g.huntPinned === h.id) el('span', 'diary-badge pin', top, '🎯 seguita');
    else if (out) el('span', 'diary-badge', top, out);
    el('div', 'diary-card-where', c, `${huntRegionName(h)} · ${CONDITION_TEXT[h.condition]}`);
    const lights = el('div', 'diary-lights', c);
    STEPS.forEach((s, k) => el('span', `diary-light${done[k] ? ' done' : ''}`, lights, s));
    c.addEventListener('click', () => openSheet(b, g, h, redraw));
  }
  const left = HUNTS.length - heard.length;
  if (left > 0) el('p', 'port-hint', b, `Altre ${left} voci da scoprire, più lontano.`);
}

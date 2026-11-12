// The harbour board, the shop window of the game (owner, 16 ottobre 2026: his first tester found a white shark and
// never learnt there were legends): the Wanted of this sea as big cards, the ones further out only as shadows until
// their rumour is heard; the bounties with the beast's picture; the other jobs; the sonar's notes.
import { CONDITION_TEXT, HUNTS, type HuntDef } from '../data/hunts';
import { MAX_ACTIVE_MISSIONS, PORT, type MissionDef } from '../data/economy';
import {
  acceptMission,
  boardMissions,
  claimMission,
  goalCount,
  isComplete,
  missionById,
} from '../systems/economy/missions';
import { huntReady, huntReadyLevel, huntRegionName, rumoursAt } from '../systems/hunts';
import { wildLevelRange } from '../systems/beasts/forms';
import { setArt } from './art';
import { el } from './dom';
import { openSheet, outcome, stepsDone } from './huntDiary';
import { portCard } from './portCard';
import type { TabContext } from './portTabs';
import { renderSonarNotes } from './sonarNotes';
import { bountyRow } from './bountyCards';
import { BOUNTY_RULES, BOUNTY_TEXT } from '../data/bounties';
import { boardBounties } from '../systems/economy/bounties';

/** Hunts heard elsewhere or not yet, shown as shadows: a taste of what waits further out. */
const TEASERS = 2;
const STEPS = ['Voce', 'Eco', 'Tracce', 'Bestia'];

export function renderBoard(b: HTMLElement, ctx: TabContext): void {
  // the bounties' path, from the easiest beasts to the legends (owner, 26 ottobre 2026), then the other jobs
  el('p', 'port-hint', b, BOUNTY_TEXT.hint);
  for (const kind of ['comune', 'rara'] as const) bountyRow(b, ctx, kind, boardBounties(ctx.g, kind));
  renderWanted(b, ctx);
  renderJobs(b, ctx);
  renderSonarNotes(b, ctx.g);
}

function renderWanted(b: HTMLElement, ctx: TabContext): void {
  const g = ctx.g;
  const here = rumoursAt(g.port ?? PORT);
  const heard = (h: HuntDef): boolean => !!g.hunts[h.id]?.heard;
  const shadows = HUNTS.filter((h) => !here.includes(h) && !heard(h)).slice(0, TEASERS);
  const head = el('h3', '', b);
  el(
    'p',
    'port-hint',
    b,
    `Leggende e giganti di questi mari: ${BOUNTY_RULES.reward.legend} denti a chi ne batte o cattura una che segue. Tocca una card per sapere dove e quando cercarla, e seguila col sonar della nave.`,
  );
  const row = el('div', 'wanted-row', b);
  // following one changes only the cards' marks and the count (a redraw made the page jump)
  const marks = (): void => {
    head.textContent = `${BOUNTY_TEXT.rows.leggendaria} · seguiti ${g.huntPinned ? 1 : 0} di ${BOUNTY_RULES.follow.leggendaria}`;
    for (const c of row.querySelectorAll<HTMLElement>('.wanted-card[data-hunt]')) {
      const pinned = g.huntPinned === c.dataset.hunt;
      c.classList.toggle('pinned', pinned);
      c.querySelector('.wanted-pin')?.remove();
      if (pinned && !c.classList.contains('closed')) el('div', 'wanted-pin', c, '🎯 seguita');
    }
  };
  for (const h of here) wantedCard(row, ctx, h, marks);
  for (const h of shadows) shadowCard(row, ctx, h);
  marks();
}

function wantedCard(row: HTMLElement, ctx: TabContext, h: HuntDef, marks: () => void): void {
  const g = ctx.g;
  const out = outcome(g, h);
  const c = el('button', `wanted-card${out ? ' closed' : ''}`, row);
  c.dataset.hunt = h.id;
  const img = el('img', 'wanted-art', c);
  img.alt = '';
  img.loading = 'lazy';
  setArt(img, { speciesId: h.form.speciesId, variant: 'comune', unique: h.form.unique });
  const info = el('div', 'wanted-info', c);
  el('div', 'wanted-name', info, h.name);
  el('div', 'wanted-where', info, `${huntRegionName(h)} · ${CONDITION_TEXT[h.condition]}`);
  // too strong for your team yet (owner, 12 novembre 2026): said plainly, no rumour, no echo, nothing to follow
  if (!out && !huntReady(h, g.beasts.team)) {
    const [lo, hi] = wildLevelRange({ variant: 'comune', ...h.form });
    c.classList.add('too-strong');
    el(
      'div',
      'wanted-where too-strong-text',
      info,
      `Troppo forte per ora: livello ${lo}-${hi}. Torna con la squadra al ${huntReadyLevel(h)}.`,
    );
  }
  const lights = el('div', 'diary-lights', info);
  const done = stepsDone(g, h);
  STEPS.forEach((s, k) => el('span', `diary-light${done[k] ? ' done' : ''}`, lights, s));
  if (out) el('div', 'wanted-stamp', c, out);
  c.addEventListener('click', () => openSheet(row, g, h, marks, ctx.say));
}

function shadowCard(row: HTMLElement, ctx: TabContext, h: HuntDef): void {
  const c = el('button', 'wanted-card shadow', row);
  const img = el('img', 'wanted-art', c);
  img.alt = '';
  img.loading = 'lazy';
  setArt(img, { speciesId: h.form.speciesId, variant: 'comune', unique: h.form.unique });
  const info = el('div', 'wanted-info', c);
  el('div', 'wanted-name', info, h.name); // its name too, so you know what you will look for (12 novembre)
  el(
    'div',
    'wanted-where',
    info,
    `Si racconta di qualcosa: ${huntRegionName(h)}, ${CONDITION_TEXT[h.condition]}`,
  );
  c.addEventListener('click', () =>
    ctx.say(`Una voce che si sente solo più al largo: vai verso ${huntRegionName(h)} e ascolta nei porti.`),
  );
}

function missionButton(
  ctx: TabContext,
  m: MissionDef,
  active: boolean,
): { label: string; disabled: boolean; onClick: () => void } {
  const gear = ctx.g.gear;
  if (!active)
    return {
      label: 'Accetta',
      disabled: false,
      onClick: () => {
        if (acceptMission(gear, m.id)) ctx.say('Missione accettata.');
        else ctx.say(`Hai già ${MAX_ACTIVE_MISSIONS} missioni in corso.`, true);
        ctx.redraw();
      },
    };
  const done = isComplete(gear, m.id);
  const p = Math.min(gear.missions.progress[m.id] ?? 0, goalCount(m));
  return {
    label: done ? 'Riscuoti' : `${p} / ${goalCount(m)}`,
    disabled: !done,
    onClick: () => {
      ctx.say(`Missione compiuta: +${claimMission(gear, m.id)} denti.`);
      ctx.redraw();
    },
  };
}

function renderJobs(b: HTMLElement, ctx: TabContext): void {
  const gear = ctx.g.gear;
  const active = gear.missions.active.map((id) => missionById(id)!).filter(Boolean);
  const open = boardMissions(gear);
  el('h3', '', b, `Incarichi · in corso ${gear.missions.active.length} di ${MAX_ACTIVE_MISSIONS}`);
  const grid = el('div', 'pcard-grid', b);
  if (!active.length && !open.length) el('p', 'port-hint', grid, 'Per ora non ci sono altri incarichi.');
  for (const m of active) {
    const c = portCard(grid, {
      icon: 'scroll',
      title: m.title,
      text: m.text,
      price: m.reward,
      state: isComplete(gear, m.id) ? 'active' : '',
      badge: 'in corso',
      button: missionButton(ctx, m, true),
    });
    const p = Math.min(gear.missions.progress[m.id] ?? 0, goalCount(m));
    const bar = el('div', 'pcard-progress', c);
    el('div', 'pcard-progress-fill', bar).style.width = `${(p / goalCount(m)) * 100}%`;
  }
  for (const m of open)
    portCard(grid, {
      icon: 'scroll',
      title: m.title,
      text: m.text,
      price: m.reward,
      button: missionButton(ctx, m, false),
    });
}

// Hearts, oxygen, depth and messages (top-left, inside the iPhone safe area).
import { DIVER } from '../data/diver';
import { FISH, ITEMS, SWARMS, WEAPONS } from '../data/world';
import { SPECIES } from '../data/species';
import { missionById } from '../systems/economy/missions';
import type { GameEvent } from '../systems/events';
import type { GameState } from '../systems/game';
import { formName } from '../systems/beasts/forms';
import { depthMetres } from '../systems/world/zones';
import { el } from './dom';

const fishName = (id: string): string =>
  FISH.find((f) => f.id === id)?.name ??
  SPECIES.find((s) => s.id === id)?.name ??
  SWARMS.find((s) => s.id === id)?.name ??
  id;
const itemName = (id: string): string => ITEMS.find((i) => i.id === id)?.name ?? id;
const weaponName = (id: string): string => WEAPONS.find((w) => w.id === id)?.name ?? id;

export class Hud {
  private readonly hearts: HTMLDivElement;
  private readonly o2: HTMLDivElement;
  private readonly o2Fill: HTMLDivElement;
  private readonly info: HTMLDivElement;
  private readonly zone: HTMLDivElement;
  private readonly toastEl: HTMLDivElement;
  private toastTimer = 0;
  private zoneTimer = 0;
  private cache = { hp: -1, max: -1, o2: -1, info: '' };

  constructor(root: HTMLElement) {
    const hud = el('div', 'hud', root);
    this.hearts = el('div', 'hud-hearts', hud);
    this.o2 = el('div', 'hud-o2', hud);
    el('span', '', this.o2, 'O₂');
    const bar = el('div', 'hud-o2-bar', this.o2);
    this.o2Fill = el('div', 'hud-o2-fill', bar);
    this.info = el('div', 'hud-info', hud);
    this.zone = el('div', 'zone-name', root);
    this.toastEl = el('div', 'toast', root);
  }

  toast(text: string, seconds = 2.6): void {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    this.toastTimer = seconds;
  }

  onEvents(events: GameEvent[], g: GameState): void {
    const wild = (id: number) => g.beasts.wilds.find((w) => w.id === id);
    const tamed = (uid: string) => g.beasts.team.find((b) => b.uid === uid);
    for (const e of events) {
      if (e.type === 'zoneEntered') {
        this.zone.textContent = e.name;
        this.zone.classList.add('show');
        this.zoneTimer = 2.4;
      } else if (e.type === 'creatureSeen') this.toast(`Nuova creatura nel bestiario: ${fishName(e.id)}`);
      else if (e.type === 'fishCaught')
        this.toast(
          e.healed
            ? `${fishName(e.fishId)}. Un cuore recuperato.`
            : `${fishName(e.fishId)} nella sacca (${g.gear.bag[e.fishId] ?? 0})`,
          1.6,
        );
      else if (e.type === 'oxygenLow') this.toast('Ossigeno basso. Risali in superficie!');
      else if (e.type === 'died')
        this.toast(
          g.sanctuaries.current === null
            ? 'Il mare ti ha respinto in superficie.'
            : 'Ti risvegli al santuario.',
          3,
        );
      else if (e.type === 'wildAppeared') {
        const w = wild(e.id);
        if (!w) continue;
        this.toast(
          w.form.variant === 'comune' && !w.form.unique
            ? `${formName(w.form)}. Enorme. Tieni pronto l’arpione.`
            : `Rarissimo: ${formName(w.form)}!`,
          3,
        );
      } else if (e.type === 'wildExhausted') {
        const w = wild(e.id);
        if (w) this.toast(`${formName(w.form)}: sfinito. Avvicinati e domalo!`, 3);
      } else if (e.type === 'wildFled') this.toast('Ne hai già uno uguale: fugge nel buio.', 3);
      else if (e.type === 'wildRecovered') this.toast('Si è ripreso. Sfiancalo di nuovo.', 2.4);
      else if (e.type === 'tamingStarted') this.toast('Tieniti forte!', 1.5);
      else if (e.type === 'tamingFailed') this.toast('Ti ha disarcionato. Colpiscilo ancora.', 3);
      else if (e.type === 'tamed') {
        const b = tamed(e.uid);
        if (b)
          this.toast(
            e.toTeam
              ? `${formName(b.form)} domato! È nella tua squadra: lo stai cavalcando.`
              : `${formName(b.form)} domato. La squadra è piena: va in riserva.`,
            3.5,
          );
      } else if (e.type === 'summoned') {
        const b = tamed(e.uid);
        if (b) this.toast(`${formName(b.form)} arriva dal buio.`, 1.8);
      } else if (e.type === 'beastKo') {
        const b = tamed(e.uid);
        if (b) this.toast(`${formName(b.form)} è KO. Portalo a un santuario per curarlo.`, 3.2);
      } else if (e.type === 'sanctuaryReached')
        this.toast('Santuario raggiunto: rinascerai qui. Resta fermo per curarti.', 3);
      else if (e.type === 'bonesBroken') this.toast('Le ossa antiche cedono!', 1.5);
      else if (e.type === 'swarmBound')
        this.toast('Lo sciame di sardine ti segue! Mettilo nello zaino al porto per chiamarlo.', 4);
      else if (e.type === 'swarmSummoned') this.toast('Un muro di sardine ti circonda.', 1.8);
      else if (e.type === 'swarmAbsorbed') this.toast('Le sardine hanno preso il morso al posto tuo.', 1.4);
      else if (e.type === 'shieldBlocked') this.toast('Il guscio ha parato il colpo.', 1.4);
      else if (e.type === 'itemUsed') this.toast(`${itemName(e.id)} usato.`, 1.4);
      else if (e.type === 'tooDeep')
        this.toast('La muta non regge questa profondità: serve una muta migliore.', 3);
      else if (e.type === 'missionComplete')
        this.toast(`Missione compiuta: ${missionById(e.id)?.title ?? ''}. Riscuoti i denti al porto.`, 3.5);
      else if (e.type === 'wreckOpened') {
        const parts = [
          e.weapon ? `hai trovato: ${weaponName(e.weapon)}` : '',
          e.teeth ? `${e.teeth} denti` : '',
          e.item ? itemName(e.item) : '',
        ].filter(Boolean);
        this.toast(`Tesoro! ${parts.join(', ')}.${e.weapon ? ' Mettila nello zaino al porto.' : ''}`, 4);
      }
    }
  }

  update(g: GameState, dt: number): void {
    const d = g.diver;
    if (d.hp !== this.cache.hp || d.maxHp !== this.cache.max) {
      this.cache.hp = d.hp;
      this.cache.max = d.maxHp;
      this.hearts.innerHTML = '';
      for (let i = 0; i < d.maxHp; i++) el('span', i < d.hp ? '' : 'empty', this.hearts, '♥');
    }
    const o2 = Math.round((d.o2 / d.maxO2) * 100);
    if (o2 !== this.cache.o2) {
      this.cache.o2 = o2;
      this.o2Fill.style.width = `${o2}%`;
      this.o2.classList.toggle('low', o2 < DIVER.oxygen.lowFraction * 100);
    }
    const bag = Object.values(g.gear.bag).reduce((a, b) => a + b, 0);
    const info = `${Math.round(depthMetres(d.y))} m · 🦷 ${g.gear.teeth} · sacca ${bag}`;
    if (info !== this.cache.info) {
      this.cache.info = info;
      this.info.textContent = info;
    }
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastEl.classList.remove('show');
    }
    if (this.zoneTimer > 0) {
      this.zoneTimer -= dt;
      if (this.zoneTimer <= 0) this.zone.classList.remove('show');
    }
  }
}

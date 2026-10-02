// Port tab "Mute": the submarines (tappa 16) under the suits. Buy a better one, or take out one you own.
import { SUB_MODELS } from '../data/submarine';
import { buySub, subModel } from '../systems/submarine';
import { el } from './dom';
import { portCard } from './portCard';
import type { TabContext } from './portTabs';

export function renderSubs(b: HTMLElement, ctx: TabContext): void {
  const s = ctx.g.sub;
  el('h3', '', b, 'Sottomarini');
  if (!s.owned) {
    el('p', 'port-hint', b, 'Il primo sottomarino te lo lascerà Aurelio, alla fine del capitolo 1.');
    return;
  }
  const grid = el('div', 'pcard-grid', b);
  for (const m of SUB_MODELS) {
    const own = s.models.includes(m.id);
    const used = s.model === m.id;
    const hull = used ? ` Scafo ${Math.round(s.hull)}/${m.hull}.` : '';
    portCard(grid, {
      icon: 'suit',
      title: m.name,
      badge: used ? 'in uso' : own ? 'tuo' : undefined,
      text: `${m.note}. Fino a ${m.maxDepthM} m, velocità ${Math.round((m.speed / 42) * 10) / 10}× il nuoto, scafo ${m.hull}.${hull}`,
      price: own ? undefined : m.price,
      state: used ? 'active' : own ? 'owned' : '',
      button: {
        label: used ? 'In uso' : own ? 'Usa' : 'Compra',
        disabled: used || (!own && ctx.g.gear.teeth < m.price),
        onClick: () => {
          const r = buySub(ctx.g, m.id);
          ctx.say(r.ok ? `${subModel(m.id).name}: è il tuo sottomarino.` : (r.reason ?? ''), !r.ok);
          ctx.redraw();
        },
      },
    });
  }
}

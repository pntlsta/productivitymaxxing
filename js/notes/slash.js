// "/" block-type menu, anchored at the caret. Keyboard is driven by the editor (focus stays in the block).
import { esc } from '../core/util.js';
import { BLOCK_TYPES } from './blocks.js';

export function createSlashMenu(onPick) {
  const el = document.createElement('div');
  el.className = 'menu slash-menu'; el.setAttribute('role', 'listbox'); el.id = 'slash-menu'; el.setAttribute('aria-label', 'Block types'); el.hidden = true;
  document.body.appendChild(el);
  let items = [], active = 0, open = false;
  const render = () => {
    el.innerHTML = items.length ? items.map((t, i) => `<div role="option" id="slash-opt-${i}" class="${i === active ? 'active' : ''}" aria-selected="${i === active}" data-i="${i}">
      <span class="slash-label">${esc(t.label)}</span><span class="slash-hint">${esc(t.hint)}</span></div>`).join('') : '<div class="slash-empty">No matching blocks</div>';
    el.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
  };
  el.addEventListener('mousedown', (e) => { const o = e.target.closest('[data-i]'); if (o) { e.preventDefault(); onPick(items[+o.dataset.i].type); } });
  return {
    get open() { return open; },
    show(rect, query = '') {
      open = true; el.hidden = false; this.filter(query);
      const h = Math.min(el.offsetHeight || 300, 320);
      el.style.left = `${Math.min(rect.left, innerWidth - 300)}px`;
      el.style.top = `${rect.bottom + 6 + h > innerHeight ? rect.top - h - 6 : rect.bottom + 6}px`;
    },
    filter(q) {
      q = q.toLowerCase().trim();
      items = BLOCK_TYPES.filter(t => !q || t.label.toLowerCase().includes(q) || t.type.includes(q) || t.keys.includes(q));
      active = 0; render();
    },
    move(d) { if (!items.length) return; active = (active + d + items.length) % items.length; render(); },
    current() { return items[active]?.type || null; },
    activeId() { return items.length ? `slash-opt-${active}` : null; },
    hide() { open = false; el.hidden = true; },
    destroy() { el.remove(); },
  };
}

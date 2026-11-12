// Ctrl+K command palette (search page titles + block content, grouped by page) and the
// "[[" page picker used for linking. Both are ARIA comboboxes inside a modal dialog.
import * as store from '../core/store.js';
import { esc } from '../core/util.js';
import { openDialog } from '../core/ui.js';
import { htmlToText } from './blocks.js';

function blockText(b) {
  if (b.type === 'code') return b.code || '';
  if (b.type === 'table') return (b.rows || []).flat().map(htmlToText).join(' ');
  if (b.type === 'image') return b.caption || '';
  return htmlToText(b.html || '') + (b.body ? ' ' + htmlToText(b.body) : '');
}
const pathOf = (p) => { const out = []; let x = p; const seen = new Set(); while (x?.parentId && !seen.has(x.parentId)) { seen.add(x.parentId); x = store.get('page', x.parentId); if (x) out.unshift(x.title || 'Untitled'); } return out.join(' / '); };

function mark(text, q) {
  if (!q) return esc(text);
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) return esc(text);
  const s = Math.max(0, i - 40);
  const snip = (s ? '…' : '') + text.slice(s, i + q.length + 80);
  return esc(snip).replace(new RegExp(esc(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), (m) => `<mark>${m}</mark>`);
}

/** Returns [{page, titleHit, hits:[{blockId, html}]}] */
export function searchPages(query, { content = true } = {}) {
  const q = query.toLowerCase().trim();
  const all = store.all('page');
  const out = [];
  for (const p of all) {
    const titleHit = !q || (p.title || 'untitled').toLowerCase().includes(q);
    const hits = [];
    if (content && q) for (const b of p.blocks || []) { const t = blockText(b); if (t.toLowerCase().includes(q)) { hits.push({ blockId: b.id, html: mark(t, q) }); if (hits.length >= 3) break; } }
    if (titleHit || hits.length) out.push({ page: p, titleHit, hits });
  }
  return out.sort((a, b) => (b.titleHit - a.titleHit) || (b.page.updatedAt || '').localeCompare(a.page.updatedAt || '')).slice(0, 40);
}

function palette({ title, placeholder, content, allowCreate }) {
  return new Promise((resolve) => {
    let result = null;
    const body = `<div class="palette">
      <input class="input palette-input" role="combobox" aria-expanded="true" aria-controls="pal-list" aria-autocomplete="list" placeholder="${esc(placeholder)}" autocomplete="off" spellcheck="false" aria-label="${esc(title)}">
      <div class="palette-list" id="pal-list" role="listbox" aria-label="Results"></div>
      <p class="small muted palette-foot"><kbd>↑</kbd><kbd>↓</kbd> move · <kbd>Enter</kbd> open · <kbd>Esc</kbd> close</p></div>`;
    const { dlg, close } = openDialog({ title, body, wide: true, onClose: () => resolve(result) });
    dlg.classList.add('palette-dlg');
    const inp = dlg.querySelector('.palette-input'), list = dlg.querySelector('#pal-list');
    let opts = [], active = 0;
    const render = () => {
      const q = inp.value;
      const groups = searchPages(q, { content });
      opts = []; let html = '';
      for (const g of groups) {
        const path = pathOf(g.page);
        html += `<div role="group" aria-label="${esc(g.page.title || 'Untitled')}" class="pal-group">`;
        opts.push({ page: g.page });
        html += `<div role="option" class="pal-opt pal-page" data-o="${opts.length - 1}" id="pal-${opts.length - 1}"><span>${esc(g.page.icon || '📄')}</span><span class="pal-title">${esc(g.page.title || 'Untitled')}</span>${path ? `<span class="pal-path">${esc(path)}</span>` : ''}</div>`;
        for (const h of g.hits) { opts.push({ page: g.page, blockId: h.blockId }); html += `<div role="option" class="pal-opt pal-hit" data-o="${opts.length - 1}" id="pal-${opts.length - 1}">${h.html}</div>`; }
        html += '</div>';
      }
      if (allowCreate && q.trim()) { opts.push({ create: q.trim() }); html += `<div role="option" class="pal-opt pal-create" data-o="${opts.length - 1}" id="pal-${opts.length - 1}">+ Create page “${esc(q.trim())}”</div>`; }
      list.innerHTML = html || `<p class="muted small" style="padding:var(--space-3)">${store.all('page').length ? 'No pages match.' : 'No pages yet.'}</p>`;
      active = Math.min(active, Math.max(0, opts.length - 1)); highlight();
    };
    const highlight = () => {
      list.querySelectorAll('.pal-opt').forEach(o => { const on = +o.dataset.o === active; o.classList.toggle('active', on); o.setAttribute('aria-selected', String(on)); if (on) o.scrollIntoView({ block: 'nearest' }); });
      if (opts.length) inp.setAttribute('aria-activedescendant', `pal-${active}`); else inp.removeAttribute('aria-activedescendant');
    };
    const choose = (i) => { result = opts[i] || null; close(result); };
    inp.addEventListener('input', () => { active = 0; render(); });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (opts.length) { active = (active + 1) % opts.length; highlight(); } }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (opts.length) { active = (active - 1 + opts.length) % opts.length; highlight(); } }
      else if (e.key === 'Enter') { e.preventDefault(); if (opts.length) choose(active); }
    });
    list.addEventListener('mousedown', (e) => { const o = e.target.closest('[data-o]'); if (o) { e.preventDefault(); choose(+o.dataset.o); } });
    render(); inp.focus();
  });
}

let paletteOpen = false;
export async function openSearchPalette() {
  if (paletteOpen) return; paletteOpen = true;
  try {
    const r = await palette({ title: 'Search pages', placeholder: 'Search page titles and content…', content: true });
    if (!r?.page) return;
    if (r.blockId) sessionStorage.setItem('wb.notes.focusBlock', r.blockId);
    const target = `#/notes/${r.page.id}`;
    if (location.hash === target) dispatchEvent(new CustomEvent('wb:notes-focus')); else location.hash = target;
  } finally { paletteOpen = false; }
}
/** For "[[" links. Resolves to a page record (possibly newly created) or null. */
export async function pickPage(createPage) {
  const r = await palette({ title: 'Link to page', placeholder: 'Find a page to link…', content: false, allowCreate: true });
  if (!r) return null;
  if (r.create) return createPage(r.create);
  return r.page;
}

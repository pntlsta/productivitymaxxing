// Notes module: page view (breadcrumbs, icon, title, block editor, sub-pages, backlinks),
// sidebar tree, and debounced saving into the write queue.
import * as store from '../core/store.js';
import { esc, debounce, fmtDateTime, plural } from '../core/util.js';
import { icon } from '../core/icons.js';
import { toast, emptyState, skeletonRows } from '../core/ui.js';
import { createEditor } from './editor.js';
import { newBlock } from './blocks.js';
import { renderTree, bindTree, createPage, childrenOf, ancestors, pageMenu } from './tree.js';
import { openSearchPalette, pickPage } from './palette.js';

const ICONS = ['📄', '📝', '📚', '📌', '💡', '✅', '🗓️', '🎯', '🧠', '🔬', '🎨', '💼', '🏠', '✈️', '🍳', '💰', '🎵', '🌱', '⭐', '🔥', '📦', '🛠️', '🧪', '📈'];
const LIMIT = 60000;

let editor = null, saving = null, self = false, currentId = null, warned = false;

function backlinks(id) {
  const needle = `data-page="${id}"`;
  return store.all('page').filter(p => p.id !== id && (p.blocks || []).some(b => (b.html || '').includes(needle) || (b.body || '').includes(needle) || (b.rows || []).flat().some(c => c.includes(needle))));
}

function save(id, patch) {
  if (!store.get('page', id)) return;
  const size = JSON.stringify({ ...store.get('page', id), ...patch }).length;
  if (size > LIMIT && !warned) { warned = true; toast(`This page is ${size.toLocaleString()} characters; GitHub issues hold about 65,000. Split it into sub-pages or it will fail to save.`, 'warning', 8000); }
  self = true; try { store.update('page', id, patch); } finally { self = false; }
}

function renderLanding(main) {
  const roots = childrenOf(null);
  const recent = store.all('page').sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 8);
  main.innerHTML = `<div class="page-head"><h1>Notes</h1><span class="sub">Workspace</span><span class="spacer"></span>
      <button class="btn btn-sm" data-act="search">${icon('search')} Search <kbd>Ctrl K</kbd></button>
      <button class="btn btn-primary btn-sm" data-act="new">${icon('plus')} New page</button></div>
    ${store.isLoading('page') ? skeletonRows(5) : roots.length ? `<section class="card"><h2 class="small muted">Recently edited</h2><ul class="recent-pages">${recent.map(p => `<li><a href="#/notes/${p.id}"><span>${esc(p.icon || '📄')}</span><span class="label">${esc(p.title || 'Untitled')}</span><span class="meta small muted">${fmtDateTime(p.updatedAt)}</span></a></li>`).join('')}</ul></section>`
      : emptyState('No pages yet', 'Create a page, then type "/" for blocks, "[[" to link pages, and Ctrl+K to search.', `<button class="btn btn-primary" data-act="new">${icon('plus')} New page</button>`)}`;
}

function renderPage(main, ctx, id) {
  const p = store.get('page', id);
  editor?.destroy(); editor = null; currentId = id; warned = false;
  if (!p) {
    main.innerHTML = store.isLoading('page') ? skeletonRows(8) : emptyState('Page not found', 'It may have been deleted or moved. Pick a page in the sidebar.', '<a class="btn" href="#/notes">All pages</a>');
    return;
  }
  const crumbs = ancestors(id);
  main.innerHTML = `<article class="note-page" aria-labelledby="page-title">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="#/notes">Notes</a>${crumbs.map(c => ` / <a href="#/notes/${c.id}">${esc(c.icon || '')} ${esc(c.title || 'Untitled')}</a>`).join('')}</nav>
    <div class="page-top">
      <button class="page-icon" id="page-icon" aria-label="Change page icon" aria-haspopup="true">${esc(p.icon || '📄')}</button>
      <span class="spacer"></span>
      <span class="save-state small" id="save-state" aria-live="polite"></span>
      <button class="icon-btn" id="page-more" aria-label="Page actions" aria-haspopup="menu">${icon('more')}</button>
    </div>
    <h1 class="page-title" id="page-title" contenteditable="true" spellcheck="true" data-ph="Untitled">${esc(p.title || '')}</h1>
    <div class="editor" id="editor" role="region" aria-label="Page content"></div>
    <div class="editor-tail" id="editor-tail" aria-hidden="true"></div>
    <section class="subpages" id="subpages"></section>
    <section class="backlinks" id="backlinks" aria-label="Backlinks"></section>
  </article>`;
  const saveBlocks = debounce(() => { if (editor) save(id, { blocks: editor.blocks }); renderState(); }, 800);
  const saveTitle = debounce((v) => { save(id, { title: v }); renderTree(ctx.sidebar, id); renderState(); }, 600);
  saving = { flush: () => { saveBlocks.flush(); saveTitle.flush(); } };
  const renderState = () => {
    const el = main.querySelector('#save-state'); if (!el) return;
    const dirty = saveBlocks.pending() || saveTitle.pending();
    el.textContent = dirty ? 'Editing…' : store.isPending('page', id) ? 'Unsaved — click Save' : 'Saved';
    el.className = `save-state small ${dirty ? 'dirty' : store.isPending('page', id) ? 'pending' : 'saved'}`;
  };
  editor = createEditor(main.querySelector('#editor'), p.blocks, {
    onChange: () => { saveBlocks(); renderState(); },
    pageTitle: (pid) => { const x = store.get('page', pid); return x ? (x.title || 'Untitled') : null; },
    pickPage: () => pickPage((title) => store.create('page', { parentId: null, order: childrenOf(null).length, icon: '📄', title, blocks: [newBlock('text')] })),
  });
  const titleEl = main.querySelector('#page-title');
  titleEl.addEventListener('input', () => { saveTitle(titleEl.textContent.trim()); renderState(); });
  titleEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); editor.focusStart(); } });
  titleEl.addEventListener('paste', (e) => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain').replace(/\n/g, ' ')); });
  main.querySelector('#editor-tail').addEventListener('click', () => editor.appendAndFocus());
  main.querySelector('#page-icon').addEventListener('click', (e) => iconPicker(e.currentTarget, id));
  main.querySelector('#page-more').addEventListener('click', (e) => { const r = e.currentTarget.getBoundingClientRect(); pageMenu(r.left - 140, r.bottom + 4, store.get('page', id)); });
  renderExtras(main, id); renderState();
  if (focusFromSearch(main)) { /* jumped from the palette */ }
  else if (!p.title || p.title === 'Untitled') { titleEl.focus(); getSelection().selectAllChildren(titleEl); }
  ctx.renderState = renderState;
}

/** Scroll to + focus the block chosen in the Ctrl+K palette, if any. */
function focusFromSearch(main) {
  const fb = sessionStorage.getItem('wb.notes.focusBlock'); if (!fb) return false;
  sessionStorage.removeItem('wb.notes.focusBlock');
  const el = main.querySelector(`.blk[data-id="${fb}"]`); if (!el) return false;
  el.scrollIntoView({ block: 'center' }); el.classList.remove('flash-block'); void el.offsetWidth; el.classList.add('flash-block');
  el.querySelector('[contenteditable="true"], textarea')?.focus();
  return true;
}

function renderExtras(main, id) {
  const kids = childrenOf(id); const bl = backlinks(id);
  const sp = main.querySelector('#subpages'), bk = main.querySelector('#backlinks');
  if (!sp) return;
  sp.innerHTML = kids.length ? `<h2 class="small muted">Sub-pages</h2><ul class="recent-pages">${kids.map(k => `<li><a href="#/notes/${k.id}"><span>${esc(k.icon || '📄')}</span><span class="label">${esc(k.title || 'Untitled')}</span></a></li>`).join('')}</ul>` : '';
  bk.innerHTML = `<h2 class="small muted">${plural(bl.length, 'backlink')}</h2>${bl.length ? `<ul class="recent-pages">${bl.map(b => `<li><a href="#/notes/${b.id}"><span>${esc(b.icon || '📄')}</span><span class="label">${esc(b.title || 'Untitled')}</span></a></li>`).join('')}</ul>` : '<p class="small muted">No pages link here yet. Type [[ in another page to link to this one.</p>'}`;
}

function iconPicker(anchor, id) {
  document.querySelector('.icon-picker')?.remove();
  const pop = document.createElement('div');
  pop.className = 'menu icon-picker'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Choose page icon');
  pop.innerHTML = ICONS.map(e => `<button data-e="${e}" aria-label="${e}">${e}</button>`).join('');
  document.body.appendChild(pop);
  const r = anchor.getBoundingClientRect(); pop.style.left = `${r.left}px`; pop.style.top = `${r.bottom + 4}px`;
  pop.querySelector('button').focus();
  const close = () => { pop.remove(); document.removeEventListener('pointerdown', out, true); anchor.focus(); };
  const out = (e) => { if (!pop.contains(e.target)) close(); };
  setTimeout(() => document.addEventListener('pointerdown', out, true));
  pop.addEventListener('keydown', (e) => {
    const bs = [...pop.querySelectorAll('button')]; const i = bs.indexOf(document.activeElement);
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') bs[(i + 1) % bs.length].focus();
    if (e.key === 'ArrowLeft') bs[(i - 1 + bs.length) % bs.length].focus();
    if (e.key === 'ArrowDown') bs[Math.min(i + 6, bs.length - 1)].focus();
    if (e.key === 'ArrowUp') bs[Math.max(i - 6, 0)].focus();
  });
  pop.addEventListener('click', (e) => { const b = e.target.closest('[data-e]'); if (!b) return; save(id, { icon: b.dataset.e }); anchor.textContent = b.dataset.e; close(); });
}

function show(main, ctx) {
  saving?.flush(); saving = null;
  const id = ctx.params[0] || null;
  renderTree(ctx.sidebar, id);
  if (id) renderPage(main, ctx, id); else { editor?.destroy(); editor = null; currentId = null; renderLanding(main); }
}

export default {
  mount(main, ctx) {
    bindTree(ctx.sidebar, ctx, { openSearch: openSearchPalette });
    ctx.listen(main, 'click', (e) => {
      const a = e.target.closest('[data-act]')?.dataset.act;
      if (a === 'new') createPage(null);
      if (a === 'search') openSearchPalette();
    });
    ctx.on('change', (t) => {
      if (t !== 'page') return;
      renderTree(ctx.sidebar, currentId);
      if (!currentId) { renderLanding(main); return; }
      if (self) { renderExtras(main, currentId); ctx.renderState?.(); return; }
      const p = store.get('page', currentId);
      if (!p) { renderPage(main, ctx, currentId); return; }
      // external change (rename from tree, restore, sync): refresh header + links without losing caret
      const t1 = main.querySelector('#page-title'); if (t1 && document.activeElement !== t1 && t1.textContent !== p.title) t1.textContent = p.title;
      const ic = main.querySelector('#page-icon'); if (ic) ic.textContent = p.icon || '📄';
      if (editor && JSON.stringify(editor.blocks) !== JSON.stringify(p.blocks) && !main.querySelector('.editor').contains(document.activeElement)) renderPage(main, ctx, currentId);
      else { editor?.refreshLinks(); renderExtras(main, currentId); }
    });
    ctx.on('queue', () => ctx.renderState?.());
    ctx.listen(window, 'wb:notes-focus', () => focusFromSearch(main));
    ctx.onCleanup(() => { saving?.flush(); saving = null; editor?.destroy(); editor = null; currentId = null; });
    show(main, ctx);
  },
  update(params, ctx) { show(ctx.main, ctx); },
};

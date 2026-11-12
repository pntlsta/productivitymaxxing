// Notes page tree: nested + collapsible sidebar tree, drag to reorder / re-nest, context menu,
// and page CRUD (create, rename, duplicate, delete subtree, move to).
import * as store from '../core/store.js';
import { esc, uuid, lsGet, lsSet } from '../core/util.js';
import { icon } from '../core/icons.js';
import { contextMenu, confirmDialog, formDialog, toast, skeletonRows } from '../core/ui.js';
import { newBlock } from './blocks.js';

const EKEY = 'wb.notes.expanded';
const expanded = new Set(lsGet(EKEY, []));
const saveExpanded = () => lsSet(EKEY, [...expanded]);

export const pages = () => store.all('page');
export const childrenOf = (pid) => pages().filter(p => (p.parentId || null) === (pid || null)).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.createdAt || '').localeCompare(b.createdAt || ''));
export function descendants(id) { const out = []; const walk = (pid) => childrenOf(pid).forEach(c => { out.push(c); walk(c.id); }); walk(id); return out; }
export function ancestors(id) { const out = []; let p = store.get('page', id); const seen = new Set(); while (p?.parentId && !seen.has(p.parentId)) { seen.add(p.parentId); p = store.get('page', p.parentId); if (p) out.unshift(p); } return out; }
const nextOrder = (pid) => { const c = childrenOf(pid); return c.length ? (c[c.length - 1].order ?? 0) + 1 : 0; };

export function createPage(parentId = null, title = 'Untitled') {
  if (parentId) { expanded.add(parentId); saveExpanded(); }
  const p = store.create('page', { parentId, order: nextOrder(parentId), icon: '📄', title, blocks: [newBlock('text')] });
  location.hash = `#/notes/${p.id}`;
  return p;
}
export async function renamePage(p) {
  const v = await formDialog({ title: 'Rename page', fields: [
    { name: 'icon', label: 'Icon (emoji)', value: p.icon || '📄', validate: (x) => [...x].length > 4 ? 'Use a single emoji.' : '' },
    { name: 'title', label: 'Title', value: p.title, required: true },
  ] });
  if (v) store.update('page', p.id, { icon: v.icon || '📄', title: v.title });
}
export function duplicatePage(p) {
  const copyBlocks = JSON.parse(JSON.stringify(Array.isArray(p.blocks) ? p.blocks : [])).map(b => ({ ...b, id: uuid() }));
  const sibs = childrenOf(p.parentId); const i = sibs.findIndex(s => s.id === p.id);
  const order = sibs[i + 1] ? ((p.order ?? 0) + (sibs[i + 1].order ?? 0)) / 2 : (p.order ?? 0) + 1;
  const c = store.create('page', { parentId: p.parentId || null, order, icon: p.icon, title: `${p.title} (copy)`, blocks: copyBlocks });
  toast('Page duplicated (queued).', 'success');
  location.hash = `#/notes/${c.id}`;
}
export async function deletePage(p) {
  const d = descendants(p.id);
  if (!await confirmDialog({ title: 'Delete page?', message: `Delete "${p.title || 'Untitled'}"${d.length ? ` and its ${d.length} sub-page${d.length === 1 ? '' : 's'}` : ''}? You can restore pages from Settings.`, confirmText: 'Delete page' })) return;
  [...d].reverse().forEach(x => store.remove('page', x.id));
  store.remove('page', p.id);
  toast('Page deleted (queued).');
  if (location.hash.includes(p.id) || d.some(x => location.hash.includes(x.id))) location.hash = p.parentId ? `#/notes/${p.parentId}` : '#/notes';
}
export function movePage(id, parentId, order) {
  if (id === parentId || descendants(id).some(d => d.id === parentId)) { toast('A page cannot be moved inside itself.', 'error'); return; }
  if (parentId) { expanded.add(parentId); saveExpanded(); }
  store.update('page', id, { parentId: parentId || null, order });
}
export async function moveToDialog(p) {
  const banned = new Set([p.id, ...descendants(p.id).map(d => d.id)]);
  const opts = [{ value: '', label: '— Top level —' }];
  const walk = (pid, depth) => childrenOf(pid).forEach(c => { if (!banned.has(c.id)) { opts.push({ value: c.id, label: `${'  '.repeat(depth)}${c.icon || '📄'} ${c.title || 'Untitled'}` }); walk(c.id, depth + 1); } });
  walk(null, 0);
  const v = await formDialog({ title: `Move "${p.title || 'Untitled'}" to…`, submitText: 'Move', fields: [{ name: 'parent', label: 'New parent', type: 'select', value: p.parentId || '', options: opts }] });
  if (!v) return;
  movePage(p.id, v.parent || null, nextOrder(v.parent || null));
  toast('Page moved (queued).', 'success');
}

export function pageMenu(x, y, p) {
  contextMenu(x, y, [
    { label: 'Add sub-page', icon: 'plus', action: () => createPage(p.id) },
    { label: 'Rename', icon: 'edit', action: () => renamePage(p) },
    { label: 'Duplicate', icon: 'page', action: () => duplicatePage(p) },
    { label: 'Move to…', icon: 'folder', action: () => moveToDialog(p) },
    'sep',
    { label: 'Delete…', icon: 'trash', danger: true, action: () => deletePage(p) },
  ], `${p.title || 'Untitled'} actions`);
}

// ---------- rendering ----------
function nodeHTML(p, currentId, depth) {
  const kids = childrenOf(p.id);
  const open = expanded.has(p.id);
  return `<li role="treeitem" aria-level="${depth + 1}" aria-selected="${p.id === currentId}" ${kids.length ? `aria-expanded="${open}"` : ''} data-page="${p.id}" tabindex="-1">
    <div class="tree-row ${p.id === currentId ? 'active' : ''}" draggable="true" style="padding-left:${depth * 0.9 + 0.25}rem">
      <button class="twist ${kids.length ? '' : 'leaf'}" tabindex="-1" aria-hidden="true">${kids.length ? icon(open ? 'chevD' : 'chevR') : ''}</button>
      <span class="tree-icon" aria-hidden="true">${esc(p.icon || '📄')}</span><span class="label">${esc(p.title || 'Untitled')}</span>
      <button class="icon-btn btn-sm tree-add" tabindex="-1" aria-label="Add sub-page" title="Add sub-page">${icon('plus')}</button>
    </div>
    ${kids.length && open ? `<ul role="group">${kids.map(k => nodeHTML(k, currentId, depth + 1)).join('')}</ul>` : ''}
  </li>`;
}

export function renderTree(el, currentId) {
  // make sure the current page is visible
  ancestors(currentId).forEach(a => expanded.add(a.id));
  const roots = childrenOf(null);
  el.innerHTML = `<div class="ctx-section"><div class="ctx-head"><h2 class="ctx-title" id="tree-h">Pages</h2>
      <button class="icon-btn btn-sm" data-tree="new" aria-label="New page" title="New page">${icon('plus')}</button></div>
    ${store.isLoading('page') ? skeletonRows(5, 'skeleton-line') : roots.length
      ? `<ul class="tree" role="tree" aria-labelledby="tree-h">${roots.map(r => nodeHTML(r, currentId, 0)).join('')}</ul>
         <p class="ctx-empty small">Drag to reorder or nest. Right-click for more.</p>`
      : '<p class="ctx-empty">No pages yet. Click + to create your first page.</p>'}
    <button class="ctx-item" data-tree="search">${icon('search')}<span class="label">Search</span><kbd class="meta">Ctrl K</kbd></button></div>`;
  const items = [...el.querySelectorAll('[role=treeitem]')];
  (items.find(i => i.getAttribute('aria-selected') === 'true') || items[0])?.setAttribute('tabindex', '0');
}

export function bindTree(el, ctx, { openSearch }) {
  const rerender = () => renderTree(el, ctx.params[0]);
  ctx.listen(el, 'click', (e) => {
    if (e.target.closest('[data-tree="new"]')) { createPage(null); return; }
    if (e.target.closest('[data-tree="search"]')) { openSearch(); return; }
    const li = e.target.closest('[data-page]'); if (!li) return;
    const id = li.dataset.page;
    if (e.target.closest('.tree-add')) { createPage(id); return; }
    if (e.target.closest('.twist:not(.leaf)')) { expanded.has(id) ? expanded.delete(id) : expanded.add(id); saveExpanded(); rerender(); el.querySelector(`[data-page="${id}"]`)?.focus(); return; }
    location.hash = `#/notes/${id}`;
  });
  ctx.listen(el, 'contextmenu', (e) => {
    const li = e.target.closest('[data-page]'); if (!li) return;
    e.preventDefault(); const p = store.get('page', li.dataset.page); if (p) pageMenu(e.clientX, e.clientY, p);
  });
  // keyboard: WAI-ARIA tree pattern
  ctx.listen(el, 'keydown', (e) => {
    const li = e.target.closest('[role=treeitem]'); if (!li || e.target !== li) return;
    const vis = [...el.querySelectorAll('[role=treeitem]')]; const i = vis.indexOf(li); const id = li.dataset.page;
    const focus = (n) => { if (!n) return; vis.forEach(v => v.setAttribute('tabindex', '-1')); n.setAttribute('tabindex', '0'); n.focus(); };
    if (e.key === 'ArrowDown') { e.preventDefault(); focus(vis[i + 1]); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focus(vis[i - 1]); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); if (li.getAttribute('aria-expanded') === 'false') { expanded.add(id); saveExpanded(); rerender(); el.querySelector(`[data-page="${id}"]`)?.focus(); } else focus(li.querySelector('[role=treeitem]')); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); if (li.getAttribute('aria-expanded') === 'true') { expanded.delete(id); saveExpanded(); rerender(); el.querySelector(`[data-page="${id}"]`)?.focus(); } else focus(li.parentElement.closest('[role=treeitem]')); }
    else if (e.key === 'Enter') { e.preventDefault(); location.hash = `#/notes/${id}`; }
    else if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) { e.preventDefault(); const r = li.getBoundingClientRect(); const p = store.get('page', id); if (p) pageMenu(r.left + 24, r.top + 24, p); }
  });

  // drag and drop: top quarter = before, bottom quarter = after, middle = nest inside
  let dragId = null;
  const clear = () => el.querySelectorAll('.drop-before,.drop-after,.drop-inside,.dragging').forEach(x => x.classList.remove('drop-before', 'drop-after', 'drop-inside', 'dragging'));
  ctx.listen(el, 'dragstart', (e) => {
    const row = e.target.closest?.('.tree-row'); if (!row) return;
    dragId = row.parentElement.dataset.page; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/x-wb-page', dragId); row.classList.add('dragging');
  });
  ctx.listen(el, 'dragover', (e) => {
    const row = e.target.closest?.('.tree-row'); if (!row || !dragId) return;
    const target = row.parentElement.dataset.page;
    if (target === dragId || descendants(dragId).some(d => d.id === target)) return;
    e.preventDefault();
    const r = row.getBoundingClientRect(); const y = (e.clientY - r.top) / r.height;
    el.querySelectorAll('.drop-before,.drop-after,.drop-inside').forEach(x => x.classList.remove('drop-before', 'drop-after', 'drop-inside'));
    row.classList.add(y < 0.25 ? 'drop-before' : y > 0.75 ? 'drop-after' : 'drop-inside');
  });
  ctx.listen(el, 'dragend', () => { dragId = null; clear(); });
  ctx.listen(el, 'drop', (e) => {
    const row = e.target.closest?.('.tree-row'); if (!row || !dragId) return;
    e.preventDefault();
    const mode = row.classList.contains('drop-before') ? 'before' : row.classList.contains('drop-after') ? 'after' : 'inside';
    const target = store.get('page', row.parentElement.dataset.page); const id = dragId;
    dragId = null; clear();
    if (!target) return;
    if (mode === 'inside') { movePage(id, target.id, nextOrder(target.id)); return; }
    const sibs = childrenOf(target.parentId).filter(s => s.id !== id);
    const ti = sibs.findIndex(s => s.id === target.id);
    const [a, b] = mode === 'before' ? [sibs[ti - 1], sibs[ti]] : [sibs[ti], sibs[ti + 1]];
    const order = a && b ? ((a.order ?? 0) + (b.order ?? 0)) / 2 : a ? (a.order ?? 0) + 1 : (b.order ?? 0) - 1;
    movePage(id, target.parentId || null, order);
  });
}

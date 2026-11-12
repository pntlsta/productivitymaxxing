// Library module: shelf (all / folder) and reader routes, plus the contextual sidebar.
import * as store from '../core/store.js';
import { esc } from '../core/util.js';
import { icon } from '../core/icons.js';
import { contextMenu } from '../core/ui.js';
import { folders, newFolder, renameFolder, deleteFolder, renderShelf, bindShelf, coverHTML, hydrateCovers, bookMenu } from './shelf.js';
import { mountReader } from './reader.js';
import { sidebarSections, exportMarkdown, deleteAnnotation, deleteBookmark, editAnnotation, bindSwipeDelete } from './annotate.js';

let reader = null;

function route(params) {
  if (params[0] === 'book' && params[1]) return { kind: 'reader', bookId: params[1] };
  if (params[0] === 'folder') return { kind: 'shelf', folder: params[1] ?? '' };
  return { kind: 'shelf', folder: null };
}

function renderSidebar(el, r) {
  const books = store.all('book').sort((a, b) => a.title.localeCompare(b.title));
  const fs = folders();
  el.innerHTML = `
    <div class="ctx-section"><div class="ctx-head"><h2 class="ctx-title">Folders</h2>
      <button class="icon-btn btn-sm" data-side="new-folder" aria-label="New folder" title="New folder">${icon('plus')}</button></div>
      <ul class="ctx-list">
        <li><a class="ctx-item" href="#/library" ${r.kind === 'shelf' && r.folder == null ? 'aria-current="true"' : ''}>${icon('library')}<span class="label">All books</span><span class="meta">${books.length || ''}</span></a></li>
        ${fs.map(f => `<li><a class="ctx-item" href="#/library/folder/${encodeURIComponent(f)}" data-folder="${esc(f)}" ${r.kind === 'shelf' && r.folder === f ? 'aria-current="true"' : ''}>${icon('folder')}<span class="label">${esc(f)}</span><span class="meta">${books.filter(b => b.folder === f).length || ''}</span></a></li>`).join('')}
      </ul>${fs.length ? '<p class="ctx-empty small">Right-click a folder to rename or delete it.</p>' : ''}</div>
    ${r.kind === 'reader' ? sidebarSections(r.bookId) : ''}
    <div class="ctx-section"><div class="ctx-head"><h2 class="ctx-title">Books</h2></div>
      ${books.length ? `<ul class="ctx-list">${books.map(b => `<li><a class="ctx-item book-item" href="#/library/book/${b.id}" data-book="${b.id}" ${r.bookId === b.id ? 'aria-current="true"' : ''}>
        ${coverHTML(b, 'thumb')}<span class="label">${esc(b.title)}<span class="meta">${esc(b.author || '')}</span></span><span class="meta">${Math.round((b.progress || 0) * 100)}%</span></a></li>`).join('')}</ul>`
        : '<p class="ctx-empty">No books yet. Upload an .epub to start.</p>'}</div>`;
  hydrateCovers(el);
}

async function show(main, ctx) {
  ctx.cleanup(); reader = null;
  const r = route(ctx.params);
  const side = () => renderSidebar(ctx.sidebar, r);
  ctx.on('change', (t) => {
    if (['book', 'bookmark', 'annotation'].includes(t)) side();
    if (r.kind === 'shelf' && t === 'book') renderShelf(main, r.folder);
    if (r.kind === 'reader') reader?.refresh(t);
  });
  bindSidebar(ctx, r);
  side();
  if (r.kind === 'reader') {
    reader = await mountReader(main, ctx, r.bookId);
  } else {
    main.className = 'main-inner';
    renderShelf(main, r.folder); bindShelf(main, ctx, () => r.folder);
  }
}

function bindSidebar(ctx, r) {
  const sb = ctx.sidebar;
  ctx.listen(sb, 'click', async (e) => {
    if (e.target.closest('[data-side="new-folder"]')) { const f = await newFolder(); if (f) location.hash = `#/library/folder/${encodeURIComponent(f)}`; return; }
    const j = e.target.closest('[data-jump]'); if (j && reader) { e.preventDefault(); reader.jump(j.dataset.jump); return; }
    const dm = e.target.closest('[data-del-mark]'); if (dm) { deleteBookmark(dm.dataset.delMark); return; }
    const da = e.target.closest('[data-del-ann]'); if (da) { deleteAnnotation(da.dataset.delAnn); return; }
    const ea = e.target.closest('[data-edit-ann]'); if (ea) { editAnnotation(ea.dataset.editAnn); return; }
    if (e.target.closest('[data-export]') && r.bookId) exportMarkdown(r.bookId);
  });
  ctx.listen(sb, 'contextmenu', (e) => {
    const f = e.target.closest('[data-folder]');
    if (f) { e.preventDefault(); const name = f.dataset.folder; contextMenu(e.clientX, e.clientY, [{ label: 'Rename folder', icon: 'edit', action: () => renameFolder(name) }, { label: 'Delete folder…', icon: 'trash', danger: true, action: () => deleteFolder(name) }]); return; }
    const m = e.target.closest('[data-mark]');
    if (m) { e.preventDefault(); contextMenu(e.clientX, e.clientY, [{ label: 'Go to bookmark', icon: 'bookmark', action: () => reader?.jump(m.querySelector('[data-jump]').dataset.jump) }, { label: 'Delete bookmark…', icon: 'trash', danger: true, action: () => deleteBookmark(m.dataset.mark) }]); return; }
    const a = e.target.closest('[data-ann]');
    if (a) { e.preventDefault(); contextMenu(e.clientX, e.clientY, [{ label: 'Edit note', icon: 'edit', action: () => editAnnotation(a.dataset.ann) }, { label: 'Delete highlight…', icon: 'trash', danger: true, action: () => deleteAnnotation(a.dataset.ann) }]); return; }
    const b = e.target.closest('[data-book]');
    if (b) { e.preventDefault(); const bk = store.get('book', b.dataset.book); if (bk) bookMenu(e.clientX, e.clientY, bk); }
  });
  bindSwipeDelete(sb, ctx, (row) => {
    if (row.dataset.mark) deleteBookmark(row.dataset.mark);
    else if (row.dataset.ann) deleteAnnotation(row.dataset.ann);
  });
}

export default {
  mount(main, ctx) { return show(main, ctx); },
  update(params, ctx) { return show(ctx.main, ctx); },
};

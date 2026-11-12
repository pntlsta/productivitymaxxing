// Library shelf: cover grid, drag-and-drop / picker upload with metadata + cover extraction,
// folders, reading progress, removal. Blobs go to IndexedDB; only metadata goes to GitHub.
import * as store from '../core/store.js';
import { esc, uuid, lsGet, lsSet, loadEpub, plural } from '../core/util.js';
import { idbPut, idbDel, blobUrl } from '../core/idb.js';
import { listRepoBooks, fetchRepoBook } from './repobooks.js';
import { icon } from '../core/icons.js';
import { toast, confirmDialog, formDialog, contextMenu, emptyState, skeletonRows } from '../core/ui.js';

const FKEY = 'wb.lib.folders';
export function folders() {
  const set = new Set(lsGet(FKEY, []));
  store.all('book').forEach(b => b.folder && set.add(b.folder));
  return [...set].sort((a, b) => a.localeCompare(b));
}
export async function newFolder() {
  const v = await formDialog({ title: 'New folder', submitText: 'Create', fields: [{ name: 'name', label: 'Folder name', required: true, validate: (x) => folders().includes(x) ? 'That folder already exists.' : '' }] });
  if (!v) return null;
  lsSet(FKEY, [...new Set([...lsGet(FKEY, []), v.name])]);
  return v.name;
}
export async function renameFolder(name) {
  const v = await formDialog({ title: `Rename "${name}"`, fields: [{ name: 'name', label: 'Folder name', value: name, required: true }] });
  if (!v || v.name === name) return;
  lsSet(FKEY, [...new Set(lsGet(FKEY, []).map(f => f === name ? v.name : f).concat(v.name))]);
  store.where('book', b => b.folder === name).forEach(b => store.update('book', b.id, { folder: v.name }));
  location.hash = `#/library/folder/${encodeURIComponent(v.name)}`;
}
export async function deleteFolder(name) {
  const books = store.where('book', b => b.folder === name);
  if (!await confirmDialog({ title: `Delete folder "${name}"?`, message: books.length ? `Its ${plural(books.length, 'book')} will move to "No folder". Books are not deleted.` : 'The folder is empty.', confirmText: 'Delete folder' })) return;
  lsSet(FKEY, lsGet(FKEY, []).filter(f => f !== name));
  books.forEach(b => store.update('book', b.id, { folder: '' }));
  location.hash = '#/library';
}

/** Parse an epub file, store blob + cover in IDB, create the db:book record. */
export async function importEpub(file, folder = '', extra = {}) {
  if (!/\.epub$/i.test(file.name) && file.type !== 'application/epub+zip') throw new Error(`${file.name} is not an .epub file.`);
  const ePub = await loadEpub();
  const buf = await file.arrayBuffer();
  const book = ePub(buf);
  try {
    await book.ready;
    const md = await book.loaded.metadata;
    const id = uuid();
    let hasCover = false;
    try {
      const cu = await book.coverUrl();
      if (cu) { const blob = await (await fetch(cu)).blob(); await idbPut('covers', id, blob); hasCover = true; }
    } catch (e) { console.warn('cover extraction failed', e); }
    await idbPut('books', id, new Blob([buf], { type: 'application/epub+zip' }));
    return store.create('book', {
      id, title: md.title || file.name.replace(/\.epub$/i, ''), author: md.creator || '', publisher: md.publisher || '',
      language: md.language || '', folder, progress: 0, lastCfi: null, hasCover, fileName: file.name, size: file.size, ...extra,
    });
  } finally { book.destroy(); }
}

export async function removeBook(b) {
  const marks = store.where('bookmark', x => x.bookId === b.id), anns = store.where('annotation', x => x.bookId === b.id);
  const extra = marks.length + anns.length ? ` along with ${plural(marks.length, 'bookmark')} and ${plural(anns.length, 'highlight')}` : '';
  if (!await confirmDialog({ title: 'Remove book?', message: b.repoPath ? `Remove "${b.title}"${extra} from your library? The file stays in your repo's ${b.repoPath.split('/').slice(0, -1).join('/') || 'books'} folder, so it will be listed there again and you can re-add it.` : `Remove "${b.title}"${extra}? The epub file is deleted from this browser; the record can be restored from Settings, but you would need to upload the file again.`, confirmText: 'Remove book' })) return false;
  marks.forEach(m => store.remove('bookmark', m.id)); anns.forEach(a => store.remove('annotation', a.id));
  store.remove('book', b.id);
  await Promise.all([idbDel('books', b.id), idbDel('covers', b.id), idbDel('search', b.id), idbDel('locations', b.id)]).catch(() => {});
  toast('Book removed (queued).');
  return true;
}

function bookMenu(x, y, b) {
  contextMenu(x, y, [
    { label: 'Open', icon: 'book', action: () => { location.hash = `#/library/book/${b.id}`; } },
    { label: 'Move to folder…', icon: 'folder', action: () => moveDialog(b) },
    'sep',
    { label: 'Remove book…', icon: 'trash', danger: true, action: () => removeBook(b) },
  ], `${b.title} actions`);
}
async function moveDialog(b) {
  const fs = folders();
  const v = await formDialog({ title: `Move "${b.title}"`, submitText: 'Move', fields: [
    { name: 'folder', label: 'Folder', type: 'select', value: b.folder || '', options: [{ value: '', label: 'No folder' }, ...fs.map(f => ({ value: f, label: f }))] },
    { name: 'newFolder', label: 'Or a new folder', placeholder: 'e.g. Fiction' },
  ] });
  if (!v) return;
  const folder = v.newFolder || v.folder;
  if (v.newFolder) lsSet(FKEY, [...new Set([...lsGet(FKEY, []), v.newFolder])]);
  store.update('book', b.id, { folder }); toast(`Moved to ${folder || 'No folder'} (queued).`);
}

export function coverHTML(b, cls = 'cover') {
  return `<span class="${cls}" data-cover="${b.hasCover ? b.id : ''}"><span class="cover-fallback">${esc(b.title)}</span></span>`;
}
/** Fill [data-cover] placeholders with images from IndexedDB. */
export async function hydrateCovers(root) {
  for (const el of root.querySelectorAll('[data-cover]:not([data-cover=""])')) {
    const u = await blobUrl('covers', el.dataset.cover);
    if (u && el.isConnected) el.innerHTML = `<img src="${u}" alt="" loading="lazy">`;
  }
}

export function renderShelf(main, folder) {
  const books = store.all('book').filter(b => folder == null || (b.folder || '') === folder).sort((a, b) => (b.openedAt || b.createdAt || '').localeCompare(a.openedAt || a.createdAt || ''));
  main.innerHTML = `<div class="shelf">
    <div class="page-head"><h1>${folder ? esc(folder) : folder === '' ? 'No folder' : 'Library'}</h1><span class="sub">${plural(books.length, 'book')}</span><span class="spacer"></span>
      <label class="btn btn-primary btn-sm" tabindex="0" role="button" id="upload-label">${icon('upload')} Upload epub<input type="file" accept=".epub,application/epub+zip" multiple hidden id="epub-input"></label></div>
    <div class="drop-zone" id="drop-zone" aria-label="Book grid. Drop .epub files here to upload.">
      ${store.isLoading('book') ? skeletonRows(3) : books.length ? `<ul class="book-grid">${books.map(b => `<li class="book-card" data-book="${b.id}">
          <a href="#/library/book/${b.id}" class="book-link" aria-label="Open ${esc(b.title)}${b.author ? ' by ' + esc(b.author) : ''}, ${Math.round((b.progress || 0) * 100)}% read">
            ${coverHTML(b)}
            <span class="progress book-progress" aria-hidden="true"><span style="width:${Math.round((b.progress || 0) * 100)}%"></span></span>
            <span class="book-title">${esc(b.title)}</span><span class="book-author">${esc(b.author || 'Unknown author')}</span>
          </a>
          <button class="icon-btn btn-sm book-more" data-more="${b.id}" aria-label="More actions for ${esc(b.title)}" aria-haspopup="menu">${icon('more')}</button>
        </li>`).join('')}</ul>`
        : emptyState(folder != null ? 'This folder is empty' : 'Your library is empty', 'Add a book from your repo below, drag an .epub here, or use Upload epub. Uploaded files stay in this browser; books from the repo folder download on any device.')}
      <div class="drop-hint" aria-hidden="true">${icon('upload')} Drop to add to ${folder ? esc(folder) : 'library'}</div>
    </div>
    <section class="repo-books" id="repo-books" aria-labelledby="repo-h"></section></div>`;
  hydrateCovers(main);
  renderRepoSection(main);
}

const titleFromFile = (n) => n.replace(/\.epub$/i, '').replace(/[_-]+/g, ' ').trim();
/** Books in the repo folder that aren't in the library yet. */
export async function renderRepoSection(main, force = false) {
  const el = main.querySelector('#repo-books'); if (!el) return;
  el.innerHTML = `<div class="row repo-head"><h2 id="repo-h" class="small muted">From your repo</h2><span class="spacer"></span></div><div class="skeleton skeleton-row"></div>`;
  const { files, source, error } = await listRepoBooks(force);
  if (!el.isConnected) return;
  const known = new Set(store.all('book').map(b => b.repoPath).filter(Boolean));
  const fresh = files.filter(f => !known.has(f.path));
  const where = source.owner && source.repo ? `${source.owner}/${source.repo}/${source.path}` : `${source.path}/`;
  el.innerHTML = `<div class="row repo-head"><h2 id="repo-h" class="small muted">From your repo · <code>${esc(where)}</code></h2><span class="spacer"></span>
      <button class="btn btn-sm btn-ghost" data-repo-refresh>${icon('refresh')} Refresh</button></div>
    ${error ? `<p class="small" style="color:var(--danger)" role="alert">${esc(error)}</p>` : ''}
    ${fresh.length ? `<ul class="book-grid">${fresh.map((f, i) => `<li class="book-card repo-card">
        <button class="book-link" data-repo-add="${i}" aria-label="Add ${esc(titleFromFile(f.name))} from the repo and open it">
          <span class="cover"><span class="cover-fallback">${esc(titleFromFile(f.name))}</span></span>
          <span class="book-title">${esc(titleFromFile(f.name))}</span><span class="book-author">${f.size ? `${f.size >= 1048576 ? (f.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(f.size / 1024)) + ' KB'} · ` : ''}Click to add</span>
        </button></li>`).join('')}</ul>`
      : `<p class="small muted">${files.length ? files.length === 1 ? 'The book in the repo folder is already in your library.' : `All ${files.length} books in the repo folder are in your library.` : !source.owner && !location.hostname.endsWith('github.io') ? `Not running on a github.io address, so the repo can't be detected. Set it under Settings → Repo books folder, or list file names in ${esc(source.path)}/manifest.json.` : `No .epub files found yet. On GitHub, open the repo, go into the ${esc(source.path)} folder, and use Add file → Upload files.`}</p>`}`;
  el._files = fresh;
}

async function addFromRepo(file, folder) {
  const t = toast(`Downloading ${file.name}…`, 'info', 0);
  try {
    const f = await fetchRepoBook(file);
    const b = await importEpub(f, folder || '', { repoPath: file.path });
    toast(`Added "${b.title}". Click Save to sync it to your other devices.`, 'success');
    location.hash = `#/library/book/${b.id}`;
  } catch (e) { toast(e.message, 'error'); }
  finally { t(); }
}

export function bindShelf(main, ctx, getFolder) {
  const upload = async (files) => {
    const list = [...files].filter(Boolean); if (!list.length) return;
    let ok = 0;
    const t = toast(`Importing ${plural(list.length, 'book')}…`, 'info', 0);
    for (const f of list) {
      try { await importEpub(f, getFolder() || ''); ok++; } catch (e) { toast(`${f.name}: ${e.message}`, 'error'); }
    }
    t();
    if (ok) toast(`Added ${plural(ok, 'book')}. Click Save to sync metadata.`, 'success');
  };
  ctx.listen(main, 'change', (e) => { if (e.target.id === 'epub-input') { upload(e.target.files).finally(() => { e.target.value = ''; }); } });
  ctx.listen(main, 'keydown', (e) => { if (e.target.id === 'upload-label' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); main.querySelector('#epub-input').click(); } });
  ctx.listen(main, 'dragover', (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { e.preventDefault(); main.querySelector('#drop-zone')?.classList.add('dragging'); } });
  ctx.listen(main, 'dragleave', (e) => { if (!main.contains(e.relatedTarget)) main.querySelector('#drop-zone')?.classList.remove('dragging'); });
  ctx.listen(main, 'drop', (e) => { if (!e.dataTransfer?.files?.length) return; e.preventDefault(); main.querySelector('#drop-zone')?.classList.remove('dragging'); upload(e.dataTransfer.files); });
  ctx.listen(main, 'click', (e) => {
    if (e.target.closest('[data-repo-refresh]')) { renderRepoSection(main, true); return; }
    const ra = e.target.closest('[data-repo-add]');
    if (ra) { const f = main.querySelector('#repo-books')._files?.[+ra.dataset.repoAdd]; if (f) { ra.disabled = true; addFromRepo(f, getFolder()).finally(() => { ra.disabled = false; }); } return; }
    const m = e.target.closest('[data-more]'); if (!m) return;
    const r = m.getBoundingClientRect(); const b = store.get('book', m.dataset.more); if (b) bookMenu(r.left, r.bottom + 4, b);
  });
  ctx.listen(main, 'contextmenu', (e) => {
    const c = e.target.closest('[data-book]'); if (!c) return;
    e.preventDefault(); const b = store.get('book', c.dataset.book); if (b) bookMenu(e.clientX, e.clientY, b);
  });
}
export { bookMenu };

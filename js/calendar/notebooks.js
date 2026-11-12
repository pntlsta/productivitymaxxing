// Notebooks: markdown notes with Edit/Preview, .md upload, per-note unsaved status.
import * as store from '../core/store.js';
import { esc, loadMarked, sanitizeHTML, fmtDateTime, plural } from '../core/util.js';
import { icon } from '../core/icons.js';
import { toast, formDialog, confirmDialog, emptyState, skeletonRows } from '../core/ui.js';

const mode = { preview: false };
const dirty = new Set(); // note ids with typed edits not yet committed to the queue

export async function newNotebook() {
  const v = await formDialog({ title: 'New notebook', submitText: 'Create', fields: [{ name: 'name', label: 'Name', required: true, placeholder: 'GRD-463 reading notes' }] });
  if (!v) return null;
  const nb = store.create('notebook', { name: v.name });
  location.hash = `#/calendar/notebook/${nb.id}`;
  return nb;
}
const notesOf = (nbId) => store.where('note', n => n.notebookId === nbId).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
const statusOf = (n) => dirty.has(n.id) ? { cls: 'dirty', text: 'Unsaved edits' } : store.isPending('note', n.id) ? { cls: 'pending', text: 'Not saved to GitHub' } : { cls: 'saved', text: 'Saved' };

export function mountNotebook(main, ctx, nbId, noteId) {
  const nb = store.get('notebook', nbId);
  if (!nb) {
    main.innerHTML = store.isLoading('notebook') ? skeletonRows(5) : emptyState('Notebook not found', 'It may have been deleted. Pick another notebook from the sidebar.', '<a class="btn" href="#/calendar">Back to calendar</a>');
    return { refresh() { if (store.get('notebook', nbId)) mountNotebook(main, ctx, nbId, noteId); } };
  }
  let current = noteId && store.get('note', noteId) ? noteId : notesOf(nbId)[0]?.id || null;
  main.innerHTML = `<div class="notebook">
    <div class="page-head"><h1 id="nb-title">${esc(nb.name)}</h1><span class="spacer"></span>
      <div class="btn-group">
        <button class="btn btn-primary btn-sm" data-nb="new-note">${icon('plus')} New note</button>
        <label class="btn btn-sm" tabindex="0" role="button">${icon('upload')} Upload .md<input type="file" accept=".md,.markdown,text/markdown,text/plain" multiple hidden id="nb-upload"></label>
        <button class="btn btn-sm" data-nb="rename">${icon('edit')} Rename</button>
        <button class="btn btn-sm" data-nb="delete">${icon('trash')} Delete</button>
      </div></div>
    <div class="nb-grid">
      <nav class="nb-list card" aria-label="Notes in ${esc(nb.name)}"></nav>
      <section class="nb-editor card" aria-label="Note editor"></section>
    </div></div>`;
  const listEl = main.querySelector('.nb-list'), edEl = main.querySelector('.nb-editor');

  const renderList = () => {
    const notes = notesOf(nbId);
    listEl.innerHTML = notes.length ? `<ul class="ctx-list">${notes.map(n => {
      const st = statusOf(n);
      return `<li><button class="ctx-item ${n.id === current ? 'active' : ''}" data-note="${n.id}" aria-current="${n.id === current}">
        <span class="label">${esc(n.title || 'Untitled')}</span><span class="status-dot ${st.cls}" title="${st.text}" aria-label="${st.text}"></span></button></li>`;
    }).join('')}</ul>` : `<p class="ctx-empty">No notes yet. Create one or upload a .md file.</p>`;
  };
  const renderStatus = () => {
    const n = store.get('note', current); const el = edEl.querySelector('.note-status'); if (!n || !el) return;
    const st = statusOf(n); el.className = `note-status ${st.cls}`; el.textContent = st.text;
  };
  let timer = null, pending = null; // pending = {id, patch}: typed edits not yet in the queue
  const commitNow = () => {
    clearTimeout(timer); if (!pending) return;
    const { id, patch } = pending; pending = null; dirty.delete(id);
    if (store.get('note', id)) store.update('note', id, patch);
    renderList(); renderStatus();
  };
  const renderEditor = async () => {
    commitNow();
    const n = store.get('note', current);
    if (!n) { edEl.innerHTML = emptyState('No note selected', 'Create a note, or upload markdown files into this notebook.'); return; }
    edEl.innerHTML = `<div class="note-head">
        <label class="sr-only" for="note-title">Note title</label>
        <input class="note-title" id="note-title" value="${esc(n.title)}" placeholder="Untitled">
        <span class="note-status"></span>
        <div class="seg" role="group" aria-label="Mode"><button data-mode="edit" aria-pressed="${!mode.preview}">Edit</button><button data-mode="preview" aria-pressed="${mode.preview}">Preview</button></div>
        <button class="icon-btn" data-nb="delete-note" aria-label="Delete note">${icon('trash')}</button>
      </div>
      <div class="note-body">${mode.preview ? '<div class="md-preview prose" aria-live="polite">Rendering…</div>'
        : `<label class="sr-only" for="note-content">Markdown</label><textarea id="note-content" class="note-text" spellcheck="true">${esc(n.content || '')}</textarea>`}</div>
      <p class="small muted">Updated ${fmtDateTime(n.updatedAt)} · ${plural((n.content || '').length, 'character')}</p>`;
    renderStatus();
    if (mode.preview) {
      try { const marked = await loadMarked(); edEl.querySelector('.md-preview').innerHTML = sanitizeHTML(marked.parse(n.content || '*Empty note*')); }
      catch (e) { edEl.querySelector('.md-preview').textContent = e.message; }
    }
  };
  const onEdit = (field, value) => {
    if (pending && pending.id !== current) commitNow();
    pending = { id: current, patch: { ...(pending?.patch || {}), [field]: value } };
    dirty.add(current); renderStatus();
    const dot = listEl.querySelector(`[data-note="${current}"] .status-dot`); if (dot) dot.className = 'status-dot dirty';
    clearTimeout(timer); timer = setTimeout(commitNow, 700);
  };

  ctx.listen(edEl, 'input', (e) => {
    if (e.target.id === 'note-title') onEdit('title', e.target.value);
    if (e.target.id === 'note-content') onEdit('content', e.target.value);
  });
  ctx.listen(main, 'click', async (e) => {
    const t = e.target;
    const nt = t.closest('[data-note]');
    if (nt) { commitNow(); current = nt.dataset.note; history.replaceState(null, '', `#/calendar/notebook/${nbId}/${current}`); renderList(); renderEditor(); return; }
    const md = t.closest('[data-mode]');
    if (md) { commitNow(); mode.preview = md.dataset.mode === 'preview'; renderEditor(); return; }
    const a = t.closest('[data-nb]')?.dataset.nb;
    if (a === 'new-note') { const n = store.create('note', { notebookId: nbId, title: 'Untitled note', content: '' }); current = n.id; mode.preview = false; renderList(); await renderEditor(); edEl.querySelector('#note-title')?.select(); }
    if (a === 'rename') {
      const v = await formDialog({ title: 'Rename notebook', fields: [{ name: 'name', label: 'Name', value: store.get('notebook', nbId).name, required: true }] });
      if (v) store.update('notebook', nbId, { name: v.name });
    }
    if (a === 'delete') {
      const notes = notesOf(nbId);
      if (await confirmDialog({ title: 'Delete notebook?', message: `Delete "${nb.name}"${notes.length ? ` and its ${plural(notes.length, 'note')}` : ''}? You can restore from Settings.`, confirmText: 'Delete notebook' })) {
        notes.forEach(n => store.remove('note', n.id)); store.remove('notebook', nbId); location.hash = '#/calendar'; toast('Notebook deleted (queued).');
      }
    }
    if (a === 'delete-note') {
      const n = store.get('note', current);
      if (n && await confirmDialog({ title: 'Delete note?', message: `Delete "${n.title || 'Untitled'}"? You can restore it from Settings.` })) {
        clearTimeout(timer); pending = null; dirty.delete(n.id); store.remove('note', n.id); current = notesOf(nbId)[0]?.id || null; renderList(); renderEditor();
      }
    }
  });
  ctx.listen(main.querySelector('#nb-upload'), 'change', async (e) => {
    const files = [...e.target.files]; let last = null;
    for (const f of files) {
      if (f.size > 60000) { toast(`${f.name} is too large for one note (GitHub issue limit ~65k characters).`, 'error'); continue; }
      const text = await f.text();
      const h = /^#\s+(.+)$/m.exec(text);
      last = store.create('note', { notebookId: nbId, title: h ? h[1].trim() : f.name.replace(/\.(md|markdown|txt)$/i, ''), content: text });
    }
    e.target.value = '';
    if (last) { current = last.id; toast(`Uploaded ${plural(files.length, 'file')} (queued).`, 'success'); renderList(); renderEditor(); }
  });
  ctx.listen(main.querySelector('label[role=button]'), 'keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); main.querySelector('#nb-upload').click(); } });
  ctx.onCleanup(commitNow);

  renderList(); renderEditor();
  return {
    refresh(type) {
      if (type === 'notebook') { const x = store.get('notebook', nbId); if (x) main.querySelector('#nb-title').textContent = x.name; }
      if (type === 'note') { renderList(); renderStatus(); }
    },
  };
}

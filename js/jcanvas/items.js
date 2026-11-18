// JCanvas item side: Add Item dialog, module dialog, item page (view) and item editor.
import * as store from '../core/store.js';
import { esc, uuid } from '../core/util.js';
import { icon } from '../core/icons.js';
import { idbPut, idbGet, idbDel } from '../core/idb.js';
import { openDialog, formDialog, confirmDialog, toast } from '../core/ui.js';
import { ITEM_TYPES, course } from '../calendar/model.js';
import { CANVAS_TYPES, ICON, MAX_INDENT, isGradedType, isPublished, itemsIn, modulesOf, nextOrder, readingOrder, fmtWhenLong } from './model.js';
import { cleanRich, SNIPPETS, applySnippet } from './html.js';

const LIMIT = 50000; // stay well under GitHub's ~65,000-character issue body limit

export async function moduleDialog(cid, existing = null) {
  const v = await formDialog({ title: existing ? 'Edit Module' : 'Add Module', submitText: existing ? 'Update Module' : 'Add Module', fields: [
    { name: 'name', label: 'Module Name', value: existing?.name || '', required: true },
    { name: 'published', label: 'Published', type: 'checkbox', value: existing ? isPublished(existing) : true },
  ] });
  if (!v) return null;
  if (existing) { store.update('module', existing.id, v); return existing; }
  return store.create('module', { courseId: cid, name: v.name, published: v.published, order: nextOrder(modulesOf(cid)) });
}

// ---------- Add Item dialog (mirrors Canvas: "Add [type] to <module>") ----------
export function addItemDialog(cid, moduleId) {
  const mod = store.get('module', moduleId);
  const body = `<div class="jc-add">
    <div class="jc-add-row"><label for="ai-type">Add</label>
      <select class="input" id="ai-type">${CANVAS_TYPES.map(t => `<option>${t}</option>`).join('')}</select>
      <span>to <strong>${esc(mod?.name || 'module')}</strong></span></div>
    <div id="ai-fields"></div>
    <div class="field jc-add-indent"><label for="ai-indent">Indentation:</label>
      <select class="input" id="ai-indent">${Array.from({ length: MAX_INDENT + 1 }, (_, n) => `<option value="${n}">${n ? `Indent ${n} level${n > 1 ? 's' : ''}` : "Don't indent"}</option>`).join('')}</select></div>
  </div>`;
  const { dlg, close } = openDialog({ title: `Add Item to ${mod?.name || 'Module'}`, body, wide: true, foot: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="ai-add">Add Item</button>' });
  const $ = (s) => dlg.querySelector(s);
  const render = () => {
    const type = $('#ai-type').value; const f = $('#ai-fields');
    if (['Assignment', 'Quiz', 'Discussion', 'Page'].includes(type)) {
      const pool = store.where('item', i => i.courseId === cid && (i.type === type || (type === 'Assignment' && ['Project', 'Not Graded'].includes(i.type)))).sort((a, b) => a.name.localeCompare(b.name));
      f.innerHTML = `<p class="small muted">Select the ${type.toLowerCase()} you want to associate with this module, or add a new one by selecting "[ Create ${type} ]".</p>
        <label class="sr-only" for="ai-pick">${type}</label>
        <select class="input jc-pick" id="ai-pick" size="8"><option value="__new" selected>[ Create ${type} ]</option>
          ${pool.map(i => `<option value="${i.id}">${esc(i.name)}${i.moduleId && store.get('module', i.moduleId) ? ` (in ${esc(store.get('module', i.moduleId).name)})` : ''}</option>`).join('')}</select>
        <div class="field" id="ai-new"><label for="ai-name">${type} Name</label><input class="input" id="ai-name" autocomplete="off"></div>`;
      $('#ai-pick').onchange = () => { $('#ai-new').hidden = $('#ai-pick').value !== '__new'; };
    } else if (type === 'Text Header') {
      f.innerHTML = '<div class="field"><label for="ai-name">Header</label><input class="input" id="ai-name" autocomplete="off"></div>';
    } else if (type === 'External URL' || type === 'External Tool') {
      f.innerHTML = `<div class="field"><label for="ai-url">URL</label><input class="input" id="ai-url" type="url" placeholder="https://"></div>
        <div class="field"><label for="ai-name">Page Name</label><input class="input" id="ai-name" autocomplete="off"></div>
        <label class="check"><input type="checkbox" id="ai-newtab"> Load in a new tab</label>`;
    } else if (type === 'File') {
      f.innerHTML = `<div class="field"><label for="ai-file">File</label><input class="input" id="ai-file" type="file"><span class="hint">Stored in this browser only (files can be large; GitHub sync keeps just the name).</span></div>
        <div class="field"><label for="ai-name">Display name (optional)</label><input class="input" id="ai-name" autocomplete="off"></div>`;
    }
    $('#ai-name')?.focus();
  };
  $('#ai-type').onchange = render; render();
  $('#ai-add').onclick = async () => {
    const type = $('#ai-type').value; const indent = +$('#ai-indent').value;
    const siblings = itemsIn(cid, moduleId);
    const base = { courseId: cid, moduleId, indent, order: nextOrder(siblings), published: true };
    const name = $('#ai-name')?.value.trim();
    const pick = $('#ai-pick')?.value;
    if (pick && pick !== '__new') { store.update('item', pick, { moduleId, indent, order: base.order }); close(); toast('Added to module (queued).', 'success'); return; }
    if (type === 'File') {
      const file = $('#ai-file').files[0]; if (!file) { toast('Choose a file.', 'error'); return; }
      const key = uuid(); await idbPut('files', key, file);
      store.create('item', { ...base, type, name: name || file.name, fileKey: key, fileName: file.name, fileType: file.type, fileSize: file.size });
    } else if (type === 'External URL' || type === 'External Tool') {
      const url = $('#ai-url').value.trim();
      if (!/^https?:\/\//i.test(url)) { toast('Enter a URL starting with https://', 'error'); return; }
      store.create('item', { ...base, type, name: name || url, url, newTab: $('#ai-newtab').checked });
    } else {
      if (!name) { toast(`Give the ${type.toLowerCase()} a name.`, 'error'); $('#ai-name').focus(); return; }
      const extra = isGradedType(type) ? { points: 0, availDate: null, dueDate: null, completed: false, html: '' } : type === 'Page' ? { html: '' } : {};
      store.create('item', { ...base, type, name, ...extra });
    }
    close(); toast(`${type} added (queued).`, 'success');
  };
}

// ---------- Item page ----------
export function renderItem(main, cid, id) {
  const it = store.get('item', id); const c = course(cid);
  if (!it) { main.innerHTML = `<div class="jc-empty"><h2>Not found</h2><p>This item was deleted or moved.</p><a class="btn" href="#/jcanvas/${cid}">Back to Modules</a></div>`; return; }
  const order = readingOrder(cid); const i = order.findIndex(x => x.id === id);
  const prev = order[i - 1], next = order[i + 1];
  const graded = isGradedType(it.type);
  let details = '';
  if (graded) {
    details = `<ul class="jc-details">
      <li><span>Due</span><strong>${it.dueDate ? fmtWhenLong(it.dueDate, it.dueTime) : 'No due date'}</strong></li>
      <li><span>Points</span><strong>${it.points ?? 0}</strong></li>
      <li><span>Available</span><strong>${it.availDate || it.untilDate ? `${it.availDate ? fmtWhenLong(it.availDate, it.availTime) : 'Now'} – ${it.untilDate ? fmtWhenLong(it.untilDate, it.untilTime) : 'no end date'}` : 'Always'}</strong></li>
    </ul>`;
  }
  let content = it.html ? `<div class="jc-user-content">${cleanRich(it.html)}</div>` : (graded || it.type === 'Page' ? '<p class="muted">No content yet. Click Edit to add a description or page content (HTML supported).</p>' : '');
  if (it.type === 'External URL' || it.type === 'External Tool') content = `<p>This item links to an external site.</p><p><a class="btn btn-primary" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">${icon('link')} Open ${esc(it.name)}</a></p><p class="small muted">${esc(it.url)}</p>`;
  if (it.type === 'File') content = `<p>${icon('file')} <strong>${esc(it.fileName || it.name)}</strong> ${it.fileSize ? `<span class="muted">(${Math.round(it.fileSize / 1024).toLocaleString()} KB)</span>` : ''}</p><p><button class="btn btn-primary" data-download="${esc(it.fileKey || '')}">${icon('download')} Download</button></p>`;
  main.innerHTML = `<article class="jc-item-page">
    <div class="jc-item-head">
      <h1>${esc(it.name)}</h1><span class="spacer"></span>
      ${graded ? `<button class="btn ${it.completed ? 'btn-primary' : ''}" data-done aria-pressed="${!!it.completed}">${icon('check')} ${it.completed ? 'Done' : 'Mark as done'}</button>` : ''}
      ${!isPublished(it) ? '<span class="badge">Unpublished</span>' : ''}
      ${it.type !== 'Text Header' ? `<a class="btn" href="#/jcanvas/${cid}/item/${id}/edit">${icon('edit')} Edit</a>` : ''}
    </div>
    ${graded ? `<p class="small muted">${esc(it.type)} · ${esc(c?.code || '')}</p>` : ''}
    ${details}${content}
    <nav class="jc-pager" aria-label="Module navigation">
      ${prev ? `<a class="btn" href="#/jcanvas/${cid}/item/${prev.id}" title="${esc(prev.name)}">${icon('chevL')} Previous</a>` : '<span></span>'}
      ${next ? `<a class="btn" href="#/jcanvas/${cid}/item/${next.id}" title="${esc(next.name)}">Next ${icon('chevR')}</a>` : '<span></span>'}
    </nav></article>`;
}
export async function downloadFile(key, name) {
  const blob = await idbGet('files', key).catch(() => null);
  if (!blob) { toast('This file is not stored in this browser. Re-add it on the device where it was uploaded.', 'error'); return; }
  const u = URL.createObjectURL(blob); const a = Object.assign(document.createElement('a'), { href: u, download: name || 'file' });
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 1000);
}

// ---------- Item editor ----------
export function renderEdit(main, cid, id) {
  const it = store.get('item', id);
  if (!it) return renderItem(main, cid, id);
  const graded = isGradedType(it.type); const link = it.type === 'External URL' || it.type === 'External Tool';
  const hasBody = graded || it.type === 'Page';
  const dt = (d, t) => (d ? `${d}T${t || '00:00'}` : '');
  main.innerHTML = `<form class="jc-edit" id="jc-edit" novalidate>
    <div class="field"><label for="je-name">${it.type === 'Text Header' ? 'Header' : 'Title'}</label><input class="input jc-title-input" id="je-name" value="${esc(it.name)}" required></div>
    ${graded ? `<div class="row">
      <div class="field"><label for="je-type">Type</label><select class="input" id="je-type">${ITEM_TYPES.map(t => `<option ${t === it.type ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="field"><label for="je-points">Points</label><input class="input" type="number" min="0" step="any" id="je-points" value="${it.points ?? 0}"></div></div>
      <fieldset class="jc-assign"><legend>Assign</legend>
        <div class="field"><label for="je-due">Due</label><input class="input" type="datetime-local" id="je-due" value="${dt(it.dueDate, it.dueTime || '23:59')}"></div>
        <div class="row"><div class="field"><label for="je-avail">Available from</label><input class="input" type="datetime-local" id="je-avail" value="${dt(it.availDate, it.availTime)}"></div>
          <div class="field"><label for="je-until">Until</label><input class="input" type="datetime-local" id="je-until" value="${dt(it.untilDate, it.untilTime || '23:59')}"></div></div>
        <p class="error small" id="je-date-err" role="alert"></p></fieldset>` : ''}
    ${link ? `<div class="field"><label for="je-url">URL</label><input class="input" type="url" id="je-url" value="${esc(it.url || '')}"></div>
      <label class="check"><input type="checkbox" id="je-newtab" ${it.newTab ? 'checked' : ''}> Load in a new tab</label>` : ''}
    ${hasBody ? `<div class="jc-editor">
      <div class="jc-editor-bar" role="toolbar" aria-label="Insert HTML">
        <div class="seg" role="tablist"><button type="button" role="tab" data-mode="html" aria-pressed="true">HTML Editor</button><button type="button" role="tab" data-mode="preview" aria-pressed="false">Preview</button></div>
        <span class="spacer"></span>${SNIPPETS.map((s, i) => `<button type="button" class="btn btn-sm btn-ghost" data-snip="${i}" title="${esc(s.title)}">${esc(s.label)}</button>`).join('')}
      </div>
      <label class="sr-only" for="je-html">Content (HTML)</label>
      <textarea class="input jc-html" id="je-html" spellcheck="false" placeholder="<h2>Overview</h2>\n<p>Write HTML like a Canvas page…</p>">${esc(it.html || '')}</textarea>
      <div class="jc-user-content jc-preview" id="je-preview" hidden></div>
      <p class="small muted" id="je-size"></p></div>` : ''}
    <label class="check"><input type="checkbox" id="je-pub" ${isPublished(it) ? 'checked' : ''}> Published</label>
    <div class="jc-edit-foot"><button type="button" class="btn btn-danger" id="je-delete">${icon('trash')} Delete</button><span class="spacer"></span>
      <a class="btn" href="#/jcanvas/${cid}/item/${id}">Cancel</a><button class="btn btn-primary" type="submit">Save</button></div>
  </form>`;
  const $ = (s) => main.querySelector(s);
  const html = $('#je-html');
  const size = () => { if (!html) return; const n = html.value.length; $('#je-size').textContent = `${n.toLocaleString()} characters${n > LIMIT ? ' — too long to save to GitHub (about 50,000 max). Split it into more pages.' : ''}`; $('#je-size').style.color = n > LIMIT ? 'var(--danger)' : ''; };
  size(); html?.addEventListener('input', size);
  main.querySelectorAll('[data-snip]').forEach(b => b.addEventListener('click', () => applySnippet(html, SNIPPETS[+b.dataset.snip])));
  main.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
    const prev = b.dataset.mode === 'preview';
    main.querySelectorAll('[data-mode]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    html.hidden = prev; $('#je-preview').hidden = !prev;
    if (prev) $('#je-preview').innerHTML = cleanRich(html.value) || '<p class="muted">Nothing to preview.</p>';
  }));
  const split = (v) => (v ? v.split('T') : [null, null]);
  $('#jc-edit').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#je-name').value.trim(); if (!name) { $('#je-name').focus(); return; }
    const patch = { name, published: $('#je-pub').checked };
    if (graded) {
      const [dueDate, dueTime] = split($('#je-due').value), [availDate, availTime] = split($('#je-avail').value), [untilDate, untilTime] = split($('#je-until').value);
      const err = $('#je-date-err');
      if ($('#je-avail').value && $('#je-until').value && $('#je-until').value < $('#je-avail').value) { err.textContent = '"Until" must be after "Available from".'; return; }
      if ($('#je-due').value && $('#je-avail').value && $('#je-due').value < $('#je-avail').value) { err.textContent = 'The due date is before the available date.'; return; }
      if ($('#je-due').value && $('#je-until').value && $('#je-due').value > $('#je-until').value) { err.textContent = 'The due date is after the "Until" date, so it couldn’t be submitted on time.'; return; }
      Object.assign(patch, { type: $('#je-type').value, points: Number($('#je-points').value || 0), dueDate, dueTime, availDate, availTime, untilDate, untilTime });
    }
    if (link) { const url = $('#je-url').value.trim(); if (!/^https?:\/\//i.test(url)) { toast('Enter a URL starting with https://', 'error'); return; } Object.assign(patch, { url, newTab: $('#je-newtab').checked }); }
    if (hasBody) { if (html.value.length > LIMIT) { toast('Content is too long to save. Split it into more pages.', 'error'); return; } patch.html = html.value; }
    store.update('item', id, patch);
    toast('Saved (queued). Click Save in the sidebar to sync.', 'success');
    location.hash = `#/jcanvas/${cid}/item/${id}`;
  });
  $('#je-delete').addEventListener('click', async () => { if (await removeItem(it)) location.hash = `#/jcanvas/${cid}`; });
  $('#je-name').focus();
}

/** Delete an item (with confirmation). Graded items also leave the Calendar. */
export async function removeItem(it) {
  const msg = isGradedType(it.type) ? `Delete "${it.name}"? It is also removed from your Calendar. You can restore it from Settings.` : `Delete "${it.name}"? You can restore it from Settings.`;
  if (!await confirmDialog({ title: `Delete ${it.type.toLowerCase()}?`, message: msg })) return false;
  store.remove('item', it.id);
  if (it.fileKey) idbDel('files', it.fileKey).catch(() => {});
  toast('Deleted (queued).');
  return true;
}
export function duplicateItem(it) {
  const { id, createdAt, updatedAt, ...rest } = it; void id; void createdAt; void updatedAt;
  store.create('item', { ...rest, name: `${it.name} Copy`, order: (it.order ?? 0) + 0.5, completed: false });
  toast('Duplicated (queued).', 'success');
}
export async function moveItemDialog(it) {
  const mods = modulesOf(it.courseId);
  const v = await formDialog({ title: `Move "${it.name}"`, submitText: 'Move', fields: [
    { name: 'moduleId', label: 'Module', type: 'select', value: it.moduleId || '', options: [{ value: '', label: '(Not in a module)' }, ...mods.map(m => ({ value: m.id, label: m.name }))] },
  ] });
  if (!v) return;
  store.update('item', it.id, { moduleId: v.moduleId || null, order: nextOrder(itemsIn(it.courseId, v.moduleId || null)) });
}

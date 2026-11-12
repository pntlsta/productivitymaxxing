// Announcements: dated list with add / edit / delete.
import * as store from '../core/store.js';
import { esc, fmtLong, today } from '../core/util.js';
import { icon } from '../core/icons.js';
import { formDialog, confirmDialog, toast, emptyState, skeletonRows } from '../core/ui.js';

export async function announcementDialog(a = null) {
  const v = await formDialog({
    title: a ? 'Edit announcement' : 'New announcement', submitText: a ? 'Save' : 'Add',
    fields: [
      { name: 'date', label: 'Date', type: 'date', value: a?.date || today(), required: true },
      { name: 'title', label: 'Title', value: a?.title || '', required: true },
      { name: 'body', label: 'Details', type: 'textarea', rows: 4, value: a?.body || '' },
    ],
  });
  if (!v) return;
  if (a) store.update('announcement', a.id, v); else store.create('announcement', v);
  toast(a ? 'Announcement updated (queued).' : 'Announcement added (queued).', 'success');
}

export function renderAnnouncements(main) {
  const list = store.all('announcement').sort((a, b) => b.date.localeCompare(a.date));
  main.innerHTML = `<div class="page-head"><h1>Announcements</h1><span class="spacer"></span>
      <a class="btn btn-sm" href="#/calendar">${icon('arrowL')} Calendar</a>
      <button class="btn btn-primary btn-sm" data-ann="add">${icon('plus')} New announcement</button></div>
    ${store.isLoading('announcement') ? skeletonRows(4) : list.length ? `<ul class="ann-list">${list.map(a => `<li class="card" data-id="${a.id}">
        <div class="row"><span class="badge accent">${fmtLong(a.date)}</span><h2 class="ann-title">${esc(a.title)}</h2><span class="spacer"></span>
          <button class="icon-btn" data-ann="edit" aria-label="Edit ${esc(a.title)}">${icon('edit')}</button>
          <button class="icon-btn" data-ann="delete" aria-label="Delete ${esc(a.title)}">${icon('trash')}</button></div>
        ${a.body ? `<p class="ann-body">${esc(a.body)}</p>` : ''}</li>`).join('')}</ul>`
      : emptyState('No announcements', 'Post course announcements here; the latest show as a banner on the calendar.')}`;
}

export function bindAnnouncements(main, ctx) {
  ctx.listen(main, 'click', async (e) => {
    const b = e.target.closest('[data-ann]'); if (!b) return;
    const a = store.get('announcement', b.closest('[data-id]')?.dataset.id);
    if (b.dataset.ann === 'add') announcementDialog();
    if (b.dataset.ann === 'edit' && a) announcementDialog(a);
    if (b.dataset.ann === 'delete' && a && await confirmDialog({ title: 'Delete announcement?', message: `Delete "${a.title}"?` })) { store.remove('announcement', a.id); toast('Announcement deleted (queued).'); }
  });
}

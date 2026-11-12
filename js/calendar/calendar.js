// Calendar module: routes between planner, notebooks and announcements; owns the sidebar section.
import * as store from '../core/store.js';
import { esc } from '../core/util.js';
import { icon } from '../core/icons.js';
import { contextMenu } from '../core/ui.js';
import { courses, courseDialog, deleteCourse, itemsOf } from './model.js';
import { view, saveView, mountPlanner, renderPlanner, bindPlanner } from './planner.js';
import { mountNotebook, newNotebook } from './notebooks.js';
import { renderAnnouncements, bindAnnouncements, announcementDialog } from './announcements.js';

let sub = null; // { kind, refresh(type) }

function renderSidebar(el, params) {
  const nbs = store.all('notebook').sort((a, b) => a.name.localeCompare(b.name));
  const cs = courses();
  el.innerHTML = `
    <div class="ctx-section"><div class="ctx-head"><h2 class="ctx-title">Courses</h2>
      <button class="icon-btn btn-sm" data-side="add-course" aria-label="Add course" title="Add course">${icon('plus')}</button></div>
      ${cs.length ? `<ul class="ctx-list">
        <li><button class="ctx-item ${view.course === 'all' && !params[0] ? 'active' : ''}" data-course="all"><span class="dot" style="background:var(--text-muted)"></span><span class="label">All courses</span></button></li>
        ${cs.map(c => `<li><button class="ctx-item ${view.course === c.id && !params[0] ? 'active' : ''}" data-course="${c.id}" title="${esc(c.name)}${c.description ? ' — ' + esc(c.description) : ''}" aria-haspopup="menu">
          <span class="dot" style="background:${esc(c.color)}"></span><span class="label">${esc(c.code)} <span class="muted">${esc(c.name)}</span></span><span class="meta">${itemsOf(c.id).filter(i => !i.completed).length || ''}</span></button></li>`).join('')}
      </ul>` : '<p class="ctx-empty">Add your first course with +.</p>'}
      ${cs.length ? '<p class="ctx-empty small">Right-click a course to edit or delete.</p>' : ''}
    </div>
    <div class="ctx-section"><div class="ctx-head"><h2 class="ctx-title">Notebooks</h2>
      <button class="icon-btn btn-sm" data-side="add-notebook" aria-label="New notebook" title="New notebook">${icon('plus')}</button></div>
      ${nbs.length ? `<ul class="ctx-list">${nbs.map(n => `<li><a class="ctx-item" href="#/calendar/notebook/${n.id}" ${params[0] === 'notebook' && params[1] === n.id ? 'aria-current="true"' : ''}>${icon('notes')}<span class="label">${esc(n.name)}</span><span class="meta">${store.where('note', x => x.notebookId === n.id).length || ''}</span></a></li>`).join('')}</ul>`
        : '<p class="ctx-empty">No notebooks yet.</p>'}
    </div>
    <div class="ctx-section"><div class="ctx-head"><h2 class="ctx-title">Announcements</h2>
      <button class="icon-btn btn-sm" data-side="add-ann" aria-label="New announcement" title="New announcement">${icon('plus')}</button></div>
      <ul class="ctx-list"><li><a class="ctx-item" href="#/calendar/announcements" ${params[0] === 'announcements' ? 'aria-current="true"' : ''}>${icon('megaphone')}<span class="label">All announcements</span><span class="meta">${store.all('announcement').length || ''}</span></a></li></ul>
    </div>`;
}

function courseMenu(x, y, id) {
  const c = store.get('course', id); if (!c) return;
  contextMenu(x, y, [
    { label: `Show only ${c.code}`, icon: 'calendar', action: () => { view.course = id; saveView(); location.hash = '#/calendar'; sub?.refresh('item'); } },
    { label: 'Edit course', icon: 'edit', action: () => courseDialog(c) },
    'sep',
    { label: 'Delete course…', icon: 'trash', danger: true, action: () => deleteCourse(c).then(ok => { if (ok && view.course === id) { view.course = 'all'; saveView(); } }) },
  ], `${c.code} actions`);
}

function show(main, ctx) {
  ctx.cleanup(); // drop listeners of the previous sub-view
  const p = ctx.params;
  ctx.on('change', (t) => { renderSidebar(ctx.sidebar, ctx.params); sub?.refresh(t); });
  ctx.on('queue', () => sub?.refresh('note'));
  bindSidebar(ctx);
  if (p[0] === 'notebook') {
    sub = mountNotebook(main, ctx, p[1], p[2]);
  } else if (p[0] === 'announcements') {
    renderAnnouncements(main); bindAnnouncements(main, ctx);
    sub = { refresh: (t) => { if (t === 'announcement') renderAnnouncements(main); } };
  } else {
    mountPlanner(main, ctx);
    const rerender = ctx.guard(() => renderPlanner(main));
    rerender(); bindPlanner(main, ctx, () => { rerender(); renderSidebar(ctx.sidebar, ctx.params); });
    sub = { refresh: (t) => { if (['item', 'course', 'announcement'].includes(t)) rerender(); } };
  }
  renderSidebar(ctx.sidebar, p);
}

function bindSidebar(ctx) {
  ctx.listen(ctx.sidebar, 'click', (e) => {
    const s = e.target.closest('[data-side]')?.dataset.side;
    if (s === 'add-course') courseDialog();
    if (s === 'add-notebook') newNotebook();
    if (s === 'add-ann') announcementDialog();
    const c = e.target.closest('[data-course]');
    if (c) { view.course = c.dataset.course; saveView(); if (ctx.params[0]) location.hash = '#/calendar'; else { sub?.refresh('item'); renderSidebar(ctx.sidebar, ctx.params); } }
  });
  ctx.listen(ctx.sidebar, 'contextmenu', (e) => {
    const c = e.target.closest('[data-course]'); if (!c || c.dataset.course === 'all') return;
    e.preventDefault(); courseMenu(e.clientX, e.clientY, c.dataset.course);
  });
  ctx.listen(ctx.sidebar, 'keydown', (e) => {
    const c = e.target.closest('[data-course]'); if (!c || c.dataset.course === 'all') return;
    if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) { e.preventDefault(); const r = c.getBoundingClientRect(); courseMenu(r.left + 20, r.bottom, c.dataset.course); }
  });
}

export default {
  mount(main, ctx) { show(main, ctx); },
  update(params, ctx) { show(ctx.main, ctx); },
};

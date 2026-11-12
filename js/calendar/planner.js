// Planner view: announcements banner, toolbar (date-placement toggles, filters), month grid,
// This Week / Next Week / All lists, and the command bar.
import * as store from '../core/store.js';
import { esc, isoDate, addDays, startOfWeek, weekRange, fmtLong, fmtShort, monthName, lsGet, lsSet, today, plural } from '../core/util.js';
import { icon } from '../core/icons.js';
import { openDialog, emptyState, skeletonRows } from '../core/ui.js';
import { courses, course, itemRow, bindItemRows, sortItems, itemDialog, courseDialog } from './model.js';
import { mountCommandBar } from './commands.js';

const KEY = 'wb.cal.view';
export const view = Object.assign({ month: isoDate(new Date()).slice(0, 7), avail: true, due: true, course: 'all', status: 'all', tab: 'this' }, lsGet(KEY, {}));
export const saveView = () => lsSet(KEY, view);

function filtered() {
  return store.all('item').filter(i =>
    (view.course === 'all' || i.courseId === view.course) &&
    (view.status === 'all' || (view.status === 'done') === !!i.completed));
}
/** [{date, kind:'avail'|'due', item}] honoring the two placement toggles. */
function placements(items) {
  const out = [];
  for (const it of items) {
    if (view.avail && it.availDate) out.push({ date: it.availDate, kind: 'avail', item: it });
    if (view.due && it.dueDate) out.push({ date: it.dueDate, kind: 'due', item: it });
  }
  return out;
}
function inSpan(items, s, e) {
  return items.filter(it => (view.avail && it.availDate >= s && it.availDate <= e) || (view.due && it.dueDate >= s && it.dueDate <= e));
}

function banner() {
  const list = store.all('announcement').sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  if (!list.length) return '';
  return `<section class="ann-strip" aria-label="Announcements">${icon('megaphone')}
    <ul>${list.map(a => `<li><span class="ann-date">${fmtShort(a.date)}</span> <strong>${esc(a.title)}</strong>${a.body ? ` <span class="muted">— ${esc(a.body.slice(0, 120))}</span>` : ''}</li>`).join('')}</ul>
    <a class="btn btn-sm btn-ghost" href="#/calendar/announcements">All</a></section>`;
}

function toolbar() {
  const [y, m] = view.month.split('-').map(Number);
  return `<div class="cal-toolbar">
    <div class="btn-group" role="group" aria-label="Month">
      <button class="icon-btn" data-month="-1" aria-label="Previous month">${icon('chevL')}</button>
      <h2 class="cal-month" aria-live="polite">${monthName(m - 1)} ${y}</h2>
      <button class="icon-btn" data-month="1" aria-label="Next month">${icon('chevR')}</button>
      <button class="btn btn-sm" data-month="0">Today</button>
    </div>
    <span class="spacer"></span>
    <div class="btn-group" role="group" aria-label="Place items by date">
      <span class="small muted">Place by</span>
      <div class="seg"><button data-toggle="avail" aria-pressed="${view.avail}">Available</button><button data-toggle="due" aria-pressed="${view.due}">Due</button></div>
    </div>
    <label class="sr-only" for="f-course">Filter by course</label>
    <select class="input input-sm" id="f-course"><option value="all">All courses</option>${courses().map(c => `<option value="${c.id}" ${view.course === c.id ? 'selected' : ''}>${esc(c.code)}</option>`).join('')}</select>
    <label class="sr-only" for="f-status">Filter by completion</label>
    <select class="input input-sm" id="f-status">
      ${[['all', 'All items'], ['open', 'Not completed'], ['done', 'Completed']].map(([v, l]) => `<option value="${v}" ${view.status === v ? 'selected' : ''}>${l}</option>`).join('')}
    </select>
    <button class="btn btn-primary btn-sm" id="add-item">${icon('plus')} Item</button>
  </div>`;
}

function monthGrid(items) {
  const [y, m] = view.month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const start = startOfWeek(first);
  const byDay = new Map();
  for (const p of placements(items)) { if (!byDay.has(p.date)) byDay.set(p.date, []); byDay.get(p.date).push(p); }
  const t = today();
  let cells = '';
  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i), iso = isoDate(d);
    const ps = (byDay.get(iso) || []).sort((a, b) => (a.kind === 'due' ? 0 : 1) - (b.kind === 'due' ? 0 : 1));
    const other = d.getMonth() !== m - 1;
    cells += `<button class="day ${other ? 'other' : ''} ${iso === t ? 'today' : ''}" data-day="${iso}" role="gridcell"
      aria-label="${fmtLong(iso)}${ps.length ? `, ${plural(ps.length, 'item')}` : ''}">
      <span class="day-num">${d.getDate()}</span>
      ${ps.slice(0, 3).map(p => {
        const c = course(p.item.courseId);
        return `<span class="chip ${p.item.completed ? 'done' : ''} ${p.kind}"><span class="dot" style="background:${esc(c?.color || 'currentColor')}"></span><span class="chip-k">${p.kind === 'due' ? 'D' : 'A'}</span><span class="chip-t">${esc(p.item.name)}</span></span>`;
      }).join('')}
      ${ps.length > 3 ? `<span class="chip-more">+${ps.length - 3} more</span>` : ''}
    </button>`;
    if (i === 34 && addDays(start, 35).getMonth() !== m - 1) break; // 5 rows are enough
  }
  return `<div class="month" role="grid" aria-label="${monthName(m - 1)} ${y}">
    <div class="dow" role="row">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(x => `<span role="columnheader">${x}</span>`).join('')}</div>
    <div class="days">${cells}</div></div>`;
}

function lists(items) {
  const [ts, te] = weekRange(new Date());
  const [ns, ne] = weekRange(addDays(new Date(), 7));
  const key = view.due ? 'dueDate' : 'availDate';
  let list, label;
  if (view.tab === 'this') { list = inSpan(items, ts, te); label = `This week · ${fmtShort(ts)} – ${fmtShort(te)}`; }
  else if (view.tab === 'next') { list = inSpan(items, ns, ne); label = `Next week · ${fmtShort(ns)} – ${fmtShort(ne)}`; }
  else { list = items; label = 'All items'; }
  sortItems(list, key);
  const none = !view.avail && !view.due && view.tab !== 'all';
  return `<section class="card cal-lists" aria-label="Item lists">
    <div class="row" style="margin-bottom:var(--space-3)">
      <div class="seg" role="tablist" aria-label="List">
        ${[['this', 'This Week'], ['next', 'Next Week'], ['all', 'All']].map(([v, l]) => `<button role="tab" data-tab="${v}" aria-selected="${view.tab === v}" aria-pressed="${view.tab === v}">${l}</button>`).join('')}
      </div>
      <span class="muted small">${esc(label)} · ${plural(list.length, 'item')}</span>
    </div>
    ${none ? emptyState('No date placement', 'Turn on Available or Due above to place items in weeks.')
      : list.length ? `<ul class="item-list">${list.map(itemRow).join('')}</ul>`
      : emptyState(store.all('item').length ? 'Nothing here' : 'No items yet', store.all('item').length ? 'No items match this week and filter.' : 'Add an item with the button above, or type a command below.')}
  </section>`;
}

/** Mount the planner shell once (keeps the command bar's input across re-renders). */
export function mountPlanner(main, ctx) {
  main.innerHTML = '<div class="planner"><div class="planner-body"></div><div class="cmd-host"></div></div>';
  mountCommandBar(main.querySelector('.cmd-host'), ctx);
}
export function renderPlanner(main) {
  const loading = store.isLoading('item') || store.isLoading('course');
  const noCourses = !loading && !courses().length;
  main.querySelector('.planner-body').innerHTML = `
    <div class="page-head"><h1>Calendar</h1><span class="sub">Course planner</span></div>
    ${banner()}
    ${noCourses ? `<div class="card" style="margin-bottom:var(--space-4)">${emptyState('Start by adding a course', 'Courses use codes like GRT-101. Each gets a color used on all of its items.', `<button class="btn btn-primary" id="first-course">${icon('plus')} Add course</button>`)}</div>` : ''}
    ${toolbar()}
    ${loading ? skeletonRows(6) : monthGrid(filtered())}
    ${loading ? '' : lists(filtered())}`;
}

export function bindPlanner(main, ctx, rerender) {
  bindItemRows(main);
  ctx.listen(main, 'click', (e) => {
    const t = e.target;
    const mo = t.closest('[data-month]');
    if (mo) {
      const n = +mo.dataset.month;
      if (n === 0) view.month = isoDate(new Date()).slice(0, 7);
      else { const [y, m] = view.month.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); view.month = isoDate(d).slice(0, 7); }
      saveView(); rerender(); return;
    }
    const tg = t.closest('[data-toggle]'); if (tg) { view[tg.dataset.toggle] = !view[tg.dataset.toggle]; saveView(); rerender(); return; }
    const tab = t.closest('[data-tab]'); if (tab) { view.tab = tab.dataset.tab; saveView(); rerender(); return; }
    const day = t.closest('[data-day]'); if (day) { openDay(day.dataset.day); return; }
    if (t.closest('#add-item')) itemDialog(null, { courseId: view.course !== 'all' ? view.course : undefined });
    if (t.closest('#first-course')) courseDialog();
  });
  ctx.listen(main, 'change', (e) => {
    if (e.target.id === 'f-course') { view.course = e.target.value; saveView(); rerender(); }
    if (e.target.id === 'f-status') { view.status = e.target.value; saveView(); rerender(); }
  });
}

function openDay(iso) {
  const render = () => {
    const ps = placements(filtered()).filter(p => p.date === iso);
    const avail = ps.filter(p => p.kind === 'avail').map(p => p.item), due = ps.filter(p => p.kind === 'due').map(p => p.item);
    return (due.length ? `<h3 class="small muted">Due</h3><ul class="item-list">${due.map(itemRow).join('')}</ul>` : '') +
      (avail.length ? `<h3 class="small muted">Available</h3><ul class="item-list">${avail.map(itemRow).join('')}</ul>` : '') +
      (!ps.length ? emptyState('Nothing on this day', 'Add an item that is available or due on this date.') : '');
  };
  const { dlg, body, close } = openDialog({ title: fmtLong(iso), body: render(), wide: true, foot: `<button class="btn" data-add>${icon('plus')} Add item on this day</button><button class="btn btn-primary" data-close>Close</button>` });
  bindItemRows(body);
  const off = store.on('change', (t) => { if (t === 'item' && dlg.isConnected) body.innerHTML = render(); });
  dlg.addEventListener('close', off);
  dlg.querySelector('[data-add]').onclick = () => { close(); itemDialog(null, { date: iso, courseId: view.course !== 'all' ? view.course : undefined }); };
}

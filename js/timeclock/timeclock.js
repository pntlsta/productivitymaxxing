// Time Clock: punches, weekly timesheet with inline edits, week navigation, printing.
import * as store from '../core/store.js';
import { esc, isoDate, parseISO, addDays, startOfWeek, fmtShort, fmtLong, DAY_NAMES, pad2, today } from '../core/util.js';
import { icon } from '../core/icons.js';
import { toast, formDialog, skeletonRows } from '../core/ui.js';
import { PUNCH_FIELDS, PUNCH_LABELS, dayHours, fmtHours, punchFor, weekDays, weekTotal, nextAllowed } from './calc.js';
import { printWeeks } from './print.js';

let weekStart = startOfWeek(new Date());

const nowHM = () => { const d = new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const fmt12 = (t) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}:${pad2(m)} ${h < 12 ? 'AM' : 'PM'}`; };
const weekLabel = (ws) => `${fmtShort(isoDate(ws))} – ${fmtLong(isoDate(addDays(ws, 6)))}`;

function setPunch(dateIso, field, value) {
  const p = punchFor(dateIso);
  if (p) store.update('punch', p.id, { [field]: value || null });
  else if (value) store.create('punch', { date: dateIso, clockIn: null, lunchOut: null, lunchIn: null, clockOut: null, [field]: value });
}

function renderMain(main) {
  const days = weekDays(weekStart);
  const thisWeek = isoDate(startOfWeek(new Date())) === isoDate(weekStart);
  const tp = punchFor(today());
  const allowed = nextAllowed(tp);
  const loading = store.isLoading('punch');
  main.innerHTML = `
    <div class="page-head"><h1>Time Clock</h1><span class="spacer"></span>
      <div class="clock-now" aria-live="off"><span id="tc-time" class="clock-time"></span><span id="tc-date" class="muted small"></span></div></div>
    <section class="card punch-card" aria-label="Punch clock">
      <div class="punch-row" role="group" aria-label="Punch buttons">
        ${PUNCH_FIELDS.map(f => `<button class="btn ${allowed.has(f) ? 'btn-primary' : ''} punch-btn" data-punch="${f}" ${allowed.has(f) ? '' : 'disabled'}>${PUNCH_LABELS[f]}</button>`).join('')}
      </div>
      <p class="muted small" id="tc-today" style="margin:var(--space-3) 0 0">${todaySummary(tp)}</p>
    </section>
    <section class="card" aria-labelledby="tc-week-h">
      <div class="row" style="margin-bottom:var(--space-3)">
        <h2 id="tc-week-h" style="margin:0">${weekLabel(weekStart)}</h2><span class="spacer"></span>
        <div class="btn-group" role="group" aria-label="Week navigation">
          <button class="btn btn-sm" data-nav="-1" aria-label="Previous week">‹ Prev</button>
          <button class="btn btn-sm" data-nav="0" ${thisWeek ? 'aria-pressed="true"' : ''}>This Week</button>
          <button class="btn btn-sm" data-nav="1" aria-label="Next week">Next ›</button>
        </div>
        <div class="btn-group">
          <button class="btn btn-sm" id="tc-print" title="Ctrl+P">${icon('printer')} Print Week</button>
          <button class="btn btn-sm" id="tc-print-range">${icon('printer')} Print Date Range</button>
        </div>
      </div>
      ${loading ? skeletonRows(7) : `<div class="table-wrap"><table class="table timesheet">
        <caption class="sr-only">Timesheet for ${weekLabel(weekStart)}. Click a time to edit it.</caption>
        <thead><tr><th scope="col">Day</th>${PUNCH_FIELDS.map(f => `<th scope="col">${PUNCH_LABELS[f]}</th>`).join('')}<th scope="col" class="num">Hours</th></tr></thead>
        <tbody>${days.map(d => {
          const p = punchFor(d); const h = dayHours(p);
          return `<tr class="${d === today() ? 'is-today' : ''}"><th scope="row">${DAY_NAMES[parseISO(d).getDay()]}<span class="muted small"> ${fmtShort(d)}</span></th>
            ${PUNCH_FIELDS.map(f => `<td><button class="cell-btn" data-date="${d}" data-field="${f}" aria-label="${PUNCH_LABELS[f]} on ${fmtShort(d)}: ${p?.[f] ? fmt12(p[f]) : 'empty'}. Edit">${p?.[f] ? fmt12(p[f]) : '<span class="muted">—</span>'}</button></td>`).join('')}
            <td class="num">${fmtHours(h)}</td></tr>`;
        }).join('')}</tbody>
        <tfoot><tr><td colspan="5">Weekly Total</td><td class="num">${weekTotal(weekStart).toFixed(2)}</td></tr></tfoot>
      </table></div>
      ${days.some(d => punchFor(d)) ? '' : '<p class="muted small" style="margin-top:var(--space-3)">No punches this week yet. Use Clock In above, or click any cell to enter a time manually.</p>'}`}
    </section>`;
  tick(main);
}

function todaySummary(p) {
  if (!p || !p.clockIn) return 'Not clocked in today.';
  const parts = PUNCH_FIELDS.filter(f => p[f]).map(f => `${PUNCH_LABELS[f]} ${fmt12(p[f])}`);
  const h = dayHours(p);
  return parts.join(' · ') + (h != null ? ` — ${fmtHours(h)} hours` : '');
}

function tick(main) {
  const t = main.querySelector('#tc-time'); if (!t) return;
  const d = new Date();
  t.textContent = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  main.querySelector('#tc-date').textContent = d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

function editCell(btn) {
  const { date, field } = btn.dataset;
  const cur = punchFor(date)?.[field] || '';
  const td = btn.parentElement;
  td.innerHTML = `<input type="time" class="input cell-input" value="${esc(cur)}" aria-label="${PUNCH_LABELS[field]} on ${fmtShort(date)}">`;
  const inp = td.firstElementChild;
  inp.focus();
  let done = false;
  const commit = (save) => {
    if (done) return; done = true;
    if (save && inp.value !== cur) { setPunch(date, field, inp.value); toast(`${PUNCH_LABELS[field]} for ${fmtShort(date)} ${inp.value ? 'set' : 'cleared'} (queued).`); }
    else renderAll();
  };
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); commit(true); } if (e.key === 'Escape') { e.preventDefault(); commit(false); } });
  inp.addEventListener('blur', () => commit(true));
}

let renderAll = () => {};

function renderSidebar(el) {
  const cur = isoDate(weekStart);
  const set = new Set();
  const base = startOfWeek(new Date());
  for (let i = 0; i < 8; i++) set.add(isoDate(addDays(base, -7 * i)));
  store.all('punch').forEach(p => set.add(isoDate(startOfWeek(parseISO(p.date)))));
  set.add(cur);
  const weeks = [...set].sort().reverse();
  el.innerHTML = `
    <div class="ctx-section"><div class="ctx-head"><h2 class="ctx-title">Weeks</h2></div>
      <ul class="ctx-list">${weeks.map(w => {
        const total = weekTotal(parseISO(w));
        return `<li><a class="ctx-item" href="#/timeclock/${w}" ${w === cur ? 'aria-current="true"' : ''}><span class="label">${fmtShort(w)} – ${fmtShort(isoDate(addDays(parseISO(w), 6)))}</span><span class="meta">${total ? total.toFixed(2) + 'h' : ''}</span></a></li>`;
      }).join('')}</ul></div>
    <div class="ctx-section"><div class="ctx-head"><h2 class="ctx-title">Print</h2></div>
      <ul class="ctx-list">
        <li><button class="ctx-item" data-act="print-week">${icon('printer')}<span class="label">Print Week</span><kbd class="meta">Ctrl P</kbd></button></li>
        <li><button class="ctx-item" data-act="print-range">${icon('printer')}<span class="label">Print Date Range…</span></button></li>
      </ul></div>`;
}

async function printRangeDialog() {
  const [s, e] = [isoDate(addDays(weekStart, 0)), isoDate(addDays(weekStart, 6))];
  const v = await formDialog({
    title: 'Print date range', submitText: 'Print',
    fields: [
      { name: 'start', label: 'Start date', type: 'date', value: s, required: true },
      { name: 'end', label: 'End date', type: 'date', value: e, required: true, validate: (val, all) => val < all.start ? 'End date must be on or after the start date.' : '' },
    ],
  });
  if (!v) return;
  printWeeks(v.start, v.end);
}

const weekFromParams = (params) => {
  const d = params[0] && /^\d{4}-\d{2}-\d{2}$/.test(params[0]) ? parseISO(params[0]) : new Date();
  return startOfWeek(d);
};

export default {
  mount(main, ctx) {
    weekStart = weekFromParams(ctx.params);
    renderAll = ctx.guard(() => { renderMain(main); renderSidebar(ctx.sidebar); });
    renderAll();
    const timer = setInterval(() => tick(main), 1000);
    ctx.onCleanup(() => clearInterval(timer));
    let lastDay = today();
    const dayTimer = setInterval(() => { if (today() !== lastDay) { lastDay = today(); renderAll(); } }, 30000);
    ctx.onCleanup(() => clearInterval(dayTimer));
    ctx.on('change', (t) => { if (t === 'punch') renderAll(); });

    ctx.listen(main, 'click', (e) => {
      const pb = e.target.closest('[data-punch]');
      if (pb && !pb.disabled) {
        const f = pb.dataset.punch;
        if (!nextAllowed(punchFor(today())).has(f)) return;
        setPunch(today(), f, nowHM());
        toast(`${PUNCH_LABELS[f]} at ${fmt12(nowHM())}. Click Save to sync.`, 'success');
        return;
      }
      const nav = e.target.closest('[data-nav]');
      if (nav) {
        const n = +nav.dataset.nav;
        const ws = n === 0 ? startOfWeek(new Date()) : addDays(weekStart, 7 * n);
        location.hash = `#/timeclock/${isoDate(ws)}`;
        return;
      }
      const cell = e.target.closest('.cell-btn');
      if (cell) { editCell(cell); return; }
      if (e.target.closest('#tc-print')) printWeeks(isoDate(weekStart), isoDate(addDays(weekStart, 6)));
      if (e.target.closest('#tc-print-range')) printRangeDialog();
    });
    ctx.listen(ctx.sidebar, 'click', (e) => {
      const a = e.target.closest('[data-act]'); if (!a) return;
      if (a.dataset.act === 'print-week') printWeeks(isoDate(weekStart), isoDate(addDays(weekStart, 6)));
      else printRangeDialog();
    });
    ctx.listen(document, 'keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        printWeeks(isoDate(weekStart), isoDate(addDays(weekStart, 6)));
      }
    });
  },
  update(params) {
    weekStart = weekFromParams(params);
    renderAll();
  },
};

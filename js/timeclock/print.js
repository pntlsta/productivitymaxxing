// Printable timesheets: renders into #print-root, which print.css shows exclusively.
import { esc, isoDate, parseISO, addDays, startOfWeek, fmtShort, fmtLong, DAY_NAMES, pad2 } from '../core/util.js';
import { PUNCH_FIELDS, PUNCH_LABELS, dayHours, fmtHours, punchFor, weekDays } from './calc.js';

const fmt12 = (t) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}:${pad2(m)} ${h < 12 ? 'AM' : 'PM'}`; };

function weekTable(ws, start, end) {
  const days = weekDays(ws).filter(d => d >= start && d <= end);
  let total = 0;
  const rows = days.map(d => {
    const p = punchFor(d); const h = dayHours(p); total += h || 0;
    return `<tr><td>${DAY_NAMES[parseISO(d).getDay()]} ${fmtShort(d)}</td>${PUNCH_FIELDS.map(f => `<td>${fmt12(p?.[f])}</td>`).join('')}<td class="num">${fmtHours(h)}</td></tr>`;
  }).join('');
  const html = `<section class="print-week">
    <h2>Week of ${fmtLong(isoDate(ws))}</h2>
    <table class="print-table"><thead><tr><th>Day</th>${PUNCH_FIELDS.map(f => `<th>${PUNCH_LABELS[f]}</th>`).join('')}<th class="num">Hours</th></tr></thead>
    <tbody>${rows}</tbody><tfoot><tr><td colspan="5">Weekly Total</td><td class="num">${total.toFixed(2)}</td></tr></tfoot></table></section>`;
  return { html, total };
}

export function printWeeks(start, end) {
  const root = document.getElementById('print-root');
  let ws = startOfWeek(parseISO(start));
  const parts = []; let grand = 0;
  while (isoDate(ws) <= end) {
    const { html, total } = weekTable(ws, start, end);
    parts.push(html); grand += total;
    ws = addDays(ws, 7);
  }
  const multi = parts.length > 1;
  root.innerHTML = `<div class="print-sheet">
    <header class="print-head"><h1>Timesheet</h1><p>${esc(fmtLong(start))} – ${esc(fmtLong(end))}</p></header>
    ${parts.join('')}
    ${multi ? `<p class="print-grand">Grand Total: <strong>${grand.toFixed(2)} hours</strong></p>` : ''}
    <div class="print-sign">
      <div><span class="line"></span><span>Employee signature</span></div>
      <div class="short"><span class="line"></span><span>Date</span></div>
    </div>
    <div class="print-sign">
      <div><span class="line"></span><span>Supervisor signature</span></div>
      <div class="short"><span class="line"></span><span>Date</span></div>
    </div>
  </div>`;
  const html = document.documentElement, prevTheme = html.dataset.theme;
  html.classList.add('no-transition');
  html.dataset.theme = 'light';
  document.body.classList.add('printing');
  const done = () => {
    document.body.classList.remove('printing'); root.innerHTML = ''; html.dataset.theme = prevTheme;
    requestAnimationFrame(() => html.classList.remove('no-transition'));
    removeEventListener('afterprint', done);
  };
  addEventListener('afterprint', done);
  setTimeout(() => window.print(), 50);
}

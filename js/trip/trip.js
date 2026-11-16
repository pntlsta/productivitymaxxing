// Trip planner: itinerary with flags, dated checklist, packing list, budget, travel guide and an
// encrypted private-details box. Checks, expenses and the box sync via one db:trip record.
import * as store from '../core/store.js';
import { esc, uuid, parseISO, fmtShort, fmtLong, today, plural } from '../core/util.js';
import { icon } from '../core/icons.js';
import { toast, confirmDialog } from '../core/ui.js';
import { TRIP_ID, TRIP, DAYS, FLAGS, CHECKLIST, PACKING, PLANNED, BUDGET_NOTES, GUIDE } from './data.js';
import { seal, open, rememberPass, sessionPass, forgetPass } from './vault.js';

const TABS = [['itinerary', 'Itinerary'], ['checklist', 'Checklist'], ['packing', 'Packing'], ['budget', 'Budget'], ['guide', 'Guide'], ['private', 'Private details']];
const SEV = { conflict: ['Conflict', 'danger'], tight: ['Tight', 'warning'], gap: ['Missing info', 'accent'], todo: ['To do', ''] };
const SEV_ORDER = ['conflict', 'tight', 'gap', 'todo'];
const CUR = ['THB', 'PHP', 'USD'];
const KIND_ICON = { flight: '✈', stay: '⌂', activity: '•', transit: '→', tbd: '?', note: '!' };
const PHASES = [['2026-12-19', 'Getting there'], ['2026-12-22', 'Philippines'], ['2027-01-03', 'Chiang Mai'], ['2027-01-05', 'Bangkok'], ['2027-01-09', 'Back in the Philippines'], ['2027-01-10', 'Going home']];

const rec = () => store.get('trip', TRIP_ID) || { checks: {}, packed: {}, paid: {}, expenses: [], customPack: [], rates: {}, vault: null };
function patch(p) {
  if (store.get('trip', TRIP_ID)) store.update('trip', TRIP_ID, p);
  else store.create('trip', { id: TRIP_ID, name: TRIP.name, checks: {}, packed: {}, paid: {}, expenses: [], customPack: [], rates: {}, vault: null, ...p });
}
const weekday = (iso) => parseISO(iso).toLocaleDateString('en-US', { weekday: 'short' });
const daysUntil = (iso) => Math.round((parseISO(iso) - parseISO(today())) / 86400000);
const money = (n, c) => { const v = Number(n); const cents = !Number.isInteger(v) ? 2 : 0; return `${c === 'USD' ? '$' : c === 'PHP' ? '₱' : ''}${v.toLocaleString(undefined, { minimumFractionDigits: cents, maximumFractionDigits: 2 })}${c === 'THB' ? ' THB' : ''}`; };
const flagChip = (id) => { const f = FLAGS[id]; if (!f) return ''; const [l, c] = SEV[f.severity]; return `<a href="#/trip/itinerary" class="badge ${c} flag-chip" data-flag="${id}" title="${esc(f.title)}">${l}</a>`; };

/** Flights departing on a given ISO date (local departure date). */
export function flightsOn(iso) {
  return DAYS.find(d => d.date === iso)?.items.filter(i => i.kind === 'flight') || [];
}
export function tripStatus() {
  const todays = flightsOn(today());
  if (todays.length) return `Today: ${todays.map(f => `✈ ${f.code} ${f.route} ${f.time}`).join(' · ')}`;
  const d = daysUntil(TRIP.start);
  const done = CHECKLIST.filter(c => rec().checks[c.id]).length;
  return `${d > 0 ? `${plural(d, 'day')} to go` : d >= -20 ? 'On the trip' : 'Trip done'} · ${done}/${CHECKLIST.length} checklist`;
}

// ---------- tabs ----------
function itinerary() {
  const t = today();
  const flags = Object.entries(FLAGS).sort((a, b) => SEV_ORDER.indexOf(a[1].severity) - SEV_ORDER.indexOf(b[1].severity));
  let html = `<section class="card flags-card" aria-labelledby="flags-h"><h2 id="flags-h">Needs attention <span class="muted small">${flags.filter(([, f]) => f.severity !== 'todo').length} conflicts, tight spots and gaps</span></h2>
    <ul class="flag-list">${flags.map(([id, f]) => `<li id="flag-${id}" class="flag sev-${f.severity}"><span class="badge ${SEV[f.severity][1]}">${SEV[f.severity][0]}</span><div><strong>${esc(f.title)}</strong><p>${esc(f.text)}</p></div></li>`).join('')}</ul></section>`;
  for (const [i, [start, label]] of PHASES.entries()) {
    const end = PHASES[i + 1]?.[0] || '9999';
    const days = DAYS.filter(d => d.date >= start && d.date < end);
    html += `<h2 class="phase">${esc(label)}</h2><ol class="trip-days">${days.map(d => `<li class="day-card ${d.date === t ? 'is-today' : d.date < t ? 'past' : ''}" id="day-${d.date}">
      <div class="day-head"><span class="day-date">${weekday(d.date)}, ${fmtShort(d.date)}</span><span class="day-place">${esc(d.place)}</span>${d.date === t ? '<span class="badge accent">Today</span>' : ''}</div>
      <ul class="slots">${d.items.map(it => `<li class="slot kind-${it.kind}"><span class="slot-time">${esc(it.time)}</span><span class="slot-icon" aria-hidden="true">${KIND_ICON[it.kind]}</span>
        <span class="slot-text">${esc(it.text)} ${(it.flags || []).map(flagChip).join(' ')}</span></li>`).join('')}</ul></li>`).join('')}</ol>`;
  }
  return html;
}

function checklist() {
  const r = rec(); const t = today();
  const row = (c) => {
    const done = !!r.checks[c.id]; const left = daysUntil(c.due);
    const status = done ? '<span class="badge success">Done</span>' : left < 0 ? '<span class="badge danger">Overdue</span>' : left <= 7 ? `<span class="badge warning">${left === 0 ? 'Today' : `${left}d`}</span>` : '';
    return `<li class="check-row ${done ? 'done' : ''}"><label class="check"><input type="checkbox" data-check="${c.id}" ${done ? 'checked' : ''}><span>${esc(c.text)}</span></label>
      <span class="check-meta"><span class="muted small">${esc(c.when)}</span> ${status} ${c.flag ? flagChip(c.flag) : ''} ${c.link ? `<a class="small" href="${esc(c.link)}" target="_blank" rel="noopener noreferrer">${esc(c.link.replace(/^https:\/\/(www\.)?/, ''))}</a>` : ''}</span></li>`;
  };
  const sorted = [...CHECKLIST].sort((a, b) => a.due.localeCompare(b.due));
  const open = sorted.filter(c => !r.checks[c.id]), done = sorted.filter(c => r.checks[c.id]);
  void t;
  return `<section class="card"><h2>Pre-trip checklist <span class="muted small">${done.length} of ${CHECKLIST.length} done</span></h2>
    <ul class="check-list">${open.map(row).join('')}</ul>
    ${done.length ? `<h3 class="small muted">Done</h3><ul class="check-list">${done.map(row).join('')}</ul>` : ''}</section>`;
}

function packing() {
  const r = rec();
  const groups = PACKING.map(g => ({ group: g.group, items: g.items.map((text, i) => ({ id: `${g.group}#${i}`, text })) }));
  for (const c of r.customPack || []) { const g = groups.find(x => x.group === c.group) || groups[groups.push({ group: c.group, items: [] }) - 1]; g.items.push({ id: c.id, text: c.text, custom: true }); }
  const count = (who) => groups.flatMap(g => g.items).filter(it => r.packed[`${it.id}|${who}`]).length;
  const total = groups.flatMap(g => g.items).length;
  return `<section class="card"><h2>Packing list</h2>
    <p class="muted small">20 kg checked bag each on every flight, 7 kg carry-on. Packed: ${TRIP.travelers.map(w => `${w} ${count(w)}/${total}`).join(' · ')}</p>
    <div class="pack-grid">${groups.map(g => `<div class="pack-group"><h3>${esc(g.group)}</h3>
      <table class="table pack-table"><thead><tr><th>Item</th>${TRIP.travelers.map(w => `<th class="num">${w}</th>`).join('')}<th></th></tr></thead><tbody>
      ${g.items.map(it => `<tr><td>${esc(it.text)}</td>${TRIP.travelers.map(w => `<td class="num"><input type="checkbox" data-pack="${esc(it.id)}|${w}" aria-label="${esc(w)}: ${esc(it.text)}" ${r.packed[`${it.id}|${w}`] ? 'checked' : ''}></td>`).join('')}
        <td>${it.custom ? `<button class="icon-btn btn-sm" data-unpack="${esc(it.id)}" aria-label="Remove ${esc(it.text)}">${icon('trash')}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`).join('')}</div>
    <form class="row add-pack" id="add-pack"><div class="field"><label for="pk-text">Add your own item</label><input class="input" id="pk-text" required></div>
      <div class="field"><label for="pk-group">Section</label><select class="input" id="pk-group">${groups.map(g => `<option>${esc(g.group)}</option>`).join('')}</select></div>
      <button class="btn btn-primary" type="submit">${icon('plus')} Add</button></form></section>`;
}

function budget() {
  const r = rec(); const rates = r.rates || {};
  // A ticked/unticked box overrides the status from the documents.
  const planned = PLANNED.map(p => ({ ...p, paid: r.paid[p.id] ?? (p.status === 'paid') }));
  const STATUS = (p) => p.paid ? '<span class="badge success">Paid</span>' : p.status === 'check' ? '<span class="badge warning">Check</span>' : '<span class="badge danger">Not paid</span>';
  const sum = (list, f) => CUR.reduce((m, c) => (m[c] = list.filter(x => x.currency === c && f(x)).reduce((s, x) => s + Number(x.amount || 0), 0), m), {});
  const counted = (p) => !p.optional && !p.refundable;
  const paidTot = sum(planned, p => counted(p) && p.paid), dueTot = sum(planned, p => counted(p) && !p.paid && p.status !== 'check');
  const checkTot = sum(planned, p => counted(p) && !p.paid && p.status === 'check'), depositTot = sum(planned, p => p.refundable && !p.paid);
  const spentTot = sum(r.expenses || [], () => true);
  const toPHP = (tot) => (tot.THB && !rates.THB) || (tot.USD && !rates.USD) ? null : tot.PHP + tot.THB * (rates.THB || 0) + tot.USD * (rates.USD || 0);
  const totRow = (tot) => CUR.filter(c => tot[c]).map(c => money(tot[c], c)).join(' + ') || '0';
  const php = (tot) => { const v = toPHP(tot); return v == null ? '<span class="muted small">enter rates to combine</span>' : `≈ ${money(v, 'PHP')}`; };
  return `<section class="card"><h2>Planned costs</h2><p class="muted small">${esc(BUDGET_NOTES)}</p>
    <table class="table budget-table"><thead><tr><th>Item</th><th>Status</th><th class="num">Amount</th><th class="num">Paid</th></tr></thead><tbody>
    ${planned.map(p => `<tr class="${p.optional ? 'muted' : ''}"><td>${esc(p.label)}${p.optional ? ' <span class="badge">Optional</span>' : ''}${p.refundable ? ' <span class="badge">Refundable</span>' : ''}</td>
      <td>${STATUS(p)}<span class="status-why small muted">${esc(p.paid ? (p.status === 'paid' ? p.why : 'Marked paid') : (p.when || p.why || ''))}</span></td><td class="num">${money(p.amount, p.currency)}</td>
      <td class="num"><input type="checkbox" data-paid="${p.id}" ${p.paid ? 'checked' : ''} aria-label="Paid: ${esc(p.label)}"></td></tr>`).join('')}</tbody>
    <tfoot>
      <tr><td colspan="2">Already paid</td><td class="num" colspan="2">${totRow(paidTot)} ${php(paidTot)}</td></tr>
      <tr><td colspan="2">Still to pay</td><td class="num" colspan="2">${totRow(dueTot)} ${php(dueTot)}</td></tr>
      ${CUR.some(c => checkTot[c]) ? `<tr><td colspan="2">Unclear: check payment status</td><td class="num" colspan="2">${totRow(checkTot)} ${php(checkTot)}</td></tr>` : ''}
      ${CUR.some(c => depositTot[c]) ? `<tr><td colspan="2">Refundable deposits held at check-in</td><td class="num" colspan="2">${totRow(depositTot)}</td></tr>` : ''}
    </tfoot></table></section>
    <section class="card"><h2>Spending</h2>
      <form class="row" id="add-exp">
        <div class="field"><label for="ex-date">Date</label><input class="input" type="date" id="ex-date" value="${today()}" required></div>
        <div class="field" style="flex:2 1 14rem"><label for="ex-label">What</label><input class="input" id="ex-label" required placeholder="e.g. Grab to Silom"></div>
        <div class="field"><label for="ex-amount">Amount</label><input class="input" type="number" min="0" step="any" id="ex-amount" required></div>
        <div class="field"><label for="ex-cur">Currency</label><select class="input" id="ex-cur">${CUR.map(c => `<option>${c}</option>`).join('')}</select></div>
        <button class="btn btn-primary" type="submit">${icon('plus')} Add</button></form>
      ${(r.expenses || []).length ? `<table class="table"><thead><tr><th>Date</th><th>What</th><th class="num">Amount</th><th></th></tr></thead><tbody>
        ${[...r.expenses].sort((a, b) => b.date.localeCompare(a.date)).map(e => `<tr><td>${fmtShort(e.date)}</td><td>${esc(e.label)}</td><td class="num">${money(e.amount, e.currency)}</td>
          <td><button class="icon-btn btn-sm" data-del-exp="${e.id}" aria-label="Delete ${esc(e.label)}">${icon('trash')}</button></td></tr>`).join('')}</tbody>
        <tfoot><tr><td colspan="2">Spent so far</td><td class="num" colspan="2">${totRow(spentTot)} ${php(spentTot)}</td></tr></tfoot></table>`
        : '<p class="muted small">No spending logged yet. Add expenses as you go.</p>'}
      <h3 class="small muted" style="margin-top:var(--space-4)">Exchange rates (your numbers, used only to combine totals)</h3>
      <div class="row"><div class="field"><label for="rate-thb">1 THB = ? PHP</label><input class="input" type="number" step="any" min="0" id="rate-thb" value="${rates.THB ?? ''}"></div>
        <div class="field"><label for="rate-usd">1 USD = ? PHP</label><input class="input" type="number" step="any" min="0" id="rate-usd" value="${rates.USD ?? ''}"></div></div>
    </section>`;
}

function guide() {
  return `<div class="guide-grid">${GUIDE.map(g => `<section class="card"><h2>${esc(g.title)}</h2><ul>${g.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></section>`).join('')}</div>`;
}

const TEMPLATE = `FLIGHTS
US trip (Cathay Pacific + American, Dec 19 – Jan 11) booking ref:
  Seats:            AAdvantage #:            Global Entry KTN (Jae):
Jan 3 MNL→DMK→CNX (AirAsia) booking ref:
  Seats:
Jan 5 CNX→BKK (Bangkok Airways PG220) booking ref:
  Seats:
Jan 8 BKK→MNL (PAL PR737) booking ref:
  Seats:

STAYS
Hyatt Place Chicago/O'Hare Expedia itinerary #:          Hotel confirmation:
Dagupan Airbnb (Cozy Haven) confirmation:     Unit / host:
Baguio Airbnb confirmation:          Address / host:
Parañaque Airbnb confirmation:       Unit / host:
Chillin' Guest House confirmation:
Centre Point Plus Silom itinerary #:          Hotel confirmation:
Expedia Stay Protection Plan policy #:
`;
function privateTab(unlocked) {
  const r = rec();
  if (unlocked != null) return `<section class="card"><h2>Private details <span class="badge success">Unlocked</span></h2>
    <p class="muted small">Booking references, seats, exact addresses, anything you don't want public. Saved encrypted; the repo only ever stores scrambled text.</p>
    <label class="sr-only" for="vault-text">Private details</label><textarea class="input vault-text" id="vault-text" rows="18" spellcheck="false">${esc(unlocked)}</textarea>
    <div class="btn-group" style="margin-top:var(--space-3)"><button class="btn btn-primary" id="vault-save">${icon('save')} Encrypt and save</button><button class="btn" id="vault-lock">Lock</button></div></section>`;
  if (!r.vault) return `<section class="card"><h2>Private details</h2>
    <p>Your repo is public, so booking references and seats are not on this page: a booking code plus a last name is enough to change or cancel a flight. Keep them here instead. They are encrypted with a passphrase before being saved, so they sync to your devices but nobody else can read them.</p>
    <form id="vault-setup" class="row"><div class="field"><label for="vp1">Choose a passphrase</label><input class="input" type="password" id="vp1" minlength="8" required autocomplete="new-password"></div>
      <div class="field"><label for="vp2">Repeat it</label><input class="input" type="password" id="vp2" required autocomplete="new-password"></div>
      <button class="btn btn-primary" type="submit">Create</button></form>
    <p class="muted small">There is no reset. If you forget the passphrase, the details can't be recovered (your bookings are still in your email).</p></section>`;
  return `<section class="card"><h2>Private details <span class="badge">Locked</span></h2>
    <form id="vault-unlock" class="row"><div class="field"><label for="vp">Passphrase</label><input class="input" type="password" id="vp" required autocomplete="current-password"></div>
      <button class="btn btn-primary" type="submit">Unlock</button></form><p class="error small" id="vault-err" role="alert"></p></section>`;
}

// ---------- module ----------
let tab = 'itinerary', unlocked = null, rendering = false;
function render(main) {
  // Replacing the DOM blurs a focused input, which fires "change"; ignore events raised mid-render.
  rendering = true;
  try { draw(main); } finally { rendering = false; }
}
function draw(main) {
  main.innerHTML = `<div class="trip">
    <div class="page-head"><h1>${esc(TRIP.name)}</h1><span class="sub">${fmtLong(TRIP.start)} – ${fmtLong(TRIP.end)} · Thailand Jan 3–8 · ${esc(tripStatus())}</span><span class="spacer"></span>
      <button class="btn btn-sm no-print" id="trip-print">${icon('printer')} Print</button></div>
    <div class="seg trip-tabs no-print" role="tablist" aria-label="Trip sections">${TABS.map(([id, l]) => `<button role="tab" aria-selected="${tab === id}" aria-pressed="${tab === id}" data-tab="${id}">${l}</button>`).join('')}</div>
    <div class="trip-body">${{ itinerary, checklist, packing, budget, guide }[tab]?.() ?? privateTab(unlocked)}</div></div>`;
}
function renderSidebar(el) {
  const r = rec();
  const flags = Object.values(FLAGS); const cnt = (s) => flags.filter(f => f.severity === s).length;
  const next = [...CHECKLIST].filter(c => !r.checks[c.id]).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 4);
  el.innerHTML = `<div class="ctx-section"><div class="ctx-head"><h2 class="ctx-title">Trip</h2></div><ul class="ctx-list">
    ${TABS.map(([id, l]) => `<li><a class="ctx-item" href="#/trip/${id}" ${tab === id ? 'aria-current="true"' : ''}><span class="label">${l}</span>${id === 'itinerary' ? `<span class="meta">${cnt('conflict') + cnt('tight') + cnt('gap')} flags</span>` : ''}</a></li>`).join('')}</ul></div>
    <div class="ctx-section"><div class="ctx-head"><h2 class="ctx-title">Next up</h2></div>
      ${next.length ? `<ul class="ctx-list">${next.map(c => `<li><a class="ctx-item" href="#/trip/checklist"><span class="label">${esc(c.text)}</span><span class="meta">${esc(fmtShort(c.due))}</span></a></li>`).join('')}</ul>` : '<p class="ctx-empty">Checklist complete.</p>'}</div>`;
}

export default {
  mount(main, ctx) {
    tab = TABS.some(([id]) => id === ctx.params[0]) ? ctx.params[0] : 'itinerary';
    const all = ctx.guard(() => { render(main); renderSidebar(ctx.sidebar); });
    all();
    // During the trip, open on today's card.
    if (tab === 'itinerary') setTimeout(() => main.querySelector('.day-card.is-today')?.scrollIntoView({ block: 'start' }), 0);
    // Redraw on data changes, keeping focus (and the unsaved private-details text) where it was.
    ctx.on('change', (t) => {
      if (t !== 'trip') return;
      const a = document.activeElement; const id = main.contains(a) && a.id ? a.id : null;
      const draft = main.querySelector('#vault-text')?.value;
      all();
      if (draft != null && main.querySelector('#vault-text')) main.querySelector('#vault-text').value = draft;
      if (id) main.querySelector(`#${CSS.escape(id)}`)?.focus();
    });
    ctx.listen(main, 'click', async (e) => {
      const tb = e.target.closest('[data-tab]'); if (tb) { location.hash = `#/trip/${tb.dataset.tab}`; return; }
      const fl = e.target.closest('[data-flag]'); if (fl && tab === 'itinerary') { e.preventDefault(); document.getElementById(`flag-${fl.dataset.flag}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      if (fl) { e.preventDefault(); tab = 'itinerary'; history.replaceState(null, '', '#/trip/itinerary'); all(); setTimeout(() => document.getElementById(`flag-${fl.dataset.flag}`)?.scrollIntoView({ block: 'center' })); return; }
      if (e.target.closest('#trip-print')) { window.print(); return; }
      const de = e.target.closest('[data-del-exp]');
      if (de) { const x = rec().expenses.find(z => z.id === de.dataset.delExp); if (x && await confirmDialog({ title: 'Delete expense?', message: `Delete "${x.label}" (${money(x.amount, x.currency)})?` })) patch({ expenses: rec().expenses.filter(z => z.id !== x.id) }); return; }
      const up = e.target.closest('[data-unpack]');
      if (up && await confirmDialog({ title: 'Remove item?', message: 'Remove this item from the packing list?' })) { patch({ customPack: rec().customPack.filter(c => c.id !== up.dataset.unpack) }); return; }
      if (e.target.closest('#vault-lock')) { unlocked = null; forgetPass(); all(); return; }
      if (e.target.closest('#vault-save')) {
        const pass = sessionPass(); if (!pass) { toast('Unlock again to save.', 'error'); return; }
        const text = main.querySelector('#vault-text').value;
        patch({ vault: await seal(text, pass) }); unlocked = text; toast('Private details encrypted (queued). Click Save to sync.', 'success');
      }
    });
    ctx.listen(main, 'change', (e) => {
      if (rendering) return;
      const t = e.target; const r = rec();
      if (t.dataset.check) patch({ checks: { ...r.checks, [t.dataset.check]: t.checked } });
      else if (t.dataset.pack) patch({ packed: { ...r.packed, [t.dataset.pack]: t.checked } });
      else if (t.dataset.paid) patch({ paid: { ...r.paid, [t.dataset.paid]: t.checked } });
      else if (t.id === 'rate-thb' || t.id === 'rate-usd') { const v = t.value === '' ? null : Number(t.value); patch({ rates: { ...r.rates, [t.id === 'rate-thb' ? 'THB' : 'USD']: v } }); }
    });
    ctx.listen(main, 'submit', async (e) => {
      e.preventDefault(); const f = e.target; const $ = (s) => main.querySelector(s);
      if (f.id === 'add-exp') {
        const amount = Number($('#ex-amount').value); if (!$('#ex-label').value.trim() || !(amount >= 0)) return;
        patch({ expenses: [...(rec().expenses || []), { id: uuid(), date: $('#ex-date').value, label: $('#ex-label').value.trim(), amount, currency: $('#ex-cur').value }] });
        toast('Expense added (queued).', 'success');
      } else if (f.id === 'add-pack') {
        const text = $('#pk-text').value.trim(); if (!text) return;
        patch({ customPack: [...(rec().customPack || []), { id: uuid(), group: $('#pk-group').value, text }] });
      } else if (f.id === 'vault-setup') {
        const a = $('#vp1').value, b = $('#vp2').value;
        if (a.length < 8) { toast('Use at least 8 characters.', 'error'); return; }
        if (a !== b) { toast('The passphrases don’t match.', 'error'); return; }
        rememberPass(a); patch({ vault: await seal(TEMPLATE, a) }); unlocked = TEMPLATE; all();
        toast('Created. Fill in your details, then Encrypt and save.', 'success');
      } else if (f.id === 'vault-unlock') {
        const pass = $('#vp').value;
        try { unlocked = await open(rec().vault, pass); rememberPass(pass); all(); }
        catch (err) { $('#vault-err').textContent = err.message; }
      }
    });
    // stay unlocked within this tab session
    const sp = sessionPass();
    if (sp && rec().vault && unlocked == null) open(rec().vault, sp).then(t => { unlocked = t; if (tab === 'private') all(); }).catch(forgetPass);
  },
  update(params, ctx) { tab = TABS.some(([id]) => id === params[0]) ? params[0] : 'itinerary'; render(ctx.main); renderSidebar(ctx.sidebar); window.scrollTo(0, 0); },
};

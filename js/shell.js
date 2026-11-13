// App shell: sidebar (module switcher, contextual slot, theme/settings/save), collapse + resize,
// tablet overlay, offline badge, and the Save (queue flush) dialog.
import { $, esc, lsGet, lsSet, clamp } from './core/util.js';
import { icon } from './core/icons.js';
import { toggleTheme, currentTheme, onThemeChange } from './core/theme.js';
import * as store from './core/store.js';
import { openDialog, toast } from './core/ui.js';

export const MODULES = [
  { id: 'calendar', title: 'Calendar', icon: 'calendar', desc: 'Course planner' },
  { id: 'timeclock', title: 'Time Clock', icon: 'clock', desc: 'Hours and punches' },
  { id: 'notes', title: 'Notes', icon: 'notes', desc: 'Workspace' },
  { id: 'library', title: 'Library', icon: 'library', desc: 'Ebook reader' },
  { id: 'trip', title: 'Trip', icon: 'plane', desc: 'Philippines + Thailand' },
];

const sidebar = () => $('#sidebar');
const UI_KEY = 'wb.sidebar';

export function initShell() {
  const st = lsGet(UI_KEY, { collapsed: false, width: 256 });
  $('.home-btn .logo').innerHTML = icon('logo');
  $('#mobile-menu').innerHTML = icon('menu');
  applySidebarState(st);

  $('#home-btn').onclick = () => { location.hash = '#/home'; closeOverlay(); };
  $('#collapse-btn').onclick = () => { const s = lsGet(UI_KEY, st); s.collapsed = !s.collapsed; lsSet(UI_KEY, s); applySidebarState(s); };
  $('#mobile-menu').onclick = () => openOverlay();
  $('#sidebar-scrim').onclick = () => closeOverlay();
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('sidebar-open')) closeOverlay();
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); if (!document.body.classList.contains('is-home')) openSaveDialog(); }
    if ((e.ctrlKey || e.metaKey) && e.key === '\\') { e.preventDefault(); $('#collapse-btn').click(); }
  });
  initResizer();

  $('#module-nav').innerHTML = MODULES.map(m =>
    `<a class="nav-link" href="#/${m.id}" data-mod="${m.id}">${icon(m.icon)}<span class="label">${m.title}</span></a>`).join('');
  $('#module-nav').addEventListener('click', (e) => { if (e.target.closest('a')) closeOverlay(); });

  renderBottom();
  onThemeChange(renderBottom);
  store.on('queue', renderBottom);
  store.on('flushed', renderBottom);
  store.on('error', (m) => toast(m, 'error'));

  const net = () => { $('#offline-badge').hidden = navigator.onLine; renderBottom(); };
  addEventListener('online', () => { net(); toast('Back online. Click Save to send queued changes.', 'success'); store.sync(); });
  addEventListener('offline', () => { net(); toast('You are offline. Changes will be queued.', 'warning'); });
  net();

  addEventListener('beforeunload', (e) => {
    if (store.pendingCount() > 0) { e.preventDefault(); e.returnValue = 'You have unsaved changes.'; return e.returnValue; }
  });
}

function applySidebarState(s) {
  const sb = sidebar();
  sb.classList.toggle('collapsed', !!s.collapsed);
  sb.style.width = s.collapsed ? '' : `${clamp(s.width || 256, 200, 480)}px`;
  const btn = $('#collapse-btn');
  btn.innerHTML = icon(s.collapsed ? 'chevR' : 'panel');
  btn.setAttribute('aria-label', s.collapsed ? 'Expand sidebar' : 'Collapse sidebar');
  btn.setAttribute('aria-expanded', String(!s.collapsed));
  sb.querySelectorAll('.nav-link').forEach(a => a.title = s.collapsed ? a.textContent.trim() : '');
}

function initResizer() {
  const handle = $('.sidebar-resizer');
  const setW = (w) => { const s = lsGet(UI_KEY, {}); s.width = clamp(Math.round(w), 200, 480); lsSet(UI_KEY, s); applySidebarState(s); };
  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault(); handle.classList.add('dragging'); handle.setPointerCapture(e.pointerId);
    const move = (ev) => { sidebar().style.width = `${clamp(ev.clientX, 200, 480)}px`; };
    const up = (ev) => { handle.classList.remove('dragging'); handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); setW(ev.clientX); };
    handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up);
  });
  handle.addEventListener('keydown', (e) => {
    const w = sidebar().getBoundingClientRect().width;
    if (e.key === 'ArrowLeft') setW(w - 16); if (e.key === 'ArrowRight') setW(w + 16);
  });
}

function openOverlay() {
  document.body.classList.add('sidebar-open');
  $('#mobile-menu').setAttribute('aria-expanded', 'true');
  $('#home-btn').focus();
}
export function closeOverlay() {
  if (!document.body.classList.contains('sidebar-open')) return;
  document.body.classList.remove('sidebar-open');
  $('#mobile-menu').setAttribute('aria-expanded', 'false');
}

function renderBottom() {
  const n = store.pendingCount();
  const dark = currentTheme() === 'dark';
  const el = $('#sidebar-bottom');
  el.innerHTML = `
    <button class="nav-link" id="theme-btn" aria-label="Switch to ${dark ? 'light' : 'dark'} theme" title="Switch to ${dark ? 'light' : 'dark'} theme">${icon(dark ? 'sun' : 'moon')}<span class="label">${dark ? 'Light mode' : 'Dark mode'}</span></button>
    <a class="nav-link" href="#/settings" data-mod="settings">${icon('settings')}<span class="label">Settings</span></a>
    <button class="btn ${n ? 'btn-primary' : ''} save-btn" id="save-btn" ${store.isFlushing() ? 'disabled' : ''} aria-label="${n ? `Save ${n} pending change${n === 1 ? '' : 's'}` : 'All changes saved'}" title="Save (Ctrl+S)">
      ${icon('save')}<span class="label-text">${store.isFlushing() ? 'Saving…' : n ? 'Save' : 'Saved'}</span>${n ? `<span class="count">${n}</span>` : ''}
    </button>`;
  $('#theme-btn').onclick = () => { toggleTheme(); };
  $('#save-btn').onclick = () => openSaveDialog();
  markCurrent();
}

export function markCurrent() {
  const mod = (location.hash.replace(/^#\/?/, '').split('/')[0]) || 'home';
  document.querySelectorAll('#sidebar [data-mod]').forEach(a => {
    if (a.dataset.mod === mod) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  const m = MODULES.find(x => x.id === mod);
  $('#mobile-title').textContent = m ? m.title : mod === 'settings' ? 'Settings' : 'Workbench';
}

const opLabel = (op) => `${op.action} ${esc(store.issueTitle(op.type, op.record))}`;

export async function openSaveDialog() {
  const ops = store.pendingOps();
  if (!ops.length) { toast('Nothing to save. All changes are on GitHub.', 'success'); return; }
  if (store.isFlushing()) return;
  const body = `
    <p id="save-status">Sending ${ops.length} change${ops.length === 1 ? '' : 's'} to GitHub…</p>
    ${ops.length > 20 ? `<p class="small muted">Large batch: changes are sent about one per second so GitHub doesn't block them (about ${Math.max(1, Math.round(ops.length / 50))} minute${ops.length > 75 ? 's' : ''}). Keep this tab open; anything not sent stays queued.</p>` : ''}
    <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${ops.length}" aria-valuenow="0" aria-labelledby="save-status"><span></span></div>
    <ul class="op-list">${ops.map(op => `<li data-op="${op.opId}"><span class="st wait">Queued</span><span>${opLabel(op)}</span></li>`).join('')}</ul>`;
  const { dlg, close } = openDialog({ title: 'Save changes', body, foot: '<button class="btn btn-primary" data-close>Close</button>', wide: true });
  const bar = dlg.querySelector('.progress'), fill = bar.firstElementChild;
  try {
    const results = await store.flush(({ done, total, op, status, error, wait }) => {
      bar.setAttribute('aria-valuenow', done); fill.style.width = `${(done / total) * 100}%`;
      const li = dlg.querySelector(`[data-op="${op.opId}"]`); if (!li) return;
      const st = li.querySelector('.st');
      if (status === 'waiting') { st.textContent = 'Waiting'; dlg.querySelector('#save-status').textContent = `GitHub is throttling rapid writes. Waiting ${wait} seconds, then continuing automatically. Keep this tab open.`; return; }
      if (status === 'sending') { st.textContent = 'Sending'; if (done) dlg.querySelector('#save-status').textContent = `Sending ${done + 1} of ${total}…`; li.scrollIntoView({ block: 'nearest' }); }
      else if (status === 'ok') { st.textContent = 'Saved'; st.className = 'st ok'; }
      else { st.textContent = 'Failed'; st.className = 'st fail'; li.querySelector('span:last-child').insertAdjacentHTML('beforeend', `<span class="err">${esc(error)}</span>`); }
    });
    if (!results) return;
    const failed = results.filter(r => !r.ok).length;
    dlg.querySelector('#save-status').textContent = failed
      ? `${results.length - failed} saved, ${failed} failed. Failed changes stay queued; fix the issue and save again.`
      : `All ${results.length} change${results.length === 1 ? '' : 's'} saved.`;
    toast(failed ? `${failed} change${failed === 1 ? '' : 's'} failed to save.` : 'All changes saved to GitHub.', failed ? 'error' : 'success');
  } catch (e) {
    dlg.querySelector('#save-status').innerHTML = `<strong style="color:var(--danger)">${esc(e.message)}</strong>`;
    if (/Settings/.test(e.message)) dlg.querySelector('.dlg-foot').insertAdjacentHTML('afterbegin', '<a class="btn" href="#/settings" data-close>Open Settings</a>');
    toast(e.message, 'error');
  }
  void close;
}

/** Contextual sidebar slot for the current module. */
export const contextSlot = () => $('#sidebar-context');

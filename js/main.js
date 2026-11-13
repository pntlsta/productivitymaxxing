// Entry: theme, shell, hash router with per-module error boundaries.
import { $, esc } from './core/util.js';
import { initTheme } from './core/theme.js';
import { initShell, markCurrent, contextSlot, closeOverlay, MODULES } from './shell.js';
import * as store from './core/store.js';
import { toast } from './core/ui.js';
import { icon } from './core/icons.js';

const LOADERS = {
  home: () => import('./home.js'),
  settings: () => import('./settings.js'),
  calendar: () => import('./calendar/calendar.js'),
  timeclock: () => import('./timeclock/timeclock.js'),
  notes: () => import('./notes/notes.js'),
  library: () => import('./library/library.js'),
  trip: () => import('./trip/trip.js'),
};

let current = null; // { id, mod, ctx }

function parseHash() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const id = parts[0] && LOADERS[parts[0]] ? parts[0] : 'home';
  return { id, params: id === parts[0] ? parts.slice(1) : [] };
}

function renderBoundary(main, id, err) {
  console.error(`[${id}]`, err);
  const title = MODULES.find(m => m.id === id)?.title || id;
  main.className = 'main-inner';
  main.innerHTML = `<div class="boundary" role="alert">
    <h1>${esc(title)} hit an error</h1>
    <p class="muted">The rest of Workbench still works. Your queued changes are safe.</p>
    <pre>${esc(err?.message || String(err))}</pre>
    <div class="btn-group" style="justify-content:center"><button class="btn btn-primary" id="boundary-retry">${icon('refresh')} Reload module</button><a class="btn" href="#/home">Go home</a></div>
  </div>`;
  $('#boundary-retry').onclick = () => { current = null; route(); };
}

function makeCtx(id, main, params) {
  const cleanups = [];
  const ctx = {
    id, params, main, sidebar: contextSlot(),
    onCleanup: (fn) => cleanups.push(fn),
    /** Wrap a function so a thrown error shows the module's error boundary instead of blanking the app. */
    guard: (fn) => (...a) => { try { const r = fn(...a); if (r && r.catch) r.catch(e => fail(e)); return r; } catch (e) { fail(e); } },
    on: (evt, fn) => cleanups.push(store.on(evt, ctx.guard(fn))),
    listen: (target, evt, fn, opts) => { const g = ctx.guard(fn); target.addEventListener(evt, g, opts); cleanups.push(() => target.removeEventListener(evt, g, opts)); },
    cleanup: () => { while (cleanups.length) { try { cleanups.pop()(); } catch (e) { console.error(e); } } },
  };
  const fail = (e) => { if (current?.ctx === ctx) { ctx.cleanup(); renderBoundary(main, id, e); } else console.error(e); };
  return ctx;
}

async function route() {
  const { id, params } = parseHash();
  const main = $('#main');
  document.body.classList.toggle('is-home', id === 'home');
  markCurrent();
  closeOverlay();

  if (current && current.id === id && current.mod.update) {
    try { current.ctx.params = params; await current.mod.update(params, current.ctx); return; }
    catch (e) { current.ctx.cleanup(); renderBoundary(main, id, e); return; }
  }
  if (current) { try { current.ctx.cleanup(); current.mod.unmount?.(); } catch (e) { console.error(e); } current = null; }
  main.className = 'main-inner'; main.innerHTML = '';
  contextSlot().innerHTML = '';
  const ctx = makeCtx(id, main, params);
  try {
    const mod = (await LOADERS[id]()).default;
    if (parseHash().id !== id) return; // navigated away while loading
    current = { id, mod, ctx };
    await mod.mount(main, ctx);
  } catch (e) {
    ctx.cleanup();
    renderBoundary(main, id, e);
  }
}

// Global Ctrl+K: notes command palette (search page titles and content).
addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !e.shiftKey) {
    e.preventDefault();
    import('./notes/palette.js').then(m => m.openSearchPalette()).catch(err => toast(err.message, 'error'));
  }
});
addEventListener('error', (e) => { if (e.message && !/ResizeObserver/.test(e.message)) toast(`Error: ${e.message}`, 'error'); });
addEventListener('unhandledrejection', (e) => { const m = e.reason?.message || String(e.reason); if (!/AbortError/.test(m)) toast(`Error: ${m}`, 'error'); });

initTheme();
initShell();
addEventListener('hashchange', route);
if (!location.hash) history.replaceState(null, '', '#/home');
route();
store.sync().then(async (r) => {
  if (r?.errors?.length) { toast(`Some data could not load: ${r.errors[0]}`, 'error'); return; } // don't seed against partial data
  const { applySeed } = await import('./core/seed.js');
  const { isConfigured } = await import('./core/github.js');
  const seeded = await applySeed().catch(e => { console.error(e); return null; });
  if (seeded?.total) toast(`Loaded ${seeded.total} records from the repo's data file. ${isConfigured() ? 'Click Save to store them in your GitHub data repo.' : 'Connect GitHub in Settings and click Save to sync them to other devices.'}`, 'success', 10000);
});

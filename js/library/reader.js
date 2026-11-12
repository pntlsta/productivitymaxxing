// Epub reader built on epub.js: pagination, TOC, typography settings, progress/resume,
// full-text search panel, bookmarks (Ctrl+B) and the selection toolbar.
import * as store from '../core/store.js';
import { esc, lsGet, lsSet, debounce, clamp, loadEpub } from '../core/util.js';
import { idbGet, idbPut } from '../core/idb.js';
import { icon } from '../core/icons.js';
import { token, onThemeChange } from '../core/theme.js';
import { toast, emptyState } from '../core/ui.js';
import { getIndex, search, highlightTerms, cfiForResult } from './search.js';
import { applyHighlights, flash, mountSelectionToolbar, snippetAt, bookmarksOf, deleteBookmark, editAnnotation } from './annotate.js';

const SKEY = 'wb.reader';
const settings = Object.assign({ size: 100, family: 'serif', lh: 1.6, margin: 48 }, lsGet(SKEY, {}));

function readerCss() {
  const fam = settings.family === 'serif' ? token('font-serif') : token('font-sans');
  return `html, body { color: ${token('text-primary')} !important; background: ${token('surface')} !important; }
    body { font-size: ${settings.size}% !important; }
    body, p, div, span, li, blockquote, td, th, dd, dt, h1, h2, h3, h4, h5, h6 { font-family: ${fam} !important; }
    p, li, blockquote, div, dd, td { line-height: ${settings.lh} !important; }
    a, a:link, a:visited { color: ${token('accent')} !important; }
    img, svg { max-width: 100% !important; }
    ::selection { background: ${token('accent-soft')}; }`;
}
function injectStyle(contents) {
  const doc = contents.document; if (!doc) return;
  let st = doc.getElementById('wb-reader-style');
  if (!st) { st = doc.createElement('style'); st.id = 'wb-reader-style'; (doc.head || doc.documentElement).appendChild(st); }
  st.textContent = readerCss();
}

function panelSettings() {
  return `<h2 class="panel-h">Text settings</h2>
    <div class="field"><label for="rs-size">Font size <output id="rs-size-v">${settings.size}%</output></label><input type="range" id="rs-size" min="70" max="200" step="5" value="${settings.size}"></div>
    <div class="field"><span class="field-label" id="rs-fam-l">Font family</span>
      <div class="seg" role="group" aria-labelledby="rs-fam-l"><button data-family="serif" aria-pressed="${settings.family === 'serif'}">Serif</button><button data-family="sans" aria-pressed="${settings.family === 'sans'}">Sans</button></div></div>
    <div class="field"><label for="rs-lh">Line height <output id="rs-lh-v">${settings.lh.toFixed(1)}</output></label><input type="range" id="rs-lh" min="1.1" max="2.4" step="0.1" value="${settings.lh}"></div>
    <div class="field"><label for="rs-margin">Page margin <output id="rs-margin-v">${settings.margin}px</output></label><input type="range" id="rs-margin" min="0" max="160" step="8" value="${settings.margin}"></div>`;
}

export async function mountReader(main, ctx, bookId) {
  const rec = store.get('book', bookId);
  main.className = 'main-inner full';
  if (!rec) { main.innerHTML = `<div class="main-inner">${emptyState('Book not found', 'It may have been removed.', '<a class="btn" href="#/library">Back to library</a>')}</div>`; return null; }
  const blob = await idbGet('books', bookId).catch(() => null);
  if (!blob) return mountMissing(main, ctx, rec);

  main.innerHTML = `<div class="reader">
    <header class="reader-bar">
      <a class="icon-btn" href="#/library" aria-label="Back to library">${icon('arrowL')}</a>
      <div class="rb-title"><span class="rb-book">${esc(rec.title)}</span><span class="rb-chapter" aria-live="polite"></span></div>
      <span class="rb-pct" aria-live="off"></span>
      <div class="btn-group" role="toolbar" aria-label="Reader tools">
        <button class="icon-btn" data-panel="toc" aria-label="Table of contents" aria-expanded="false">${icon('toc')}</button>
        <button class="icon-btn" data-panel="search" aria-label="Search book" aria-expanded="false">${icon('search')}</button>
        <button class="icon-btn" id="rb-mark" aria-label="Bookmark this page (Ctrl+B)" aria-pressed="false" title="Bookmark (Ctrl+B)">${icon('bookmark')}</button>
        <button class="icon-btn" data-panel="settings" aria-label="Text settings" aria-expanded="false">${icon('type')}</button>
      </div>
    </header>
    <div class="progress reader-progress" role="progressbar" aria-label="Reading progress" aria-valuemin="0" aria-valuemax="100"><span></span></div>
    <div class="reader-body">
      <button class="page-zone prev" aria-label="Previous page">${icon('chevL')}</button>
      <div class="viewer-wrap"><div class="viewer" id="viewer" aria-label="Book text"></div><div class="reader-loading">Opening book…</div></div>
      <button class="page-zone next" aria-label="Next page">${icon('chevR')}</button>
      <aside class="reader-panel" id="reader-panel" hidden aria-label="Reader panel"></aside>
    </div></div>`;
  const $ = (s) => main.querySelector(s);
  const viewerWrap = $('.viewer-wrap'), panel = $('#reader-panel');
  viewerWrap.style.padding = `0 ${settings.margin}px`;

  const ePub = await loadEpub();
  const book = ePub(await blob.arrayBuffer());
  await book.ready;
  const rendition = book.renderTo($('#viewer'), { width: '100%', height: '100%', flow: 'paginated', spread: 'none', allowScriptedContent: false });
  ctx.onCleanup(() => { try { rendition.destroy(); book.destroy(); } catch {} });
  rendition.hooks.content.register(injectStyle);

  // ----- TOC / chapter lookup -----
  const nav = await book.loaded.navigation;
  const flat = []; const walk = (items, depth) => items.forEach(it => { flat.push({ ...it, depth }); if (it.subitems?.length) walk(it.subitems, depth + 1); }); walk(nav.toc || [], 0);
  const labelBySection = new Map();
  flat.forEach(it => { const s = book.spine.get(it.href); if (s && !labelBySection.has(s.index)) labelBySection.set(s.index, it.label.trim()); });
  const sectionLabel = (sec) => { for (let i = sec.index; i >= 0; i--) if (labelBySection.has(i)) return labelBySection.get(i); return rec.title; };
  const chapterOf = (cfi) => { const s = book.spine.get(cfi); return s ? sectionLabel(s) : ''; };
  const percentOf = (cfi) => { try { return book.locations.length() ? book.locations.percentageFromCfi(cfi) : null; } catch { return null; } };
  const cmp = (a, b) => new ePub.CFI().compare(a, b);

  // ----- progress -----
  let loc = null;
  const saveProgress = debounce(() => {
    const cur = store.get('book', bookId); if (!cur || !loc) return;
    const p = percentOf(loc.start.cfi);
    if (cur.lastCfi !== loc.start.cfi) store.update('book', bookId, { lastCfi: loc.start.cfi, progress: p ?? cur.progress ?? 0, openedAt: new Date().toISOString() });
  }, 1500);
  ctx.onCleanup(() => saveProgress.flush());
  const updateBar = () => {
    if (!loc) return;
    $('.rb-chapter').textContent = chapterOf(loc.start.cfi);
    const p = percentOf(loc.start.cfi);
    $('.rb-pct').textContent = p == null ? '…' : `${Math.round(p * 100)}%`;
    $('.reader-progress span').style.width = `${(p || 0) * 100}%`;
    $('.reader-progress').setAttribute('aria-valuenow', Math.round((p || 0) * 100));
    const marked = bookmarksOf(bookId).some(m => { try { return cmp(m.cfi, loc.start.cfi) >= 0 && cmp(m.cfi, loc.end.cfi) <= 0; } catch { return false; } });
    $('#rb-mark').setAttribute('aria-pressed', String(marked));
  };
  rendition.on('relocated', (l) => { loc = l; updateBar(); saveProgress(); });

  // ----- display + resume -----
  try { await rendition.display(rec.lastCfi || undefined); } catch (e) { console.warn('resume failed', e); await rendition.display(); }
  $('.reader-loading').remove();
  applyHighlights(rendition, bookId, (id) => editAnnotation(id));
  idbGet('locations', bookId).then(async (saved) => {
    if (saved) book.locations.load(saved);
    else { await book.locations.generate(1200); idbPut('locations', bookId, book.locations.save()).catch(() => {}); }
    updateBar(); saveProgress();
  }).catch(e => console.warn('locations failed', e));

  // ----- navigation -----
  const prev = () => rendition.prev(), next = () => rendition.next();
  const toggleBookmark = async () => {
    if (!loc) return;
    const existing = bookmarksOf(bookId).find(m => { try { return cmp(m.cfi, loc.start.cfi) >= 0 && cmp(m.cfi, loc.end.cfi) <= 0; } catch { return false; } });
    if (existing) { await deleteBookmark(existing.id); updateBar(); return; }
    const cfi = loc.start.cfi;
    store.create('bookmark', { bookId, cfi, chapter: chapterOf(cfi), snippet: snippetAt(rendition, cfi), percent: percentOf(cfi) });
    toast('Bookmarked (queued).', 'success'); updateBar();
  };
  const onKey = (e) => {
    if (e.target.closest?.('input, textarea, select, [contenteditable="true"], dialog')) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); toggleBookmark(); }
  };
  ctx.listen(document, 'keydown', onKey);
  rendition.on('keydown', onKey);
  rendition.on('click', (e) => { // click zones inside the page: outer quarter of the text area
    const sel = e.view?.getSelection?.(); if (sel && !sel.isCollapsed) return;
    if (e.target.closest?.('a')) return;
    // clientX is relative to the (wide, scrolled) iframe; convert to a position within the visible page.
    const w = viewerWrap.clientWidth;
    const rx = e.clientX + e.view.frameElement.getBoundingClientRect().left - viewerWrap.getBoundingClientRect().left;
    if (rx < w * 0.2) prev(); else if (rx > w * 0.8) next();
  });
  ctx.listen($('.page-zone.prev'), 'click', prev);
  ctx.listen($('.page-zone.next'), 'click', next);
  ctx.listen($('#rb-mark'), 'click', toggleBookmark);
  const ro = new ResizeObserver(debounce(() => { try { rendition.resize(); } catch {} }, 150));
  ro.observe(viewerWrap); ctx.onCleanup(() => ro.disconnect());

  // ----- panels -----
  let open = null, index = null, lastQuery = '';
  const restyle = async () => {
    lsSet(SKEY, settings);
    viewerWrap.style.padding = `0 ${settings.margin}px`;
    const at = loc?.start.cfi;
    rendition.getContents().forEach(injectStyle);
    rendition.resize();
    if (at) await rendition.display(at);
  };
  const renderPanel = () => {
    main.querySelectorAll('[data-panel]').forEach(b => b.setAttribute('aria-expanded', String(b.dataset.panel === open)));
    panel.hidden = !open;
    if (open === 'toc') {
      panel.innerHTML = `<h2 class="panel-h">Contents</h2>${flat.length ? `<ul class="toc-list">${flat.map(it => `<li><button class="ctx-item" style="padding-left:${0.5 + it.depth}rem" data-href="${esc(it.href)}"><span class="label">${esc(it.label.trim())}</span></button></li>`).join('')}</ul>` : '<p class="ctx-empty">This book has no table of contents.</p>'}`;
    } else if (open === 'settings') panel.innerHTML = panelSettings();
    else if (open === 'search') {
      panel.innerHTML = `<h2 class="panel-h">Search this book</h2>
        <form id="rs-form" role="search"><label class="sr-only" for="rs-q">Search text</label>
          <input class="input" id="rs-q" type="search" placeholder='Words, or "an exact phrase"' value="${esc(lastQuery)}" autocomplete="off"></form>
        <p class="small muted" id="rs-info" aria-live="polite">${index ? '' : 'The first search indexes the whole book.'}</p><ul class="search-results" id="rs-results"></ul>`;
      panel.querySelector('#rs-q').focus();
      if (lastQuery && index) runSearch(lastQuery);
    }
    setTimeout(() => { try { rendition.resize(); } catch {} }, 0);
  };
  const runSearch = async (q) => {
    lastQuery = q;
    const info = panel.querySelector('#rs-info'), list = panel.querySelector('#rs-results');
    if (!q.trim()) { list.innerHTML = ''; info.textContent = ''; return; }
    if (!index) index = await getIndex(book, bookId, sectionLabel, (i, n) => { if (info.isConnected) info.textContent = `Indexing chapter ${i + 1} of ${n}…`; });
    const res = search(index, q);
    if (!info.isConnected) return;
    info.textContent = res.length ? `${res.length}${res.length >= 300 ? '+' : ''} matching sentence${res.length === 1 ? '' : 's'}` : 'No matches. Check spelling, or drop the quotes for a looser match.';
    list.innerHTML = res.map((r, i) => `<li><button class="search-hit" data-hit="${i}"><span class="hit-text">${highlightTerms(r.sentence.length > 260 ? r.sentence.slice(0, 260) + '…' : r.sentence, r.terms)}</span>
      <span class="hit-meta">${esc(r.label)} · ${Math.round(r.percent * 100)}%</span></button></li>`).join('');
    list._results = res;
  };
  ctx.listen(main, 'click', async (e) => {
    const pb = e.target.closest('[data-panel]');
    if (pb) { open = open === pb.dataset.panel ? null : pb.dataset.panel; renderPanel(); return; }
    const h = e.target.closest('[data-href]');
    if (h) { await rendition.display(h.dataset.href); return; }
    const f = e.target.closest('[data-family]');
    if (f) { settings.family = f.dataset.family; panel.querySelectorAll('[data-family]').forEach(b => b.setAttribute('aria-pressed', String(b === f))); restyle(); return; }
    const hit = e.target.closest('[data-hit]');
    if (hit) {
      const r = panel.querySelector('#rs-results')._results[+hit.dataset.hit];
      const cfi = await cfiForResult(book, r).catch(() => null);
      await rendition.display(cfi || r.href);
      if (cfi) flash(rendition, cfi);
    }
  });
  const restyleSoon = debounce(restyle, 250);
  ctx.listen(main, 'input', (e) => {
    const id = e.target.id; const v = Number(e.target.value);
    if (id === 'rs-size') { settings.size = clamp(v, 70, 200); main.querySelector('#rs-size-v').textContent = `${v}%`; restyleSoon(); }
    if (id === 'rs-lh') { settings.lh = clamp(v, 1.1, 2.4); main.querySelector('#rs-lh-v').textContent = v.toFixed(1); restyleSoon(); }
    if (id === 'rs-margin') { settings.margin = clamp(v, 0, 160); main.querySelector('#rs-margin-v').textContent = `${v}px`; restyleSoon(); }
  });
  ctx.listen(main, 'submit', (e) => { if (e.target.id === 'rs-form') { e.preventDefault(); runSearch(main.querySelector('#rs-q').value); } });

  mountSelectionToolbar({ rendition, host: $('.reader-body'), bookId, chapterOf, percentOf, ctx });
  ctx.onCleanup(onThemeChange(() => { rendition.getContents().forEach(injectStyle); applyHighlights(rendition, bookId, (id) => editAnnotation(id)); }));
  store.update('book', bookId, { openedAt: new Date().toISOString() });

  return {
    jump: async (cfi) => { await rendition.display(cfi); },
    refresh: (type) => { if (type === 'annotation') applyHighlights(rendition, bookId, (id) => editAnnotation(id)); if (type === 'bookmark') updateBar(); },
  };
}

function mountMissing(main, ctx, rec) {
  main.innerHTML = `<div class="main-inner">${emptyState('This book’s file is not on this device',
    `"${rec.title}" syncs its title, progress and notes through GitHub, but the epub file itself lives only in the browser where it was uploaded. Choose the same .epub file to read it here.`,
    `<label class="btn btn-primary" tabindex="0" role="button">Choose .epub file<input type="file" accept=".epub,application/epub+zip" hidden id="reattach"></label> <a class="btn" href="#/library">Back</a>`)}</div>`;
  ctx.listen(main.querySelector('#reattach'), 'change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    await idbPut('books', rec.id, new Blob([await f.arrayBuffer()], { type: 'application/epub+zip' }));
    toast('File attached.', 'success');
    location.reload();
  });
  return null;
}

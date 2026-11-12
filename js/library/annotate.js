// Bookmarks and annotations (highlights + notes) for the epub reader.
import * as store from '../core/store.js';
import { esc, fmtLong, isoDate, downloadText } from '../core/util.js';
import { icon } from '../core/icons.js';
import { token } from '../core/theme.js';
import { formDialog, confirmDialog, toast } from '../core/ui.js';

export const HL_COLORS = ['yellow', 'green', 'blue', 'pink'];
export const bookmarksOf = (bookId) => store.where('bookmark', m => m.bookId === bookId).sort((a, b) => (a.percent ?? 0) - (b.percent ?? 0));
export const annotationsOf = (bookId) => store.where('annotation', a => a.bookId === bookId).sort((a, b) => (a.percent ?? 0) - (b.percent ?? 0));

/** Up to `n` characters of text starting at a CFI on the current page. */
export function snippetAt(rendition, cfi, n = 140) {
  try {
    const range = rendition.getRange(cfi);
    if (!range) return '';
    const doc = range.startContainer.ownerDocument;
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    let node = range.startContainer.nodeType === 3 ? range.startContainer : null;
    if (!node) { walker.currentNode = range.startContainer; node = walker.nextNode(); } else walker.currentNode = node;
    let out = node ? node.nodeValue.slice(node === range.startContainer ? range.startOffset : 0) : '';
    while (out.replace(/\s+/g, ' ').trim().length < n) { const nx = walker.nextNode(); if (!nx) break; out += ' ' + nx.nodeValue; }
    out = out.replace(/\s+/g, ' ').trim();
    return out.length > n ? out.slice(0, n - 1) + '…' : out;
  } catch { return ''; }
}

// ---------- highlights in the rendition ----------
const applied = new Map(); // annotation id -> cfiRange
export function applyHighlights(rendition, bookId, onClick) {
  for (const cfi of applied.values()) { try { rendition.annotations.remove(cfi, 'highlight'); } catch {} }
  applied.clear();
  for (const a of annotationsOf(bookId)) {
    try {
      rendition.annotations.highlight(a.cfiRange, { id: a.id }, () => onClick(a.id), 'wb-hl',
        { fill: token(`hl-${a.color || 'yellow'}`), 'fill-opacity': '0.4', 'mix-blend-mode': document.documentElement.dataset.theme === 'dark' ? 'screen' : 'multiply' });
      applied.set(a.id, a.cfiRange);
    } catch (e) { console.warn('highlight failed', e); }
  }
}
export function flash(rendition, cfi) {
  try {
    rendition.annotations.highlight(cfi, {}, null, 'wb-flash', { fill: token('search-flash'), 'fill-opacity': '0.55' });
    setTimeout(() => { try { rendition.annotations.remove(cfi, 'highlight'); } catch {} }, 2400);
  } catch (e) { console.warn('flash failed', e); }
}

// ---------- selection toolbar ----------
export function mountSelectionToolbar({ rendition, host, bookId, chapterOf, percentOf, ctx }) {
  const bar = document.createElement('div');
  bar.className = 'sel-toolbar'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Highlight selection'); bar.hidden = true;
  bar.innerHTML = HL_COLORS.map(c => `<button class="swatch hl-${c}" data-color="${c}" aria-label="Highlight ${c}" title="Highlight ${c}"></button>`).join('') +
    `<span class="sep"></span><button class="btn btn-sm btn-ghost" data-note>${icon('note')} Add Note</button>`;
  host.appendChild(bar);
  let current = null; // {cfiRange, text, contents}
  const hide = () => { bar.hidden = true; current = null; };
  rendition.on('selected', (cfiRange, contents) => {
    const sel = contents.window.getSelection();
    if (!sel || sel.isCollapsed) return hide();
    const r = sel.getRangeAt(0).getBoundingClientRect();
    const fr = contents.document.defaultView.frameElement.getBoundingClientRect();
    const hr = host.getBoundingClientRect();
    current = { cfiRange, text: sel.toString().replace(/\s+/g, ' ').trim(), contents };
    bar.hidden = false;
    const bw = bar.offsetWidth;
    let x = fr.left + r.left + r.width / 2 - hr.left - bw / 2;
    x = Math.max(8, Math.min(x, hr.width - bw - 8));
    let y = fr.top + r.top - hr.top - bar.offsetHeight - 8;
    if (y < 8) y = fr.top + r.bottom - hr.top + 8;
    bar.style.left = `${x}px`; bar.style.top = `${y}px`;
  });
  const create = (color, note = '') => {
    if (!current) return;
    const a = store.create('annotation', { bookId, cfiRange: current.cfiRange, color, note, text: current.text.slice(0, 1000), chapter: chapterOf(current.cfiRange), percent: percentOf(current.cfiRange) });
    current.contents.window.getSelection().removeAllRanges();
    hide();
    toast(note ? 'Note added (queued).' : 'Highlighted (queued).', 'success');
    return a;
  };
  ctx.listen(bar, 'mousedown', (e) => e.preventDefault()); // keep the iframe selection
  ctx.listen(bar, 'click', async (e) => {
    const sw = e.target.closest('[data-color]');
    if (sw) { create(sw.dataset.color); return; }
    if (e.target.closest('[data-note]') && current) {
      const keep = current;
      const v = await formDialog({ title: 'Add note', intro: `“${keep.text.slice(0, 160)}${keep.text.length > 160 ? '…' : ''}”`, submitText: 'Add note', fields: [
        { name: 'note', label: 'Note', type: 'textarea', required: true, rows: 5 },
        { name: 'color', label: 'Highlight color', type: 'select', value: 'yellow', options: HL_COLORS.map(c => ({ value: c, label: c[0].toUpperCase() + c.slice(1) })) },
      ] });
      if (v) { current = keep; create(v.color, v.note); }
    }
  });
  rendition.on('relocated', hide);
  rendition.on('click', () => { setTimeout(() => { if (current && current.contents.window.getSelection().isCollapsed) hide(); }, 0); });
  ctx.listen(document, 'keydown', (e) => { if (e.key === 'Escape') hide(); });
  return { hide };
}

export async function editAnnotation(id) {
  const a = store.get('annotation', id); if (!a) return;
  const v = await formDialog({ title: 'Highlight', intro: `“${a.text.slice(0, 200)}${a.text.length > 200 ? '…' : ''}”`, fields: [
    { name: 'note', label: 'Note', type: 'textarea', rows: 5, value: a.note || '' },
    { name: 'color', label: 'Color', type: 'select', value: a.color, options: HL_COLORS.map(c => ({ value: c, label: c[0].toUpperCase() + c.slice(1) })) },
  ] });
  if (v) store.update('annotation', id, v);
}
export async function deleteAnnotation(id) {
  const a = store.get('annotation', id); if (!a) return;
  if (await confirmDialog({ title: 'Delete highlight?', message: `Delete this ${a.note ? 'note' : 'highlight'}? You can restore it from Settings.` })) { store.remove('annotation', id); toast('Highlight deleted (queued).'); }
}
export async function deleteBookmark(id) {
  const m = store.get('bookmark', id); if (!m) return;
  if (await confirmDialog({ title: 'Delete bookmark?', message: `Delete the bookmark in "${m.chapter || 'this book'}"?` })) { store.remove('bookmark', id); toast('Bookmark deleted (queued).'); }
}

// ---------- sidebar sections ----------
export function sidebarSections(bookId) {
  const marks = bookmarksOf(bookId), anns = annotationsOf(bookId);
  return `
    <div class="ctx-section"><div class="ctx-head"><h2 class="ctx-title">Bookmarks</h2><span class="meta small muted">Ctrl+B</span></div>
      ${marks.length ? `<ul class="ctx-list mark-list">${marks.map(m => `<li class="swipe-row" data-mark="${m.id}">
        <button class="ctx-item mark-item" data-jump="${esc(m.cfi)}">${icon('bookmark')}<span class="label"><strong>${esc(m.chapter || 'Bookmark')}</strong>
          <span class="snip">${esc(m.snippet || '')}</span><span class="meta">${fmtLong(isoDate(new Date(m.createdAt)))}${m.percent != null ? ` · ${Math.round(m.percent * 100)}%` : ''}</span></span></button>
        <button class="icon-btn btn-sm row-del" data-del-mark="${m.id}" aria-label="Delete bookmark">${icon('trash')}</button></li>`).join('')}</ul>`
        : '<p class="ctx-empty">No bookmarks. Press Ctrl+B or the bookmark button to save this page.</p>'}
    </div>
    <div class="ctx-section"><div class="ctx-head"><h2 class="ctx-title">Highlights &amp; notes</h2>
      ${anns.length ? `<button class="icon-btn btn-sm" data-export aria-label="Export highlights and notes as markdown" title="Export as markdown">${icon('download')}</button>` : ''}</div>
      ${anns.length ? `<ul class="ctx-list mark-list">${anns.map(a => `<li class="swipe-row" data-ann="${a.id}">
        <button class="ctx-item mark-item" data-jump="${esc(a.cfiRange)}"><span class="dot hl-dot hl-${a.color}" aria-label="${a.color} highlight"></span><span class="label">
          <span class="snip">“${esc(a.text.slice(0, 120))}${a.text.length > 120 ? '…' : ''}”</span>
          ${a.note ? `<span class="ann-note">${icon('note')} ${esc(a.note)}</span>` : ''}
          <span class="meta">${esc(a.chapter || '')}</span></span></button>
        <button class="icon-btn btn-sm row-del" data-edit-ann="${a.id}" aria-label="Edit note">${icon('edit')}</button>
        <button class="icon-btn btn-sm row-del" data-del-ann="${a.id}" aria-label="Delete highlight">${icon('trash')}</button></li>`).join('')}</ul>`
        : '<p class="ctx-empty">Select text in the book to highlight it or add a note.</p>'}
    </div>`;
}

export function exportMarkdown(bookId) {
  const b = store.get('book', bookId); const anns = annotationsOf(bookId); const marks = bookmarksOf(bookId);
  let md = `# ${b?.title || 'Book'}\n\n${b?.author ? `*${b.author}*\n\n` : ''}Exported ${fmtLong(isoDate())}\n\n## Highlights and notes\n\n`;
  let lastCh = null;
  for (const a of anns) {
    if (a.chapter !== lastCh) { md += `### ${a.chapter || 'Untitled section'}\n\n`; lastCh = a.chapter; }
    md += `> ${a.text.replace(/\n/g, '\n> ')}\n\n`;
    if (a.note) md += `**Note:** ${a.note}\n\n`;
    md += `<sub>${a.color} highlight${a.percent != null ? ` · ${Math.round(a.percent * 100)}%` : ''}</sub>\n\n`;
  }
  if (!anns.length) md += '_No highlights._\n\n';
  if (marks.length) md += `## Bookmarks\n\n${marks.map(m => `- **${m.chapter || 'Bookmark'}**${m.percent != null ? ` (${Math.round(m.percent * 100)}%)` : ''}: ${m.snippet || ''}`).join('\n')}\n`;
  const name = (b?.title || 'book').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'book';
  downloadText(`${name}-notes.md`, md);
  return md;
}

/** Swipe-left (touch) on a row asks to delete it. */
export function bindSwipeDelete(root, ctx, onDelete) {
  let sx = 0, sy = 0, row = null;
  ctx.listen(root, 'touchstart', (e) => { row = e.target.closest('.swipe-row'); if (!row) return; sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  ctx.listen(root, 'touchmove', (e) => { if (!row) return; const dx = e.touches[0].clientX - sx; if (Math.abs(dx) > Math.abs(e.touches[0].clientY - sy)) row.style.transform = `translateX(${Math.min(0, dx)}px)`; }, { passive: true });
  ctx.listen(root, 'touchend', (e) => {
    if (!row) return; const dx = e.changedTouches[0].clientX - sx; row.style.transform = '';
    if (dx < -70) onDelete(row); row = null;
  });
}

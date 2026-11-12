// Block editor: renders blocks and implements editing behavior (Enter/Backspace/Tab, markdown
// shortcuts, "/" menu, "[[" links, drag reorder, images in IndexedDB, tables, code blocks).
import { uuid } from '../core/util.js';
import { idbPut, blobUrl } from '../core/idb.js';
import { toast } from '../core/ui.js';
import { renderBlock, newBlock, convertBlock, highlight, TEXTUAL, LISTS } from './blocks.js';
import { caretOffset, setCaret, caretAtEnd, caretRect, extractAfterCaret, cleanHTML, rangeFromOffsets, selectionCollapsed } from './caret.js';
import { createSlashMenu } from './slash.js';

const SHORTCUTS = [
  [/^#\s$/, 'h1'], [/^##\s$/, 'h2'], [/^###\s$/, 'h3'], [/^[-*]\s$/, 'bullet'], [/^1[.)]\s$/, 'numbered'],
  [/^\[\s?\]\s$/, 'todo'], [/^>\s$/, 'quote'], [/^```\s$/, 'code'], [/^---$/, 'divider'],
];
const EMOJIS = ['💡', '⚠️', '✅', '📌', '❗', 'ℹ️', '🔥', '📝'];

export function createEditor(root, initialBlocks, opts) {
  let blocks = JSON.parse(JSON.stringify(initialBlocks?.length ? initialBlocks : [newBlock('text')]));
  const find = (id) => blocks.find(b => b.id === id);
  const idx = (id) => blocks.findIndex(b => b.id === id);
  const changed = () => opts.onChange(blocks);
  let slash = null; // {id, start}
  const menu = createSlashMenu((type) => pickSlash(type));

  // ---------- render / focus ----------
  function render(focus) {
    root.innerHTML = blocks.map((b, i) => renderBlock(b, blocks, i)).join('');
    root.querySelectorAll('img[data-img]').forEach(async (img) => { const u = await blobUrl('images', img.dataset.img); if (u) img.src = u; else img.alt = 'Image not on this device'; });
    refreshLinks();
    if (focus) focusBlock(focus.id, focus.pos);
  }
  function refreshLinks() {
    root.querySelectorAll('a.page-link').forEach(a => { const t = opts.pageTitle(a.dataset.page); a.textContent = t ?? 'Missing page'; a.classList.toggle('missing', t == null); });
  }
  function focusBlock(id, pos = 'end') {
    const el = root.querySelector(`.blk[data-id="${id}"]`); if (!el) return;
    const t = el.querySelector('.blk-text, .code-edit, td, .img-drop, .blk-divider, .img-caption');
    if (!t) return;
    if (t.isContentEditable) setCaret(t, pos);
    else { t.focus(); if (t.classList.contains('code-edit')) { const p = pos === 'start' ? 0 : t.value.length; t.setSelectionRange(p, p); } }
  }
  const blockEl = (node) => node?.closest?.('.blk');
  const modelOf = (node) => find(blockEl(node)?.dataset.id);
  function insertAfter(id, b) { blocks.splice(idx(id) + 1, 0, b); }
  function removeBlock(id) { blocks.splice(idx(id), 1); if (!blocks.length) blocks.push(newBlock('text')); }
  function prevTextual(i) { for (let j = i - 1; j >= 0; j--) if (TEXTUAL.has(blocks[j].type)) return blocks[j]; return null; }

  // ---------- slash menu ----------
  function pickSlash(type) {
    if (!slash) return;
    const b = find(slash.id); const el = root.querySelector(`.blk[data-id="${slash.id}"] .blk-text`);
    menu.hide();
    if (b && el) {
      const end = Math.max(caretOffset(el), slash.start + 1);
      const r = rangeFromOffsets(el, slash.start, end); r.deleteContents();
      b.html = cleanHTML(el.innerHTML);
    }
    slash = null;
    if (!b) return;
    let target;
    if (!b.html && b.type !== 'toggle') { const nb = convertBlock(b, type); blocks[idx(b.id)] = nb; target = nb; }
    else { target = newBlock(type); insertAfter(b.id, target); }
    if (type === 'divider') { const t = newBlock('text'); insertAfter(target.id, t); render({ id: t.id, pos: 'start' }); }
    else render({ id: target.id, pos: 'end' });
    if (type === 'image') root.querySelector(`.blk[data-id="${target.id}"] .img-input`)?.click();
    changed();
  }

  // ---------- [[ links ----------
  async function startLink(el, b) {
    const at = caretOffset(el);
    const page = await opts.pickPage();
    if (!el.isConnected) return;
    if (!page) { setCaret(el, at); return; }
    const r = rangeFromOffsets(el, Math.max(0, at - 2), at);
    if (r.toString() !== '[[') { r.setStart(r.endContainer, r.endOffset); }
    r.deleteContents();
    const a = document.createElement('a');
    a.className = 'page-link'; a.dataset.page = page.id; a.href = `#/notes/${page.id}`; a.contentEditable = 'false'; a.textContent = page.title || 'Untitled';
    const space = document.createTextNode(' ');
    r.insertNode(space); r.insertNode(a);
    const sel = getSelection(); const c = document.createRange(); c.setStartAfter(space); c.collapse(true); sel.removeAllRanges(); sel.addRange(c);
    el.focus();
    b.html = cleanHTML(el.innerHTML); changed();
  }

  // ---------- input ----------
  root.addEventListener('input', (e) => {
    const t = e.target; const b = modelOf(t); if (!b) return;
    if (t.classList.contains('blk-text')) {
      b.html = cleanHTML(t.innerHTML);
      const text = t.textContent.replace(/ /g, ' ');
      // markdown shortcuts (only on plain text blocks, prefix right before the caret)
      if (b.type === 'text' && e.inputType === 'insertText') {
        const off = caretOffset(t);
        for (const [re, type] of SHORTCUTS) {
          const pre = text.slice(0, off);
          if (re.test(pre)) {
            rangeFromOffsets(t, 0, off).deleteContents();
            const nb = convertBlock({ ...b, html: cleanHTML(t.innerHTML) }, type);
            blocks[idx(b.id)] = nb;
            if (type === 'divider') { const nt = newBlock('text', { html: nb.html || '' }); delete nb.html; insertAfter(nb.id, nt); render({ id: nt.id, pos: 'start' }); }
            else render({ id: nb.id, pos: 'start' });
            changed(); return;
          }
        }
      }
      if (e.inputType === 'insertText' && e.data === '/') {
        const off = caretOffset(t);
        const before = text[off - 2];
        if (off === 1 || before === ' ' || before === undefined) { slash = { id: b.id, start: off - 1 }; menu.show(caretRect() || t.getBoundingClientRect(), ''); t.setAttribute('aria-controls', 'slash-menu'); }
      } else if (slash && slash.id === b.id) {
        const off = caretOffset(t);
        const q = text.slice(slash.start + 1, off);
        if (off <= slash.start || text[slash.start] !== '/' || /\s/.test(q) || q.length > 20) { menu.hide(); slash = null; }
        else menu.filter(q);
      }
      if (e.inputType === 'insertText' && e.data === '[') {
        const off = caretOffset(t);
        if (text.slice(off - 2, off) === '[[') startLink(t, b);
      }
    } else if (t.classList.contains('toggle-body')) b.body = cleanHTML(t.innerHTML);
    else if (t.classList.contains('img-caption')) b.caption = t.textContent;
    else if (t.tagName === 'TD') b.rows[+t.dataset.r][+t.dataset.c] = cleanHTML(t.innerHTML);
    else if (t.classList.contains('code-edit')) {
      b.code = t.value; t.rows = Math.max(1, t.value.split('\n').length);
      t.parentElement.querySelector('.code-hl code').innerHTML = highlight(b.code, b.lang) + '\n';
    }
    changed();
  });

  root.addEventListener('change', async (e) => {
    const t = e.target; const b = modelOf(t); if (!b) return;
    if (t.classList.contains('todo-check')) { b.checked = t.checked; t.nextElementSibling?.classList.toggle('checked', t.checked); changed(); }
    if (t.classList.contains('code-lang')) { b.lang = t.value; const area = blockEl(t).querySelector('.code-area'); area.querySelector('.code-hl code').innerHTML = highlight(b.code, b.lang) + '\n'; changed(); }
    if (t.classList.contains('img-input') && t.files[0]) await attachImage(b, t.files[0]);
  });

  async function attachImage(b, file) {
    if (!file.type.startsWith('image/')) { toast('That file is not an image.', 'error'); return; }
    const key = uuid();
    try { await idbPut('images', key, file); } catch (e) { toast(`Could not store image: ${e.message}`, 'error'); return; }
    if (b.type !== 'image') { const nb = newBlock('image', { imageKey: key }); insertAfter(b.id, nb); }
    else b.imageKey = key;
    render(); changed();
  }

  root.addEventListener('click', (e) => {
    const t = e.target; const b = modelOf(t);
    const link = t.closest('a.page-link');
    if (link) { e.preventDefault(); location.hash = `#/notes/${link.dataset.page}`; return; }
    if (!b) return;
    if (t.closest('.twisty')) { b.open = !b.open; render(); root.querySelector(`.blk[data-id="${b.id}"] .twisty`)?.focus(); changed(); }
    else if (t.closest('.callout-emoji')) { b.emoji = EMOJIS[(EMOJIS.indexOf(b.emoji) + 1) % EMOJIS.length]; t.closest('.callout-emoji').textContent = b.emoji; changed(); }
    else if (t.closest('[data-tbl]')) {
      const op = t.closest('[data-tbl]').dataset.tbl;
      if (op === 'row+') b.rows.push(b.rows[0].map(() => ''));
      if (op === 'col+') b.rows.forEach(r => r.push(''));
      if (op === 'row-' && b.rows.length > 1) b.rows.pop();
      if (op === 'col-' && b.rows[0].length > 1) b.rows.forEach(r => r.pop());
      render(); changed();
    }
  });

  // ---------- keyboard ----------
  root.addEventListener('keydown', (e) => {
    const t = e.target; const b = modelOf(t); if (!b) return;
    if (menu.open && slash) {
      if (e.key === 'ArrowDown') { e.preventDefault(); menu.move(1); t.setAttribute('aria-activedescendant', menu.activeId() || ''); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); menu.move(-1); t.setAttribute('aria-activedescendant', menu.activeId() || ''); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); const ty = menu.current(); if (ty) pickSlash(ty); else { menu.hide(); slash = null; } return; }
      if (e.key === 'Escape') { e.preventDefault(); menu.hide(); slash = null; return; }
    }
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { // keyboard reorder
      e.preventDefault(); const i = idx(b.id), j = i + (e.key === 'ArrowUp' ? -1 : 1);
      if (j < 0 || j >= blocks.length) return;
      [blocks[i], blocks[j]] = [blocks[j], blocks[i]]; render({ id: b.id, pos: caretOffset(t) }); changed(); return;
    }
    if (t.classList.contains('code-edit')) {
      if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); t.setRangeText('  ', t.selectionStart, t.selectionEnd, 'end'); t.dispatchEvent(new Event('input', { bubbles: true })); }
      else if (e.key === 'Backspace' && !t.value) { e.preventDefault(); blocks[idx(b.id)] = convertBlock(b, 'text'); render({ id: b.id, pos: 'start' }); changed(); }
      else if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); const nb = newBlock('text'); insertAfter(b.id, nb); render({ id: nb.id }); changed(); }
      return;
    }
    if (t.classList.contains('blk-divider')) {
      if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); const p = prevTextual(idx(b.id)); removeBlock(b.id); render(p ? { id: p.id } : { id: blocks[0].id }); changed(); }
      else if (e.key === 'Enter') { e.preventDefault(); const nb = newBlock('text'); insertAfter(b.id, nb); render({ id: nb.id }); changed(); }
      return;
    }
    if (!t.classList.contains('blk-text')) return;
    const i = idx(b.id);

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (LISTS.has(b.type) && !t.textContent.trim()) { // empty list item: outdent, then leave the list
        if (b.indent > 0) b.indent--; else blocks[i] = convertBlock(b, 'text');
        render({ id: b.id, pos: 'start' }); changed(); return;
      }
      const after = extractAfterCaret(t);
      b.html = cleanHTML(t.innerHTML);
      const type = LISTS.has(b.type) ? b.type : 'text';
      const nb = newBlock(type, { html: after });
      if (LISTS.has(type)) nb.indent = b.indent || 0;
      if (b.type === 'toggle' && !after) { b.open = true; }
      insertAfter(b.id, nb); render({ id: nb.id, pos: 'start' }); changed(); return;
    }
    if (e.key === 'Backspace' && selectionCollapsed() && caretOffset(t) === 0) {
      e.preventDefault();
      if (b.type !== 'text') { // first backspace strips the block type
        if (LISTS.has(b.type) && b.indent > 0) b.indent--; else blocks[i] = convertBlock(b, 'text');
        render({ id: b.id, pos: 'start' }); changed(); return;
      }
      const prev = blocks[i - 1];
      if (!prev) return;
      if (!TEXTUAL.has(prev.type)) {
        if (!t.textContent) { removeBlock(b.id); render({ id: prev.id }); }
        else if (prev.type === 'divider') { removeBlock(prev.id); render({ id: b.id, pos: 'start' }); }
        else { focusBlock(prev.id); return; }
        changed(); return;
      }
      const at = prev.html ? (() => { const d = document.createElement('div'); d.innerHTML = prev.html; return d.textContent.length; })() : 0;
      prev.html = cleanHTML((prev.html || '') + (b.html || ''));
      removeBlock(b.id); render({ id: prev.id, pos: at }); changed(); return;
    }
    if (e.key === 'Tab' && LISTS.has(b.type)) {
      e.preventDefault();
      const prevIndent = LISTS.has(blocks[i - 1]?.type) ? (blocks[i - 1].indent || 0) : -1;
      const off = caretOffset(t);
      if (e.shiftKey) { if (!b.indent) return; b.indent--; }
      else { if ((b.indent || 0) > prevIndent || b.indent >= 6) return; b.indent = (b.indent || 0) + 1; }
      render({ id: b.id, pos: off }); changed(); return;
    }
    if (e.key === 'ArrowUp' && caretOffset(t) === 0 && i > 0) { e.preventDefault(); focusBlock(blocks[i - 1].id, 'end'); return; }
    if (e.key === 'ArrowDown' && caretAtEnd(t) && i < blocks.length - 1) { e.preventDefault(); focusBlock(blocks[i + 1].id, 'start'); return; }
  });

  root.addEventListener('paste', async (e) => {
    const t = e.target; const b = modelOf(t); if (!b) return;
    const file = [...(e.clipboardData?.files || [])].find(f => f.type.startsWith('image/'));
    if (file) { e.preventDefault(); await attachImage(b, file); return; }
    if (t.isContentEditable) { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); }
  });
  root.addEventListener('focusout', (e) => { if (slash && !root.contains(e.relatedTarget)) { menu.hide(); slash = null; } });

  // ---------- drag reorder ----------
  let dragId = null;
  root.addEventListener('dragstart', (e) => {
    const h = e.target.closest?.('.blk-handle'); if (!h) return;
    dragId = blockEl(h).dataset.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/x-wb-block', dragId);
    e.dataTransfer.setDragImage(blockEl(h), 10, 10); blockEl(h).classList.add('dragging');
  });
  const clearMarks = () => root.querySelectorAll('.drop-before, .drop-after, .dragging').forEach(x => x.classList.remove('drop-before', 'drop-after', 'dragging'));
  root.addEventListener('dragover', (e) => {
    const el = blockEl(e.target); if (!el) return;
    const files = [...(e.dataTransfer?.types || [])].includes('Files');
    if (!dragId && !files) return;
    e.preventDefault();
    const r = el.getBoundingClientRect(); const before = e.clientY < r.top + r.height / 2;
    root.querySelectorAll('.drop-before, .drop-after').forEach(x => x.classList.remove('drop-before', 'drop-after'));
    el.classList.add(before ? 'drop-before' : 'drop-after');
  });
  root.addEventListener('dragend', () => { dragId = null; clearMarks(); });
  root.addEventListener('drop', async (e) => {
    const el = blockEl(e.target); if (!el) return;
    const before = el.classList.contains('drop-before');
    clearMarks();
    const file = [...(e.dataTransfer?.files || [])].find(f => f.type.startsWith('image/'));
    if (file) { e.preventDefault(); const target = find(el.dataset.id); await attachImage(target.type === 'image' && !target.imageKey ? target : target, file); return; }
    if (!dragId) return;
    e.preventDefault();
    const moving = find(dragId); const targetId = el.dataset.id; dragId = null;
    if (!moving || moving.id === targetId) return;
    blocks.splice(idx(moving.id), 1);
    blocks.splice(idx(targetId) + (before ? 0 : 1), 0, moving);
    render(); changed();
  });
  root.addEventListener('keydown', (e) => { // keyboard alternative for image upload labels
    if (e.target.classList?.contains('img-drop') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.target.querySelector('input').click(); }
  });

  render();
  return {
    get blocks() { return blocks; },
    refreshLinks,
    focusStart() { const first = blocks.find(b => TEXTUAL.has(b.type)); if (first) focusBlock(first.id, 'end'); },
    appendAndFocus() { const last = blocks[blocks.length - 1]; if (last && TEXTUAL.has(last.type) && !last.html) focusBlock(last.id); else { const nb = newBlock('text'); blocks.push(nb); render({ id: nb.id }); changed(); } },
    destroy() { menu.destroy(); },
  };
}

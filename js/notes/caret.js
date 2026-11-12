// Caret / selection helpers for contenteditable blocks (character offsets over text content).

export function caretOffset(el) {
  const sel = getSelection();
  if (!sel.rangeCount || !el.contains(sel.anchorNode)) return -1;
  const r = sel.getRangeAt(0);
  const pre = document.createRange();
  pre.selectNodeContents(el);
  pre.setEnd(r.startContainer, r.startOffset);
  return pre.toString().length;
}
export function selectionCollapsed() { const s = getSelection(); return !s.rangeCount || s.getRangeAt(0).collapsed; }

/** Map a character offset to a (node, offset) position inside el. */
function locate(el, n) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let acc = 0;
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const len = t.nodeValue.length;
    if (acc + len >= n) return [t, n - acc];
    acc += len;
  }
  return null;
}
export function rangeFromOffsets(el, start, end) {
  const r = document.createRange();
  const a = locate(el, start), b = locate(el, end);
  if (a) r.setStart(a[0], a[1]); else { r.selectNodeContents(el); r.collapse(false); return r; }
  if (b) r.setEnd(b[0], b[1]); else r.setEnd(el, el.childNodes.length);
  return r;
}
export function setCaret(el, pos = 'end') {
  el.focus({ preventScroll: false });
  const sel = getSelection();
  let r;
  if (pos === 'start') { r = document.createRange(); r.selectNodeContents(el); r.collapse(true); }
  else if (pos === 'end' || typeof pos !== 'number') { r = document.createRange(); r.selectNodeContents(el); r.collapse(false); }
  else { r = rangeFromOffsets(el, pos, pos); r.collapse(true); }
  sel.removeAllRanges(); sel.addRange(r);
}
export function caretAtEnd(el) { return caretOffset(el) === el.textContent.length; }
export function caretRect() {
  const sel = getSelection(); if (!sel.rangeCount) return null;
  const r = sel.getRangeAt(0).cloneRange();
  let rect = r.getClientRects()[0];
  if (!rect) { const span = document.createElement('span'); span.textContent = '​'; r.insertNode(span); rect = span.getBoundingClientRect(); span.remove(); }
  return rect;
}
/** Split el at the caret: returns html after the caret and removes it from el. */
export function extractAfterCaret(el) {
  const sel = getSelection();
  const r = document.createRange();
  if (sel.rangeCount && el.contains(sel.anchorNode)) { const c = sel.getRangeAt(0); c.deleteContents(); r.setStart(c.startContainer, c.startOffset); }
  else { r.selectNodeContents(el); r.collapse(false); }
  r.setEnd(el, el.childNodes.length);
  const frag = r.extractContents();
  const d = document.createElement('div'); d.appendChild(frag);
  return cleanHTML(d.innerHTML);
}
/** Normalize contenteditable output: empty -> '', strip trailing <br>. */
export function cleanHTML(html) {
  html = (html || '').replace(/<br\s*\/?>$/i, '');
  const d = document.createElement('div'); d.innerHTML = html;
  return d.textContent.length || d.querySelector('img,a') ? html : '';
}

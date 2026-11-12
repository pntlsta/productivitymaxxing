// Whole-book full-text search. On first use, every spine item is loaded, its text extracted and
// cached in IndexedDB. Results resolve back to an exact DOM range -> CFI for jumping/flashing.
import { idbGet, idbPut } from '../core/idb.js';
import { esc } from '../core/util.js';

const INDEX_VERSION = 3;
const PARA = '\u2029'; // paragraph separator: inserted between block elements, ends a sentence
const BLOCK = /^(p|div|h[1-6]|li|blockquote|section|article|td|th|dd|dt|pre|figcaption|caption|tr|body)$/i;
const blockOf = (n) => { let e = n.parentNode; while (e && e.nodeType === 1 && !BLOCK.test(e.localName)) e = e.parentNode; return e; };

/** Text nodes under body, joined with a virtual space between nodes. Returns {text, map}
 *  where map[i] = [node, offset] for every char of the whitespace-collapsed text. */
function flatten(doc, withMap) {
  const body = doc.body || doc.querySelector('body') || doc.documentElement;
  const walker = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => /^(script|style)$/i.test(n.parentNode?.localName || '') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  let text = ''; const map = withMap ? [] : null; let lastSpace = true, lastBlock = null;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const s = n.nodeValue; const blk = blockOf(n);
    if (!/\S/.test(s)) continue;
    if (text && blk !== lastBlock) { // block boundary -> paragraph separator
      if (lastSpace) { text = text.slice(0, -1); map?.pop(); }
      text += PARA; map?.push([n, 0]); lastSpace = true;
    } else if (!lastSpace) { text += ' '; map?.push([n, 0]); lastSpace = true; } // inline node boundary
    lastBlock = blk;
    for (let i = 0; i < s.length; i++) {
      const ws = /\s/.test(s[i]);
      if (ws) { if (lastSpace) continue; text += ' '; lastSpace = true; }
      else { text += s[i]; lastSpace = false; }
      map?.push([n, i]);
    }
  }
  return { text, map };
}

export async function getIndex(book, bookId, label, onProgress = () => {}) {
  const cached = await idbGet('search', bookId).catch(() => null);
  if (cached && cached.v === INDEX_VERSION) return cached;
  const sections = []; let total = 0;
  const items = book.spine.spineItems.filter(s => s.linear !== false && s.linear !== 'no');
  for (let i = 0; i < items.length; i++) {
    const sec = items[i];
    onProgress(i, items.length);
    try {
      const el = await sec.load(book.load.bind(book));
      const { text } = flatten(el.ownerDocument || el);
      sections.push({ index: sec.index, href: sec.href, label: label(sec), text, start: total });
      total += text.length;
    } catch (e) { console.warn('index skip', sec.href, e); }
    finally { sec.unload(); }
  }
  const idx = { v: INDEX_VERSION, sections, total };
  await idbPut('search', bookId, idx).catch(() => {});
  return idx;
}

/** Parse a query into lowercase phrases (from "quotes") and loose words. */
export function parseQuery(q) {
  const phrases = []; let rest = q.replace(/"([^"]+)"/g, (_, p) => { phrases.push(p.toLowerCase().replace(/\s+/g, ' ').trim()); return ' '; });
  const words = rest.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  return { phrases: phrases.filter(Boolean), words, terms: [...phrases, ...words].filter(Boolean) };
}

const SENT_RE = /[^.!?…\u2029]+(?:[.!?…]+["'”’)\]]*)?/g;
export function search(idx, q, limit = 300) {
  const { phrases, words, terms } = parseQuery(q);
  if (!terms.length) return [];
  const out = [];
  for (const sec of idx.sections) {
    const lower = sec.text.toLowerCase().replace(/\u2029/g, ' ');
    // quick reject: every term must be in the section
    if (!terms.every(t => lower.includes(t))) continue;
    SENT_RE.lastIndex = 0;
    let m;
    while ((m = SENT_RE.exec(sec.text))) {
      if (!m[0].trim()) { if (m.index === SENT_RE.lastIndex) SENT_RE.lastIndex++; continue; }
      const sl = m[0].toLowerCase();
      if (phrases.every(p => sl.includes(p)) && words.every(w => sl.includes(w))) {
        const lead = m[0].length - m[0].trimStart().length;
        out.push({ section: sec.index, href: sec.href, label: sec.label, sentence: m[0].trim(), offset: m.index + lead, terms,
          percent: idx.total ? (sec.start + m.index) / idx.total : 0 });
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

export function highlightTerms(sentence, terms) {
  let html = esc(sentence);
  const sorted = [...terms].sort((a, b) => b.length - a.length).map(t => esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!sorted.length) return html;
  return html.replace(new RegExp(`(${sorted.join('|')})`, 'gi'), '<mark>$1</mark>');
}

/** Find the result's match inside the section's DOM and return a CFI for that exact range. */
export async function cfiForResult(book, result) {
  const sec = book.spine.get(result.section);
  const el = await sec.load(book.load.bind(book));
  try {
    const doc = el.ownerDocument || el;
    const { text, map } = flatten(doc, true);
    const lower = text.toLowerCase();
    // locate the sentence (index offsets should match; fall back to a text search)
    let sPos = lower.slice(result.offset, result.offset + result.sentence.length) === result.sentence.toLowerCase() ? result.offset : lower.indexOf(result.sentence.toLowerCase());
    if (sPos < 0) sPos = 0;
    const term = [...result.terms].sort((a, b) => b.length - a.length)[0];
    let tPos = lower.indexOf(term, sPos);
    let len = term.length;
    if (tPos < 0 || tPos > sPos + result.sentence.length) { tPos = sPos; len = result.sentence.length; }
    const a = map[tPos], b = map[Math.min(tPos + len - 1, map.length - 1)];
    if (!a || !b) return null; // caller falls back to the section href
    const range = doc.createRange();
    range.setStart(a[0], a[1]);
    range.setEnd(b[0], b[1] + 1);
    return sec.cfiFromRange(range);
  } finally { sec.unload(); }
}

// Small shared helpers: DOM, escaping, dates, ids, script loading.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);

/** Debounced fn with flush() (runs now, only if a call is pending), cancel() and pending(). */
export function debounce(fn, ms) {
  let t, args = null;
  const run = () => { const a = args; args = null; fn(...a); };
  const d = (...a) => { args = a; clearTimeout(t); t = setTimeout(run, ms); };
  d.flush = () => { clearTimeout(t); if (args) run(); };
  d.cancel = () => { clearTimeout(t); args = null; };
  d.pending = () => !!args;
  return d;
}

export function lsGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
}
export function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { console.warn('localStorage write failed', e); return false; }
}

// ---------- Dates (all local, ISO yyyy-mm-dd strings for day values) ----------
export const pad2 = (n) => String(n).padStart(2, '0');
export function isoDate(d = new Date()) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
export function parseISO(s) { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
export function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
export function startOfWeek(d = new Date()) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - x.getDay()); return x; }
export function today() { return isoDate(new Date()); }
export function inRange(iso, startIso, endIso) { return !!iso && iso >= startIso && iso <= endIso; }
export function weekRange(d = new Date()) { const s = startOfWeek(d); return [isoDate(s), isoDate(addDays(s, 6))]; }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function fmtShort(iso) { const d = parseISO(iso); return d ? `${MONTHS[d.getMonth()]} ${d.getDate()}` : '—'; }
export function fmtDay(iso) { const d = parseISO(iso); return d ? `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}` : '—'; }
export function fmtLong(iso) { const d = parseISO(iso); return d ? `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` : '—'; }
export function fmtDateTime(ts) { const d = new Date(ts); return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
export const monthName = (m) => ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m];

// ---------- Scripts ----------
const loaded = new Map();
export function loadScript(src, globalName) {
  if (globalName && window[globalName]) return Promise.resolve(window[globalName]);
  if (!loaded.has(src)) {
    loaded.set(src, new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.async = true; s.crossOrigin = 'anonymous';
      s.onload = () => resolve(globalName ? window[globalName] : true);
      s.onerror = () => { loaded.delete(src); reject(new Error(`Could not load ${src}. Are you offline?`)); };
      document.head.appendChild(s);
    }));
  }
  return loaded.get(src);
}
export const LIBS = {
  marked: 'https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js',
  jszip: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  epub: 'https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js',
};
export async function loadMarked() { return loadScript(LIBS.marked, 'marked'); }
export async function loadEpub() { await loadScript(LIBS.jszip, 'JSZip'); return loadScript(LIBS.epub, 'ePub'); }

// ---------- HTML sanitizing (for markdown output and stored rich text) ----------
const BLOCKED = new Set(['SCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'STYLE', 'LINK', 'META', 'BASE', 'FORM']);
export function sanitizeHTML(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const walk = (node) => {
    for (const el of [...node.children]) {
      if (BLOCKED.has(el.tagName)) { el.remove(); continue; }
      for (const a of [...el.attributes]) {
        const n = a.name.toLowerCase();
        if (n.startsWith('on') || n === 'style' || n === 'srcdoc') el.removeAttribute(a.name);
        else if ((n === 'href' || n === 'src' || n === 'xlink:href') && /^\s*(javascript|vbscript|data:text)/i.test(a.value)) el.removeAttribute(a.name);
      }
      if (el.tagName === 'A' && el.getAttribute('href') && !el.getAttribute('href').startsWith('#')) { el.setAttribute('rel', 'noopener noreferrer'); el.setAttribute('target', '_blank'); }
      walk(el);
    }
  };
  walk(tpl.content);
  return tpl.innerHTML;
}

export function downloadText(filename, text, type = 'text/markdown') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const plural = (n, word, pl = word + 's') => `${n} ${n === 1 ? word : pl}`;

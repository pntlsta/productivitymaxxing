// Theme: system preference by default; an explicit user choice in localStorage wins.
import { lsGet, lsSet } from './util.js';

const KEY = 'wb.theme';
const mq = matchMedia('(prefers-color-scheme: dark)');
const listeners = new Set();

export function currentTheme() { return document.documentElement.dataset.theme || 'light'; }
function apply(theme) {
  document.documentElement.dataset.theme = theme;
  listeners.forEach(fn => fn(theme));
}
export function initTheme() {
  const saved = lsGet(KEY, null);
  document.documentElement.classList.add('no-transition');
  apply(saved || (mq.matches ? 'dark' : 'light'));
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.remove('no-transition')));
  mq.addEventListener('change', (e) => { if (!lsGet(KEY, null)) apply(e.matches ? 'dark' : 'light'); });
}
export function toggleTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  lsSet(KEY, next);
  apply(next);
  return next;
}
export function onThemeChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
/** Read a token's resolved value (for places like epub iframes that can't see our CSS). */
export function token(name) { return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim(); }

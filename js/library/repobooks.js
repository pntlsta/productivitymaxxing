// Books from a folder in the site's own GitHub repo (default: books/ in the repo serving this page).
// Listing: GitHub contents API (no token needed for a public repo), falling back to
// books/manifest.json (for local dev or custom domains). Files are downloaded on demand and
// cached in IndexedDB like uploaded books.
import { lsGet, lsSet } from '../core/util.js';
import { getSettings } from '../core/github.js';

const KEY = 'wb.lib.repo';
const CACHE = 'wb.lib.repoList';
const TTL = 10 * 60 * 1000; // unauthenticated API allows 60 requests/hour, so cache listings

/** owner/repo of the GitHub Pages site we're served from, if it's a *.github.io address. */
export function detectRepo() {
  const m = /^([^.]+)\.github\.io$/i.exec(location.hostname);
  if (!m) return null;
  const seg = location.pathname.split('/').filter(Boolean)[0];
  const isFile = seg && /\.\w+$/.test(seg);
  return { owner: m[1], repo: seg && !isFile ? seg : `${m[1]}.github.io` };
}
/** Effective source: settings override, else auto-detected. */
export function repoSource() {
  const s = lsGet(KEY, {});
  const det = detectRepo();
  const owner = s.owner || det?.owner || '', repo = s.repo || det?.repo || '';
  return { owner, repo, path: (s.path || 'books').replace(/^\/+|\/+$/g, ''), detected: det, override: !!(s.owner && s.repo) };
}
export function saveRepoSource({ owner = '', repo = '', path = 'books' }) {
  lsSet(KEY, { owner: owner.trim(), repo: repo.trim(), path: path.trim() || 'books' });
  localStorage.removeItem(CACHE);
}

async function apiList(src) {
  const url = `https://api.github.com/repos/${encodeURIComponent(src.owner)}/${encodeURIComponent(src.repo)}/contents/${src.path.split('/').map(encodeURIComponent).join('/')}`;
  const headers = { Accept: 'application/vnd.github+json' };
  let res = await fetch(url, { headers, cache: 'no-store' });
  // A private site repo: retry with the saved token, in case it has access.
  if ((res.status === 404 || res.status === 401) && getSettings().token) res = await fetch(url, { headers: { ...headers, Authorization: `Bearer ${getSettings().token}` }, cache: 'no-store' });
  if (res.status === 404) return [];
  if (res.status === 403) throw new Error('GitHub rate limit reached for listing repo books. Try again in a few minutes.');
  if (!res.ok) throw new Error(`Could not list ${src.owner}/${src.repo}/${src.path} (${res.status}).`);
  const items = await res.json();
  return (Array.isArray(items) ? items : []).filter(i => i.type === 'file' && /\.epub$/i.test(i.name))
    .map(i => ({ name: i.name, path: i.path, size: i.size, sha: i.sha, url: i.download_url }));
}
async function manifestList(src) {
  const res = await fetch(`${src.path}/manifest.json`, { cache: 'no-store' }).catch(() => null);
  if (!res?.ok) return [];
  const names = await res.json().catch(() => []);
  return (Array.isArray(names) ? names : []).map(n => (typeof n === 'string' ? n : n?.name)).filter(n => n && /\.epub$/i.test(n))
    .map(n => ({ name: n.split('/').pop(), path: `${src.path}/${n}`, size: null, sha: null, url: null }));
}

/** List .epub files in the repo folder. Returns {files, source, error}. */
export async function listRepoBooks(force = false) {
  const src = repoSource();
  const key = `${src.owner}/${src.repo}/${src.path}`;
  const cached = lsGet(CACHE, null);
  if (!force && cached && cached.key === key && Date.now() - cached.at < TTL) return { files: cached.files, source: src };
  try {
    let files = src.owner && src.repo && navigator.onLine ? await apiList(src) : [];
    if (!files.length) files = await manifestList(src);
    lsSet(CACHE, { key, at: Date.now(), files });
    return { files, source: src };
  } catch (e) {
    return { files: cached?.files || [], source: src, error: e.message };
  }
}

/** Download an epub from the repo: same-origin first (served by Pages), then the raw GitHub URL. */
export async function fetchRepoBook(file) {
  const candidates = [file.path.split('/').map(encodeURIComponent).join('/')];
  if (file.url) candidates.push(file.url);
  const src = repoSource();
  if (src.owner && src.repo) candidates.push(`https://raw.githubusercontent.com/${src.owner}/${src.repo}/HEAD/${file.path.split('/').map(encodeURIComponent).join('/')}`);
  let lastErr;
  for (const u of candidates) {
    try {
      const res = await fetch(u);
      if (res.ok) { const b = await res.blob(); if (b.size > 0) return new File([b], file.name, { type: 'application/epub+zip' }); }
      lastErr = new Error(`${res.status} ${res.statusText}`);
    } catch (e) { lastErr = e; }
  }
  throw new Error(`Could not download ${file.name} from the repo (${lastErr?.message || 'unknown error'}).`);
}

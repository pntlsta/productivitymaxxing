// Thin GitHub REST client for the Issues-as-database backend.
import { lsGet, lsSet } from './util.js';

const KEY = 'wb.settings';
export function getSettings() { return lsGet(KEY, { token: '', owner: '', repo: '' }); }
export function saveSettings(s) { lsSet(KEY, { token: s.token.trim(), owner: s.owner.trim(), repo: s.repo.trim() }); }
export function isConfigured() { const s = getSettings(); return !!(s.token && s.owner && s.repo); }

export class GitHubError extends Error {
  /** retryAfter (seconds) is set for GitHub's short "secondary" rate limits, which clear on their own. */
  constructor(status, message, retryAfter = null) { super(message); this.status = status; this.retryAfter = retryAfter; }
}

async function request(path, { method = 'GET', body, token } = {}) {
  const s = getSettings();
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token || s.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); msg = j.message || msg; if (j.errors) msg += ': ' + j.errors.map(e => e.message || e.code).join(', '); } catch {}
    if (res.status === 401) msg = 'Token rejected (401). Check that it is valid and not expired.';
    if (res.status === 403 && /not accessible by personal access token/i.test(msg)) msg = 'Token lacks permission. Edit the token on GitHub: select this repository and set Issues to "Read and write".';
    if ((res.status === 403 || res.status === 429) && res.headers.get('x-ratelimit-remaining') !== '0' && (res.headers.get('retry-after') || /secondary rate limit/i.test(msg))) {
      throw new GitHubError(res.status, 'GitHub is throttling rapid writes.', Number(res.headers.get('retry-after')) || 60);
    }
    if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') msg = 'GitHub hourly rate limit reached. Your changes stay queued; try Save again later.';
    throw new GitHubError(res.status, msg);
  }
  return res.status === 204 ? null : res.json();
}

const repoPath = () => { const s = getSettings(); return `/repos/${encodeURIComponent(s.owner)}/${encodeURIComponent(s.repo)}`; };

/** List every issue (open + closed) with a label, 100 per page. */
export async function listIssues(label) {
  const out = [];
  for (let page = 1; page < 100; page++) {
    const batch = await request(`${repoPath()}/issues?labels=${encodeURIComponent(label)}&state=all&per_page=100&page=${page}`);
    out.push(...batch.filter(i => !i.pull_request));
    if (batch.length < 100) break;
  }
  return out;
}
export const createIssue = (data) => request(`${repoPath()}/issues`, { method: 'POST', body: data });
export const updateIssue = (number, data) => request(`${repoPath()}/issues/${number}`, { method: 'PATCH', body: data });

const ensuredLabels = new Set(lsGet('wb.labels', []));
export async function ensureLabel(name) {
  if (ensuredLabels.has(name)) return;
  try {
    await request(`${repoPath()}/labels`, { method: 'POST', body: { name, color: '6e7781', description: 'Workbench record type' } });
  } catch (e) { if (e.status !== 422) throw e; } // 422 = already exists
  ensuredLabels.add(name); lsSet('wb.labels', [...ensuredLabels]);
}

/** Verify token + repo, report what we found. */
export async function testConnection({ token, owner, repo }) {
  const report = [];
  const user = await request('/user', { token }).catch(e => { throw new Error(`Token check failed: ${e.message}`); });
  report.push(`Authenticated as ${user.login}.`);
  let r;
  try { r = await request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, { token }); }
  catch (e) { throw new Error(`${report[0]} Repository ${owner}/${repo} not reachable (${e.status || ''} ${e.message}). The token needs access to this repo.`); }
  report.push(`Found ${r.full_name} (${r.private ? 'private' : 'PUBLIC'}).`);
  if (!r.private) report.push('WARNING: this repository is public. Anyone can read your data. Use a private repo.');
  if (!r.has_issues) report.push('WARNING: Issues are disabled on this repo. Enable them in the repo settings.');
  const issues = await request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?state=all&per_page=1`, { token });
  report.push(`Issues readable (${issues.length ? 'has issues' : 'no issues yet'}).`);
  if (r.permissions && !r.permissions.push && !r.permissions.triage) report.push('WARNING: token may lack write access to Issues.');
  return report;
}

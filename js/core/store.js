// Data layer: GitHub Issues as the database, localStorage cache, and a persisted write queue.
//
// - Reads: all issues per `db:<type>` label (state=all), parsed from a ```json fence in the body,
//   cached in localStorage keyed by issue number + updated_at so unchanged issues are not re-parsed.
// - Writes: every mutation is applied locally right away and coalesced into a queue that is
//   persisted to localStorage. Nothing is sent to GitHub until the user clicks Save (flush).
// - Delete = close the issue. Closed issues are read back as "trash" and can be restored.
import { uuid, lsGet, lsSet } from './util.js';
import * as gh from './github.js';

export const TYPES = ['course', 'item', 'note', 'notebook', 'announcement', 'punch', 'page', 'book', 'bookmark', 'annotation'];
export const MAX_BODY = 65000;

const tables = Object.fromEntries(TYPES.map(t => [t, new Map()]));   // live records
const trash = Object.fromEntries(TYPES.map(t => [t, new Map()]));    // closed (deleted) records
const meta = Object.fromEntries(TYPES.map(t => [t, new Map()]));     // id -> server view {number, u, s, r}
let queue = lsGet('wb.queue', []);
const loading = new Set();
const synced = new Set();
const listeners = new Map();
let flushing = false;

// ---------- events ----------
export function on(evt, fn) { if (!listeners.has(evt)) listeners.set(evt, new Set()); listeners.get(evt).add(fn); return () => listeners.get(evt).delete(fn); }
function emit(evt, arg) { listeners.get(evt)?.forEach(fn => { try { fn(arg); } catch (e) { console.error(e); } }); }

// ---------- issue titles ----------
const short = (s, n = 60) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const TITLES = {
  course: r => `${r.code} ${r.name}`,
  item: r => `${tables.course.get(r.courseId)?.code || '???'} ${r.name}`,
  note: r => r.title || 'Untitled note',
  notebook: r => r.name,
  announcement: r => `${r.date} ${r.title}`,
  punch: r => r.date,
  page: r => `${r.icon || ''} ${r.title || 'Untitled'}`.trim(),
  book: r => `${r.title}${r.author ? ' — ' + r.author : ''}`,
  bookmark: r => `${tables.book.get(r.bookId)?.title || 'book'}: ${r.chapter || r.cfi}`,
  annotation: r => `${tables.book.get(r.bookId)?.title || 'book'}: ${r.text || ''}`,
};
export function issueTitle(type, r) { return `${type}: ${short(TITLES[type]?.(r) ?? r.id)}`; }
export function issueBody(r) { return '```json\n' + JSON.stringify(r, null, 1) + '\n```\n'; }
function parseBody(body) {
  const m = /```json\s*([\s\S]*?)```/.exec(body || '');
  if (!m) return null;
  try { const r = JSON.parse(m[1]); return r && typeof r === 'object' && r.id ? r : null; } catch { return null; }
}

// ---------- cache ----------
const cacheKey = (type) => `wb.cache.${type}`;
function loadCache() {
  for (const type of TYPES) {
    const c = lsGet(cacheKey(type), null);
    if (!c) continue;
    synced.add(type);
    for (const [num, e] of Object.entries(c)) meta[type].set(e.r.id, { number: +num, u: e.u, s: e.s, r: e.r });
  }
}
/** Rebuild the live view: server state (meta) with the pending queue applied on top. */
function rebuild() {
  for (const type of TYPES) {
    tables[type] = new Map(); trash[type] = new Map();
    for (const [id, m] of meta[type]) (m.s === 'closed' ? trash : tables)[type].set(id, m.r);
  }
  applyQueue();
}
function saveCache(type) {
  const out = {};
  for (const m of meta[type].values()) out[m.number] = { u: m.u, s: m.s, r: m.r };
  if (!lsSet(cacheKey(type), out)) emit('error', 'Local cache is full; data will reload from GitHub next time.');
}

// ---------- queue ----------
const keyOf = (op) => `${op.type}:${op.id}`;
function persistQueue() { lsSet('wb.queue', queue); emit('queue', queue.length); }
function enqueue(type, id, action, record) {
  const op = { opId: uuid(), type, id, action, record, at: Date.now() };
  const i = queue.findIndex(o => keyOf(o) === keyOf(op));
  if (i === -1) queue.push(op);
  else {
    const prev = queue[i];
    if (prev.action === 'create' && action === 'update') queue[i] = { ...op, action: 'create' };
    else if (prev.action === 'create' && action === 'delete') queue.splice(i, 1);
    else if (prev.action === 'delete' && action === 'restore') queue.splice(i, 1);
    else if (prev.action === 'restore' && action === 'update') queue[i] = { ...op, action: 'restore' };
    else if (prev.action === 'restore' && action === 'delete') queue.splice(i, 1);
    else queue[i] = op;
  }
  persistQueue();
}
function applyQueue() {
  for (const op of queue) {
    const { type, id } = op;
    if (!tables[type]) continue;
    if (op.action === 'delete') { const r = tables[type].get(id) || op.record; tables[type].delete(id); if (r) trash[type].set(id, r); }
    else { trash[type].delete(id); tables[type].set(id, op.record); }
  }
}
export const pendingCount = () => queue.length;
export const pendingOps = () => queue.slice();
export const isPending = (type, id) => queue.some(o => o.type === type && o.id === id);
export const isFlushing = () => flushing;
export function discardQueue() { queue = []; persistQueue(); rebuild(); TYPES.forEach(t => emit('change', t)); }

// ---------- reads ----------
export function all(type) { return [...tables[type].values()]; }
export function get(type, id) { return tables[type].get(id) || null; }
export function deleted(type) { return [...trash[type].values()]; }
export function find(type, pred) { for (const r of tables[type].values()) if (pred(r)) return r; return null; }
export function where(type, pred) { return all(type).filter(pred); }
export const isLoading = (type) => loading.has(type) && !synced.has(type);
export const issueNumber = (type, id) => meta[type].get(id)?.number || null;

// ---------- writes ----------
const clone = (o) => JSON.parse(JSON.stringify(o));
export function create(type, data) {
  const now = new Date().toISOString();
  const r = { ...clone(data), id: data.id || uuid(), createdAt: now, updatedAt: now };
  tables[type].set(r.id, r);
  enqueue(type, r.id, 'create', r);
  emit('change', type);
  return r;
}
export function update(type, id, patch) {
  const cur = tables[type].get(id);
  if (!cur) throw new Error(`No ${type} with id ${id}`);
  const r = { ...cur, ...clone(patch), id, createdAt: cur.createdAt, updatedAt: new Date().toISOString() };
  tables[type].set(id, r);
  enqueue(type, id, 'update', r);
  emit('change', type);
  return r;
}
export function remove(type, id) {
  const cur = tables[type].get(id);
  if (!cur) return;
  tables[type].delete(id);
  trash[type].set(id, cur);
  enqueue(type, id, 'delete', cur);
  emit('change', type);
}
export function restore(type, id) {
  const cur = trash[type].get(id);
  if (!cur) return;
  trash[type].delete(id);
  const r = { ...cur, updatedAt: new Date().toISOString() };
  tables[type].set(id, r);
  enqueue(type, id, 'restore', r);
  emit('change', type);
}

// ---------- sync (pull) ----------
export async function sync(types = TYPES) {
  if (!gh.isConfigured() || !navigator.onLine) return { skipped: true };
  const errors = [];
  types.forEach(t => loading.add(t));
  types.forEach(t => emit('change', t));
  for (const type of types) {
    try {
      const prevCache = lsGet(cacheKey(type), {});
      const issues = await gh.listIssues(`db:${type}`);
      const m = new Map();
      for (const is of issues) {
        const c = prevCache[is.number];
        const r = (c && c.u === is.updated_at) ? c.r : parseBody(is.body);
        if (!r) continue;
        m.set(r.id, { number: is.number, u: is.updated_at, s: is.state, r });
      }
      meta[type] = m;
      synced.add(type);
      saveCache(type);
    } catch (e) { errors.push(`${type}: ${e.message}`); }
    finally { loading.delete(type); }
  }
  rebuild();
  types.forEach(t => emit('change', t));
  emit('sync', errors);
  return { errors };
}

// ---------- flush (push) ----------
async function sendOp(op) {
  const { type, id, action, record } = op;
  const title = issueTitle(type, record);
  const body = issueBody(record);
  if (action !== 'delete' && body.length > MAX_BODY) throw new Error(`Record is ${body.length.toLocaleString()} characters; GitHub's limit is about 65,000. Split it up.`);
  const label = `db:${type}`;
  const m = meta[type].get(id);
  let issue;
  if (action === 'delete') {
    if (!m) return; // never reached GitHub; nothing to close
    issue = await gh.updateIssue(m.number, { state: 'closed', state_reason: 'not_planned' });
  } else if (action === 'create' || !m) {
    await gh.ensureLabel(label);
    issue = await gh.createIssue({ title, body, labels: [label] });
  } else if (action === 'restore') {
    issue = await gh.updateIssue(m.number, { state: 'open', title, body });
  } else {
    issue = await gh.updateIssue(m.number, { title, body });
  }
  meta[type].set(id, { number: issue.number, u: issue.updated_at, s: issue.state, r: action === 'delete' ? m.r : record });
}

/** Send queued ops sequentially. onProgress({done,total,op,status,error}) */
export async function flush(onProgress = () => {}) {
  if (flushing) return null;
  if (!gh.isConfigured()) throw new Error('Connect a GitHub repo in Settings before saving.');
  if (!navigator.onLine) throw new Error('You are offline. Changes stay queued until you reconnect.');
  flushing = true; emit('queue', queue.length);
  const batch = queue.slice();
  const results = [];
  try {
    for (let i = 0; i < batch.length; i++) {
      const op = batch[i];
      onProgress({ done: i, total: batch.length, op, status: 'sending' });
      try {
        await sendOp(op);
        const qi = queue.findIndex(o => o.opId === op.opId);
        if (qi !== -1) queue.splice(qi, 1);
        else { // op was coalesced while in flight; a queued "create" for it must now be an update
          const later = queue.find(o => keyOf(o) === keyOf(op));
          if (later && later.action === 'create' && op.action !== 'delete') later.action = 'update';
        }
        persistQueue();
        saveCache(op.type);
        results.push({ op, ok: true });
        onProgress({ done: i + 1, total: batch.length, op, status: 'ok' });
      } catch (e) {
        results.push({ op, ok: false, error: e.message });
        onProgress({ done: i + 1, total: batch.length, op, status: 'fail', error: e.message });
        if (e.status === 401) { // no point continuing
          for (let j = i + 1; j < batch.length; j++) { results.push({ op: batch[j], ok: false, error: 'Skipped (auth failed)' }); onProgress({ done: j + 1, total: batch.length, op: batch[j], status: 'fail', error: 'Skipped (auth failed)' }); }
          break;
        }
      }
    }
  } finally {
    flushing = false;
    persistQueue();
    emit('flushed', results);
  }
  return results;
}

/** Remove everything local (cache + queue). */
export function clearLocal() {
  TYPES.forEach(t => localStorage.removeItem(cacheKey(t)));
  localStorage.removeItem('wb.labels');
  queue = []; persistQueue();
  TYPES.forEach(t => { tables[t].clear(); trash[t].clear(); meta[t].clear(); synced.delete(t); emit('change', t); });
}

// boot
loadCache();
rebuild();

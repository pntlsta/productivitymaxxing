// Export everything to one JSON file, and import such a file (e.g. data migrated from another app).
// Imported records are queued like any other edit; nothing reaches GitHub until Save.
import * as store from './store.js';
import { isoDate } from './util.js';

export const FORMAT = 'workbench-backup';
const REQUIRED = {
  course: ['code', 'name'], item: ['courseId', 'name'], notebook: ['name'], note: ['notebookId'],
  announcement: ['date', 'title'], punch: ['date'], page: ['title'], book: ['title'], bookmark: ['bookId', 'cfi'], annotation: ['bookId', 'cfiRange'], trip: ['name'],
};
// Parents first, so references can be remapped onto records that already exist.
const ORDER = ['course', 'item', 'notebook', 'note', 'announcement', 'punch', 'page', 'book', 'bookmark', 'annotation', 'trip'];
const lc = (s) => String(s ?? '').trim().toLowerCase();

export function exportAll() {
  const records = {};
  for (const t of store.TYPES) records[t] = store.all(t);
  return { format: FORMAT, version: 1, exportedAt: new Date().toISOString(), records };
}
export const exportFileName = () => `workbench-backup-${isoDate()}.json`;

/**
 * Plan (dryRun) or perform an import. Returns { perType: {type: {add, skip, invalid}}, total, warnings }.
 * Duplicates are skipped: same id, or the same natural key (course code, item name within its
 * course, notebook name, announcement date+title, punch date, ...).
 */
export function importData(data, { dryRun = false } = {}) {
  if (!data || data.format !== FORMAT || typeof data.records !== 'object') throw new Error('This is not a Workbench backup file.');
  const remap = {}; // type -> oldId -> existing id
  const perType = {}; const warnings = []; let total = 0;
  const seen = Object.fromEntries(ORDER.map(t => [t, new Set()])); // natural keys added within this import
  for (const type of ORDER) {
    const list = Array.isArray(data.records[type]) ? data.records[type] : [];
    const stats = perType[type] = { add: 0, skip: 0, invalid: 0 };
    remap[type] = {};
    for (const raw of list) {
      if (!raw || typeof raw !== 'object' || !raw.id || REQUIRED[type].some(k => raw[k] == null || raw[k] === '')) { stats.invalid++; continue; }
      const r = { ...raw };
      // references
      if (type === 'item') r.courseId = remap.course[r.courseId] || r.courseId;
      if (type === 'note') r.notebookId = remap.notebook[r.notebookId] || r.notebookId;
      if (type === 'page' && r.parentId) r.parentId = remap.page[r.parentId] || r.parentId;
      if (type === 'bookmark' || type === 'annotation') r.bookId = remap.book[r.bookId] || r.bookId;
      // duplicates
      const existing = store.get(type, r.id) || store.deleted(type).find(x => x.id === r.id) || findSame(type, r);
      const key = naturalKey(type, r);
      if (existing || (key && seen[type].has(key))) { if (existing) remap[type][raw.id] = existing.id; stats.skip++; continue; }
      if (key) seen[type].add(key);
      if (type === 'item' && !store.get('course', r.courseId) && !(data.records.course || []).some(c => c.id === r.courseId)) { stats.invalid++; continue; }
      stats.add++; total++;
      if (!dryRun) { const { createdAt, updatedAt, ...rest } = r; void createdAt; void updatedAt; store.create(type, rest); }
    }
  }
  if (perType.book.add) warnings.push('Book records import their metadata only. The .epub files themselves have to be added on each device (or come from the repo books/ folder).');
  return { perType, total, warnings };
}

function naturalKey(type, r) {
  switch (type) {
    case 'course': return lc(r.code);
    case 'item': return `${r.courseId}|${lc(r.name)}`;
    case 'notebook': return lc(r.name);
    case 'note': return `${r.notebookId}|${lc(r.title)}|${(r.content || '').length}`;
    case 'announcement': return `${r.date}|${lc(r.title)}`;
    case 'punch': return r.date;
    default: return null;
  }
}
function findSame(type, r) {
  const key = naturalKey(type, r);
  return key ? store.find(type, x => naturalKey(type, x) === key) : null;
}

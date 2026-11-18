// JCanvas data helpers. Modules are db:module records; module entries are db:item records
// (graded ones also appear on the Calendar), linked by item.moduleId with an `order` and `indent`.
import * as store from '../core/store.js';
import { ITEM_TYPES } from '../calendar/model.js';
import { fmtShort, parseISO } from '../core/util.js';

// Canvas's "Add Item" list, in its order.
export const CANVAS_TYPES = ['Assignment', 'Quiz', 'File', 'Page', 'Discussion', 'Text Header', 'External URL', 'External Tool'];
export const ICON = { Assignment: 'assignment', Project: 'assignment', 'Not Graded': 'assignment', Quiz: 'quiz', Discussion: 'discussion', Page: 'page', File: 'file', 'External URL': 'link', 'External Tool': 'tool' };
export const SECTIONS = [
  ['modules', 'Modules'], ['assignments', 'Assignments'], ['quizzes', 'Quizzes'], ['discussions', 'Discussions'], ['pages', 'Pages'], ['files', 'Files'],
];
export const SECTION_TYPES = { assignments: ['Assignment', 'Project', 'Not Graded'], quizzes: ['Quiz'], discussions: ['Discussion'], pages: ['Page'], files: ['File'] };
export const isGradedType = (t) => ITEM_TYPES.includes(t);
export const isPublished = (r) => r && r.published !== false;
export const MAX_INDENT = 5;

const byOrder = (a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || (a.name || '').localeCompare(b.name || '');
export const modulesOf = (cid) => store.where('module', m => m.courseId === cid).sort(byOrder);
/** Items in a module; with mid=null, items of the course that aren't in any existing module. */
export function itemsIn(cid, mid) {
  return store.where('item', i => i.courseId === cid && (mid ? i.moduleId === mid : (!i.moduleId || !store.get('module', i.moduleId)))).sort(byOrder);
}
/** Flat reading order used for Previous / Next on item pages (headers skipped). */
export function readingOrder(cid) {
  return [...modulesOf(cid).flatMap(m => itemsIn(cid, m.id)), ...itemsIn(cid, null)].filter(i => i.type !== 'Text Header');
}
export const nextOrder = (list) => (list.length ? Math.max(...list.map(x => x.order ?? 0)) + 1 : 0);
/** An order value that places something between neighbours a and b (either may be missing). */
export function orderBetween(a, b) {
  if (a && b) return ((a.order ?? 0) + (b.order ?? 0)) / 2;
  if (a) return (a.order ?? 0) + 1;
  if (b) return (b.order ?? 0) - 1;
  return 0;
}
/** Give every item in a list an explicit order (imported items have none), so drag positions stick. */
export function normalizeOrder(list, type = 'item') {
  list.forEach((x, i) => { if (x.order !== i) store.update(type, x.id, { order: i }); });
}

const t12 = (t) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}${h < 12 ? 'am' : 'pm'}`; };
export const fmtWhen = (date, time) => (date ? `${fmtShort(date)}${time ? ` at ${t12(time)}` : ''}` : '');
export const fmtWhenLong = (date, time) => (date ? `${parseISO(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}${time ? ` at ${t12(time)}` : ''}` : '');

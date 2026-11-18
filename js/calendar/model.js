// Calendar domain: courses and items, validation, shared dialogs and row rendering.
import * as store from '../core/store.js';
import { esc, fmtShort, today, parseISO, isoDate, addDays } from '../core/util.js';
import { formDialog, confirmDialog, toast } from '../core/ui.js';
import { icon } from '../core/icons.js';

export const ITEM_TYPES = ['Project', 'Assignment', 'Discussion', 'Quiz', 'Not Graded'];
/** Content-only module item types used by JCanvas; they never show on the Calendar. */
export const CONTENT_TYPES = ['Page', 'File', 'Text Header', 'External URL', 'External Tool'];
export const isGraded = (it) => ITEM_TYPES.includes(it.type);
export const COURSE_COLORS = ['#3b6fd8', '#d0482f', '#2e9b5b', '#a14bc4', '#d18a12', '#1c9aa8', '#c2407c', '#6b7280'];
export const CODE_RE = /^[A-Z]{3}-\d{3}$/;

/** "grd463", "GRD-463", "grd-463" -> "GRD-463"; null if not a valid code shape. */
export function normCode(s) {
  const m = /^([a-z]{3})-?(\d{3})$/i.exec(String(s || '').trim());
  return m ? `${m[1].toUpperCase()}-${m[2]}` : null;
}
export const compactCode = (code) => code.replace('-', '').toLowerCase();
export const courses = () => store.all('course').sort((a, b) => a.code.localeCompare(b.code));
export const courseByCode = (code) => { const c = normCode(code); return c ? store.find('course', x => x.code === c) : null; };
export const course = (id) => store.get('course', id);
export const itemsOf = (courseId) => store.where('item', i => i.courseId === courseId && isGraded(i));
export const allItemsOf = (courseId) => store.where('item', i => i.courseId === courseId);
export const isOverdue = (it) => !it.completed && !!it.dueDate && it.dueDate < today();
export const typeKey = (t) => t.toLowerCase().replace(/[^a-z]/g, '');
export function matchType(s) {
  const k = typeKey(s || '');
  if (k === 'ungraded' || k === 'notgraded' || k === 'ng') return 'Not Graded';
  return ITEM_TYPES.find(t => typeKey(t) === k) || null;
}

/** Parse M/D, M/D/YY or M/D/YYYY (or an ISO date). Without a year, pick the year nearest today. */
export function parseDate(s) {
  s = String(s || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/.exec(s);
  if (!m) return null;
  const mo = +m[1], d = +m[2];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  let y;
  if (m[3]) y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
  else {
    const now = new Date(); y = now.getFullYear();
    const cand = new Date(y, mo - 1, d);
    if (cand < addDays(now, -182)) y++; else if (cand > addDays(now, 182)) y--;
  }
  const dt = new Date(y, mo - 1, d);
  if (dt.getMonth() !== mo - 1) return null; // e.g. 2/31
  return isoDate(dt);
}

// ---------- Course dialogs ----------
export async function courseDialog(existing = null) {
  const used = courses().map(c => c.color);
  const v = await formDialog({
    title: existing ? `Edit ${existing.code}` : 'Add course',
    submitText: existing ? 'Save' : 'Add course',
    fields: [
      { name: 'code', label: 'Course code', value: existing?.code || '', required: true, placeholder: 'GRT-101', hint: 'Three letters, a dash, three numbers.',
        validate: (val) => {
          const c = normCode(val);
          if (!c || !CODE_RE.test(c)) return 'Use the format ABC-123 (three letters, dash, three numbers).';
          if (store.find('course', x => x.code === c && x.id !== existing?.id)) return `${c} already exists.`;
          return '';
        } },
      { name: 'name', label: 'Course name', value: existing?.name || '', required: true, placeholder: 'Typography II' },
      { name: 'description', label: 'Description', type: 'textarea', rows: 3, value: existing?.description || '' },
      { name: 'color', label: 'Color', type: 'color', value: existing?.color || COURSE_COLORS.find(c => !used.includes(c)) || COURSE_COLORS[0] },
    ],
  });
  if (!v) return null;
  const data = { code: normCode(v.code), name: v.name, description: v.description, color: v.color };
  if (existing) { store.update('course', existing.id, data); toast(`${data.code} updated (queued).`, 'success'); return existing; }
  const c = store.create('course', data); toast(`${data.code} added (queued).`, 'success'); return c;
}

export async function deleteCourse(c) {
  const items = allItemsOf(c.id);
  const mods = store.where('module', m => m.courseId === c.id);
  const ok = await confirmDialog({
    title: `Delete ${c.code}?`,
    message: `This deletes the course "${c.name}"${items.length ? ` and its ${items.length} item${items.length === 1 ? '' : 's'}` : ''}. Deleted records can be restored from Settings.`,
    phrase: c.code, confirmText: 'Delete course',
  });
  if (!ok) return false;
  items.forEach(i => store.remove('item', i.id));
  mods.forEach(m => store.remove('module', m.id));
  store.remove('course', c.id);
  toast(`${c.code} deleted (queued).`);
  return true;
}

// ---------- Item dialogs ----------
export async function itemDialog(existing = null, defaults = {}) {
  const cs = courses();
  if (!cs.length) { toast('Add a course first.', 'warning'); return courseDialog(); }
  const v = await formDialog({
    title: existing ? 'Edit item' : 'Add item', submitText: existing ? 'Save' : 'Add item',
    fields: [
      { name: 'name', label: 'Name', value: existing?.name || '', required: true },
      { name: 'courseId', label: 'Course', type: 'select', value: existing?.courseId || defaults.courseId || cs[0].id, options: cs.map(c => ({ value: c.id, label: `${c.code} — ${c.name}` })) },
      { name: 'type', label: 'Type', type: 'select', value: existing?.type || 'Assignment', options: ITEM_TYPES.map(t => ({ value: t, label: t })) },
      { name: 'points', label: 'Points', type: 'number', min: 0, step: 'any', value: existing?.points ?? '' },
      { name: 'availDate', label: 'Available date', type: 'date', value: existing?.availDate || defaults.date || '' },
      { name: 'dueDate', label: 'Due date', type: 'date', value: existing?.dueDate || defaults.date || '',
        validate: (val, all) => val && all.availDate && val < all.availDate ? 'Due date is before the available date.' : '' },
      { name: 'completed', label: 'Completed', type: 'checkbox', value: !!existing?.completed },
    ],
  });
  if (!v) return null;
  const data = { ...v, points: v.points ?? 0, availDate: v.availDate || null, dueDate: v.dueDate || null };
  if (existing) { store.update('item', existing.id, data); toast('Item updated (queued).', 'success'); }
  else { store.create('item', data); toast('Item added (queued).', 'success'); }
  return data;
}
export async function deleteItem(it) {
  if (!await confirmDialog({ title: 'Delete item?', message: `Delete "${it.name}"? You can restore it from Settings.`, confirmText: 'Delete' })) return;
  store.remove('item', it.id); toast('Item deleted (queued).');
}

// ---------- Rendering ----------
export function itemRow(it) {
  const c = course(it.courseId);
  const od = isOverdue(it);
  return `<li class="item-row ${it.completed ? 'done' : ''} ${od ? 'overdue' : ''}" data-item="${it.id}">
    <input type="checkbox" class="item-check" data-act="toggle" ${it.completed ? 'checked' : ''} aria-label="Mark ${esc(it.name)} ${it.completed ? 'not ' : ''}complete">
    <span class="dot" style="background:${esc(c?.color || 'currentColor')}" aria-hidden="true"></span>
    <span class="item-main"><span class="item-name">${esc(it.name)}</span>
      <span class="item-sub"><span class="course-code">${esc(c?.code || '?')}</span>
      <span class="badge type-${typeKey(it.type)}">${esc(it.type)}</span>
      <span class="pts">${it.points ?? 0} pts</span>
      ${od ? '<span class="badge danger">Overdue</span>' : ''}${it.completed ? '<span class="badge success">Done</span>' : ''}</span></span>
    <span class="item-dates"><span>Avail ${it.availDate ? fmtShort(it.availDate) : '—'}</span><span class="${od ? 'od' : ''}">Due ${it.dueDate ? fmtShort(it.dueDate) : '—'}</span></span>
    <span class="item-actions">
      <button class="icon-btn btn-sm" data-act="edit" aria-label="Edit ${esc(it.name)}">${icon('edit')}</button>
      <button class="icon-btn btn-sm" data-act="delete" aria-label="Delete ${esc(it.name)}">${icon('trash')}</button>
    </span></li>`;
}

/** Shared click handling for item rows inside `root`. */
export function bindItemRows(root) {
  root.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]'); if (!act) return;
    const row = act.closest('[data-item]'); if (!row) return;
    const it = store.get('item', row.dataset.item); if (!it) return;
    if (act.dataset.act === 'toggle') store.update('item', it.id, { completed: act.checked });
    else if (act.dataset.act === 'edit') itemDialog(it);
    else if (act.dataset.act === 'delete') deleteItem(it);
  });
}

export const sortItems = (list, key = 'dueDate') => list.sort((a, b) => (a[key] || '9999').localeCompare(b[key] || '9999') || a.name.localeCompare(b.name));
export { parseISO };

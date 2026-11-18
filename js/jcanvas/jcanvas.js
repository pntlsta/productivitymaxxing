// [JCanvas]: a Canvas-style course workspace. Dashboard of course cards, course navigation,
// Modules (collapsible, publish toggles, indent, drag to reorder / move between modules),
// section lists (Assignments, Quizzes, ...), item pages and an HTML editor.
import * as store from '../core/store.js';
import { esc, lsGet, lsSet, plural } from '../core/util.js';
import { icon } from '../core/icons.js';
import { contextMenu, confirmDialog, formDialog, toast, emptyState, skeletonRows } from '../core/ui.js';
import { courses, course, courseDialog } from '../calendar/model.js';
import { SECTIONS, SECTION_TYPES, ICON, MAX_INDENT, isGradedType, isPublished, modulesOf, itemsIn, orderBetween, normalizeOrder, fmtWhen, nextOrder } from './model.js';
import { moduleDialog, addItemDialog, renderItem, renderEdit, removeItem, duplicateItem, moveItemDialog, downloadFile } from './items.js';

const CKEY = 'wb.jc.collapsed';
const collapsed = new Set(lsGet(CKEY, []));
const saveCollapsed = () => lsSet(CKEY, [...collapsed]);

// ---------- routing ----------
function parse(params) {
  const [cid, a, id, b] = params;
  if (!cid) return { view: 'dashboard' };
  if (a === 'item' && id) return { view: b === 'edit' ? 'edit' : 'item', cid, id };
  return { view: SECTIONS.some(([k]) => k === a) ? a : 'modules', cid };
}

// ---------- pieces ----------
function itemMeta(it) {
  const bits = [];
  if (it.dueDate) bits.push(fmtWhen(it.dueDate, it.dueTime));
  if (isGradedType(it.type)) bits.push(`${it.points ?? 0} pts`);
  if (it.untilDate) bits.push(`Until ${fmtWhen(it.untilDate, it.untilTime)}`);
  return bits.join(' &nbsp;|&nbsp; ');
}
const pubBtn = (kind, r) => `<button class="jc-pub ${isPublished(r) ? 'on' : ''}" data-pub="${kind}:${r.id}" aria-pressed="${isPublished(r)}" aria-label="${isPublished(r) ? 'Published. Click to unpublish' : 'Unpublished. Click to publish'}" title="${isPublished(r) ? 'Published' : 'Unpublished'}">${icon(isPublished(r) ? 'publish' : 'unpublish')}</button>`;

function itemRow(it, cid) {
  const header = it.type === 'Text Header';
  const href = it.type === 'External URL' && it.newTab ? esc(it.url) : `#/jcanvas/${cid}/item/${it.id}`;
  return `<li class="jc-item ${isPublished(it) ? 'published' : ''} ${header ? 'is-header' : ''}" data-item="${it.id}" style="--indent:${it.indent || 0}">
    <span class="jc-grip" draggable="true" aria-hidden="true" title="Drag to move">${icon('grip')}</span>
    <span class="jc-type" aria-hidden="true">${header ? '' : icon(ICON[it.type] || 'page')}</span>
    <span class="jc-item-main">
      ${header ? `<span class="jc-header-text">${esc(it.name)}</span>` : `<a class="jc-item-link" href="${href}" ${it.newTab ? 'target="_blank" rel="noopener noreferrer"' : ''}>${esc(it.name)}</a>`}
      ${itemMeta(it) ? `<span class="jc-item-meta">${itemMeta(it)}</span>` : ''}
    </span>
    ${it.completed ? '<span class="badge success">Done</span>' : ''}
    ${pubBtn('item', it)}
    <button class="icon-btn btn-sm jc-kebab" data-item-menu="${it.id}" aria-label="Options for ${esc(it.name)}" aria-haspopup="menu">${icon('more')}</button>
  </li>`;
}

function moduleBlock(m, cid) {
  const items = itemsIn(cid, m ? m.id : null);
  const key = m ? m.id : `none:${cid}`;
  const isCollapsed = m ? collapsed.has(key) : !collapsed.has(`open:${key}`);
  return `<section class="jc-module ${m && !isPublished(m) ? 'unpublished' : ''}" data-module="${m ? m.id : ''}" aria-label="${esc(m ? m.name : 'Not in a module')}">
    <header class="jc-mod-head" ${m ? 'draggable="true"' : ''}>
      ${m ? `<span class="jc-grip" aria-hidden="true">${icon('grip')}</span>` : ''}
      <button class="jc-caret" data-collapse="${key}" aria-expanded="${!isCollapsed}" aria-label="${isCollapsed ? 'Expand' : 'Collapse'} ${esc(m ? m.name : 'unsorted items')}">${icon(isCollapsed ? 'caretR' : 'caretD')}</button>
      <h2 class="jc-mod-name">${esc(m ? m.name : 'Not in a module')}</h2>
      ${m ? '' : `<span class="muted small">${plural(items.length, 'item')} · drag them into a module</span>`}
      <span class="spacer"></span>
      ${m ? `${pubBtn('module', m)}
        <button class="icon-btn btn-sm" data-add-item="${m.id}" aria-label="Add item to ${esc(m.name)}" title="Add item">${icon('plus')}</button>
        <button class="icon-btn btn-sm" data-mod-menu="${m.id}" aria-label="Options for ${esc(m.name)}" aria-haspopup="menu">${icon('more')}</button>` : ''}
    </header>
    ${isCollapsed ? '' : `<ul class="jc-items" data-drop-module="${m ? m.id : ''}">${items.length ? items.map(it => itemRow(it, cid)).join('') : `<li class="jc-empty-mod">${m ? 'No items yet. Click + to add one, or drag items here.' : 'Everything is in a module.'}</li>`}</ul>`}
  </section>`;
}

function courseNav(cid, view) {
  return `<nav class="jc-course-nav" aria-label="Course navigation"><ul>
    ${SECTIONS.map(([k, label]) => `<li><a href="#/jcanvas/${cid}${k === 'modules' ? '' : '/' + k}" ${view === k ? 'aria-current="page"' : ''}>${label}</a></li>`).join('')}
  </ul></nav>`;
}

function shell(cid, crumb, body, view) {
  const c = course(cid);
  return `<div class="jc">
    <div class="jc-crumbs"><a href="#/jcanvas">${icon('jcanvas')} [JCanvas]</a><span aria-hidden="true">›</span><a href="#/jcanvas/${cid}">${esc(c?.code || 'Course')}</a>${crumb ? `<span aria-hidden="true">›</span><span>${esc(crumb)}</span>` : ''}</div>
    <div class="jc-body">${courseNav(cid, view)}<div class="jc-main">${body}</div></div></div>`;
}

// ---------- views ----------
function dashboard(main) {
  const cs = courses();
  main.innerHTML = `<div class="jc"><div class="page-head"><h1>[JCanvas] Dashboard</h1><span class="spacer"></span><button class="btn btn-sm" id="jc-add-course">${icon('plus')} Course</button></div>
    ${store.isLoading('course') ? skeletonRows(3) : cs.length ? `<ul class="jc-cards">${cs.map(c => {
      const mods = modulesOf(c.id).length, items = store.where('item', i => i.courseId === c.id).length;
      return `<li><a class="jc-card" href="#/jcanvas/${c.id}"><span class="jc-card-color" style="background:${esc(c.color)}"></span>
        <span class="jc-card-body"><strong class="jc-card-title">${esc(c.code)} ${esc(c.name)}</strong>
        <span class="muted small">${esc(c.description || '')}</span><span class="small">${plural(mods, 'module')} · ${plural(items, 'item')}</span></span></a></li>`;
    }).join('')}</ul>` : emptyState('No courses yet', 'Courses are shared with the Calendar. Add one to start building modules.', `<button class="btn btn-primary" id="jc-add-course2">${icon('plus')} Add course</button>`)}</div>`;
}

function modulesView(main, cid) {
  const mods = modulesOf(cid);
  const body = `<div class="jc-toolbar"><h1 class="sr-only">Modules</h1><span class="spacer"></span>
      <button class="btn btn-sm" data-collapse-all="${mods.length && mods.every(m => collapsed.has(m.id)) ? 'expand' : 'collapse'}">${mods.length && mods.every(m => collapsed.has(m.id)) ? 'Expand All' : 'Collapse All'}</button>
      <button class="btn btn-primary btn-sm" id="jc-add-module">${icon('plus')} Module</button></div>
    ${mods.length ? '' : emptyState('No modules yet', 'Modules organize your course week by week. Click + Module to create the first one.')}
    ${mods.map(m => moduleBlock(m, cid)).join('')}
    ${itemsIn(cid, null).length ? moduleBlock(null, cid) : ''}`;
  main.innerHTML = shell(cid, 'Modules', body, 'modules');
}

function sectionView(main, cid, view) {
  const types = SECTION_TYPES[view]; const label = SECTIONS.find(([k]) => k === view)[1];
  const list = store.where('item', i => i.courseId === cid && types.includes(i.type)).sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || a.name.localeCompare(b.name));
  const body = `<div class="jc-toolbar"><h1 class="jc-section-title">${label}</h1></div>
    ${list.length ? `<ul class="jc-items jc-flat">${list.map(it => itemRow({ ...it, indent: 0 }, cid)).join('')}</ul>`
      : emptyState(`No ${label.toLowerCase()}`, 'Add them from Modules with the + button on a module.')}`;
  main.innerHTML = shell(cid, label, body, view);
}

function renderSidebar(el, r) {
  const cs = courses();
  el.innerHTML = `<div class="ctx-section"><div class="ctx-head"><h2 class="ctx-title">[JCanvas]</h2></div><ul class="ctx-list">
      <li><a class="ctx-item" href="#/jcanvas" ${r.view === 'dashboard' ? 'aria-current="true"' : ''}>${icon('jcanvas')}<span class="label">Dashboard</span></a></li></ul></div>
    <div class="ctx-section"><div class="ctx-head"><h2 class="ctx-title">Courses</h2></div>
      ${cs.length ? `<ul class="ctx-list">${cs.map(c => `<li><a class="ctx-item" href="#/jcanvas/${c.id}" ${r.cid === c.id ? 'aria-current="true"' : ''}><span class="dot" style="background:${esc(c.color)}"></span><span class="label">${esc(c.code)} <span class="muted">${esc(c.name)}</span></span><span class="meta">${modulesOf(c.id).length || ''}</span></a></li>`).join('')}</ul>` : '<p class="ctx-empty">No courses yet.</p>'}</div>`;
}

function render(main, ctx) {
  const r = parse(ctx.params);
  ctx.route = r;
  renderSidebar(ctx.sidebar, r);
  if (r.view === 'dashboard') return dashboard(main);
  if (!course(r.cid)) { main.innerHTML = store.isLoading('course') ? skeletonRows(4) : emptyState('Course not found', 'It may have been deleted.', '<a class="btn" href="#/jcanvas">Dashboard</a>'); return; }
  if (r.view === 'modules') return modulesView(main, r.cid);
  if (r.view === 'item' || r.view === 'edit') {
    const it = store.get('item', r.id);
    main.innerHTML = shell(r.cid, it?.name || 'Item', '<div id="jc-page"></div>', '');
    const host = main.querySelector('#jc-page');
    return r.view === 'edit' ? renderEdit(host, r.cid, r.id) : renderItem(host, r.cid, r.id);
  }
  return sectionView(main, r.cid, r.view);
}

// ---------- interactions ----------
function itemMenu(x, y, it) {
  const ind = it.indent || 0;
  contextMenu(x, y, [
    ...(it.type !== 'Text Header' ? [{ label: 'Edit', icon: 'edit', action: () => { location.hash = `#/jcanvas/${it.courseId}/item/${it.id}/edit`; } }] : [{ label: 'Rename', icon: 'edit', action: async () => { const v = await formDialog({ title: 'Edit header', fields: [{ name: 'name', label: 'Header', value: it.name, required: true }] }); if (v) store.update('item', it.id, { name: v.name }); } }]),
    { label: 'Increase indent', icon: 'chevR', action: () => { if (ind < MAX_INDENT) store.update('item', it.id, { indent: ind + 1 }); } },
    { label: 'Decrease indent', icon: 'chevL', action: () => { if (ind > 0) store.update('item', it.id, { indent: ind - 1 }); } },
    { label: 'Move to…', icon: 'folder', action: () => moveItemDialog(it) },
    { label: 'Duplicate', icon: 'page', action: () => duplicateItem(it) },
    ...(it.moduleId ? [{ label: 'Remove from module', icon: 'x', action: () => store.update('item', it.id, { moduleId: null }) }] : []),
    'sep',
    { label: 'Delete…', icon: 'trash', danger: true, action: () => removeItem(it) },
  ], `${it.name} options`);
}
function moduleMenu(x, y, m) {
  const mods = modulesOf(m.courseId); const i = mods.findIndex(z => z.id === m.id);
  contextMenu(x, y, [
    { label: 'Edit', icon: 'edit', action: () => moduleDialog(m.courseId, m) },
    { label: 'Add item…', icon: 'plus', action: () => addItemDialog(m.courseId, m.id) },
    ...(i > 0 ? [{ label: 'Move up', icon: 'chevL', action: () => store.update('module', m.id, { order: orderBetween(mods[i - 2], mods[i - 1]) }) }] : []),
    ...(i < mods.length - 1 ? [{ label: 'Move down', icon: 'chevR', action: () => store.update('module', m.id, { order: orderBetween(mods[i + 1], mods[i + 2]) }) }] : []),
    { label: 'Publish all items', icon: 'publish', action: () => itemsIn(m.courseId, m.id).filter(it => !isPublished(it)).forEach(it => store.update('item', it.id, { published: true })) },
    'sep',
    { label: 'Delete…', icon: 'trash', danger: true, action: () => deleteModule(m) },
  ], `${m.name} options`);
}
async function deleteModule(m) {
  const items = itemsIn(m.courseId, m.id);
  const loose = items.filter(i => ['Text Header', 'External URL', 'External Tool'].includes(i.type));
  if (!await confirmDialog({ title: 'Delete module?', message: `Delete "${m.name}"? ${items.length - loose.length ? `Its ${plural(items.length - loose.length, 'assignment, quiz, page or file', 'assignments, quizzes, pages and files')} stay in the course under "Not in a module". ` : ''}${loose.length ? `${plural(loose.length, 'header or link')} in it will be deleted. ` : ''}You can restore from Settings.` })) return;
  loose.forEach(i => store.remove('item', i.id));
  items.filter(i => !loose.includes(i)).forEach(i => store.update('item', i.id, { moduleId: null }));
  store.remove('module', m.id); toast('Module deleted (queued).');
}

function bindDrag(main, ctx) {
  let drag = null; // {kind:'item'|'module', id}
  const clear = () => main.querySelectorAll('.drop-before,.drop-after,.drop-into,.dragging').forEach(e => e.classList.remove('drop-before', 'drop-after', 'drop-into', 'dragging'));
  ctx.listen(main, 'dragstart', (e) => {
    const row = e.target.closest?.('.jc-item'); const head = e.target.closest?.('.jc-mod-head');
    if (row && e.target.closest('.jc-grip')) { drag = { kind: 'item', id: row.dataset.item }; row.classList.add('dragging'); e.dataTransfer.setDragImage(row, 12, 12); }
    else if (head && head.getAttribute('draggable') === 'true' && !row) { drag = { kind: 'module', id: head.parentElement.dataset.module }; head.parentElement.classList.add('dragging'); }
    else { e.preventDefault(); return; }
    e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', drag.id);
  });
  ctx.listen(main, 'dragover', (e) => {
    if (!drag) return;
    main.querySelectorAll('.drop-before,.drop-after,.drop-into').forEach(x => x.classList.remove('drop-before', 'drop-after', 'drop-into'));
    if (drag.kind === 'item') {
      const row = e.target.closest('.jc-item');
      if (row && row.dataset.item !== drag.id) { e.preventDefault(); const r = row.getBoundingClientRect(); row.classList.add(e.clientY < r.top + r.height / 2 ? 'drop-before' : 'drop-after'); return; }
      const mod = e.target.closest('.jc-module'); if (mod) { e.preventDefault(); mod.classList.add('drop-into'); }
    } else {
      const mod = e.target.closest('.jc-module[data-module]:not([data-module=""])');
      if (mod && mod.dataset.module !== drag.id) { e.preventDefault(); const r = mod.getBoundingClientRect(); mod.classList.add(e.clientY < r.top + r.height / 2 ? 'drop-before' : 'drop-after'); }
    }
  });
  ctx.listen(main, 'dragend', () => { drag = null; clear(); });
  ctx.listen(main, 'drop', (e) => {
    if (!drag) return; e.preventDefault();
    const d = drag; drag = null;
    const before = !!main.querySelector('.drop-before'); const cid = ctx.route.cid;
    if (d.kind === 'item') {
      const row = main.querySelector('.jc-item.drop-before, .jc-item.drop-after');
      const into = main.querySelector('.jc-module.drop-into');
      clear();
      if (row) {
        const target = store.get('item', row.dataset.item); const mid = target.moduleId && store.get('module', target.moduleId) ? target.moduleId : null;
        let list = itemsIn(cid, mid).filter(i => i.id !== d.id);
        if (list.some(i => i.order == null)) { normalizeOrder(list); list = itemsIn(cid, mid).filter(i => i.id !== d.id); }
        const ti = list.findIndex(i => i.id === target.id);
        const [a, b] = before ? [list[ti - 1], list[ti]] : [list[ti], list[ti + 1]];
        store.update('item', d.id, { moduleId: mid, order: orderBetween(a, b) });
      } else if (into) {
        const mid = into.dataset.module || null;
        store.update('item', d.id, { moduleId: mid, order: nextOrder(itemsIn(cid, mid).filter(i => i.id !== d.id)) });
      }
    } else {
      const mod = main.querySelector('.jc-module.drop-before, .jc-module.drop-after'); clear(); if (!mod) return;
      const list = modulesOf(cid).filter(m => m.id !== d.id); const ti = list.findIndex(m => m.id === mod.dataset.module);
      const [a, b] = before ? [list[ti - 1], list[ti]] : [list[ti], list[ti + 1]];
      store.update('module', d.id, { order: orderBetween(a, b) });
    }
  });
}

export default {
  mount(main, ctx) {
    const draw = ctx.guard(() => render(main, ctx));
    draw();
    ctx.on('change', (t) => { if (['item', 'module', 'course'].includes(t) && ctx.route?.view !== 'edit') draw(); else if (t === 'course') renderSidebar(ctx.sidebar, ctx.route); });
    bindDrag(main, ctx);
    ctx.listen(main, 'click', async (e) => {
      const t = e.target;
      if (t.closest('#jc-add-course, #jc-add-course2')) { courseDialog(); return; }
      if (t.closest('#jc-add-module')) { moduleDialog(ctx.route.cid); return; }
      const ca = t.closest('[data-collapse-all]');
      if (ca) { const mods = modulesOf(ctx.route.cid); mods.forEach(m => ca.dataset.collapseAll === 'collapse' ? collapsed.add(m.id) : collapsed.delete(m.id)); saveCollapsed(); draw(); return; }
      const col = t.closest('[data-collapse]');
      if (col) { const k = col.dataset.collapse; const virtual = k.startsWith('none:'); const key = virtual ? `open:${k}` : k; collapsed.has(key) ? collapsed.delete(key) : collapsed.add(key); saveCollapsed(); draw(); main.querySelector(`[data-collapse="${CSS.escape(k)}"]`)?.focus(); return; }
      const pub = t.closest('[data-pub]');
      if (pub) { const [kind, id] = pub.dataset.pub.split(':'); const r = store.get(kind, id); if (r) store.update(kind, id, { published: !isPublished(r) }); return; }
      const add = t.closest('[data-add-item]'); if (add) { addItemDialog(ctx.route.cid, add.dataset.addItem); return; }
      const im = t.closest('[data-item-menu]'); if (im) { const r = im.getBoundingClientRect(); const it = store.get('item', im.dataset.itemMenu); if (it) itemMenu(r.left - 150, r.bottom + 4, it); return; }
      const mm = t.closest('[data-mod-menu]'); if (mm) { const r = mm.getBoundingClientRect(); const m = store.get('module', mm.dataset.modMenu); if (m) moduleMenu(r.left - 150, r.bottom + 4, m); return; }
      const done = t.closest('[data-done]'); if (done) { const it = store.get('item', ctx.route.id); if (it) store.update('item', it.id, { completed: !it.completed }); return; }
      const dl = t.closest('[data-download]'); if (dl) { const it = store.get('item', ctx.route.id); downloadFile(dl.dataset.download, it?.fileName); }
    });
    ctx.listen(main, 'contextmenu', (e) => {
      const row = e.target.closest('.jc-item'); if (row) { e.preventDefault(); const it = store.get('item', row.dataset.item); if (it) itemMenu(e.clientX, e.clientY, it); return; }
      const head = e.target.closest('.jc-mod-head'); const m = head && store.get('module', head.parentElement.dataset.module);
      if (m) { e.preventDefault(); moduleMenu(e.clientX, e.clientY, m); }
    });
    // Keyboard indent on a focused item link: Alt+→ / Alt+←
    ctx.listen(main, 'keydown', (e) => {
      const row = e.target.closest?.('.jc-item'); if (!row || !e.altKey) return;
      const it = store.get('item', row.dataset.item); if (!it) return;
      if (e.key === 'ArrowRight' && (it.indent || 0) < MAX_INDENT) { e.preventDefault(); store.update('item', it.id, { indent: (it.indent || 0) + 1 }); }
      if (e.key === 'ArrowLeft' && (it.indent || 0) > 0) { e.preventDefault(); store.update('item', it.id, { indent: it.indent - 1 }); }
    });
  },
  update(params, ctx) { ctx.params = params; render(ctx.main, ctx); window.scrollTo(0, 0); },
};

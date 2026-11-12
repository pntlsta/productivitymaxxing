// Toasts, dialogs (native <dialog> for focus trapping + aria-modal), context menus, skeletons.
import { esc } from './util.js';
import { icon } from './icons.js';

// ---------- Toasts ----------
let toastHost;
export function toast(message, type = 'info', ms = 3500) {
  if (!toastHost) {
    toastHost = document.createElement('div');
    toastHost.className = 'toasts';
    toastHost.setAttribute('role', 'status');
    toastHost.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastHost);
  }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  if (type === 'error') t.setAttribute('role', 'alert');
  t.innerHTML = `<span class="msg">${esc(message)}</span><button class="icon-btn btn-sm" aria-label="Dismiss" style="width:1.5rem;height:1.5rem">${icon('x')}</button>`;
  const close = () => t.remove();
  t.querySelector('button').onclick = close;
  toastHost.appendChild(t);
  if (ms) setTimeout(close, type === 'error' ? ms * 2 : ms);
  return close;
}

// ---------- Dialog ----------
let dlgSeq = 0;
export function openDialog({ title, body = '', foot = '', wide = false, onClose, form = false, label }) {
  const prevFocus = document.activeElement;
  const dlg = document.createElement('dialog');
  const id = `dlg-${++dlgSeq}`;
  dlg.className = `dlg${wide ? ' wide' : ''}`;
  dlg.setAttribute('aria-labelledby', `${id}-title`);
  const wrapTag = form ? 'form' : 'div';
  dlg.innerHTML = `<${wrapTag} class="dlg-body-wrap" ${form ? 'novalidate' : ''}>
    <div class="dlg-head"><h2 id="${id}-title">${esc(title)}</h2>
      <button type="button" class="icon-btn" data-close aria-label="Close dialog">${icon('x')}</button></div>
    <div class="dlg-body"></div>
    ${foot ? `<div class="dlg-foot">${foot}</div>` : ''}
  </${wrapTag}>`;
  if (label) dlg.setAttribute('aria-label', label);
  const bodyEl = dlg.querySelector('.dlg-body');
  if (typeof body === 'string') bodyEl.innerHTML = body; else bodyEl.appendChild(body);
  document.body.appendChild(dlg);
  let closed = false;
  const close = (result) => {
    if (closed) return; closed = true;
    dlg.close(); dlg.remove();
    if (prevFocus && prevFocus.focus) prevFocus.focus();
    onClose?.(result);
  };
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(null); });
  dlg.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) close(null);
    else if (e.target === dlg) { // backdrop click
      const r = dlg.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close(null);
    }
  });
  dlg.showModal();
  const first = dlg.querySelector('[autofocus], .dlg-body input, .dlg-body textarea, .dlg-body select, .dlg-foot .btn-primary, .dlg-foot .btn');
  first?.focus();
  return { dlg, body: bodyEl, close };
}

// ---------- Confirm ----------
export function confirmDialog({ title = 'Are you sure?', message = '', confirmText = 'Delete', danger = true, phrase = null }) {
  return new Promise((resolve) => {
    const body = `<p>${esc(message)}</p>${phrase ? `<div class="field"><label for="cf-phrase">Type <strong>${esc(phrase)}</strong> to confirm</label><input id="cf-phrase" class="input" autocomplete="off" spellcheck="false"></div>` : ''}`;
    const foot = `<button type="button" class="btn" data-close>Cancel</button><button type="submit" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok ${phrase ? 'disabled' : ''}>${esc(confirmText)}</button>`;
    const { dlg, close } = openDialog({ title, body, foot, form: true, onClose: (r) => resolve(!!r) });
    const ok = dlg.querySelector('[data-ok]');
    const inp = dlg.querySelector('#cf-phrase');
    if (inp) { inp.focus(); inp.addEventListener('input', () => { ok.disabled = inp.value.trim() !== phrase; }); }
    else ok.focus();
    dlg.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); if (!ok.disabled) close(true); });
  });
}

// ---------- Form dialog ----------
// fields: [{name,label,type,value,options:[{value,label}],required,hint,placeholder,validate(v, values)}]
export function formDialog({ title, fields, submitText = 'Save', wide = false, intro = '' }) {
  return new Promise((resolve) => {
    const html = (intro ? `<p class="muted">${esc(intro)}</p>` : '') + fields.map((f, i) => {
      const id = `ff-${dlgSeq + 1}-${i}`;
      const common = `id="${id}" name="${esc(f.name)}" ${f.required ? 'required aria-required="true"' : ''} aria-describedby="${id}-err"`;
      let ctl;
      if (f.type === 'textarea') ctl = `<textarea class="input" ${common} rows="${f.rows || 5}" placeholder="${esc(f.placeholder || '')}">${esc(f.value ?? '')}</textarea>`;
      else if (f.type === 'select') ctl = `<select class="input" ${common}>${f.options.map(o => `<option value="${esc(o.value)}" ${String(o.value) === String(f.value ?? '') ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
      else if (f.type === 'checkbox') return `<label class="check field"><input type="checkbox" ${common} ${f.value ? 'checked' : ''}> ${esc(f.label)}</label>`;
      else ctl = `<input class="input" type="${f.type || 'text'}" ${common} value="${esc(f.value ?? '')}" placeholder="${esc(f.placeholder || '')}" ${f.step ? `step="${f.step}"` : ''} ${f.min != null ? `min="${f.min}"` : ''} autocomplete="off">`;
      return `<div class="field"><label for="${id}">${esc(f.label)}</label>${ctl}${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ''}<span class="error" id="${id}-err" role="alert"></span></div>`;
    }).join('');
    const foot = `<button type="button" class="btn" data-close>Cancel</button><button type="submit" class="btn btn-primary">${esc(submitText)}</button>`;
    const { dlg, close } = openDialog({ title, body: html, foot, form: true, wide, onClose: (r) => resolve(r) });
    const form = dlg.querySelector('form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const values = {};
      fields.forEach(f => {
        const el = form.elements[f.name];
        values[f.name] = f.type === 'checkbox' ? el.checked : (f.type === 'number' ? (el.value === '' ? null : Number(el.value)) : el.value.trim?.() ?? el.value);
      });
      let firstBad = null;
      fields.forEach(f => {
        const el = form.elements[f.name]; if (f.type === 'checkbox') return;
        let err = '';
        if (f.required && (values[f.name] === '' || values[f.name] == null)) err = `${f.label} is required.`;
        else if (f.validate) err = f.validate(values[f.name], values) || '';
        el.setAttribute('aria-invalid', err ? 'true' : 'false');
        el.parentElement.querySelector('.error').textContent = err;
        if (err && !firstBad) firstBad = el;
      });
      if (firstBad) { firstBad.focus(); return; }
      close(values);
    });
  });
}

// ---------- Context menu ----------
let openMenuEl = null;
export function closeMenu() { if (openMenuEl) { openMenuEl.remove(); openMenuEl = null; } }
// items: [{label, action, danger, icon}] or 'sep'
export function contextMenu(x, y, items, label = 'Actions') {
  closeMenu();
  const prev = document.activeElement;
  const m = document.createElement('div');
  m.className = 'menu'; m.setAttribute('role', 'menu'); m.setAttribute('aria-label', label);
  m.innerHTML = items.map((it, i) => it === 'sep' ? '<hr>' :
    `<button role="menuitem" tabindex="-1" data-i="${i}" class="${it.danger ? 'danger' : ''}">${it.icon ? icon(it.icon) : ''}${esc(it.label)}</button>`).join('');
  document.body.appendChild(m);
  const r = m.getBoundingClientRect();
  m.style.left = `${Math.min(x, innerWidth - r.width - 8)}px`;
  m.style.top = `${Math.min(y, innerHeight - r.height - 8)}px`;
  openMenuEl = m;
  const buttons = [...m.querySelectorAll('[role=menuitem]')];
  buttons[0]?.focus();
  m.addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]'); if (!b) return;
    closeMenu(); prev?.focus?.();
    items[+b.dataset.i].action();
  });
  m.addEventListener('keydown', (e) => {
    const idx = buttons.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); buttons[(idx + 1) % buttons.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); buttons[(idx - 1 + buttons.length) % buttons.length].focus(); }
    else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); closeMenu(); prev?.focus?.(); }
  });
  setTimeout(() => {
    const off = (e) => { if (!m.contains(e.target)) { closeMenu(); document.removeEventListener('pointerdown', off, true); } };
    document.addEventListener('pointerdown', off, true);
  });
  return m;
}

export function skeletonRows(n = 4, cls = 'skeleton-row') {
  return `<div aria-busy="true" aria-label="Loading">${Array.from({ length: n }, () => `<div class="skeleton ${cls}"></div>`).join('')}</div>`;
}

export function emptyState(title, line, action = '') {
  return `<div class="empty"><strong>${esc(title)}</strong><span>${esc(line)}</span>${action ? `<div style="margin-top:var(--space-3)">${action}</div>` : ''}</div>`;
}

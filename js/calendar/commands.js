// Calendar command bar: tokenizer, parser/executor, autocomplete, help panel.
import * as store from '../core/store.js';
import { esc, fmtShort } from '../core/util.js';
import { icon } from '../core/icons.js';
import { openDialog } from '../core/ui.js';
import { ITEM_TYPES, courses, courseByCode, compactCode, itemsOf, matchType, parseDate, typeKey } from './model.js';

export const HELP = [
  { syntax: 'add <type> <course> "<name>" <points> [avail M/D] [due M/D]', ex: ['add project grd463 "Final Portfolio" 100 due 12/10', 'add assignment grd463 "Chapter 8 Quiz" 25 avail 11/12 due 11/17'] },
  { syntax: 'delete [type] <course> "<name>"', ex: ['delete assignment grd463 "Chapter 8 Quiz"'] },
  { syntax: 'change <course> "<name>" <due|avail|points|name|type> <value>', ex: ['change grd463 "Final Portfolio" due 12/15', 'change grd463 "Final Portfolio" points 120', 'change grd463 "Final Portfolio" avail none'] },
  { syntax: 'complete <course> "<name>"', ex: ['complete grd463 "Final Portfolio"'] },
  { syntax: 'uncomplete <course> "<name>"', ex: ['uncomplete grd463 "Final Portfolio"'] },
];
const VERBS = ['add', 'delete', 'change', 'complete', 'uncomplete'];
const FIELDS = ['due', 'avail', 'points', 'name', 'type'];
const TYPE_WORDS = ['project', 'assignment', 'discussion', 'quiz', 'notgraded'];

export function tokenize(str) {
  const toks = []; let i = 0;
  while (i < str.length) {
    if (/\s/.test(str[i])) { i++; continue; }
    const start = i;
    if (str[i] === '"' || str[i] === '“') {
      i++; let text = '';
      while (i < str.length && str[i] !== '"' && str[i] !== '”') text += str[i++];
      const open = i >= str.length; if (!open) i++;
      toks.push({ text, quoted: true, open, start, end: i });
    } else {
      let text = '';
      while (i < str.length && !/\s/.test(str[i])) text += str[i++];
      toks.push({ text, quoted: false, start, end: i });
    }
  }
  return toks;
}

class CmdError extends Error {}
const fail = (m) => { throw new CmdError(m); };
function needCourse(tok) {
  if (!tok) fail('Missing course code (e.g. grd463).');
  const c = courseByCode(tok.text);
  if (!c) fail(`No course "${tok.text}". Known: ${courses().map(x => compactCode(x.code)).join(', ') || 'none — add a course first'}.`);
  return c;
}
function needName(tok) {
  if (!tok || !tok.text) fail('Missing item name. Put it in quotes, e.g. "Final Portfolio".');
  if (tok.open) fail('Missing closing quote on the item name.');
  return tok.text.trim();
}
function needItem(c, name, type) {
  const matches = itemsOf(c.id).filter(i => i.name.toLowerCase() === name.toLowerCase() && (!type || i.type === type));
  if (!matches.length) fail(`No ${type ? type.toLowerCase() + ' ' : 'item '}"${name}" in ${c.code}.`);
  if (matches.length > 1) fail(`"${name}" matches ${matches.length} items in ${c.code}; rename one first.`);
  return matches[0];
}
function needDate(tok, what) {
  if (!tok) fail(`Missing ${what} date (M/D).`);
  const d = parseDate(tok.text);
  if (!d) fail(`"${tok.text}" is not a valid ${what} date. Use M/D or M/D/YYYY.`);
  return d;
}

/** Parse + execute. Returns a success message, throws CmdError with a user-facing message. */
export function run(input) {
  const t = tokenize(input.trim());
  if (!t.length) fail('Type a command, or click (i) for help.');
  const verb = t[0].text.toLowerCase();
  if (!VERBS.includes(verb)) fail(`Unknown command "${t[0].text}". Try: ${VERBS.join(', ')}.`);

  if (verb === 'add') {
    const type = t[1] && matchType(t[1].text);
    if (!type) fail(`Missing or unknown type. Use one of: ${TYPE_WORDS.join(', ')}.`);
    const c = needCourse(t[2]);
    const name = needName(t[3]);
    if (!t[4] || !/^\d+(\.\d+)?$/.test(t[4].text)) fail('Missing points (a number) after the name.');
    const points = Number(t[4].text);
    let availDate = null, dueDate = null;
    for (let i = 5; i < t.length; i += 2) {
      const k = t[i].text.toLowerCase();
      if (k === 'due') dueDate = needDate(t[i + 1], 'due');
      else if (k === 'avail' || k === 'available') availDate = needDate(t[i + 1], 'available');
      else fail(`Unexpected "${t[i].text}". Expected "avail" or "due".`);
    }
    if (availDate && dueDate && dueDate < availDate) fail('Due date is before the available date.');
    if (itemsOf(c.id).some(i => i.name.toLowerCase() === name.toLowerCase())) fail(`${c.code} already has an item named "${name}".`);
    store.create('item', { courseId: c.id, name, type, points, availDate, dueDate, completed: false });
    return `Added ${type.toLowerCase()} "${name}" to ${c.code}${dueDate ? `, due ${fmtShort(dueDate)}` : ''}.`;
  }
  if (verb === 'delete') {
    let i = 1; let type = null;
    if (t[1] && !t[1].quoted && matchType(t[1].text) && !courseByCode(t[1].text)) { type = matchType(t[1].text); i = 2; }
    const c = needCourse(t[i]); const it = needItem(c, needName(t[i + 1]), type);
    if (t.length > i + 2) fail(`Unexpected "${t[i + 2].text}" after the name.`);
    store.remove('item', it.id);
    return `Deleted "${it.name}" from ${c.code}. Restore it from Settings if needed.`;
  }
  if (verb === 'change') {
    const c = needCourse(t[1]); const it = needItem(c, needName(t[2]));
    const field = t[3]?.text.toLowerCase();
    if (!FIELDS.includes(field)) fail(`What should change? Use one of: ${FIELDS.join(', ')}.`);
    const valTok = t[4]; if (!valTok) fail(`Missing new ${field} value.`);
    let patch;
    if (field === 'due' || field === 'avail') {
      const key = field === 'due' ? 'dueDate' : 'availDate';
      const v = valTok.text.toLowerCase() === 'none' ? null : needDate(valTok, field === 'due' ? 'due' : 'available');
      patch = { [key]: v };
      const next = { ...it, ...patch };
      if (next.availDate && next.dueDate && next.dueDate < next.availDate) fail('Due date would be before the available date.');
    } else if (field === 'points') {
      if (!/^\d+(\.\d+)?$/.test(valTok.text)) fail('Points must be a number.');
      patch = { points: Number(valTok.text) };
    } else if (field === 'type') {
      const ty = matchType(valTok.text); if (!ty) fail(`Unknown type. Use one of: ${TYPE_WORDS.join(', ')}.`);
      patch = { type: ty };
    } else {
      const nm = needName(valTok);
      if (itemsOf(c.id).some(x => x.id !== it.id && x.name.toLowerCase() === nm.toLowerCase())) fail(`${c.code} already has an item named "${nm}".`);
      patch = { name: nm };
    }
    store.update('item', it.id, patch);
    return `Changed ${field} of "${it.name}" in ${c.code}.`;
  }
  // complete / uncomplete
  const c = needCourse(t[1]); const it = needItem(c, needName(t[2]));
  const done = verb === 'complete';
  store.update('item', it.id, { completed: done });
  return `Marked "${it.name}" ${done ? 'complete' : 'not complete'}.`;
}

// ---------- Autocomplete ----------
/** Suggestions for the token being typed at the end of `input`. */
export function suggest(input) {
  const t = tokenize(input);
  const endsWithSpace = /\s$/.test(input) && !(t.length && t[t.length - 1].open);
  const idx = endsWithSpace ? t.length : Math.max(0, t.length - 1);
  const partial = endsWithSpace ? '' : (t[idx]?.text || '');
  const p = partial.toLowerCase();
  const verb = t[0]?.text.toLowerCase();
  const pick = (list) => list.filter(s => s.value.toLowerCase().startsWith(p) && s.value.toLowerCase() !== p).slice(0, 8);
  const courseSug = () => pick(courses().map(c => ({ value: compactCode(c.code), label: `${c.code} — ${c.name}`, color: c.color })));
  const itemSug = (ct, filter = () => true) => {
    const c = ct && courseByCode(ct.text); if (!c) return [];
    return itemsOf(c.id).filter(filter).filter(i => i.name.toLowerCase().startsWith(p)).slice(0, 8).map(i => ({ value: i.name, label: `${i.name} · ${i.type}`, quote: true, color: c.color }));
  };
  if (idx === 0) return pick(VERBS.map(v => ({ value: v, label: v })));
  if (verb === 'add') {
    if (idx === 1) return pick(TYPE_WORDS.map(v => ({ value: v, label: v })));
    if (idx === 2) return courseSug();
    if (idx >= 5 && (idx - 5) % 2 === 0) return pick(['avail', 'due'].map(v => ({ value: v, label: v })));
    return [];
  }
  if (verb === 'delete') {
    const typed = t[1] && matchType(t[1].text) && !courseByCode(t[1].text);
    if (idx === 1) return [...pick(TYPE_WORDS.map(v => ({ value: v, label: v }))), ...courseSug()];
    if (typed) { if (idx === 2) return courseSug(); if (idx === 3) return itemSug(t[2], i => i.type === matchType(t[1].text)); return []; }
    if (idx === 2) return itemSug(t[1]);
    return [];
  }
  if (verb === 'change' || verb === 'complete' || verb === 'uncomplete') {
    if (idx === 1) return courseSug();
    if (idx === 2) return itemSug(t[1], verb === 'complete' ? i => !i.completed : verb === 'uncomplete' ? i => i.completed : () => true);
    if (verb === 'change' && idx === 3) return pick(FIELDS.map(v => ({ value: v, label: v })));
  }
  return [];
}

/** Replace the token being typed with suggestion `s`. */
export function applySuggestion(input, s) {
  const t = tokenize(input);
  const endsWithSpace = /\s$/.test(input) && !(t.length && t[t.length - 1].open);
  const base = endsWithSpace || !t.length ? input : input.slice(0, t[t.length - 1].start);
  return `${base}${s.quote ? `"${s.value}"` : s.value} `;
}

// ---------- UI ----------
export function mountCommandBar(host, ctx) {
  host.innerHTML = `<div class="cmd-bar" role="search" aria-label="Command bar">
    <div class="cmd-sug menu" role="listbox" id="cmd-sug" hidden aria-label="Suggestions"></div>
    <div class="cmd-row">
      <span class="cmd-prompt" aria-hidden="true">›</span>
      <input class="input cmd-input" id="cmd-input" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="cmd-sug"
        aria-describedby="cmd-msg" placeholder='Type a command, e.g. add project grd463 "Final Portfolio" 100 due 12/10' autocomplete="off" spellcheck="false">
      <button class="btn btn-primary btn-sm" id="cmd-run">Run</button>
      <button class="icon-btn" id="cmd-help" aria-label="Command help" title="Command help">${icon('info')}</button>
    </div>
    <div id="cmd-msg" class="cmd-msg" aria-live="polite"></div>
  </div>`;
  const inp = host.querySelector('#cmd-input'), box = host.querySelector('#cmd-sug'), msg = host.querySelector('#cmd-msg');
  let sugs = [], active = -1;
  const history = []; let hIdx = -1;

  const close = () => { box.hidden = true; sugs = []; active = -1; inp.setAttribute('aria-expanded', 'false'); inp.removeAttribute('aria-activedescendant'); };
  const render = () => {
    sugs = suggest(inp.value);
    if (!sugs.length || document.activeElement !== inp) return close();
    box.innerHTML = sugs.map((s, i) => `<div role="option" id="cmd-opt-${i}" class="${i === active ? 'active' : ''}" aria-selected="${i === active}" data-i="${i}">${s.color ? `<span class="dot" style="background:${esc(s.color)}"></span>` : ''}${esc(s.label)}</div>`).join('');
    box.hidden = false; inp.setAttribute('aria-expanded', 'true');
    if (active >= 0) inp.setAttribute('aria-activedescendant', `cmd-opt-${active}`); else inp.removeAttribute('aria-activedescendant');
  };
  const accept = (i) => { inp.value = applySuggestion(inp.value, sugs[i]); active = -1; inp.focus(); render(); };
  const exec = () => {
    const v = inp.value;
    try {
      const ok = run(v);
      history.unshift(v); hIdx = -1;
      msg.className = 'cmd-msg ok'; msg.textContent = `${ok} Queued — click Save to sync.`;
      inp.value = ''; inp.removeAttribute('aria-invalid'); close();
    } catch (e) {
      if (!(e instanceof CmdError)) throw e;
      msg.className = 'cmd-msg err'; msg.textContent = e.message; inp.setAttribute('aria-invalid', 'true');
    }
  };
  ctx.listen(inp, 'input', () => { active = -1; msg.textContent = ''; inp.removeAttribute('aria-invalid'); render(); });
  ctx.listen(inp, 'focus', render);
  ctx.listen(inp, 'blur', () => setTimeout(close, 150));
  ctx.listen(inp, 'keydown', (e) => {
    const open = !box.hidden && sugs.length;
    if (e.key === 'ArrowDown' && open) { e.preventDefault(); active = (active + 1) % sugs.length; render(); }
    else if (e.key === 'ArrowUp' && open) { e.preventDefault(); active = active <= 0 ? sugs.length - 1 : active - 1; render(); }
    else if (e.key === 'ArrowUp' && history.length) { e.preventDefault(); hIdx = Math.min(hIdx + 1, history.length - 1); inp.value = history[hIdx]; }
    else if (e.key === 'ArrowDown' && hIdx >= 0) { e.preventDefault(); hIdx--; inp.value = hIdx >= 0 ? history[hIdx] : ''; }
    else if (e.key === 'Tab' && open) { e.preventDefault(); accept(active >= 0 ? active : 0); }
    else if (e.key === 'Enter') { e.preventDefault(); if (open && active >= 0) accept(active); else exec(); }
    else if (e.key === 'Escape' && open) { e.preventDefault(); close(); }
  });
  ctx.listen(box, 'mousedown', (e) => { const o = e.target.closest('[data-i]'); if (o) { e.preventDefault(); accept(+o.dataset.i); } });
  ctx.listen(host.querySelector('#cmd-run'), 'click', exec);
  ctx.listen(host.querySelector('#cmd-help'), 'click', showHelp);
}

export function showHelp() {
  const body = `<p class="muted">Commands are queued like any other edit; click <strong>Save</strong> to send them to GitHub.
    Course codes can be typed as <code>grd463</code> or <code>GRD-463</code>. Names go in double quotes. Dates are <code>M/D</code> or <code>M/D/YYYY</code>.</p>
    <dl class="cmd-help">${HELP.map(h => `<dt><code>${esc(h.syntax)}</code></dt>${h.ex.map(x => `<dd><code>${esc(x)}</code></dd>`).join('')}`).join('')}</dl>
    <p class="small muted">Types: ${ITEM_TYPES.map(t => `<code>${typeKey(t)}</code>`).join(', ')}. Keys: <kbd>Tab</kbd> accepts a suggestion, <kbd>↑</kbd>/<kbd>↓</kbd> move through suggestions or recall previous commands, <kbd>Enter</kbd> runs.</p>`;
  openDialog({ title: 'Command syntax', body, wide: true, foot: '<button class="btn btn-primary" data-close>Got it</button>' });
}

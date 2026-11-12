// Block types, per-type rendering, list numbering, and a small syntax highlighter for code blocks.
import { esc, uuid, sanitizeHTML } from '../core/util.js';
import { icon } from '../core/icons.js';

export const BLOCK_TYPES = [
  { type: 'text', label: 'Text', hint: 'Plain paragraph', keys: 'paragraph p' },
  { type: 'h1', label: 'Heading 1', hint: 'Large section heading', keys: 'title #' },
  { type: 'h2', label: 'Heading 2', hint: 'Medium heading', keys: '##' },
  { type: 'h3', label: 'Heading 3', hint: 'Small heading', keys: '###' },
  { type: 'bullet', label: 'Bulleted list', hint: 'Simple bullet list', keys: 'ul unordered -' },
  { type: 'numbered', label: 'Numbered list', hint: 'List with numbers', keys: 'ol ordered 1.' },
  { type: 'todo', label: 'To-do', hint: 'Checkbox item', keys: 'task check checkbox []' },
  { type: 'toggle', label: 'Toggle', hint: 'Collapsible section', keys: 'collapse details' },
  { type: 'quote', label: 'Quote', hint: 'Quotation', keys: 'blockquote >' },
  { type: 'callout', label: 'Callout', hint: 'Highlighted note', keys: 'info tip note' },
  { type: 'divider', label: 'Divider', hint: 'Horizontal rule', keys: 'hr line ---' },
  { type: 'code', label: 'Code', hint: 'Code with highlighting', keys: 'snippet ```' },
  { type: 'image', label: 'Image', hint: 'Upload an image', keys: 'picture photo img' },
  { type: 'table', label: 'Table', hint: 'Simple grid', keys: 'grid' },
];
export const TEXTUAL = new Set(['text', 'h1', 'h2', 'h3', 'bullet', 'numbered', 'todo', 'toggle', 'quote', 'callout']);
export const LISTS = new Set(['bullet', 'numbered', 'todo']);
export const LANGS = ['plain', 'javascript', 'typescript', 'python', 'html', 'css', 'json', 'bash', 'sql'];

export function newBlock(type = 'text', extra = {}) {
  const b = { id: uuid(), type, html: '' };
  if (type === 'todo') b.checked = false;
  if (type === 'toggle') { b.open = true; b.body = ''; }
  if (type === 'callout') b.emoji = '💡';
  if (type === 'code') { b.code = ''; b.lang = 'javascript'; delete b.html; }
  if (type === 'table') { b.rows = [['', ''], ['', '']]; delete b.html; }
  if (type === 'image') { b.imageKey = null; b.caption = ''; delete b.html; }
  if (type === 'divider') delete b.html;
  return Object.assign(b, extra);
}

/** Convert a block to another type, keeping its text where it makes sense. */
export function convertBlock(b, type) {
  const text = TEXTUAL.has(b.type) ? b.html : b.type === 'code' ? esc(b.code || '') : '';
  const nb = newBlock(type, { id: b.id });
  if (TEXTUAL.has(type)) nb.html = text;
  if (type === 'code') nb.code = htmlToText(text);
  if (LISTS.has(type) && LISTS.has(b.type)) nb.indent = b.indent || 0;
  return nb;
}
export function htmlToText(html) { const d = document.createElement('div'); d.innerHTML = (html || '').replace(/<br\s*\/?>/gi, '\n'); return d.textContent; }

// ---------- syntax highlighting ----------
const KW = {
  javascript: 'await break case catch class const continue debugger default delete do else export extends false finally for from function if import in instanceof let new null of return static super switch this throw true try typeof undefined var void while with yield async',
  python: 'and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield self print',
  css: 'important media import keyframes from to root',
  json: 'true false null',
  bash: 'if then else elif fi for while do done case esac function in echo export local return cd source sudo',
  sql: 'select from where and or not insert into values update set delete create table drop alter join left right inner outer on group by order having limit as distinct null is in like union primary key',
};
KW.typescript = KW.javascript + ' interface type enum implements private public protected readonly declare namespace abstract as keyof never unknown any string number boolean';
const kwSets = Object.fromEntries(Object.entries(KW).map(([k, v]) => [k, new Set(v.split(' '))]));

export function highlight(code, lang) {
  if (!code) return '';
  if (lang === 'plain' || !lang) return esc(code);
  if (lang === 'html') {
    return esc(code).replace(/(&lt;!--[\s\S]*?--&gt;)|(&lt;\/?)([\w-]+)([^&]*?)(\/?&gt;)/g, (m, com, open, tag, attrs, close) => com
      ? `<span class="tk-c">${com}</span>`
      : `${open}<span class="tk-k">${tag}</span>${attrs.replace(/([\w-:]+)(=)(&quot;.*?&quot;|&#39;.*?&#39;)/g, '<span class="tk-f">$1</span>$2<span class="tk-s">$3</span>')}${close}`);
  }
  const lineCom = lang === 'python' || lang === 'bash' ? '#' : lang === 'sql' ? '--' : lang === 'css' || lang === 'json' ? null : '//';
  const kws = kwSets[lang] || new Set();
  let out = ''; let i = 0;
  const push = (cls, s) => { out += cls ? `<span class="tk-${cls}">${esc(s)}</span>` : esc(s); };
  while (i < code.length) {
    const rest = code.slice(i);
    let m;
    if (lineCom && rest.startsWith(lineCom)) { const e = code.indexOf('\n', i); const s = e < 0 ? rest : code.slice(i, e); push('c', s); i += s.length; continue; }
    if (lang !== 'python' && lang !== 'bash' && rest.startsWith('/*')) { const e = code.indexOf('*/', i + 2); const s = e < 0 ? rest : code.slice(i, e + 2); push('c', s); i += s.length; continue; }
    if ((m = /^("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?|`(?:\\.|[^`\\])*`?)/.exec(rest))) { push('s', m[0]); i += m[0].length; continue; }
    if ((m = /^(0x[\da-f]+|\d+\.?\d*(?:e[+-]?\d+)?)/i.exec(rest)) && !/[\w$]/.test(code[i - 1] || '')) { push('n', m[0]); i += m[0].length; continue; }
    if ((m = /^[A-Za-z_$][\w$-]*/.exec(rest))) {
      const w = lang === 'css' ? m[0] : m[0].replace(/-.*$/, '');
      const word = w;
      const isKw = kws.has(lang === 'sql' ? word.toLowerCase() : word);
      const isFn = !isKw && /^\s*\(/.test(code.slice(i + word.length));
      push(isKw ? 'k' : isFn ? 'f' : '', word); i += word.length; continue;
    }
    push('', code[i]); i++;
  }
  return out;
}

// ---------- rendering ----------
const editable = (cls, html, ph) => `<div class="${cls}" contenteditable="true" spellcheck="true" data-ph="${esc(ph)}">${sanitizeHTML(html || '')}</div>`;

function numberFor(blocks, idx) {
  const b = blocks[idx]; const ind = b.indent || 0; let n = 1;
  for (let i = idx - 1; i >= 0; i--) {
    const p = blocks[i]; const pi = LISTS.has(p.type) ? (p.indent || 0) : -1;
    if (pi < ind) break;
    if (pi === ind) { if (p.type === 'numbered') n++; else break; }
  }
  return n;
}

export function renderBlock(b, blocks, idx, ctx) {
  const ind = LISTS.has(b.type) ? (b.indent || 0) : 0;
  let inner;
  switch (b.type) {
    case 'h1': case 'h2': case 'h3': inner = editable(`blk-text t-${b.type}`, b.html, `Heading ${b.type[1]}`); break;
    case 'bullet': inner = `<span class="marker" aria-hidden="true">${['•', '◦', '▪'][ind % 3]}</span>${editable('blk-text', b.html, 'List item')}`; break;
    case 'numbered': inner = `<span class="marker num" aria-hidden="true">${numberFor(blocks, idx)}.</span>${editable('blk-text', b.html, 'List item')}`; break;
    case 'todo': inner = `<input type="checkbox" class="todo-check" ${b.checked ? 'checked' : ''} aria-label="Done">${editable(`blk-text ${b.checked ? 'checked' : ''}`, b.html, 'To-do')}`; break;
    case 'toggle': inner = `<button class="twisty" aria-expanded="${!!b.open}" aria-label="${b.open ? 'Collapse' : 'Expand'}">${icon(b.open ? 'chevD' : 'chevR')}</button>
      <div class="toggle-wrap">${editable('blk-text', b.html, 'Toggle')}${b.open ? editable('toggle-body', b.body, 'Hidden content…') : ''}</div>`; break;
    case 'quote': inner = editable('blk-text t-quote', b.html, 'Quote'); break;
    case 'callout': inner = `<div class="callout-box"><button class="callout-emoji" aria-label="Change callout icon">${esc(b.emoji || '💡')}</button>${editable('blk-text', b.html, 'Callout')}</div>`; break;
    case 'divider': inner = '<div class="blk-divider" tabindex="0" role="separator" aria-label="Divider. Press Backspace to delete."><hr></div>'; break;
    case 'code': inner = `<div class="code-block">
        <div class="code-top"><label class="sr-only" for="lang-${b.id}">Language</label><select class="code-lang" id="lang-${b.id}">${LANGS.map(l => `<option ${l === b.lang ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="code-area"><pre class="code-hl" aria-hidden="true"><code>${highlight(b.code || '', b.lang)}\n</code></pre>
        <textarea class="code-edit" spellcheck="false" aria-label="Code" rows="${Math.max(1, (b.code || '').split('\n').length)}">${esc(b.code || '')}</textarea></div></div>`; break;
    case 'image': inner = b.imageKey
      ? `<figure class="img-block"><img data-img="${esc(b.imageKey)}" alt="${esc(b.caption || 'Image')}">${editable('img-caption', b.caption, 'Add a caption')}</figure>`
      : `<label class="img-drop" tabindex="0" role="button">${icon('upload')} Upload or drop an image<input type="file" accept="image/*" hidden class="img-input"></label>`; break;
    case 'table': inner = `<div class="tbl-wrap"><table class="blk-table"><tbody>${b.rows.map((r, ri) => `<tr>${r.map((c, ci) => `<td contenteditable="true" data-r="${ri}" data-c="${ci}" aria-label="Row ${ri + 1} column ${ci + 1}">${sanitizeHTML(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>
      <div class="tbl-tools"><button class="btn btn-sm btn-ghost" data-tbl="row+">+ Row</button><button class="btn btn-sm btn-ghost" data-tbl="col+">+ Column</button>
      <button class="btn btn-sm btn-ghost" data-tbl="row-" ${b.rows.length < 2 ? 'disabled' : ''}>− Row</button><button class="btn btn-sm btn-ghost" data-tbl="col-" ${b.rows[0].length < 2 ? 'disabled' : ''}>− Column</button></div></div>`; break;
    default: inner = editable('blk-text', b.html, idx === 0 && blocks.length === 1 ? "Type '/' for commands, '[[' to link a page" : "Type '/' for commands");
  }
  void ctx;
  return `<div class="blk type-${b.type}" data-id="${b.id}" style="--indent:${ind}">
    <button class="blk-handle" draggable="true" aria-label="Drag to reorder, or press Alt+Arrow keys to move" tabindex="-1">${icon('grip')}</button>
    <div class="blk-body">${inner}</div></div>`;
}

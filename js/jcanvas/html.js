// Canvas-style rich HTML: keep inline styles, classes, tables, images and https iframes (video
// embeds) the way Canvas pages use them, but strip anything that could run script.
const DROP = new Set(['SCRIPT', 'OBJECT', 'EMBED', 'LINK', 'META', 'BASE', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'STYLE', 'FRAME', 'FRAMESET']);
const BAD_URL = /^\s*(javascript|vbscript|data:(?!image\/(png|jpe?g|gif|webp|svg\+xml)))/i;

export function cleanRich(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html || '';
  const walk = (node) => {
    for (const el of [...node.children]) {
      if (DROP.has(el.tagName)) { el.remove(); continue; }
      for (const a of [...el.attributes]) {
        const n = a.name.toLowerCase();
        if (n.startsWith('on') || n === 'srcdoc' || n === 'formaction') el.removeAttribute(a.name);
        else if ((n === 'href' || n === 'src' || n === 'xlink:href' || n === 'action') && BAD_URL.test(a.value)) el.removeAttribute(a.name);
        else if (n === 'style' && /expression\s*\(|javascript:|behavior\s*:|-moz-binding/i.test(a.value)) el.removeAttribute(a.name);
      }
      if (el.tagName === 'IFRAME') {
        if (!/^https:\/\//i.test(el.getAttribute('src') || '')) { el.remove(); continue; }
        el.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-popups');
        el.setAttribute('loading', 'lazy');
        el.setAttribute('referrerpolicy', 'no-referrer');
      }
      if (el.tagName === 'A' && /^https?:/i.test(el.getAttribute('href') || '')) { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener noreferrer'); }
      walk(el);
    }
  };
  walk(tpl.content);
  return tpl.innerHTML;
}

// Snippets for the HTML editor toolbar. `wrap` surrounds the selection, `insert` replaces it.
export const SNIPPETS = [
  { label: 'H2', title: 'Heading 2', wrap: ['<h2>', '</h2>'] },
  { label: 'H3', title: 'Heading 3', wrap: ['<h3>', '</h3>'] },
  { label: 'P', title: 'Paragraph', wrap: ['<p>', '</p>'] },
  { label: 'B', title: 'Bold', wrap: ['<strong>', '</strong>'] },
  { label: 'I', title: 'Italic', wrap: ['<em>', '</em>'] },
  { label: 'Link', title: 'Link', wrap: ['<a href="https://">', '</a>'] },
  { label: 'List', title: 'Bulleted list', insert: '<ul>\n  <li>Item</li>\n  <li>Item</li>\n</ul>\n' },
  { label: 'Image', title: 'Image', insert: '<p><img src="https://" alt="Describe the image" style="max-width: 100%;"></p>\n' },
  { label: 'Table', title: 'Table', insert: '<table style="border-collapse: collapse; width: 100%;" border="1">\n  <thead><tr><th>Heading</th><th>Heading</th></tr></thead>\n  <tbody><tr><td>Cell</td><td>Cell</td></tr></tbody>\n</table>\n' },
  { label: 'Box', title: 'Callout box', insert: '<div class="jc-callout">\n  <p><strong>Note:</strong> Text</p>\n</div>\n' },
  { label: 'Video', title: 'Embed video (YouTube link)', insert: '<p><iframe src="https://www.youtube.com/embed/VIDEO_ID" width="560" height="315" allowfullscreen></iframe></p>\n' },
  { label: 'HR', title: 'Divider', insert: '<hr>\n' },
];

export function applySnippet(textarea, sn) {
  const { selectionStart: a, selectionEnd: b, value } = textarea;
  const sel = value.slice(a, b);
  const text = sn.wrap ? sn.wrap[0] + (sel || 'Text') + sn.wrap[1] : sn.insert;
  textarea.setRangeText(text, a, b, 'end');
  textarea.focus();
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

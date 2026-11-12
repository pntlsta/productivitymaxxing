// Settings: GitHub connection, test, sync, trash (undelete), local data management.
import * as store from './core/store.js';
import * as gh from './core/github.js';
import { esc, plural, fmtDateTime } from './core/util.js';
import { toast, confirmDialog, emptyState } from './core/ui.js';
import { icon } from './core/icons.js';

const label = (type, r) => store.issueTitle(type, r).replace(/^\w+: /, '');

export default {
  mount(main, ctx) {
    const s = gh.getSettings();
    main.innerHTML = `
      <div class="page-head"><h1>Settings</h1></div>
      <section class="card" aria-labelledby="gh-h">
        <h2 id="gh-h">GitHub storage</h2>
        <div class="callout-warn" role="note"><strong>Security warning.</strong> Your token is stored in this browser's localStorage.
          Anyone with access to this machine or browser profile can read it. Only use a fine-grained token scoped to
          <em>one private repository you own</em>, with <em>Issues: Read and write</em> permission and nothing else.</div>
        <form id="gh-form" novalidate>
          <div class="field"><label for="gh-token">Fine-grained personal access token</label>
            <input class="input" id="gh-token" type="password" autocomplete="off" spellcheck="false" value="${esc(s.token)}" placeholder="github_pat_…">
            <span class="hint">Create at GitHub → Settings → Developer settings → Fine-grained tokens.</span></div>
          <div class="row">
            <div class="field"><label for="gh-owner">Repository owner</label><input class="input" id="gh-owner" value="${esc(s.owner)}" placeholder="your-username" autocomplete="off"></div>
            <div class="field"><label for="gh-repo">Repository name</label><input class="input" id="gh-repo" value="${esc(s.repo)}" placeholder="workbench-data" autocomplete="off"></div>
          </div>
          <div class="btn-group">
            <button class="btn btn-primary" type="submit">Save settings</button>
            <button class="btn" type="button" id="gh-test">Test connection</button>
            <button class="btn" type="button" id="gh-sync">${icon('refresh')} Reload from GitHub</button>
            <label class="check"><input type="checkbox" id="gh-show"> Show token</label>
          </div>
        </form>
        <div id="gh-report" class="small" aria-live="polite" style="margin-top:var(--space-3)"></div>
      </section>
      <section class="card" aria-labelledby="trash-h">
        <h2 id="trash-h">Deleted records</h2>
        <p class="muted small">Deleting closes the GitHub issue. Restore reopens it on the next Save.</p>
        <div id="trash"></div>
      </section>
      <section class="card" aria-labelledby="local-h">
        <h2 id="local-h">Local data</h2>
        <p class="muted small" id="local-info"></p>
        <div class="btn-group">
          <button class="btn" id="discard-q">${icon('undo')} Discard unsaved changes</button>
          <button class="btn btn-danger" id="clear-local">${icon('trash')} Clear local cache</button>
        </div>
      </section>`;

    const f = (id) => main.querySelector(id);
    const values = () => ({ token: f('#gh-token').value.trim(), owner: f('#gh-owner').value.trim(), repo: f('#gh-repo').value.trim() });
    f('#gh-show').onchange = (e) => { f('#gh-token').type = e.target.checked ? 'text' : 'password'; };
    f('#gh-form').onsubmit = ctx.guard(async (e) => {
      e.preventDefault();
      const v = values();
      if (!v.token || !v.owner || !v.repo) { toast('Token, owner and repo are all required.', 'error'); return; }
      gh.saveSettings(v);
      toast('Settings saved. Loading data…', 'success');
      const r = await store.sync();
      if (r.errors?.length) toast(`Load failed: ${r.errors[0]}`, 'error'); else toast('Data loaded from GitHub.', 'success');
    });
    f('#gh-test').onclick = ctx.guard(async () => {
      const v = values(); const rep = f('#gh-report');
      if (!v.token || !v.owner || !v.repo) { rep.innerHTML = '<span style="color:var(--danger)">Fill in token, owner and repo first.</span>'; return; }
      rep.textContent = 'Testing…';
      try {
        const lines = await gh.testConnection(v);
        rep.innerHTML = `<ul>${lines.map(l => `<li style="color:${/WARNING/.test(l) ? 'var(--warning)' : 'var(--success)'}">${esc(l)}</li>`).join('')}</ul>`;
      } catch (e) { rep.innerHTML = `<p style="color:var(--danger)" role="alert">${esc(e.message)}</p>`; }
    });
    f('#gh-sync').onclick = ctx.guard(async () => {
      if (!gh.isConfigured()) { toast('Save your GitHub settings first.', 'error'); return; }
      const r = await store.sync();
      toast(r.errors?.length ? `Load failed: ${r.errors[0]}` : 'Reloaded from GitHub.', r.errors?.length ? 'error' : 'success');
    });
    f('#discard-q').onclick = ctx.guard(async () => {
      const n = store.pendingCount();
      if (!n) { toast('No unsaved changes.'); return; }
      if (await confirmDialog({ title: 'Discard unsaved changes?', message: `This throws away ${plural(n, 'queued change')} that have not been sent to GitHub.`, confirmText: 'Discard' })) { store.discardQueue(); toast('Unsaved changes discarded.'); }
    });
    f('#clear-local').onclick = ctx.guard(async () => {
      if (await confirmDialog({ title: 'Clear local cache?', message: 'Removes cached records and any unsaved changes from this browser. Data already on GitHub is not affected. Ebook files in this browser are kept.', confirmText: 'Clear', phrase: 'CLEAR' })) { store.clearLocal(); toast('Local cache cleared.'); }
    });

    const renderTrash = () => {
      const rows = store.TYPES.flatMap(t => store.deleted(t).map(r => ({ t, r })))
        .sort((a, b) => (b.r.updatedAt || '').localeCompare(a.r.updatedAt || ''));
      f('#trash').innerHTML = rows.length ? `<table class="table"><thead><tr><th>Type</th><th>Record</th><th>Last updated</th><th></th></tr></thead><tbody>
        ${rows.slice(0, 200).map(({ t, r }) => `<tr><td><span class="badge">${t}</span></td><td>${esc(label(t, r))}</td><td class="small muted">${r.updatedAt ? fmtDateTime(r.updatedAt) : ''}</td>
          <td><button class="btn btn-sm" data-restore="${t}:${r.id}">${icon('undo')} Restore</button></td></tr>`).join('')}</tbody></table>`
        : emptyState('Nothing deleted', 'Records you delete anywhere in Workbench show up here so you can restore them.');
      f('#local-info').textContent = `${plural(store.pendingCount(), 'unsaved change')}. Connected: ${gh.isConfigured() ? `${gh.getSettings().owner}/${gh.getSettings().repo}` : 'no (working locally only)'}.`;
    };
    f('#trash').addEventListener('click', (e) => {
      const b = e.target.closest('[data-restore]'); if (!b) return;
      const [t, id] = b.dataset.restore.split(':');
      store.restore(t, id); toast('Restored. Click Save to reopen it on GitHub.', 'success');
    });
    renderTrash();
    ctx.on('change', renderTrash);
    ctx.on('queue', renderTrash);
  },
};

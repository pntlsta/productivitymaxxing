// Home launcher: 2x2 module cards with live status readouts. No sidebar.
import * as store from './core/store.js';
import { icon } from './core/icons.js';
import { toggleTheme, currentTheme, onThemeChange } from './core/theme.js';
import { MODULES } from './shell.js';
import { weekRange, plural } from './core/util.js';
import { thisWeekHours } from './timeclock/calc.js';

function status(id) {
  switch (id) {
    case 'calendar': {
      const [s, e] = weekRange();
      const n = store.where('item', i => i.dueDate >= s && i.dueDate <= e).length;
      return `${plural(n, 'item')} due this week`;
    }
    case 'timeclock': return `${thisWeekHours().toFixed(2)} hours this week`;
    case 'notes': return plural(store.all('page').length, 'page');
    case 'library': return plural(store.all('book').length, 'book');
  }
  return '';
}
const TYPES_FOR = { calendar: 'item', timeclock: 'punch', notes: 'page', library: 'book' };

export default {
  mount(main, ctx) {
    main.className = '';
    const render = () => {
      const dark = currentTheme() === 'dark';
      main.innerHTML = `<div class="home">
        <header class="home-head">
          <span class="logo" aria-hidden="true">${icon('logo')}</span>
          <h1>Workbench</h1><span class="spacer"></span>
          <button class="icon-btn" id="home-theme" aria-label="Switch to ${dark ? 'light' : 'dark'} theme">${icon(dark ? 'sun' : 'moon')}</button>
          <a class="icon-btn" href="#/settings" aria-label="Settings">${icon('settings')}</a>
        </header>
        <nav class="home-grid" aria-label="Modules">
          ${MODULES.map(m => `<a class="launch-card" href="#/${m.id}">
            <span class="icon" aria-hidden="true">${icon(m.icon)}</span>
            <h2>${m.title}</h2><p class="desc">${m.desc}</p>
            <span class="status" aria-live="polite">${store.isLoading(TYPES_FOR[m.id]) ? '<span class="skeleton skeleton-line" style="display:block;width:8rem"></span>' : status(m.id)}</span>
          </a>`).join('')}
        </nav>
        ${store.pendingCount() ? `<p class="muted small" style="margin-top:var(--space-5)">${plural(store.pendingCount(), 'unsaved change')} — open a module and click Save.</p>` : ''}
      </div>`;
      main.querySelector('#home-theme').onclick = () => toggleTheme();
    };
    render();
    ctx.on('change', render);
    ctx.on('queue', render);
    ctx.onCleanup(onThemeChange(render));
  },
};

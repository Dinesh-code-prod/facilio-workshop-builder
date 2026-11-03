/* UI states: one shared set of panels, toasts, banners and field errors, so empty, loading, error, offline, slow, no-result, no-access,
   session-expired, invalid-field and success states look and behave the same in every module.
   V.ui.empty / noResults / error / denied / loading return HTML for a page or card; V.ui.toast is what V.toast calls; V.ui.field marks one field invalid.
   Nothing here stores data. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT;
  const svg = p => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const IC = {
    info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
    ok: svg('<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16 9.5"/>'),
    warn: svg('<path d="M12 4 3 20h18z"/><path d="M12 10v4M12 17h.01"/>'),
    err: svg('<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>'),
    lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    wifi: svg('<path d="M3 9a14 14 0 0 1 18 0M6 12.5a9.5 9.5 0 0 1 12 0M9 16a5 5 0 0 1 6 0M12 19.5h.01"/><path d="m4 4 16 16"/>'),
    search: svg('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>'),
    box: svg('<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="m4 8 8 4 8-4M12 12v8"/>')
  };
  // ---------- panels ----------
  const acts = list => (list && list.length ? `<div class="ui-acts">${list.map(a => `<button type="button" class="btn${a.primary ? ' primary' : ''}" data-act="${esc(a.act)}"${a.view ? ` data-view="${esc(a.view)}"` : ''}${a.id ? ` data-id="${esc(a.id)}"` : ''}>${esc(a.label)}</button>`).join('')}</div>` : '');
  function panel(o) { return `<div class="ui-panel ${esc(o.kind || 'empty')}${o.compact ? ' compact' : ''}" role="${o.kind === 'error' ? 'alert' : 'status'}"><span class="ui-ic">${IC[o.icon || 'box']}</span><h3>${esc(o.title)}</h3>${o.text ? `<p>${esc(o.text)}</p>` : ''}${acts(o.actions)}</div>`; }
  const ui = V.ui = {
    IC,
    panel,
    empty: (title, text, actions, o) => panel(Object.assign({ kind: 'empty', icon: 'box', title, text, actions }, o || {})),
    noResults: (what, clearAct, text) => panel({ kind: 'noresults', icon: 'search', title: 'No ' + (what || 'results') + ' match', text: text || 'Try a different word, or clear the search and filters.', actions: clearAct ? [{ label: 'Clear search and filters', act: clearAct, primary: true }] : [], compact: true }),
    error: (title, text, o) => panel({ kind: 'error', icon: 'err', title: title || 'We could not load this', text: text || 'Something went wrong on our side or with your connection. Your work is safe.', actions: (o && o.actions) || [{ label: 'Try again', act: 'uiRetry', primary: true }, { label: 'Go to overview', act: 'uiGo', view: 'overview' }] }),
    denied: (what, o) => panel({ kind: 'denied', icon: 'lock', title: 'You do not have access to ' + (what || 'this page'), text: (o && o.text) || 'Ask your Facilio team lead if you need it. Everything you can open is in the menu.', actions: (o && o.actions) || [{ label: 'Go back', act: 'uiBack' }, { label: 'Return to dashboard', act: 'uiGo', view: S.user && S.user.kind === 'customer' ? 'cust_home' : 'overview', primary: true }] }),
    loading: (rows) => `<div class="ui-loading" role="status" aria-busy="true" aria-label="Loading"><span class="sr-only">Loading</span>${Array.from({ length: rows || 3 }, (_, i) => `<i style="width:${96 - i * 14}%"></i>`).join('')}</div>`
  };
  ACT.uiRetry = () => V.render();
  ACT.uiBack = () => { if (history.length > 1) history.back(); else V.go('overview'); };
  ACT.uiGo = a => V.go(a.getAttribute('data-view') || 'overview');
  // views a customer never opens: shown a clear no-access panel instead of silently landing on the overview
  const TEAM_ONLY = ['demokit', 'tasks', 'teamhelp', 'claudesetup', 'aiwork', 'reports', 'transcripts', 'usecases', 'checks', 'brd', 'modules', 'flow', 'whiteboard', 'cfginputs', 'roles', 'notifications', 'vstudio', 'guidebuilder', 'vidguide', 'inbox', 'tickets', 'settings', 'templates', 'workspace', 'contracts', 'pkgan', 'trace', 'orgpkg', 'showcase', 'msaflow'];
  ui.blocked = key => !!(S.user && S.user.kind === 'customer' && TEAM_ONLY.includes(key));

  // ---------- toasts: icon, type, close button; errors are announced and stay longer ----------
  const GOOD = /\b(saved|added|updated|deleted|removed|created|copied|moved|sent|published|exported|imported|imported|restored|approved|signed|recorded|uploaded|applied|done|cleared|duplicated|renamed|reordered)\b/i;
  function host() { let h = document.getElementById('uiToasts'); if (!h) { h = document.createElement('div'); h.id = 'uiToasts'; h.setAttribute('aria-live', 'polite'); document.body.appendChild(h); } return h; }
  ui.toast = function (msg, ms, err, type) {
    const t = type || (err ? 'err' : GOOD.test(String(msg)) ? 'ok' : 'info'); const el = document.createElement('div'); el.className = 'toast ui-toast ' + t + (t === 'err' ? ' err' : '');
    el.setAttribute('role', t === 'err' ? 'alert' : 'status'); el.innerHTML = `<span class="ui-ti">${IC[t === 'ok' ? 'ok' : t === 'err' ? 'err' : t === 'warn' ? 'warn' : 'info']}</span><span class="ui-tm"></span><button type="button" class="ui-tx" aria-label="Dismiss">&times;</button>`;
    el.querySelector('.ui-tm').textContent = msg; el.querySelector('.ui-tx').addEventListener('click', () => el.remove());
    const h = host(); h.appendChild(el); while (h.children.length > 4) h.firstChild.remove();
    setTimeout(() => el.remove(), t === 'err' ? Math.max(ms || 0, 6500) : ms || 3200); return el;
  };

  // ---------- offline banner and slow-request notice ----------
  function bar() { let b = document.getElementById('uiNet'); if (!b) { b = document.createElement('div'); b.id = 'uiNet'; document.body.appendChild(b); } return b; }
  function showBar(kind, html, auto) { const b = bar(); b.className = kind; b.innerHTML = html; b.hidden = false; clearTimeout(showBar.t); if (auto) showBar.t = setTimeout(() => { if (!offline) b.hidden = true; }, auto); }
  let offline = !navigator.onLine, slowTimer = 0, pending = 0, slowShown = false;
  const offHtml = `<span class="ui-ti">${IC.wifi}</span><span><b>You are offline.</b> Changes cannot be saved until your connection returns. Nothing you have already saved is lost.</span><button type="button" class="btn sm" data-act="uiRetry">Retry</button>`;
  window.addEventListener('offline', () => { offline = true; showBar('off', offHtml); });
  window.addEventListener('online', () => { offline = false; showBar('on', `<span class="ui-ti">${IC.ok}</span><span><b>Back online.</b></span>`, 3000); });
  if (offline) setTimeout(() => showBar('off', offHtml), 0);
  root.FWBNet = {
    track(p) { pending++; clearTimeout(slowTimer); slowTimer = setTimeout(() => { if (pending > 0 && !offline) { slowShown = true; showBar('slow', `<span class="ui-ti">${IC.info}</span><span><b>This is taking longer than usual.</b> Still working. You can keep waiting, or try again if it does not finish.</span><button type="button" class="btn sm" data-act="uiRetry">Refresh</button>`); } }, 8000);
      const done = () => { pending = Math.max(0, pending - 1); if (!pending) { clearTimeout(slowTimer); if (slowShown) { slowShown = false; const b = document.getElementById('uiNet'); if (b && b.className === 'slow') b.hidden = true; } } };
      return p.then(r => { done(); return r; }, e => { done(); throw e; }); }
  };

  // ---------- inline field errors (validation) ----------
  ui.clearFields = root0 => { (root0 || document).querySelectorAll('.ui-fe').forEach(x => x.remove()); (root0 || document).querySelectorAll('[aria-invalid="true"]').forEach(x => { x.removeAttribute('aria-invalid'); x.removeAttribute('aria-describedby'); }); };
  // marks one field invalid, shows the message under it, and moves focus there. Returns false so a caller can `return ui.field(...)`.
  ui.field = (id, msg) => { const el = typeof id === 'string' ? document.getElementById(id) : id; if (!el) { ui.toast(msg, 4500, true); return false; } ui.clearFields(el.closest('.drawer, form, .modal, body'));
    el.setAttribute('aria-invalid', 'true'); const m = document.createElement('div'); m.className = 'ui-fe'; m.id = (el.id || 'f') + '_err'; m.setAttribute('role', 'alert'); m.innerHTML = IC.err.replace('width="20" height="20"', 'width="14" height="14"') + '<span></span>'; m.querySelector('span').textContent = msg;
    el.setAttribute('aria-describedby', m.id); el.insertAdjacentElement('afterend', m); el.focus(); const fix = () => { ui.clearFields(el.parentElement); el.removeEventListener('input', fix); el.removeEventListener('change', fix); }; el.addEventListener('input', fix); el.addEventListener('change', fix); return false; };

  // ---------- plain "Loading…" blocks become a calm skeleton ----------
  let queued = false;
  function upgradeLoading() { queued = false; document.querySelectorAll('#app .empty, #app .small.muted, #app .muted, #app .card-b').forEach(el => { if (el.dataset.uiL || el.children.length) return; const t = (el.textContent || '').trim(); if (/^Loading(…|\.\.\.)?$/.test(t) || /^Loading [a-z ]+(…|\.\.\.)$/i.test(t)) { el.dataset.uiL = '1'; el.innerHTML = ui.loading(3); } }); }
  new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(upgradeLoading); } }).observe(document.documentElement, { childList: true, subtree: true });

  // ---------- unexpected errors: one calm message instead of a silent failure ----------
  let lastErr = 0;
  window.addEventListener('unhandledrejection', e => { const r = e.reason || {}; if (r.status === 0 || r.status === 401 || r.name === 'AbortError' || Date.now() - lastErr < 8000) return; lastErr = Date.now(); console.error(r); ui.toast('Something did not work as expected. Your saved work is safe. Try again, or refresh the page if it keeps happening.', 7000, true); });
})(typeof window !== 'undefined' ? window : globalThis);

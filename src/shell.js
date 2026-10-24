/* Shell: authentication, project list & creation, workspace navigation, shared UI utilities, event delegation. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc, humanize } = F; const API = root.FWBApi;
  const V = root.FWBViews = root.FWBViews || {};
  const ACT = V.ACT = V.ACT || {};

  // ---------- icons ----------
  const ICON = {
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>', play: '<path d="M8 5v14l11-7z"/>', shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
    home: '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>', deck: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>', plan: '<path d="M4 5h16M4 10h10M4 15h13M4 20h7"/>', cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    book: '<path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>', dash: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="5" rx="1"/><rect x="13" y="10" width="8" height="11" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/>',
    modules: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>', flow: '<rect x="2" y="9" width="7" height="5" rx="1"/><rect x="15" y="3" width="7" height="5" rx="1"/><rect x="15" y="16" width="7" height="5" rx="1"/><path d="M9 11.5h3v-6h3M12 11.5v7h3"/>',
    roles: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17.5" cy="9" r="2.5"/><path d="M16 14.6c2.8-.4 4.8 1.2 5.5 4.4"/>', mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    check: '<path d="M4 12.5 9.5 18 20 6"/>', doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>', plus: '<path d="M12 5v14M5 12h14"/>', up: '<path d="M12 19V5M6 11l6-6 6 6"/>', down: '<path d="M12 5v14M6 13l6 6 6-6"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', upl: '<path d="M12 16V5M7 10l5-5 5 5M5 20h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', trash: '<path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13"/>', left: '<path d="M15 6l-6 6 6 6"/>', right: '<path d="M9 6l6 6-6 6"/>', arr: '<path d="M9 6l6 6-6 6"/>', eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>', zoomin: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5M11 8v6M8 11h6"/>', zoomout: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5M8 11h6"/>'
  };
  const ico = (n, cls) => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="${cls || ''}" aria-hidden="true">${ICON[n] || ''}</svg>`;

  // ---------- UI utilities ----------
  function toast(msg, ms, err) { const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.setAttribute('role', 'status'); t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), ms || 2800); }
  function loading(on, msg) { let el = document.getElementById('loading'); if (!on) { if (el) el.remove(); return; } if (!el) { el = document.createElement('div'); el.id = 'loading'; el.className = 'loading'; document.body.appendChild(el); } el.innerHTML = `<div style="text-align:center"><div class="spinner"></div><div id="loadingMsg">${esc(msg || 'Working…')}</div></div>`; }
  function loadingMsg(m) { const e = document.getElementById('loadingMsg'); if (e) e.textContent = m; }
  const tag = (cls, text) => `<span class="tag ${esc(cls)}">${esc(text)}</span>`;
  const statusTag = st => tag(st, { existing: 'Existing', proposed: 'Proposed', modified: 'Modified', removed: 'Proposed removal' }[st] || st);
  function sel(name, opts, val, attrs) { return `<select ${attrs || ''} ${name ? `data-bind="${esc(name)}"` : ''}>${opts.map(o => { const v = typeof o === 'object' ? o.v : o, l = typeof o === 'object' ? o.l : o; return `<option value="${esc(v)}"${String(v) === String(val) ? ' selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`; }
  function getPath(o, p) { return p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o); }
  function setPath(o, p, v) { const ks = p.split('.'); let c = o; ks.slice(0, -1).forEach(k => { if (c[k] == null || typeof c[k] !== 'object') c[k] = {}; c = c[k]; }); c[ks[ks.length - 1]] = v; }
  // data-bind paths: "workshop path" (default) or "@section:path" for other project documents
  function bindTarget(p) { if (p[0] === '@') { const i = p.indexOf(':'); const sec = p.slice(1, i); return { obj: sec === 'workshop' ? S.ws : F.doc(sec), path: p.slice(i + 1), section: sec }; } return { obj: S.ws, path: p, section: 'workshop' }; }
  function inp(path, ph, type, attrs) { const t = bindTarget(path); const v = getPath(t.obj, t.path); return `<input type="${type || 'text'}" data-bind="${esc(path)}" value="${esc(v == null ? '' : v)}" placeholder="${esc(ph || '')}" ${S.readonly ? 'disabled' : ''} ${attrs || ''}>`; }
  function ta(path, ph, rows) { const t = bindTarget(path); const v = getPath(t.obj, t.path); return `<textarea data-bind="${esc(path)}" rows="${rows || 3}" placeholder="${esc(ph || '')}" ${S.readonly ? 'disabled' : ''}>${esc(v || '')}</textarea>`; }
  function sw(path, on, attrs) { return `<label class="switch"><input type="checkbox" ${path ? `data-bind="${esc(path)}"` : ''} ${on ? 'checked' : ''} ${S.readonly ? 'disabled' : ''} ${attrs || ''}><span></span></label>`; }
  function drawer(title, body, foot, opts) { closeDrawer(); const d = document.createElement('div'); d.className = 'scrim'; d.id = 'drawer'; d.innerHTML = `<div class="drawer${opts && opts.wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="drawer-h"><h2>${esc(title)}</h2><button class="btn ghost sm" data-act="closeDrawer" aria-label="Close">${ico('x')}</button></div><div class="drawer-b">${body}</div>${foot === false ? '' : `<div class="drawer-f">${foot || '<button class="btn" data-act="closeDrawer">Close</button>'}</div>`}</div>`; d.addEventListener('mousedown', e => { if (e.target === d) closeDrawer(); }); document.body.appendChild(d); const f = d.querySelector('.drawer-b input:not([type=checkbox]),.drawer-b select,.drawer-b textarea'); if (f) f.focus(); return d; }
  function closeDrawer() { const d = document.getElementById('drawer'); if (d) d.remove(); }
  function confirmDialog(title, msg, okLabel, danger) {
    return new Promise(res => { const d = document.createElement('div'); d.className = 'scrim center'; d.innerHTML = `<div class="dialog" role="alertdialog" aria-modal="true"><div class="dialog-h">${esc(title)}</div><div class="dialog-b">${esc(msg)}</div><div class="dialog-f"><button class="btn" data-r="0">Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" data-r="1">${esc(okLabel || 'Confirm')}</button></div></div>`;
      d.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b || e.target === d) { d.remove(); res(!!(b && b.getAttribute('data-r') === '1')); } }); document.body.appendChild(d); d.querySelector('[data-r="1"]').focus(); });
  }
  function download(name, data, mime) { const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
  function pickFile(accept, multiple) { return new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept || ''; i.multiple = !!multiple; i.onchange = () => res(Array.from(i.files)); i.click(); }); }
  async function loadScript(src) { if (document.querySelector(`script[data-src="${src}"]`)) return; await new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.dataset.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s); }); }
  const fmtDate = d => { if (!d) return ''; const x = new Date(d); return isNaN(x) ? String(d) : x.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }); };
  const fmtSize = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  function requireEdit() { if (S.readonly) { toast('You have read-only access to this project'); return false; } return true; }
  Object.assign(V, { ico, toast, loading, loadingMsg, tag, statusTag, sel, inp, ta, sw, drawer, closeDrawer, confirmDialog, download, pickFile, loadScript, getPath, setPath, fmtDate, fmtSize, requireEdit, bindTarget });
  V.confirmInline = () => true; // legacy callers: destructive actions now use confirmDialog where it matters

  // ---------- routing ----------
  const NAV = [
    { g: 'Dashboard Report', icon: 'dash', items: [['dashreport', 'Dashboard Report']] },
    { g: 'Project', icon: 'home', items: [['overview', 'Project Overview'], ['msaflow', 'Contract'], ['contracts', 'Contracts & Integrations'], ['kickoff', 'Kick-off Deck'], ['plan', 'Project Plan'], ['timeline', 'Plan Timeline'], ['guide', 'Customer User Guide'], ['onboarding', 'Data Onboarding'], ['dashboards', 'Dashboard Gallery']] },
    { g: 'Delivery', icon: 'flag', items: [['governance', 'Governance & RAID'], ['changes', 'Change Requests'], ['delivery', 'Build, UAT & Go-Live']] },
    { g: 'AI Delivery', icon: 'flag', items: [['aiwork', 'Deliverables & AI'], ['hypercare', 'Hypercare'], ['ftr', 'FTR Report (Excel)'], ['kpi', 'KPI Workbooks'], ['reports', 'Status Reports (WSR / Monthly)'], ['handover', 'Handover & Closure']] },
    { g: 'Configuration', icon: 'modules', items: [['modules', 'System Modules & Form Builder'], ['flow', 'State Flow Builder'], ['roles', 'Roles & Access Permissions']] },
    { g: 'Requirements', icon: 'check', items: [['transcripts', 'Transcripts & Requirement Confirmation'], ['usecases', 'Use Cases'], ['checks', 'Checks & Validations'], ['brd', 'BRD Draft']] },
    { g: 'Administration', icon: 'gear', items: [['portal', 'Customer Portal'], ['settings', 'Project Settings & Exports']] }
  ];
  // customer menu: [view, label, portal tab that must be on]
  const CUSTOMER_NAV = [{ g: 'Project', icon: 'home', items: [['cust_home', 'Overview', 'cust_home'], ['contract', 'Know Your Contract', 'contract'], ['scope', 'Scope', 'scope'], ['kickoff', 'Kick-off', 'kickoff'], ['cplan', 'Project Plan', 'plan'], ['timeline', 'Plan Timeline', 'plan'], ['schedule', 'Workshop Schedule', 'schedule'], ['guide', 'Customer User Guide', 'guide'], ['onboarding', 'Data Onboarding', 'onboarding'], ['dashboards', 'Dashboard Gallery', 'dashboards']] },
    { g: 'Delivery', icon: 'flag', items: [['governance', 'Governance', 'governance'], ['changes', 'Change Requests', 'changes'], ['delivery', 'Build, UAT & Go-Live', 'delivery']] }];
  // only menu entries whose view exists, and for customers only the tabs the implementation team has switched on
  // Office open mode (temporary): set by the server (OFFICE_OPEN_MODE=1). Hides sign-in, accounts, project access and the Roles view; nothing is removed.
  V.office = () => !!health.openMode;
  function navFor() { const cust = S.user.kind === 'customer'; const ctl = V.controls ? V.controls() : { tabs: {} }; return (cust ? CUSTOMER_NAV : NAV).map(g => Object.assign({}, g, { items: g.items.filter(([id, , tab]) => V[id] && !(V.office() && id === 'roles') && (!cust || ctl.tabs[tab] !== false)) })).filter(g => g.items.length); }
  V.navFor = navFor;
  const ALIAS = { module: 'modules', search: 'overview' };
  function go(view, extra) {
    if (V.beforeLeave && V.beforeLeave() === false) return;
    V.beforeLeave = null;
    if (S.user && S.user.kind !== 'customer' && V.mfRoute && ['contract', 'scope', 'planner', 'msaflow'].includes(view)) { if (extra && extra.plTab) S.ui.plTab = extra.plTab; view = V.mfRoute(view, extra); } // one Contract section; old links and #/p/<id>/planner land in it
    Object.assign(S.ui, { view }, extra || {}); if (view !== 'flow') S.ui.selected = null;
    const sub = view === 'module' && S.ui.module ? '/' + encodeURIComponent(S.ui.module) : '';
    try { history.replaceState(null, '', S.project ? `#/p/${S.project.id}/${view}${sub}` : '#/projects'); } catch (e) { }
    render(); const m = document.querySelector('.main'); if (m) m.scrollTop = 0;
  }
  V.go = go;
  V.setMode = m => { mode = m; render(); };

  // ---------- render ----------
  let mode = 'boot'; // boot | auth | projects | workspace
  function render() {
    const app = document.getElementById('app'); if (!app) return;
    if (mode === 'auth') { const keep = {}; document.querySelectorAll('.auth-box input[type=text],.auth-box input[type=email]').forEach(i => { if (i.id && i.value) keep[i.id] = i.value; }); app.innerHTML = authHtml(); Object.entries(keep).forEach(([k, v]) => { const i = document.getElementById(k); if (i && !i.value) i.value = v; }); mountAuth(); return; }
    if (mode === 'projects') { app.innerHTML = navbarHtml(false) + projectsHtml(); return; }
    if (mode === 'admin') { app.innerHTML = navbarHtml(false) + (V.adminHtml ? V.adminHtml() : ''); return; }
    if (mode !== 'workspace') return;
    if (S.ui.view === 'onboarding' && S.ui.onbTab === 'excel' && document.getElementById('onbFrame')) return; // keep the embedded tool alive: re-rendering would reload it
    const main = document.querySelector('.main'); const scroll = main ? main.scrollTop : 0;
    const active = document.activeElement; const activeBind = active && active.getAttribute && active.getAttribute('data-bind'); const caret = active && active.selectionStart;
    const key = ALIAS[S.ui.view] && !V[S.ui.view] ? ALIAS[S.ui.view] : S.ui.view; const view = V[key] || V.overview;
    let body; try { body = view.html(); } catch (e) { console.error(e); body = `<div class="page-body"><div class="notice err">This view could not be displayed: ${esc(e.message)}</div></div>`; }
    const sbOld = document.querySelector('.sidebar'); const sbTop = sbOld ? sbOld.scrollTop : (S.ui.navScroll || 0); // the whole shell is rebuilt on every render: carry the sidebar's scroll position across so a click never moves it
    app.innerHTML = navbarHtml(true) + `<div class="shell"><nav class="sidebar" aria-label="Workspace">${sidebarHtml()}</nav><main class="main" id="main"><div class="page">${V.phaseStrip ? V.phaseStrip() : ''}${body}</div></main></div>`;
    const m = document.querySelector('.main'); if (m) m.scrollTop = scroll; const sbNew = document.querySelector('.sidebar'); if (sbNew) sbNew.scrollTop = sbTop;
    if (view.mount) try { view.mount(); } catch (e) { console.error(e); }
    if (activeBind) { const el = document.querySelector(`[data-bind="${CSS.escape(activeBind)}"]`); if (el && el.tagName !== 'SELECT') { el.focus(); try { if (caret != null) el.setSelectionRange(caret, caret); } catch (e) { } } }
    F.paintSave();
  }
  V.render = render; F.on(render);

  function initials(n) { return String(n || '?').split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase(); }
  function navbarHtml(inProject) {
    const u = S.user || {};
    return `<header class="navbar"><div class="left"><img class="nav-logo" src="brand/logo-navy.png" alt="Facilio" height="20"><span class="divider"></span><span class="title">Delivery Studio</span>${inProject && S.user.kind === 'consultant' ? `<span class="divider"></span><a href="#" data-act="toProjects" class="small">All projects</a>` : ''}</div>
      <div class="center">${inProject && S.project ? esc(S.project.name) + ' <span class="muted" style="font-weight:400">· ' + esc(S.project.customer) + '</span>' : ''}</div>
      <div class="right">${inProject && !S.readonly && u.kind === 'consultant' ? '<span id="saveState" class="save-state"></span>' : ''}${S.readonly && u.kind === 'consultant' ? tag('tbc', 'Read-only') : ''}${V.bellHtml ? V.bellHtml() : ''}${u.kind === 'consultant' && (u.adminRole || V.office()) && !inProject ? `<button class="btn sm" data-act="openAdmin">Admin</button>` : ''}${!inProject ? `<button class="btn sm nav-out" data-act="logout">Log out</button>` : ''}${u.adminRole && !V.office() ? tag(u.adminRole === 'sub' ? 'tbc' : 'blue', u.adminRole === 'super' ? 'Platform owner' : u.adminRole === 'admin' ? 'Admin' : 'Sub admin') : ''}${V.office() ? '' : `${u.guest ? tag('tbc', 'Guest') : ''}<button class="avatar" data-act="userMenu" aria-label="Account">${esc(initials(u.name))}</button>`}</div></header>`;
  }
  const FI = root.FWBIcons || { has: () => false, svg: () => '' }; const GI = { 'Dashboard Report': 'g_dash', Project: 'g_project', Delivery: 'g_delivery', Configuration: 'g_config', Requirements: 'g_req', Administration: 'g_admin' };
  function sidebarHtml() {
    const nav = navFor(); const counts = V.navCounts ? V.navCounts() : {};
    const q = (S.ui.navq || '').toLowerCase();
    return `<div class="search">${ico('search')}<input type="search" placeholder="Search" aria-label="Search menu" id="navq" value="${esc(S.ui.navq || '')}"></div>` +
      nav.map(g => { const items = g.items.filter(([, l]) => !q || l.toLowerCase().includes(q)); if (!items.length) return ''; const hasAct = g.items.some(([id]) => S.ui.view === id || (id === 'modules' && S.ui.view === 'module')); const open = hasAct || !!q || !(S.ui.navShut || {})[g.g]; return `<div class="sb-group${open ? ' open' : ''}${hasAct ? ' has-active' : ''}"><button class="sb-title" data-act="navGroup" data-g="${esc(g.g)}" aria-expanded="${open}">${FI.has(GI[g.g]) ? FI.svg(GI[g.g]) : ico(g.icon)}<span>${esc(g.g)}</span></button>${open ? items.map(([id, l]) => { const c = counts[id]; const act = S.ui.view === id || (id === 'modules' && S.ui.view === 'module'); return `<button class="sb-item${act ? ' active' : ''}" data-act="nav" data-view="${id}">${FI.has(id) ? FI.svg(id) : ''}<span>${esc(l)}</span>${c ? `<span class="sb-badge ${esc(c.cls || '')}">${esc(c.n)}</span>` : ''}</button>`; }).join('') : ''}</div>`; }).join('') +
      `<div class="sb-foot"><button class="sb-out" data-act="logout" title="Sign out and return to the sign-in page"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg><span>Sign out</span></button></div>`;
  }
  ACT.navGroup = a => { const g = a.getAttribute('data-g'); const shut = Object.assign({}, S.ui.navShut || {}); shut[g] = !shut[g]; S.ui.navShut = shut; render(); }; // a group holding the active page stays open

  // ---------- events ----------
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-act]'); if (!a) { const pop = document.getElementById('userPop'); if (pop && !e.target.closest('#userPop')) pop.remove(); return; }
    const fn = ACT[a.getAttribute('data-act')]; if (!fn) return;
    if (a.tagName === 'A' || a.tagName === 'BUTTON') e.preventDefault();
    try { const r = fn(a, e); if (r && r.catch) r.catch(err => { console.error(err); loading(false); toast(err.message || 'Something went wrong', 5000, true); }); } catch (err) { console.error(err); toast(err.message, 5000, true); }
  });
  document.addEventListener('input', e => {
    const el = e.target;
    if (el.id === 'navq') { S.ui.navq = el.value; const nav = document.querySelector('.sidebar'); if (nav) { nav.innerHTML = sidebarHtml(); const n = document.getElementById('navq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); } return; }
    const b = el.getAttribute('data-bind'); if (!b || el.type === 'checkbox' || el.tagName === 'SELECT') return;
    const t = bindTarget(b); setPath(t.obj, t.path, el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value); F.changed(null, null, { render: false, section: t.section });
  });
  document.addEventListener('change', e => {
    const el = e.target; const b = el.getAttribute('data-bind');
    if (b) { const t = bindTarget(b); const v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value; setPath(t.obj, t.path, v); F.changed(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'Edited' : null, b.replace(/^@\w+:/, '').replace(/\./g, ' › '), { render: el.type === 'checkbox' || el.tagName === 'SELECT', section: t.section }); return; }
    const u = el.getAttribute('data-ui'); if (u) { setPath(S.ui, u, el.type === 'checkbox' ? el.checked : el.value); render(); return; }
    const c = el.getAttribute('data-change'); if (c && ACT[c]) { try { const r = ACT[c](el, e); if (r && r.catch) r.catch(err => { loading(false); toast(err.message, 5000, true); }); } catch (err) { toast(err.message, 5000, true); } }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeDrawer(); const p = document.getElementById('userPop'); if (p) p.remove(); } });
  root.addEventListener('beforeunload', e => { if (F.hasUnsaved()) { F.flush(); e.preventDefault(); e.returnValue = ''; } });

  ACT.nav = a => go(a.getAttribute('data-view'));
  ACT.closeDrawer = () => closeDrawer();
  ACT.navTo = a => { const n = JSON.parse(a.getAttribute('data-nav')); go(n.view, { module: n.module || S.ui.module, moduleTab: n.tab || S.ui.moduleTab, flowId: n.flowId || S.ui.flowId, selected: n.sel || null, processId: n.processId || S.ui.processId, reqId: n.reqId || S.ui.reqId, guideModule: n.guideModule || S.ui.guideModule }); if (n.sel) { S.ui.selected = n.sel; render(); } };
  ACT.openModule = a => go('module', { module: a.getAttribute('data-module'), moduleTab: a.getAttribute('data-tab') || 'templates' });
  ACT.userMenu = () => { const old = document.getElementById('userPop'); if (old) { old.remove(); return; } const d = document.createElement('div'); d.id = 'userPop'; d.className = 'popover'; const u = S.user;
    d.innerHTML = `<div class="row" style="margin-bottom:10px"><div class="avatar">${esc(initials(u.name))}</div><div><b>${esc(u.name)}</b><div class="xs muted">${esc(u.kind === 'customer' ? 'Customer stakeholder' : u.guest ? 'Guest workspace' : u.email)}</div></div></div>${u.guest ? '<button class="btn sm primary" style="width:100%;margin-bottom:6px" data-act="upgradeGuest">Save as a full account</button>' : ''}${u.kind === 'consultant' ? '<button class="btn sm" style="width:100%;margin-bottom:6px" data-act="toProjects">All projects</button>' : ''}<button class="btn sm" style="width:100%;margin-bottom:6px" data-act="replayRoadmap">Product introduction</button><button class="btn sm" style="width:100%" data-act="logout">Log out</button>`; document.body.appendChild(d); };
  ACT.toProjects = async () => { if (F.hasUnsaved()) await F.flush(); S.project = null; S.baseline = null; mode = 'projects'; await loadProjects(); history.replaceState(null, '', '#/projects'); render(); if (S.user.kind === 'consultant' && !refCache) setTimeout(() => { if (!refCache) API.reference().then(r => { refCache = refCache || r; }).catch(() => { }); }, 700); };
  ACT.officeContinue = () => { location.reload(); };
  ACT.logout = async () => { if (S.user && S.user.guest && !V.office() && !(await confirmDialog('Sign out of guest workspace', 'You will need your guest key to come back. If you have lost it, save the workspace as a full account first (menu under your initials).', 'Sign out', true))) return; if (F.hasUnsaved()) await F.flush(); try { await API.post('/api/auth/logout'); } catch (e) { } if (root.FWBRun) { S.project = null; mode = 'auth'; authMsg = 'You have left the workspace. Close this tab, or open it again whenever you like.'; history.replaceState(null, '', '#/'); render(); return; } S.user = null; S.project = null; mode = 'auth'; history.replaceState(null, '', '#/'); render(); };

  // ---------- auth screens ----------
  let authTab = 'signup'; let authMsg = ''; let health = { signupEnabled: false };
  let authAnimated = false;
  function authHtmlBase() {
    const custM = location.hash.match(/#\/c\/([A-Za-z0-9_-]+)(?:~([A-Za-z0-9_-]+))?/) || []; const custId = custM[1] || ''; const custCode = custM[2] || '';
    if (custId && authTab !== 'customer') authTab = 'customer';
    const tabs = [['signup', 'Create account'], ['login', 'Sign in'], ['customer', 'Guest / Customer']].filter(t => t[0] !== 'signup' || health.signupEnabled);
    const f = { login: `<div class="fld"><label class="f">Work email</label><input type="email" id="a_email" autocomplete="username" required></div><div class="fld"><label class="f">Password</label><input type="password" id="a_pw" autocomplete="current-password" required></div><button class="btn primary lg" style="width:100%" data-act="doLogin">Sign in</button>`,
      signup: `<div class="fld"><label class="f">Full name</label><input type="text" id="a_name" autocomplete="name" placeholder="e.g. Priya Nair"></div><div class="fld"><label class="f">Work email</label><input type="email" id="a_email" autocomplete="username" placeholder="name@facilio.com"><div class="xs muted" style="margin-top:4px">Use your Facilio office email.</div></div><div class="fld"><label class="f">Choose a password (min. 10 characters)</label><input type="password" id="a_pw" autocomplete="new-password"></div>${health.signupNeedsCode === false ? '' : `<div class="fld"><label class="f">Team code</label><input type="password" id="a_inv" autocomplete="off"><div class="xs muted" style="margin-top:4px">Same code for the whole team. Ask your team lead.</div></div>`}<button class="btn primary lg" style="width:100%" data-act="doSignup">Create account</button>`,
      guest: `<div class="fld"><label class="f">Your name</label><input type="text" id="g_name" autocomplete="name" placeholder="Your name"></div><div class="fld"><label class="f">Team code</label><input type="password" id="g_code" autocomplete="off"><div class="xs muted" style="margin-top:4px">Ask your team lead for the code. No email or password needed — you get your own private workspace.</div></div><button class="btn primary lg" style="width:100%" data-act="doGuest">Continue as guest</button>
        <details class="auth-key"${authMsg && /key/i.test(authMsg) ? ' open' : ''}><summary>Coming back? Use your guest key</summary><div class="fld"><input type="password" id="g_key" autocomplete="off" placeholder="Paste the key you saved" aria-label="Your guest key"></div><button class="btn" data-act="doGuestKey">Open my workspace</button></details>`,
      customer: `<input type="hidden" id="c_pid" value="${esc(custId)}">${custCode ? `<input type="hidden" id="c_code" value="${esc(custCode)}"><div class="notice" style="margin-bottom:14px">You have been invited to a project. Enter your name to join.</div>` : ''}<div class="fld"><label class="f">Your name</label><input type="text" id="c_name" autocomplete="name" placeholder="Your name"></div>${custCode ? '' : `<div class="fld"><label class="f">${custId ? 'Access code' : 'Invite link or access code'}</label><input type="${custId ? 'password' : 'text'}" id="c_code" autocomplete="off" placeholder="${custId ? 'The code Facilio sent you' : 'Paste the link Facilio sent you'}"><div class="xs muted" style="margin-top:4px">No email or password needed. You will see the pages your Facilio team has shared with you.</div></div>`}<button class="btn primary lg" data-act="doCustomer">${custCode ? 'Join project' : 'Open project'}</button>` };
    return `<div class="auth${authAnimated ? '' : ' auth-in'}"><div class="auth-art av2"><div class="av-glow" aria-hidden="true"></div><div class="auth-brand"><img src="brand/logo-white.png" alt="Facilio" width="120" height="33"></div><div class="av-copy"><h1>Run requirement workshops that <em>deliver</em></h1><p>One workspace per customer: prepare the contract and plan, walk through the Facilio configuration, capture requirements and produce the BRD.</p></div><div class="av-stage" aria-hidden="true"><div class="av-card"><figure class="av-s" style="--i:0"><img src="brand/art/a1.webp" alt="" width="440" decoding="async"></figure><figure class="av-s" style="--i:1"><img src="brand/art/a3.webp" alt="" width="440" decoding="async"></figure><figure class="av-s" style="--i:2"><img src="brand/art/a5.webp" alt="" width="440" decoding="async"></figure><figure class="av-s" style="--i:3"><img src="brand/art/a8.webp" alt="" width="440" decoding="async"></figure><figure class="av-s" style="--i:4"><img src="brand/art/a9.webp" alt="" width="440" decoding="async"></figure></div><div class="av-caps"><div class="av-c" style="--i:0"><b>Every customer project, one workspace</b><span>Contract, workshops, requirements and BRD stay together.</span></div><div class="av-c" style="--i:1"><b>Requirements captured as you talk</b><span>Workshop notes turn into structured requirements.</span></div><div class="av-c" style="--i:2"><b>Workshops that keep everyone aligned</b><span>Facilio and the customer see the same plan.</span></div><div class="av-c" style="--i:3"><b>A BRD that writes itself</b><span>AI-assisted drafts you review and approve.</span></div><div class="av-c" style="--i:4"><b>From UAT to go-live, on schedule</b><span>Track sign-offs and changes to the finish.</span></div><div class="av-pills"><i style="--i:0"></i><i style="--i:1"></i><i style="--i:2"></i><i style="--i:3"></i><i style="--i:4"></i></div></div></div><div class="avj" aria-hidden="true"><div class="avj-line"><span></span></div><div class="avj-n" style="--i:0"><b></b><span>Contract</span></div><div class="avj-n" style="--i:1"><b></b><span>Workshops</span></div><div class="avj-n" style="--i:2"><b></b><span>Requirements</span></div><div class="avj-n" style="--i:3"><b></b><span>BRD</span></div><div class="avj-n" style="--i:4"><b></b><span>UAT</span></div><div class="avj-n" style="--i:5"><b></b><span>Go-live</span></div></div><div class="auth-note">Customer data is stored privately per project and is only available to project members.</div></div>
      <div class="auth-form"><div class="auth-box"><div class="auth-hello">${authTab === 'signup' || authTab === 'customer' || authTab === 'guest' ? 'Welcome!' : 'Welcome back!'}</div><h2>${authTab === 'signup' ? 'Create your consultant account' : authTab === 'customer' ? 'Guest / customer access' : 'Sign in'}</h2><div class="sub">${({ signup: 'New here? Set up your account in a minute.', login: 'Sign in with your work email.', guest: 'A private workspace, no email or password.', customer: 'Enter the access code your Facilio team gave you.' })[authTab]}</div>
      <div class="seg" style="margin-bottom:18px;width:100%">${tabs.map(([k, l]) => `<button class="${authTab === k ? 'on' : ''}" style="flex:1" data-act="authTab" data-v="${k}">${esc(l)}</button>`).join('')}</div>
      ${authMsg ? `<div class="notice err" style="margin-bottom:14px" role="alert">${esc(authMsg)}</div>` : ''}<div class="auth-fields">${f[authTab]}</div>${(authAnimated = true) && ''}${V.office() && authTab !== 'customer' ? '<div class="auth-or"><span>or</span></div><button class="btn lg" data-act="officeContinue">Continue without signing in</button>' : ''}${authTab !== 'customer' ? '<div class="xs" style="margin-top:16px;text-align:center"><a href="#" data-act="adminSetup">Administrator sign-in</a></div>' : ''}</div></div></div>`;
  }
  // Facilio Run build: sign-in is the Facilio Microsoft login the platform already did, so this screen is a welcome with one button
  function authHtml() {
    const h = authHtmlBase(); if (!root.FWBRun || !S.user) return h; const i = h.indexOf('<div class="auth-form">'); const first = String(S.user.name || '').split(' ')[0] || 'there';
    return h.slice(0, i) + `<div class="auth-form"><div class="auth-box"><div class="auth-hello">${authMsg ? 'See you soon' : 'Welcome'}, ${esc(first)}</div><h2>Delivery Studio</h2><div class="sub">${authMsg ? esc(authMsg) : 'You are signed in with your Facilio account (' + esc(S.user.email) + ').'}</div><div class="auth-fields"><button class="btn primary lg" style="width:100%" data-act="runEnter">Open workspace</button></div></div></div></div>`;
  }
  function mountAuth() { document.querySelectorAll('.auth-box input').forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') { const g = e.target.closest('.auth-key'); const b = g ? g.querySelector('.btn') : document.querySelector('.auth-box .btn.primary'); if (b) b.click(); } })); const f = document.querySelector('.auth-box input:not([value]):not([type=hidden])') || document.querySelector('.auth-box input'); if (f) f.focus(); }
  const val = id => (document.getElementById(id) || {}).value || '';
  ACT.runEnter = async () => { try { loading(true, 'Opening your workspace…'); authMsg = ''; await gate(afterLogin); } catch (e) { toast(e.message, 5000, true); } finally { loading(false); } };
  ACT.authTab = a => { authTab = a.getAttribute('data-v'); authMsg = ''; render(); };
  // roadmap introduction between sign-in and the home page (see roadmap.js); skipped when switched off, automated, or already refreshed into a session
  async function gate(next) { if (V.roadmap && V.roadmapDue && V.roadmapDue()) { loading(false); await V.roadmap(); loading(true, 'Opening your workspace…'); } return next(); }
  ACT.doLogin = async () => { try { loading(true, 'Signing in…'); const r = await API.post('/api/auth/login', { email: val('a_email'), password: val('a_pw') }, { noAuthRedirect: true }); S.user = r.user; authMsg = ''; await gate(afterLogin); } catch (e) { authMsg = e.message; render(); } finally { loading(false); } };
  ACT.doSignup = async () => { try { loading(true, 'Creating account…'); const r = await API.post('/api/auth/signup', { name: val('a_name'), email: val('a_email'), password: val('a_pw'), inviteCode: val('a_inv') }, { noAuthRedirect: true }); S.user = r.user; authMsg = ''; await gate(afterLogin); } catch (e) { authMsg = e.message; render(); } finally { loading(false); } };
  ACT.doGuest = async () => { try { loading(true, 'Creating your workspace…'); const r = await API.post('/api/auth/guest', { name: val('g_name'), inviteCode: val('g_code') }, { noAuthRedirect: true }); S.user = r.user; authMsg = ''; await gate(afterLogin); showGuestKey(r.guestKey); } catch (e) { authMsg = e.message; render(); } finally { loading(false); } };
  ACT.doGuestKey = async () => { try { loading(true, 'Opening your workspace…'); const r = await API.post('/api/auth/guest-login', { key: val('g_key') }, { noAuthRedirect: true }); S.user = r.user; authMsg = ''; await gate(afterLogin); } catch (e) { authMsg = e.message; render(); } finally { loading(false); } };
  function showGuestKey(key) { drawer('Save your guest key', `<div class="notice warn" style="margin-bottom:14px"><div><b>Copy this key and keep it somewhere safe.</b> It is the only way back into your guest workspace on another browser or after you sign out. It is shown only once.</div></div><div class="row"><input type="text" readonly value="${esc(key)}" id="gk_val" class="mono"><button class="btn" data-act="copyGuestKey">${ico('copy')}Copy</button></div><p class="small muted" style="margin-top:12px">You can turn this guest workspace into a normal account (email + password) at any time from the menu under your initials.</p>`, '<button class="btn primary" data-act="closeDrawer">I have saved it</button>'); }
  ACT.copyGuestKey = async () => { const i = document.getElementById('gk_val'); try { await navigator.clipboard.writeText(i.value); toast('Guest key copied'); } catch (e) { i.select(); toast('Select the key and copy it'); } };
  ACT.upgradeGuest = () => { const p = document.getElementById('userPop'); if (p) p.remove(); drawer('Save as a full account', `<p class="small muted" style="margin-top:0">Add an email and password so you can sign in normally. Your projects stay as they are.</p><div class="fld"><label class="f">Work email</label><input type="email" id="up_email" autocomplete="username"></div><div class="fld" style="margin-top:10px"><label class="f">Password (min. 10 characters)</label><input type="password" id="up_pw" autocomplete="new-password"></div>`, '<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="doUpgrade">Save account</button>'); };
  ACT.doUpgrade = async () => { const r = await API.post('/api/auth/upgrade', { email: val('up_email').trim(), password: val('up_pw') }); S.user = Object.assign(S.user, r.user); closeDrawer(); toast('Account saved — sign in with your email from now on'); render(); };
  ACT.doCustomer = async () => { try { loading(true, 'Opening project…'); let pid = val('c_pid').trim(), code = val('c_code').trim(); const lm = code.match(/\/c\/([A-Za-z0-9_-]+)(?:~([A-Za-z0-9_-]+))?/); if (lm) { pid = lm[1]; code = lm[2] || ''; if (!code) throw new Error('This link has no code in it. Ask your Facilio team for the full invite link, or add the access code.'); } const r = await API.post('/api/auth/customer', { projectId: pid || undefined, accessCode: code, name: val('c_name') }, { noAuthRedirect: true }); S.user = r.user; authMsg = ''; await gate(() => openProject(r.user.projectId)); } catch (e) { authMsg = e.message; render(); } finally { loading(false); } };

  // ---------- projects ----------
  let projects = [];
  async function loadProjects() { projects = (await API.get('/api/projects')).projects; }
  const projInitials = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
  const PTONE = ['#0a5fe8', '#e91e84', '#14a8a8', '#6b4ee6', '#e08a00'];
  const PP_STAGE = [
  ['<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>', 'Sign &amp; scope'],
  ['<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 5a3 3 0 010 6M18 14c2 .7 3 2.6 3 6"/>', 'Discover needs'],
  ['<path d="M5 4h14v16H5z"/><path d="M9 9l2 2 4-4M9 15h6"/>', 'Capture &amp; confirm'],
  ['<path d="M6 3h9l3 3v15H6z"/><path d="M9 11h6M9 15h6M9 7h3"/>', 'Write &amp; approve'],
  ['<path d="M4 12l5 5L20 6"/>', 'Test &amp; sign off'],
  ['<path d="M12 3c3 2 5 5 5 9l-2 3H9l-2-3c0-4 2-7 5-9z"/><circle cx="12" cy="10" r="1.5"/><path d="M9 18l-2 3 3-1M15 18l2 3-3-1"/>', 'Launch &amp; support']
];
function projectsHtml() {
    const q = (S.ui.projQ || '').toLowerCase(); const list = projects.filter(p => !q || (p.name + ' ' + p.customer + ' ' + (p.description || '')).toLowerCase().includes(q));
    const hr = new Date().getHours(); const hello = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening'; const nm = S.user && S.user.name && !S.user.guest && S.user.email && !/guest\.local$/.test(S.user.email) ? ', ' + String(S.user.name).split(' ')[0] : '';
    const last = projects.slice().sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0];
    const wk = Date.now() - 7 * 864e5; const recent = projects.filter(p => p.updatedAt && new Date(p.updatedAt).getTime() > wk).length; const custs = new Set(projects.map(p => p.customer).filter(Boolean)).size;
    const SV = { f: '<path d="M3 7.5h7l2 2h9v10.5H3z"/><path d="M3 7.5V5h7l2 2"/>', u: '<path d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20"/><circle cx="9" cy="7" r="3.5"/><path d="M16 3.8a3.5 3.5 0 0 1 0 6.8M18 14.5a4 4 0 0 1 4 4V20"/>', r: '<path d="M20 7v5h-5"/><path d="M4.8 9A7.5 7.5 0 0 1 18 6l2 6"/><path d="M4 17v-5h5"/><path d="M19.2 15A7.5 7.5 0 0 1 6 18l-2-6"/>', c: '<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M7.5 3v4M16.5 3v4M3.5 10h17"/><path d="M8 14h3"/>' };
    const stat = (n, l, tone, k) => `<article class="pp-stat"><div class="pp-icon ${tone}"><svg viewBox="0 0 24 24" aria-hidden="true">${SV[k]}</svg></div><div><div class="pp-value">${n}</div><div class="pp-label">${l}</div></div></article>`;
    const steps = [['Contract', '#0a7aff', '#0a7aff'], ['Workshops', '#0a7aff', '#0057d9'], ['Requirements', '#0057d9', '#24216f'], ['BRD', '#24216f', '#24216f'], ['UAT', '#24216f', '#ed168b'], ['Go-live', '#ed168b', '#ed168b']];
    const newBtn = `<button class="pp-primary" type="button" data-act="newProject">＋ New Project</button>`;
    return `<div class="projects-page pp"><section class="pp-hero"><div><p class="pp-eyebrow">${hello}${esc(nm)} <span aria-hidden="true">👋</span></p><h1>Customer projects</h1><p class="pp-copy">Plan, organize, and deliver customer implementations with the help of AI.</p></div>
        <div class="pp-art" aria-hidden="true"><span class="pp-glow"></span><div class="pp-panel back"><span class="pp-plabel">WORKSPACE</span><span class="pp-line l1"></span><span class="pp-line l2"></span><span class="pp-line l3"></span></div><div class="pp-panel"><span class="pp-plabel">facilio</span><span class="pp-line l1"></span><span class="pp-line l2"></span><div class="pp-chart"><i></i><i></i><i></i></div></div><span class="pp-orb">AI</span><span class="pp-spark s1">✦</span><span class="pp-spark s2">✧</span></div>${newBtn}</section>
      <section class="pp-stats" aria-label="Project statistics">${stat(projects.length, 'Projects', '', 'f')}${stat(custs, 'Customers', 'teal', 'u')}${stat(recent, 'Updated this week', 'pink', 'r')}${stat(last ? esc(fmtDate(last.updatedAt)) : '—', 'Last activity', 'navy', 'c')}</section>
      <section class="pp-journey"><div class="pp-head"><h2>Your delivery journey</h2><button class="pp-watch" type="button" data-act="replayRoadmap"><span>▶</span> WATCH THE INTRODUCTION</button></div><div class="pp-timeline">${steps.map((t, i) => { const m = PP_STAGE[i] || PP_STAGE[0]; return `<div class="pp-stage" style="--c:${t[1]};--n:${t[2]};--d:${i * 90}ms"><div class="pp-tile"><span class="pp-step">STEP ${i + 1}</span><div class="pp-node"><svg viewBox="0 0 24 24" aria-hidden="true">${m[0]}</svg></div><div class="pp-stage-label">${t[0]}</div><div class="pp-stage-sub">${m[1]}</div></div></div>`; }).join('')}</div></section>
      ${projects.length > 3 ? `<div class="pp-search-row"><input type="search" id="projQ" class="proj-search" placeholder="Search projects" value="${esc(S.ui.projQ || '')}" aria-label="Search projects"></div>` : ''}
      ${list.length ? '<div class="pj-sec">Your projects</div>' : ''}
      ${list.length ? `<div class="grid g3 proj-grid">${list.map((p, k) => `<div class="card proj-card" style="--tone:${PTONE[k % PTONE.length]};--d:${Math.min(k, 8) * 60}ms" data-act="openProject" data-id="${esc(p.id)}" role="button" tabindex="0"><div class="row" style="align-items:flex-start;gap:12px"><div class="proj-av">${esc(projInitials(p.customer || p.name))}</div><div style="flex:1;min-width:0"><h3>${esc(p.name)}</h3><div class="cust">${esc(p.customer)}</div></div>${tag(p.role === 'owner' ? 'blue' : p.role === 'viewer' ? 'low' : 'green', humanize(p.role))}</div><div class="small muted proj-desc">${esc((p.description || '').slice(0, 140)) || 'No description yet.'}</div><div class="row proj-foot"><span class="xs muted" style="flex:1">Updated ${esc(fmtDate(p.updatedAt))}${p.startDate ? ' · starts ' + esc(fmtDate(p.startDate)) : ''}</span>${p.role !== 'viewer' ? `<button class="btn sm" data-act="editProjectCard" data-id="${esc(p.id)}">${ico('edit')}Edit details</button>` : ''}</div></div>`).join('')}</div>`
        : projects.length ? `<div class="card empty"><h3>No project matches</h3><p>Try a different name or customer.</p></div>`
        : `<section class="pp-empty"><div class="pp-folders" aria-hidden="true"><span class="pp-folder f1"></span><span class="pp-folder f2"></span><span class="pp-folder f3"></span><span class="pp-fspark">✦</span></div><h2>No projects yet</h2><p>Create a project for a customer implementation to start preparing workshops, or upload the customer's org package to set it up automatically.</p>${newBtn}</section>`}</div>`;
  }
  document.addEventListener('input', e => { if (e.target && e.target.id === 'projQ') { S.ui.projQ = e.target.value; const pos = e.target.selectionStart; if (mode === 'projects') { render(); const i = document.getElementById('projQ'); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (x) { } } } } });
  ACT.openProject = a => openProject(a.getAttribute('data-id'));
  ACT.editProjectCard = async (a, e) => { if (e) e.stopPropagation(); await openProject(a.getAttribute('data-id')); S.ui.setTab = 'project'; go('settings'); };
  ACT.newProject = () => { npZipFile = null;
    const person = (k, i) => `<div class="row" style="margin-bottom:6px" data-person="${k}"><input type="text" placeholder="Name" style="flex:1" data-p="name"><input type="text" placeholder="${k === 'team' ? 'Role (e.g. Implementation Consultant)' : 'Role / department'}" style="flex:1" data-p="role"><input type="email" placeholder="Email" style="flex:1" data-p="email"></div>`;
    drawer('New project', `<div class="fgrid"><div class="full"><label class="f">Project name <span class="req">*</span></label><input type="text" id="np_name" placeholder="e.g. Facilio CAFM Implementation"></div>
      <div class="full"><label class="f">Customer / organisation <span class="req">*</span></label><input type="text" id="np_cust"></div>
      <div class="full"><label class="f">Description</label><textarea id="np_desc" rows="3"></textarea></div>
      <div><label class="f">Start date</label><input type="date" id="np_start"></div><div><label class="f">Target go-live</label><input type="date" id="np_end"></div></div>
      <div class="pink-label">Facilio org package (optional)</div><div class="row"><button class="btn sm" data-act="npZip" type="button">${ico('upl')}Choose package (.zip)</button><span id="np_zipname" class="small muted">None — the bundled reference configuration is used</span></div><div class="xs muted" style="margin-top:4px">Builds the project's modules, forms, state flows, roles and rules from the customer's own org package. It is read in your browser; contact details are removed before anything is saved.</div>
      <div class="pink-label">Implementation team</div><div id="np_team">${person('team')}${person('team')}</div><button class="btn sm" data-act="npAddPerson" data-k="team">${ico('plus')}Member</button>
      <div class="pink-label">Customer stakeholders</div><div id="np_stake">${person('stake')}${person('stake')}</div><button class="btn sm" data-act="npAddPerson" data-k="stake">${ico('plus')}Stakeholder</button>
      <div class="pink-label">Customer access</div><label class="f">Customer access code (optional, min. 8 characters)</label><input type="password" id="np_code" autocomplete="new-password"><div class="xs muted" style="margin-top:4px">Lets customer stakeholders open the user guide, schedule, kick-off deck and dashboards and send questions. It can be set or changed later in Project Settings.</div>`,
      `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="createProject">Create project</button>`);
    if (V.office()) { const c = document.getElementById('np_code'); if (c) [c.previousElementSibling, c.previousElementSibling && c.previousElementSibling.previousElementSibling, c.nextElementSibling, c].forEach(e => e && (e.style.display = 'none')); }
  };
  ACT.npAddPerson = a => { const k = a.getAttribute('data-k'); const host = document.getElementById(k === 'team' ? 'np_team' : 'np_stake'); const div = document.createElement('div'); div.innerHTML = host.firstElementChild.outerHTML; div.firstElementChild.querySelectorAll('input').forEach(i => i.value = ''); host.appendChild(div.firstElementChild); };
  let npZipFile = null;
  ACT.npZip = async () => { const f = (await V.pickFile('.zip'))[0]; if (!f) return; npZipFile = f; const n = document.getElementById('np_zipname'); if (n) n.textContent = f.name + ' (' + Math.round(f.size / 1024).toLocaleString() + ' KB)'; };
  ACT.createProject = async () => {
    const people = sel => Array.from(document.querySelectorAll(sel + ' [data-person]')).map(r => ({ name: r.querySelector('[data-p=name]').value.trim(), role: r.querySelector('[data-p=role]').value.trim(), email: r.querySelector('[data-p=email]').value.trim() })).filter(p => p.name);
    const body = { name: val('np_name'), customer: val('np_cust'), description: val('np_desc'), startDate: val('np_start'), endDate: val('np_end'), team: people('#np_team'), stakeholders: people('#np_stake'), accessCode: val('np_code') || undefined };
    try { loading(true, 'Creating project…'); const r = await API.post('/api/projects', body); closeDrawer(); const zip = npZipFile; npZipFile = null; await openProject(r.project.id, true); if (zip && V.loadOrgPackage) { const done = await V.loadOrgPackage(zip); if (!done) toast('The project was created, but the package was not loaded. You can load it again in Project Settings → Configuration source.', 9000, true); } }
    catch (e) { toast(e.message, 5000, true); } finally { loading(false); }
  };

  // ---------- open project ----------
  let refCache = null;
  async function openProject(id, isNew) {
    loading(true, 'Opening project…');
    try {
      const refP = (S.user.kind === 'consultant' && !refCache) ? API.reference().catch(() => null) : null; // start the reference download now, in parallel with the project data
      const consultantSections = ['workshop', 'people', 'planner', 'reviews', 'transcripts', 'dashboards', 'brddoc', 'plan', 'config', 'guide_published', 'schedule_published', 'portal_controls', 'portal_published', 'onboarding_published', 'plan_struct', 'ftr_wb', 'kpi_wb'].concat(V.extraSections || []);
      const wanted = S.user.kind === 'customer' ? ['guide_published', 'schedule_published', 'dashboards', 'portal_controls', 'portal_published', 'onboarding_published', 'plan_struct'] : consultantSections;
      // one request for project + members + documents + records (was ~18); falls back to the separate requests if it fails
      let bundle = null; try { bundle = await API.get('/api/projects/' + id + '/open?sections=' + wanted.join(',') + '&kinds=all'); } catch (e) { if (e.status === 404 || e.status === 403 || e.status === 401) throw e; }
      const r = bundle || await API.get('/api/projects/' + id); S.project = r.project; S.members = r.members || []; S.readonly = S.project.role === 'viewer' || S.project.role === 'customer';
      if (V.items) V.items.reset();
      await F.loadProjectDocs(id, wanted, bundle && bundle.docs);
      if (bundle && V.items && V.items.prime) V.items.prime(bundle.items, bundle.kinds);
      if (S.user.kind === 'consultant') {
        const p = S.ws.project; if (!p.client) p.client = S.project.customer; if (!p.consultant) p.consultant = S.user.name;
        const cfg = F.doc('config');
        loadingMsg('Loading configuration…');
        if (cfg.source === 'imported' && cfg.importedFileId) { try { const d = await API.downloadFile(id, cfg.importedFileId); F.setBaseline(await API.gunzipJson(d.blob), Object.assign({ kind: 'imported', label: (cfg.importedMeta || {}).sourceName }, cfg.importedMeta)); } catch (e) { toast('Imported configuration could not be loaded — using the reference configuration. ' + e.message, 6000, true); refCache = refCache || (refP && await refP) || await API.reference(); F.setBaseline(refCache.baseline, refCache.meta); } }
        else { refCache = refCache || (refP && await refP) || await API.reference(); F.setBaseline(refCache.baseline, refCache.meta); }
        if (isNew) { F.changed('Project created', S.project.name, { render: false }); }
      }
      mode = 'workspace';
      const h = (location.hash.match(/#\/p\/[^/]+\/([a-z_]+)(?:\/(.+))?/) || []);
      const custViews = navFor().flatMap(g => g.items.map(i => i[0]));
      const startView = S.user.kind === 'customer' ? (h[1] && custViews.includes(h[1]) ? h[1] : (custViews[0] || 'cust_home')) : (h[1] && V[h[1]] ? h[1] : 'overview');
      go(startView, h[2] ? { module: decodeURIComponent(h[2]) } : {});
    } finally { loading(false); }
  }
  V.openProject = openProject;
  async function afterLogin() { await loadProjects(); mode = 'projects'; const m = location.hash.match(/#\/p\/([A-Za-z0-9_-]+)/); if (m && projects.find(p => p.id === m[1])) return openProject(m[1]); history.replaceState(null, '', '#/projects'); render(); }
  V.refreshProjectMeta = async () => { const r = await API.get('/api/projects/' + S.project.id); S.project = r.project; S.members = r.members || []; render(); };

  root.FWBShell = {
    sessionExpired() { if (mode === 'auth') return; if (V.office()) { location.reload(); return; } S.user = null; mode = 'auth'; authMsg = 'Your session has ended. Please sign in again.'; render(); },
    async conflict(section) {
      const ok = await confirmDialog('Changes conflict', `Someone else saved "${section}" while you were editing. Reload the latest version? Your unsaved changes in this section will be lost; other sections are kept.`, 'Reload latest');
      if (ok) await F.reloadSection(section);
    }
  };

  async function boot() {
    const app = document.getElementById('app'); app.innerHTML = '<div class="boot"><img src="brand/logo-navy.png" alt="Facilio" height="30"><div class="boot-bar"><span></span></div></div>';
    try { const me = await API.get('/api/auth/me', { noAuthRedirect: true }); health.signupEnabled = !!me.signupEnabled; health.signupNeedsCode = me.signupNeedsCode !== false; health.openMode = !!me.openMode; if (!health.signupEnabled && authTab === 'signup') authTab = 'login'; S.user = me.user; }
    catch (e) { app.innerHTML = `<div style="padding:60px;text-align:center"><h2>Service unavailable</h2><p class="muted">${esc(e.message)}. The application's API (Netlify Functions and Database) must be deployed and configured.</p></div>`; return; }
    if (!S.user) { mode = 'auth'; render(); return; }
    if (root.FWBRun && !/#\/p\//.test(location.hash)) { mode = 'auth'; render(); return; }
    if ((health.openMode || S.user.kind === 'customer') && V.roadmap && V.roadmapDue && V.roadmapDue({ once: true })) { try { await V.roadmap(); } catch (e) { } }
    try { if (S.user.kind === 'customer') await openProject(S.user.projectId); else await afterLogin(); } catch (e) { toast(e.message, 5000, true); mode = S.user.kind === 'customer' ? 'auth' : 'projects'; render(); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window);

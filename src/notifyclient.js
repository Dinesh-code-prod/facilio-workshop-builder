/* Notifications in the browser (server side: work/server/_notify.mjs; plan: docs/plans/NOTIFY-MAIL-STAGES-PLAN-2026-11-07.md, section 2).
   The bell shows the person's server list ("For you"); a live signal over the app WebSocket (or a 60 second check while the page is visible) fetches new ones; a new one shows as a toast and,
   if the person allowed it, as a system pop-up (only while a Studio tab is open: the platform has no push to a closed browser). Preferences (per event: in-app, browser, Teams; quiet hours) are in the drawer
   opened from the bell. Customers get nothing: the server never notifies them, and this file does nothing for them. */
(function (root) {
  'use strict';
  const F = root.FWB; const V = root.FWBViews; const API = root.FWBApi; if (!F || !F.S || !V || !API) return; const { S, esc } = F; const ACT = V.ACT;
  const st = { items: [], unread: 0, prefs: null, events: {}, teams: false, h: '', loaded: false, started: false };
  const team = () => !!(S.user && V.isCustomer && !V.isCustomer());
  const seenKey = () => 'fwb_nt_seen_' + ((S.user && S.user.id) || '');
  const seen = () => { try { return new Set(JSON.parse(root.sessionStorage.getItem(seenKey()) || '[]')); } catch (e) { return new Set(); } };
  const saveSeen = s => { try { root.sessionStorage.setItem(seenKey(), JSON.stringify([...s].slice(-200))); } catch (e) { } };
  // another project: the page opens there, then the bell takes it to the exact tab and item (src/bell.js reads fwb_nt_next)
  const go = x => { try { if (x.x) root.sessionStorage.setItem('fwb_nt_next', JSON.stringify({ pid: x.pid, view: x.view, x: x.x })); } catch (e) { } root.location.hash = '#/p/' + x.pid + '/' + (x.view || 'projdash') + (x.view === 'taskpage' && x.x && x.x.tkPageId ? '/' + encodeURIComponent(x.x.tkPageId) : ''); };
  // the bell blinks while work waits on this person and they have not opened the bell since it came (user, 23 Nov 2026); reading or finishing it stops it too
  const URGENT = new Set(['missed_step', 'task_assigned', 'task_due', 'approval_requested', 'lifecycle_nudge']);
  const popKey = () => 'fwb_nt_popseen_' + ((S.user && S.user.id) || '');
  const popSeen = () => { try { return new Set(JSON.parse(root.sessionStorage.getItem(popKey()) || '[]')); } catch (e) { return new Set(); } };
  V.notifyUrgent = () => { if (!team()) return 0; const s = popSeen(); return st.items.filter(x => !x.read && !x.done && URGENT.has(x.type) && !s.has(x.id)).length; };
  V.notifySeen = () => { const s = popSeen(); st.items.forEach(x => s.add(x.id)); try { root.sessionStorage.setItem(popKey(), JSON.stringify([...s].slice(-300))); } catch (e) { } paint(); };
  // where the updates are (user, 23 Nov 2026: "tabs which get updated ... blink"): each unread update of this project names its page (x.view). The rail stage, the page tab and the
  // rail's page list show a dot with the count while it is unread; the dot blinks for what came since you last opened that page (kept for this browser tab)
  const blKey = () => 'fwb_nt_blink_' + ((S.user && S.user.id) || '');
  const blSeen = () => { try { return new Set(JSON.parse(root.sessionStorage.getItem(blKey()) || '[]')); } catch (e) { return new Set(); } };
  const vk = v => (V.viewKey ? V.viewKey(v) : v);   // older page names (overview, module) count as the menu entry that holds them
  const mine = () => (team() && S.project ? st.items.filter(x => !x.read && !x.done && x.view && x.pid === S.project.id).map(x => Object.assign({}, x, { view: vk(x.view) })) : []);
  V.updPages = ids => { const xs = mine().filter(x => ids.includes(x.view)); if (!xs.length) return { n: 0, fresh: false }; const s = blSeen(); return { n: xs.length, fresh: xs.some(x => !s.has(x.id)) }; };
  V.updVisit = view => { const xs = mine().filter(x => x.view === view); if (!xs.length) return; const s = blSeen(); const k = s.size; xs.forEach(x => s.add(x.id)); if (s.size !== k) try { root.sessionStorage.setItem(blKey(), JSON.stringify([...s].slice(-300))); } catch (e) { } };
  V.updMark = u => (u && u.n ? '<i class="upd-dot' + (u.fresh ? ' new' : '') + '" aria-hidden="true">' + (u.n > 9 ? '9+' : u.n) + '</i>' : '');
  // a new update arrives while the page is open: mark the rail and the page tabs in place (the next page draw makes the same marks)
  function paintUpd() {
    if (S.ui && S.ui.view && V.updVisit) V.updVisit(S.ui.view);
    document.querySelectorAll('.sidebar .rl-b[data-pages], .mt-bar .mt-t[data-view]').forEach(b => {
      let ids; if (b.hasAttribute('data-pages')) { try { ids = JSON.parse(b.getAttribute('data-pages')).map(p => p[0]).filter(id => id !== '#'); } catch (e) { return; } } else ids = [b.getAttribute('data-view')];
      const u = V.updPages(ids), html = V.updMark(u), old = b.querySelector(':scope > .upd-dot');
      if (!html) { if (old) old.remove(); b.classList.remove('has-upd'); return; }
      b.classList.add('has-upd'); if (old && old.outerHTML === html) return; if (old) old.remove(); b.insertAdjacentHTML('beforeend', html);
    });
  }
  /** the badge and the blink change without drawing the whole page again */
  function paint() {
    paintUpd();
    const b = document.querySelector('.bell'); if (!b || !V.bellCount) return; const n = V.bellCount(); let el = b.querySelector('.bell-n');
    if (n) { if (!el) { el = document.createElement('span'); el.className = 'bell-n'; b.appendChild(el); } el.textContent = n > 9 ? '9+' : String(n); } else if (el) el.remove();
    const u = V.notifyUrgent(); b.classList.toggle('bell-alert', !!u);
    b.setAttribute('aria-label', 'Notifications' + (n ? ', ' + n + ' unread' : '') + (u ? ', ' + u + ' need you' : '')); if (document.getElementById('bellPop') && V.bellRedraw) V.bellRedraw();
  }
  function popup(x) {
    try { if (!('Notification' in root) || root.Notification.permission !== 'granted') return; const n = new root.Notification(x.title, { body: x.text, tag: x.id }); n.onclick = () => { root.focus(); go(x); n.close(); }; } catch (e) { }
  }
  function announce(first) {
    const s = seen(); const fresh = st.items.filter(x => !x.read && !s.has(x.id)); fresh.forEach(x => s.add(x.id)); saveSeen(s); if (first) return;   // what was already waiting when the page opened is in the badge, not a pile of pop-ups
    fresh.slice(0, 3).forEach(x => { if (V.toast && !S.project) V.toast(x.title + (x.text ? ': ' + x.text : ''), 7000); if (x.browser) popup(x); });   // inside a project the bell's own pop-up shows it, with Open
  }
  async function load() {
    if (!team() || load.busy) return; load.busy = true;
    try { const r = await API.get('/api/notifications', { noAuthRedirect: true }); st.items = r.items || []; st.unread = r.unread || 0; st.prefs = r.prefs || null; st.events = r.events || {}; st.teams = !!r.teams; st.h = r.h || st.h; const first = !st.loaded; st.loaded = true; announce(first); paint(); }
    catch (e) { /* the bell still shows its own rules */ } finally { load.busy = false; }
  }
  let ws = null, back = 2000;
  function connect() {
    if (ws || !root.WebSocket || root.location.protocol !== 'https:') return;
    try {
      ws = new root.WebSocket('wss://' + root.location.host + '/ws');
      ws.onopen = () => { back = 2000; };
      ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } if (!m || m.type === 'rate_limited') return; const d = m.data; if (d && d.type === 'notify' && (!st.h || d.for === st.h)) load(); };
      ws.onclose = () => { ws = null; setTimeout(connect, back); back = Math.min(back * 2, 60000); };
      ws.onerror = () => { try { ws.close(); } catch (e) { } };
    } catch (e) { ws = null; }
  }
  async function sweep() { const k = 'fwb_ntsw_' + ((S.user && S.user.id) || '') + '_' + new Date().toISOString().slice(0, 10); try { if (root.localStorage.getItem(k)) return; root.localStorage.setItem(k, '1'); } catch (e) { } try { const r = await API.post('/api/notifications/sweep', {}); if (r && r.notified) load(); } catch (e) { } }
  function start() { if (st.started || !team()) return; st.started = true; load(); sweep(); connect(); setInterval(() => { if (document.visibilityState === 'visible') load(); }, 60000); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') load(); }); }
  /** the rows the bell shows ("For you"); the first call starts the checks */
  V.notifyItems = () => { if (!team()) return []; start(); const here = S.project && S.project.id; return st.items.slice(0, 25).map(x => ({ id: 'sv-' + x.id, sid: x.id, srv: true, kind: x.type === 'missed_step' && !x.done ? 'miss' : 'srv', read: !!x.read, done: !!x.done, state: x.state || '', overdue: !!x.overdue, owner: x.owner || '', more: x.more || '', x: x.x || null, pid: x.pid, view: x.view, cat: x.cat, type: x.type, title: x.title, body: x.text, pname: x.pname, at: x.at, by: x.by, due: x.due, text: (here && x.pid && x.pid !== here && x.pname ? x.pname + ': ' : '') + x.title })); };
  V.notifyRead = async ids => { st.items.forEach(x => { if (ids.includes(x.id)) x.read = true; }); st.unread = st.items.filter(x => !x.read).length; paint(); try { await API.post('/api/notifications/read', { ids }); } catch (e) { } };
  V.notifyReadAll = async () => { st.items.forEach(x => { x.read = true; }); st.unread = 0; paint(); try { await API.post('/api/notifications/read', { all: true }); } catch (e) { } };
  V.notifyGo = go;
  /** a stage whose records are all done: tell the server once a day (it tells the team once a day too) */
  V.notifyStageReady = async x => {
    if (!team() || S.readonly || !S.project) return; const k = 'fwb_nsr_' + S.project.id + '_' + x.k + '_' + new Date().toISOString().slice(0, 10); try { if (root.localStorage.getItem(k)) return; root.localStorage.setItem(k, '1'); } catch (e) { }
    try { await API.post('/api/projects/' + S.project.id + '/notify-event', { type: 'stage_ready', stage: x.k, name: x.name }); } catch (e) { }
  };
  // ---------- settings ----------
  const perm = () => ('Notification' in root ? root.Notification.permission : 'unsupported');
  ACT.ntPrefs = async () => {
    if (!team()) return; if (!st.prefs) await load(); const p = st.prefs || { types: {}, quiet: null }; const ev = st.events || {};
    const row = k => { const c = (p.types && p.types[k]) || {}; const cb = (ch, on) => `<td style="text-align:center"><input type="checkbox" id="np_${k}_${ch}" aria-label="${esc(ev[k] || k)}: ${ch}"${on ? ' checked' : ''}></td>`; return `<tr><td>${esc(ev[k] || k)}</td>${cb('inapp', c.inapp !== false)}${cb('browser', !!c.browser)}${cb('teams', !!c.teams)}</tr>`; };
    const q = p.quiet || { from: '', to: '' }; const pm = perm();
    V.drawer('Notification settings', `<p class="small muted" style="margin-top:0">Choose how you are told about each event. <b>In the bell</b> is always the safe default. <b>Pop-up</b> shows a system notice while a Studio tab is open. <b>Teams</b> sends you a message from Otto, which reaches you when the Studio is closed${st.teams ? '' : ' (Teams messages are switched off for this app until an app owner turns them on)'}.</p>
      <table class="tbl"><thead><tr><th>When</th><th style="text-align:center">In the bell</th><th style="text-align:center">Pop-up</th><th style="text-align:center">Teams</th></tr></thead><tbody>${Object.keys(ev).map(row).join('')}</tbody></table>
      <h4 style="margin:14px 0 6px">Quiet hours</h4><p class="xs muted" style="margin:0 0 6px">No pop-ups and no Teams messages between these times (your local time). The bell still fills.</p><div class="row" style="gap:8px;align-items:center"><input type="time" id="np_qf" value="${esc(q.from)}" aria-label="Quiet from"> to <input type="time" id="np_qt" value="${esc(q.to)}" aria-label="Quiet until"></div>
      <h4 style="margin:14px 0 6px">Browser pop-ups</h4><p class="small" style="margin:0 0 6px" id="np_perm">${pm === 'granted' ? 'Allowed in this browser.' : pm === 'denied' ? 'Blocked in this browser. Change it in the address bar settings for this site.' : pm === 'unsupported' ? 'This browser does not support pop-ups.' : 'Not allowed yet.'}</p>${pm === 'default' ? '<button type="button" class="btn sm" data-act="ntAllow">Allow pop-ups in this browser</button>' : ''}`,
      '<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="ntSave">Save</button>', { wide: true });
  };
  ACT.ntAllow = async () => { try { const r = await root.Notification.requestPermission(); const el = document.getElementById('np_perm'); if (el) el.textContent = r === 'granted' ? 'Allowed in this browser.' : 'Not allowed (' + r + ').'; } catch (e) { } };
  ACT.ntSave = a => V.busy(a, async () => {
    const types = {}; Object.keys(st.events || {}).forEach(k => { const g = ch => { const e = document.getElementById('np_' + k + '_' + ch); return !!(e && e.checked); }; types[k] = { inapp: g('inapp'), browser: g('browser'), teams: g('teams') }; });
    const f = (document.getElementById('np_qf') || {}).value || '', t = (document.getElementById('np_qt') || {}).value || '';
    try { const r = await API.put('/api/notifications/prefs', { types, quiet: f && t ? { from: f, to: t } : null, tz: new Date().getTimezoneOffset() }); st.prefs = r.prefs; V.closeDrawer(); if (V.toast) V.toast('Notification settings saved', 3000); } catch (e) { if (V.toast) V.toast(e.message || 'Could not save', 5000, true); }
  });
})(typeof window !== 'undefined' ? window : globalThis);

/* Notification bell: a popover (not a drawer) with Needs you / Assistant / Activity. Every row opens the exact page and tab it is about.
   "Assistant" rows are plain rules over saved project data (overdue work, missing dates, sessions with no minutes); no AI is called and nothing is stored but the read state. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items;
  const cust = () => V.isCustomer();
  const rk = () => 'fwb_notif_read_' + (S.project && S.project.id) + '_' + ((S.user && S.user.id) || '');
  const readSet = () => { try { return new Set(JSON.parse(localStorage.getItem(rk()) || '[]')); } catch (e) { return new Set(); } };
  const saveRead = rs => { try { localStorage.setItem(rk(), JSON.stringify([...rs].slice(-400))); } catch (e) { } };

  // Rule-based nudges for the Facilio team: what the project cycle says is missing or late.
  function assistant() {
    if (cust() || !S.project) return [];
    const out = []; const today = V.today(); const mk = (id, text, view, x, tone) => out.push({ id: 'as-' + id, kind: 'ai', text, view, x: x || null, tone: tone || '' });
    if (V.planOverdue) { const late = V.planOverdue(); if (late.length) mk('plan-' + late.length, `${late.length} plan task${late.length > 1 ? 's are' : ' is'} behind schedule, starting with "${late[0].title}"`, 'timeline', null, 'late'); }
    if (I().ready(['action'])) {
      const open = I().list('action').filter(a => a.status !== 'Done');
      const od = open.filter(a => a.due && a.due < today); const odc = od.filter(a => a.side === 'customer');
      if (odc.length) mk('odc-' + odc.length, `${odc.length} action${odc.length > 1 ? 's' : ''} from ${(S.project && S.project.customer) || 'the customer'} overdue. A reminder or a call may be due`, 'governance', { govTab: 'actions' }, 'late');
      const nod = open.filter(a => !a.due).length; if (nod) mk('nodue-' + nod, `${nod} open action${nod > 1 ? 's have' : ' has'} no due date, so nobody can be late on ${nod > 1 ? 'them' : 'it'}`, 'governance', { govTab: 'actions' });
      const noo = open.filter(a => !a.owner).length; if (noo) mk('noown-' + noo, `${noo} open action${noo > 1 ? 's have' : ' has'} no owner`, 'governance', { govTab: 'actions' });
    }
    if (V.calDue) V.calDue().forEach(x => mk('cal-' + x.id + '-' + x.date, `Reminder: ${x.title} (${V.fmtDate(x.date)})`, 'plan', { planTab: 'cal' }, x.date < today ? 'late' : ''));
    const ss = ((F.doc('planner') || {}).sessions) || [];
    const past = ss.filter(s => s.date && s.date < today && !['cancelled', 'completed'].includes(s.status));
    if (past.length) mk('sess-' + past.length, `${past.length} workshop session${past.length > 1 ? 's' : ''} already happened but ${past.length > 1 ? 'are' : 'is'} not marked completed ("${past[0].title || 'Session ' + (past[0].no || '')}")`, 'planner', null, 'late');
    if (I().ready(['minutes'])) { const done = ss.filter(s => s.status === 'completed').length, mins = I().list('minutes').length; if (done > mins) mk('min-' + done + '-' + mins, `${done - mins} completed session${done - mins > 1 ? 's have' : ' has'} no meeting minutes recorded`, 'governance', { govTab: 'minutes' }); }
    if (V.controls && !(V.controls().cadence || '')) mk('cad', 'No governance meeting rhythm is set. Pick weekly, fortnightly or monthly so the calendar fills in', 'governance');
    return out;
  }

  // new entries the admin published to this project's Discover more (read from the server once per project; the read / unread mark is the same one the other notices use)
  const LIB = { pid: '', items: [] };
  function libItems() { const id = S.project && S.project.id; if (!id) return []; if (LIB.pid !== id) { LIB.pid = id; LIB.items = []; root.FWBApi.get('/api/projects/' + id + '/discover').then(r => { LIB.items = (r.items || []).slice(0, 8); V.render(); }).catch(() => { }); } return LIB.items.map(e => ({ id: 'dm-' + e.id, kind: 'new', text: 'New in Discover more: ' + e.title, view: cust() ? 'explore' : 'showcase' })); }
  const all = () => (V.notifyItems ? V.notifyItems() : []).concat(V.bellItems(), libItems(), assistant());   // the server list first (src/notifyclient.js)
  const GROUPS = [['srv', 'For you', 'Events in your projects, also sent to Teams if you chose it'], ['rem', 'Needs you', 'Reminders and things waiting on someone'], ['new', 'New from Facilio', 'Product updates published for this project'], ['ai', 'Delivery assistant', 'What the project cycle says is missing or late'], ['act', 'Activity', 'Changes made by the other side in the last 14 days']];
  const dot = x => (x.tone === 'late' ? 'late' : x.kind === 'ai' ? 'ai' : x.kind === 'act' ? 'act' : 'rem');
  // what a notification is: an icon and a short name per category, a state chip when the title starts with one ("Done: ...", "Needs your answer: ..."), the project and the time
  const IC = { check: '<path d="M5 12.5l4.5 4.5L19 7"/>', flag: '<path d="M5 21V4m0 0h11l-2 4 2 4H5"/>', shield: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/>', pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>', mail: '<path d="M3 6h18v12H3zM3 7l9 6 9-6"/>', tag: '<path d="M3 8a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-4z"/>', bell: '<path d="M6 8a6 6 0 1112 0c0 7 3 8 3 8H3s3-1 3-8M10.3 20a2 2 0 003.4 0"/>', clock: '<path d="M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z"/>' };
  const CAT = { TASK: ['Task', 'check', '#1570EF'], PROJECT: ['Project', 'flag', '#64748b'], APPROVAL: ['Approval', 'shield', '#b45309'], STAGE: ['Stage', 'flag', '#0f766e'], 'SIGN-OFF': ['Sign-off', 'pen', '#15803d'], CLAUDE: ['Claude', 'spark', '#1D1A5E'], JOB: ['Claude job', 'spark', '#1D1A5E'], MAIL: ['Mail', 'mail', '#1570EF'], TICKET: ['Ticket', 'tag', '#b42318'], UPDATE: ['Update', 'bell', '#64748b'] };
  const KIND = { rem: ['Reminder', 'bell', '#b45309'], new: ['New', 'spark', '#1570EF'], ai: ['Assistant', 'spark', '#1D1A5E'], act: ['Activity', 'clock', '#64748b'] };
  const stTone = s => (/^(done|ready|signed|approved|accepted|confirmed)/i.test(s) ? 'ok' : /(fail|concern|reject|overdue|blocked)/i.test(s) ? 'bad' : 'warn');
  const ago = at => { const t = Date.parse(at); if (!t) return ''; const m = Math.round((Date.now() - t) / 6e4); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : m < 10080 ? Math.round(m / 1440) + ' d ago' : V.fmtDate(String(at).slice(0, 10)); };

  const isRead = (x, rs) => (x.srv ? !!x.read : rs.has(x.id));   // a server notification is read on the server, the others in this browser
  function count() { const rs = readSet(); return all().filter(x => !isRead(x, rs)).length; }
  V.bellCount = count;
  V.bellHtml = () => { if (!S.project || !S.user) return ''; I().load(['action', 'signoff', 'cr', 'onb', 'raid', 'decision', 'minutes', 'onbsub']); const n = count(); return `<button class="bell" data-act="bellOpen" aria-haspopup="true" aria-label="Notifications${n ? ', ' + n + ' unread' : ''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 20a2 2 0 0 0 3.4 0"/></svg>${n ? `<span class="bell-n">${n > 9 ? '9+' : n}</span>` : ''}</button>`; };

  function close() { const p = document.getElementById('bellPop'); if (p) p.remove(); document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onOut, true); }
  const onKey = e => { if (e.key === 'Escape') close(); };
  const onOut = e => { const p = document.getElementById('bellPop'); if (p && !p.contains(e.target) && !e.target.closest('.bell')) close(); };

  function draw() {
    const rs = readSet(); const list = all(); const f = S.ui.bellTab || 'all';
    const tabs = [['all', 'All', list.length], ['unread', 'Unread', list.filter(x => !isRead(x, rs)).length]];
    const shown = list.filter(x => f === 'all' || !isRead(x, rs));
    const row = x => { const c = x.srv ? (CAT[x.cat] || CAT.UPDATE) : (KIND[x.kind] || KIND.act), m = x.srv ? /^([^:]{3,32}):\s+(.+)$/.exec(x.title || '') : null, title = x.srv ? (m ? m[2] : x.title || x.text) : x.text, un = !isRead(x, rs), time = x.srv ? ago(x.at) : '';
      return `<button type="button" class="bp-row${un ? '' : ' read'}" data-act="bellGo" data-id="${esc(x.id)}"><span class="bp-ic" style="--c:${c[2]}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[c[1]]}</svg></span><span class="bp-bd"><b class="bp-t">${esc(title)}</b><span class="bp-m"><em class="bp-tag" style="--c:${c[2]}">${esc(c[0])}</em>${m ? `<em class="bp-st ${stTone(m[1])}">${esc(m[1])}</em>` : ''}${x.srv && x.pname ? `<em class="bp-pj" title="${esc(x.pname)}">${esc(x.pname)}</em>` : ''}${time ? `<time>${esc(time)}</time>` : ''}</span>${x.srv && x.body ? `<span class="bp-x2">${esc(x.body)}</span>` : ''}</span>${un ? '<i class="bp-un" role="img" aria-label="Unread"></i>' : ''}<em class="bp-go" aria-hidden="true">&rsaquo;</em></button>`; };
    const body = GROUPS.map(([k, t, s]) => { const g = shown.filter(x => x.kind === k); return g.length ? `<section class="bp-g"><h4>${t}<span class="bp-gn">${g.length}</span><small>${s}</small></h4>${g.map(row).join('')}</section>` : ''; }).join('') || `<div class="bp-empty"><b>You are all caught up</b><span>Nothing needs you right now.</span></div>`;
    const unread = list.filter(x => !isRead(x, rs)).length;
    let p = document.getElementById('bellPop'); if (!p) { p = document.createElement('div'); p.id = 'bellPop'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Notifications'); document.body.appendChild(p); document.addEventListener('keydown', onKey); document.addEventListener('mousedown', onOut, true); }
    p.innerHTML = `<header><h3>Notifications</h3><span class="bp-n">${unread ? unread + ' unread' : 'All read'}</span><button type="button" class="bp-x" data-act="bellClose" aria-label="Close">&times;</button></header>
      <div class="bp-tabs">${tabs.map(([k, l, n]) => `<button type="button" class="${f === k ? 'on' : ''}" data-act="bellTab" data-v="${k}">${l} <b>${n}</b></button>`).join('')}<span class="spacer"></span><button type="button" class="bp-all" data-act="bellPrefs">Settings</button><button type="button" class="bp-all" data-act="bellRead"${unread ? '' : ' disabled'}>Mark all as read</button></div>
      <div class="bp-body">${body}</div>`;
  }
  V.bellRedraw = draw; ACT.bellPrefs = () => { close(); if (ACT.ntPrefs) ACT.ntPrefs(); };
  ACT.bellOpen = () => { if (document.getElementById('bellPop')) { close(); return; } draw(); };
  ACT.bellClose = close;
  ACT.bellTab = a => { S.ui.bellTab = a.getAttribute('data-v'); draw(); };
  ACT.bellRead = () => { const rs = readSet(); all().forEach(x => rs.add(x.id)); saveRead(rs); if (V.notifyReadAll) V.notifyReadAll(); close(); V.render(); };
  ACT.bellGo = a => {
    const id = a.getAttribute('data-id'); const x = all().find(n => n.id === id); const rs = readSet(); rs.add(id); saveRead(rs); close(); if (!x) { V.render(); return; }
    if (x.srv) { if (V.notifyRead) V.notifyRead([x.sid]); if (x.pid && S.project && x.pid !== S.project.id) { V.notifyGo(x); return; } }
    let view = x.view; if (cust()) { const ok = new Set(V.navBase().flatMap(g => g.items.map(i => i[0]))); if (!ok.has(view)) view = 'cust_home'; }
    V.go(view, Object.assign({}, x.x || {})); };
})(typeof window !== 'undefined' ? window : globalThis);

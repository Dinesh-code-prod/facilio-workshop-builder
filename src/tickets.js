/* Tickets: client issues, incoming requests, meeting requests and follow-ups, tracked per project and across projects.
   One record per ticket (kind "tkt", server: work/server/api.mjs). Replies and internal notes are appended on the server,
   so two people answering at once never overwrite each other. The page works in two places:
   - inside a project (Project > Tickets): that project's tickets
   - from the projects list (Tickets button): every project the person can open
   Nothing here sends e-mail. "Reply" records the answer on the ticket; "Reply and open Outlook" also opens a draft to the requester. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const API = root.FWBApi; const { ico, toast, drawer, closeDrawer } = V; const ACT = V.ACT;

  const STATUSES = ['New', 'Open', 'In Progress', 'Waiting for Client', 'Resolved', 'Closed'];
  const PRIOS = ['Urgent', 'High', 'Medium', 'Low'];
  const CATS = ['Client request', 'Meeting request', 'Configuration issue', 'UAT finding', 'Defect', 'Question', 'Change request', 'Other'];
  const SOURCES = ['Manual', 'Email', 'Meeting', 'Phone', 'Teams'];
  const VIEWS = [['all', 'All'], ['mine', 'My tickets'], ['open', 'Open'], ['progress', 'In Progress'], ['waiting', 'Waiting for Client'], ['resolved', 'Resolved'], ['closed', 'Closed']];
  const VIEW_TEST = { all: () => true, open: r => r.d.status === 'New' || r.d.status === 'Open', progress: r => r.d.status === 'In Progress', waiting: r => r.d.status === 'Waiting for Client', resolved: r => r.d.status === 'Resolved', closed: r => r.d.status === 'Closed' };
  const LINKS = { uat: 'UAT session', module: 'Module', action: 'Delivery task', raid: 'Risk or issue' };

  const T = { rows: null, projects: [], scope: '', loading: false, err: '', view: 'all', q: '', f: { prio: '', asg: '', proj: '', age: '' }, sel: null, mode: 'reply', draft: '', files: [], pane: 'list', started: false };
  const me = () => (S.user && S.user.email || '').toLowerCase();
  const key = r => r.pid + '/' + r.key;
  const tid = r => 'TKT-' + (r.d.n || '?');
  const isGlobal = () => !S.project || V.ticketsGlobal;
  const scopeKey = () => (isGlobal() ? 'all' : 'p:' + S.project.id);

  function ago(iso) {
    if (!iso) return ''; const s = (Date.now() - new Date(iso).getTime()) / 1000; if (!(s >= 0)) return 'just now';
    if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min ago'; if (s < 86400) return Math.floor(s / 3600) + ' h ago'; if (s < 86400 * 7) return Math.floor(s / 86400) + ' d ago';
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: new Date(iso).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
  }
  const full = iso => iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const initials = n => String(n || '?').trim().split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase();
  const last = r => r.d.lastActivity || r.updatedAt || r.createdAt;
  const canEdit = r => !!r && r.canEdit !== false && !V.isCustomer();

  // ---------- loading ----------
  function mk(it, p) { return { pid: p.id, project: p.name, customer: p.customer, canEdit: p.canEdit, key: it.id, v: it.version, d: it.data || {}, createdAt: it.createdAt, updatedAt: it.updatedAt, createdBy: it.createdBy }; }
  async function load(force) {
    const sk = scopeKey(); if (T.loading || (!force && T.rows && T.scope === sk)) return; T.loading = true; T.err = '';
    try {
      if (sk === 'all') { const r = await API.get('/api/tickets'); T.projects = r.projects || []; const pm = new Map(T.projects.map(p => [p.id, p])); T.rows = (r.tickets || []).map(it => mk(it, pm.get(it.projectId) || { id: it.projectId, name: it.project, customer: it.customer, canEdit: it.canEdit })); }
      else {
        const p = { id: S.project.id, name: S.project.name, customer: S.project.customer, canEdit: !S.readonly, members: (S.members || []).map(m => ({ id: m.id, email: m.email, name: m.name })) }; T.projects = [p];
        if (p.canEdit && !V.isCustomer()) { try { await API.post(`/api/projects/${p.id}/tickets/sync-client`, {}); } catch (e) { } } // pull in client feedback and Delivery Studio questions
        const r = await API.get(`/api/projects/${p.id}/items?kinds=tkt`); T.rows = (r.items || []).map(it => mk(it, p));
      }
      T.scope = sk; sortRows();
    } catch (e) { T.err = e.message || 'Could not load tickets'; T.rows = T.rows || []; T.scope = sk; }
    T.loading = false; if (T.rows && !T.sel) { const want = S.ui && S.ui.module; const hit = !isGlobal() && want ? T.rows.find(r => r.key === want) : null; if (hit) T.sel = key(hit); }
    V.render();
  }
  function sortRows() { T.rows.sort((a, b) => String(last(b)).localeCompare(String(last(a)))); }
  const cur = () => (T.rows || []).find(r => key(r) === T.sel) || null;
  const putRow = (r, it) => { const n = mk(it, { id: r.pid, name: r.project, customer: r.customer, canEdit: r.canEdit }); const i = T.rows.findIndex(x => key(x) === key(r)); if (i >= 0) T.rows[i] = n; else T.rows.push(n); sortRows(); return n; };

  // ---------- filtering ----------
  function inScope() { return (T.rows || []).filter(r => isGlobal() || r.pid === S.project.id); }
  function viewRows(base) { return base.filter(r => T.view === 'mine' ? ((r.d.assignee && String(r.d.assignee.email).toLowerCase()) === me()) : VIEW_TEST[T.view](r)); }
  function visible() {
    const q = T.q.trim().toLowerCase(), f = T.f; const cut = f.age ? Date.now() - Number(f.age) * 864e5 : 0;
    return viewRows(inScope()).filter(r => {
      const d = r.d;
      if (f.prio && d.priority !== f.prio) return false;
      if (f.asg && (f.asg === '_none' ? (d.assignee && d.assignee.email) : ((d.assignee && d.assignee.email) !== f.asg))) return false;
      if (f.proj && r.pid !== f.proj) return false;
      if (cut && new Date(r.createdAt).getTime() < cut) return false;
      if (!q) return true;
      return [tid(r), d.subject, d.description, d.org, d.requester && d.requester.name, d.requester && d.requester.email, r.project, r.customer].some(x => String(x || '').toLowerCase().includes(q));
    });
  }
  const counts = () => { const base = inScope(); const o = {}; VIEWS.forEach(([k]) => { o[k] = k === 'mine' ? base.filter(r => (r.d.assignee && String(r.d.assignee.email).toLowerCase()) === me()).length : base.filter(VIEW_TEST[k]).length; }); return o; };

  // ---------- list ----------
  function viewsHtml() { const c = counts(); return VIEWS.map(([k, l]) => `<button class="tk-vt${T.view === k ? ' on' : ''}" data-act="tkView" data-v="${k}" aria-pressed="${T.view === k}">${esc(l)}<span>${c[k]}</span></button>`).join(''); }
  function rowHtml(r) {
    const d = r.d, on = key(r) === T.sel; const who = (d.requester && d.requester.name) || d.org || '—';
    return `<li><button class="tk-row${on ? ' on' : ''}" data-act="tkSelect" data-k="${esc(key(r))}" role="option" aria-selected="${on}"><span class="tk-r1"><b class="tk-id">${esc(tid(r))}</b><span class="tk-dot s-${esc(d.status.replace(/\s+/g, ''))}" title="${esc(d.status)}"></span><span class="tk-st">${esc(d.status)}</span><span class="tk-ago">${esc(ago(last(r)))}</span></span>
      <span class="tk-sub">${esc(d.subject)}</span><span class="tk-r3"><span>${esc(who)}${isGlobal() ? ' · ' + esc(r.project) : ''}</span><span class="tk-pr p-${esc(d.priority)}">${esc(d.priority)}</span></span></button></li>`;
  }
  function listHtml() {
    if (T.loading && !T.rows) return `<li class="tk-empty"><span class="tk-spin"></span>Loading tickets…</li>`;
    if (T.err && !(T.rows && T.rows.length)) return `<li class="tk-empty err">${esc(T.err)}<br><button class="btn sm" data-act="tkReload">Try again</button></li>`;
    const rows = visible(); if (rows.length) return rows.map(rowHtml).join('');
    const any = inScope().length; const filtered = T.q || T.f.prio || T.f.asg || T.f.proj || T.f.age || T.view !== 'all';
    return `<li class="tk-empty">${any && filtered ? 'No tickets match these filters.<br><button class="btn sm" data-act="tkClear">Clear filters</button>' : 'No tickets yet.<br><span class="small">Tickets arrive from client emails and from client feedback and questions in Delivery Studio. They are not created here.</span>'}</li>`;
  }
  function asgOptions() { const m = new Map(); inScope().forEach(r => { const a = r.d.assignee; if (a && a.email) m.set(a.email, a.name || a.email); }); return [...m].sort((a, b) => a[1].localeCompare(b[1])); }
  function filtersHtml() {
    const sel = (id, label, opts, v) => `<label class="tk-f"><span>${label}</span><select data-change="tkFilter" data-f="${id}" aria-label="${label}"><option value="">Any</option>${opts.map(([x, l]) => `<option value="${esc(x)}"${x === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
    return `<div class="tk-filters">${sel('prio', 'Priority', PRIOS.map(p => [p, p]), T.f.prio)}${sel('asg', 'Assignee', [['_none', 'Unassigned']].concat(asgOptions()), T.f.asg)}${isGlobal() ? sel('proj', 'Project', T.projects.map(p => [p.id, p.name]), T.f.proj) : ''}${sel('age', 'Created', [['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days']], T.f.age)}</div>`;
  }

  // ---------- conversation ----------
  function msgHtml(m, r) {
    const cls = m.type === 'note' ? 'note' : m.type === 'inbound' ? 'in' : 'out'; const lab = m.type === 'note' ? 'Internal note' : m.type === 'inbound' ? 'Client' : 'Reply to client';
    return `<article class="tk-m ${cls}"><span class="tk-av" aria-hidden="true">${esc(initials(m.by))}</span><div class="tk-mb"><header><b>${esc(m.by || 'Unknown')}</b>${m.byEmail && m.type === 'inbound' ? `<span class="muted"> &lt;${esc(m.byEmail)}&gt;</span>` : ''}<span class="tk-lab">${lab}</span><time title="${esc(full(m.at))}">${esc(ago(m.at))}</time></header><div class="tk-txt">${esc(m.text)}</div>${atts(m.attachments, r)}</div></article>`;
  }
  function atts(list, r) { if (!list || !list.length) return ''; return `<ul class="tk-at">${list.map(a => a.fileId ? `<li><button class="lnk" data-act="tkFile" data-k="${esc(key(r))}" data-f="${esc(a.fileId)}" data-n="${esc(a.name)}">${ico('doc')}${esc(a.name)}</button></li>` : `<li><span>${ico('doc')}${esc(a.name)}</span>${a.note ? `<small class="muted"> ${esc(a.note)}</small>` : ''}</li>`).join('')}</ul>`; }
  function convHtml(r) {
    if (!r) return `<section class="tk-conv tk-none"><div><h2>${T.rows && T.rows.length ? 'Select a ticket' : 'No ticket selected'}</h2><p class="muted">${T.rows && T.rows.length ? 'Pick one from the list to read the conversation and reply.' : 'Create a ticket to record a client issue, request or follow-up.'}</p></div></section>`;
    const d = r.d, ed = canEdit(r); const rq = d.requester || {}; const closed = d.status === 'Resolved' || d.status === 'Closed';
    const thread = (d.thread || []); const showDesc = d.description && !(d.source === 'email' && thread.some(m => m.type === 'inbound'));
    const hist = (d.hist || []).slice().reverse();
    return `<section class="tk-conv" aria-label="Conversation">
      <button class="tk-back btn sm ghost" data-act="tkBack">${ico('left')} All tickets</button>
      <header class="tk-ch"><div><div class="tk-chid"><b>${esc(tid(r))}</b><span class="tk-dot s-${esc(d.status.replace(/\s+/g, ''))}"></span><span>${esc(d.status)}</span>${d.source ? `<span class="muted">· ${esc(d.source)}</span>` : ''}</div><h2>${esc(d.subject)}</h2>
        <div class="tk-who">${d.org ? `<span>${esc(d.org)}</span>` : ''}${rq.name || rq.email ? `<span>${esc(rq.name || '')}${rq.email ? ` <a href="mailto:${esc(rq.email)}">${esc(rq.email)}</a>` : ''}</span>` : ''}<span class="muted">Opened ${esc(full(r.createdAt))}</span></div></div>
        ${ed ? `<div class="tk-acts"><button class="btn sm" data-act="tkMode" data-m="reply">Reply</button><button class="btn sm" data-act="tkAssignMe"${d.assignee && String(d.assignee.email).toLowerCase() === me() ? ' disabled' : ''}>Assign to me</button>${closed ? `<button class="btn sm" data-act="tkStatus" data-s="Open">Reopen</button>` : `<button class="btn sm primary" data-act="tkStatus" data-s="Resolved">Resolve</button>`}${d.status === 'Resolved' ? `<button class="btn sm" data-act="tkStatus" data-s="Closed">Close</button>` : ''}</div>` : ''}</header>
      <div class="tk-thread" id="tkThread" tabindex="0" aria-label="Messages">
        ${showDesc ? `<article class="tk-m in"><span class="tk-av" aria-hidden="true">${esc(initials(rq.name || d.org || r.createdBy))}</span><div class="tk-mb"><header><b>${esc(rq.name || d.org || 'Request')}</b><span class="tk-lab">Description</span><time title="${esc(full(r.createdAt))}">${esc(ago(r.createdAt))}</time></header><div class="tk-txt">${esc(d.description)}</div>${atts(d.attachments, r)}</div></article>` : ''}
        ${thread.map(m => msgHtml(m, r)).join('')}${!thread.length && !showDesc ? '<p class="muted tk-quiet">No messages yet.</p>' : ''}
        ${closed ? `<p class="tk-state">${esc(d.status)} ${esc(ago(d.resolvedAt || last(r)))}. A client reply or Reopen puts it back in progress.</p>` : ''}
      </div>
      ${hist.length ? `<details class="tk-hist"><summary>Activity history (${hist.length})</summary><ol>${hist.map(h => `<li><time title="${esc(full(h.at))}">${esc(ago(h.at))}</time><span>${esc(h.who || '')}</span> ${esc(h.event || '')}</li>`).join('')}</ol></details>` : ''}
      ${ed ? composerHtml(r) : `<p class="tk-ro">You have read-only access to this project, so replies are turned off.</p>`}
    </section>`;
  }
  function composerHtml(r) {
    const note = T.mode === 'note';
    return `<form class="tk-comp${note ? ' note' : ''}" data-tkform="send" novalidate><div class="tk-tabs" role="tablist"><button type="button" role="tab" aria-selected="${!note}" class="${!note ? 'on' : ''}" data-act="tkMode" data-m="reply">Reply to client</button><button type="button" role="tab" aria-selected="${note}" class="${note ? 'on' : ''}" data-act="tkMode" data-m="note">Internal note</button></div>
      <label class="sr" for="tkDraft">${note ? 'Internal note' : 'Reply'}</label><textarea id="tkDraft" data-tk="draft" rows="4" placeholder="${note ? 'Only the delivery team sees this note.' : 'Write the reply. It is saved on the ticket; use Reply and open Outlook to email it.'}">${esc(T.draft)}</textarea>
      ${T.files.length ? `<ul class="tk-at pend">${T.files.map((f, i) => `<li>${ico('doc')}${esc(f.name)} <button type="button" class="lnk" data-act="tkUnfile" data-i="${i}" aria-label="Remove ${esc(f.name)}">remove</button></li>`).join('')}</ul>` : ''}
      <div class="tk-cf"><button type="button" class="btn sm ghost" data-act="tkAttach">${ico('upl')}Attach file</button><span class="tk-hint">${note ? 'Not visible to the client.' : 'Recorded on the ticket. Nothing is emailed automatically.'}</span><span class="sp"></span>
        ${note ? '' : `<button type="button" class="btn sm" data-act="tkSend" data-mail="1">Reply and open Outlook</button>`}<button type="button" class="btn sm primary" data-act="tkSend">${note ? 'Add note' : 'Save reply'}</button></div></form>`;
  }

  // ---------- details ----------
  function detailsHtml(r) {
    if (!r) return `<aside class="tk-det" aria-label="Details"></aside>`;
    const d = r.d, ed = canEdit(r); const rq = d.requester || {}; const proj = T.projects.find(p => p.id === r.pid) || { members: [] };
    const field = (label, body) => `<div class="tk-fr"><dt>${label}</dt><dd>${body}</dd></div>`;
    const sel = (f, opts, v, lab) => ed ? `<select data-change="tkField" data-f="${f}" aria-label="${lab}">${opts.map(o => `<option${o === v ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>` : esc(v || '—');
    const members = (proj.members || []).filter(m => m.email); const a = d.assignee && d.assignee.email;
    const asg = ed ? `<select data-change="tkAssign" aria-label="Assignee"><option value="">Unassigned</option>${members.map(m => `<option value="${esc(m.email)}"${m.email === a ? ' selected' : ''}>${esc(m.name || m.email)}</option>`).join('')}${a && !members.some(m => m.email === a) ? `<option value="${esc(a)}" selected>${esc(d.assignee.name || a)}</option>` : ''}</select>` : esc((d.assignee && (d.assignee.name || d.assignee.email)) || 'Unassigned');
    const txt = (f, v, lab, type) => ed ? `<input type="${type || 'text'}" data-change="tkField" data-f="${f}" value="${esc(v || '')}" aria-label="${lab}">` : esc(v || '—');
    const overdue = d.due && !(d.status === 'Resolved' || d.status === 'Closed') && d.due < V.today();
    const lk = d.link; const lkOk = lk && !isGlobal() && r.pid === S.project.id;
    return `<aside class="tk-det" aria-label="Ticket details"><h3>Details</h3><dl>
      ${field('Status', sel('status', STATUSES, d.status, 'Status'))}${field('Priority', sel('priority', PRIOS, d.priority, 'Priority'))}${field('Assignee', asg)}${field('Team', txt('team', d.team, 'Team'))}
      ${field('Category', sel('category', CATS, d.category || 'Client request', 'Category'))}
      ${field('Project', isGlobal() ? `<button class="lnk" data-act="tkProject" data-k="${esc(key(r))}">${esc(r.project)}</button>` : esc(r.project))}
      ${field('Client', txt('org', d.org, 'Client organisation'))}${field('Requester', ed ? `<input type="text" data-change="tkRequester" data-f="name" value="${esc(rq.name || '')}" aria-label="Requester name" placeholder="Name"><input type="email" data-change="tkRequester" data-f="email" value="${esc(rq.email || '')}" aria-label="Requester email" placeholder="Email">` : esc((rq.name || '—') + (rq.email ? ' · ' + rq.email : '')))}
      ${field('Due', ed ? `<input type="date" data-change="tkField" data-f="due" value="${esc(d.due || '')}" aria-label="Due date">${overdue ? '<small class="tk-od">Overdue</small>' : ''}` : esc(d.due || '—'))}
      ${field('Linked item', `${lk ? `<span>${esc(LINKS[lk.kind] || 'Item')}: ${lkOk ? `<button class="lnk" data-act="tkLinkOpen">${esc(lk.label)}</button>` : esc(lk.label)}</span>` : '<span class="muted">None</span>'}${ed && !isGlobal() ? ` <button class="lnk" data-act="tkLink">${lk ? 'Change' : 'Link'}</button>` : ''}${lk && ed ? ` <button class="lnk" data-act="tkUnlink">Remove</button>` : ''}`)}
      ${field('Source', esc(d.source || 'Manual'))}${field('Created', `<time title="${esc(full(r.createdAt))}">${esc(full(r.createdAt))}</time>`)}${field('Updated', `<time title="${esc(full(last(r)))}">${esc(ago(last(r)))}</time>`)}${d.resolvedAt ? field('Resolved', esc(full(d.resolvedAt))) : ''}
    </dl></aside>`;
  }

  // ---------- page ----------
  function pageHtml() {
    const r = cur(); const can = !V.isCustomer() && (isGlobal() ? (T.projects || []).some(p => p.canEdit) : !S.readonly);
    const total = inScope().length;
    return `<div class="tk${T.pane === 'conv' && r ? ' show-conv' : ''}">
      <div class="tk-views" id="tkViews" role="group" aria-label="Ticket views">${viewsHtml()}</div>
      <div class="tk-grid"><aside class="tk-list" aria-label="Ticket list"><div class="tk-sw">${ico('search')}<input type="search" id="tkQ" data-tk="q" value="${esc(T.q)}" placeholder="Search ID, subject, requester, client, email" aria-label="Search tickets"></div>${filtersHtml()}<ul class="tk-ul" id="tkList" role="listbox" aria-label="Tickets">${listHtml()}</ul></aside>${convHtml(r)}${detailsHtml(r)}</div></div>`;
  }
  function start() { if (!T.started) { T.started = true; } if (!T.rows || T.scope !== scopeKey()) { if (T.scope !== scopeKey()) { T.rows = null; T.sel = null; T.view = 'all'; T.q = ''; T.f = { prio: '', asg: '', proj: '', age: '' }; T.pane = 'list'; T.draft = ''; T.files = []; } load(); } }

  /* Support mailbox: reads the shared Microsoft 365 mailbox through the server (nothing in the browser holds a mail credential). Needs the app owner to set up the graph_mail credential, so it says so plainly until a sync has worked. */
  const isMailAdmin = () => !!(S.user && S.user.adminRole && S.user.adminRole !== 'sub');
  const MB = { st: null, inbox: [], err: '', busy: false };
  const when = iso => iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  async function mbLoad() {
    try { const [a, b, pr] = await Promise.all([API.get('/api/mail/status'), API.get('/api/mail/inbox'), API.get('/api/tickets')]); MB.st = a; MB.inbox = b.items || []; MB.projects = pr.projects || []; MB.err = ''; } catch (e) { MB.err = e.message || 'Could not load the mailbox'; }
    mbPaint();
  }
  function mbHtml() {
    if (MB.err) return `<p class="err">${esc(MB.err)}</p>`;
    if (!MB.st) return '<p class="muted"><span class="tk-spin"></span>Loading…</p>';
    const a = MB.st, l = a.last; const projOpts = (MB.projects || []).map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
    const state = !l ? ['Needs configuration', 'No sync has run yet. Nothing is read from Outlook until the steps below are done.'] : l.ok ? ['Last check worked', `${when(l.at)} by ${l.by}: ${l.stats.filed || 0} filed in project inboxes, ${l.stats.unrouted || 0} waiting below${l.stats.notices ? ', ' + l.stats.notices + ' Teams notices' : ''}.`] : ['Last sync failed', `${when(l.at)}: ${l.error}`];
    return `<div class="tk-mb"><div class="tk-mbs ${l && l.ok ? 'ok' : l ? 'bad' : 'warn'}"><b>${esc(state[0])}</b><span>${esc(state[1])}</span></div>
      <p class="small">Mailbox: <b>${esc(a.mailbox)}</b> · credential <code>${esc(a.credential)}</code></p>
      <details${l && l.ok ? '' : ' open'}><summary>How to connect the mailbox</summary><ol class="small"><li>Register an app in Microsoft Entra with the Microsoft Graph permission <b>Mail.Read</b> (and <b>Mail.Read.Shared</b> for a shared mailbox) and grant admin consent.</li><li>Add it as an OAuth2 credential called <code>${esc(a.credential)}</code> at secrets.facilio.work and grant it to this app.</li><li>Optional: add a plain secret <code>support_mailbox</code> with the shared mailbox address.</li><li>Add routing rules below, ideally one project address per project (for example acme-delivery@facilio.com set up as an alias of the shared mailbox).</li><li>Press Check now. Project inboxes also check, at most every two minutes, whenever someone opens one. Replies containing <b>[TKT-number]</b> in the subject join that ticket; other mail follows the rules below.</li></ol><p class="small muted">Sync runs when you press the button. facilio.work has no scheduler yet, so it does not run on its own.</p></details>
      <div class="row" style="gap:8px;margin:10px 0"><button class="btn primary" data-act="mbSync"${MB.busy ? ' disabled' : ''}>${MB.busy ? 'Checking…' : 'Check now'}</button></div>
      <h4>Notices and tickets</h4>${(() => { const st = a.settings || {}; return `<div class="fgrid" style="margin-bottom:8px"><label class="chk full"><input type="checkbox" id="mbTeams"${st.teamsOn ? ' checked' : ''}> Post a Teams notice for each new client email and each Explore Facilio interest request${a.hasTeams ? '' : ' (Teams is not available in this build)'}</label>
        <div><label class="f" for="mbChan">Teams channel</label><input type="text" id="mbChan" value="${esc(st.teamsChannel || '')}" placeholder="Leave empty for the app's linked channel"></div>
        <label class="chk full"><input type="checkbox" id="mbAuto"${st.autoTicket !== false ? ' checked' : ''}> Also create a ticket for each new email (replies join their ticket)</label>
        <div><label class="f" for="mbDays">First check reads back (days)</label><input type="number" id="mbDays" min="1" max="90" value="${esc(st.firstSyncDays || 7)}"></div>
        <div><label class="f" for="mbKeep">Keep emails for (days, 0 = while the project exists)</label><input type="number" id="mbKeep" min="0" max="3650" value="${esc(st.retentionDays || 0)}"></div></div>
        <p class="small muted">Channel posts start once the app is approved on facilio.work. Notices say they are automated Delivery Studio notifications and link to the project Inbox, or for interest requests to Explore Facilio (the project owners also get a direct message). Email notices are not possible: the mailbox connection can only read.</p><button class="btn sm" data-act="mbSettingsSave">Save notices and tickets</button>`; })()}
      <h4 style="margin-top:18px">Routing rules</h4><p class="small muted">Mail sent to a project address, or from a client address or domain, goes to that project's Inbox. Replies follow their conversation. Anything else waits below for a person to place.</p>
      <div id="mbRules">${(a.rules || []).map((r, i) => `<div class="row" style="gap:6px;margin-bottom:6px"><select class="mb-on" aria-label="Rule type"><option value="from"${r.on !== 'to' ? ' selected' : ''}>From</option><option value="to"${r.on === 'to' ? ' selected' : ''}>Sent to</option></select><input type="text" class="mb-m" value="${esc(r.match)}" aria-label="Address or domain"><select class="mb-p" aria-label="Project">${(MB.projects || []).map(p => `<option value="${esc(p.id)}"${p.id === r.projectId ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select><button class="btn sm ghost" data-act="mbRuleDel" data-i="${i}" aria-label="Remove rule">${ico('trash')}</button></div>`).join('') || '<p class="small muted">No rules yet.</p>'}</div>
      <div class="row" style="gap:6px;margin:8px 0"><select id="mbNewOn" aria-label="New rule type"><option value="from">From</option><option value="to">Sent to</option></select><input type="text" id="mbNewM" placeholder="acme.com, name@acme.com or acme-delivery@facilio.com" aria-label="New rule address or domain"><select id="mbNewP" aria-label="Project for the new rule">${projOpts}</select><button class="btn sm" data-act="mbRuleAdd">Add rule</button></div><button class="btn sm" data-act="mbRulesSave">Save rules</button>
      <h4 style="margin-top:18px">Inbox: mail not matched to a project (${MB.inbox.length})</h4>
      ${MB.inbox.length ? MB.inbox.map(m => `<div class="tk-mbm"><div><b>${esc(m.subject)}</b><div class="small muted">${esc(m.from.name)} &lt;${esc(m.from.email)}&gt; · ${esc(when(m.receivedAt))}</div><div class="small">${esc(m.preview)}</div></div><div class="row" style="gap:6px"><select data-mp="${esc(m.id)}" aria-label="Project for this mail">${projOpts}</select><button class="btn sm primary" data-act="mbRoute" data-id="${esc(m.id)}">File in project</button><button class="btn sm ghost" data-act="mbDismiss" data-id="${esc(m.id)}">Dismiss</button></div></div>`).join('') : '<p class="small muted">Nothing waiting.</p>'}</div>`;
  }
  function mbPaint() { const b = document.getElementById('mbBody'); if (b) b.innerHTML = mbHtml(); }
  ACT.mbOpen = () => { drawer('Support mailbox', '<div id="mbBody"></div>', '<button class="btn" data-act="closeDrawer">Close</button>'); mbPaint(); mbLoad(); };
  ACT.mbSync = async () => { MB.busy = true; mbPaint(); try { const r = await API.post('/api/mail/sync', {}); toast(`Check finished: ${r.result.filed} filed in project inboxes, ${r.result.unrouted} waiting to be placed`); } catch (e) { toast(e.message || 'Sync failed', 7000, true); } MB.busy = false; await mbLoad(); load(true); };
  const rulesNow = () => [...document.querySelectorAll('#mbRules .row')].map(r => ({ match: r.querySelector('.mb-m').value.trim(), projectId: r.querySelector('.mb-p').value, on: r.querySelector('.mb-on') ? r.querySelector('.mb-on').value : 'from' })).filter(x => x.match);
  ACT.mbRuleAdd = () => { const m = (document.getElementById('mbNewM').value || '').trim(); if (!m) { toast('Enter an address or domain', 4000, true); return; } MB.st.rules = rulesNow().concat([{ match: m.toLowerCase(), projectId: document.getElementById('mbNewP').value, on: document.getElementById('mbNewOn').value }]); mbPaint(); };
  ACT.mbSettingsSave = a => V.busy(a, async () => { const g = id => document.getElementById(id); try { const r = await API.put('/api/mail/settings', { teamsOn: g('mbTeams').checked, teamsChannel: g('mbChan').value.trim(), autoTicket: g('mbAuto').checked, firstSyncDays: Number(g('mbDays').value), retentionDays: Number(g('mbKeep').value) }); MB.st.settings = r.settings; toast('Saved'); } catch (e) { toast(e.message, 6000, true); } });
  ACT.mbRuleDel = a => { const r = rulesNow(); r.splice(Number(a.getAttribute('data-i')), 1); MB.st.rules = r; mbPaint(); };
  ACT.mbRulesSave = a => V.busy(a, async () => { try { const r = await API.put('/api/mail/rules', { rules: rulesNow() }); MB.st.rules = r.rules; toast('Rules saved'); mbPaint(); } catch (e) { toast(e.message, 6000, true); } });
  ACT.mbRoute = a => V.busy(a, async () => { const id = a.getAttribute('data-id'); const sel = document.querySelector(`[data-mp="${id}"]`); try { const r = await API.post(`/api/mail/inbox/${id}/route`, { projectId: sel.value }); toast('Filed in the project Inbox' + (r.ticket ? ' and ticket TKT-' + r.ticket : '')); } catch (e) { toast(e.message, 6000, true); } await mbLoad(); load(true); });
  ACT.mbDismiss = a => V.busy(a, async () => { try { await API.post(`/api/mail/inbox/${a.getAttribute('data-id')}/dismiss`, {}); } catch (e) { toast(e.message, 6000, true); } await mbLoad(); });

  // page header uses the shared header band and button size; the subtitle separates project and count with " · "
  function headerHtml() {
    const total = inScope().length;
    return `<div class="page-header"><div class="t"><h1>Tickets</h1><p>${isGlobal() ? 'Every project you can open' : esc(S.project.name) + ' · ' + esc(S.project.customer)}${T.rows ? ` · ${total} in total` : ''}</p></div><div class="row">${isGlobal() ? `<button class="btn" data-act="toProjects">Back to projects</button>` : ''}<button class="btn" data-act="tkReload" title="Reload tickets">Refresh</button>${isMailAdmin() ? '<button class="btn" data-act="mbOpen">Support mailbox</button>' : ''}<button class="btn primary" data-act="openOutlook">Open Outlook</button></div></div>`;
  }
  V.tickets = { html() { start(); return `${headerHtml()}<div class="page-body tk-page">${pageHtml()}</div>`; }, mount() { const th = document.getElementById('tkThread'); if (th) th.scrollTop = th.scrollHeight; } };
  V.ticketsGlobalHtml = () => { V.ticketsGlobal = true; start(); return `<div class="shell tk-shell"><main class="main" id="main"><div class="page">${headerHtml()}<div class="page-body tk-page">${pageHtml()}</div></div></main></div>`; };
  V.ticketsLeave = () => { V.ticketsGlobal = false; T.rows = null; T.scope = ''; T.sel = null; };
  V.ticketCounts = () => { if (!T.rows || T.scope !== scopeKey()) return null; const c = counts(); return { open: c.open + c.progress + c.waiting, mine: c.mine }; };

  function paintList() { const l = document.getElementById('tkList'); if (l) l.innerHTML = listHtml(); const v = document.getElementById('tkViews'); if (v) v.innerHTML = viewsHtml(); }

  // ---------- saving ----------
  async function save(r, patch, quiet) {
    const url = `/api/projects/${r.pid}/items/tkt/${r.key}`; let base = r;
    for (let i = 0; i < 2; i++) {
      try { const res = await API.put(url, { data: Object.assign({}, base.d, typeof patch === 'function' ? patch(base.d) : patch), baseVersion: base.v }); const n = putRow(r, res.item); V.render(); return n; }
      catch (e) { if (e.status === 409 && e.data && e.data.current && i === 0) { base = mk(e.data.current, { id: r.pid, name: r.project, customer: r.customer, canEdit: r.canEdit }); continue; } throw e; }
    }
  }
  const run = (el, fn) => V.busy(el, fn);

  // ---------- actions ----------
  ACT.tkView = a => { T.view = a.getAttribute('data-v'); const rows = visible(); if (T.sel && !rows.some(r => key(r) === T.sel)) T.sel = null; V.render(); };
  ACT.tkSelect = a => { T.sel = a.getAttribute('data-k'); T.pane = 'conv'; T.draft = ''; T.files = []; T.mode = 'reply'; V.render(); };
  ACT.tkBack = () => { T.pane = 'list'; V.render(); };
  ACT.tkReload = () => { T.rows = T.rows || []; load(true); };
  ACT.tkClear = () => { T.q = ''; T.view = 'all'; T.f = { prio: '', asg: '', proj: '', age: '' }; V.render(); };
  ACT.tkFilter = el => { T.f[el.getAttribute('data-f')] = el.value; V.render(); };
  ACT.tkMode = a => { T.mode = a.getAttribute('data-m') === 'note' ? 'note' : 'reply'; V.render(); const t = document.getElementById('tkDraft'); if (t) t.focus(); };
  ACT.tkField = el => { const r = cur(); if (!r) return; const f = el.getAttribute('data-f'); run(null, () => save(r, { [f]: el.value })).then(() => toast('Saved')); };
  ACT.tkRequester = el => { const r = cur(); if (!r) return; const f = el.getAttribute('data-f'); run(null, () => save(r, d => ({ requester: Object.assign({}, d.requester, { [f]: el.value.trim() }) }))).then(() => toast('Saved')); };
  ACT.tkAssign = el => { const r = cur(); if (!r) return; const p = T.projects.find(x => x.id === r.pid); const m = p && (p.members || []).find(x => x.email === el.value); run(null, () => save(r, { assignee: el.value ? { email: el.value, name: (m && m.name) || el.value } : null })).then(() => toast(el.value ? 'Assigned' : 'Unassigned')); };
  ACT.tkAssignMe = a => { const r = cur(); if (!r) return; run(a, () => save(r, { assignee: { email: S.user.email, name: S.user.name || S.user.email } })).then(() => toast('Assigned to you')); };
  ACT.tkStatus = a => { const r = cur(); if (!r) return; const s = a.getAttribute('data-s'); run(a, () => save(r, { status: s })).then(() => toast(s === 'Resolved' ? 'Ticket resolved' : s === 'Open' ? 'Ticket reopened' : 'Ticket ' + s.toLowerCase())); };
  ACT.tkProject = a => { const r = (T.rows || []).find(x => key(x) === a.getAttribute('data-k')); if (!r) return; try { location.hash = `#/p/${r.pid}/tickets/${r.key}`; } catch (e) { } V.ticketsLeave(); V.openProject(r.pid); };
  ACT.tkAttach = async () => { const fs = await V.pickFile('.pdf,.xlsx,.xls,.docx,.pptx,.png,.jpg,.jpeg,.csv,.txt,.msg,.eml', true); if (fs && fs.length) { T.files = T.files.concat([...fs]).slice(0, 5); V.render(); } };
  ACT.tkUnfile = a => { T.files.splice(Number(a.getAttribute('data-i')), 1); V.render(); };
  ACT.tkFile = a => run(a, async () => { const r = (T.rows || []).find(x => key(x) === a.getAttribute('data-k')); const f = await API.downloadFile(r.pid, a.getAttribute('data-f')); V.download(a.getAttribute('data-n'), f.blob); });
  async function uploadAll(r, files) { const out = []; for (const f of files) { const rec = await API.uploadFile(r.pid, f, 'ticket_attachment', { ticket: r.key }); out.push({ name: f.name, fileId: rec.id }); } return out; }
  ACT.tkSend = a => {
    const r = cur(); const text = T.draft.trim(); if (!r) return; if (!text) { toast('Write a message first', 4000, true); const t = document.getElementById('tkDraft'); if (t) t.focus(); return; }
    return run(a, async () => {
      const attachments = T.files.length ? await uploadAll(r, T.files) : []; const type = T.mode === 'note' ? 'note' : 'reply';
      const res = await API.post(`/api/projects/${r.pid}/tickets/${r.key}/message`, { type, text, attachments }); putRow(r, res.item);
      const wantMail = a.getAttribute('data-mail') === '1' && type === 'reply'; const rq = r.d.requester || {}; T.draft = ''; T.files = [];
      if (wantMail && V.outlook) V.outlook.compose({ to: rq.email, subject: 'Re: ' + r.d.subject + ' [' + tid(r) + ']', body: text }); else toast(type === 'note' ? 'Note added' : 'Reply saved on the ticket');
      V.render();
    });
  };

  // create / link drawers
  function newForm(pid) {
    const p = T.projects.find(x => x.id === pid) || T.projects[0] || { id: '', members: [] };
    const opt = (list, v) => list.map(o => `<option${o === v ? ' selected' : ''}>${esc(o)}</option>`).join('');
    return `<div class="fgrid tk-new"><div class="full"><label class="f" for="tnS">Subject *</label><input id="tnS" type="text" maxlength="200" placeholder="What is the client asking for or reporting?"></div>
      <div class="full"><label class="f" for="tnD">Description</label><textarea id="tnD" rows="5"></textarea></div>
      <div><label class="f" for="tnP">Project *</label><select id="tnP" data-change="tkNewProject"${T.projects.length < 2 ? ' disabled' : ''}>${T.projects.filter(x => x.canEdit).map(x => `<option value="${esc(x.id)}"${x.id === p.id ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
      <div><label class="f" for="tnO">Client organisation</label><input id="tnO" type="text" value="${esc(p.customer || '')}"></div>
      <div><label class="f" for="tnRN">Requester name</label><input id="tnRN" type="text"></div><div><label class="f" for="tnRE">Requester email</label><input id="tnRE" type="email"></div>
      <div><label class="f" for="tnC">Category</label><select id="tnC">${opt(CATS, 'Client request')}</select></div><div><label class="f" for="tnPr">Priority</label><select id="tnPr">${opt(PRIOS, 'Medium')}</select></div>
      <div><label class="f" for="tnA">Assignee</label><select id="tnA"><option value="">Unassigned</option>${(p.members || []).filter(m => m.email).map(m => `<option value="${esc(m.email)}">${esc(m.name || m.email)}</option>`).join('')}</select></div><div><label class="f" for="tnT">Team</label><input id="tnT" type="text" placeholder="e.g. Implementation"></div>
      <div><label class="f" for="tnSo">Source</label><select id="tnSo">${opt(SOURCES, 'Manual')}</select></div><div><label class="f" for="tnDu">Due date</label><input id="tnDu" type="date"></div>
      <div class="full"><label class="f">Attachments</label><div id="tnF" class="small muted">None added</div><button type="button" class="btn sm" data-act="tkNewFile">Add file</button></div></div>`;
  }
  let newFiles = [];
  ACT.tkNew = () => { newFiles = []; const pid = isGlobal() ? ((T.projects.find(x => x.canEdit) || {}).id) : S.project.id; if (!pid) { toast('You have read-only access', 4000, true); return; } drawer('Create ticket', newForm(pid), `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="tkCreate">Create ticket</button>`, { wide: true }); };
  ACT.tkNewProject = el => { const p = T.projects.find(x => x.id === el.value); if (!p) return; const o = document.getElementById('tnO'); if (o) o.value = p.customer || ''; const a = document.getElementById('tnA'); if (a) a.innerHTML = '<option value="">Unassigned</option>' + (p.members || []).filter(m => m.email).map(m => `<option value="${esc(m.email)}">${esc(m.name || m.email)}</option>`).join(''); };
  ACT.tkNewFile = async () => { const fs = await V.pickFile('.pdf,.xlsx,.xls,.docx,.pptx,.png,.jpg,.jpeg,.csv,.txt,.msg,.eml', true); if (fs && fs.length) { newFiles = newFiles.concat([...fs]).slice(0, 5); const x = document.getElementById('tnF'); if (x) x.textContent = newFiles.map(f => f.name).join(', '); } };
  ACT.tkCreate = a => {
    const v = id => (document.getElementById(id) || {}).value || ''; const subject = v('tnS').trim(); if (!subject) { toast('Add a subject', 4000, true); document.getElementById('tnS').focus(); return; }
    const email = v('tnRE').trim(); if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Enter a valid requester email', 4000, true); return; }
    const pid = v('tnP') || (S.project && S.project.id); const p = T.projects.find(x => x.id === pid); const am = (p.members || []).find(m => m.email === v('tnA'));
    return run(a, async () => {
      const key0 = 'tk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const data = { subject, description: v('tnD').trim(), status: v('tnA') ? 'Open' : 'New', priority: v('tnPr'), category: v('tnC'), source: v('tnSo'), org: v('tnO').trim(), team: v('tnT').trim(), due: v('tnDu') || '', requester: { name: v('tnRN').trim(), email }, assignee: am ? { email: am.email, name: am.name || am.email } : null, createdByName: S.user.name || S.user.email };
      const res = await API.put(`/api/projects/${pid}/items/tkt/${key0}`, { data }); let row = putRow({ pid, key: key0, project: p.name, customer: p.customer, canEdit: p.canEdit }, res.item);
      if (newFiles.length) { try { const at = await uploadAll(row, newFiles); row = await save(row, { attachments: at }); } catch (e) { toast('Ticket created, but an attachment failed: ' + e.message, 6000, true); } }
      T.sel = key(row); T.pane = 'conv'; T.view = 'all'; T.q = ''; T.mode = 'reply'; closeDrawer(); toast(tid(row) + ' created'); V.render();
    });
  };
  // link a ticket to delivery records of the open project (UAT session, module, task, risk)
  function linkChoices(kind) {
    const I = V.items; if (kind === 'module') return F.allModules().filter(m => m.inScope).map(m => ({ ref: m.name, label: m.label }));
    if (kind === 'uat') return I.list('uat').map(u => ({ ref: u.id, label: (u.title || 'UAT session') + (u.date ? ' · ' + u.date : '') }));
    if (kind === 'action') return I.list('action').map(u => ({ ref: u.id, label: u.title || 'Task' }));
    return I.list('raid').map(u => ({ ref: u.id, label: u.title || u.description || 'Item' }));
  }
  ACT.tkLink = () => { const r = cur(); if (!r) return; const k = (r.d.link && r.d.link.kind) || 'uat'; drawer('Link ticket', `<div class="fgrid"><div class="full"><label class="f" for="lkK">Type</label><select id="lkK" data-change="tkLinkKind">${Object.entries(LINKS).map(([x, l]) => `<option value="${x}"${x === k ? ' selected' : ''}>${l}</option>`).join('')}</select></div><div class="full"><label class="f" for="lkR">Item</label><select id="lkR">${linkOpts(k)}</select></div></div>`, `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="tkLinkSave">Save link</button>`); };
  const linkOpts = k => { const c = linkChoices(k); return c.length ? c.map(x => `<option value="${esc(x.ref)}">${esc(x.label)}</option>`).join('') : '<option value="">Nothing to link in this project yet</option>'; };
  ACT.tkLinkKind = el => { const s = document.getElementById('lkR'); if (s) s.innerHTML = linkOpts(el.value); };
  ACT.tkLinkSave = a => { const r = cur(); const k = document.getElementById('lkK').value, s = document.getElementById('lkR'); if (!s.value) { toast('Nothing to link', 3000, true); return; } const label = s.options[s.selectedIndex].text; return run(a, async () => { await save(r, { link: { kind: k, ref: s.value, label } }); closeDrawer(); toast('Linked'); }); };
  ACT.tkUnlink = a => { const r = cur(); run(a, () => save(r, { link: null })).then(() => toast('Link removed')); };
  ACT.tkLinkOpen = () => { const r = cur(); const l = r && r.d.link; if (!l) return; if (l.kind === 'module') V.go('module', { module: l.ref }); else if (l.kind === 'uat') V.go('delivery'); else V.go('governance'); };
  ACT.tkOpenGlobal = async () => { V.ticketsGlobal = true; T.rows = null; T.scope = ''; V.setMode('tickets'); };

  // typing: keep text in memory only, never re-render while someone is writing
  document.addEventListener('input', e => {
    const el = e.target; const k = el.getAttribute && el.getAttribute('data-tk'); if (!k) return;
    if (k === 'draft') T.draft = el.value; else if (k === 'q') { T.q = el.value; paintList(); }
  });
  document.addEventListener('keydown', e => {
    if (e.target && e.target.id === 'tkDraft' && (e.ctrlKey || e.metaKey) && e.key === 'Enter') { const b = document.querySelector('.tk-cf .btn.primary'); if (b) b.click(); }
    const row = e.target && e.target.closest && e.target.closest('.tk-row'); if (row && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); const rows = [...document.querySelectorAll('.tk-row')]; const i = rows.indexOf(row) + (e.key === 'ArrowDown' ? 1 : -1); if (rows[i]) rows[i].focus(); }
  });
  V.ticketsTest = { T, visible, counts };
})(typeof window !== 'undefined' ? window : globalThis);

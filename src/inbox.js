/* Project Inbox: the client emails filed in this project by the delivery mailbox sync (server: /api/projects/:id/mail).
   A lightweight, project-focused email history, not an Outlook replacement: list, search and filter, read the plain-text body,
   follow the conversation, mark new / read / handled, download listed attachments, open the original in Outlook, and turn an
   email into a ticket when it needs tracking. Bodies are shown as text (escaped), never as HTML. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const API = root.FWBApi; const ACT = V.ACT; const { ico, toast } = V;
  const st = { want: null, pid: null, items: null, total: 0, last: null, err: '', q: '', status: '', from: '', to: '', sel: null, open: null, loading: false, checking: false, note: '' };
  const canEdit = () => !S.readonly && !V.isCustomer() && S.project && S.project.role !== 'viewer';
  const when = iso => iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const short = iso => { if (!iso) return ''; const d = new Date(iso), n = new Date(); return d.toDateString() === n.toDateString() ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); };
  const who = a => a ? (a.name && a.name !== a.email ? `${esc(a.name)} <span class="muted">&lt;${esc(a.email)}&gt;</span>` : esc(a.email)) : '';
  const size = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n > 1024 ? Math.round(n / 1024) + ' KB' : (n || 0) + ' B';
  const STATUS = { new: ['New', 'blue'], read: ['Read', 'low'], handled: ['Handled', 'green'] };
  const keyFromHash = () => { const m = location.hash.match(/#\/p\/[^/]+\/inbox\/([0-9a-f]{40})/); return m ? m[1] : null; };

  async function load(sync) {
    if (!S.project) return; const pid = S.project.id; if (st.pid !== pid) Object.assign(st, { pid, items: null, sel: null, open: null, err: '' });
    st.loading = true; if (sync) st.checking = true;
    try { const r = await API.get(`/api/projects/${pid}/mail${sync ? '?sync=1' : ''}`); if (st.pid !== pid) return; st.items = r.items || []; st.total = r.total || 0; st.last = r.last; st.err = '';
      st.note = r.sync && r.sync.error ? r.sync.error : r.sync && r.sync.filed ? r.sync.filed + ' new email' + (r.sync.filed === 1 ? '' : 's') + ' filed just now' : ''; }
    catch (e) { st.err = e.message || 'The Inbox could not be loaded'; }
    st.loading = false; st.checking = false; const k = st.want || keyFromHash() || st.sel; st.want = null; if (k && st.items && st.items.some(x => x.key === k)) await openMail(k, true); else if (S.ui && S.ui.view === 'inbox' && !document.getElementById('ibApp')) V.render();
    if (st.pid === pid && document.getElementById('ibApp')) paint();
  }
  async function openMail(key, quiet) {
    st.sel = key; st.open = { loading: true }; paint();
    try { const r = await API.get(`/api/projects/${S.project.id}/mail/${key}`); st.open = r; const it = st.items && st.items.find(x => x.key === key); if (it) Object.assign(it, { status: r.mail.status, readBy: r.mail.readBy }); }
    catch (e) { st.open = { error: e.message }; }
    if (!quiet && history.replaceState) history.replaceState(null, '', `#/p/${S.project.id}/inbox/${key}`);
    paint(); const rd = document.getElementById('ibRead'); if (rd && window.innerWidth < 900) rd.scrollIntoView({ block: 'start' });
  }
  function rows() {
    const q = st.q.trim().toLowerCase(), f = st.from ? Date.parse(st.from) : 0, t = st.to ? Date.parse(st.to) + 864e5 : 0;
    return (st.items || []).filter(m => (!st.status || m.status === st.status) && (!f || Date.parse(m.receivedAt) >= f) && (!t || Date.parse(m.receivedAt) < t)
      && (!q || [m.subject, m.from && m.from.name, m.from && m.from.email, m.preview].some(x => String(x || '').toLowerCase().includes(q))));
  }
  function listHtml() {
    const list = rows();
    if (!list.length) return `<div class="ib-empty"><h3>${(st.items || []).length ? 'No emails match' : 'No client emails yet'}</h3><p class="muted">${(st.items || []).length ? 'Clear the search or filters.' : 'Emails sent to this project\'s address, or from its client contacts, appear here after the delivery mailbox is checked. An admin sets the mailbox and routing rules under Tickets › Support mailbox.'}</p></div>`;
    return list.map(m => `<button type="button" class="ib-row${m.key === st.sel ? ' on' : ''}${m.status === 'new' ? ' unread' : ''}" data-act="ibOpen" data-k="${m.key}" role="listitem" aria-current="${m.key === st.sel}">
      <span class="ib-dot ${esc(m.status)}" aria-label="${esc(STATUS[m.status] ? STATUS[m.status][0] : m.status)}"></span>
      <span class="ib-l1"><b>${esc(m.from ? (m.from.name || m.from.email) : '')}</b><time datetime="${esc(m.receivedAt)}">${esc(short(m.receivedAt))}</time></span>
      <span class="ib-l2">${m.hasAttachments ? `<i title="Has attachments">${ico('clip')}</i>` : ''}${esc(m.subject)}</span>
      <span class="ib-l3">${esc(m.preview)}</span>${m.status === 'handled' ? '<span class="ib-h">Handled</span>' : ''}</button>`).join('');
  }
  function readHtml() {
    const o = st.open; if (!o) return `<div class="ib-empty"><h3>Select an email</h3><p class="muted">Open an email to read it, see the whole conversation and mark it handled.</p></div>`;
    if (o.loading) return '<p class="muted" style="padding:20px">Opening…</p>'; if (o.error) return `<p class="err" style="padding:20px">${esc(o.error)}</p>`;
    const m = o.mail, conv = o.conversation || [m], s = STATUS[m.status] || [m.status, 'low'];
    const live = m.live ? (m.live.state === 'missing' ? '<span class="tag red">Not in the mailbox any more (deleted or moved)</span>' : m.live.state === 'available' ? '<span class="tag green">Still in the mailbox</span>' : '') : '';
    return `<div class="ib-head"><h2>${esc(m.subject)}</h2><div class="ib-meta"><span class="tag ${s[1]}">${esc(s[0])}</span>${m.ticket ? `<a class="tag blue" href="#/p/${esc(S.project.id)}/tickets" title="Open tickets">TKT-${esc(m.ticket.n)}</a>` : ''}${live}</div>
      <div class="ib-acts">${canEdit() ? (m.status !== 'handled' ? `<button class="btn primary" data-act="ibStatus" data-v="handled">${ico('check')}Mark handled</button>` : `<button class="btn" data-act="ibStatus" data-v="read">Reopen</button>`) + (m.status !== 'new' ? `<button class="btn" data-act="ibStatus" data-v="new">Mark unread</button>` : '') + (!m.ticket ? `<button class="btn" data-act="ibTicket">Create ticket</button>` : '') : ''}
        ${F.safeUrl(m.outlook) ? `<a class="btn" href="${esc(F.safeUrl(m.outlook))}" target="_blank" rel="noopener noreferrer">Open in Outlook</a>` : ''}<button class="btn ghost" data-act="ibRefresh" title="Check whether the original is still in the mailbox">Check original</button></div>
      <p class="xs muted ib-src">Stored copy, filed ${esc(when(m.storedAt))} (${esc(m.routedBy || 'mailbox sync')}). Outlook shows the live message; opening it there needs access to the delivery mailbox.${m.handledBy ? ` Handled by ${esc(m.handledBy.name || m.handledBy.email)} on ${esc(when(m.handledAt))}.` : ''}</p></div>
      <div class="ib-thread">${conv.map(x => `<article class="ib-msg${x.key === m.key ? ' cur' : ''}"><header><div><b>${who(x.from)}</b><div class="xs muted">To ${(x.to || []).map(who).join(', ') || '—'}${(x.cc || []).length ? ' · Cc ' + x.cc.map(who).join(', ') : ''}</div></div><time class="xs muted" datetime="${esc(x.receivedAt)}">${esc(when(x.receivedAt))}</time></header>
        <div class="ib-body">${esc(x.body || x.preview || '')}</div>
        ${(x.attachments || []).length ? `<div class="ib-atts">${x.attachments.map((a, i) => `<button type="button" class="ib-att" data-act="ibAtt" data-k="${x.key}" data-n="${i}" title="${a.size > 3e6 ? 'Larger than 3 MB: open the email in Outlook' : 'Download'}">${ico('clip')}<span>${esc(a.name)}</span><small>${esc(size(a.size))}</small></button>`).join('')}</div>` : (x.hasAttachments ? '<p class="xs muted">This email has attachments that were not listed; open it in Outlook.</p>' : '')}</article>`).join('')}</div>`;
  }
  function counts() { const c = { new: 0, read: 0, handled: 0 }; (st.items || []).forEach(m => { c[m.status] = (c[m.status] || 0) + 1; }); return c; }
  function bodyHtml() {
    if (st.err) return `<div class="card"><p class="err">${esc(st.err)}</p><button class="btn" data-act="ibCheck">Try again</button></div>`;
    if (!st.items) return '<p class="muted">Loading the Inbox…</p>';
    const c = counts();
    return `<div class="ib-tools card"><div class="tk-sw">${ico('search')}<input type="search" id="ibQ" value="${esc(st.q)}" placeholder="Search sender, subject or text" aria-label="Search emails"></div>
      <label class="tk-f"><span>Status</span><select id="ibS" aria-label="Filter by status"><option value="">All (${st.items.length})</option>${Object.keys(STATUS).map(k => `<option value="${k}"${st.status === k ? ' selected' : ''}>${STATUS[k][0]} (${c[k] || 0})</option>`).join('')}</select></label>
      <label class="tk-f"><span>From</span><input type="date" id="ibF" value="${esc(st.from)}" aria-label="Received from"></label><label class="tk-f"><span>To</span><input type="date" id="ibT" value="${esc(st.to)}" aria-label="Received until"></label></div>
      ${st.note ? `<p class="small ${/could not|not|missing|refused/i.test(st.note) && !/filed/.test(st.note) ? 'warn-t' : 'muted'}" role="status">${esc(st.note)}</p>` : ''}
      <div class="ib-main"><div class="ib-list card" role="list" aria-label="Emails">${listHtml()}</div><div class="ib-read card" id="ibRead" aria-live="polite">${readHtml()}</div></div>`;
  }
  function html() {
    if (!S.project) return ''; { const w = keyFromHash() || (/^[0-9a-f]{40}$/.test(String(S.ui.module || '')) ? S.ui.module : null); if (w) { st.want = w; S.ui.module = null; } }   // deep link from a Teams notice: #/p/<id>/inbox/<email>
    if (st.pid !== S.project.id || (!st.items && !st.loading && !st.err)) setTimeout(() => load(true), 0);
    const last = st.last ? (st.last.ok ? 'Mailbox last checked ' + when(st.last.at) : st.last.error) : 'The mailbox has not been checked yet';
    return `<div class="page-header"><div class="t"><h1>Inbox</h1><p>Client emails for ${esc(S.project.name)}, kept for the whole project. ${esc(last)}.</p></div><div class="row"><button class="btn primary" data-act="ibCheck"${st.checking ? ' disabled' : ''}>${st.checking ? 'Checking…' : 'Check for new email'}</button></div></div>
      <div class="page-body" id="ibApp">${bodyHtml()}</div>`;
  }
  function paint() { const a = document.getElementById('ibApp'); if (a) { const q = document.activeElement && document.activeElement.id; a.innerHTML = bodyHtml(); bind(); if (q === 'ibQ') { const i = document.getElementById('ibQ'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); } } }
  function bind() {
    const on = (id, ev, fn) => { const e = document.getElementById(id); if (e) e.addEventListener(ev, fn); };
    on('ibQ', 'input', e => { st.q = e.target.value; const l = document.querySelector('.ib-list'); if (l) l.innerHTML = listHtml(); });
    on('ibS', 'change', e => { st.status = e.target.value; paint(); }); on('ibF', 'change', e => { st.from = e.target.value; paint(); }); on('ibT', 'change', e => { st.to = e.target.value; paint(); });
  }
  function mount() { bind(); }

  ACT.ibOpen = a => openMail(a.getAttribute('data-k'));
  ACT.ibCheck = async a => { st.checking = true; V.render(); await load(true); V.render(); if (st.note) toast(st.note, 5000, /could not|not available|refused|missing/i.test(st.note) && !/filed/.test(st.note)); };
  ACT.ibStatus = a => V.busy(a, async () => { const v = a.getAttribute('data-v'); try { const r = await API.post(`/api/projects/${S.project.id}/mail/${st.sel}/status`, { status: v }); st.open.mail = Object.assign(st.open.mail, r.mail); const it = st.items.find(x => x.key === st.sel); if (it) Object.assign(it, r.mail); toast(v === 'handled' ? 'Marked handled' : v === 'new' ? 'Marked unread' : 'Reopened'); paint(); } catch (e) { toast(e.message, 6000, true); } });
  ACT.ibTicket = a => V.busy(a, async () => { try { const r = await API.post(`/api/projects/${S.project.id}/mail/${st.sel}/ticket`, {}); st.open.mail.ticket = r.ticket; const it = st.items.find(x => x.key === st.sel); if (it) it.ticket = r.ticket; toast('Ticket TKT-' + r.ticket.n + ' created'); paint(); } catch (e) { toast(e.message, 6000, true); } });
  ACT.ibRefresh = a => V.busy(a, async () => { try { const r = await API.post(`/api/projects/${S.project.id}/mail/${st.sel}/refresh`, {}); st.open.mail = Object.assign(st.open.mail, r.mail); paint(); toast(r.mail.live && r.mail.live.state === 'missing' ? 'The original is no longer in the mailbox. The stored copy stays here.' : 'The original is still in the mailbox'); } catch (e) { toast(e.message, 6000, true); } });
  ACT.ibAtt = a => V.busy(a, async () => {
    const k = a.getAttribute('data-k'), n = a.getAttribute('data-n');
    try { const r = await API.get(`/api/projects/${S.project.id}/mail/${k}/attachments/${n}`); const bin = atob(r.data); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      V.download(String(r.name || 'attachment').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_'), new Blob([u], { type: 'application/octet-stream' })); }   // saved as a file, never opened in the page
    catch (e) { toast(e.message, 6000, true); } });

  V.inbox = { html, mount };
  V.inboxState = st;
})(typeof window !== 'undefined' ? window : globalThis);

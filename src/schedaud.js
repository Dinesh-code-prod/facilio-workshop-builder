/* Workshop schedule by BRD and audience.
   A session can be tied to a BRD and to one or more audiences (the customer's own teams, or an outside vendor such as the
   Zoho Desk or SAP team). No audience means everyone. The team sees and filters everything; the customer schedule can be opened
   for one audience (a view filter, not an access lock). Meetings themselves run in Microsoft Teams, so no meeting links are handled here. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const { toast } = V;
  const R = () => root.FWBBrd; const P = () => V.plannerDoc();
  const CUST = 'Customer team';
  const brds = () => (R() ? R().list() : []);
  V.brdName = id => { const r = brds().find(x => x.id === id); return r ? r.name : ''; };

  // audiences the team can pick: the customer, every external system named in a BRD or contract, and anything already used
  function audiences() {
    const set = [CUST]; const add = n => { n = String(n || '').trim(); if (n && !set.some(x => x.toLowerCase() === n.toLowerCase())) set.push(n); };
    brds().forEach(r => { if (r.system) add(r.system + ' team'); });
    (V.contractFacts ? V.contractFacts() : []).forEach(f => { if (f.kind === 'integration' && f.system) add(f.system + ' team'); });
    (P().sessions || []).forEach(s => (s.aud || []).forEach(add)); return set;
  }
  V.audiences = audiences;

  // ---------- agenda templates per BRD type ----------
  const TPL = {
    servicedesk: { topics: ['Systems and ownership: who owns the help desk system and its APIs', 'Ticket lifecycle: statuses and how they map to Facilio service requests and work orders', 'Field mapping: mandatory fields in both systems, value lists and defaults', 'Direction, trigger and frequency: real time or scheduled, retries and error handling', 'Authentication, API limits, environments (test and live) and cut-over plan', 'Volumes per day, attachments, and who is notified on failure'], prep: 'API documentation and a test environment; sample tickets; the ticket status and category lists.', who: 'Help desk system owner, integration developer, service desk lead' },
    erp: { topics: ['Systems and ownership: ERP modules involved and who owns them', 'Procurement flow: requisition, approval, quote, purchase order and receipt, and which system is the master at each step', 'Vendor, cost centre and chart of accounts: master data, who creates it and how it is synchronised', 'Inventory and asset data: item codes, units, locations and stock updates', 'Field mapping, direction, frequency, authentication, volumes and error handling', 'Cut-over: test environment, sample data and sign-off'], prep: 'ERP interface documentation; sample purchase orders and vendor records; cost centre list.', who: 'ERP functional lead, finance or procurement lead, integration developer' },
    agent: { topics: ['Which tasks the agents will run and who stays responsible for each outcome', 'Rules and limits: what an agent may decide alone and what needs a person to approve', 'Data the agents read and write, and the systems they connect to', 'Escalation, audit trail and how mistakes are corrected', 'Success measures and the review rhythm after go-live'], prep: 'Examples of the tasks to automate; current approval rules; the people who approve exceptions.', who: 'Operations lead, approvers, IT and security representative' },
    core: { topics: [], prep: '', who: '' }
  };
  const tplFor = id => { const r = brds().find(x => x.id === id); return r ? TPL[r.type] || TPL.core : null; };

  // ---------- session drawer fields ----------
  V.sessAudHtml = (s, dis) => {
    const sel = s.aud || []; const aud = audiences(); const l = brds();
    return `<div class="full"><div class="pink-label" style="margin-top:6px">BRD and audience</div></div>
      <div><label class="f">BRD this session feeds</label><select id="ss_brd" ${dis}><option value="">Not tied to one BRD</option>${l.map(r => `<option value="${esc(r.id)}"${s.brd === r.id ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</select></div>
      <div style="align-self:end">${dis ? '' : `<button type="button" class="btn sm" data-act="sessTemplate">Use the agenda template for this BRD type</button>`}</div>
      <div class="full"><label class="f">Who should attend (audience)</label><div class="chips" id="ss_aud">${aud.map(a => `<label class="chip"><input type="checkbox" value="${esc(a)}" ${sel.includes(a) ? 'checked' : ''} ${dis}> ${esc(a)}</label>`).join('')}</div>
        ${dis ? '' : `<div class="row" style="margin-top:6px;gap:6px"><input id="ss_audnew" placeholder="Add another audience, e.g. Oracle ERP team" style="flex:1"><button type="button" class="btn sm" data-act="sessAudAdd">Add</button></div>`}<div class="xs muted" style="margin-top:4px">Leave all unticked if everyone should see this session.</div></div>`;
  };
  V.sessAudRead = () => ({ brd: (document.getElementById('ss_brd') || {}).value || '', aud: Array.from(document.querySelectorAll('#ss_aud input:checked')).map(i => i.value) });
  ACT.sessAudAdd = () => { const el = document.getElementById('ss_audnew'); const v = el.value.trim(); if (!v) return; const box = document.getElementById('ss_aud'); if (Array.from(box.querySelectorAll('input')).some(i => i.value.toLowerCase() === v.toLowerCase())) { toast('Already in the list'); return; } const l = document.createElement('label'); l.className = 'chip'; l.innerHTML = '<input type="checkbox" checked> ' + esc(v); l.firstChild.value = v; box.appendChild(l); el.value = ''; };
  ACT.sessTemplate = () => {
    const id = document.getElementById('ss_brd').value; if (!id) { toast('Choose the BRD first'); return; } const r = brds().find(x => x.id === id); const t = tplFor(id);
    const set = (k, v) => { const el = document.getElementById(k); if (el && v) el.value = v; };
    if (t && t.topics.length) { set('ss_topics', t.topics.join('\n')); set('ss_prep', t.prep); set('ss_part', t.who); if (r.system) { const ti = document.getElementById('ss_title'); if (ti && !ti.value.trim()) ti.value = r.system + ' integration workshop'; document.querySelectorAll('#ss_aud input').forEach(i => { if (i.value.toLowerCase() === (r.system + ' team').toLowerCase()) i.checked = true; }); } toast('Agenda template applied. Edit it as needed.'); }
    else { const ms = (r.modules && r.modules.length ? r.modules : []); ms.forEach(m => { const c = document.querySelector('#ss_mods input[value="' + m + '"]'); if (c) c.checked = true; }); if (V.ACT.suggestTopics) V.ACT.suggestTopics(); toast('Modules of this BRD ticked and topics suggested'); }
  };

  // ---------- team list: tags and filters ----------
  V.sessTags = s => { const b = s.brd ? (s.brd.length < 14 && V.brdName(s.brd) ? V.brdName(s.brd) : V.brdName(s.brd) || s.brd) : ''; const bn = typeof s.brd === 'string' && V.brdName(s.brd) ? V.brdName(s.brd) : (s.brd && !V.brdName(s.brd) && / /.test(s.brd) ? s.brd : '');
    return (bn || (s.aud || []).length) ? `<div class="xs" style="margin-top:3px">${bn ? `<span class="chip">${esc(bn)}</span> ` : ''}${(s.aud || []).map(a => `<span class="chip aud">${esc(a)}</span>`).join(' ')}</div>` : ''; };
  V.sessFilter = ss => ss.filter(s => (!S.ui.sesBrd || s.brd === S.ui.sesBrd) && (!S.ui.sesAud || !(s.aud || []).length || (s.aud || []).includes(S.ui.sesAud)));
  V.sessFilterBar = () => {
    const l = brds(); const aud = audiences(); const n = V.sessFilter(P().sessions).length; if (l.length < 2 && aud.length < 2) return '';
    return `<div class="row aud-bar" style="margin-bottom:10px;gap:8px;flex-wrap:wrap"><span class="small muted">Show</span><select data-change="sesFilter" id="sf_brd" aria-label="Filter by BRD"><option value="">All BRDs</option>${l.map(r => `<option value="${esc(r.id)}"${S.ui.sesBrd === r.id ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</select>
      <select data-change="sesFilter" id="sf_aud" aria-label="Filter by audience"><option value="">All audiences</option>${aud.map(a => `<option value="${esc(a)}"${S.ui.sesAud === a ? ' selected' : ''}>${esc(a)}</option>`).join('')}</select><span class="xs muted">${n} session(s)</span></div>`;
  };
  ACT.sesFilter = () => { S.ui.sesBrd = document.getElementById('sf_brd').value; S.ui.sesAud = document.getElementById('sf_aud').value; V.render(); };

  // ---------- customer view ----------
  const fromUrl = () => { try { return new URLSearchParams(location.search).get('aud') || ''; } catch (e) { return ''; } };
  const current = () => { if (S.ui.audView === undefined) S.ui.audView = fromUrl(); return S.ui.audView; };
  V.schedAudFilter = ss => { const a = current(); return a ? ss.filter(s => !(s.aud || []).length || s.aud.includes(a)) : ss; };
  V.schedAudBar = ss => {
    const set = []; ss.forEach(s => (s.aud || []).forEach(a => { if (!set.includes(a)) set.push(a); })); if (!set.length) return ''; const a = current();
    return `<div class="row aud-bar" style="margin-bottom:12px;gap:8px;flex-wrap:wrap"><span class="small muted">Showing sessions for</span><select data-change="schedAud" id="sa_aud" aria-label="Choose your team"><option value="">All sessions</option>${set.map(x => `<option value="${esc(x)}"${a === x ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>${a ? '<span class="xs muted">Sessions open to everyone are included.</span>' : ''}</div>`;
  };
  ACT.schedAud = () => { S.ui.audView = document.getElementById('sa_aud').value; V.render(); };
})(typeof window !== 'undefined' ? window : globalThis);

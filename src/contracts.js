/* Contracts & Integrations: every contract is a source of truth (original MSA, later integration MSAs, approved CRs, other).
   Each one carries "facts" (integrations and what they serve, cloud region, other terms). Facts are either read from the document
   (page and section kept, always starting as "to review") or added by the team. Both count equally once confirmed, and the team can
   edit freely. Confirmed facts feed the BRDs; when they change, BRDs built on older facts are flagged so an updated BRD can be issued. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc, humanize } = F; const V = root.FWBViews; const ACT = V.ACT; const API = root.FWBApi;
  const { tag, toast, ico, drawer, closeDrawer, confirmDialog, loading } = V;
  const P = () => V.plannerDoc(); const ro = () => S.readonly;
  const TYPES = { msa: 'MSA', integration: 'Integration MSA / addendum', cr: 'Approved change request', other: 'Other contract' };
  const STATUS = { draft: 'Draft', approved: 'Approved', superseded: 'Superseded' };
  const KINDS = { integration: 'Integration', region: 'Cloud region', other: 'Other term' };
  const DIRS = { '': 'Not stated', in: 'Into Facilio', out: 'Out of Facilio', both: 'Two-way' };
  const SYSTEMS = ['Zoho Desk', 'Zoho', 'ServiceNow', 'SAP', 'Oracle', 'NetSuite', 'Dynamics 365', 'Dynamics', 'Workday', 'Salesforce', 'Freshdesk', 'Freshservice', 'Jira', 'Maximo', 'Archibus', 'Odoo', 'Coupa', 'Ariba', 'QuickBooks', 'Xero', 'Sage', 'Microsoft Teams', 'Okta', 'Azure AD', 'Entra', 'ERP', 'CRM', 'ITSM', 'BMS', 'IoT platform', 'help desk system', 'accounting system'];
  const REGIONS = ['UAE', 'United Arab Emirates', 'KSA', 'Saudi Arabia', 'Qatar', 'Bahrain', 'Oman', 'Kuwait', 'India', 'Singapore', 'Australia', 'Europe', 'EU', 'Germany', 'Ireland', 'United Kingdom', 'UK', 'United States', 'US', 'Canada', 'Azure', 'AWS', 'Amazon Web Services', 'Google Cloud', 'GCP', 'Middle East', 'Asia Pacific'];
  const SERVES = [['Service Request', /service request|ticket|help ?desk|case management/i], ['Work Order', /work order|reactive|corrective|maintenance request/i], ['Inventory', /inventory|stock|spare/i], ['Procurement', /procure|purchase|requisition|quotation|\bPO\b|vendor|supplier/i], ['Assets', /\basset/i], ['Invoicing', /invoice|billing|payment/i], ['Users / sign-in', /\bSSO\b|single sign|user provisioning|identity/i]];
  const esc2 = s => new RegExp('(^|[^A-Za-z0-9])' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Za-z0-9])', 'i');

  // ---------- reading facts from the document text (rule based; nothing is invented) ----------
  function extractFacts(x) {
    const out = []; const seen = new Set(); const SENT = V.contractSentences ? V.contractSentences(x) : [];
    const mk = o => { const k = o.kind + '|' + (o.system || o.value || '').toLowerCase() + '|' + (o.page || '') + '|' + o.text.slice(0, 40); if (seen.has(k) || out.length >= 60) return; seen.add(k); out.push(Object.assign({ id: F.uid('fct'), origin: 'extracted', state: 'review', direction: '', serves: [], value: '', system: '', note: '' }, o)); };
    SENT.forEach(s => {
      const t = s.t; const ref = { text: t.slice(0, 380), page: s.page, section: s.section };
      if (/\b(integrat\w*|interface\w*|API|APIs|connector|middleware|SSO|single sign|webhook|synchroni[sz]\w*|data exchange)\b/i.test(t)) {
        const sysHit = SYSTEMS.filter(n => esc2(n).test(t)); const serves = SERVES.filter(([, re]) => re.test(t)).map(([n]) => n);
        const direction = /two-way|bi-?directional|both directions/i.test(t) ? 'both' : /\b(send|push|export|outbound|publish)\w*/i.test(t) ? 'out' : /\b(receive|import|inbound|pull|ingest|create[sd]? in Facilio)\w*/i.test(t) ? 'in' : '';
        const keep = sysHit.filter(n => !sysHit.some(o => o !== n && o.length > n.length && o.toLowerCase().includes(n.toLowerCase())));
        if (keep.length) keep.forEach(n => mk(Object.assign({ kind: 'integration', system: n, serves, direction }, ref)));
        else if (/integrat/i.test(t)) mk(Object.assign({ kind: 'integration', system: '', serves, direction }, ref));
      }
      if (/\b(cloud|hosted|hosting|data ?cent(?:er|re)s?|region|residen\w+|sovereign\w*)\b/i.test(t)) {
        const hits = REGIONS.filter(n => esc2(n).test(t)); if (hits.length) mk(Object.assign({ kind: 'region', value: hits.filter(n => !hits.some(o => o !== n && o.length > n.length && o.toLowerCase().includes(n.toLowerCase()))).join(', ') }, ref));
      }
    });
    return out;
  }
  V.extractFacts = extractFacts;

  // ---------- store ----------
  const list = () => { const d = P(); d.contracts = d.contracts || []; return d.contracts; };
  // the original MSA is a contract too; it is shown first and becomes a real record the first time the team works on it
  function all() {
    const l = list(); const d = P();
    if (d.msa && !l.some(c => c.id === 'msa0')) return [{ id: 'msa0', type: 'msa', title: 'Master Services Agreement (original)', ref: d.msa.name || '', date: (d.contractX && d.contractX.fields && d.contractX.fields.effectiveDate && d.contractX.fields.effectiveDate.value) || '', status: 'approved', source: 'upload', file: { fileId: d.msa.fileId, name: d.msa.name, pages: d.msa.pages ? d.msa.pages.length : null }, facts: [], virtual: true }].concat(l);
    return l;
  }
  const real = id => { const l = list(); let c = l.find(x => x.id === id); if (!c && id === 'msa0') { c = all().find(x => x.id === 'msa0'); delete c.virtual; l.unshift(c); } return c; };
  const live = () => all().filter(c => c.status !== 'superseded');
  const facts = (opts) => { opts = opts || {}; const out = []; live().forEach(c => (c.facts || []).forEach(f => { if (f.state === 'rejected') return; if (opts.confirmed && f.state !== 'confirmed') return; out.push(Object.assign({}, f, { contract: c })); })); return out; };
  V.contractFacts = facts;
  // A confirmed integration is an agreed fact, so the work it needs is opened: one Solution area per system (Integration: <system>, linked to what it serves) and the standard integration questions in the question bank.
  // Run when a fact is confirmed or saved. Areas that already exist and questions already in the bank are skipped, so running it twice adds nothing.
  // shortcut: an area a person removed comes back the next time an integration fact is confirmed; fine while removing an area is rare.
  const intType = n => /sso|single sign|okta|azure ad|entra|ldap|directory/i.test(n) ? 'int_sso' : /\b(sap|oracle|netsuite|dynamics|workday|erp|coupa|ariba|quickbooks|xero|sage|odoo)\b/i.test(n) ? 'int_proc' : /portal|\bapp\b/i.test(n) ? 'int_portal' : /zoho|servicenow|freshdesk|freshservice|jira|desk|itsm|crm|salesforce/i.test(n) ? 'int_sr' : 'int_data';
  function syncIntegrations() {
    if (ro()) return; const fs = facts({ confirmed: true }).filter(f => f.kind === 'integration' && f.system); if (!fs.length) return;
    const SL = root.FWBSolutionLogic, QB = root.FWBQBank, J = V.studioJobs; const by = (S.user && (S.user.name || S.user.email)) || '', at = new Date().toISOString(); let areas = 0, qs = 0;
    if (SL && SL.addArea && J && J.setDoc) { let doc = F.doc('solutions') || { items: {} }; const seen = new Set();
      fs.forEach(f => { const key = 'custom:int-' + String(f.system).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 28); if (key === 'custom:int-' || seen.has(key) || SL.customOf(doc).some(c => c.key === key)) return; seen.add(key);
        try { doc = SL.addArea(doc, { key, label: 'Integration: ' + f.system, type: intType(f.system), modules: f.serves || [], keywords: [f.system] }, by, at).doc; areas++; } catch (e) { /* a name that cannot be an area is skipped */ } });
      if (areas) J.setDoc('solutions', doc); }
    if (QB && QB.fromIntegrations) { F.doc('rs_questions'); const r = QB.merge(QB.bankOf(S.docs.rs_questions && S.docs.rs_questions.data), QB.fromIntegrations(fs), at, by, 'rules', 'Contracts & Integrations'); if (r.added) { S.docs.rs_questions.data = r.bank; F.markDirty('rs_questions'); qs = r.added; } }
    if (areas || qs) toast((areas ? areas + ' Solution area' + (areas === 1 ? '' : 's') + ' opened' : '') + (areas && qs ? ' and ' : '') + (qs ? qs + ' integration question' + (qs === 1 ? '' : 's') + ' added to the question bank' : '') + '.', 6000);
  }
  V.syncIntegrations = syncIntegrations;
  const prov = (f, c) => f.origin === 'team' ? 'Added by team' : ('From ' + (c.type === 'cr' ? 'CR' : c.type === 'msa' ? 'MSA' : 'contract') + (f.page ? ' p.' + f.page : '') + (f.section ? ' §' + f.section : ''));
  V.contractProv = prov;
  // a short fingerprint of everything the BRDs depend on, so a change can be detected
  const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  V.contractSig = () => hash(facts({ confirmed: true }).map(f => [f.id, f.kind, f.system, f.value, f.direction, (f.serves || []).join('+'), f.contract.id, f.contract.status].join('~')).sort().join('|'));
  V.contractChanges = rec => { // plain-language list of what differs from the facts the BRD was last issued against
    const snap = (rec && rec.basis) || null; if (!snap) return []; const now = {}; facts({ confirmed: true }).forEach(f => { now[f.id] = f; }); const ch = [];
    const nm = f => f.kind === 'integration' ? (f.system || 'An integration') : f.kind === 'region' ? 'Cloud region' : 'Term';
    Object.keys(now).forEach(id => { const f = now[id]; const o = snap.items[id]; if (!o) ch.push('Added: ' + nm(f) + (f.value ? ' (' + f.value + ')' : '') + ' from ' + f.contract.title); else if (o !== [f.system, f.value, f.direction, (f.serves || []).join('+')].join('~')) ch.push('Changed: ' + nm(f)); });
    Object.keys(snap.items).forEach(id => { if (!now[id]) ch.push('Removed or no longer confirmed: ' + (snap.names[id] || 'an item')); });
    return ch;
  };
  V.contractBasis = () => { const items = {}, names = {}; facts({ confirmed: true }).forEach(f => { items[f.id] = [f.system, f.value, f.direction, (f.serves || []).join('+')].join('~'); names[f.id] = (f.system || f.value || f.kind); }); return { sig: V.contractSig(), at: new Date().toISOString(), items, names }; };

  // ---------- page ----------
  const factRow = (c, f) => {
    const st = f.state === 'confirmed' ? tag('green', 'Confirmed') : f.state === 'rejected' ? tag('tbc', 'Rejected') : tag('amber', 'To review');
    const what = f.kind === 'integration' ? `<b>${esc(f.system || 'Integration (system not named)')}</b>${f.serves && f.serves.length ? '<div class="xs muted">Serves: ' + esc(f.serves.join(', ')) + '</div>' : ''}<div class="xs muted">${esc(DIRS[f.direction || ''])}</div>`
      : f.kind === 'region' ? `<b>${esc(f.value || 'Region')}</b>` : `<b>${esc(f.value || f.text.slice(0, 50))}</b>`;
    return `<tr data-fid="${esc(f.id)}" class="${f.state === 'rejected' ? 'muted' : ''}"><td class="xs">${esc(KINDS[f.kind] || f.kind)}</td><td>${what}</td><td class="xs">${esc(f.text || '')}${f.note ? `<div class="muted">Note: ${esc(f.note)}</div>` : ''}</td><td class="xs"><span class="ctr-prov ${f.origin}">${esc(prov(f, c))}</span></td><td>${st}</td>
      <td style="white-space:nowrap">${ro() ? '' : `${f.state !== 'confirmed' ? `<button class="btn sm" data-act="ctFactState" data-c="${esc(c.id)}" data-f="${esc(f.id)}" data-s="confirmed">Confirm</button> ` : ''}${f.state !== 'rejected' ? `<button class="btn sm" data-act="ctFactState" data-c="${esc(c.id)}" data-f="${esc(f.id)}" data-s="rejected">Reject</button> ` : `<button class="btn sm" data-act="ctFactState" data-c="${esc(c.id)}" data-f="${esc(f.id)}" data-s="review">Restore</button> `}<button class="btn sm" data-act="ctFactEdit" data-c="${esc(c.id)}" data-f="${esc(f.id)}">Edit</button>`}</td></tr>`;
  };
  function card(c) {
    const fs = c.facts || []; const open = fs.filter(f => f.state === 'review').length;
    return `<div class="card ctr-card" data-cid="${esc(c.id)}"><div class="card-h"><h3>${esc(c.title)}</h3><span>${tag('tbc', TYPES[c.type] || c.type)} ${c.status === 'approved' ? tag('green', 'Approved') : c.status === 'superseded' ? tag('tbc', 'Superseded') : tag('amber', 'Draft')}</span></div>
      <div class="card-b"><div class="small muted" style="margin-bottom:8px">${c.ref ? esc(c.ref) + ' · ' : ''}${c.date ? 'Dated ' + esc(V.fmtDate ? V.fmtDate(c.date) : c.date) + ' · ' : ''}${c.source === 'upload' ? 'Uploaded document' + (c.file && c.file.pages ? ' · ' + c.file.pages + ' pages read' : '') : 'Entered by the team'}${open ? ' · <b>' + open + ' to review</b>' : ''}</div>
        ${fs.length ? `<div class="tbl-wrap"><table class="tbl ctr-t"><thead><tr><th>Type</th><th>What</th><th>Contract wording</th><th>Source</th><th>Status</th><th></th></tr></thead><tbody>${fs.map(f => factRow(c, f)).join('')}</tbody></table></div>` : '<div class="muted small">No facts yet. Read them from the document or add them by hand.</div>'}
        ${ro() ? '' : `<div class="row" style="margin-top:10px;gap:6px;flex-wrap:wrap"><button class="btn sm primary" data-act="ctFactAdd" data-c="${esc(c.id)}">${ico('plus')}Add a fact</button>${c.file ? `<button class="btn sm" data-act="ctRead" data-c="${esc(c.id)}">Read facts from the document</button><button class="btn sm" data-act="ctDl" data-c="${esc(c.id)}">${ico('dl')}Download</button>` : ''}<span class="spacer"></span><button class="btn sm" data-act="ctEdit" data-c="${esc(c.id)}">Edit contract</button>${c.virtual ? '' : `<button class="btn sm danger" data-act="ctDel" data-c="${esc(c.id)}">Remove</button>`}</div>`}</div></div>`;
  }
  function summary() {
    const fs = facts(); const conf = fs.filter(f => f.state === 'confirmed'); const ints = {}; conf.filter(f => f.kind === 'integration').forEach(f => { const k = f.system || 'Unnamed'; (ints[k] = ints[k] || { serves: new Set(), dir: f.direction, from: [] }); (f.serves || []).forEach(s => ints[k].serves.add(s)); ints[k].from.push(prov(f, f.contract)); });
    const regs = conf.filter(f => f.kind === 'region').map(f => f.value).filter(Boolean);
    return `<div class="card"><div class="card-h"><h3>What the contracts say (confirmed)</h3></div><div class="card-b small">
      <div><b>Integrations:</b> ${Object.keys(ints).length ? Object.keys(ints).map(k => `<span class="chip">${esc(k)}${ints[k].serves.size ? ' · ' + esc([...ints[k].serves].join(', ')) : ''}</span>`).join(' ') : '<span class="muted">none confirmed yet</span>'}</div>
      <div style="margin-top:6px"><b>Cloud region:</b> ${regs.length ? esc([...new Set(regs)].join('; ')) : '<span class="muted">not confirmed yet</span>'}</div>
      <div class="xs muted" style="margin-top:8px">Confirmed facts from every approved or draft contract count equally, whether read from a document or added by the team. A superseded contract is left out. The BRDs use these facts; if they change, each affected BRD is flagged so you can issue an updated one.</div></div></div>`;
  }
  V.contracts = {
    html() {
      const l = all();
      return `<div class="page-header"><div class="t"><h1>Contracts &amp; Integrations</h1><p>The MSA, later integration MSAs and approved change requests: the facts in them (integrations, what they serve, cloud region) drive the BRDs.</p></div>${ro() ? '' : `<div class="row"><button class="btn" data-act="ctAddTeam">${ico('plus')}Add contract item</button><button class="btn primary" data-act="ctUpload">${ico('plus')}Upload a contract</button></div>`}</div>
        <div class="page-body">${summary()}${l.length ? l.map(card).join('') : '<div class="card"><div class="card-b empty">No contract yet. Upload the MSA from the Contract section, or add one here.</div></div>'}</div>`;
    }
  };

  // ---------- actions ----------
  const get = a => { const c = real(a.getAttribute('data-c')); const f = a.getAttribute('data-f') ? (c.facts || []).find(x => x.id === a.getAttribute('data-f')) : null; return { c, f }; };
  const val = id => (document.getElementById(id) || {}).value || '';
  ACT.ctFactState = a => { const { c, f } = get(a); if (!f) return; f.state = a.getAttribute('data-s'); F.changed('Contract fact ' + (f.state === 'confirmed' ? 'confirmed' : f.state === 'rejected' ? 'rejected' : 'restored'), (f.system || f.value || f.kind) + ' · ' + c.title, { section: 'planner' }); if (f.state === 'confirmed') syncIntegrations(); };
  function factForm(c, f) {
    const isNew = !f; f = f || { kind: 'integration', system: '', serves: [], direction: '', value: '', text: '', note: '' };
    drawer(isNew ? 'Add a fact' : 'Edit fact', `<div class="fgrid"><div><label class="f">Type</label><select id="cf_kind">${Object.entries(KINDS).map(([k, v]) => `<option value="${k}"${f.kind === k ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
      <div><label class="f">System (integrations)</label><input id="cf_sys" value="${esc(f.system || '')}" placeholder="e.g. Zoho Desk, SAP"></div>
      <div><label class="f">Region or value</label><input id="cf_val" value="${esc(f.value || '')}" placeholder="e.g. UAE North (Azure)"></div>
      <div><label class="f">Direction</label><select id="cf_dir">${Object.entries(DIRS).map(([k, v]) => `<option value="${k}"${(f.direction || '') === k ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
      <div class="full"><label class="f">Serves (comma separated)</label><input id="cf_serves" value="${esc((f.serves || []).join(', '))}" placeholder="Service Request, Work Order"></div>
      <div class="full"><label class="f">Contract wording or reference</label><textarea id="cf_text" rows="3">${esc(f.text || '')}</textarea></div>
      <div class="full"><label class="f">Page / section (optional)</label><input id="cf_ref" value="${esc((f.page ? 'p.' + f.page : '') + (f.section ? ' §' + f.section : ''))}" placeholder="e.g. p.12 §4.2"></div>
      <div class="full"><label class="f">Team note (optional)</label><input id="cf_note" value="${esc(f.note || '')}"></div></div>`,
      `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="ctFactSave" data-c="${esc(c.id)}" data-f="${esc(f.id || '')}">Save</button>`);
  }
  ACT.ctFactAdd = a => { if (V.requireEdit && !V.requireEdit()) return; factForm(real(a.getAttribute('data-c')), null); };
  ACT.ctFactEdit = a => { if (V.requireEdit && !V.requireEdit()) return; const { c, f } = get(a); factForm(c, f); };
  ACT.ctFactSave = a => {
    const c = real(a.getAttribute('data-c')); const id = a.getAttribute('data-f'); let f = id ? c.facts.find(x => x.id === id) : null; const kind = val('cf_kind'); const sys = val('cf_sys').trim(); const v = val('cf_val').trim();
    if (kind === 'integration' && !sys) { toast('Name the system'); return; } if (kind !== 'integration' && !v) { toast('Enter the region or value'); return; }
    const ref = val('cf_ref'); const pg = (ref.match(/p\.?\s*(\d+)/i) || [])[1]; const sc = (ref.match(/§\s*([\d.]+)/) || [])[1];
    const data = { kind, system: kind === 'integration' ? sys : '', value: v, direction: kind === 'integration' ? val('cf_dir') : '', serves: val('cf_serves').split(',').map(x => x.trim()).filter(Boolean), text: val('cf_text').trim(), note: val('cf_note').trim(), page: pg ? +pg : null, section: sc || '' };
    c.facts = c.facts || []; if (f) Object.assign(f, data); else { c.facts.push(Object.assign({ id: F.uid('fct'), origin: 'team', state: 'confirmed' }, data)); }
    closeDrawer(); F.changed(f ? 'Contract fact edited' : 'Contract fact added', (sys || v) + ' · ' + c.title, { section: 'planner' }); syncIntegrations();
  };
  function contractForm(c) {
    const isNew = !c._id && !c.id; drawer(isNew ? 'Add contract item' : 'Edit contract', `<div class="fgrid"><div class="full"><label class="f">Title</label><input id="cc_title" value="${esc(c.title || '')}" placeholder="e.g. Zoho Desk integration addendum, CR-014"></div>
      <div><label class="f">Type</label><select id="cc_type">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}"${c.type === k ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
      <div><label class="f">Status</label><select id="cc_status">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}"${c.status === k ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
      <div><label class="f">Reference</label><input id="cc_ref" value="${esc(c.ref || '')}" placeholder="Contract or CR number"></div><div><label class="f">Date</label><input id="cc_date" type="date" value="${esc(c.date || '')}"></div></div>
      <div class="xs muted" style="margin-top:8px">Marking a contract Superseded leaves its facts out of the BRDs. Nothing is deleted.</div>`,
      `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="ctSave" data-c="${esc(c.id || '')}">Save</button>`);
  }
  ACT.ctAddTeam = () => { if (V.requireEdit && !V.requireEdit()) return; contractForm({ type: 'cr', status: 'approved', source: 'team' }); };
  ACT.ctEdit = a => { if (V.requireEdit && !V.requireEdit()) return; contractForm(real(a.getAttribute('data-c'))); };
  ACT.ctSave = a => {
    const t = val('cc_title').trim(); if (!t) { V.ui.field('cc_title', 'Give it a title'); return; } const id = a.getAttribute('data-c'); const data = { title: t, type: val('cc_type'), status: val('cc_status'), ref: val('cc_ref').trim(), date: val('cc_date') };
    if (id) Object.assign(real(id), data); else list().push(Object.assign({ id: F.uid('ctr'), source: 'team', facts: [], addedAt: new Date().toISOString() }, data));
    closeDrawer(); F.changed(id ? 'Contract edited' : 'Contract item added', t, { section: 'planner' });
  };
  ACT.ctDel = async a => { const c = real(a.getAttribute('data-c')); if (!(await confirmDialog('Remove contract', `Remove "${c.title}" and its facts? BRDs will be flagged if they used them.`, 'Remove'))) return; const l = list(); l.splice(l.indexOf(c), 1); F.changed('Contract removed', c.title, { section: 'planner' }); };
  ACT.ctUpload = async () => {
    if (V.requireEdit && !V.requireEdit()) return; const f = (await V.pickFile('.pdf,.docx,.txt'))[0]; if (!f) return;
    if (!f.size) { toast('The file is empty', 5000, true); return; } loading(true, 'Reading the contract…');
    try {
      const x = await V.extractDocPages(f, V.loadingMsg); if (x.text.replace(/\s/g, '').length < 60 && !x.pages) { toast('No readable text was found in ' + f.name, 6000, true); return; }
      const rec = await API.uploadFile(S.project.id, f, 'msa', { contract: true }, null, p => V.loadingMsg('Uploading… ' + Math.round(p * 100) + '%'));
      const fs = extractFacts(x); const c = { id: F.uid('ctr'), type: /change request|\bCR\b/i.test(f.name) ? 'cr' : 'integration', title: f.name.replace(/\.[a-z0-9]+$/i, ''), ref: '', date: '', status: 'draft', source: 'upload', file: { fileId: rec.id, name: f.name, pages: x.pages ? x.pages.length : null }, facts: fs, addedAt: new Date().toISOString() };
      list().push(c); F.changed('Contract uploaded', f.name + ' · ' + fs.length + ' fact(s) found', { section: 'planner' }); toast(fs.length ? fs.length + ' fact(s) found. Review each one, then confirm.' : 'No integration or region wording was found. You can add facts by hand.', 6000);
    } finally { loading(false); }
  };
  ACT.ctRead = async a => {
    const c = real(a.getAttribute('data-c')); if (!c.file) return; loading(true, 'Reading all pages…');
    try {
      const r = await API.downloadFile(S.project.id, c.file.fileId); const file = new File([r.blob], c.file.name || 'contract.pdf'); const x = await V.extractDocPages(file, V.loadingMsg); const found = extractFacts(x);
      const have = new Set((c.facts || []).map(f => f.kind + '|' + (f.system || f.value || '').toLowerCase() + '|' + (f.page || '')));
      const add = found.filter(f => !have.has(f.kind + '|' + (f.system || f.value || '').toLowerCase() + '|' + (f.page || ''))); c.facts = (c.facts || []).concat(add);
      F.changed('Contract facts read', c.title + ' · ' + add.length + ' new', { section: 'planner' }); toast(add.length ? add.length + ' new fact(s) added to review' : 'Nothing new found; your existing facts are kept', 5000);
    } catch (e) { toast('Could not read the document: ' + String(e.message || e).slice(0, 120), 6000, true); } finally { loading(false); }
  };
  ACT.ctDl = async a => { const c = real(a.getAttribute('data-c')); loading(true); try { const r = await API.downloadFile(S.project.id, c.file.fileId); V.download(c.file.name, r.blob); } finally { loading(false); } };
})(typeof window !== 'undefined' ? window : globalThis);

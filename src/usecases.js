/* Use Cases, Discrepancy register and the Session → BRD view.
   - Use cases are shared records (kind "usecase", implementation team only). They link to requirements and questions by id and
     never copy their text, so a change in one place shows everywhere.
   - Discrepancies record where the configuration, workshop evidence, requirements and proposed solutions disagree. "Check now" adds
     the ones the rules can find; each keeps its own decision, and nothing is resolved silently.
   - Session → BRD shows, per requirement session and module, what was said, which BRD section it feeds and what still blocks it.
   Nothing here claims that something exists in the live Facilio organisation: use cases and fields are documented proposals. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items;
  const { tag, drawer, closeDrawer, toast, ico, confirmDialog } = V;
  const SOL = ['Existing standard functionality', 'Configuration', 'Customisation or development assessment', 'Integration assessment', 'Product capability confirmation required', 'Further investigation required', 'Not supported or not feasible (verified)', 'Out of scope', 'Pending decision'];
  const IMPL = ['Not started', 'Documented', 'Configured', 'Verified against configuration'];
  const PRI = ['High', 'Medium', 'Low']; const SCOPEST = ['In scope', 'Pending decision', 'Out of scope'];
  const CONF = ['Unconfirmed', 'Customer confirmed'];
  const WO_PROMPTS = ['Work order created from another module', 'Conditional assignment or reassignment', 'Additional approval', 'Escalation', 'Child work orders', 'Quote or inventory dependency', 'Purchase order, inspection or service request link', 'Custom completion or closure condition', 'Reopening condition', 'Conditional fields', 'Notification or report', 'Manual exception', 'Custom development or integration'];
  const canEdit = () => !V.isCustomer() && !S.readonly;
  const KINDS = ['usecase', 'discrepancy'];
  const ucs = () => I().list('usecase').sort((a, b) => (a.no || 0) - (b.no || 0));
  const ucId = u => 'UC-' + String(u.no || 0).padStart(3, '0');
  const modLabel = m => ((F.moduleView && F.moduleView(m)) || {}).label || m;
  V.useCaseList = ucs; V.useCaseId = ucId;

  V.usecases = {
    html() {
      I().load(KINDS); if (!I().ready(KINDS)) return V.loading ? V.loading() : '<div class="muted">Loading…</div>';
      const tab = S.ui.ucTab || 'cases'; const nd = I().list('discrepancy').filter(d => d.status !== 'Resolved').length;
      const tabs = [['cases', 'Use cases', ucs().length], ['disc', 'Discrepancies', nd], ['map', 'Traceability']];
      return `<div class="page-header"><div class="t"><h1>Use Cases</h1><p>Customer-specific scenarios, kept apart from generic requirements. A use case links to requirements and questions; it does not copy them. Proposed solutions are documented here, not created in the live Facilio organisation.</p></div>
        <div class="row">${canEdit() && tab === 'cases' ? `<button class="btn primary" data-act="ucEdit">${ico('plus')}Use case</button>` : ''}${canEdit() && tab === 'disc' ? `<button class="btn" data-act="dcCheck">Check now</button><button class="btn primary" data-act="dcEdit">${ico('plus')}Discrepancy</button>` : ''}</div></div>
        <div class="tabs">${tabs.map(([k, l, c]) => `<button class="tab${tab === k ? ' active' : ''}" data-act="ucTab" data-v="${k}">${esc(l)}${c ? `<span class="cnt">${c}</span>` : ''}</button>`).join('')}</div><div class="page-body">${tab === 'disc' ? discTab() : tab === 'map' ? mapTab() : casesTab()}</div>`;
    }, mount() { }
  };
  ACT.ucTab = a => { S.ui.ucTab = a.getAttribute('data-v'); V.render(); };
  ACT.ucFilter = el => { S.ui.ucF = Object.assign({}, S.ui.ucF, { [el.getAttribute('data-k')]: el.value }); V.render(); };

  // ---------- use cases ----------
  function casesTab() {
    const fl = S.ui.ucF || {}; let l = ucs().filter(u => (!fl.mod || (u.modules || []).includes(fl.mod)) && (!fl.sol || u.solution === fl.sol) && (!fl.conf || u.confirmation === fl.conf));
    const mods = F.allModules().filter(m => m.inScope || ucs().some(u => (u.modules || []).includes(m.name))).sort((a, b) => a.label.localeCompare(b.label));
    const f = (k, opts, ph) => `<select data-change="ucFilter" data-k="${k}" style="width:200px"><option value="">${ph}</option>${opts.map(o => `<option value="${esc(o.v)}" ${fl[k] === o.v ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select>`;
    return `<div class="row" style="margin-bottom:12px">${f('mod', mods.map(m => ({ v: m.name, l: m.label })), 'All modules')}${f('sol', SOL.map(x => ({ v: x, l: x })), 'All solution types')}${f('conf', CONF.map(x => ({ v: x, l: x })), 'Any confirmation')}</div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Use case</th><th>Modules</th><th>Solution</th><th>Scope</th><th>Confirmation</th><th>Status</th><th>Links</th></tr></thead><tbody>${l.map(u => `<tr class="click" data-act="ucEdit" data-id="${esc(u.id)}"><td class="mono">${ucId(u)}</td><td><b>${esc(u.title)}</b><div class="xs muted">${esc((u.scenario || '').slice(0, 110))}</div></td><td class="small">${(u.modules || []).map(modLabel).map(esc).join(', ')}</td><td class="small">${esc(u.solution || '—')}</td><td>${tag(u.scope === 'Out of scope' ? 'low' : u.scope === 'Pending decision' ? 'tbc' : 'green', u.scope || 'In scope')}</td><td>${u.confirmation === 'Customer confirmed' ? tag('green', 'Customer confirmed') : tag('tbc', 'Unconfirmed')}</td><td class="small">${esc(u.impl || 'Not started')}</td><td class="xs">${(u.reqIds || []).length} req · ${(u.questionIds || []).length} q</td></tr>`).join('') || `<tr><td colspan="8" class="empty">No use cases yet. Press Use case to capture a customer-specific scenario.</td></tr>`}</tbody></table></div>`;
  }
  const lines = v => (Array.isArray(v) ? v : String(v || '').split('\n')).map(x => String(x).trim()).filter(Boolean);
  ACT.ucEdit = a => {
    const id = a.getAttribute('data-id'); const u = id ? I().get('usecase', id) : { modules: [], scope: 'In scope', priority: 'Medium', confirmation: 'Unconfirmed', impl: 'Not started', solution: 'Pending decision', reqIds: [], questionIds: [] }; const ro = !canEdit();
    const mods = F.allModules().filter(m => m.inScope || (u.modules || []).includes(m.name)).sort((a, b) => a.label.localeCompare(b.label));
    const t = (k, l, rows, ph) => `<div class="full"><label class="f">${l}</label><textarea id="uc_${k}" rows="${rows || 2}" placeholder="${esc(ph || '')}" ${ro ? 'disabled' : ''}>${esc(Array.isArray(u[k]) ? u[k].join('\n') : u[k] || '')}</textarea></div>`;
    const s = (k, l, opts) => `<div><label class="f">${l}</label><select id="uc_${k}" ${ro ? 'disabled' : ''}>${opts.map(o => `<option ${u[k] === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
    const multi = (k, opts, vals, h) => `<div class="full"><label class="f">${h}</label><select id="uc_${k}" multiple size="${Math.min(6, Math.max(3, opts.length))}" style="height:auto" ${ro ? 'disabled' : ''}>${opts.map(o => `<option value="${esc(o.v)}" ${(vals || []).includes(o.v) ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select></div>`;
    const reqOpts = S.ws.requirements.map(r => ({ v: r.id, l: r.id + ' · ' + r.title })); const qOpts = S.ws.questions.map(q => ({ v: q.id, l: q.text.slice(0, 80) }));
    const promptsHtml = !id && (u.modules || []).concat(['workorder']).includes('workorder') ? `<div class="notice small" style="margin-bottom:12px"><span>Work order scenarios to ask about: ${WO_PROMPTS.map(esc).join(' · ')}. These are prompts, not claims that each exists.</span></div>` : '';
    drawer(id ? ucId(u) + ' · ' + u.title : 'New use case', `${promptsHtml}<div class="fgrid"><div class="full"><label class="f">Title <span class="req">*</span></label><input type="text" id="uc_title" value="${esc(u.title || '')}" ${ro ? 'disabled' : ''}></div>
      ${multi('modules', mods.map(m => ({ v: m.name, l: m.label })), u.modules, 'Modules (Ctrl/Cmd-click for several; this is how a use case is linked across modules)')}
      ${t('scenario', 'Business scenario', 3)}${t('current', 'Current customer process', 2)}${t('need', 'Business problem or need', 2)}
      <div><label class="f">Trigger</label><input type="text" id="uc_trigger" value="${esc(u.trigger || '')}" ${ro ? 'disabled' : ''}></div><div><label class="f">Actor</label><input type="text" id="uc_actor" value="${esc(u.actor || '')}" ${ro ? 'disabled' : ''}></div>
      ${t('pre', 'Preconditions', 2)}${t('steps', 'Process steps (one per line)', 4)}${t('result', 'Expected result', 2)}${t('alternates', 'Alternative and exception paths', 2)}${t('rules', 'Business rules', 2)}${t('fieldsReq', 'Required fields', 2)}${t('flows', 'Related workflow and state-flow references (module › transition)', 2)}${t('customActions', 'Custom actions or buttons', 2)}
      ${multi('deps', mods.map(m => ({ v: m.name, l: m.label })), u.deps, 'Cross-module dependencies')}
      ${t('expected', "Customer's expected solution", 2)}${t('proposed', 'Proposed Facilio solution', 2)}${t('approach', 'Implementation approach', 2)}${t('acceptance', 'Acceptance criteria', 3, 'Given … when … then …')}
      ${s('solution', 'Solution classification', SOL)}${s('priority', 'Priority', PRI)}${s('scope', 'Scope status', SCOPEST)}${s('impl', 'Implementation status', IMPL)}${s('confirmation', 'Confirmation', CONF)}<div><label class="f">Confirmed by</label><input type="text" id="uc_confBy" value="${esc(u.confBy || '')}" ${ro ? 'disabled' : ''}></div>
      ${multi('reqIds', reqOpts, u.reqIds, 'Related requirements')}${multi('questionIds', qOpts, u.questionIds, 'Related questions and answers')}${t('evidence', 'Source evidence (transcript, session, document)', 2)}</div>`,
      ro ? '<button class="btn" data-act="closeDrawer">Close</button>' : `${id ? `<button class="btn danger" data-act="ucDel" data-id="${esc(id)}">Delete</button>` : ''}<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="ucSave" data-id="${esc(id || '')}">Save</button>`, { wide: true });
  };
  ACT.ucSave = a => V.busy(a, async () => {
    const g = k => (document.getElementById('uc_' + k) || { value: '' }).value.trim(); const ms = k => Array.from(document.getElementById('uc_' + k).selectedOptions).map(o => o.value);
    if (!g('title')) { toast('Enter a title'); return; } const id = a.getAttribute('data-id'); const old = id ? I().get('usecase', id) : null;
    const d = Object.assign({}, old || {}, { title: g('title'), modules: ms('modules'), deps: ms('deps'), reqIds: ms('reqIds'), questionIds: ms('questionIds'), solution: g('solution'), priority: g('priority'), scope: g('scope'), impl: g('impl'), confirmation: g('confirmation'), confBy: g('confBy') });
    ['scenario', 'current', 'need', 'trigger', 'actor', 'pre', 'result', 'alternates', 'rules', 'fieldsReq', 'flows', 'customActions', 'expected', 'proposed', 'approach', 'acceptance', 'evidence'].forEach(k => { d[k] = g(k); }); d.steps = lines(g('steps'));
    if (d.confirmation === 'Customer confirmed' && !d.confBy) { toast('Enter who confirmed this use case before marking it Customer confirmed'); return; }
    if (d.confirmation === 'Customer confirmed' && !d.confAt) d.confAt = V.today(); if (d.confirmation !== 'Customer confirmed') { d.confAt = ''; }
    if (d.impl === 'Verified against configuration' && !(d.flows || d.fieldsReq)) { toast('Name the workflow or fields you verified against before choosing "Verified against configuration"'); return; }
    if (!old) { const mx = Math.max(0, ...ucs().map(x => x.no || 0)); d.no = mx + 1; }
    delete d.hist; await I().put('usecase', id || I().uid('uc'), d); closeDrawer(); toast('Use case saved');
  });
  ACT.ucDel = a => V.busy(a, async () => { if (!(await confirmDialog('Delete use case', 'Remove this use case? Requirements linked to it are not deleted.', 'Delete', true))) return; await I().del('usecase', a.getAttribute('data-id')); closeDrawer(); });

  // ---------- discrepancies ----------
  const DST = ['Open', 'Needs decision', 'Accepted as is', 'Resolved'];
  function discTab() {
    const l = I().list('discrepancy').sort((a, b) => (a.status === 'Resolved') - (b.status === 'Resolved') || (a._created || '').localeCompare(b._created || ''));
    return `<div class="notice" style="margin-bottom:12px"><span>Conflicting sources are never resolved silently: each row needs a recorded decision. "Check now" looks for requirements and use cases that point at fields, flows or modules the configuration does not have.</span></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Area</th><th>What disagrees</th><th>Source</th><th>Impact</th><th>Verification</th><th>Recommendation</th><th>Status</th></tr></thead><tbody>${l.map(d => `<tr class="click" data-act="dcEdit" data-id="${esc(d.id)}"><td class="small">${esc(d.area || '')}${d.mod ? '<div class="xs muted">' + esc(modLabel(d.mod)) + '</div>' : ''}</td><td class="small">${esc(d.text || '')}${d.auto ? ' ' + tag('blue', 'Found by check') : ''}</td><td class="xs">${esc(d.source || '')}</td><td>${tag(d.impact === 'High' ? 'danger' : d.impact === 'Medium' ? 'tbc' : 'low', d.impact || 'Medium')}</td><td class="small">${esc(d.verification || 'Unverified')}</td><td class="small">${esc(d.recommendation || '')}</td><td>${tag(d.status === 'Resolved' ? 'green' : 'tbc', d.status || 'Open')}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">No discrepancies recorded.</td></tr>'}</tbody></table></div>`;
  }
  ACT.dcEdit = a => {
    const id = a.getAttribute('data-id'); const d = id ? I().get('discrepancy', id) : { area: 'Configuration vs requirement', impact: 'Medium', status: 'Open', verification: 'Unverified' }; const ro = !canEdit();
    const inp = (k, l, ph) => `<div class="full"><label class="f">${l}</label><input type="text" id="dc_${k}" value="${esc(d[k] || '')}" placeholder="${esc(ph || '')}" ${ro ? 'disabled' : ''}></div>`;
    const s = (k, l, o) => `<div><label class="f">${l}</label><select id="dc_${k}" ${ro ? 'disabled' : ''}>${o.map(x => `<option ${d[k] === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div>`;
    drawer(id ? 'Discrepancy' : 'New discrepancy', `<div class="fgrid">${s('area', 'Area', ['Configuration vs requirement', 'Workshop vs requirement', 'Requirement vs use case', 'Use case vs proposed solution', 'Configuration vs configuration', 'Other'])}<div><label class="f">Module</label><select id="dc_mod" ${ro ? 'disabled' : ''}><option value=""></option>${F.allModules().map(m => `<option value="${esc(m.name)}" ${d.mod === m.name ? 'selected' : ''}>${esc(m.label)}</option>`).join('')}</select></div>
      <div class="full"><label class="f">What disagrees</label><textarea id="dc_text" rows="3" ${ro ? 'disabled' : ''}>${esc(d.text || '')}</textarea></div>${inp('source', 'Sources in conflict', 'e.g. REQ-WO-003 vs the Work Order state flow')}${s('impact', 'Impact', PRI)}${s('verification', 'Verification', ['Unverified', 'Verified in configuration', 'Verified with customer'])}${inp('recommendation', 'Recommendation')}${inp('decision', 'Decision required, and who decides')}${s('status', 'Status', DST)}<div><label class="f">Decided by</label><input type="text" id="dc_by" value="${esc(d.decidedBy || '')}" ${ro ? 'disabled' : ''}></div></div>`,
      ro ? '<button class="btn" data-act="closeDrawer">Close</button>' : `${id ? `<button class="btn danger" data-act="dcDel" data-id="${esc(id)}">Delete</button>` : ''}<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="dcSave" data-id="${esc(id || '')}">Save</button>`);
  };
  ACT.dcSave = a => V.busy(a, async () => {
    const g = k => document.getElementById('dc_' + k).value.trim(); if (!g('text')) { toast('Describe what disagrees'); return; } const id = a.getAttribute('data-id'); const old = id ? I().get('discrepancy', id) : {}; const d = Object.assign({}, old);
    ['area', 'mod', 'text', 'source', 'impact', 'verification', 'recommendation', 'decision', 'status'].forEach(k => { d[k] = g(k); }); d.decidedBy = g('by');
    if (['Accepted as is', 'Resolved'].includes(d.status) && !d.decidedBy) { toast('Record who made the decision before closing a discrepancy'); return; }
    if (['Accepted as is', 'Resolved'].includes(d.status)) d.decidedAt = d.decidedAt || V.today(); delete d.hist; await I().put('discrepancy', id || I().uid('dc'), d); closeDrawer();
  });
  ACT.dcDel = a => V.busy(a, async () => { if (!(await confirmDialog('Delete discrepancy', 'Remove this record?', 'Delete', true))) return; await I().del('discrepancy', a.getAttribute('data-id')); closeDrawer(); });
  // Deterministic checks. Ids are derived from the finding, so running the check again never creates a second copy.
  V.discFindings = () => findings();
  function findings() {
    const out = []; const add = (key, area, mod, text, source, impact) => out.push({ key, area, mod, text, source, impact });
    S.ws.requirements.filter(r => r.status !== 'Rejected').forEach(r => {
      (r.fields || []).forEach(f => { const [m, n] = f.split('.'); if (!F.effFields(m).some(x => x.name === n)) add('rf:' + r.id + ':' + f, 'Configuration vs requirement', m, `${r.id} uses the field "${n}" but ${modLabel(m)} has no such field in the configuration or in the proposed changes.`, r.id + ' vs ' + modLabel(m) + ' fields', 'Medium'); });
      (r.modules || []).forEach(m => { if (!F.moduleView(m)) add('rm:' + r.id + ':' + m, 'Configuration vs requirement', m, `${r.id} refers to a module "${m}" that is not in the project.`, r.id, 'High'); });
      if (r.classification === 'existing' && (r.fields || []).some(f => { const [m, n] = f.split('.'); const x = F.effFields(m).find(y => y.name === n); return x && x.status === 'proposed'; })) add('rc:' + r.id, 'Requirement vs use case', (r.modules || [])[0] || '', `${r.id} is classed as existing functionality but depends on a field that is only proposed.`, r.id, 'Medium');
    });
    ucs().forEach(u => {
      (u.reqIds || []).forEach(id => { if (!S.ws.requirements.some(r => r.id === id)) add('ur:' + u.id + ':' + id, 'Requirement vs use case', (u.modules || [])[0] || '', `${ucId(u)} links to ${id}, which no longer exists.`, ucId(u), 'Medium'); });
      if (u.confirmation === 'Customer confirmed' && ['Pending decision', 'Further investigation required', 'Product capability confirmation required'].includes(u.solution)) add('us:' + u.id, 'Use case vs proposed solution', (u.modules || [])[0] || '', `${ucId(u)} is marked customer confirmed, but its solution is still "${u.solution}".`, ucId(u), 'High');
      if (u.scope === 'Out of scope' && (u.reqIds || []).some(id => (S.ws.requirements.find(r => r.id === id) || {}).status === 'Confirmed')) add('uo:' + u.id, 'Requirement vs use case', (u.modules || [])[0] || '', `${ucId(u)} is out of scope but is linked to a Confirmed requirement.`, ucId(u), 'High');
    });
    return out;
  }
  ACT.dcCheck = a => V.busy(a, async () => {
    const have = new Set(I().list('discrepancy').map(d => d.key).filter(Boolean)); let n = 0;
    for (const f of findings()) { if (have.has(f.key)) continue; await I().put('discrepancy', 'auto_' + F.slug(f.key).slice(0, 60), Object.assign({ auto: true, status: 'Open', verification: 'Verified in configuration', recommendation: 'Confirm which source is right, then correct the other.' }, f), { silent: true }); n++; }
    V.render(); toast(n ? n + ' discrepanc' + (n === 1 ? 'y' : 'ies') + ' found' : 'No new discrepancies found');
  });
  V.openDiscrepancies = () => I().list('discrepancy').filter(d => d.status !== 'Resolved' && d.status !== 'Accepted as is');

  // ---------- traceability (BRD section map) ----------
  const BRD_SEC = { module: 'Module sections (Functional requirements)', process: 'End-to-end business processes', general: 'General requirements' };
  function mapTab() {
    const rq = S.ws.requirements; const uc = ucs();
    const rows = rq.map(r => ({ r, ucs: uc.filter(u => (u.reqIds || []).includes(r.id)), qs: S.ws.questions.filter(q => q.reqId === r.id) }));
    const orphans = uc.filter(u => !(u.reqIds || []).length);
    return `<div class="notice" style="margin-bottom:12px"><span>Each requirement, the use cases and questions behind it, and the BRD section it lands in. Only Confirmed requirements are written into the BRD as requirements.</span></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Requirement</th><th>Status</th><th>Modules</th><th>BRD section</th><th>Use cases</th><th>Questions</th><th>In the BRD as</th></tr></thead><tbody>${rows.map(({ r, ucs: us, qs }) => `<tr><td><b>${esc(r.id)}</b> <span class="small">${esc(r.title)}</span></td><td>${tag(r.status === 'Confirmed' ? 'green' : r.status === 'Rejected' ? 'low' : 'tbc', r.status || 'Draft')}</td><td class="small">${(r.modules || []).map(modLabel).map(esc).join(', ')}</td><td class="small">${esc(BRD_SEC[r.brdSection || 'module'])}</td><td class="small">${us.map(ucId).join(', ') || '—'}</td><td class="small">${qs.length || '—'}</td><td class="small">${r.status === 'Confirmed' ? 'Requirement' : r.status === 'Rejected' ? 'Not included' : 'Open item (awaiting confirmation)'}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">No requirements yet.</td></tr>'}</tbody></table></div>
      ${orphans.length ? `<div class="notice warn" style="margin-top:12px"><span>${orphans.length} use case${orphans.length === 1 ? ' is' : 's are'} not linked to any requirement: ${orphans.map(ucId).join(', ')}.</span></div>` : ''}`;
  }

  // ---------- question → requirement ----------
  const QCLASS = ['General clarification', 'Capability question', 'Configuration question', 'Business-process question', 'Scope question', 'Customisation or integration question', 'Limitation', 'Unresolved question', 'Potential requirement'];
  const qById = id => S.ws.questions.find(q => q.id === id);
  V.questionDrawer = id => {
    const q = qById(id); if (!q) return; const ro = S.readonly; const ses = (F.doc('planner').sessions || []);
    const inp = (k, l, t) => `<div><label class="f">${l}</label><input type="${t || 'text'}" id="qd_${k}" value="${esc(q[k] || '')}" ${ro ? 'disabled' : ''}></div>`;
    drawer('Question', `<div class="notice small" style="margin-bottom:10px"><span>${esc(q.text)}</span></div><div class="fgrid"><div><label class="f">Type</label><select id="qd_cls" ${ro ? 'disabled' : ''}><option value=""></option>${QCLASS.map(c => `<option ${q.cls === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>${inp('stakeholder', 'Asked by (stakeholder)')}
      <div class="full"><label class="f">Answer provided</label><textarea id="qd_answer" rows="3" ${ro ? 'disabled' : ''}>${esc(q.answer || '')}</textarea></div>${inp('answeredBy', 'Answered by')}<div><label class="f">Verification</label><select id="qd_ver" ${ro ? 'disabled' : ''}>${['Unverified', 'Verified in configuration', 'Verified with Facilio product team', 'Confirmed by customer'].map(c => `<option ${(q.ver || 'Unverified') === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      ${inp('followOwner', 'Follow-up owner')}${inp('followDue', 'Follow-up due', 'date')}<div class="full"><label class="f">Source (transcript, meeting or guide)</label><input type="text" id="qd_source" value="${esc(q.source || '')}" ${ro ? 'disabled' : ''}></div></div>
      ${q.reqId ? `<div class="notice small" style="margin-top:10px"><span>Linked requirement: ${esc(q.reqId)}</span></div>` : ''}<div class="xs muted" style="margin-top:8px">${(q.log || []).map(x => esc(x.at.slice(0, 10) + ' ' + x.by + ': ' + x.what)).join('<br>')}</div>`,
      ro ? '<button class="btn" data-act="closeDrawer">Close</button>' : `${q.reqId ? '' : `<button class="btn" data-act="qMakeReq" data-id="${esc(q.id)}">Create requirement from question</button>`}<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="qSave" data-id="${esc(q.id)}">Save</button>`, { wide: true });
  };
  ACT.qOpen = a => V.questionDrawer(a.getAttribute('data-id'));
  function qRead(q) { const g = k => document.getElementById('qd_' + k).value.trim(); const was = q.ver || 'Unverified'; Object.assign(q, { cls: g('cls'), stakeholder: g('stakeholder'), answer: g('answer'), answeredBy: g('answeredBy'), ver: g('ver'), followOwner: g('followOwner'), followDue: g('followDue'), source: g('source') }); if (q.answer && q.status === 'open') q.status = 'answered'; (q.log = q.log || []).push({ at: new Date().toISOString(), by: S.user.name, what: was !== q.ver ? 'Verification: ' + was + ' → ' + q.ver : 'Edited' }); }
  ACT.qSave = a => { const q = qById(a.getAttribute('data-id')); if (!q) return; qRead(q); F.changed('Question updated', q.text.slice(0, 60)); closeDrawer(); };
  ACT.qMakeReq = a => {
    const q = qById(a.getAttribute('data-id')); if (!q) return; qRead(q); if (!q.answer) { toast('Record the answer first, or add the customer\'s expected behaviour in the requirement'); }
    const mod = F.allModules().find(m => m.label.toLowerCase() === String(q.area || '').toLowerCase() || m.name === q.area); const verified = ['Verified in configuration', 'Verified with Facilio product team', 'Confirmed by customer'].includes(q.ver);
    closeDrawer(); V.newReqFor({ title: q.text.replace(/\?+$/, '').slice(0, 120), objective: q.answer || '', problem: q.text, modules: mod ? [mod.name] : [], status: 'Draft', classification: 'change', openQuestions: verified ? '' : 'The answer given has not been verified. Do not present it as an approved solution.', source: { question: q.id, session: q.sessionId || '', speaker: q.stakeholder || '' }, fromQuestion: q.id });
  };
  F.afterReqSaved = null;

  // ---------- Session → BRD (a tab on the Transcripts page) ----------
  V.trExtra = () => [['sbrd', 'Session → BRD']];
  V.trExtraBody = { sbrd: () => sessionBrd() };
  const SEC_NAME = { module: 'Module sections', process: 'End-to-end processes', general: 'General requirements' };
  function guideAnswers() { return V.learnAnswers ? V.learnAnswers() : { loaded: true, list: [] }; }
  function sessionBrd() {
    const d = F.doc('transcripts'); const cands = d.candidates || []; const sessions = (F.doc('planner').sessions || []); const ga = guideAnswers(); const rq = S.ws.requirements;
    const pick = S.ui.sbrdSession || ''; const list = pick ? sessions.filter(s => s.id === pick) : sessions;
    const sessName = s => (s.title || ('Session ' + (s.no || ''))) + (s.date ? ' · ' + V.fmtDate(s.date) : '');
    const mods = new Map(); const bucket = (sid, m) => { const k = sid + '|' + m; if (!mods.has(k)) mods.set(k, { sid, m, cands: [], reqs: [], ga: [] }); return mods.get(k); };
    cands.forEach(c => (c.modules && c.modules.length ? c.modules : ['']).forEach(m => bucket(c.sessionId || '', m).cands.push(c)));
    rq.forEach(r => (r.modules && r.modules.length ? r.modules : ['']).forEach(m => bucket(r.sessionId || (r.source && r.source.session) || '', m).reqs.push(r)));
    (ga.list || []).forEach(x => { const mvs = F.allModules().filter(m => { const lm = root.FWBLearn && root.FWBLearn.forModule(m.name); return lm && lm.key === x.modKey; }); const mv = mvs.find(m => m.inScope) || mvs[0]; if (mv) { const ses = sessions.find(s => (s.modules || []).includes(mv.name)); bucket(ses ? ses.id : '', mv.name).ga.push(x); } });
    const rows = [...mods.values()].filter(b => !pick || b.sid === pick || (!b.sid && false)).sort((a, b) => a.sid.localeCompare(b.sid) || modLabel(a.m).localeCompare(modLabel(b.m)));
    const selSess = `<select data-change="sbrdSession" style="width:260px"><option value="">All sessions</option>${sessions.map(s => `<option value="${esc(s.id)}" ${pick === s.id ? 'selected' : ''}>${esc(sessName(s))}</option>`).join('')}</select>`;
    return `<div class="row" style="margin-bottom:12px">${selSess}<span class="small muted">Per session and module: what was said, where it goes in the BRD, and what is still blocking it.</span></div>
      ${rows.map(b => { const ses = sessions.find(s => s.id === b.sid); const pend = b.cands.filter(c => c.status === 'pending' || c.status === 'clarify'); const draft = b.reqs.filter(r => r.status === 'Draft' || !r.status); const conf = b.reqs.filter(r => r.status === 'Confirmed'); const noConf = conf.filter(r => !r.confirmedBy);
        const blockers = []; if (pend.length) blockers.push(pend.length + ' statement(s) not reviewed yet'); if (draft.length) blockers.push(draft.length + ' requirement(s) still Draft, so they appear in the BRD only as open items'); if (b.ga.length && !conf.length) blockers.push('Customer guide answers exist but no Confirmed requirement uses them'); (b.reqs.filter(r => (r.openQuestions || '').trim())).forEach(r => blockers.push(r.id + ' has open questions'));
        return `<div class="card" style="margin-bottom:14px"><div class="card-h"><h3>${esc(b.m ? modLabel(b.m) : 'No module')}</h3><span class="small muted">${ses ? esc(sessName(ses)) : 'No session'}</span><span class="spacer"></span>${canEdit() && draft.length ? `<button class="btn sm" data-act="sbrdConfirm" data-s="${esc(b.sid)}" data-m="${esc(b.m)}">Confirm ${draft.length} draft…</button>` : ''}${canEdit() && pend.length ? `<button class="btn sm" data-act="sbrdAccept" data-s="${esc(b.sid)}" data-m="${esc(b.m)}">Accept ${pend.length} as Draft</button>` : ''}</div>
          <div class="card-b small"><div class="grid g3"><div><b>What was said</b><div class="muted xs">${b.cands.length} statement(s): ${b.cands.filter(c => c.status === 'accepted').length} accepted, ${pend.length} waiting, ${b.cands.filter(c => c.status === 'rejected').length} rejected</div>${b.cands.slice(0, 3).map(c => `<div class="xs">“${esc((c.text || '').slice(0, 110))}”</div>`).join('')}</div>
          <div><b>Feeds the BRD</b>${b.reqs.length ? b.reqs.map(r => `<div class="xs">${tag(r.status === 'Confirmed' ? 'green' : 'tbc', r.status || 'Draft')} ${esc(r.id)} → ${esc(SEC_NAME[r.brdSection || 'module'])}</div>`).join('') : '<div class="xs muted">No requirement yet</div>'}</div>
          <div><b>Customer inputs (guide)</b>${b.ga.length ? `<div class="xs muted">${b.ga.length} answer(s) from stakeholders. Inputs only: they are not confirmed requirements.</div>` + b.ga.slice(0, 3).map(x => `<div class="xs">${esc(x.q || '')}: ${esc(x.answer || '')}</div>`).join('') : '<div class="xs muted">None</div>'}</div></div>
          <div style="margin-top:10px"><b>${blockers.length ? 'Blocking' : 'Nothing blocking'}</b>${blockers.map(x => `<div class="xs">• ${esc(x)}</div>`).join('')}${noConf.length ? `<div class="xs">• ${noConf.length} Confirmed requirement(s) have no "confirmed by" recorded</div>` : ''}</div></div></div>`; }).join('') || '<div class="empty">Nothing to show yet. Upload a transcript, add requirements, or have customers answer the guide.</div>'}`;
  }
  ACT.sbrdSession = el => { S.ui.sbrdSession = el.value; V.render(); };
  ACT.sbrdAccept = a => V.busy(a, async () => {
    const sid = a.getAttribute('data-s'), m = a.getAttribute('data-m'); const d = F.doc('transcripts'); const todo = (d.candidates || []).filter(c => (c.sessionId || '') === sid && ((c.modules || [])[0] || '') === m && c.status === 'pending');
    if (!todo.length) return; if (!(await confirmDialog('Accept as Draft', `Create ${todo.length} Draft requirement(s) from these statements? Drafts are not part of the BRD until each is confirmed with the customer.`, 'Accept all'))) return;
    todo.forEach(c => { const nid = F.nextReqId(c.modules && c.modules[0] ? F.modulePrefix(c.modules[0]) : 'GEN'); S.ws.requirements.push({ id: nid, created: new Date().toISOString(), title: (c.title || c.text || '').slice(0, 120), objective: c.text || '', modules: c.modules || [], classification: 'change', status: 'Draft', fields: [], transitions: [], sessionId: c.sessionId || '', brdSection: 'module', source: { agreedInSession: c.kind === 'confirmed', candidate: c.id, transcript: c.transcriptId, session: c.sessionId, speaker: c.speaker, line: c.line }, history: [{ at: new Date().toISOString(), by: S.user.name, change: 'Created (bulk accept)' }] }); c.status = 'accepted'; c.reqId = nid; });
    F.markDirty('transcripts'); F.changed('Statements accepted as Draft', todo.length + ' for ' + (m ? modLabel(m) : 'no module'));
  });
  ACT.sbrdConfirm = a => {
    const sid = a.getAttribute('data-s'), m = a.getAttribute('data-m'); const todo = S.ws.requirements.filter(r => (r.status === 'Draft' || !r.status) && (r.sessionId || (r.source && r.source.session) || '') === sid && ((r.modules || [])[0] || '') === m);
    drawer('Confirm requirements', `<div class="notice" style="margin-bottom:10px"><span>Only confirm requirements the customer has agreed. Record who confirmed them; this is shown in the BRD.</span></div><label class="f">Confirmed by (customer stakeholder)</label><input type="text" id="sc_by"><label class="f" style="margin-top:8px">Date</label><input type="date" id="sc_at" value="${V.today()}">${todo.map(r => `<label class="chk-row"><input type="checkbox" class="sc_r" value="${esc(r.id)}" checked> <b>${esc(r.id)}</b> ${esc(r.title)}</label>`).join('')}`, `<button class="btn" data-act="closeDrawer">Cancel</button><span class="spacer"></span><button class="btn primary" data-act="sbrdConfirmGo">Confirm selected</button>`);
  };
  ACT.sbrdConfirmGo = () => { const by = document.getElementById('sc_by').value.trim(); if (!by) { toast('Enter who confirmed these requirements'); return; } const at = document.getElementById('sc_at').value || V.today(); const ids = Array.from(document.querySelectorAll('.sc_r:checked')).map(x => x.value); if (!ids.length) { toast('Select at least one'); return; }
    ids.forEach(id => { const r = S.ws.requirements.find(x => x.id === id); if (!r) return; r.status = 'Confirmed'; r.confirmedBy = by; r.confirmedAt = at; (r.history = r.history || []).push({ at: new Date().toISOString(), by: S.user.name, change: 'Status Draft → Confirmed (bulk, confirmed by ' + by + ')' }); }); closeDrawer(); F.changed('Requirements confirmed', ids.length + ' by ' + by); };
})(typeof window !== 'undefined' ? window : globalThis);

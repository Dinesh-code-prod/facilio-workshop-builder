/* Traceability, quality checks and lessons learned (roadmap phase 7). Everything is derived from records that already exist:
   requirements -> use cases (reqIds) -> modules -> build status -> UAT sessions. Nothing is duplicated; only lessons learned are new records (kind `lesson`).
   Checks are rule-based and say what is missing, not whether the solution is right. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items;
  const { tag, drawer, closeDrawer, toast, ico, confirmDialog } = V;
  const canEdit = () => !V.isCustomer() && !S.readonly;
  const KINDS = ['usecase', 'build', 'uat', 'cmodx', 'lesson'];
  const BSTAT = ['Not started', 'Configuring', 'Internal testing', 'Completed'];
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const gv = id => ((document.getElementById(id) || {}).value || '').trim();

  function model() {
    const reqs = (S.ws.requirements || []).filter(r => r.status !== 'Rejected');
    const ucs = I().list('usecase'); const uats = I().list('uat');
    const build = m => (I().get('build', F.slug(m)) || {}).status || 'Not started';
    const uatFor = m => uats.filter(u => norm(u.mod) === norm(m));
    const rows = reqs.map(r => {
      const u = ucs.filter(x => (x.reqIds || []).includes(r.id));
      const mods = (r.modules && r.modules.length ? r.modules : [...new Set(u.flatMap(x => x.modules || []))]);
      const bs = mods.map(build); const rank = s => BSTAT.indexOf(s);
      const worst = bs.length ? bs.reduce((a, b) => (rank(a) <= rank(b) ? a : b)) : '';
      const ut = [...new Set(mods.flatMap(m => uatFor(m).map(x => x.id)))];
      return { req: r, ucs: u, confirmed: u.filter(x => x.confirmation === 'Customer confirmed').length, mods, build: worst, uat: ut.length };
    });
    return { reqs, ucs, uats, rows, build, uatFor };
  }
  function checks(m) {
    const f = []; const add = (sev, area, item, finding) => f.push({ sev, area, item, finding });
    m.rows.forEach(r => {
      if (!r.ucs.length) add('medium', 'Requirement to use case', r.req.id + ' ' + (r.req.title || ''), 'No use case is linked to this requirement.');
      else if (!r.confirmed) add('low', 'Requirement to use case', r.req.id + ' ' + (r.req.title || ''), 'Linked use cases are not yet Customer confirmed.');
      if (!r.mods.length) add('low', 'Requirement to module', r.req.id + ' ' + (r.req.title || ''), 'No module is recorded for this requirement.');
    });
    m.ucs.filter(u => u.scope !== 'Out of scope' && !(u.reqIds || []).length).forEach(u => add('low', 'Use case to requirement', 'UC-' + (u.no || '?') + ' ' + (u.title || ''), 'The use case is not linked to any requirement.'));
    m.ucs.filter(u => u.impl === 'Verified against configuration' && u.confirmation !== 'Customer confirmed').forEach(u => add('medium', 'Use case', 'UC-' + (u.no || '?') + ' ' + (u.title || ''), 'Marked verified against configuration but not confirmed by the customer.'));
    F.allModules().filter(x => x.inScope).forEach(x => { const b = m.build(x.name); const ut = m.uatFor(x.name);
      if (b === 'Completed' && !ut.length) add('medium', 'Build to UAT', x.label || x.name, 'Build is Completed but no UAT session is recorded for this module.');
      if (ut.length && !ut.some(u => u.published) && b === 'Completed') add('low', 'Build to UAT', x.label || x.name, 'UAT sessions exist but none is published to the customer.'); });
    I().list('cmodx').forEach(c => { const nm = c.name || c.label || c.id; const used = m.ucs.some(u => (u.modules || []).some(x => norm(x) === norm(nm))) || m.reqs.some(r => (r.modules || []).some(x => norm(x) === norm(nm))); if (!used) add('low', 'Custom module', nm, 'No requirement or use case refers to this custom module.'); });
    return f;
  }
  const csvq = v => '"' + String(v == null ? '' : root.FWB.csvText(v)).replace(/"/g, '""') + '"';
  const LESSON_AREAS = ['Discovery', 'Workshops', 'Requirements', 'Configuration', 'Data migration', 'Integrations', 'UAT', 'Training', 'Go-live', 'Hypercare', 'Handover', 'Project management', 'Other'];
  const IMPACT = ['Low', 'Medium', 'High'];
  const KB = { items: [], loaded: '', q: '' }; const API = root.FWBApi;
  const TABS = [['trace', 'Traceability matrix'], ['checks', 'Quality checks'], ['lessons', 'Lessons learned'], ['kb', 'Knowledge library']];

  V.trace = {
    html() {
      I().load(KINDS); if (!I().ready(['usecase', 'build', 'uat', 'lesson'])) return '<div class="page-body"><div class="muted" style="padding:20px">Loading…</div></div>';
      const tab = S.ui.trTab || 'trace'; const m = model(); const ck = checks(m); const can = canEdit();
      const bar = `<div class="tabs" role="tablist">${TABS.map(([k, l]) => `<button class="tab${tab === k ? ' active' : ''}" role="tab" data-act="trTab" data-v="${k}">${esc(l)}${k === 'checks' && ck.length ? ` <span class="xs">(${ck.length})</span>` : ''}</button>`).join('')}</div>`;
      let body = '';
      if (tab === 'trace') {
        const full = m.rows.filter(r => r.ucs.length && r.mods.length && r.uat).length;
        body = `<div class="card"><div class="card-h"><h3>Requirements to use cases, build and UAT (${m.rows.length})</h3><span class="row" style="gap:8px"><span class="small muted">${full} of ${m.rows.length} traced through to UAT</span><button class="btn sm" data-act="trCsv">${ico('dl') || ''}Export CSV</button></span></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Requirement</th><th>Status</th><th>Use cases</th><th>Customer confirmed</th><th>Modules</th><th>Build</th><th>UAT sessions</th></tr></thead><tbody>${m.rows.map(r => `<tr><td><b>${esc(r.req.id)}</b><div class="xs muted">${esc(r.req.title || '')}</div></td><td>${esc(r.req.status || '')}</td><td>${r.ucs.length ? r.ucs.map(u => 'UC-' + esc(u.no || '?')).join(', ') : '<span class="muted">none</span>'}</td><td>${r.ucs.length ? r.confirmed + ' of ' + r.ucs.length : ''}</td><td class="small">${esc(r.mods.join(', ')) || '<span class="muted">none</span>'}</td><td>${r.build ? tag(r.build === 'Completed' ? 'green' : r.build === 'Not started' ? 'low' : 'blue', r.build) : ''}</td><td>${r.uat || '<span class="muted">none</span>'}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">No requirements yet.</td></tr>'}</tbody></table></div></div>
        <p class="small muted" style="margin-top:8px">Built from existing records: a requirement is linked to use cases through the use case's "Related requirements"; build status comes from Build &amp; Test; UAT sessions are matched by module. FTR rows are kept inside the FTR workbook and are not part of this matrix yet.</p>`;
      }
      if (tab === 'checks') body = `<div class="card"><div class="card-h"><h3>Completeness checks (${ck.length})</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Level</th><th>Area</th><th>Item</th><th>Finding</th></tr></thead><tbody>${ck.map(x => `<tr><td>${tag(x.sev === 'medium' ? 'tbc' : '', x.sev === 'medium' ? 'Medium' : 'Low')}</td><td class="small">${esc(x.area)}</td><td><b>${esc(x.item)}</b></td><td class="small">${esc(x.finding)}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">No gaps found in the recorded links.</td></tr>'}</tbody></table></div></div><p class="small muted" style="margin-top:8px">These rules check that records are linked and confirmed. They do not judge whether a requirement or a configuration is correct.</p>`;
      if (tab === 'lessons') { const ls = I().list('lesson').sort((a, b) => String(b._created || '').localeCompare(String(a._created || '')));
        body = `<div class="card"><div class="card-h"><h3>Lessons learned (${ls.length})</h3><span class="row" style="gap:6px">${can ? `<button class="btn sm" data-act="trLessonEdit">${ico('plus')}Add lesson</button>` : ''}<button class="btn sm" data-act="trLessonCsv">Export CSV</button></span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Lesson</th><th>Area</th><th>Impact</th><th>What to do next time</th><th>Reusable</th><th></th></tr></thead><tbody>${ls.map(l => `<tr><td><b>${esc(l.title)}</b><div class="xs muted">${esc(l.what || '')}</div></td><td class="small">${esc(l.area || '')}</td><td>${esc(l.impact || '')}</td><td class="small">${esc(l.reco || '')}</td><td>${l.reusable ? 'Yes' : ''}</td><td>${can ? `<button class="btn sm ghost" data-act="trLessonEdit" data-id="${esc(l.id)}">Edit</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">No lessons recorded yet. Add them as the project goes, not only at closure.</td></tr>'}</tbody></table></div></div>`; }
      if (tab === 'kb') { if (!KB.loaded) { KB.loaded = 'loading'; API.get('/api/knowledge').then(r => { KB.items = r.items || []; KB.loaded = 'done'; V.render(); }).catch(e => { KB.loaded = 'error'; KB.err = e.message || String(e); V.render(); }); }
        const q = (KB.q || '').toLowerCase(); const items = (KB.items || []).filter(x => !q || (x.title + ' ' + x.area + ' ' + x.what + ' ' + x.reco).toLowerCase().includes(q));
        body = `<div class="card"><div class="card-h"><h3>Reusable lessons from your projects (${KB.loaded === 'done' ? items.length : '…'})</h3><input type="search" placeholder="Search" value="${esc(KB.q || '')}" data-change="trKbSearch" style="max-width:240px"></div>${KB.loaded === 'error' ? `<div class="notice err" style="margin:12px">${esc(KB.err)}</div>` : ''}<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Lesson</th><th>Area</th><th>Impact</th><th>What to do next time</th><th>From project</th></tr></thead><tbody>${items.map(l => `<tr><td><b>${esc(l.title)}</b><div class="xs muted">${esc(l.what)}</div></td><td class="small">${esc(l.area)}</td><td>${esc(l.impact)}</td><td class="small">${esc(l.reco)}</td><td class="small">${esc(l.project)}</td></tr>`).join('') || `<tr><td colspan="5" class="muted">${KB.loaded === 'done' ? 'No reusable lessons yet. Tick "Reusable on other projects" on a lesson to add it here.' : 'Loading…'}</td></tr>`}</tbody></table></div></div><p class="small muted" style="margin-top:8px">Only lessons marked reusable appear, and only from projects you can open. Published templates are in Templates.</p>`; }
      const ai = can && V.aiButton ? `<div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:12px"><span class="small muted" style="align-self:center">Ask the AI assistant:</span>${V.aiButton('gaps', 'Gap check')}${V.aiButton('uat', 'UAT plan')}${V.aiButton('handover', 'Support handover')}</div>` : '';
      return `<div class="page-header"><div class="t"><h1>Traceability &amp; Quality</h1><p>Follow each requirement through use cases, configuration, build and UAT, see what is missing, and keep lessons learned as you go. Everything is derived from the records already in this project.</p></div></div><div class="page-body">${ai}${bar}<div style="margin-top:12px">${body}</div></div>`;
    }
  };
  ACT.trKbSearch = el => { KB.q = el.value; V.render(); };
  ACT.trTab = a => { if (a.getAttribute('data-v') === 'kb') KB.loaded = ''; S.ui.trTab = a.getAttribute('data-v'); V.render(); };
  ACT.trCsv = () => { const m = model(); const head = ['Requirement', 'Title', 'Status', 'Use cases', 'Customer confirmed', 'Modules', 'Build', 'UAT sessions'];
    const lines = [head.map(csvq).join(',')].concat(m.rows.map(r => [r.req.id, r.req.title, r.req.status, r.ucs.map(u => 'UC-' + u.no).join('; '), r.confirmed + '/' + r.ucs.length, r.mods.join('; '), r.build, r.uat].map(csvq).join(',')));
    V.download('Traceability matrix.csv', '﻿' + lines.join('\r\n'), 'text/csv'); };
  ACT.trLessonCsv = () => { const ls = I().list('lesson'); const lines = [['Lesson', 'Area', 'Impact', 'What happened', 'What to do next time', 'Reusable'].map(csvq).join(',')].concat(ls.map(l => [l.title, l.area, l.impact, l.what, l.reco, l.reusable ? 'Yes' : ''].map(csvq).join(',')));
    V.download('Lessons learned.csv', '﻿' + lines.join('\r\n'), 'text/csv'); };
  ACT.trLessonEdit = a => { if (!canEdit()) return; const id = a && a.getAttribute && a.getAttribute('data-id'); const l = id ? I().get('lesson', id) || {} : {};
    drawer(id ? 'Edit lesson' : 'Add lesson', `<div class="grid g2"><div style="grid-column:1/-1"><label class="f">Lesson *</label><input type="text" id="ls_t" value="${esc(l.title || '')}" placeholder="One line"></div>
      <div><label class="f">Area</label><select id="ls_a">${LESSON_AREAS.map(x => `<option${l.area === x ? ' selected' : ''}>${x}</option>`).join('')}</select></div><div><label class="f">Impact</label><select id="ls_i">${IMPACT.map(x => `<option${(l.impact || 'Medium') === x ? ' selected' : ''}>${x}</option>`).join('')}</select></div>
      <div style="grid-column:1/-1"><label class="f">What happened</label><textarea id="ls_w" rows="3">${esc(l.what || '')}</textarea></div><div style="grid-column:1/-1"><label class="f">What to do next time</label><textarea id="ls_r" rows="3">${esc(l.reco || '')}</textarea></div>
      <div style="grid-column:1/-1"><label class="row" style="gap:8px"><input type="checkbox" id="ls_u"${l.reusable ? ' checked' : ''}> Reusable on other projects (keep customer names and confidential details out of this text)</label></div></div>`,
      `${id ? `<button class="btn danger" data-act="trLessonDel" data-id="${esc(id)}">Delete</button>` : ''}<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="trLessonSave" data-id="${esc(id || '')}">Save</button>`); };
  ACT.trLessonSave = a => V.busy(a, async () => { if (!gv('ls_t')) { toast('Enter the lesson'); return; } const id = a.getAttribute('data-id') || I().uid('ls');
    await I().put('lesson', id, { title: gv('ls_t'), area: gv('ls_a'), impact: gv('ls_i'), what: gv('ls_w'), reco: gv('ls_r'), reusable: document.getElementById('ls_u').checked }); closeDrawer(); toast('Lesson saved'); });
  ACT.trLessonDel = async a => { if (!(await confirmDialog('Delete lesson', 'Delete this lesson?', 'Delete', true))) return; await I().del('lesson', a.getAttribute('data-id')); closeDrawer(); };
})(typeof window !== 'undefined' ? window : globalThis);

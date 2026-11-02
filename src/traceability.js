/* Traceability, quality checks and lessons learned (roadmap phase 7). Everything is derived from records that already exist:
   requirements -> use cases (reqIds) -> modules -> build status -> UAT sessions. Nothing is duplicated; only lessons learned are new records (kind `lesson`).
   Checks are rule-based and say what is missing, not whether the solution is right. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items;
  const { tag, drawer, closeDrawer, toast, ico, confirmDialog } = V;
  const canEdit = () => !V.isCustomer() && !S.readonly;
  const KINDS = ['usecase', 'build', 'uat', 'cmodx', 'lesson', 'utc', 'task'];
  const BSTAT = ['Not started', 'Configuring', 'Internal testing', 'Completed'];
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const gv = id => ((document.getElementById(id) || {}).value || '').trim();

  // Every requirement followed through four steps: use cases, module, build, testing. A step is done, partly done, not started, missing (a gap) or failing.
  const RUN = ['Not Started', 'Ready for Testing'];
  function model() {
    const reqs = (S.ws.requirements || []).filter(r => r.status !== 'Rejected');
    const ucs = I().list('usecase'); const uats = I().list('uat'); const utcs = I().ready(['utc']) ? I().list('utc') : []; const U = root.FWBUat;
    const issues = U ? I().list('task').filter(t => U.isUatIssue(t)) : [];
    const build = m => (I().get('build', F.slug(m)) || {}).status || 'Not started';
    const uatFor = m => uats.filter(u => norm(u.mod) === norm(m));
    const rows = reqs.map(r => {
      const u = ucs.filter(x => (x.reqIds || []).includes(r.id));
      const mods = (r.modules && r.modules.length ? r.modules : [...new Set(u.flatMap(x => x.modules || []))]);
      const bs = mods.map(build); const rank = s => BSTAT.indexOf(s);
      const worst = bs.length ? bs.reduce((a, b) => (rank(a) <= rank(b) ? a : b)) : '';
      const ut = [...new Set(mods.flatMap(m => uatFor(m).map(x => x.id)))];
      const tc = utcs.filter(c => c.req === r.id || mods.some(m => norm(c.mod) === norm(m)));   // test cases linked to the requirement, or in its modules
      const tests = { n: tc.length, passed: tc.filter(c => c.status === 'Passed' || c.status === 'Approved').length, failed: tc.filter(c => c.status === 'Failed' || c.status === 'Blocked').length, run: tc.filter(c => !RUN.includes(c.status)).length };
      const confirmed = u.filter(x => x.confirmation === 'Customer confirmed').length;
      const cell = { uc: !u.length ? 'gap' : confirmed === u.length ? 'done' : 'part', mod: mods.length ? 'done' : 'gap',
        bld: !mods.length ? 'gap' : worst === 'Completed' ? 'done' : worst === 'Not started' ? 'todo' : 'part',
        tst: tests.failed ? 'fail' : tests.n ? (tests.passed === tests.n ? 'done' : tests.run ? 'part' : 'todo') : (ut.length ? 'part' : 'gap') };
      const traced = cell.uc !== 'gap' && cell.mod === 'done' && (tests.n > 0 || ut.length > 0);
      const attn = Object.values(cell).some(v => v === 'gap' || v === 'fail');
      return { req: r, ucs: u, confirmed, mods, build: worst, uat: ut.length, tests, cell, traced, attn };
    });
    return { reqs, ucs, uats, utcs, issues, rows, build, uatFor };
  }
  // The gap rules: each says what is missing, why it matters, what to do and where to do it. They check that records are linked and confirmed; they do not judge the solution.
  function checks(m) {
    const f = []; const add = (sev, area, item, finding, why, action, go) => f.push({ sev, area, item, finding, why, action, go });
    const lab = r => r.req.id + ' ' + (r.req.title || '');
    m.rows.forEach(r => {
      if (!r.ucs.length) add('medium', 'Requirement to use case', lab(r), 'No use case is linked to this requirement.', 'Without a use case nobody has described how it will work, so it can be missed in design and in testing.', 'Write a use case for it, or link an existing one.', { k: 'req', id: r.req.id });
      else if (!r.confirmed) add('low', 'Requirement to use case', lab(r), 'The linked use cases are not yet Customer confirmed.', 'Unconfirmed use cases can change, and the build may be wasted.', 'Confirm them with the customer and record who confirmed.', { k: 'uc', id: r.ucs[0].id });
      if (!r.mods.length) add('low', 'Requirement to module', lab(r), 'No module is recorded for this requirement.', 'We cannot say where it will be configured or tested.', 'Pick the module it belongs to.', { k: 'req', id: r.req.id });
      if (r.tests.failed) add('high', 'Testing', lab(r), r.tests.failed + ' test case' + (r.tests.failed === 1 ? '' : 's') + ' failed or blocked.', 'A failing test means the requirement does not work yet.', 'Open UAT, log the issue and retest after the fix.', { k: 'uat' });
      else if (r.cell.bld === 'done' && !r.tests.n && !r.uat) add('medium', 'Build to testing', lab(r), 'Build is complete but there is no test case or UAT session for it.', 'It could go live without ever being tested.', 'Add test cases for its module in UAT.', { k: 'uat' });
    });
    m.ucs.filter(u => u.scope !== 'Out of scope' && !(u.reqIds || []).length).forEach(u => add('low', 'Use case to requirement', 'UC-' + (u.no || '?') + ' ' + (u.title || ''), 'The use case is not linked to any requirement.', 'It is not clear which customer need it serves.', 'Link it to a requirement, or mark it out of scope.', { k: 'uc', id: u.id }));
    m.ucs.filter(u => u.impl === 'Verified against configuration' && u.confirmation !== 'Customer confirmed').forEach(u => add('medium', 'Use case', 'UC-' + (u.no || '?') + ' ' + (u.title || ''), 'Marked verified against configuration but not confirmed by the customer.', 'We checked it against the system, but the customer has not agreed it is what they want.', 'Get the customer confirmation.', { k: 'uc', id: u.id }));
    F.allModules().filter(x => x.inScope).forEach(x => { const b = m.build(x.name); const ut = m.uatFor(x.name);
      if (b === 'Completed' && !ut.length && !m.utcs.some(c => norm(c.mod) === norm(x.name))) add('medium', 'Build to testing', x.label || x.name, 'Build is Completed but no UAT session or test case is recorded for this module.', 'The module is built but nobody has tried it.', 'Add test cases for this module in UAT.', { k: 'uat' });
      if (ut.length && !ut.some(u => u.published) && b === 'Completed') add('low', 'Build to testing', x.label || x.name, 'UAT sessions exist but none is published to the customer.', 'The customer cannot see what is planned.', 'Publish the UAT session.', { k: 'uat' }); });
    const open = m.issues.filter(t => !['Closed', 'Deferred'].includes(root.FWBUat.issueStatus(t)) && t.uat && ['Critical', 'Major'].includes(t.uat.severity)); if (open.length) add('high', 'Testing', 'UAT issues', open.length + ' critical or major UAT issue' + (open.length === 1 ? ' is' : 's are') + ' still open.', 'Go-live should not go ahead with these open.', 'Work through them on the UAT issue board.', { k: 'uat' });
    I().list('cmodx').forEach(c => { const nm = c.name || c.label || c.id; const used = m.ucs.some(u => (u.modules || []).some(x => norm(x) === norm(nm))) || m.reqs.some(r => (r.modules || []).some(x => norm(x) === norm(nm))); if (!used) add('low', 'Custom module', nm, 'No requirement or use case refers to this custom module.', 'A custom module nobody asked for may be waste.', 'Link it to a requirement, or remove it.', { k: 'module', id: c.name || c.id }); });
    const rank = { high: 0, medium: 1, low: 2 }; return f.sort((a, b) => rank[a.sev] - rank[b.sev]);
  }
  // for the menu marker and other pages: null until the records are loaded
  V.traceSummary = () => { if (V.isCustomer() || !S.project) return null; I().load(KINDS); if (!I().ready(['usecase', 'build', 'uat', 'lesson', 'utc', 'task'])) return null; const m = model(); const ck = checks(m); return { gaps: ck.length, high: ck.filter(x => x.sev === 'high').length, traced: m.rows.filter(r => r.traced).length, total: m.rows.length }; };
  const csvq = v => '"' + String(v == null ? '' : root.FWB.csvText(v)).replace(/"/g, '""') + '"';
  const LESSON_AREAS = ['Discovery', 'Workshops', 'Requirements', 'Configuration', 'Data migration', 'Integrations', 'UAT', 'Training', 'Go-live', 'Hypercare', 'Handover', 'Project management', 'Other'];
  const IMPACT = ['Low', 'Medium', 'High'];
  const KB = { items: [], loaded: '', q: '' }; const API = root.FWBApi;
  const TABS = [['cover', 'Coverage'], ['gaps', 'Gaps to fix'], ['lessons', 'Lessons learned']];
  const SEV = { high: ['red', 'Fix first'], medium: ['tbc', 'Should fix'], low: ['low', 'Worth a look'] };
  const CELL = { done: 'done', part: 'part', todo: 'todo', gap: 'gap', fail: 'fail' };
  const pill = (st, text) => `<span class="tq-p ${CELL[st] || 'todo'}">${esc(text)}</span>`;

  V.trace = {
    html() {
      I().load(KINDS); if (!I().ready(['usecase', 'build', 'uat', 'lesson', 'utc', 'task'])) return '<div class="page-body"><div class="muted" style="padding:20px">Loading…</div></div>';
      const rawTab = S.ui.trTab; const tab = rawTab === 'checks' ? 'gaps' : rawTab === 'trace' ? 'cover' : rawTab === 'kb' ? 'lessons' : (rawTab || 'cover'); const view = tab === 'lessons' ? (rawTab === 'kb' || S.ui.trLs === 'all' ? 'kb' : 'lessons') : tab;
      const m = model(); const ck = checks(m); const can = canEdit(); const full = m.rows.filter(r => r.traced).length; const hi = ck.filter(x => x.sev === 'high').length;
      const bar = `<div class="tabs" role="tablist">${TABS.map(([k, l]) => `<button class="tab${tab === k ? ' active' : ''}" role="tab" aria-selected="${tab === k}" data-act="trTab" data-v="${k}">${esc(l)}${k === 'gaps' && ck.length ? ` <span class="xs">(${ck.length})</span>` : ''}</button>`).join('')}</div>`;
      const tile = (k, v, label, sub, tone) => `<button type="button" class="tq-tile${tab === k ? ' on' : ''}${tone ? ' ' + tone : ''}" data-act="trTab" data-v="${k}"><b>${v}</b><span>${esc(label)}</span><small>${esc(sub)}</small></button>`;
      const tiles = `<div class="tq-tiles">${tile('cover', full + ' of ' + m.rows.length, 'requirements traced to testing', m.rows.length ? Math.round(100 * full / m.rows.length) + ' per cent covered end to end' : 'No requirements yet', full === m.rows.length && m.rows.length ? 'ok' : '')}${tile('gaps', ck.length, 'gaps to fix', hi ? hi + ' to fix first' : ck.length ? 'none urgent' : 'everything is linked', hi ? 'bad' : ck.length ? 'warn' : 'ok')}${tile('lessons', I().list('lesson').length, 'lessons learned', 'kept for the next project', '')}</div>`;
      let body = '';
      if (tab === 'cover') {
        const q = (S.ui.trQ || '').toLowerCase(); const flt = S.ui.trF || 'all';
        const list = m.rows.filter(r => (flt === 'all' || (flt === 'attn' ? r.attn : r.traced)) && (!q || (r.req.id + ' ' + (r.req.title || '') + ' ' + r.mods.join(' ')).toLowerCase().includes(q)));
        const chip = (k, l, n) => `<button type="button" class="btn sm${flt === k ? ' primary' : ''}" data-act="trFilter" data-v="${k}">${l} <span class="xs">${n}</span></button>`;
        const t = r => r.tests; const ucTxt = r => (r.ucs.length ? r.confirmed + ' of ' + r.ucs.length + ' confirmed' : 'none yet'); const tstTxt = r => (t(r).n ? t(r).passed + ' of ' + t(r).n + ' passed' + (t(r).failed ? ', ' + t(r).failed + ' failing' : '') : r.uat ? r.uat + ' UAT session' + (r.uat === 1 ? '' : 's') : 'not tested');
        body = `<div class="card"><div class="card-h"><h3>Does every requirement reach testing?</h3><span class="row" style="gap:8px">${chip('all', 'All', m.rows.length)}${chip('attn', 'Needs attention', m.rows.filter(r => r.attn).length)}${chip('traced', 'Fully traced', full)}<input type="search" class="tq-q" placeholder="Search requirements" aria-label="Search requirements" value="${esc(S.ui.trQ || '')}" data-change="trSearch"><button class="btn sm" data-act="trCsv">${ico('dl') || ''}Export CSV</button></span></div>
          <div class="tq-key"><span>Each requirement is followed through four steps.</span> ${pill('done', 'Done')} ${pill('part', 'In progress')} ${pill('todo', 'Not started')} ${pill('gap', 'Missing')} ${pill('fail', 'Failing')}</div>
          <div class="tbl-wrap"><table class="tbl tq-t"><thead><tr><th>Requirement</th><th>1. Use cases</th><th>2. Module</th><th>3. Build</th><th>4. Testing</th></tr></thead><tbody>${list.map(r => `<tr class="click" data-act="trRow" data-id="${esc(r.req.id)}" tabindex="0"><td><b>${esc(r.req.id)}</b> ${esc(r.req.title || '')}<div class="xs muted">${esc(r.req.status || '')}</div></td><td>${pill(r.cell.uc, ucTxt(r))}</td><td>${pill(r.cell.mod, r.mods.length ? r.mods.map(x => (F.moduleView(x) || {}).label || x).join(', ') : 'No module')}</td><td>${pill(r.cell.bld, r.build || 'No module')}</td><td>${pill(r.cell.tst, tstTxt(r))}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Nothing matches.</td></tr>'}</tbody></table></div></div>
          <p class="small muted" style="margin-top:8px">Click a requirement to see its whole chain and jump to each part. A requirement counts as traced when it has a use case, a module and at least one test case or UAT session. Test cases are matched by their linked requirement or by module. FTR rows are kept inside the FTR workbook and are not part of this view.</p>`;
      }
      if (tab === 'gaps') {
        const area = S.ui.trA || ''; const areas = [...new Set(ck.map(x => x.area))]; const shown = ck.filter(x => !area || x.area === area);
        body = `<div class="card"><div class="card-h"><h3>What is missing (${ck.length})</h3><span class="row" style="gap:8px">${can && V.aiButton ? V.aiButton('gaps', 'Ask AI for a gap check') : ''}</span></div>
          ${areas.length > 1 ? `<div class="tq-key"><button type="button" class="btn sm${area ? '' : ' primary'}" data-act="trArea" data-v="">All areas</button>${areas.map(a => `<button type="button" class="btn sm${area === a ? ' primary' : ''}" data-act="trArea" data-v="${esc(a)}">${esc(a)}</button>`).join('')}</div>` : ''}
          <div class="tq-gaps">${shown.map((x, i) => `<div class="tq-gap ${x.sev}"><div class="tq-gh">${tag(SEV[x.sev][0], SEV[x.sev][1])}<b>${esc(x.item)}</b><span class="xs muted">${esc(x.area)}</span></div><p>${esc(x.finding)}</p><p class="xs muted"><b>Why it matters:</b> ${esc(x.why)}</p><div class="row" style="gap:8px;align-items:center"><span class="small"><b>Do this:</b> ${esc(x.action)}</span><span class="spacer"></span>${x.go ? `<button class="btn sm" data-act="trGo" data-i="${ck.indexOf(x)}">Open</button>` : ''}</div></div>`).join('') || '<div class="empty" style="padding:24px"><h3>Nothing is missing</h3><p>Every requirement, use case and module that is recorded is linked and confirmed as far as these rules can tell.</p></div>'}</div></div>
          <p class="small muted" style="margin-top:8px">These rules check that records are linked and confirmed and that tested work passes. They do not judge whether a requirement or a configuration is right; a person does that.</p>`;
      }
      if (view === 'lessons') { const ls = I().list('lesson').sort((a, b) => String(b._created || '').localeCompare(String(a._created || '')));
        body = `<div class="card"><div class="card-h"><h3>Lessons learned (${ls.length})</h3><span class="row" style="gap:6px">${can ? `<button class="btn sm" data-act="trLessonEdit">${ico('plus')}Add lesson</button>` : ''}<button class="btn sm" data-act="trLessonCsv">Export CSV</button></span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Lesson</th><th>Area</th><th>Impact</th><th>What to do next time</th><th>Reusable</th><th></th></tr></thead><tbody>${ls.map(l => `<tr><td><b>${esc(l.title)}</b><div class="xs muted">${esc(l.what || '')}</div></td><td class="small">${esc(l.area || '')}</td><td>${esc(l.impact || '')}</td><td class="small">${esc(l.reco || '')}</td><td>${l.reusable ? 'Yes' : ''}</td><td>${can ? `<button class="btn sm ghost" data-act="trLessonEdit" data-id="${esc(l.id)}">Edit</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">No lessons recorded yet. Add them as the project goes, not only at closure.</td></tr>'}</tbody></table></div></div>`; }
      if (view === 'kb') { if (!KB.loaded) { KB.loaded = 'loading'; API.get('/api/knowledge').then(r => { KB.items = r.items || []; KB.loaded = 'done'; V.render(); }).catch(e => { KB.loaded = 'error'; KB.err = e.message || String(e); V.render(); }); }
        const q = (KB.q || '').toLowerCase(); const items = (KB.items || []).filter(x => !q || (x.title + ' ' + x.area + ' ' + x.what + ' ' + x.reco).toLowerCase().includes(q));
        body = `<div class="card"><div class="card-h"><h3>Reusable lessons from your projects (${KB.loaded === 'done' ? items.length : '…'})</h3><input type="search" placeholder="Search" value="${esc(KB.q || '')}" data-change="trKbSearch" style="max-width:240px"></div>${KB.loaded === 'error' ? `<div class="notice err" style="margin:12px">${esc(KB.err)}</div>` : ''}<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Lesson</th><th>Area</th><th>Impact</th><th>What to do next time</th><th>From project</th></tr></thead><tbody>${items.map(l => `<tr><td><b>${esc(l.title)}</b><div class="xs muted">${esc(l.what)}</div></td><td class="small">${esc(l.area)}</td><td>${esc(l.impact)}</td><td class="small">${esc(l.reco)}</td><td class="small">${esc(l.project)}</td></tr>`).join('') || `<tr><td colspan="5" class="muted">${KB.loaded === 'done' ? 'No reusable lessons yet. Tick "Reusable on other projects" on a lesson to add it here.' : 'Loading…'}</td></tr>`}</tbody></table></div></div><p class="small muted" style="margin-top:8px">Only lessons marked reusable appear, and only from projects you can open. Published templates are in Templates.</p>`; }
      if (tab === 'lessons') body = `<div class="tq-key"><button type="button" class="btn sm${view === 'lessons' ? ' primary' : ''}" data-act="trLs" data-v="mine">This project</button><button type="button" class="btn sm${view === 'kb' ? ' primary' : ''}" data-act="trLs" data-v="all">From all projects</button><span class="xs muted">What went well or badly, so the next project can start smarter.</span></div>` + body;
      return `<div class="page-header"><div class="t"><h1>Traceability &amp; Quality</h1><p>Is every customer requirement covered all the way to testing, and what is still missing? This page follows each requirement through its use cases, module, build and tests, lists the gaps with what to do about each, and keeps what the team learned.</p></div></div><div class="page-body">${tiles}${bar}<div style="margin-top:12px">${body}</div></div>`;
    }
  };
  ACT.trFilter = a => { S.ui.trF = a.getAttribute('data-v'); V.render(); };
  ACT.trSearch = el => { S.ui.trQ = el.value; V.render(); };
  ACT.trArea = a => { S.ui.trA = a.getAttribute('data-v'); V.render(); };
  ACT.trLs = a => { S.ui.trLs = a.getAttribute('data-v'); if (S.ui.trLs === 'all') KB.loaded = ''; S.ui.trTab = 'lessons'; V.render(); };
  // where each gap is fixed: the requirement or use case drawer, the module, or UAT
  const goTo = g => { if (!g) return; const fake = id => ({ getAttribute: n => (n === 'data-id' ? id : null) }); if (g.k === 'req' && ACT.editReq) ACT.editReq(fake(g.id)); else if (g.k === 'uc' && ACT.ucEdit) ACT.ucEdit(fake(g.id)); else if (g.k === 'module') V.go('module', { module: g.id }); else V.go('delivery'); };
  ACT.trGo = a => { const ck = checks(model()); goTo((ck[Number(a.getAttribute('data-i'))] || {}).go); };
  ACT.trGoDirect = a => goTo({ k: a.getAttribute('data-k'), id: a.getAttribute('data-id') });
  // one requirement's whole chain
  ACT.trRow = a => { const m = model(); const r = m.rows.find(x => x.req.id === a.getAttribute('data-id')); if (!r) return;
    const link = (k, id, text) => `<button type="button" class="tq-link" data-act="trGoDirect" data-k="${k}" data-id="${esc(id)}">${esc(text)}</button>`; const mv = x => (F.moduleView(x) || {}).label || x;
    const step = (n, title, st, inner) => `<li class="tq-step ${CELL[st]}"><i>${n}</i><div><b>${esc(title)}</b> ${pill(st, ({ done: 'Done', part: 'In progress', todo: 'Not started', gap: 'Missing', fail: 'Failing' })[st])}<div class="small">${inner}</div></div></li>`;
    drawer(r.req.id + ' ' + (r.req.title || ''), `<p class="small muted" style="margin-top:0">Requirement status: <b>${esc(r.req.status || '')}</b>. ${link('req', r.req.id, 'Open the requirement')}</p><ol class="tq-chain">
      ${step(1, 'Use cases', r.cell.uc, r.ucs.length ? r.ucs.map(u => link('uc', u.id, 'UC-' + (u.no || '?') + ' ' + (u.title || '')) + ' <span class="xs muted">' + esc(u.confirmation || '') + '</span>').join('<br>') : 'No use case is linked yet. Write one and link it to this requirement.')}
      ${step(2, 'Module', r.cell.mod, r.mods.length ? r.mods.map(x => link('module', x, mv(x))).join(', ') : 'No module recorded. Pick the module on the requirement.')}
      ${step(3, 'Build', r.cell.bld, r.build ? 'Build status: <b>' + esc(r.build) + '</b> (the least advanced of its modules).' : 'Nothing to build until a module is chosen.')}
      ${step(4, 'Testing', r.cell.tst, r.tests.n ? r.tests.n + ' test case' + (r.tests.n === 1 ? '' : 's') + ': ' + r.tests.passed + ' passed, ' + r.tests.failed + ' failed or blocked, ' + (r.tests.n - r.tests.run) + ' not run. ' + link('uat', '', 'Open UAT') : r.uat ? r.uat + ' UAT session(s) for its modules, no test cases yet. ' + link('uat', '', 'Open UAT') : 'No test case or UAT session. ' + link('uat', '', 'Add test cases in UAT'))}</ol>`,
      '<span class="spacer"></span><button class="btn" data-act="closeDrawer">Close</button>', { wide: true }); };
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

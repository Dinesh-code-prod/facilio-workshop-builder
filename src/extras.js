/* Delivery extras: workshop completion %, session import from CSV or Excel, schedule published as a link, internal module notes,
   process swimlane written as text, kick-off team/governance/agreements, and the per-module brief (custom delivery, decisions,
   what is not included, data to fill). Everything is typed or derived by rules from saved data. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items;
  const { tag, drawer, closeDrawer, toast, ico, confirmDialog } = V;
  const cust = () => V.isCustomer(); const canEdit = () => !cust() && !S.readonly;
  const modLabel = m => ((F.moduleView && F.moduleView(m)) || {}).label || m;

  // ---------- workshop completion ----------
  // Scheduled 10 + prep answered x 40 + held 30 + share of the session's actions closed x 20. Completed = 100.
  V.sessionCompletion = s => {
    if (s.status === 'completed') return 100; if (s.status === 'cancelled') return 0;
    let pct = 0; if (s.date) pct += 10;
    const L = root.FWBLearn; const ga = V.learnAnswers ? V.learnAnswers() : { list: [] }; const keys = new Set(); (s.modules || []).forEach(m => { const lm = L && L.forModule(m); if (lm) keys.add(lm.key); });
    if (keys.size) { let tot = 0, got = 0; keys.forEach(k => { const lm = L.BY[k]; if (!lm) return; tot += lm.form.reduce((a, x) => a + x.questions.length, 0); got += ga.list.filter(x => x.modKey === k).length; }); if (tot) pct += 40 * Math.min(1, got / tot); }
    if (s.date && s.date <= V.today()) pct += 30;
    const acts = I().ready(['action']) ? I().list('action').filter(a => (s.modules || []).includes(a.mod)) : []; if (acts.length) pct += 20 * acts.filter(a => a.status === 'Done').length / acts.length;
    return Math.round(Math.min(99, pct));
  };

  // ---------- planner: completion column, import, link ----------
  const patchPlanner = () => {
    if (!V.planner || V.planner._x) return; V.planner._x = 1;
  };
  patchPlanner();
  function parseCsv(text) {
    const rows = []; let row = [], f = '', q = false; text = text.replace(/^﻿/, '');
    for (let i = 0; i < text.length; i++) { const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true; else if (c === ',' || c === ';' || c === '\t') { row.push(f); f = ''; } else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; } else if (c !== '\r') f += c; }
    if (f.length || row.length) { row.push(f); rows.push(row); } return rows.filter(r => r.some(x => String(x).trim()));
  }
  const HEAD = { module: /module|area/i, date: /date|day/i, time: /time|start/i, trainer: /trainer|facilitator|consultant|lead/i, mode: /mode|type|channel/i, title: /title|session|topic|name/i };
  function matchModule(txt) { const t = String(txt || '').toLowerCase().trim(); if (!t) return ''; const all = F.allModules(); const ex = all.find(m => m.label.toLowerCase() === t || m.name.toLowerCase() === t); if (ex) return ex.name; const part = all.find(m => t.includes(m.label.toLowerCase()) || m.label.toLowerCase().includes(t)); return part ? part.name : ''; }
  function toIso(v) { if (v instanceof Date) return v.toISOString().slice(0, 10); const s = String(v || '').trim(); if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10); const m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/); if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; } const d = new Date(s); return isNaN(d) ? '' : d.toISOString().slice(0, 10); }
  function toTime(v) { if (v instanceof Date) return v.toISOString().slice(11, 16); const s = String(v || '').trim(); const m = s.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i); if (!m) return ''; let h = +m[1]; if (/pm/i.test(m[3] || '') && h < 12) h += 12; if (/am/i.test(m[3] || '') && h === 12) h = 0; return String(h).padStart(2, '0') + ':' + m[2]; }
  V.parseSessionRows = rows => { // rows: array of arrays with a header row; returns { sessions, skipped }
    const head = rows[0].map(x => String(x == null ? '' : x)); const col = {}; Object.keys(HEAD).forEach(k => { const i = head.findIndex(h => HEAD[k].test(h)); if (i >= 0) col[k] = i; });
    if (col.module === undefined) return { error: 'The first row must name a Module column (and may have Date, Time, Trainer, Mode, Title).' };
    const sessions = [], skipped = []; rows.slice(1).forEach((r, i) => { const mod = matchModule(r[col.module]); if (!mod) { skipped.push(`Row ${i + 2}: "${r[col.module] || ''}" does not match a module`); return; }
      const modeRaw = String(r[col.mode] || ''); sessions.push({ modules: [mod], date: toIso(r[col.date]), start: toTime(r[col.time]), trainer: String(r[col.trainer] || '').trim(), mode: /on-?site/i.test(modeRaw) ? 'Onsite Session' : /hybrid/i.test(modeRaw) ? 'Hybrid Session' : modeRaw ? 'Virtual Session' : '', title: String(r[col.title] || '').trim() || modLabel(mod) }); });
    return { sessions, skipped };
  };
  ACT.sesImport = async () => {
    if (!canEdit()) return; const f = (await V.pickFile('.csv,.xlsx'))[0]; if (!f) return; let rows;
    try { if (/\.csv$/i.test(f.name)) rows = parseCsv(await f.text()); else { const ExcelJS = await V.loadExcelJS(); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await f.arrayBuffer()); const ws = wb.worksheets[0]; rows = []; ws.eachRow(r => rows.push(r.values.slice(1).map(c => (c && typeof c === 'object' && c.richText ? c.richText.map(x => x.text).join('') : c && typeof c === 'object' && 'result' in c ? c.result : c)))); } }
    catch (e) { toast('Could not read the file: ' + e.message, 5000, true); return; }
    if (!rows || rows.length < 2) { toast('The file has no rows to import', 4000, true); return; } const res = V.parseSessionRows(rows); if (res.error) { toast(res.error, 6000, true); return; }
    S.ui.sesImp = res; drawer('Import sessions', `<div class="notice" style="margin-bottom:10px"><span>${res.sessions.length} session(s) will be added as Planned. Existing sessions are not changed.</span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Module</th><th>Date</th><th>Time</th><th>Trainer</th><th>Mode</th></tr></thead><tbody>${res.sessions.map(s => `<tr><td>${esc(modLabel(s.modules[0]))}</td><td>${esc(s.date || '—')}</td><td>${esc(s.start || '—')}</td><td>${esc(s.trainer || '—')}</td><td>${esc(s.mode || '—')}</td></tr>`).join('')}</tbody></table></div>${res.skipped.length ? `<div class="notice warn" style="margin-top:10px"><span><b>Skipped:</b><br>${res.skipped.map(esc).join('<br>')}</span></div>` : ''}`, `<button class="btn" data-act="closeDrawer">Cancel</button><span class="spacer"></span><button class="btn primary" data-act="sesImportGo" ${res.sessions.length ? '' : 'disabled'}>Add ${res.sessions.length}</button>`, { wide: true });
  };
  ACT.sesImportGo = () => { const d = F.doc('planner'); const res = S.ui.sesImp; if (!res) return; let no = Math.max(0, ...d.sessions.map(x => x.no || 0));
    res.sessions.forEach(s => d.sessions.push({ id: F.uid('ses'), no: ++no, status: 'planned', title: s.title, date: s.date, start: s.start, end: '', minutes: d.settings.defaultMinutes, mode: s.mode || d.settings.mode, modules: s.modules, topics: '', participants: '', prep: '', notes: s.trainer ? 'Trainer: ' + s.trainer : '', trainer: s.trainer }));
    S.ui.sesImp = null; closeDrawer(); F.changed('Sessions imported', res.sessions.length + ' from a file', { section: 'planner' }); };
  ACT.sesLink = () => { const d = F.doc('planner'); drawer('Publish the schedule as a link', `<p class="small muted" style="margin-top:0">If you keep the schedule in SharePoint, Smartsheet or Teams, paste the link. Customers will see a button that opens it. Use a link whose sharing already includes them.</p><label class="f">Schedule link (https)</label><input type="url" id="sl_url" value="${esc(d.settings.scheduleLink || '')}" placeholder="https://…">`, `<button class="btn" data-act="closeDrawer">Cancel</button><span class="spacer"></span><button class="btn primary" data-act="sesLinkSave">Save link</button>`); };
  ACT.sesLinkSave = () => { const u = document.getElementById('sl_url').value.trim(); if (u && !/^https:\/\/[^\s]+$/i.test(u)) { toast('Use a full https:// link', 4000, true); return; } const d = F.doc('planner'); if (u) d.settings.scheduleLink = u; else delete d.settings.scheduleLink; closeDrawer(); F.changed('Schedule link saved', u ? 'link set' : 'link removed', { section: 'planner' }); toast('Saved. Publish the schedule to share it.'); };

  // ---------- internal module notes (module tab; never sent to customers) ----------
  V.modTabsExtra = m => (cust() ? [] : [['notes', 'Internal notes'], ['process', 'Process']]);
  V.modTabBody = {
    notes: m => { I().load(['note']); if (!I().ready(['note'])) return '<div class="muted">Loading…</div>'; const l = I().list('note').filter(n => n.mod === m.name).sort((a, b) => (b.at || '').localeCompare(a.at || ''));
      return `<div class="notice" style="margin-bottom:12px"><span>Internal notes are for the Facilio team only. The server never sends them to customers.</span></div>${canEdit() ? `<div class="row" style="margin-bottom:12px"><textarea id="nt_text" rows="2" style="flex:1" maxlength="2000" placeholder="Add a note about ${esc(m.label)}"></textarea><button class="btn primary" data-act="noteAdd" data-m="${esc(m.name)}">Add note</button></div>` : ''}
        ${l.map(n => `<div class="card" style="margin-bottom:8px"><div class="card-b small">${esc(n.text).replace(/\n/g, '<br>')}<div class="xs muted" style="margin-top:4px">${esc(n.by || '')} · ${esc(V.fmtDate(n.at))}${canEdit() ? ` <button class="btn sm ghost" data-act="noteDel" data-id="${esc(n.id)}">${ico('x')}</button>` : ''}</div></div></div>`).join('') || '<div class="empty small">No notes yet.</div>'}`; },
    process: m => processTab(m)
  };
  ACT.noteAdd = a => V.busy(a, async () => { const t = document.getElementById('nt_text').value.trim(); if (!t) { toast('Write the note first'); return; } await I().put('note', I().uid('nt'), { mod: a.getAttribute('data-m'), text: t, by: S.user.name, at: new Date().toISOString() }); });
  ACT.noteDel = a => V.busy(a, async () => { if (!(await confirmDialog('Delete note', 'Remove this note?', 'Delete', true))) return; await I().del('note', a.getAttribute('data-id')); });

  // ---------- process swimlane written as text ----------
  // One step per line:  Actor: what happens [Channel] -> Status      (start the text with ? for a decision)
  const actorByText = t => { const x = String(t || '').trim().toLowerCase(); const a = F.allActors().find(y => y.label.toLowerCase() === x || (y.roleName || '').toLowerCase() === x); return a ? a.id : ''; };
  function stepsToText(p) { return p.steps.map(s => { const lab = s.actorText || F.actorLabel(s.lane); return `${lab}: ${s.decision ? '? ' : ''}${s.action || ''}${s.interface && s.interface !== 'Facilio web app (Maintenance)' ? ' [' + s.interface + ']' : ''}${s.statusText ? ' -> ' + s.statusText : ''}`; }).join('\n'); }
  function textToSteps(p, text) {
    const old = p.steps.slice(); const out = []; const bad = [];
    text.split('\n').map(x => x.trim()).filter(Boolean).forEach((line, i) => { const m = line.match(/^([^:]{1,60}):\s*(.+)$/); if (!m) { bad.push(`Line ${i + 1} needs "Actor: what happens"`); return; }
      let body = m[2]; let status = ''; const arrow = body.split(/\s*->\s*/); if (arrow.length > 1) { status = arrow.pop().trim(); body = arrow.join(' -> '); } let chan = ''; const cm = body.match(/\s*\[([^\]]+)\]\s*$/); if (cm) { chan = cm[1].trim(); body = body.slice(0, cm.index); } const dec = /^\?\s*/.test(body); body = body.replace(/^\?\s*/, '').trim();
      const lane = actorByText(m[1]); const prev = old[i] || {}; out.push(Object.assign({ id: F.uid('st'), verification: 'proposed', record: p.module || '', transitionId: '', notes: '', interface: 'Facilio web app (Maintenance)' }, prev, { lane: lane || 'tbc:any', actorText: lane ? '' : m[1].trim(), action: body, decision: dec, statusText: status, interface: chan || prev.interface || 'Facilio web app (Maintenance)' })); });
    return { steps: out, bad };
  }
  V.processText = { stepsToText, textToSteps };
  function processTab(m) {
    const list = S.ws.processes.filter(p => p.module === m.name);
    return `<div class="notice" style="margin-bottom:12px"><span>Business processes live in Roles &amp; Access Permissions › Business processes. Here you can write one as text for this module. One step per line: <b>Actor: what happens [Channel] -&gt; Status</b>. Start the text with <b>?</b> for a decision. Actors that are not known roles stay as typed and are marked to be confirmed.</span></div>
      ${canEdit() ? `<button class="btn" data-act="procNew" data-m="${esc(m.name)}">${ico('plus')}New process for ${esc(m.label)}</button>` : ''}
      ${list.map(p => `<div class="card" style="margin-top:12px"><div class="card-h"><h3>${esc(p.name)}</h3><span class="small muted">${p.steps.length} steps</span>${canEdit() ? `<button class="btn sm" data-act="procText" data-id="${esc(p.id)}">Edit as text</button>` : ''}</div><div class="swim-wrap">${root.FWBDiagrams.swimlaneSvg(V.withLabels ? V.withLabels(p) : p, F.actorLabel, id => F.actor(id).category)}</div></div>`).join('') || '<div class="empty small" style="margin-top:12px">No process for this module yet.</div>'}`;
  }
  ACT.procNew = a => { const m = a.getAttribute('data-m'); const p = { id: F.uid('proc'), name: modLabel(m) + ' process', objective: '', trigger: '', module: m, outcome: '', lanes: [], steps: [] }; S.ws.processes.push(p); F.changed('Process added', p.name); ACT.procText({ getAttribute: () => p.id }); };
  ACT.procText = a => { const p = S.ws.processes.find(x => x.id === a.getAttribute('data-id')); if (!p) return; drawer('Edit process as text — ' + p.name, `<textarea id="pt_text" rows="14" style="font-family:monospace" placeholder="Tenant: Reports a leak [Tenant portal] -> New\nFM coordinator: ? Is it urgent -> Triaged\nFacilio: Creates the work order -> Assigned">${esc(stepsToText(p))}</textarea><div class="xs muted" style="margin-top:6px">Known actors: ${F.allActors().slice(0, 12).map(x => esc(x.label)).join(', ')}…</div>`, `<button class="btn" data-act="closeDrawer">Cancel</button><span class="spacer"></span><button class="btn primary" data-act="procTextSave" data-id="${esc(p.id)}">Apply</button>`, { wide: true }); };
  ACT.procTextSave = a => { const p = S.ws.processes.find(x => x.id === a.getAttribute('data-id')); const r = textToSteps(p, document.getElementById('pt_text').value); if (r.bad.length) { toast(r.bad[0], 5000, true); return; } p.steps = r.steps; closeDrawer(); F.changed('Process updated from text', p.name + ' · ' + r.steps.length + ' steps'); };

  // ---------- kick-off: team, governance and agreements below the deck ----------
  const TYPES = ['Agreement', 'Call finding', 'Phased delivery', 'Decision'];
  const kickBlocks = () => {
    I().load(['agreement']); if (!I().ready(['agreement'])) return '';
    const p = S.project || {}; const ppl = F.doc('people') || {}; const team = (ppl.team || []).filter(x => x && x.name); const sk = (ppl.stakeholders || []).filter(x => x && x.name); /* the project's people list (Project Settings), which the kick-off reading also fills */ const ag = I().list('agreement').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const people = (l, h) => `<div class="card"><div class="card-h"><h3>${h}</h3></div><div class="card-b small">${l.map(x => `<div style="margin-bottom:6px"><b>${esc(x.name)}</b>${x.role ? ' · ' + esc(x.role) : ''}${x.email ? `<div class="xs muted">${esc(x.email)}</div>` : ''}</div>`).join('') || `<span class="muted">Not entered yet.${canEdit() ? ' Add people in Project Settings, or use <b>Read the deck with AI</b> above.' : ''}</span>`}</div></div>`;
    const cad = (V.controls().cadence || ''); const kickDate = (V.planRows ? V.planRows().find(r => !r.top && /kick.?off/i.test(r.t)) : null); const gap = { weekly: 7, fortnightly: 14, monthly: 30, quarterly: 91 }[cad]; let next = ''; if (gap && kickDate) { next = V.addDays(kickDate.s, gap); while (next < V.today()) next = V.addDays(next, gap); }
    const phases = ag.filter(a => a.type === 'Phased delivery').sort((a, b) => (a.date || '9').localeCompare(b.date || '9'));
    return `<div class="page-body" style="padding-top:0"><div class="grid g2" style="margin-bottom:14px">${people(team, 'Facilio team')}${people(sk, (p.customer || 'Customer') + ' team')}</div>
      <div class="card" style="margin-bottom:14px"><div class="card-h"><h3>Governance</h3></div><div class="card-b small">${cad ? `Steering meetings are <b>${esc(cad)}</b>${next ? `. Next: <b>${V.fmtDate(next)}</b>` : ''}.` : '<span class="muted">The meeting rhythm has not been set.</span>'}</div></div>
      ${phases.length ? `<div class="grid g3" style="margin-bottom:14px">${phases.map((a, i) => `<div class="card"><div class="card-b"><div class="xs muted">Phase ${i + 1}${a.date ? ' · by ' + V.fmtDate(a.date) : ''}</div><b>${esc(a.title)}</b><div class="small">${(a.mods || []).map(modLabel).map(esc).join(', ')}</div></div></div>`).join('')}</div>` : ''}
      <div class="card"><div class="card-h"><h3>Agreements and call findings</h3>${canEdit() ? `<button class="btn sm" data-act="agEdit">${ico('plus')}Add</button>` : ''}</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Type</th><th>Date</th><th>What was agreed</th><th>Modules</th><th>Source</th><th></th></tr></thead><tbody>${ag.map(a => `<tr ${canEdit() ? `class="click" data-act="agEdit" data-id="${esc(a.id)}"` : ''}><td>${tag(a.type === 'Decision' ? 'violet' : a.type === 'Phased delivery' ? 'blue' : 'low', a.type)}</td><td class="small">${esc(V.fmtDate(a.date))}</td><td class="small"><b>${esc(a.title)}</b><div class="xs muted">${esc(a.detail || '')}</div></td><td class="small">${(a.mods || []).map(modLabel).map(esc).join(', ')}</td><td class="xs">${/^https:\/\//.test(a.link || '') ? `<a href="${esc(F.safeUrl(a.link))}" target="_blank" rel="noopener noreferrer">link</a>` : esc(a.link || '')}</td><td></td></tr>`).join('') || '<tr><td colspan="6" class="empty">Nothing recorded yet.</td></tr>'}</tbody></table></div></div></div>`;
  };
  ACT.agEdit = a => { const id = a.getAttribute('data-id'); const x = id ? I().get('agreement', id) : { type: 'Agreement', date: V.today(), mods: [] }; const mods = F.allModules().filter(m => m.inScope).sort((q, r) => q.label.localeCompare(r.label));
    drawer(id ? 'Edit entry' : 'Add agreement or finding', `<div class="fgrid"><div><label class="f">Type</label><select id="ag_type">${TYPES.map(t => `<option ${x.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div><div><label class="f">Date</label><input type="date" id="ag_date" value="${esc(x.date || '')}"></div><div class="full"><label class="f">Title</label><input type="text" id="ag_title" value="${esc(x.title || '')}" maxlength="200"></div><div class="full"><label class="f">Detail</label><textarea id="ag_detail" rows="3" maxlength="2000">${esc(x.detail || '')}</textarea></div><div class="full"><label class="f">Modules</label><select id="ag_mods" multiple size="5" style="height:auto">${mods.map(m => `<option value="${esc(m.name)}" ${(x.mods || []).includes(m.name) ? 'selected' : ''}>${esc(m.label)}</option>`).join('')}</select></div><div class="full"><label class="f">Source (meeting, or an https link)</label><input type="text" id="ag_link" value="${esc(x.link || '')}" maxlength="300"></div></div>`,
      `${id ? `<button class="btn danger" data-act="agDel" data-id="${esc(id)}">Delete</button>` : ''}<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="agSave" data-id="${esc(id || '')}">Save</button>`); };
  ACT.agSave = a => V.busy(a, async () => { const t = document.getElementById('ag_title').value.trim(); if (!t) { V.ui.field('ag_title', 'Enter a title'); return; } const id = a.getAttribute('data-id') || I().uid('ag'); const old = a.getAttribute('data-id') ? I().get('agreement', id) : {}; const d = Object.assign({}, old, { type: document.getElementById('ag_type').value, date: document.getElementById('ag_date').value, title: t, detail: document.getElementById('ag_detail').value.trim(), mods: Array.from(document.getElementById('ag_mods').selectedOptions).map(o => o.value), link: document.getElementById('ag_link').value.trim() }); delete d.hist; await I().put('agreement', id, d); closeDrawer(); });
  ACT.agDel = a => V.busy(a, async () => { if (!(await confirmDialog('Delete entry', 'Remove this entry?', 'Delete', true))) return; await I().del('agreement', a.getAttribute('data-id')); closeDrawer(); });
  if (V.kickoff && !V.kickoff._x) { const orig = V.kickoff.html; V.kickoff._x = 1; V.kickoff.html = function () { return orig.apply(this, arguments) + kickBlocks(); }; }

  // ---------- per-module brief in the customer guide ----------
  const lmModule = lm => { const mods = F.allModules().filter(m => { const l = root.FWBLearn && root.FWBLearn.forModule(m.name); return l && l.key === lm.key; }); return mods.find(m => m.inScope) || mods[0] || null; };
  const briefOf = m => (m && I().ready(['modbrief']) ? I().get('modbrief', F.slug(m.name)) : null) || {};
  V.learnBrief = lm => {
    const m = lmModule(lm); if (!m) return ''; I().load(['modbrief', 'decision']); if (!I().ready(['modbrief'])) return ''; const b = briefOf(m); const dec = V.decisionsFor ? V.decisionsFor(m.name) : [];
    const lines = v => (v || []).filter(Boolean); const custom = lines(b.custom).map(x => x.split('|').map(y => y.trim()));
    const sheets = (V.onboardingSheetsFor ? V.onboardingSheetsFor(m.name) : []); const has = custom.length || lines(b.notIncluded).length || lines(b.dataToFill).length || dec.length || sheets.length;
    if (!has && !canEdit()) return '';
    return `<section class="gl-sec" id="gl-brief"><div class="card"><div class="card-h"><h3>Your project, this module</h3>${canEdit() ? `<button class="btn sm" data-act="mbEdit" data-m="${esc(m.name)}">${ico('edit')}Edit</button>` : ''}</div><div class="card-b small">
      ${custom.length ? `<h4 class="gl-subh">Custom delivery, built for you</h4>${custom.map(c => `<div style="margin-bottom:8px"><b>${esc(c[0])}</b>${c[1] ? `<div>${esc(c[1])}</div>` : ''}${c[2] ? `<div class="xs muted">To prepare: ${esc(c[2])}</div>` : ''}</div>`).join('')}` : ''}
      ${dec.length ? `<h4 class="gl-subh">Decisions already made</h4><ul>${dec.map(d => `<li><b>${esc(d.title)}</b>${d.detail ? ' — ' + esc(d.detail) : ''}</li>`).join('')}</ul>` : ''}
      ${lines(b.notIncluded).length ? `<h4 class="gl-subh">Not included in scope</h4><ul>${lines(b.notIncluded).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${lines(b.dataToFill).length || sheets.length ? `<h4 class="gl-subh">Data to fill</h4><ul>${lines(b.dataToFill).map(x => `<li>${esc(x)}</li>`).join('')}${sheets.map(x => `<li>Onboarding sheet: ${esc(x)}</li>`).join('')}</ul>` : ''}
      ${!has ? '<span class="muted">Nothing entered for this module yet. Press Edit to add custom delivery items, what is not included, and the data the customer should fill.</span>' : ''}</div></div></section>`;
  };
  ACT.mbEdit = a => { const m = F.moduleView(a.getAttribute('data-m')); const b = briefOf(m); const t = (k, l, rows, ph) => `<div style="margin-bottom:12px"><label class="f">${l}</label><textarea id="mb_${k}" rows="${rows}" maxlength="3000" placeholder="${esc(ph || 'One per line')}">${esc((b[k] || []).join('\n'))}</textarea></div>`;
    drawer('Module brief — ' + m.label, `${t('custom', 'Custom delivery (title | what is built | what to prepare)', 5, 'Quote approval chain | Two-step approval for quotes over 5,000 | Approver list')}${t('notIncluded', 'Not included in scope', 4)}${t('dataToFill', 'Data to fill', 4)}<div class="xs muted">Decisions come from Governance › Decisions (status Agreed) for this module.</div>`, `<button class="btn" data-act="closeDrawer">Cancel</button><span class="spacer"></span><button class="btn primary" data-act="mbSave" data-m="${esc(m.name)}">Save</button>`, { wide: true }); };
  ACT.mbSave = a => V.busy(a, async () => { const m = a.getAttribute('data-m'); const d = Object.assign({}, briefOf(F.moduleView(m)), { mod: m }); delete d.hist; ['custom', 'notIncluded', 'dataToFill'].forEach(k => { d[k] = document.getElementById('mb_' + k).value.split('\n').map(x => x.trim()).filter(Boolean); }); await I().put('modbrief', F.slug(m), d); closeDrawer(); });
  if (V.learn && !V.learn._x) { V.learn._x = 1; const before = V.learn.before; V.learn.before = function (lm) { return V.learnBrief(lm) + before.apply(this, arguments); }; }
})(typeof window !== 'undefined' ? window : globalThis);

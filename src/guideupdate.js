/* Update the user guide from an organisation configuration ZIP (tabs "Update from configuration" and "Version history" in the User Guide Builder).
   The ZIP is read in the browser, never executed or sent anywhere. Analysis and wording rules live in guideintel.js.
   A run is saved as a project record (kind ugu) so the review survives a reload; guide versions are records of kind ugv. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items; const G = root.FWBIntel; const { toast, ico, tag, drawer, closeDrawer, confirmDialog } = V;
  const MAX_ZIP = 200 * 1024 * 1024, MAX_ENTRIES = 6000, MAX_XML = 120 * 1024 * 1024;
  const U = { run: null, runFor: null, file: null, tab: 'changes', sel: null, filter: 'pending', edits: {}, busy: false, q: '', conf: 'all', drag: false };
  const W = () => V.ugCtx && V.ugCtx.W(); const gid = () => V.ugCtx && V.ugCtx.id(); const can = () => V.ugCtx && V.ugCtx.canEdit();
  const when = d => d ? new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const bytes = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  const TL = { add: 'Added', update: 'Updated', remove: 'Removed', review: 'Review' };

  // ---------- runs ----------
  const runs = () => I().list('ugu').filter(r => r.guideId === gid()).sort((a, b) => String(b.analysedAt).localeCompare(String(a.analysedAt)));
  function current() { if (U.runFor !== gid()) { U.runFor = gid(); const r = runs()[0]; U.run = r ? JSON.parse(JSON.stringify(r)) : null; U.sel = null; U.file = r ? { name: r.fileName, size: r.size, status: 'done', at: r.analysedAt } : null; U.edits = {}; } return U.run; }
  const saveRun = () => { if (!U.run) return Promise.resolve(); const d = Object.assign({}, U.run); delete d.id; return I().put('ugu', U.run.id, d, { silent: true }).catch(e => toast(e.message || 'Could not save the review', 5000, true)); };
  const noMd = it => { const o = Object.assign({}, it); delete o.md; return o; };
  const withMd = it => Object.assign({}, it, { md: G.itemMd(it) });

  // ---------- reading the ZIP ----------
  async function readZip(file, st) {
    const errors = [], files = {}; let xml = 0, other = 0, total = 0;
    if (!/\.zip$/i.test(file.name)) throw new Error('Choose a .zip file exported from the customer organisation.');
    if (file.size > MAX_ZIP) throw new Error('The ZIP is larger than ' + bytes(MAX_ZIP) + '. Export the configuration without data and try again.');
    await V.loadScript('vendor/jszip.min.js'); let zip; try { zip = await root.JSZip.loadAsync(file); } catch (e) { throw new Error('This file could not be opened as a ZIP. It may be damaged or password protected.'); }
    const names = Object.keys(zip.files).filter(n => !zip.files[n].dir); if (names.length > MAX_ENTRIES) throw new Error('The ZIP holds ' + names.length + ' files, more than the ' + MAX_ENTRIES + ' this screen reads.');
    for (const n of names) {
      if (/(^|\/)\.\.(\/|$)|^\//.test(n)) { errors.push('Skipped an unsafe path: ' + n.slice(0, 80)); continue; }
      if (!/\.xml$/i.test(n)) { other++; continue; }
      const s = await zip.files[n].async('string'); total += s.length; if (total > MAX_XML) throw new Error('The configuration files are larger than this screen reads (' + bytes(MAX_XML) + ' of XML).');
      files[n.replace(/^.*?components\//, 'components/')] = s; xml++; if (st) st('Reading files… ' + xml);
    }
    if (!Object.keys(files).some(n => /MODULE\.xml$/i.test(n))) throw new Error('No MODULE.xml was found. This does not look like a Facilio organisation package, so nothing was analysed.');
    return { files, xml, other, errors };
  }
  const tick = () => new Promise(r => setTimeout(r, 20));
  async function analyseFile(file) {
    if (!can()) { toast('You have read-only access', 4000, true); return; }
    U.busy = true; U.file = { name: file.name, size: file.size, status: 'Reading the ZIP…', errors: [] }; V.render();
    const say = s => { U.file.status = s; const el = document.getElementById('guStatus'); if (el) el.textContent = s; };
    try {
      const z = await readZip(file, say); U.file.errors = z.errors; say('Parsing configuration…'); await tick();
      const b = root.FWBParser.parsePackage(z.files, { DOMParser, sourceName: file.name }); say('Finding relationships…'); await tick();
      const a = G.analyse(b); say('Comparing with the earlier configuration…'); await tick();
      const prevRun = runs().find(r => r.closed); let baseline = null, baseLabel = '';
      if (prevRun) { baseline = prevRun.baseline || prevRun.items; baseLabel = 'the configuration reviewed on ' + when(prevRun.closedAt); }
      else if (S.baseline && F.doc('config').source === 'imported') { baseline = G.analyse(S.baseline).items; baseLabel = 'the package loaded for this project (' + ((F.doc('config').importedMeta || {}).sourceName || 'imported') + ')'; }
      const d = G.diff(baseline, a.items.map(withMd)); const props = G.propose(W(), d, b.modules);
      const id = I().uid('ugu'); const stats = Object.assign({}, a.stats, { added: d.added.length, changed: d.changed.length, removed: d.removed.length, unchanged: d.unchanged.length, xml: z.xml, ignored: z.other, inventory: (b.inventory || []).length, gaps: (b.gaps || []).length });
      U.run = { id, guideId: gid(), fileName: file.name, size: file.size, analysedAt: new Date().toISOString(), by: S.user.name || S.user.email, stats, baselineLabel: baseLabel, hasBaseline: !!baseline, items: a.items.map(noMd), baseline: baseline ? baseline.map(noMd) : null, nodes: a.graph.nodes.map(n => [n.id, n.type, n.label]), edges: a.graph.edges, findings: a.findings, proposals: props, reviews: {}, closed: false, gaps: (b.gaps || []).slice(0, 30).map(x => ({ area: x.area, item: x.item, detail: x.detail, severity: x.severity })) };
      if (JSON.stringify(U.run).length > 380000) { U.run.baseline = null; U.run.edges = U.run.edges.slice(0, 1500); U.run.truncated = true; }
      U.runFor = gid(); U.file = { name: file.name, size: file.size, status: 'done', at: U.run.analysedAt, errors: z.errors }; U.tab = 'changes'; U.filter = 'pending'; U.sel = (props[0] || {}).id || null; U.edits = {}; await saveRun();
      toast(props.length ? props.length + ' proposed change' + (props.length > 1 ? 's' : '') + ' to review' : 'Analysis finished. No guide changes are needed.');
    } catch (e) { console.warn(e); U.file = { name: file.name, size: file.size, status: 'failed', error: e.message || 'The package could not be analysed', errors: [] }; }
    U.busy = false; V.render();
  }

  // ---------- views ----------
  function dropHtml() {
    const f = U.file; const dis = !can() || U.busy;
    const status = !f ? '' : f.status === 'failed' ? `<div class="gu-err" role="alert"><b>${esc(f.name)}</b> could not be analysed. ${esc(f.error)}</div>` : f.status === 'done' ? `<div class="gu-file"><span class="gu-ok" aria-hidden="true"></span><b>${esc(f.name)}</b> · ${esc(bytes(f.size))} · analysed ${esc(when(f.at))}${f.errors && f.errors.length ? `<div class="small muted">${f.errors.map(esc).join('<br>')}</div>` : ''}</div>` : `<div class="gu-file"><span class="tk-spin"></span><b>${esc(f.name)}</b> · ${esc(bytes(f.size))} · <span id="guStatus" role="status">${esc(f.status)}</span></div>`;
    return `<div class="gu-drop${U.drag ? ' drag' : ''}" id="guDrop"><div><b>Organisation configuration ZIP</b><p class="small muted">Drop the package exported from the customer's Facilio organisation, or choose a file. It is read here in your browser: scripts in it are only read as text, never run. The earlier guide is kept and only affected sections are proposed for change.</p></div><button class="btn primary" data-act="guPick" ${dis ? 'disabled' : ''}>${ico('upl')}${U.run ? 'Upload a newer ZIP' : 'Choose ZIP'}</button></div>${status}`;
  }
  function summaryHtml(r) {
    const s = r.stats; const row = (l, v, c) => `<td><b>${v}</b><span>${l}</span></td>`;
    return `<table class="gu-sum" aria-label="Analysis summary"><tr>${row('Custom modules', s.customModules)}${row('Custom fields', s.fields)}${row('Buttons', s.buttons)}${row('Automations', s.rules)}${row('Notifications', s.notifications)}${row('Status flows', s.flows)}${row('Verified links', s.verified)}${row('Uncertain links', s.uncertain)}${row('Problems', s.broken)}</tr></table>
      <p class="small muted gu-base">${r.hasBaseline ? 'Compared with ' + esc(r.baselineLabel) + ': ' : 'No earlier configuration to compare with, so everything found is treated as new: '}<b>${s.added}</b> new, <b>${s.changed}</b> changed, <b>${s.removed}</b> removed, <b>${s.unchanged}</b> unchanged.${s.disabled && (s.disabled.buttons + s.disabled.rules + s.disabled.notifications) ? ' Switched-off buttons, automations and notifications are left out.' : ''}</p>`;
  }
  const subtabs = r => { const pend = r.proposals.filter(p => p.status === 'pending').length; const unc = r.edges.filter(e => e.level === 'uncertain' && !r.reviews[e.id]).length; return `<div class="tabs gu-tabs" role="tablist">${[['changes', 'Proposed changes', pend], ['relations', 'Relationships', unc], ['validation', 'Validation', r.stats.broken]].map(([k, l, n]) => `<button class="tab${U.tab === k ? ' active' : ''}" role="tab" data-act="guTab" data-v="${k}">${l}${n ? ` <span class="xs">(${n})</span>` : ''}</button>`).join('')}</div>`; };

  function changesHtml(r) {
    const all = r.proposals; const list = all.filter(p => U.filter === 'all' || (U.filter === 'pending' ? p.status === 'pending' : p.status !== 'pending'));
    const sel = all.find(p => p.id === U.sel) || list[0] || null; if (sel && U.sel !== sel.id) U.sel = sel.id;
    const safe = all.filter(p => p.status === 'pending' && !p.conflict && !p.uncertain && p.type !== 'review').length;
    const row = p => `<li><button class="gu-row${sel && sel.id === p.id ? ' on' : ''}" data-act="guSel" data-id="${esc(p.id)}"><span class="gu-ty t-${esc(p.type)}">${TL[p.type]}</span><span class="gu-t">${esc(p.title)}</span><span class="gu-s">${esc(p.secTitle || '')}</span><span class="gu-b">${p.conflict ? '<i class="bd c">Conflict</i>' : ''}${p.uncertain ? '<i class="bd u">Needs review</i>' : ''}${p.status !== 'pending' ? `<i class="bd d">${p.status === 'accepted' ? 'Accepted' : 'Rejected'}</i>` : ''}</span></button></li>`;
    return `<div class="gu-bar"><label class="tk-f"><span>Show</span><select data-change="guFilter" aria-label="Show proposals"><option value="pending"${U.filter === 'pending' ? ' selected' : ''}>Waiting for a decision (${all.filter(p => p.status === 'pending').length})</option><option value="done"${U.filter === 'done' ? ' selected' : ''}>Decided (${all.filter(p => p.status !== 'pending').length})</option><option value="all"${U.filter === 'all' ? ' selected' : ''}>All (${all.length})</option></select></label><span class="sp"></span>
      ${can() ? `<button class="btn sm" data-act="guAcceptSafe" ${safe ? '' : 'disabled'} title="Accepts additions and updates that are fully verified and do not touch manual wording">Accept ${safe} verified, no conflict</button><button class="btn sm" data-act="guRegen" title="Work out the proposals again against the guide as it is now. Manual wording is kept.">Regenerate proposals</button>` : ''}<button class="btn sm" data-act="guPreview">Preview guide</button></div>
      <div class="gu-grid"><ul class="gu-list" aria-label="Proposed changes">${list.length ? list.map(row).join('') : `<li class="tk-empty">${all.length ? 'Nothing waiting for a decision.' : 'The configuration needs no guide changes.'}</li>`}</ul>${sel ? propHtml(sel, r) : '<div class="gu-det tk-empty">Select a change to review it.</div>'}</div>`;
  }
  function propHtml(p, r) {
    const text = U.edits[p.id] != null ? U.edits[p.id] : p.after; const ed = can() && p.status === 'pending';
    const verdict = p.status !== 'pending' ? `<div class="gu-state">${p.status === 'accepted' ? 'Accepted' : 'Rejected'}${p.resolution ? ' · ' + esc({ proposed: 'proposed wording used', mine: 'your wording kept', edited: 'edited wording used', added: 'added to the guide', dismissed: 'dismissed' }[p.resolution] || p.resolution) : ''}</div>` : '';
    return `<section class="gu-det" aria-label="Change details"><header><span class="gu-ty t-${esc(p.type)}">${TL[p.type]}</span><h3>${esc(p.title)}</h3><p class="small muted">${p.secId ? 'Section: ' + esc(p.secTitle) : 'New section: ' + esc(p.secTitle)}</p></header>
      <p class="gu-why">${esc(p.reason)}</p>${p.conflict ? `<div class="notice warn"><div>${p.type === 'review' ? 'The guide has your own wording here.' : 'This text was edited by hand after it was generated.'} Choose which wording to keep; the guide is snapshotted first so you can restore it.</div></div>` : ''}
      ${p.findings && p.findings.length ? `<ul class="gu-find">${p.findings.map(f => `<li class="${esc(f.level)}"><b>${f.level === 'broken' ? 'Missing' : f.level === 'uncertain' ? 'Check' : 'Verified'}</b> ${esc(f.text)}</li>`).join('')}</ul>` : ''}
      <div class="gu-cols">${p.before || p.type === 'update' || p.type === 'remove' ? `<div><h4>In the guide now</h4><pre class="gu-pre">${esc(p.before || '(nothing)')}</pre></div>` : ''}${p.type !== 'remove' && !p.removalNote ? `<div><h4>${ed ? 'Proposed (you can edit it)' : 'Proposed'}</h4>${ed ? `<textarea class="gu-ta" data-gu="edit" data-id="${esc(p.id)}" rows="12" aria-label="Proposed wording">${esc(text)}</textarea>` : `<pre class="gu-pre">${esc(p.after)}</pre>`}</div>` : ''}</div>
      ${verdict}${ed ? `<div class="gu-acts">${p.type === 'remove' ? `<button class="btn primary" data-act="guDo" data-id="${esc(p.id)}" data-r="proposed">Remove from the guide</button>${p.conflict ? `<button class="btn" data-act="guDo" data-id="${esc(p.id)}" data-r="mine">Keep my wording</button>` : ''}` : p.removalNote ? `<button class="btn primary" data-act="guDo" data-id="${esc(p.id)}" data-r="dismissed">Mark as reviewed</button>` : p.type === 'review' ? `<button class="btn primary" data-act="guDo" data-id="${esc(p.id)}" data-r="added">Add the generated text below</button><button class="btn" data-act="guDo" data-id="${esc(p.id)}" data-r="dismissed">Keep my wording, dismiss</button>` : `<button class="btn primary" data-act="guDo" data-id="${esc(p.id)}" data-r="${U.edits[p.id] != null && U.edits[p.id] !== p.after ? 'edited' : 'proposed'}">${p.conflict ? 'Use proposed wording' : U.edits[p.id] != null && U.edits[p.id] !== p.after ? 'Accept edited text' : 'Accept'}</button>${p.conflict ? `<button class="btn" data-act="guDo" data-id="${esc(p.id)}" data-r="mine">Keep my wording</button>` : ''}`}<button class="btn" data-act="guReject" data-id="${esc(p.id)}">Reject</button></div>` : ''}</section>`;
  }
  function relationsHtml(r) {
    const nm = new Map(r.nodes.map(n => [n[0], n])); const q = U.q.trim().toLowerCase(); const lab = id => (nm.get(id) || [id, '', id])[2]; const ty = id => (nm.get(id) || [id, '', ''])[1];
    const rows = r.edges.filter(e => (U.conf === 'all' || e.level === U.conf) && (!q || (e.text + ' ' + lab(e.from) + ' ' + lab(e.to)).toLowerCase().includes(q)));
    return `<div class="gu-bar"><label class="tk-f"><span>Confidence</span><select data-change="guConf" aria-label="Confidence"><option value="all">All (${r.edges.length})</option><option value="verified"${U.conf === 'verified' ? ' selected' : ''}>Verified (${r.stats.verified})</option><option value="uncertain"${U.conf === 'uncertain' ? ' selected' : ''}>Uncertain (${r.stats.uncertain})</option></select></label><div class="tk-sw gu-q">${ico('search')}<input type="search" data-gu="q" value="${esc(U.q)}" placeholder="Filter by module, button, field…" aria-label="Filter relationships"></div></div>
      <p class="small muted gu-note">Verified means the configuration names the link directly. Uncertain means it is only suggested, for example a name that appears inside a script. Uncertain links are never written into the guide as fact.</p>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>From</th><th>Relationship</th><th>To</th><th>Evidence</th><th>Status</th></tr></thead><tbody id="guRel">${rows.slice(0, 300).map(e => `<tr><td>${esc(lab(e.from))}<div class="xs muted">${esc(ty(e.from))}</div></td><td>${esc(e.text)}</td><td>${esc(lab(e.to))}<div class="xs muted">${esc(ty(e.to))}</div></td><td class="small">${esc(e.evidence)}</td><td class="nw">${e.level === 'verified' ? tag('green', 'Verified') : r.reviews[e.id] ? tag(r.reviews[e.id] === 'confirmed' ? 'blue' : 'tbc', r.reviews[e.id] === 'confirmed' ? 'Confirmed by reviewer' : 'Dismissed') : `${tag('tbc', 'Uncertain')}${can() ? `<div><button class="lnk" data-act="guEdge" data-id="${esc(e.id)}" data-r="confirmed">Confirm</button> · <button class="lnk" data-act="guEdge" data-id="${esc(e.id)}" data-r="dismissed">Dismiss</button></div>` : ''}`}</td></tr>`).join('') || '<tr><td colspan="5" class="tk-empty">No relationships match.</td></tr>'}</tbody></table></div>${rows.length > 300 ? `<p class="xs muted">Showing the first 300 of ${rows.length}. Narrow the filter to see the rest.</p>` : ''}`;
  }
  function validationHtml(r) {
    const gaps = r.gaps || []; const f = r.findings; const pre = G.validate(W(), { items: r.items, findings: r.findings }, r.proposals);
    const sec = (title, rows, empty) => `<div class="card gu-card"><div class="card-h"><h3>${title}</h3></div>${rows.length ? `<ul class="gu-find">${rows.join('')}</ul>` : `<p class="small muted" style="padding:12px 16px">${empty}</p>`}</div>`;
    return `${sec('Before you publish (' + pre.length + ')', pre.map(x => `<li class="${x.sev === 'high' ? 'broken' : x.sev === 'medium' ? 'uncertain' : 'verified'}"><b>${esc(x.sev)}</b> ${esc(x.what)} <span class="muted">${esc(x.area)}. ${esc(x.detail)}</span></li>`), 'No blocking findings in the guide text or the review.')}
      ${sec('Configuration findings (' + f.length + ')', f.map(x => `<li class="${esc(x.level)}"><b>${x.level === 'broken' ? 'Missing' : 'Check'}</b> ${esc(x.text)}</li>`), 'Every reference in the package resolved.')}
      ${gaps.length ? sec('Gaps reported while reading the package (' + gaps.length + ')', gaps.map(g => `<li class="${g.severity === 'high' ? 'broken' : 'uncertain'}"><b>${esc(g.area)}</b> ${esc(g.item)}: ${esc(g.detail)}</li>`), '') : ''}`;
  }
  function html() {
    const r = current(); const g = W(); if (!g) return '';
    const done = r && !r.closed && r.proposals.every(p => p.status !== 'pending');
    return `<div class="gu">${dropHtml()}${r ? `${summaryHtml(r)}${subtabs(r)}<div class="gu-body">${U.tab === 'changes' ? changesHtml(r) : U.tab === 'relations' ? relationsHtml(r) : validationHtml(r)}</div>
      <div class="gu-foot"><span class="small muted">${r.closed ? 'Review finished ' + esc(when(r.closedAt)) + '. This configuration is now the baseline for the next upload.' : r.proposals.filter(p => p.status === 'pending').length + ' waiting for a decision'}</span><span class="sp"></span>${can() && !r.closed ? `<button class="btn" data-act="guSaveVer">Save version</button><button class="btn" data-act="guFinish">Finish review</button>` : ''}${V.ugCtx.canApprove() && g.status !== 'approved' ? `<button class="btn primary" data-act="ugDecide" data-d="approve" ${done || r.closed ? '' : 'title="Some changes are not decided yet"'}>Publish (approve guide)</button>` : ''}</div>` : `<div class="gu-empty"><h3>No configuration analysed yet</h3><p class="muted">Upload the ZIP exported from the customer organisation. The analysis lists modules, custom fields, buttons, automations, notifications and how they depend on each other, then proposes only the guide sections that need to change. ${(runs().length === 0 && S.baseline && F.doc('config').source === 'imported') ? 'This project already has a loaded package, which is used as the earlier configuration.' : 'With no earlier configuration, everything found is proposed as new.'}</p></div>`}</div>`;
  }

  // ---------- versions ----------
  const versions = () => I().list('ugv').filter(v => v.guideId === gid()).sort((a, b) => String(b.at).localeCompare(String(a.at)));
  async function snapshot(label, summary) { const g = W(); const id = I().uid('ugv'); await I().put('ugv', id, { guideId: gid(), label, summary: summary || '', at: new Date().toISOString(), by: S.user.name || S.user.email, title: g.title, status: g.status, sections: JSON.parse(JSON.stringify(g.sections)) }, { silent: true }); return id; }
  function versionsHtml() {
    const g = W(); if (!g) return ''; const vs = versions();
    return `<div class="card"><div class="card-h"><h3>Version history (${vs.length})</h3>${can() ? `<button class="btn sm" data-act="guSaveVer">Save version</button>` : ''}</div>${vs.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Version</th><th>Saved</th><th>By</th><th>Sections</th><th>What changed</th><th></th></tr></thead><tbody>${vs.map(v => `<tr><td><b>${esc(v.label)}</b></td><td class="small">${esc(when(v.at))}</td><td class="small">${esc(v.by || '')}</td><td>${(v.sections || []).length}</td><td class="small">${esc(v.summary || '')}</td><td class="nw"><button class="btn sm ghost" data-act="guCompare" data-id="${esc(v.id)}">Compare</button>${can() ? ` <button class="btn sm" data-act="guRestore" data-id="${esc(v.id)}">Restore</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : `<p class="small muted" style="padding:14px 16px">No versions yet. A version is saved automatically before configuration changes are applied or a version is restored, and you can save one at any time.</p>`}</div>`;
  }
  function compare(a, b) { const am = new Map(a.map(s => [s.id, s])), bm = new Map(b.map(s => [s.id, s])); const txt = s => s.blocks.map(x => x.t === 'md' ? x.text : '[image]').join('\n'); const out = []; b.forEach(s => { const o = am.get(s.id); if (!o) out.push(['added', s.title]); else if (txt(o) !== txt(s) || o.title !== s.title) out.push(['changed', s.title]); }); a.forEach(s => { if (!bm.has(s.id)) out.push(['removed', s.title]); }); return out; }

  // ---------- actions ----------
  ACT.guPick = async () => { const f = (await V.pickFile('.zip'))[0]; if (f) analyseFile(f); };
  ACT.guTab = a => { U.tab = a.getAttribute('data-v'); V.render(); };
  ACT.guSel = a => { U.sel = a.getAttribute('data-id'); V.render(); };
  ACT.guFilter = el => { U.filter = el.value; U.sel = null; V.render(); };
  ACT.guConf = el => { U.conf = el.value; V.render(); };
  ACT.guEdge = a => { U.run.reviews[a.getAttribute('data-id')] = a.getAttribute('data-r'); saveRun(); V.render(); };
  async function decide(p, status, resolution, text) {
    const r = U.run; if (!r.snapId && status === 'accepted') r.snapId = await snapshot('Before changes from ' + r.fileName, 'Saved automatically before configuration changes were applied.');
    let how = ''; if (status === 'accepted') V.ugCtx.edit(() => { how = G.apply(W(), p, resolution, text); });
    p.status = status; p.resolution = resolution; p.decidedAt = new Date().toISOString(); p.decidedBy = S.user.name || S.user.email; delete U.edits[p.id]; return how;
  }
  ACT.guDo = a => V.busy(a, async () => { const p = U.run.proposals.find(x => x.id === a.getAttribute('data-id')); if (!p) return; const res = a.getAttribute('data-r'); if (p.uncertain && !(await confirmDialog('Partly verified', 'Part of this change could not be verified from the configuration. Add it to the guide anyway?', 'Add it'))) return; await decide(p, res === 'dismissed' ? 'rejected' : 'accepted', res, U.edits[p.id]); await saveRun(); toast(res === 'mine' ? 'Kept your wording' : res === 'dismissed' ? 'Dismissed' : 'Applied to the guide'); advance(p); V.render(); });
  ACT.guReject = a => V.busy(a, async () => { const p = U.run.proposals.find(x => x.id === a.getAttribute('data-id')); await decide(p, 'rejected', '', ''); await saveRun(); toast('Rejected. The guide is unchanged.'); advance(p); V.render(); });
  const advance = p => { const nx = U.run.proposals.find(x => x.status === 'pending'); U.sel = nx ? nx.id : p.id; };
  ACT.guAcceptSafe = a => V.busy(a, async () => { const ps = U.run.proposals.filter(p => p.status === 'pending' && !p.conflict && !p.uncertain && p.type !== 'review'); for (const p of ps) await decide(p, 'accepted', 'proposed', ''); await saveRun(); toast(ps.length + ' change' + (ps.length > 1 ? 's' : '') + ' applied'); V.render(); });
  ACT.guRegen = a => V.busy(a, async () => {
    const r = U.run; const done = new Map(r.proposals.filter(p => p.status !== 'pending').map(p => [p.key, p])); const items = r.items.map(withMd); const bm = new Map(items.map(i => [i.key, i]));
    const d = G.diff(r.baseline, items); const mods = {}; items.forEach(i => { if (i.module) mods[i.module] = { label: i.moduleLabel }; });
    const fresh = G.propose(W(), d, mods).filter(p => !done.has(p.key) || done.get(p.key).hash !== p.hash); r.proposals = Array.from(done.values()).concat(fresh); U.sel = (fresh[0] || {}).id || null; await saveRun(); toast(fresh.length + ' proposal' + (fresh.length === 1 ? '' : 's') + ' waiting. Your edits to the guide were kept.'); V.render();
  });
  ACT.guFinish = async () => {
    const r = U.run; const pend = r.proposals.filter(p => p.status === 'pending'); if (pend.length && !(await confirmDialog('Finish review', pend.length + ' change' + (pend.length > 1 ? 's are' : ' is') + ' still undecided. They stay proposed the next time you upload a package. Finish anyway?', 'Finish'))) return;
    const prev = new Map((r.baseline || []).map(i => [i.key, i])); const undecided = new Set(pend.map(p => p.key)); const base = r.items.map(i => undecided.has(i.key) ? prev.get(i.key) : i).filter(Boolean); (r.baseline || []).forEach(i => { if (undecided.has(i.key) && !base.some(b => b.key === i.key)) base.push(i); });
    const ac = r.proposals.filter(p => p.status === 'accepted'), rj = r.proposals.filter(p => p.status === 'rejected'); const sum = ac.length + ' accepted (' + ['add', 'update', 'remove'].map(t => ac.filter(p => p.type === t).length + ' ' + t.replace('add', 'added').replace('update', 'updated').replace('remove', 'removed')).join(', ') + '), ' + rj.length + ' rejected, ' + pend.length + ' undecided.';
    r.baseline = base; r.closed = true; r.closedAt = new Date().toISOString(); r.summary = sum; await saveRun(); await snapshot('After changes from ' + r.fileName, sum); toast('Review finished. Version saved.'); V.render();
  };
  ACT.guSaveVer = () => { drawer('Save version', `<div class="fgrid"><div class="full"><label class="f" for="gvL">Name</label><input id="gvL" type="text" maxlength="80" placeholder="e.g. Approved by customer, May"></div><div class="full"><label class="f" for="gvS">What changed (optional)</label><textarea id="gvS" rows="3"></textarea></div></div>`, `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="guSaveVerGo">Save version</button>`); };
  ACT.guSaveVerGo = a => V.busy(a, async () => { const l = document.getElementById('gvL').value.trim(); if (!l) { toast('Give the version a name', 4000, true); return; } await V.ugCtx.flush(); await snapshot(l, document.getElementById('gvS').value.trim()); closeDrawer(); toast('Version saved'); V.render(); });
  ACT.guCompare = a => { const v = I().get('ugv', a.getAttribute('data-id')); if (!v) return; const d = compare(v.sections, W().sections); drawer('Compare with ' + v.label, `<p class="small muted">Sections as they were in this version against the guide now.</p>${d.length ? `<ul class="gu-find">${d.map(([k, t]) => `<li class="${k === 'removed' ? 'broken' : k === 'added' ? 'verified' : 'uncertain'}"><b>${k === 'added' ? 'Added since' : k === 'removed' ? 'Removed since' : 'Changed since'}</b> ${esc(t)}</li>`).join('')}</ul>` : '<p>No differences.</p>'}`); };
  ACT.guRestore = a => V.busy(a, async () => { const v = I().get('ugv', a.getAttribute('data-id')); if (!v || !(await confirmDialog('Restore version', 'Replace the current guide content with “' + v.label + '”? The current content is saved as a version first.', 'Restore'))) return; await V.ugCtx.flush(); await snapshot('Before restoring ' + v.label, 'Saved automatically.'); V.ugCtx.edit(() => { const g = W(); g.sections = JSON.parse(JSON.stringify(v.sections)); }); U.runFor = null; toast('Restored “' + v.label + '”'); V.render(); });
  ACT.guPreview = () => { const g = W(); const md = t => esc(t).replace(/^### (.*)$/gm, '<h4>$1</h4>').replace(/^## (.*)$/gm, '<h3>$1</h3>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/^- (.*)$/gm, '<li>$1</li>').replace(/(<li>[\s\S]*?<\/li>)(?!\n<li>)/g, '<ul>$1</ul>').replace(/\n/g, '<br>'); drawer('Guide preview', `<div class="gu-prev">${g.sections.map(s => `<h2>${esc(s.title)}</h2>${s.blocks.map(b => b.t === 'md' ? `<div class="gu-pb${b.gen ? ' gen' : ''}">${md(b.text)}</div>` : '<p class="muted">[Screenshot]</p>').join('')}`).join('')}</div>`, `<button class="btn" data-act="closeDrawer">Close</button>`, { wide: true }); };

  // typing and dropping
  document.addEventListener('input', e => { const el = e.target; const k = el.getAttribute && el.getAttribute('data-gu'); if (!k) return; if (k === 'edit') U.edits[el.getAttribute('data-id')] = el.value; else if (k === 'q') { U.q = el.value; const keep = el.selectionStart; V.render(); const n = document.querySelector('[data-gu=q]'); if (n) { n.focus(); try { n.setSelectionRange(keep, keep); } catch (x) { } } } });
  document.addEventListener('dragover', e => { const d = e.target.closest && e.target.closest('#guDrop'); if (d) { e.preventDefault(); if (!U.drag) { U.drag = true; d.classList.add('drag'); } } });
  document.addEventListener('dragleave', e => { const d = e.target.closest && e.target.closest('#guDrop'); if (d) { U.drag = false; d.classList.remove('drag'); } });
  document.addEventListener('drop', e => { const d = e.target.closest && e.target.closest('#guDrop'); if (!d) return; e.preventDefault(); U.drag = false; const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) analyseFile(f); });

  // findings that belong in the guide's own Quality checks tab
  function checks(g) { const r = U.runFor === gid() ? U.run : null; if (!r) return []; return G.validate(g, { items: r.items, findings: r.findings }, r.proposals).map(x => ({ sev: x.sev, area: 'Configuration update', item: x.what, detail: x.detail })); }
  V.guideUpdate = { html, versionsHtml, checks, mount() { }, _U: U };
})(typeof window !== 'undefined' ? window : globalThis);

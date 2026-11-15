/* Stage 8, Solution document (user, 16 Nov 2026: "use the BRD Draft editor, but don't merge them"): the Solution document page in Project handover runs the
   BRD Draft editor itself (src/brdview.js on the engine in src/brd.js), on its own store, F.doc('soldocs'), switched by src/brd.js isSol() while this page is
   open. So a solution document is drafted exactly like a BRD: Word-like pages, cover, logos, contents, in-place editing, "Add below", sections and options,
   version and approvals, import, Word and PDF export, several documents per project (whole solution, an integration, a set of modules). BRDs are untouched.
   Above the editor: what Claude reads (Facilio Org ID and region, the org package) and Write with Claude: a build_solution_doc job; Claude saves the
   document with save_draft task soldoc and it comes in as its own document in the list (your edited documents are never overwritten).
   Pure rules are V.soldocLogic (tests/soldoc.mjs). */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items;
  const ID_LINE = /^\s*Solution document id:\s*(\S+)\s*$/m;
  const REGIONS = ['AE', 'US', 'UK', 'SA', 'EU'];

  // ---------- pure ----------
  /** Claude's Markdown -> editor blocks (headings, paragraphs, bullets, tables). The "# Title" line and the id line are dropped: the title is the document's name. */
  function mdToBlocks(md) {
    const L = String(md || '').replace(ID_LINE, '').split(/\r?\n/); const out = []; let para = [], items = [], rows = [];
    const cells = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim().replace(/\*\*(.+?)\*\*/g, '$1'));
    const fp = () => { if (para.length) out.push({ t: 'p', text: para.join(' ').replace(/\*\*(.+?)\*\*/g, '$1') }); para = []; };
    const fi = () => { if (items.length) out.push({ t: 'ul', items }); items = []; };
    const ft = () => { if (rows.length) { const cols = Math.max(...rows.map(r => r.length)); const pad = r => { while (r.length < cols) r.push(''); return r; }; out.push({ t: 'table', headers: pad(rows[0]), rows: rows.slice(1).map(pad) }); } rows = []; };
    let first = true;
    L.forEach(l => { const s = l.trim(); let m;
      if (/^\|.*\|$/.test(s)) { fp(); fi(); if (!/^\|[\s:|-]+\|$/.test(s)) rows.push(cells(s)); return; } ft();
      if (!s) { fp(); fi(); return; }
      if ((m = s.match(/^(#{1,6})\s+(.*)/))) { fp(); fi(); if (first && m[1].length === 1) { first = false; return; } first = false; out.push({ t: 'h', lvl: Math.max(1, Math.min(3, m[1].length - 1)), text: m[2].replace(/\*\*/g, '') }); return; }
      first = false;
      if ((m = s.match(/^(?:[-*•]|\d+[.)])\s+(.*)/))) { fp(); items.push(m[1].replace(/\*\*(.+?)\*\*/g, '$1')); return; }
      fi(); para.push(s); });
    fp(); fi(); ft(); return out;
  }
  /** the editor says "BRD"; on this page it says "solution document" */
  const swap = s => typeof s !== 'string' ? s : s.replace(/Business Requirements? Document/g, 'Solution Document').replace(/\bBRDs\b/g, 'solution documents').replace(/\bBRD\b/g, 'solution document')
    .replace(/(^|[>.!?]\s*|“|")solution document/g, (m, p) => p + 'Solution document');
  V.soldocLogic = { mdToBlocks, swap, ID_LINE };
  V.wordSwap = s => (S.ui && S.ui.view === 'soldoc' ? swap(s) : s);   // used by drawers, confirm boxes and toasts (src/shell.js)

  // ---------- page ----------
  const R = () => root.FWBBrd;
  const can = () => !V.isCustomer() && !S.readonly && !(S.project && S.project.role === 'viewer');
  const pkg = () => (I().get('close', 'soldoc') || {}).file || null;
  const job = () => { const J = V.studioJobs, L = root.FWBKickoffLogic; const k = J && J.K ? J.K() : null; return k && Array.isArray(k.jobs) && L ? L.jobRows(k.jobs).find(j => j.kind === 'build_solution_doc') : null; };
  const used = () => { const d = F.doc('soldocs') || (S.docs.soldocs.data = {}); return Array.isArray(d.claudeUsed) ? d.claudeUsed : (d.claudeUsed = []); };
  const drafts = () => I().list('ai').filter(x => x.task === 'soldoc' && x.status !== 'rejected' && !used().includes(x.id)).sort((a, b) => String(b._created || '').localeCompare(String(a._created || '')));

  function strip() {
    const p = S.ws.project || {}, f = pkg(), j = job(), dr = drafts()[0], ro = !can();
    const st = j && j.status !== 'done' ? '<div class="sd-note">' + (j.status === 'failed' ? '<b>Claude could not finish:</b> ' + esc(j.summary || '') : j.status === 'needs_input' ? '<b>Claude has questions.</b> Answer them in the assistant.' : '<b>' + esc(j.statusLabel || 'Working') + '.</b> Claude is writing the solution document; follow it in the assistant.') + '</div>' : '';
    const ready = dr ? '<div class="sd-note sd-ready"><span><b>Claude’s solution document is ready</b> (' + esc(String(dr._created || '').slice(0, 10)) + '). It comes in as its own document in the list below, so nothing you edited is overwritten.</span>' + (ro ? '' : '<span class="sd-ready-b"><button type="button" class="btn primary sm" data-act="sdUse" data-id="' + esc(dr.id) + '">Bring it in</button><button type="button" class="btn sm" data-act="sdUseNo" data-id="' + esc(dr.id) + '">Not now</button></span>') + '</div>' : '';
    const chip = (on, t) => '<span class="sd-src' + (on ? ' on' : '') + '">' + (on ? '✓ ' : '') + t + '</span>';
    return '<div class="card sd-strip"><div class="sd-strip-in"><div class="sd-org"><div><label class="f">Facilio Org ID</label>' + V.inp('project.orgId', 'For example 400000077') + '</div><div><label class="f">Region</label>' + V.sel('project.facilioRegion', [{ v: '', l: 'Choose' }].concat(REGIONS), p.facilioRegion || '', 'aria-label="Facilio region"' + (ro ? ' disabled' : '')) + '</div></div>'
      + '<div class="sd-chips">' + chip(!!f, f ? 'Org package: ' + esc(f.name) : 'No org package') + chip(!!String(p.orgId || '').trim(), 'Org ID') + chip((S.ws.requirements || []).length > 0, 'Requirements') + chip(F.doc('config').source === 'imported', 'Imported configuration') + '</div>'
      + (ro ? '' : '<div class="sd-acts"><button type="button" class="btn sm" data-act="shPkg">' + (f ? 'Use another org package' : 'Add the org package') + '</button><button type="button" class="btn primary sm" data-act="sdClaude">Write with Claude</button></div>') + '</div>'
      + '<p class="xs muted" style="margin:6px 0 0">Claude reads the org’s configuration (the org package, or the live org by its ID and region, read only) with the facilio-solution-document-builder skill, and the BRD for wording.</p>' + st + ready + '</div>';
  }
  V.soldoc = { html() {
    const head = '<div class="page-header"><div class="t"><h1>Solution document</h1><p>The client-ready description of what was built, drafted like the BRD: every module with its flows, fields, rules and roles. Edit any text on the page; export to Word or PDF.</p></div></div>';
    if (V.isCustomer()) return head + '<div class="page-body"><div class="empty">The team shares the solution document when it is approved.</div></div>';
    if (!V.brd || !R()) return head + '<div class="page-body"><div class="empty">Loading…</div></div>';
    I().load(['ai', 'close']);
    // the wording swap stays out of the pages themselves: editing a paragraph saves what is on the page, and the document's own text must not change
    const h = V.brd.html(), i = h.indexOf('<div class="paper-scroll"'), cut = i < 0 ? h.length : i;
    return head + '<div class="page-body sd-wrap">' + strip() + swap(h.slice(0, cut)).replace(/data-task="brd"/g, 'data-task="soldoc"') + h.slice(cut) + '</div>';
  }, mount() { if (V.brd && V.brd.mount) V.brd.mount(); I().load(['ai', 'close']); if (V.studioJobs) { V.studioJobs.load(false); if (V.studioJobs.poll) V.studioJobs.poll(); } } };
  V.extraSections = (V.extraSections || []).concat(['soldocs']);   // loaded with the project's other documents

  // ---------- actions ----------
  ACT.sdClaude = a => V.busy(a, async () => { if (!can()) return; const J = V.studioJobs; if (!J || J.guard()) return; const p = S.ws.project || {}; const f = pkg();
    if (!f && !String(p.orgId || '').trim()) { V.toast('Add the org package or the Facilio Org ID first, so Claude can read the configuration.', 7000, true); return; }
    const rec = R().activeRec(); const T = R().TYPES[rec.type] || {}; const mods = (rec.modules || []).join(', ');
    const scope = T.integ ? 'integration' + (rec.system ? ' with ' + rec.system : '') + (mods ? ' (modules: ' + mods + ')' : '') : mods ? 'modules: ' + mods : 'the whole solution';
    const r = await J.post('/jobs', { kind: 'build_solution_doc', section: rec.id, ref: f ? f.id : '', note: (rec.name + ' (' + scope + ')' + (f ? '; package ' + f.name : '; org ' + p.orgId + (p.facilioRegion ? ' ' + p.facilioRegion : ''))).slice(0, 600) });
    V.toast(r.duplicate ? 'That request is already waiting.' : 'Sent to Claude. The document comes back here; follow it in the assistant.', 7000); J.load(true); if (V.asstRequested) V.asstRequested(); V.render(); });
  ACT.sdUse = a => V.busy(a, async () => { if (!can()) return; const x = I().list('ai').find(y => y.id === a.getAttribute('data-id')); if (!x || !V.brdImportCreate) return;
    const blocks = mdToBlocks(x.content); used().push(x.id); const t = (String(x.content || '').match(/^#\s+(.+)$/m) || [])[1];
    V.brdImportCreate((t || 'Solution Document') + ' (Claude, ' + String(x._created || '').slice(0, 10) + ')', blocks); });
  ACT.sdUseNo = a => { if (!can()) return; used().push(a.getAttribute('data-id')); F.changed('Solution document', 'Claude draft set aside', { section: 'soldocs' }); V.render(); };
})(typeof window !== 'undefined' ? window : globalThis);

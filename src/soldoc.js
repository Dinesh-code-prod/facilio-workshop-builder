/* Stage 8, Solution document (user, 15 Nov 2026): a page of its own in Project handover, drafted like the BRD. A project can keep several
   documents: the whole solution, one for selected modules, or one for an integration. Each is a list of sections (Markdown) stored as a
   record of kind "sdoc" (team only). Three ways in: "Draft from the studio" fills the sections from the BRD, requirements, SLA matrix, KPIs and
   connected apps; "Write with Claude" sends a build_solution_doc job (the facilio-solution-document-builder skill reads the org package or the
   org's configuration by its Org ID and region, then saves the document back with save_draft task soldoc); "Import" reads a Word, text or
   Markdown file. A section a person edited is never overwritten: new text from Claude waits on it as a proposal. Export is Word (the Facilio
   document format of V.mdDocx) or Markdown. Pure rules are V.soldocLogic (tests/soldoc.mjs). */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items;
  const TBC = '[To be confirmed]';
  const KIND = { full: ['Whole solution', 'Every module in scope, then SLA, integrations, reports and roles'], modules: ['Selected modules', 'Only the modules you pick'], integration: ['Integration', 'One connected system: purpose, data, triggers, errors, security'] };
  const MODSECS = [['Use Case', ''], ['Functional Requirements', ''], ['Implemented Process Flow', 'from the state flow in the org configuration'], ['State Flow Details', 'statuses, transitions, who can press each one'], ['Provided Solution', 'one item per requirement'], ['Field List', 'from the forms in the org configuration'], ['Workflows & Automations', 'rules, notifications, scheduled actions'], ['Limitations & Considerations', '']];
  const INTSECS = ['Overview', 'Systems and Direction', 'Data Exchanged', 'Triggers and Frequency', 'Error Handling and Retries', 'Security and Access', 'Limitations & Considerations'];
  const ID_LINE = /^\s*Solution document id:\s*(sd_[A-Za-z0-9_-]+)\s*$/m;
  const REGIONS = ['AE', 'US', 'UK', 'SA', 'EU'];

  // ---------- pure ----------
  const sid = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const sec = (title, lvl, md, src) => ({ id: sid(), title, lvl, md: md || '', src: src || 'studio' });
  const tbcOf = hint => TBC + (hint ? ' (' + hint + ')' : '');
  const mdTable = (head, rows) => rows.length ? '| ' + head.join(' | ') + ' |\n|' + head.map(() => '---').join('|') + '|\n' + rows.map(r => '| ' + r.map(c => String(c == null ? '' : c).replace(/\|/g, '/').replace(/\n/g, ' ')).join(' | ') + ' |').join('\n') : '';
  /** Markdown -> sections. A text with one "# Title" on top (what toMd and Claude write) splits at ## and ###; any other text splits at # and ##. Text before the first heading becomes an Introduction section. */
  function toSections(md, src) {
    let lines = String(md || '').replace(ID_LINE, '').split(/\r?\n/);
    const first = lines.find(l => l.trim()) || ''; const shift = /^#\s/.test(first) && lines.filter(l => /^#\s/.test(l)).length === 1;
    if (shift) lines = lines.filter(l => l !== first);
    const re = shift ? /^(#{2,3})\s+(.*\S)\s*$/ : /^(#{1,2})\s+(.*\S)\s*$/; const out = []; let cur = null;
    lines.forEach(l => { const m = l.match(re);
      if (m) { cur = sec(m[2].replace(/^\d+(\.\d+)*\.?\s+/, ''), m[1].length - (shift ? 1 : 0), '', src); out.push(cur); return; }
      if (!cur) { if (!l.trim()) return; cur = sec('Introduction', 1, '', src); out.push(cur); }
      cur.md += l + '\n'; });
    out.forEach(s => { s.md = s.md.trim(); }); return out;
  }
  /** sections -> one Markdown text: "# Title", then ## for a section and ### for a sub-section */
  const toMd = (title, sections) => '# ' + title + '\n\n' + (sections || []).map(s => '#'.repeat(s.lvl === 1 ? 2 : 3) + ' ' + s.title + '\n\n' + (s.md || '').trim()).join('\n\n') + '\n';
  /** BRD blocks (FWBBrd.document().blocks) -> Markdown */
  function blocksToMd(blocks) {
    return (blocks || []).filter(b => b && !b.hiddenBlock).map(b => b.t === 'h' ? '#'.repeat(Math.min(3, b.lvl || 1)) + ' ' + b.text : b.t === 'p' ? (b.label ? '**' + b.label + '** ' : '') + (b.text || '') : b.t === 'ul' ? (b.items || []).map(x => '- ' + x).join('\n')
      : b.t === 'table' ? mdTable(b.headers || [], (b.rows || []).map(r => r && r.sub ? [r.sub].concat(Array(Math.max(0, (b.headers || []).length - 1)).fill('')) : r)) : b.t === 'figure' && b.caption ? '_Diagram: ' + b.caption + '_' : '').filter(Boolean).join('\n\n');
  }
  /** the H1 part of a Markdown text whose heading names the module (BRD module sections are "N. LABEL") */
  function partFor(md, label) {
    const want = String(label || '').toLowerCase(); let on = false; const out = [];
    for (const l of String(md || '').split('\n')) { const m = l.match(/^#\s+(?:\d+\.\s*)?(.*)/); if (m) { if (on) break; on = m[1].trim().toLowerCase() === want; continue; } if (on) out.push(l); }
    return out.join('\n').trim();
  }
  /** pure: the first sections of a document, from what the studio holds. ctx: { kind, modules:[{name,label}], app, project, brdMd, reqs, sla, kpis, apps } */
  function fromStudio(ctx) {
    const p = ctx.project || {}, out = []; const mods = ctx.modules || [];
    const info = [['Customer', p.client], ['Facilio org ID', p.orgId], ['Facilio region', p.facilioRegion], ['Project', p.name], ['Consultant', p.consultant], ['Project manager', p.pm], ['Implementation members', p.members], ['Version', p.version || 'V1.0'], ['Date', p.date]].map(r => [r[0], String(r[1] || '').trim() || TBC]);
    out.push(sec('Project Information', 1, mdTable(['Item', 'Detail'], info)));
    if (ctx.kind === 'integration') {
      const a = ctx.app || {}; const v = (x, h) => String(x || '').trim() || tbcOf(h);
      const body = { 'Overview': v(a.purpose, 'what the integration is for'), 'Systems and Direction': 'Facilio and ' + (a.app || 'the connected system') + '. ' + v(a.users, 'who uses it'), 'Data Exchanged': mdTable(['Direction', 'Data'], [['Into Facilio', v(a.dataIn)], ['Out of Facilio', v(a.dataOut)]]), 'Triggers and Frequency': v(a.trigger, 'what starts an exchange and how often') };
      INTSECS.forEach(t => out.push(sec(t, 1, body[t] || tbcOf())));
      return out;
    }
    out.push(sec('Background', 1, String(p.background || '').trim() || tbcOf('from the BRD introduction')));
    if (String(p.objective || '').trim()) out.push(sec('Business Objectives', 1, String(p.objective).trim()));
    out.push(sec('Introduction and Modules in Scope', 1, 'This document describes the Facilio solution configured for ' + (p.client || 'the customer') + '.\n\n' + (mods.length ? mods.map(m => '- ' + m.label).join('\n') : tbcOf('the modules in scope'))));
    const brdOf = (...ts) => ts.map(t => partFor(ctx.brdMd, t)).find(Boolean) || '';   // the BRD's own text for a section of the same name
    out.push(sec('Key Terms', 1, tbcOf('terms the customer uses')));
    out.push(sec('User Roles & Responsibilities', 1, brdOf('User Roles & Responsibilities') || tbcOf('from the roles in the org configuration')));
    mods.forEach(m => {
      out.push(sec(m.label, 1, ''));
      const brd = partFor(ctx.brdMd, m.label); const purpose = brd ? brd.split(/\n(?=#{2,3}\s)/).map(x => x.replace(/^#{2,3}\s.*\n?/, '').trim()).find(Boolean) || '' : '';
      const rq = (ctx.reqs || []).filter(r => r && !/^(rejected|deferred|superseded|removed|merged|cancelled|withdrawn)$/i.test(r.status || '') && [].concat(r.modules || r.module || []).includes(m.name));
      MODSECS.forEach(([t, hint]) => out.push(sec(t, 2, t === 'Use Case' ? (purpose || tbcOf('what the module is used for')) : t === 'Functional Requirements' ? (rq.length ? mdTable(['Req ID', 'Requirement', 'Status'], rq.map(r => [r.id, r.title, r.status || 'Draft'])) : tbcOf('no requirement recorded for this module')) : tbcOf(hint))));
    });
    if (ctx.kind === 'full') {
      const ml = n => (!n || n === '*') ? 'General (all modules)' : ((mods.find(m => m.name === n) || {}).label || n);
      out.push(sec('SLA & Notifications', 1, (ctx.sla || []).length ? mdTable(['Module', 'Priority', 'Response within', 'Resolution within', 'Business hours'], ctx.sla.map(r => [ml(r.module), r.priority, r.response, r.resolution, r.hours || ''])) : brdOf('SLA & Notifications', 'SLA Matrix') || tbcOf('no SLA matrix recorded')));
      if ((ctx.apps || []).length) out.push(sec('Integrations', 1, mdTable(['System', 'Purpose', 'Trigger', 'Data in', 'Data out'], ctx.apps.map(a => [a.app, a.purpose, a.trigger, a.dataIn, a.dataOut]))));
      out.push(sec('Reports and Dashboards', 1, (ctx.kpis || []).length ? mdTable(['KPI', 'Module', 'Frequency', 'Target', 'How Facilio delivers it'], ctx.kpis.map(k => [k.name, k.module, k.frequency, k.target, k.solution])) : tbcOf('dashboards and reports in the org configuration')));
      out.push(sec('Role Matrix – Module Access', 1, brdOf('Role Matrix – Module Access', 'Role Matrix — Module Access') || tbcOf('from the roles in the org configuration')));
    }
    return out;
  }
  /** pure: bring new sections into a document. A section a person edited keeps its text and gets the new one as a proposal; others are replaced; new titles are added after the last matched one */
  function merge(cur, incoming) {
    // a sub-section is matched inside its own section ("Use Case" of Clients is not "Use Case" of Service Request)
    const keys = list => { let parent = ''; return list.map(s => { const t = String(s.title).toLowerCase(); if (s.lvl === 1) parent = t; return (s.lvl === 1 ? '' : parent + '>') + s.lvl + ':' + t; }); };
    const out = (cur || []).map(s => Object.assign({}, s)); const inKeys = keys(incoming || []); let last = out.length - 1, seen = false;
    (incoming || []).forEach((n, j) => { const i = keys(out).indexOf(inKeys[j]);
      if (i < 0) { const at = seen ? last + 1 : out.length; out.splice(at, 0, Object.assign({}, n)); last = at; seen = true; return; } last = i; seen = true;
      if (out[i].edited) { if ((out[i].md || '').trim() !== (n.md || '').trim()) out[i].proposal = { md: n.md, src: n.src }; }
      else { out[i] = Object.assign({}, out[i], { md: n.md, src: n.src }); delete out[i].proposal; } });
    return out;
  }
  const open = sections => (sections || []).filter(s => /\[To be confirmed/.test(s.md || '')).length;
  V.soldocLogic = { toSections, toMd, blocksToMd, partFor, fromStudio, merge, open, ID_LINE, KIND };

  // ---------- page ----------
  const can = () => !V.isCustomer() && !S.readonly && !(S.project && S.project.role === 'viewer');
  const docs = () => I().list('sdoc').sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  const cur = () => { const l = docs(); return l.find(d => d.id === S.ui.sdId) || l[0] || null; };
  const save = async (d, what) => { d.updatedAt = new Date().toISOString(); d.by = (S.user && (S.user.name || S.user.email)) || ''; await I().put('sdoc', d.id, d); if (what && F.changed) F.changed('Solution document', d.title + ': ' + what, { render: false }); V.render(); };
  const mods = () => (F.allModules ? F.allModules() : []).filter(m => m.inScope).map(m => ({ name: m.name, label: m.label }));
  const apps = () => I().list('capp').filter(x => x && x.app);
  const brdMd = () => { try { const B = root.FWBBrd; return B && B.document ? blocksToMd(B.document().blocks) : ''; } catch (e) { return ''; } };
  const pkg = () => (I().get('close', 'soldoc') || {}).file || null;
  const claudeDrafts = d => I().list('ai').filter(x => { if (x.task !== 'soldoc' || x.status === 'rejected' || (d.used || []).includes(x.id)) return false; const m = String(x.content || '').match(ID_LINE); return !m || m[1] === d.id; }).sort((a, b) => String(b._created || '').localeCompare(String(a._created || '')));
  const job = () => { const J = V.studioJobs, L = root.FWBKickoffLogic; const k = J && J.K ? J.K() : null; return k && Array.isArray(k.jobs) && L ? L.jobRows(k.jobs).find(j => j.kind === 'build_solution_doc') : null; };
  const kb = n => Math.max(1, Math.round((n || 0) / 1000)) + ' KB';

  function sourcesCard() {
    const p = S.ws.project || {}; const ok = (on, t) => '<span class="sd-src' + (on ? ' on' : '') + '">' + (on ? '✓ ' : '') + t + '</span>'; const f = pkg();
    return '<div class="card sd-sources"><div class="card-h"><h3>What Claude reads</h3></div><div class="card-b">'
      + '<div class="sd-org"><div><label class="f">Facilio Org ID</label>' + V.inp('project.orgId', 'For example 400000077') + '</div><div><label class="f">Facilio region</label>' + V.sel('project.facilioRegion', [{ v: '', l: 'Choose' }].concat(REGIONS), p.facilioRegion || '', 'aria-label="Facilio region"' + (can() ? '' : ' disabled')) + '</div></div>'
      + '<p class="xs muted" style="margin:6px 0 10px">With the Org ID and region, Claude reads the live configuration through the Facilio connector (read only). The same fields are in Project Settings.</p>'
      + '<div class="sd-chips">' + ok(!!f, f ? 'Org package: ' + esc(f.name) : 'No org package') + ok((S.ws.requirements || []).length > 0, 'BRD and requirements') + ok((S.ws.slaMatrix || []).length > 0, 'SLA matrix') + ok(I().list('kpi').length > 0, 'KPIs') + ok(apps().length > 0, 'Connected apps') + ok(F.doc('config').source === 'imported', 'Imported configuration') + '</div>'
      + (can() ? '<button type="button" class="btn sm" style="margin-top:10px" data-act="shPkg">' + (f ? 'Use another org package' : 'Add the org package (.zip)') + '</button>' : '') + '<p class="xs muted" style="margin:8px 0 0">The configuration is the authority; the BRD gives the wording.</p></div></div>';
  }
  function secHtml(s) {
    const ed = S.ui.sdEdit === s.id, ro = !can(); const tb = /\[To be confirmed/.test(s.md || ''); const H = s.lvl === 1 ? 'h2' : 'h3';
    const head = '<div class="sd-sh"><' + H + '>' + esc(s.title) + '</' + H + '>' + (tb ? '<span class="tag tbc">To be confirmed</span>' : '') + (s.src === 'claude' ? '<span class="tag low">Claude</span>' : s.src === 'import' ? '<span class="tag low">Imported</span>' : '')
      + (ro || ed ? '' : '<span class="sd-acts"><button type="button" class="btn sm" data-act="sdEdit" data-id="' + s.id + '" aria-label="Edit ' + esc(s.title) + '">Edit</button><button type="button" class="btn sm" data-act="sdDel" data-id="' + s.id + '" aria-label="Remove ' + esc(s.title) + '">Remove</button></span>') + '</div>';
    const body = ed ? '<textarea id="sd_ta" rows="' + Math.min(24, Math.max(6, (s.md || '').split('\n').length + 2)) + '" aria-label="' + esc(s.title) + '">' + esc(s.md || '') + '</textarea><div class="row" style="gap:8px;margin-top:8px;align-items:center"><button type="button" class="btn primary sm" data-act="sdSave" data-id="' + s.id + '">Save</button><button type="button" class="btn sm" data-act="sdCancel">Cancel</button><span class="xs muted">Markdown: ### heading, - bullet, | table |</span></div>'
      : (s.md ? '<div class="sd-md">' + V.md(s.md) + '</div>' : '');
    const prop = s.proposal ? '<div class="sd-prop"><b>Claude proposes new text for this section</b> <span class="small muted">(your edits were kept)</span><div class="sd-md">' + V.md(s.proposal.md) + '</div>' + (ro ? '' : '<div class="row" style="gap:8px"><button type="button" class="btn primary sm" data-act="sdProp" data-id="' + s.id + '" data-v="1">Use the new text</button><button type="button" class="btn sm" data-act="sdProp" data-id="' + s.id + '" data-v="0">Keep mine</button></div>') + '</div>' : '';
    return '<section class="sd-sec lvl' + s.lvl + '">' + head + body + prop + '</section>';
  }
  function docHtml(d) {
    const ss = d.sections || []; const j = job(); const dr = claudeDrafts(d)[0]; const n = open(ss);
    const st = j && j.status !== 'done' ? '<div class="notice" style="margin:0 0 12px">' + (j.status === 'failed' ? '<b>Claude could not finish:</b> ' + esc(j.summary || '') : j.status === 'needs_input' ? '<b>Claude has questions.</b> Answer them in the assistant.' : '<b>' + esc(j.statusLabel || 'Working') + '.</b> Claude is building the document. Follow it in the assistant.') + '</div>' : '';
    const ready = dr ? '<div class="notice sd-ready"><span><b>Claude’s document is ready</b> (' + esc(String(dr._created || '').slice(0, 10)) + '). Sections you edited keep your text and show Claude’s as a proposal.</span>' + (can() ? '<span class="sd-ready-b"><button type="button" class="btn primary sm" data-act="sdUse" data-id="' + esc(dr.id) + '">Bring it in</button><button type="button" class="btn sm" data-act="sdUseNo" data-id="' + esc(dr.id) + '">Not now</button></span>' : '') + '</div>' : '';
    const scope = KIND[d.kind] ? KIND[d.kind][0] : 'Document'; const what = d.kind === 'modules' && (d.modules || []).length ? ': ' + d.modules.map(m => (mods().find(x => x.name === m) || {}).label || m).join(', ') : d.kind === 'integration' && d.app ? ': ' + d.app : '';
    const meta = '<div class="sd-meta"><span>' + esc(scope + what) + '</span><span>' + ss.length + ' section' + (ss.length === 1 ? '' : 's') + '</span>' + (n ? '<span class="sd-tbc">' + n + ' to be confirmed</span>' : ss.length ? '<span class="sd-ok">Nothing left to confirm</span>' : '') + '</div>';
    const empty = '<div class="sd-empty"><b>This document has no sections yet.</b><p class="small muted">Start from what the studio already holds, or let Claude write it from the org configuration.</p>' + (can() ? '<div class="row" style="gap:8px;justify-content:center;flex-wrap:wrap"><button type="button" class="btn primary" data-act="sdClaude">Write with Claude</button><button type="button" class="btn" data-act="sdStudio">Draft from the studio</button><button type="button" class="btn" data-act="sdImport">Import a document</button></div>' : '') + '</div>';
    return st + ready + '<div class="sd-page"><div class="sd-title"><h2>' + esc(d.title) + '</h2>' + meta + '</div>' + (ss.length ? ss.map(secHtml).join('') : empty) + (ss.length && can() ? '<button type="button" class="btn sm sd-add" data-act="sdAddSec">+ Add a section</button>' : '') + '</div>';
  }
  function filesCard() {
    const l = S.ui.sdFiles || []; if (!l.length) return '';
    return '<div class="card" style="margin-top:14px"><div class="card-h"><h3>Word files Claude built</h3></div><div class="card-b">' + l.map(x => '<div class="ev-row"><span class="ev-t"><b>' + esc(x.name) + '</b><div class="xs muted">' + kb(x.size) + ' · ' + esc(String(x.createdAt || '').slice(0, 10)) + '</div></span><button type="button" class="btn sm" data-act="sdFile" data-id="' + esc(x.id) + '">Download</button></div>').join('') + '</div></div>';
  }
  V.soldoc = { html() {
    const head = '<div class="page-header"><div class="t"><h1>Solution document</h1><p>The client-ready description of what was built: every module with its flows, fields, rules and roles. Claude writes it from the org configuration and the BRD; you review it here.</p></div></div>';
    if (V.isCustomer()) return head + '<div class="page-body"><div class="empty">The team shares the solution document when it is approved.</div></div>';
    I().load(['sdoc', 'ai', 'close', 'kpi', 'capp']); if (!I().ready(['sdoc', 'ai', 'close'])) return head + '<div class="page-body"><div class="empty">Loading…</div></div>';
    const l = docs(), d = cur(); const ro = !can();
    const pick = l.length ? '<div class="seg sd-docs" role="tablist" aria-label="Solution documents">' + l.map(x => '<button type="button" role="tab" aria-selected="' + !!(d && x.id === d.id) + '"' + (d && x.id === d.id ? ' class="on"' : '') + ' data-act="sdPick" data-id="' + esc(x.id) + '">' + esc(x.title) + '</button>').join('') + '</div>' : '';
    const st = d ? '<select class="sd-status" data-change="sdStatus" aria-label="Document status"' + (ro ? ' disabled' : '') + '>' + [['draft', 'Draft'], ['review', 'In review'], ['approved', 'Approved']].map(o => '<option value="' + o[0] + '"' + ((d.status || 'draft') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>' : '';
    const menu = S.ui.sdMore ? '<div class="ds-menu" role="menu">' + (ro ? '' : '<button type="button" role="menuitem" data-act="sdStudio">Draft from the studio</button><button type="button" role="menuitem" data-act="sdImport">Import a document</button>') + '<button type="button" role="menuitem" data-act="sdWord">Export to Word</button><button type="button" role="menuitem" data-act="sdMdx">Export as Markdown</button><button type="button" role="menuitem" data-act="sdAsk">Ask the assistant</button>' + (ro ? '' : '<button type="button" role="menuitem" data-act="sdRename">Rename</button><button type="button" role="menuitem" data-act="sdDelDoc">Delete this document</button>') + '</div>' : '';
    const bar = '<div class="sd-bar">' + pick + '<span class="spacer"></span>' + (ro ? '' : '<button type="button" class="btn" data-act="sdNew">+ New document</button>') + (d ? st + (ro ? '' : '<button type="button" class="btn primary" data-act="sdClaude">' + ((d.sections || []).length ? 'Update with Claude' : 'Write with Claude') + '</button>') + '<div class="ds-more"><button type="button" class="btn" data-act="sdMore" aria-haspopup="menu" aria-expanded="' + !!S.ui.sdMore + '">More</button>' + menu + '</div>' : '') + '</div>';
    const body = d ? '<div class="sd-grid"><div class="sd-main">' + docHtml(d) + '</div><aside class="sd-side">' + sourcesCard() + filesCard() + '</aside></div>'
      : '<div class="sd-grid"><div class="sd-main"><div class="sd-page sd-empty"><b>No solution document yet.</b><p class="small muted">A project can have one for the whole solution, one for a set of modules, or one per integration.</p>' + (ro ? '' : '<button type="button" class="btn primary" data-act="sdNew">Start a solution document</button>') + '</div></div><aside class="sd-side">' + sourcesCard() + filesCard() + '</aside></div>';
    return head + '<div class="page-body">' + (l.length ? bar : '') + body + '</div>';
  }, mount() { I().load(['sdoc', 'ai', 'close', 'kpi', 'capp']); if (V.studioJobs) { V.studioJobs.load(false); if (V.studioJobs.poll) V.studioJobs.poll(); }
    const j = job(); const key = (S.project && S.project.id) + ':' + (j ? j.id + j.status : '');
    if (V.listFiles && S.project && S.ui.sdFilesFor !== key) { S.ui.sdFilesFor = key; V.listFiles('solution_doc').then(l => { S.ui.sdFiles = l || []; V.render(); }).catch(() => { }); } } };

  // ---------- actions ----------
  const need = d => !can() || !d;
  ACT.sdPick = a => { S.ui.sdId = a.getAttribute('data-id'); S.ui.sdEdit = null; S.ui.sdMore = false; V.render(); };
  ACT.sdMore = () => { S.ui.sdMore = !S.ui.sdMore; V.render(); };
  ACT.sdNew = () => { S.ui.sdMore = false; const ms = mods(), ap = apps();
    V.drawer('New solution document', '<label class="f" for="sd_t">Title</label><input id="sd_t" maxlength="90" value="' + esc(((S.ws.project || {}).client || (S.project && S.project.customer) || 'Customer') + ' Solution Document') + '">'
      + '<label class="f" style="margin-top:12px">What it covers</label>' + Object.keys(KIND).map((k, i) => '<label class="sd-kind"><input type="radio" name="sd_k" value="' + k + '"' + (i ? '' : ' checked') + '><span><b>' + KIND[k][0] + '</b><span class="xs muted">' + KIND[k][1] + '</span></span></label>').join('')
      + '<label class="f" style="margin-top:12px">Modules (for Selected modules)</label><div class="sd-mods">' + (ms.length ? ms.map(m => '<label><input type="checkbox" class="sd_m" value="' + esc(m.name) + '"> ' + esc(m.label) + '</label>').join('') : '<span class="small muted">No module in scope yet.</span>') + '</div>'
      + '<label class="f" for="sd_a" style="margin-top:12px">Connected system (for Integration)</label><select id="sd_a"><option value="">Choose</option>' + ap.map(x => '<option>' + esc(x.app) + '</option>').join('') + '</select>' + (ap.length ? '' : '<p class="xs muted">Add connected apps on the Solution page first.</p>'),
      '<span class="spacer"></span><button type="button" class="btn" data-act="closeDrawer">Cancel</button><button type="button" class="btn primary" data-act="sdNewGo">Create</button>'); };
  ACT.sdNewGo = a => V.busy(a, async () => { if (!can()) return; const t = ((document.getElementById('sd_t') || {}).value || '').trim(); if (!t) { V.toast('Give the document a title.', 4000, true); return; }
    const k = (document.querySelector('input[name="sd_k"]:checked') || {}).value || 'full'; const ms = Array.from(document.querySelectorAll('.sd_m:checked')).map(x => x.value); const app = (document.getElementById('sd_a') || {}).value || '';
    if (k === 'modules' && !ms.length) { V.toast('Tick the modules this document covers.', 4000, true); return; }
    if (k === 'integration' && !app) { V.toast('Choose the connected system.', 4000, true); return; }
    const d = { id: 'sd_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), title: t.slice(0, 90), kind: k, modules: k === 'modules' ? ms : [], app: k === 'integration' ? app : '', status: 'draft', sections: [], used: [], createdAt: new Date().toISOString() };
    S.ui.sdId = d.id; V.closeDrawer(); await save(d, 'created'); V.toast('Created. Draft it from the studio or let Claude write it.'); });
  function ctxFor(d) {
    const all = mods(); const ms = d.kind === 'full' ? all : d.kind === 'modules' ? (d.modules || []).map(n => all.find(m => m.name === n) || { name: n, label: n }) : [];
    return { kind: d.kind, modules: ms, app: apps().find(x => x.app === d.app) || { app: d.app }, project: Object.assign({ name: S.project && S.project.name }, S.ws.project || {}), brdMd: brdMd(), reqs: S.ws.requirements || [], sla: S.ws.slaMatrix || [], kpis: I().list('kpi'), apps: apps() };
  }
  ACT.sdStudio = a => V.busy(a, async () => { S.ui.sdMore = false; const d = cur(); if (need(d)) return; d.sections = merge(d.sections, fromStudio(ctxFor(d))); await save(d, 'drafted from the studio'); const n = open(d.sections); V.toast(n ? n + ' section' + (n === 1 ? '' : 's') + ' still to be confirmed. Claude fills them from the org configuration.' : 'Drafted from the studio.', 6000); });
  ACT.sdClaude = a => V.busy(a, async () => { const d = cur(); if (need(d)) return; const J = V.studioJobs; if (!J || J.guard()) return; const p = S.ws.project || {}; const f = pkg();
    if (!f && !String(p.orgId || '').trim()) { V.toast('Add the org package or the Facilio Org ID first (on the right), so Claude can read the configuration.', 7000, true); return; }
    const scope = d.kind === 'modules' ? 'modules: ' + (d.modules || []).join(', ') : d.kind === 'integration' ? 'integration with ' + (d.app || 'the named system') : 'the whole solution';
    const r = await J.post('/jobs', { kind: 'build_solution_doc', section: d.id, ref: f ? f.id : '', note: (d.title + ' (' + scope + ')' + (f ? '; package ' + f.name : '; org ' + p.orgId + (p.facilioRegion ? ' ' + p.facilioRegion : ''))).slice(0, 600) });
    V.toast(r.duplicate ? 'That request is already waiting.' : 'Sent to Claude. The document comes back here as a draft; follow it in the assistant.', 7000); J.load(true); if (V.asstRequested) V.asstRequested(); V.render(); });
  ACT.sdUse = a => V.busy(a, async () => { const d = cur(); if (need(d)) return; const x = I().list('ai').find(y => y.id === a.getAttribute('data-id')); if (!x) return;
    d.sections = merge(d.sections, toSections(x.content, 'claude')); d.used = (d.used || []).concat(x.id).slice(-50); await save(d, 'Claude’s draft brought in'); V.toast('Brought in. Check the sections marked To be confirmed.'); });
  ACT.sdUseNo = a => V.busy(a, async () => { const d = cur(); if (need(d)) return; d.used = (d.used || []).concat(a.getAttribute('data-id')).slice(-50); await save(d); });
  ACT.sdEdit = a => { S.ui.sdEdit = a.getAttribute('data-id'); V.render(); setTimeout(() => { const t = document.getElementById('sd_ta'); if (t) t.focus(); }, 0); };
  ACT.sdCancel = () => { S.ui.sdEdit = null; V.render(); };
  ACT.sdSave = a => V.busy(a, async () => { const d = cur(); if (need(d)) return; const s = (d.sections || []).find(x => x.id === a.getAttribute('data-id')); const v = (document.getElementById('sd_ta') || {}).value; if (!s || v == null) return;
    if (v.trim() !== (s.md || '').trim()) { s.md = v.trim(); s.edited = true; s.src = 'person'; } S.ui.sdEdit = null; await save(d, s.title + ' edited'); });
  ACT.sdProp = a => V.busy(a, async () => { const d = cur(); if (need(d)) return; const s = (d.sections || []).find(x => x.id === a.getAttribute('data-id')); if (!s || !s.proposal) return; const use = a.getAttribute('data-v') === '1'; if (use) { s.md = s.proposal.md; s.src = s.proposal.src || 'claude'; s.edited = false; } delete s.proposal; await save(d, s.title + (use ? ': Claude’s text used' : ': kept')); });
  ACT.sdDel = a => V.busy(a, async () => { const d = cur(); if (need(d)) return; const s = (d.sections || []).find(x => x.id === a.getAttribute('data-id')); if (!s) return; if (!(await V.confirmDialog('Remove “' + s.title + '”?', 'The section is taken out of this document.', 'Remove'))) return; d.sections = d.sections.filter(x => x.id !== s.id); await save(d, s.title + ' removed'); });
  ACT.sdAddSec = () => V.drawer('Add a section', '<label class="f" for="sd_st">Heading</label><input id="sd_st" maxlength="90"><label class="f" style="margin-top:10px"><input type="checkbox" id="sd_sub"> A sub-section (under the one before it)</label>', '<span class="spacer"></span><button type="button" class="btn" data-act="closeDrawer">Cancel</button><button type="button" class="btn primary" data-act="sdAddGo">Add</button>');
  ACT.sdAddGo = a => V.busy(a, async () => { const d = cur(); if (need(d)) return; const t = ((document.getElementById('sd_st') || {}).value || '').trim(); if (!t) return; const s = sec(t.slice(0, 90), (document.getElementById('sd_sub') || {}).checked ? 2 : 1, '', 'person'); d.sections = (d.sections || []).concat(s); V.closeDrawer(); S.ui.sdEdit = s.id; await save(d, t + ' added'); });
  ACT.sdStatus = el => V.busy(null, async () => { const d = cur(); if (need(d)) return; const v = el.value;
    if (v === 'approved' && !(S.project && S.project.role === 'owner')) { V.toast('Only a project owner can approve.', 5000, true); V.render(); return; }
    if (v === 'approved' && open(d.sections)) { V.toast(open(d.sections) + ' section(s) are still To be confirmed.', 6000, true); V.render(); return; }
    d.status = v; if (v === 'approved') { d.approvedBy = S.user.name || S.user.email; d.approvedAt = new Date().toISOString(); } else { delete d.approvedBy; delete d.approvedAt; } await save(d, 'status ' + v); });
  ACT.sdImport = a => V.busy(a, async () => { S.ui.sdMore = false; const d = cur(); if (need(d)) return; const file = (await V.pickFile('.docx,.md,.txt,.markdown'))[0]; if (!file) { V.render(); return; }
    let md = ''; try { if (/\.docx$/i.test(file.name)) { await V.loadScript('vendor/mammoth.browser.min.js'); md = (await root.mammoth.convertToMarkdown({ arrayBuffer: await file.arrayBuffer() })).value.replace(/\\([.#()\-_*[\]!+])/g, '$1').replace(/__(.+?)__/g, '**$1**'); } else md = await file.text(); }
    catch (e) { V.toast('Could not read ' + file.name + '.', 6000, true); return; }
    const n = toSections(md, 'import'); if (!n.length) { V.toast('Nothing to import in ' + file.name + '.', 5000, true); return; }
    d.sections = merge(d.sections, n); await save(d, file.name + ' imported'); V.toast(n.length + ' section' + (n.length === 1 ? '' : 's') + ' imported from ' + file.name + '.'); });
  const fname = (d, ext) => (d.title.replace(/[^\w .-]+/g, '').trim() || 'Solution document') + ext;
  ACT.sdWord = a => V.busy(a, async () => { S.ui.sdMore = false; const d = cur(); if (!d) return; const blob = await V.mdDocx({ title: d.title, content: toMd(d.title, d.sections), status: d.status === 'approved' ? 'approved' : 'draft', approvedBy: d.approvedBy, approvedAt: d.approvedAt });
    V.download(fname(d, '.docx'), blob, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'); V.render(); });
  ACT.sdMdx = () => { S.ui.sdMore = false; const d = cur(); if (!d) return; V.download(fname(d, '.md'), new Blob([toMd(d.title, d.sections)], { type: 'text/markdown' }), 'text/markdown'); V.render(); };
  ACT.sdFile = a => V.busy(a, async () => { const x = (S.ui.sdFiles || []).find(y => y.id === a.getAttribute('data-id')); if (!x) return; const r = await root.FWBApi.downloadFile(S.project.id, x.id); V.download(x.name, r.blob, x.mime); });
  ACT.sdAsk = () => { S.ui.sdMore = false; V.render(); if (V.asstRequested) V.asstRequested(); };
  ACT.sdRename = () => { S.ui.sdMore = false; const d = cur(); if (!d) return; V.render(); V.drawer('Rename', '<label class="f" for="sd_rn">Title</label><input id="sd_rn" maxlength="90" value="' + esc(d.title) + '">', '<span class="spacer"></span><button type="button" class="btn" data-act="closeDrawer">Cancel</button><button type="button" class="btn primary" data-act="sdRenameGo">Save</button>'); };
  ACT.sdRenameGo = a => V.busy(a, async () => { const d = cur(); if (need(d)) return; const t = ((document.getElementById('sd_rn') || {}).value || '').trim(); if (!t) return; d.title = t.slice(0, 90); V.closeDrawer(); await save(d, 'renamed'); });
  ACT.sdDelDoc = a => V.busy(a, async () => { S.ui.sdMore = false; const d = cur(); if (need(d)) return; if (!(await V.confirmDialog('Delete “' + d.title + '”?', 'The document and its sections are removed from the project. Word files Claude built stay listed.', 'Delete', true))) { V.render(); return; } await I().del('sdoc', d.id); S.ui.sdId = null; V.toast('Deleted'); V.render(); });
})(typeof window !== 'undefined' ? window : globalThis);

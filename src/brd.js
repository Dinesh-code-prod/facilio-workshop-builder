/* BRD engine. The document is built once as a list of blocks (headings, paragraphs, bullets, tables, figures) from the
   shared data model; the same blocks render to the editable page view, to Word (.docx via docx-js) and to PDF (pdfmake),
   so all three stay consistent. Consultant edits are stored per block id (brddoc.edits) and applied on top of the generated
   text; the generated text is never overwritten. Only requirements with status Confirmed are included.
   Structure follows facilio-solution-document-builder/section-templates.md; format defaults follow its docx-build.md
   (Calibri, #351C75 headings, #8DB3E2 table headers, mandatory fields in red). A sample BRD .docx can be analysed to
   reuse its fonts, heading colours/sizes, table header fill, page setup, header/footer text and Heading 1 order. */
(function (root) {
  'use strict';
  const F = root.FWB; const V = root.FWBViews; const { S, humanize } = F; const T = root.FWBText; const D = root.FWBDiagrams;
  const TBC = T.TBC; const SOL = () => root.FWBSolutionLogic;
  const DEFAULT_PROFILE = { fileName: '', font: 'Cambria', bodySize: 20, h1: { color: '000000', size: 32, font: '' }, h2: { color: '434343', size: 28, font: '' }, h3: { color: '666666', size: 24, font: '' },
    tableHeaderFill: 'D9D2E9', tableHeaderColor: '000000', page: { w: 12240, h: 15840, top: 1440, right: 1440, bottom: 1440, left: 1440 }, headerText: '', footerText: '', headings: [] };
  const SECTIONS = [
    ['control', 'Document control (version history & approvals)'], ['toc', 'Table of contents'], ['project', 'Project information'], ['intro', 'Introduction, background & modules in scope'],
    ['conventions', 'Document conventions'], ['roles', 'User roles & responsibilities'], ['portfolio', 'Portfolio hierarchy & module dependencies'], ['modules', 'Module sections'], ['general', 'General requirements'],
    ['processes', 'End-to-end business processes'], ['usecases', 'Customer-specific use cases'], ['portals', 'Portal & cross-module mapping'], ['integration', 'Integration scope & interface specification'], ['agentops', 'Operating model: agents & rules'], ['sla', 'SLA & notifications'], ['slamatrix', 'SLA matrix'], ['kpis', 'KPIs and reporting'], ['solutions', 'Agreed solution: other areas'], ['matrix', 'Role matrix — module access'],
    ['trace', 'Requirement traceability matrix'], ['changes', 'Proposed configuration changes'], ['onboarding', 'Data migration & onboarding'], ['sessions', 'Decisions, assumptions & dependencies from the sessions'], ['questions', 'Open questions & items to be confirmed'], ['validation', 'Appendix — validation summary'], ['sources', 'Appendix — configuration source']];
  // New BRDs list, for each module, only what is agreed or changed; a BRD that already has edits keeps its full content (edits are tied to blocks), and the BRD settings can switch the full standard configuration on.
  const includeStd = () => { const v = S.ws.brd.includeStandard; if (v === true || v === false) return v; const d = root_(); return Object.keys(d.edits || {}).length > 0 || Object.keys(d.inserts || {}).length > 0; };
  const APPENDIX_OFF = ['validation', 'sources'];   // describe the whole package or the tool, not the customer's solution: off by default, a person can switch them on
  // ---------- several BRDs per project ----------
  // brddoc.list is the register of BRDs ('main' is the original one, whose edits/status/exports stay at the top level so older projects keep working).
  // Every other BRD keeps its own edits, inserted paragraphs, hidden blocks, status and exports under brddoc.docs[id]. Logos are shared by all BRDs of a project.
  const TYPES = {
    core: { label: 'Core CAFM modules', short: 'Core CAFM', integ: false, hint: 'Modules configured inside Facilio, for example Assets, Work Orders and Portfolio.', pick: () => true },
    servicedesk: { label: 'Service desk integration', short: 'Service desk', integ: true, hint: 'A service desk tool such as Zoho Desk creating and updating Facilio service requests and work orders.', pick: n => /servicerequest|^workorder$|^asset$|^people$|^tenant$/i.test(n) },
    erp: { label: 'ERP / procurement integration', short: 'ERP', integ: true, hint: 'An ERP or finance system exchanging procurement, inventory, vendor and invoice data with Facilio.', pick: n => /inventory|item|tool|storeroom|purchase|requestforquotation|vendorquotes|quote|invoice|vendors|^workorder$|^asset$/i.test(n) },
    agent: { label: 'Fully connected (agent-run)', short: 'Agent-run', integ: true, hint: 'No internal team works in the account: agents and rules run it, connected to the customer\'s other systems.', pick: n => /servicerequest|^workorder$|^asset$|inventory|purchase|invoice|vendors/i.test(n) }
  };
  TYPES.import = { label: 'Imported or blank BRD', short: 'Own BRD', integ: false, hint: 'A BRD you brought in or started blank. It keeps your own structure; nothing is generated into it.', pick: () => false };
  const INTEG_RE = /servicerequest|^workorder$|^asset$|inventory|^item$|^tool$|storeroom|purchase|requestforquotation|vendorquotes|^quote$|invoice|vendors/i;
  const exchangeHint = n => /servicerequest/i.test(n) ? 'Tickets from the service desk create service requests; status and comments sync back' : /^workorder$/i.test(n) ? 'Work orders created from approved requests; status and completion sync back' : /^asset$/i.test(n) ? 'Asset master data shared or synchronised' : /inventory|^item$|^tool$|storeroom/i.test(n) ? 'Stock levels, issues and receipts' : /purchase|requestforquotation|vendorquotes|quote|invoice|vendors/i.test(n) ? 'Procurement documents and vendor master data' : 'Records exchanged';
  const root_ = () => { const d = F.doc('brddoc'); d.logos = d.logos || {}; if (!Array.isArray(d.list) || !d.list.length) d.list = [{ id: 'main', name: 'Main BRD', type: 'core', modules: [] }], d.mainRemoved = false; if (!d.mainRemoved && !d.list.some(x => x.id === 'main')) d.list.unshift({ id: 'main', name: 'Main BRD', type: 'core', modules: [] }); d.docs = d.docs || {}; return d; };
  const brdList = () => root_().list;
  const activeId = () => { const l = brdList(); return l.some(x => x.id === S.ui.brdId) ? S.ui.brdId : l[0].id; };
  const activeRec = () => { const id = activeId(); return brdList().find(x => x.id === id); };
  const BD = (id) => { const d = root_(); id = id || activeId(); let x = d; if (id !== 'main') { x = d.docs[id] = d.docs[id] || {}; x.logos = d.logos; if (!x.status) x.status = 'draft'; }
    x.edits = x.edits || {}; x.inserts = x.inserts || {}; x.hidden = x.hidden || {}; x.exports = x.exports || []; x.logos = x.logos || {}; return x; };
  // delete a BRD; the main one is cleared (and dropped from the list when others exist), the last one left is never removed
  function removeBrd(id) { const d = root_(); const rec = d.list.find(x => x.id === id); if (!rec) return; if (id === 'main') { ['edits', 'inserts', 'hidden', 'exports', 'figSize', 'figPct', 'profile', 'reviewedBy', 'reviewedAt'].forEach(k => { delete d[k]; }); d.status = 'draft'; if (d.list.length > 1) { d.list = d.list.filter(x => x.id !== 'main'); d.mainRemoved = true; } } else { d.list = d.list.filter(x => x.id !== id); delete d.docs[id]; } }
  const scopeSet = () => { const r = activeRec(); return r && r.modules && r.modules.length ? new Set(r.modules) : null; };
  const titleOf = () => { const r = activeRec(); return r.id === 'main' ? (S.ws.project.docTitle || 'Business Requirements Document') : r.name; };
  const slug = t => String(t || '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
  // The profile comes from an uploaded sample .docx and is stored in the shared BRD record, so every value is normalised here before
  // it reaches HTML, styles or exports: colours are 6 hex digits, fonts plain names, sizes numbers.
  const HEX = /^[0-9A-Fa-f]{6}$/; const fontName = v => String(v || '').replace(/[^\w .,-]/g, '').slice(0, 60);
  function cleanProfile(P) {
    const D = DEFAULT_PROFILE; P.font = fontName(P.font) || D.font; P.bodySize = Number(P.bodySize) > 0 ? Number(P.bodySize) : D.bodySize;
    ['h1', 'h2', 'h3'].forEach(k => { const h = P[k] = Object.assign({}, D[k], P[k] && typeof P[k] === 'object' ? P[k] : {}); if (!HEX.test(h.color)) h.color = D[k].color; h.size = Number(h.size) > 0 ? Number(h.size) : D[k].size; if (h.font !== undefined) h.font = fontName(h.font); });
    if (!HEX.test(P.tableHeaderFill)) P.tableHeaderFill = D.tableHeaderFill; if (!HEX.test(P.tableHeaderColor)) P.tableHeaderColor = D.tableHeaderColor; P.page = P.page && typeof P.page === 'object' ? P.page : JSON.parse(JSON.stringify(D.page));
    Object.keys(D.page).forEach(k => { P.page[k] = Number(P.page[k]) > 0 ? Number(P.page[k]) : D.page[k]; }); return P;
  }
  // a style saved earlier that is just the old built-in look (Calibri, blue table headers, purple headings) is not a customised style: the new default applies
  const oldDefault = p => !!p && p.font === 'Calibri' && p.tableHeaderFill === '8DB3E2' && p.h1 && p.h1.color === '351C75';
  function profile() { const saved = BD().profile || root_().profile || S.ws.brd.template || {}; return cleanProfile(Object.assign(JSON.parse(JSON.stringify(DEFAULT_PROFILE)), oldDefault(saved) ? {} : saved)); }
  function sectionOrder() { const saved = S.ws.brd.sections; if (saved && saved.length) { const out = saved.filter(s => SECTIONS.some(x => x[0] === s.id)).map(s => Object.assign({}, s)); SECTIONS.forEach((s, i) => { if (out.some(o => o.id === s[0])) return; const prev = SECTIONS[i - 1] && out.findIndex(o => o.id === SECTIONS[i - 1][0]); out.splice(prev >= 0 ? prev + 1 : out.length, 0, { id: s[0], on: !APPENDIX_OFF.includes(s[0]) }); }); return out; } return SECTIONS.map(s => ({ id: s[0], on: !APPENDIX_OFF.includes(s[0]) })); }

  // ---------- sample BRD profile (.docx) ----------
  async function profileTemplate(file) {
    const zip = await root.JSZip.loadAsync(file);
    const read = async p => zip.file(p) ? zip.file(p).async('string') : '';
    const P = Object.assign(JSON.parse(JSON.stringify(DEFAULT_PROFILE)), { fileName: file.name });
    const dp = new DOMParser(); const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const q = (el, tag) => el ? Array.from(el.getElementsByTagNameNS(W, tag)) : [];
    const a = (el, n) => el ? (el.getAttributeNS(W, n) || el.getAttribute('w:' + n) || '') : '';
    const styles = dp.parseFromString(await read('word/styles.xml'), 'text/xml');
    const dd = q(styles, 'docDefaults')[0];
    if (dd) { const rf = q(dd, 'rFonts')[0]; if (rf && a(rf, 'ascii')) P.font = a(rf, 'ascii'); const sz = q(dd, 'sz')[0]; if (sz && a(sz, 'val')) P.bodySize = +a(sz, 'val'); }
    const theme = await read('word/theme/theme1.xml'); const minor = (theme.match(/<a:minorFont>\s*<a:latin typeface="([^"]+)"/) || [])[1]; if (minor && (!P.font || P.font === 'Calibri')) P.font = minor;
    q(styles, 'style').forEach(s => {
      const id = a(s, 'styleId'); const name = (q(s, 'name')[0] && a(q(s, 'name')[0], 'val')) || '';
      const key = /^(Heading1)$/i.test(id) || /^heading 1$/i.test(name) ? 'h1' : /^(Heading2)$/i.test(id) || /^heading 2$/i.test(name) ? 'h2' : /^(Heading3)$/i.test(id) || /^heading 3$/i.test(name) ? 'h3' : (/^Normal$/i.test(id) ? 'normal' : null);
      if (!key) return; const c = q(s, 'color')[0], sz = q(s, 'sz')[0], rf = q(s, 'rFonts')[0];
      if (key === 'normal') { if (sz && a(sz, 'val')) P.bodySize = +a(sz, 'val'); if (rf && a(rf, 'ascii')) P.font = a(rf, 'ascii'); return; }
      if (c && a(c, 'val') && a(c, 'val') !== 'auto') P[key].color = a(c, 'val'); if (sz && a(sz, 'val')) P[key].size = +a(sz, 'val'); if (rf && a(rf, 'ascii')) P[key].font = a(rf, 'ascii');
    });
    const doc = dp.parseFromString(await read('word/document.xml'), 'text/xml');
    const tbl = q(doc, 'tbl')[0]; if (tbl) { const shd = q(q(tbl, 'tr')[0], 'shd')[0]; if (shd && a(shd, 'fill') && a(shd, 'fill') !== 'auto') P.tableHeaderFill = a(shd, 'fill'); }
    const sect = q(doc, 'sectPr').pop(); if (sect) { const sz = q(sect, 'pgSz')[0], mg = q(sect, 'pgMar')[0]; if (sz) { P.page.w = +a(sz, 'w') || P.page.w; P.page.h = +a(sz, 'h') || P.page.h; } if (mg) ['top', 'right', 'bottom', 'left'].forEach(k => { if (a(mg, k)) P.page[k] = Math.abs(+a(mg, k)); }); }
    P.headings = q(doc, 'p').filter(p => { const ps = q(p, 'pStyle')[0]; return ps && /^(Heading1|1)$/i.test(a(ps, 'val')); }).map(p => q(p, 't').map(t => t.textContent).join('').trim()).filter(Boolean).slice(0, 80);
    const texts = async re => { const out = []; for (const n of Object.keys(zip.files).filter(n => re.test(n))) { const x = dp.parseFromString(await read(n), 'text/xml'); const t = q(x, 't').map(t => t.textContent).join('').trim(); if (t) out.push(t); } return out; };
    P.headerText = (await texts(/^word\/header\d*\.xml$/))[0] || ''; P.footerText = ((await texts(/^word\/footer\d*\.xml$/))[0] || '').replace(/PAGE|NUMPAGES|\d+$/g, '').trim();
    P.analysed = new Date().toISOString();
    return P;
  }

  // ================= BLOCK MODEL =================
  function buildBlocks() {
    const blocks = []; const used = {}; let ctx = 'doc';
    const id = k => { let x = ctx + ':' + k; if (used[x]) { used[x]++; x += '~' + used[x]; } else used[x] = 1; return x; };
    const add = b => { blocks.push(b); return b; };
    const H = (lvl, text, k, o) => add(Object.assign({ id: id(k || 'h:' + F.slug(text).slice(0, 40)), t: 'h', lvl, text }, o || {}));
    const P = (text, k, o) => add(Object.assign({ id: id(k || 'p'), t: 'p', text }, o || {}));
    const L = (lbl, text, k) => add({ id: id(k || 'l:' + F.slug(lbl)), t: 'p', label: lbl, text });
    const UL = (items, k) => add({ id: id(k || 'ul'), t: 'ul', items });
    const TB = (headers, rows, widths, k, o) => add(Object.assign({ id: id(k || 'tbl'), t: 'table', headers, rows, widths }, o || {}));
    const FIG = (svg, caption, k) => add({ id: id(k || 'fig'), t: 'figure', svg, caption });
    const BR = () => add({ id: id('br'), t: 'pagebreak' });
    const pr = S.ws.project; const tech = S.ws.brd.includeTechnical !== false; const q = s => '“' + s + '”'; const B = S.baseline;
    const order = sectionOrder().filter(s => s.on).map(s => s.id);
    const CHAIN = ['site', 'building', 'floor', 'space', 'asset', 'serviceRequest', 'workorder', 'plannedmaintenance', 'preventivemaintenance', 'inspectionResponse', 'inspectionTemplate', 'workpermit', 'quote', 'requestForQuotation', 'vendorQuotes', 'inventoryrequest', 'purchaserequest', 'purchaseorder', 'invoice', 'vendors', 'insurance', 'tenant', 'client', 'people', 'employee', 'facilitybooking', 'spacebooking', 'invitevisitor', 'visitorlog'];
    const rank = m => { const i = CHAIN.indexOf(m.name); return i < 0 ? 100 + { high: 0, medium: 1, low: 2 }[m.priority] : i; };
    const rec = activeRec(); if (rec.imported) return { blocks: [{ id: 'imp:title', t: 'h', lvl: 1, text: rec.name }], stats: { modules: 0, questions: 0, confirmed: 0, pending: 0 } }; const scope = scopeSet(); const ty = TYPES[rec.type] || TYPES.core; const integ = ty.integ && rec.type !== 'core';
    const inScope = F.allModules().filter(m => m.inScope && (!scope || scope.has(m.name))).sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label));
    const scopeNames = new Set(inScope.map(m => m.name));   // every section below may show only what touches these modules
    const accessInScope = a => inScope.some(m => { try { return !!(root.FWBViews.existingPerm(a, m.name) || root.FWBViews.proposedPerm(a.id, m.name)); } catch (e) { return false; } });   // the role has some permission on a module in scope
    const inBrd = r => !scope || !(r.modules && r.modules.length) || r.modules.some(x => scope.has(x)); const confirmed = S.ws.requirements.filter(r => r.status === 'Confirmed' && inBrd(r)); const pending = S.ws.requirements.filter(r => r.status !== 'Confirmed' && r.status !== 'Rejected' && inBrd(r));
    const allQuestions = []; const addQ = (area, text) => { if (text && !allQuestions.find(x => x.text === text)) allQuestions.push({ area, text }); };
    const solNote = key => { const st = SOL().statusOf ? SOL().statusOf(F.doc('solutions'), key) : 'Agreed'; if (st && st !== 'Agreed' && st !== 'Not written') P('Status: ' + (st === 'Changed by customer' ? 'changed by the customer, to be confirmed.' : 'draft, not yet agreed with the customer.'), 'solst:' + key, { style: 'caption' }); };   // a solution that is not Agreed says so in the BRD
    const SS = root.FWBBrdSessions ? root.FWBBrdSessions.rows({ bank: S.docs.rs_questions && S.docs.rs_questions.data, room: S.docs.workshop_room && S.docs.workshop_room.data, label: n => ((F.moduleView(n) || {}).label || n) }) : null;   // what the requirement sessions captured: the Questions tab, the answers in the Workshop room and the call summaries
    const imported = (F.doc('config').source === 'imported'); const cfgName = imported ? ((S.baselineMeta && (S.baselineMeta.label || S.baselineMeta.sourceName)) || 'Customer configuration package') : 'Facilio reference configuration (not the customer\'s live org)';
    const pkgDate = imported && B && B.meta && B.meta.exportTimestamp ? new Date(+B.meta.exportTimestamp).toISOString().slice(0, 10) : '';
    let secNo = 0;

    ctx = 'cover'; add({ id: 'cover', t: 'cover', title: rec.id === 'main' ? (pr.docTitle && pr.docTitle !== 'Business Requirements Document' ? pr.docTitle : 'Facilio CAFM') : rec.name, subtitle: rec.id === 'main' ? 'Business Requirement Document For' : (ty.label + (rec.system ? ' · ' + rec.system : '') + ' · Facilio Implementation'), customer: pr.client || (S.project && S.project.customer) || TBC, version: pr.version || 'V1.0', date: pr.date || new Date().toISOString().slice(0, 10), status: ({ draft: 'Draft', review: 'In review', approved: 'Approved' })[BD().status || 'draft'] }); BR();
    for (const sid of order) {
      ctx = sid; try {
      if (sid === 'control') { H(1, 'Document Control', 'h'); H(2, 'Version History', 'h2v'); TB(['Version', 'Date', 'Author', 'Description of change'], (S.ws.brd.versionHistory || []).map(v => [v.version, v.date, v.author || pr.consultant || '', v.change]), [1, 1.2, 1.6, 4], 'versions'); H(2, 'Review and Approval', 'h2a'); TB(['Name', 'Role', 'Signature', 'Date'], (S.ws.brd.approvals || []).map(a => [a.name || '', a.role || '', '', a.date || '']), [2, 2, 2, 1.2], 'approvals'); BR(); }
      else if (sid === 'toc') { add({ id: 'toc', t: 'toc' }); BR(); }
      else if (sid === 'project') { H(1, ++secNo + '. Project Information', 'h'); TB(['Item', 'Detail'], [['Project Title', 'Facilio CAFM Implementation – ' + (pr.client || TBC)], ['Customer', pr.client || TBC], ['Org ID', pr.orgId || TBC], ['Region', pr.region || TBC], ['Document Version', pr.version || 'V1.0'], ['Facilio Consultant', pr.consultant || TBC], ['Project Manager', pr.pm || TBC], ['Implementation Members', pr.members || TBC], ['Configuration source', cfgName + (pkgDate ? ' (exported ' + pkgDate + ')' : '')]], [1, 2.4], 'info'); }
      else if (sid === 'intro') {
        H(1, ++secNo + '. Introduction', 'h'); H(2, 'Project Background', 'h2b');
        (pr.background ? pr.background.split(/\n+/) : ['Customer background ' + TBC + '.']).forEach((p, i) => P(p, 'bg' + i));
        H(2, 'Business Objective', 'h2o'); (pr.objective ? pr.objective.split(/\n+/) : ['Overall business objective ' + TBC + '.']).forEach((p, i) => P(p, 'obj' + i));
        H(2, 'Purpose of this Document', 'h2p');
        P(`This document records the business requirements agreed with ${pr.client || 'the customer'} during the requirement workshops and explains how each requirement is met in Facilio. For every module in scope it describes what the customer wants, why it is needed, the information captured, the users and portals involved, the process from initiation to completion, the approvals, automations and notifications, and the expected outcome. Existing configuration is distinguished from changes proposed in the workshop. Only requirements confirmed with the customer are included; items not established by the configuration or the workshop are marked ${TBC} and listed at the end of the document.`, 'purpose');
        H(2, 'Modules in Scope', 'h2m'); TB(['Module', 'Type', 'Priority', 'Reason for priority'], inScope.map(m => [m.label, m.origin === 'proposed' ? 'Proposed custom module' : m.custom ? 'Custom module' : 'System module', humanize(m.priority), (m.priorityReasons || []).slice(0, 3).join('; ') || (m.origin === 'proposed' ? 'Proposed in workshop' : '')]), [2, 1.3, 0.8, 4], 'mods');
      }
      else if (sid === 'conventions') { H(1, ++secNo + '. Document Conventions', 'h'); TB(['Marker', 'Meaning'], [['Existing', 'Configured in the customer\'s Facilio org.'], ['Proposed', 'Agreed or suggested during the workshop; not yet configured.'], ['Proposed removal', 'Existing configuration the workshop proposes to stop using.'], [TBC, 'Not established by the configuration or the workshop; requires confirmation by the customer or the product team.'], ['User / Role to Be Confirmed', 'The configuration does not restrict who can perform the action. The responsible role must be agreed.'], ['<Portal> User — Role to Be Confirmed', 'The action is available in that portal, but the specific portal role is not defined.'], ['Verified / Inferred', 'Process handoffs are verified only when the configuration establishes them; inferred handoffs need confirmation.'], [{ text: 'Field name in red', color: 'CC0000' }, 'Mandatory field.']], [1.6, 4], 'conv'); }
      else if (sid === 'roles') {
        H(1, ++secNo + '. User Roles & Responsibilities', 'h'); P('The table lists every participant in the processes covered by this document: configured internal roles, portal users, roles proposed in the workshop and actions whose responsible user is still to be confirmed.', 'intro');
        const rows = []; const resp = {};
        F.allFlows().forEach(fid => { const f = F.flowModel(fid); const m = F.moduleView(f.module); if (!m || !m.inScope || f.enabled === false) return; f.transitions.filter(t => !t.removed && t.enabled !== false).forEach(t => (t.actors || []).forEach(a => { (resp[a.actor] = resp[a.actor] || []).push(m.label + ': ' + q(t.name)); })); });
        F.allActors().filter(a => resp[a.id] || a.origin === 'proposed' || (a.roleName && !a.privileged && accessInScope(a))).sort((a, b) => F.CATEGORY_ORDER.indexOf(a.category) - F.CATEGORY_ORDER.indexOf(b.category) || a.label.localeCompare(b.label)).forEach(a => { const r = resp[a.id] || []; rows.push([{ text: a.label, bold: true }, F.CATEGORY_LABEL[a.category] || a.category, a.source === 'tbc' ? 'To be confirmed' : a.origin === 'proposed' ? 'Proposed' : 'Configured', [a.description && a.description !== a.label ? a.description : ''].concat(r.length ? ['Actions: ' + r.slice(0, 12).join('; ') + (r.length > 12 ? '; and ' + (r.length - 12) + ' more' : '')] : (a.roleName ? ['No stateflow action assigned in the modules in scope'] : [])).filter(Boolean)]); });
        TB(['Role / Actor', 'Category', 'Source', 'Responsibilities in the system'], rows, [1.6, 1.3, 0.9, 4.2], 'roles');
        const priv = F.allActors().filter(a => a.privileged).map(a => a.label); if (priv.length) P('Privileged roles with full access (not listed individually): ' + priv.join(', ') + '.', 'priv');
      }
      else if (sid === 'portfolio' && B) {
        H(1, ++secNo + '. Portfolio Hierarchy & Module Dependencies', 'h');
        if (B.portfolio.some(n => scopeNames.has(n.module))) {   // the location hierarchy only when Site, Building, Floor, Space or similar is in scope
          H(2, 'Portfolio Hierarchy', 'h2');
          P('Facilio organises the customer\'s portfolio as Site → Building → Floor → Space → Subspace. Assets and operational records (work orders, requests, inspections, planned maintenance) are linked to a location in this hierarchy.', 'p1');
          TB(['Level', 'Module', 'Parent link', 'Evidence'], B.portfolio.map((n, i) => [String(i + 1), n.label, n.parent ? humanize(n.parent) : '—', n.status]), [0.5, 1.2, 1.2, 4], 'hier');
          P('Assets link to the hierarchy through: ' + (B.assetLinks.length ? B.assetLinks.map(l => l.field + ' (' + humanize(l.target) + ')').join(', ') : TBC) + '.', 'assets');
        }
        H(2, 'Module Dependencies', 'h2d'); TB(['Module', 'Looks up (depends on)', 'Referenced by (in scope)'], inScope.map(m => { const deps = [...new Set(F.effFields(m.name).filter(f => f.lookup && f.status !== 'removed').filter(f => inScope.some(x => x.name === f.lookup)).map(f => (F.moduleView(f.lookup) || {}).label || f.lookup))]; return [m.label, deps.slice(0, 20).join(', ') + (deps.length > 20 ? ' …' : ''), m.usedBy.filter(u => F.moduleView(u) && F.moduleView(u).inScope).map(u => F.moduleView(u).label).join(', ')]; }), [1.3, 3, 2.2], 'deps');
      }
      else if (sid === 'modules') { inScope.forEach(m => { ctx = 'mod:' + m.name; moduleSection(m); }); }
      else if (sid === 'general') {
        const gen = confirmed.filter(r => !(r.modules && r.modules.length)); if (gen.length) { H(1, ++secNo + '. General Requirements', 'h'); P('Requirements agreed in the sessions that apply across the solution, not to one module.', 'note');
          TB(['ID', 'Requirement', 'Agreed answer or rules', 'Said in the sessions'], gen.map(r => [{ text: 'REQ-' + r.id, bold: true }, r.title + (r.objective && r.objective !== r.title ? ': ' + r.objective : ''), r.rules || '', r.source && r.source.quote ? String.fromCharCode(8220) + r.source.quote + String.fromCharCode(8221) : '']), [0.8, 2.6, 2.4, 2.2], 'gen'); }
      }
      else if (sid === 'processes') {
        const CF = (V.items && V.items.ready(['cflow']) && V.cflowSvg) ? V.items.list('cflow').filter(c => c.inBrd).sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))) : [];
        H(1, ++secNo + '. End-to-End Business Processes', 'h'); if (!S.ws.processes.length && !CF.length) P('No end-to-end process has been mapped yet. ' + TBC, 'none');
        S.ws.processes.forEach(p0 => { const p = root.FWBViews.withLabels(p0); ctx = 'proc:' + p.id;
          H(2, p.name, 'h'); L('Business objective:', p.objective || TBC, 'obj'); L('Trigger:', p.trigger || TBC, 'trg'); L('Primary record:', p.module ? ((F.moduleView(p.module) || {}).label || p.module) : TBC, 'rec'); L('Final outcome:', p.outcome || TBC, 'out');
          if (p.steps.length) FIG(D.swimlaneSvg(p, F.actorLabel, x => F.actor(x).category), 'Figure: ' + p.name + ' — swimlane (solid = verified from configuration; dashed = inferred, proposed or to be confirmed)', 'swim');
          TB(['#', 'Actor', 'Interface', 'Action', 'Record', 'Verification'], p.steps.map((s, i) => [String(i + 1), F.actorLabel(s.lane), s.interface || '', s.action + (s.notes ? '\n' + s.notes : ''), s.recordLabel || '', F.VERIFICATION[s.verification] || s.verification]), [0.3, 1.6, 1.3, 3, 1.1, 1.2], 'steps');
          T.processNarrative(p).forEach((l, i) => P(l, 'n' + i));
          p.steps.filter(s => s.verification === 'tbc' || s.verification === 'inferred').forEach(s => addQ(p.name, 'Confirm step: ' + F.actorLabel(s.lane) + ' — ' + s.action)); });
        // combined flows saved from the Process Whiteboard and marked for the BRD: the drawing, then its steps and connections in reading order
        CF.forEach(c => { ctx = 'cflow:' + c.id; const nv = V.cflowNarrative(c); const svg = V.cflowSvg(c);
          H(2, c.name, 'h'); if (c.desc) String(c.desc).split(/\n+/).forEach((t, i) => P(t, 'd' + i)); L('Source:', 'Process Whiteboard' + (c.boardName ? ' — board "' + c.boardName + '"' : '') + (c.savedAt ? ', saved ' + String(c.savedAt).slice(0, 10) : ''), 'src');
          if (svg) FIG(svg, 'Figure: ' + c.name + ' — combined flow', 'fig');
          if (nv.steps.length) TB(['#', 'Step', 'Type'], nv.steps.map((x, i) => [String(i + 1), x.text, x.kind]), [0.4, 5, 1.2], 'steps');
          if (nv.links.length) TB(['From', 'To', 'Condition / label'], nv.links.map(l => [l.from, l.to, l.label || '—']), [2.4, 2.4, 2], 'links'); });
      }
      else if (sid === 'usecases') {
        const UCS = (V.items && V.items.ready(['usecase'])) ? V.items.list('usecase').filter(u => u.scope !== 'Out of scope').sort((a, b) => (a.no || 0) - (b.no || 0)) : [];
        H(1, ++secNo + '. Customer-Specific Use Cases', 'h');
        if (!UCS.length) P('No customer-specific use cases have been recorded. ' + TBC, 'none');
        else {
          P('Use cases describe scenarios specific to ' + (pr.client || 'the customer') + '. Only use cases the customer has confirmed are described as agreed. The proposed solutions are documented proposals: none has been created in the live Facilio organisation.', 'intro');
          TB(['ID', 'Use case', 'Modules', 'Solution type', 'Status'], UCS.map(u => [{ text: 'UC-' + String(u.no || 0).padStart(3, '0'), bold: true }, u.title, (u.modules || []).map(m => (F.moduleView(m) || {}).label || m).join(', '), u.solution || TBC, u.confirmation === 'Customer confirmed' ? 'Customer confirmed' : 'Awaiting confirmation']), [0.8, 2.6, 1.6, 1.8, 1.4], 'uct');
          UCS.filter(u => u.confirmation === 'Customer confirmed').forEach(u => { const k = 'uc' + u.no; H(2, 'UC-' + String(u.no || 0).padStart(3, '0') + ' ' + u.title, 'h2' + k);
            [['Business scenario', u.scenario], ['Current process', u.current], ['Business need', u.need], ['Trigger and actor', [u.trigger, u.actor].filter(Boolean).join(' / ')], ['Preconditions', u.pre], ['Expected result', u.result], ['Alternative and exception paths', u.alternates], ['Business rules', u.rules], ['Required fields', u.fieldsReq], ['Related workflow', u.flows], ['Custom actions', u.customActions], ['Customer expected solution', u.expected], ['Proposed Facilio solution', u.proposed], ['Implementation approach', u.approach], ['Acceptance criteria', u.acceptance]].forEach(([l, v]) => { if (v) L(l + ':', v, k + l.slice(0, 4)); });
            if ((u.steps || []).length) { P('Process steps:', k + 'st'); UL(u.steps, k + 'ul'); } L('Confirmed by:', (u.confBy || '') + (u.confAt ? ' on ' + u.confAt : ''), k + 'cf'); });
        }
        const disc = (V.items && V.items.ready(['discrepancy'])) ? V.items.list('discrepancy').filter(d => d.status !== 'Resolved') : [];
        if (disc.length) { H(2, 'Items awaiting a decision', 'h2d'); TB(['Area', 'What disagrees', 'Recommendation', 'Status'], disc.map(d => [d.area || '', d.text || '', d.recommendation || '', d.status || 'Open']), [1.6, 3.4, 2.2, 1], 'dct'); }
      }
      else if (sid === 'integration') {
        if (!integ) { /* only for integration BRDs */ }
        else {
          const sys = rec.system || TBC; const dirTxt = ({ out: 'Facilio sends data to ' + sys, in: sys + ' sends data to Facilio', both: 'Two-way exchange between Facilio and ' + sys })[rec.direction] || TBC;
          H(1, ++secNo + '. Integration Scope & Interface Specification', 'h');
          P('This section specifies how Facilio connects to ' + sys + ' for the modules in this document. Every row marked ' + q(TBC) + ' is to be completed with the customer\'s technical team during the integration workshop and confirmed before build.', 'p');
          const VV = root.FWBViews || {}; const cf = VV.contractFacts ? VV.contractFacts({ confirmed: true }) : []; const mine = cf.filter(f => f.kind === 'integration' && rec.system && f.system && (f.system.toLowerCase().includes(rec.system.toLowerCase()) || rec.system.toLowerCase().includes(f.system.toLowerCase()))); const reg = cf.filter(f => f.kind === 'region' && f.value);
          H(2, 'Systems and pattern', 'h2s'); L('External system', sys, 'sys'); L('Integration type', ty.label, 'ity'); L('Direction', dirTxt, 'dir'); if (rec.notes) L('Notes', rec.notes, 'nts');
          if (mine.length) L('Contract basis', mine.map(f => (f.system + (f.serves && f.serves.length ? ' serving ' + f.serves.join(', ') : '') + ' (' + VV.contractProv(f, f.contract) + ', ' + f.contract.title + ')')).join('; '), 'ctb');
          if (reg.length) L('Cloud region (contract)', [...new Set(reg.map(f => f.value))].join('; '), 'ctr');
          const im = inScope.filter(m => INTEG_RE.test(m.name));
          H(2, 'Modules exchanged', 'h2m');
          TB(['Module', 'What is exchanged', 'Direction', 'Trigger / frequency', 'API endpoint', 'Authentication', 'Volume per day', 'Status'], im.map(m => [m.label, exchangeHint(m.name), rec.direction === 'out' ? 'Facilio to external' : rec.direction === 'in' ? 'External to Facilio' : rec.direction === 'both' ? 'Two-way' : TBC, TBC, TBC, TBC, TBC, 'To be specified']), [1.2, 2.2, 1, 1.3, 1.3, 1.1, 0.9, 1], 'imod', { empty: 'None of the modules in scope is normally integrated. Add Service Request, Work Order, Inventory, Procurement or Assets to this BRD\'s scope.' });
          im.slice(0, 8).forEach(m => { const req = (F.effFields(m.name) || []).filter(f => f.required && f.enabled !== false).slice(0, 10); if (!req.length) return;
            H(3, m.label + ': field mapping', 'h3fm:' + m.name);
            TB(['Facilio field', 'Type', 'External field', 'Direction', 'Transformation / rule', 'Mandatory'], req.map(f => [f.label || f.name, f.type || '', TBC, TBC, TBC, 'Yes']), [1.8, 1, 1.6, 1, 1.8, 0.8], 'fm:' + m.name); });
          H(2, 'Technical details to confirm', 'h2t');
          TB(['Topic', 'Detail to capture', 'Answer'], [['Environments', 'Sandbox / UAT / production URLs and who provisions access', TBC], ['Authentication', 'OAuth, API key or basic; token lifetime; who owns the credentials', TBC], ['Rate limits', 'Calls per minute or day allowed by the external system', TBC], ['Error handling', 'Retry rules, failure notification and who fixes failed records', TBC], ['Duplicates and matching', 'The key used to match a record on both sides', TBC], ['Data volumes', 'Records at go-live and expected per day', TBC], ['Support contacts', 'Technical owner on the customer side and at the vendor', TBC]], [1.4, 3.4, 2.2], 'tech');
          addQ('Integration', 'Confirm API endpoints, authentication and rate limits for ' + sys + '.'); addQ('Integration', 'Confirm which system is the source of truth for each exchanged module.');
        }
      }
      else if (sid === 'agentops') {
        if (rec.type === 'agent') {
          H(1, ++secNo + '. Operating Model: Agents & Rules', 'h');
          P('In this model no internal team works in the account day to day. Agents and rules carry out the routine work, and people are involved only for approvals and exceptions. This section records what each agent may do, when it acts and who is called when it cannot.', 'p');
          H(2, 'Agent responsibilities', 'h2a');
          TB(['Area', 'What the agent does', 'Triggered by', 'Human approval needed', 'Escalates to'], inScope.filter(m => INTEG_RE.test(m.name)).map(m => [m.label, /servicerequest/i.test(m.name) ? 'Classify, prioritise and convert requests' : /^workorder$/i.test(m.name) ? 'Assign, schedule and close work orders' : /^asset$/i.test(m.name) ? 'Keep asset records and status current' : /inventory|^item$|^tool$|storeroom/i.test(m.name) ? 'Monitor stock and raise replenishment' : /purchase|requestforquotation|vendorquotes|quote|invoice|vendors/i.test(m.name) ? 'Prepare procurement documents for approval' : TBC, TBC, TBC, TBC]), [1.2, 2.4, 1.4, 1.4, 1.2], 'agr', { empty: 'Add the modules the agents work on to this BRD\'s scope.' });
          H(2, 'Business rules', 'h2r'); TB(['Rule', 'Condition', 'Action', 'Owner'], [[TBC, TBC, TBC, TBC], [TBC, TBC, TBC, TBC], [TBC, TBC, TBC, TBC]], [1.6, 2.2, 2.2, 1], 'rules');
          H(2, 'Guardrails to define', 'h2g'); UL(['Approval limits (cost, priority, asset criticality) above which a person must approve', 'Working hours and out-of-hours behaviour', 'Escalation contacts and response times', 'Audit trail and logging of every automated action', 'How the customer pauses or overrides an agent'], 'gr');
          addQ('Operating model', 'Confirm the approval limits and escalation contacts for the agents.');
        }
      }
      else if (sid === 'portals' && B) {
        H(1, ++secNo + '. Portal & Cross-Module Mapping', 'h');
        P('Portal access is read from the portal applications, their menu tabs, portal forms (a form in a portal shows the capability is configured, not that it is used), portal roles and the “Display this transition in other apps” setting on stateflow transitions. Portal screen layouts and record sharing rules are not part of the configuration and are marked for confirmation.', 'p');
        TB(['Portal', 'Status', 'Roles', 'Modules accessible (tabs)', 'Portal forms for', 'Transitions shown in portal'], B.portalEvidence.filter(p => p.tabs.some(t => (t.modules || []).some(x => scopeNames.has(x)))).map(p => { const ts = p.transitions.map(x => B.transitions.find(t => t.id === x)).filter(Boolean); return [p.name, p.enabled ? 'Enabled' : 'Disabled', p.roles.join(', ') || TBC, [...new Set(p.tabs.flatMap(t => t.modules))].map(x => (F.moduleView(x) || {}).label || x).join(', '), [...new Set(p.forms.map(f => (F.moduleView(f.module) || {}).label || f.module))].join(', '), ts.slice(0, 30).map(t => q(t.name) + ' (' + ((F.moduleView(t.module) || {}).label || t.module) + ')').join(', ') || 'None flagged']; }), [1.2, 0.7, 1.2, 2, 1.6, 2], 'portals');
        H(2, 'Cross-Module Actions', 'h2x'); const cx = []; inScope.forEach(m => (root.FWBViews.crossLinks ? root.FWBViews.crossLinks(m.name) : []).filter(r => r.from === m.name).forEach(r => cx.push([m.label, r.name, r.toLabel || (F.moduleView(r.to) || {}).label || TBC, r.condition || '—', r.source === 'configuration' ? 'Configured' + (r.enabled === false ? ' (disabled)' : '') : r.source === 'requested' ? 'Not in configuration — ' + TBC : 'Proposed (' + humanize(r.status || 'proposed') + ')'])));
        TB(['Module', 'Action', 'Creates / affects', 'Shown when', 'Status'], cx, [1.3, 1.8, 1.4, 2, 1.5], 'cross', { empty: 'No cross-module actions for the modules in scope.' });
        H(2, 'Records Created and Updated Across Modules', 'h2r'); const rows = []; inScope.forEach(m => (B.workflowRules || []).filter(r => r.module === m.name && r.enabled).forEach(r => rows.push([m.label, r.name, r.eventLabel, F.actionsText(r.actions).join('; ')])));
        TB(['Module', 'Automation', 'Trigger', 'Effect'], rows, [1.3, 1.6, 1.5, 3], 'auto', { empty: 'No cross-module automation found for modules in scope.' });
      }
      else if (sid === 'slamatrix') {
        const ml = n => (!n || n === '*' ? 'General (all modules)' : ((F.moduleView(n) || {}).label || n)); const rows = (S.ws.slaMatrix || []).filter(r => !r.module || scopeNames.has(r.module));
        if (rows.length) { H(1, ++secNo + '. SLA Matrix', 'h'); P('The service levels agreed for this customer, by module and priority.', 'note'); TB(['Module', 'Priority', 'Response within', 'Resolution within', 'Business hours'], rows.map(r => [ml(r.module), r.priority, r.response, r.resolution, r.hours || '']), [1.6, 1.1, 1.3, 1.3, 1.6], 'slam');
          const es = rows.flatMap(r => (r.esc || []).filter(e => e && (e.after || e.to)).map((e, i) => [ml(r.module) + ' / ' + r.priority, 'Level ' + (i + 1), e.after || '', e.to || ''])); if (es.length) { H(2, 'Escalation Matrix', 'h2em'); TB(['Module / priority', 'Level', 'Duration', 'Role'], es, [2.2, 1, 1.3, 2], 'slaesc'); } }
      }
      else if (sid === 'solutions') {   // the fixed areas of the Solution tab that have text: connected apps, PDF templates, KPIs, SLA, notifications, approvals, roles, other commitments
        const oa = SOL().otherAreas(F.doc('solutions'), inScope.map(x => ({ name: x.name, label: x.label }))); if (oa.length) { H(1, ++secNo + '. Agreed Solution: Other Areas', 'h'); let intHead = false; oa.forEach(a => { const isI = a.group === 'Integrations'; if (isI && !intHead) { intHead = true; H(2, 'Integrations', 'h2g:integrations'); } H(isI ? 3 : 2, a.label, 'h2:' + a.key); a.paras.forEach((t, i) => P(t, 'sol:' + a.key + ':' + i)); solNote(a.key); if (a.table) TB(a.table.headers, a.table.rows, a.table.widths, 'solt:' + a.key); }); }
      }
      else if (sid === 'kpis') {
        const ks = (root.FWBViews.items ? root.FWBViews.items.list('kpi') : []).filter(k => !k.module || scopeNames.has(k.module)); const ml = n => (!n ? 'General' : ((F.moduleView(n) || {}).label || n));
        if (ks.length) { H(1, ++secNo + '. KPIs and Reporting', 'h'); P('The measures agreed to be tracked, and how Facilio delivers each one.', 'note'); TB(['KPI', 'Module', 'What it measures', 'Source data', 'Frequency', 'Target', 'How Facilio delivers it'], ks.map(k => [{ text: k.name, bold: true }, ml(k.module), k.description || '', k.source || '', k.freq || '', (k.target === undefined || k.target === null ? '' : String(k.target)) + (k.unit ? ' ' + k.unit : ''), k.solution || TBC]), [1.4, 1, 1.5, 1.2, 0.8, 0.8, 1.8], 'kpitbl'); }
      }
      else if (sid === 'sla' && B) {
        H(1, ++secNo + '. SLA & Notifications', 'h'); H(2, 'SLA Policies', 'h2s');
        TB(['Module', 'Policy', 'Applies when', 'Commitments', 'Status'], B.sla.filter(s => inScope.find(m => m.name === s.module)).map(s => [(F.moduleView(s.module) || {}).label || s.module, s.name, s.criteria && s.criteria.text || 'All records', s.commitments.map(c => c.entities.map(e => e.entity + ': ' + F.secs(e.seconds)).join(', ')).join('; '), s.enabled ? 'Active' : 'Switched off']), [1.3, 1.2, 2, 2.3, 0.8], 'sla', { empty: 'No SLA policy configured for the modules in scope.' });
        H(2, 'Notifications', 'h2n'); const nts = B.notifications.filter(n => inScope.find(m => m.name === n.module));
        TB(['Module', 'Notification', 'Trigger / condition', 'Channels', 'Recipients'], nts.filter(n => n.enabled).map(n => [(F.moduleView(n.module) || {}).label || n.module, n.name, n.eventLabel + (n.fieldsWatched.length ? ' (' + n.fieldsWatched.join(', ') + ')' : '') + (n.criteria && n.criteria.text ? '\nWhen ' + n.criteria.text : ''), n.actions.types.map(t => /EMAIL/.test(t) ? 'Email' : /PUSH/.test(t) ? 'Mobile push' : humanize(t)).join(', '), n.actions.recipients.join(', ') || TBC]), [1.2, 1.4, 2.3, 0.9, 2], 'notif', { empty: 'No active notification for the modules in scope.' });
      }
      else if (sid === 'matrix') {
        H(1, ++secNo + '. Role Matrix — Module Access', 'h'); P('Access is decoded from each role\'s tab permissions. Values marked “(proposed)” were agreed in the workshop; ⚠ marks values with settings that must be confirmed in Facilio setup. Privileged roles have full access and are not shown.', 'p');
        const acts = F.allActors().filter(a => (a.roleName && !a.privileged && accessInScope(a)) || a.origin === 'proposed');
        for (let i = 0; i < acts.length; i += 6) { const grp = acts.slice(i, i + 6); TB(['Module'].concat(grp.map(a => a.label)), inScope.map(m => [m.label].concat(grp.map(a => { const e = root.FWBViews.existingPerm(a, m.name); const p = root.FWBViews.proposedPerm(a.id, m.name); return [e ? e.text + (e.unknown ? ' ⚠' : '') : '—'].concat(p ? [{ text: F.permText(p, m.name) + ' (proposed)', color: '0A5FCC' }] : []); }))), [1.6].concat(grp.map(() => 1)), 'm' + i); }
      }
      else if (sid === 'trace') {
        H(1, ++secNo + '. Requirement Traceability Matrix', 'h');
        TB(['ID', 'Requirement', 'Modules', 'Fields', 'Transitions', 'Actors', 'Classification', 'Confirmed', 'Acceptance criteria'], confirmed.map(r => { const fl = (r.transitions || []).map(x => { const [fid, tid] = x.split('|'); const f = F.flowModel(fid); const t = f && f.transitions.find(z => z.id === tid); return t ? q(t.name) : ''; }).filter(Boolean);
          return [{ text: r.id, bold: true }, r.title, (r.modules || []).map(m => (F.moduleView(m) || {}).label || m).join(', '), (r.fields || []).map(x => { const [m, f] = x.split('.'); return F.fieldLabel(m, f); }).join(', '), fl.join(', '), (r.actors || []).map(F.actorLabel).join(', '), F.REQ_CLASS[r.classification] || '', [r.confirmedBy, r.confirmedAt].filter(Boolean).join(', ') || 'Yes', r.acceptance || TBC]; }), [0.7, 2, 1, 1.1, 1.1, 1.1, 1.1, 0.8, 1.6], 'trace', { empty: 'No confirmed requirements yet.' });
        if (pending.length) P(pending.length + ' requirement(s) captured in the workshop are awaiting customer confirmation and are not included in this document.', 'pending');
      }
      else if (sid === 'changes') { H(1, ++secNo + '. Proposed Configuration Changes', 'h'); const cs = F.changeSummary();
        [['Additions', cs.additions, 'add'], ['Modifications', cs.modifications, 'mod'], ['Proposed Removals', cs.removals, 'rem'], ['Scope and Priority Decisions', cs.decisions, 'dec']].forEach(([h, rows, k]) => { H(2, h, 'h2' + k); TB(['Area', 'Module', 'Item', 'Detail'], rows.map(r => [r.area, (F.moduleView(r.module) || {}).label || r.module, r.item, r.detail]), [1, 1.4, 2, 3], k, { empty: 'None.' }); });
        P('These changes are workshop proposals. They have not been applied to the customer\'s Facilio configuration; implementation follows customer sign-off.', 'note'); }
      else if (sid === 'onboarding') {
        const ST = { todo: 'Not started', filling: 'Filling', sent: 'Sent to Facilio', fix: 'Needs fixes', validated: 'Validated', loaded: 'Loaded' }; const rowsO = [];
        inScope.forEach(m => { const sheets = (V.onboardingSheetsFor ? V.onboardingSheetsFor(m.name) : []) || []; sheets.forEach(sh => { const it = V.items && V.items.get ? V.items.get('onb', F.slug(sh)) : null; rowsO.push([m.label, sh, ST[it && it.status] || 'Not started']); }); });
        if (rowsO.length) { H(1, ++secNo + '. Data Migration & Onboarding', 'h'); P('The master data the customer provides for the modules in scope, from the Data Onboarding templates. Status is as of the day this document was generated.', 'onbnote'); TB(['Module', 'Data sheet', 'Status'], rowsO, [2, 3.5, 1.5], 'onb'); }
      }
      else if (sid === 'sessions') {
        const has = SS && (SS.decisions.length || SS.assumptions.length || SS.dependencies.length || SS.actions.length);
        if (has) { H(1, ++secNo + '. Decisions, Assumptions & Dependencies', 'h'); P('Recorded in the requirement sessions. Each item comes from a saved call summary that a person kept.', 'sessnote');
          [['Decisions', SS.decisions, 'dec'], ['Assumptions', SS.assumptions, 'asm'], ['Dependencies', SS.dependencies, 'dep']].forEach(([h, rows, k]) => { if (rows.length) { H(2, h, 'h2' + k); UL(rows.map(x => x.text + (x.at ? ' (' + String(x.at).slice(0, 10) + ')' : '')), k); } });
          if (SS.actions.length) { H(2, 'Agreed Actions', 'h2act'); TB(['Action', 'Owner', 'Date'], SS.actions.map(x => [x.text, x.owner || 'To be assigned', String(x.at || '').slice(0, 10)]), [4.5, 1.6, 1], 'act'); } }
      }
      else if (sid === 'questions') {
        H(1, ++secNo + '. Open Questions & Items to Be Confirmed', 'h');
        inScope.forEach(m => { const w = S.ws.modules[m.name] || {}; (w.questions || '').split('\n').map(x => x.trim()).filter(Boolean).forEach(x => addQ(m.label, x)); if (!w.purpose && !w.objective) addQ(m.label, 'Confirm the business purpose and objective of the ' + m.label + ' module.'); });
        confirmed.forEach(r => { if (r.openQuestions) addQ(r.id, r.openQuestions); }); S.ws.questions.filter(x => x.status !== 'closed' || (x.answer && (x.ver || 'Unverified') === 'Unverified')).forEach(x => addQ(x.area || 'General', x.text + (x.answer && (x.ver || 'Unverified') === 'Unverified' ? ' (an answer was given but has not been verified)' : '')));
        if (SS) SS.open.forEach(x => addQ(x.area, x.text + (x.priority === 'must' ? ' (must be confirmed in the sessions)' : '')));   // the questions prepared for the sessions that are still to ask or have no answer
        TB(['#', 'Area', 'Question / item to be confirmed'], allQuestions.map((x, i) => [String(i + 1), x.area, x.text]), [0.4, 1.6, 6], 'q', { empty: 'No open questions.' });
        if (SS && SS.answered.length) { H(2, 'Answered in the Requirement Sessions', 'h2ans'); TB(['#', 'Area', 'Question', 'Client response'], SS.answered.map((x, i) => [String(i + 1), x.area, x.text, x.response || 'Answered in the session (no response text recorded).']), [0.4, 1.3, 3, 3.6], 'ans'); }
      }
      else if (sid === 'validation') { H(1, 'Appendix A — Validation Summary', 'h'); const v = root.FWBViews.validation ? root.FWBViews.validation() : []; const c = s => v.filter(x => x.sev === s).length;
        P(`Validation found ${c('blocking')} blocking, ${c('warning')} warning and ${c('info')} informational items when this document was generated.${c('blocking') ? ' Blocking items must be resolved before the document is issued for sign-off.' : ''}`, 'sum');
        TB(['Severity', 'Area', 'Item', 'Finding'], v.filter(x => x.sev !== 'info').slice(0, 300).map(x => [humanize(x.sev), x.area, x.item, x.msg]), [0.8, 1.1, 2.2, 4], 'list', { empty: 'No findings.' }); }
      else if (sid === 'sources' && B) { H(1, 'Appendix B — Configuration Source', 'h'); P('Configuration analysed: ' + cfgName + (pkgDate ? ', exported ' + pkgDate : '') + '. The source configuration is read-only; all workshop changes are recorded separately.', 'src');
        TB(['Component', 'Records', 'Status'], B.inventory.map(i => [humanize(i.type.toLowerCase()), String(i.records), i.parsed ? 'Analysed' : (i.note || 'Not analysed')]), [2.4, 0.7, 3], 'inv'); H(2, 'Known limitations of the source', 'h2l'); UL(B.gaps.filter(g => g.area !== 'Modules').map(g => g.area + ' — ' + g.item + ': ' + g.detail), 'gaps'); }
      } catch (e) { console.error('BRD section ' + sid, e); ctx = 'err:' + sid; add({ id: id('err'), t: 'p', text: 'This section could not be built (' + sid + '): ' + String((e && e.message) || e).slice(0, 160) + '. The rest of the document is not affected.', style: 'caption' }); }
    }

    function moduleSection(m) {
      const w = S.ws.modules[m.name] || {}; secNo++; const std = includeStd(); const modSol = SOL().paras(SOL().textOf(F.doc('solutions'), 'module:' + m.name)), modTbl = SOL().table(F.doc('solutions'), 'module:' + m.name); const solMods = inScope.map(x => ({ name: x.name, label: x.label })), relSol = SOL().relatedFor(F.doc('solutions'), m.name, solMods), intSol = SOL().integrationsFor(F.doc('solutions'), m.name, solMods);   // areas of the Solution tab linked to this module by the person or by a keyword
      H(1, secNo + '. ' + m.label.toUpperCase(), 'h', { pageBreakBefore: true });
      H(2, 'Module Purpose', 'h2p'); P(T.modulePurpose(m.name), 'purpose');
      if (m.origin === 'proposed' && w.reg) { const g = w.reg; [['Customer terminology', g.terminology], ['Business owner', g.owner], ['Category', g.category], ['Scope status', g.scopeStatus], ['Business process', g.process], ['Related standard modules', g.relatedStd], ['Related custom modules', g.relatedCustom], ['Dependencies', g.dependencies], ['Customer confirmation', g.confirmation ? g.confirmation + (g.confirmedBy ? ' by ' + g.confirmedBy : '') : ''], ['Evidence', g.evidence]].forEach(([l, v]) => { if (v) L(l + ':', v, 'reg' + F.slug(l).slice(0, 8)); }); P('This module is a workshop proposal. It has not been created in the live Facilio organisation.', 'regnote'); }
      [['Participating users and departments', w.users, 'users'], ['Current process', w.current, 'cur'], ['Desired future process', w.future, 'fut'], ['Business problem', w.problem, 'prob']].forEach(([l, v, k]) => { if (v) L(l + ':', v, k); });
      if (w.agreedAutomation && String(w.agreedAutomation).trim()) { H(2, 'Agreed Buttons, Automation, SLA and Form Rules', 'h2ag'); P(String(w.agreedAutomation).trim(), 'agreed'); }
      H(2, '1) Functional Requirements -', 'h2r'); const reqs = confirmed.filter(r => (r.modules || []).indexOf(m.name) >= 0 && (r.brdSection || 'module') === 'module');
      if (reqs.length) {
        const RID = r => 'REQ-' + r.id, lead = s => String(s || '').trim(), ap = String.fromCharCode(8217), qo = String.fromCharCode(8220), qc = String.fromCharCode(8221);
        TB(['Use Case', 'Requirement ID', 'Functional Requirements'], reqs.map(r => [r.title, { text: RID(r), bold: true }, lead(r.objective) || r.title]), [1.9, 1.2, 3.8], 'fr:' + m.name);
        H(2, '2) Confirmations -', 'h2cf'); UL(reqs.map(r => RID(r) + ' – ' + (r.approvals ? lead(r.approvals) + '.' : 'Confirmed in the requirement sessions.') + (r.source && r.source.quote ? ' Said in the sessions: ' + qo + String(r.source.quote).slice(0, 200) + qc : '')), 'cf:' + m.name);
        H(2, '3) Solution Proposal -', 'h2sp'); if (modSol.length || modTbl) { modSol.forEach((t, i) => P(t, 'sol:' + m.name + ':' + i)); solNote('module:' + m.name); if (modTbl) TB(modTbl.headers, modTbl.rows, modTbl.widths, 'solt:' + m.name); } else UL(reqs.map(r => RID(r) + ' – ' + (lead(r.rules) || 'The agreed solution is to be written. ' + TBC)), 'sp:' + m.name);   // the Solution tab is the source; the per-requirement rules are the fallback
        const cx = ((S.ws.crossLinks || {})[m.name] || []).map(x => ((F.moduleView(x.to) || {}).label || x.to) + ' – receives the action ' + x.name + (x.condition ? ' (when ' + x.condition + ')' : '')); const apps = (((F.doc('design_proposals') || {}).items) || []).filter(p => p.kind === 'connectedapp' && p.status === 'applied' && [m.name, m.label].some(x => String(x).toLowerCase() === String(p.module).toLowerCase())).map(p => p.name + ' – connected app opened from the ' + (p.triggerLabel ? p.triggerLabel + ' ' : '') + p.trigger);
        H(2, '4) Facilio' + ap + 's Modules/Functionality Involved -', 'h2mi'); UL(['Facilio shall leverage the modules below to take care of the functional requirements.', 'The requirements mentioned in the table will be complied with.', m.label + ' – ' + String(T.modulePurpose(m.name) || '').split('. ')[0].replace(/[.]$/, '')].concat(cx, apps), 'mi:' + m.name);
        H(2, '5) Constraints -', 'h2cs'); const cons = reqs.filter(r => lead(r.exceptions)); UL(cons.length ? cons.map(r => RID(r) + ' – ' + lead(r.exceptions)) : ['No constraint has been recorded for this module. ' + TBC], 'cs:' + m.name);
      }
      if (reqs.length) { (() => 0)( reqs.map(r => [{ text: r.id, bold: true }, r.title, [r.objective, r.rules ? 'Rules: ' + r.rules : '', r.approvals ? 'Approvals / notifications: ' + r.approvals : '', r.exceptions ? 'Exceptions: ' + r.exceptions : '', r.reporting ? 'Reporting: ' + r.reporting : '', r.integrations ? 'Integrations: ' + r.integrations : '', r.acceptance ? 'Acceptance: ' + r.acceptance : ''].filter(Boolean).join('\n') || TBC, F.REQ_CLASS[r.classification] || '']), [0.8, 1.6, 4.4, 1.4], 'reqs');
        reqs.forEach(r => { const parts = [['Why it is needed', r.problem || r.objective, 'why'], ['Current process', r.current, 'cur'], ['How it will work', r.future, 'how'], ['Users', r.users, 'usr'], ['Expected outcome', r.outcome, 'out'], ['Assumptions', r.assumptions, 'ass']].filter(x => x[1]); if (parts.length) { P(r.id + ': ' + r.title, 'rq:' + r.id, { bold: true }); parts.forEach(([l, v, k]) => L(l + ':', v, 'rq:' + r.id + ':' + k)); } }); }
      else { P('No confirmed customer requirement for this module yet. ' + TBC, 'noreq'); if (modSol.length || modTbl) { H(2, 'Solution Proposal -', 'h2sp'); modSol.forEach((t, i) => P(t, 'sol:' + m.name + ':' + i)); solNote('module:' + m.name); if (modTbl) TB(modTbl.headers, modTbl.rows, modTbl.widths, 'solt:' + m.name); } }
      const allFlows = m.flowIds.map(F.flowModel).filter(f => f && (f.enabled !== false || f.origin === 'proposed')); const changedFlow = f => f.origin === 'proposed' || ((F.flowDiff(f.id) || { changes: [] }).changes || []).length > 0; const flows = std ? allFlows : (allFlows.filter(changedFlow).length ? allFlows.filter(changedFlow) : allFlows.filter(f => f.isDefault !== false).slice(0, 1));   // the sample shows each module's process as a flowchart: an unchanged module shows its standard flow
      if (!std) { const nStd = F.effFields(m.name).filter(f => f.status === 'existing').length, unch = allFlows.length - flows.length; const bn = B ? B.notifications.filter(r => r.module === m.name && r.enabled).length : 0, bw = B ? B.workflowRules.filter(r => r.module === m.name && r.enabled).length : 0, bs = B ? B.sla.filter(r => r.module === m.name && r.enabled).length : 0;
        H(2, 'What Stays Standard', 'h2s'); P('This module uses the standard Facilio configuration except where the sections below list an agreement or a change. Unchanged: ' + [nStd + ' existing field' + (nStd === 1 ? '' : 's'), unch + ' state flow' + (unch === 1 ? '' : 's'), bn + ' notification' + (bn === 1 ? '' : 's'), bw + ' workflow rule' + (bw === 1 ? '' : 's'), bs + ' SLA polic' + (bs === 1 ? 'y' : 'ies')].join(', ') + '.', 'std'); }
      if (flows.length) { H(2, '6) Process State flow - ' + m.label + ' Flowchart', 'h2f');
        flows.forEach(f => { const k = 'flow:' + F.slug(f.id).slice(-30); P(f.name + (f.origin === 'proposed' ? ' (proposed in workshop)' : S.ws.flows[f.id] && (F.flowDiff(f.id) || { changes: [] }).changes.length ? ' (configured, with workshop changes)' : ' (configured)') + (f.criteria ? ' — applies when ' + f.criteria : ''), k + ':t', { bold: true });
          FIG(D.flowSvg(f, { full: true }), 'Figure: ' + m.label + ' — ' + f.name, k + ':fig'); T.flowNarrative(f).forEach((p, i) => P(p, k + ':n' + i)); });
        H(2, 'State Flow Details', 'h2d');
        flows.forEach(f => { const st = x => (f.states.find(s => s.id === x) || {}).label || x; const k = 'flow:' + F.slug(f.id).slice(-30); if (flows.length > 1) P(f.name, k + ':dt', { bold: true });
          const ts = f.transitions.filter(t => (t.enabled !== false || S.ws.brd.includeDisabled) && !(t.removed && t.origin === 'proposed'));
          TB(['Transition', 'From', 'To', 'Performed By', 'Conditions / Inputs', 'Actions & Notifications', 'Status'], ts.map(t => [q(t.name), q(st(t.from)), q(st(t.to)), t.type !== 'user' ? 'System (automatic)' : (t.actors || []).map(a => F.actorLabel(a.actor) + (a.status === 'proposed' ? ' (proposed)' : a.status === 'confirmed' ? ' (confirmed)' : '')).join('\n') || 'User / Role to Be Confirmed', T.transitionConditions(t).join('\n'), (t.actions || []).concat(t.createRecord ? ['Creates ' + ((F.moduleView(t.createRecord.module) || {}).label || t.createRecord.module)] : []).concat((t.notifications || []).length ? ['Notifies: ' + t.notifications.join(', ')] : []).join('\n'), t.removed ? 'Proposed removal' : t.origin === 'proposed' ? 'Proposed' : t.enabled === false ? 'Switched off' : 'Existing']), [1.2, 1, 1, 1.5, 2, 1.7, 0.8], k + ':tbl');
          f.transitions.filter(t => !t.removed && t.enabled !== false && t.type === 'user' && (t.actors || []).every(F.isTbc)).forEach(t => addQ(m.label, 'Confirm the responsible role for ' + q(t.name) + ' (' + st(t.from) + ' → ' + st(t.to) + ') — currently ' + ((t.actors || []).map(a => F.actorLabel(a.actor)).join(' / ') || 'User / Role to Be Confirmed') + '.')); }); }
      const appr = B && std ? B.approvals.filter(a => a.module === m.name && a.enabled) : []; const tAp = flows.flatMap(f => f.transitions.filter(t => !t.removed && t.approval && t.approval.required).map(t => ({ f, t })));
      if (appr.length || tAp.length) { H(2, 'Approval Routing', 'h2a'); TB(['Approval', 'Condition', 'Approver(s)', 'On Approve', 'On Reject'], appr.map(a => [a.name, a.criteria && a.criteria.text || 'All records', a.approvers.map(x => x.type === 'ROLE' ? x.name : x.type === 'FIELD' ? 'User in the ' + F.fieldLabel(m.name, x.name) + ' field' : x.name).join(', ') + (a.allRequired ? '\n(all must approve)' : '\n(any one)'), F.actionsText(a.onApprove).join('\n') || '—', F.actionsText(a.onReject).join('\n') || '—']).concat(tAp.map(x => [q(x.t.name) + ' (stateflow)', x.t.condition || '—', (x.t.approval.approvers || []).map(F.actorLabel).join(', ') || TBC, 'Moves to ' + q((x.f.states.find(s => s.id === x.t.to) || {}).label || ''), x.t.approval.rejectTo ? 'Moves to ' + q((x.f.states.find(s => s.id === x.t.approval.rejectTo) || {}).label || '') : TBC])), [1.4, 1.8, 1.7, 1.7, 1.7], 'appr'); }
      const fields = F.effFields(m.name).filter(f => S.ws.brd.includeFormOnly !== false || !f.formOnly).filter(f => std || f.status === 'proposed' || f.status === 'modified' || f.status === 'removed');
      if (std || fields.length) {
      H(2, std ? 'Field List' : 'Fields Added, Changed or Removed', 'h2fl'); const rules = T.fieldRules(m.name);
      const reqOf = n => confirmed.filter(r => (r.fields || []).indexOf(m.name + '.' + n) >= 0).map(r => r.id);
      const forms = F.formsForModule(m.name); const primary = forms.find(f => f.proposed) || forms.find(f => f.app === 'maintenance' && /web_maintenance$/.test(f.name)) || forms.find(f => f.app === 'maintenance') || forms[0];
      const row = (f, ff) => { const r = rules[f.name] || {}; const opts = (f.options || []).map(o => typeof o === 'string' ? o : (o.stored && o.stored !== o.value ? o.value + ' (' + o.stored + ')' : o.value)); const mand = f.required || (ff && ff.required);
        const ovl = [opts.length ? 'Values: ' + opts.slice(0, 12).join(', ') + (opts.length > 12 ? ' (+' + (opts.length - 12) + ')' : '') : '', f.lookup ? 'Lookup: ' + ((F.moduleView(f.lookup) || {}).label || f.lookup) : '', f.enumName ? 'System list: ' + humanize(f.enumName) : '', (f.default || (ff && ff.default)) ? 'Default: ' + (f.default || ff.default) : ''].filter(Boolean);
        const rl = [f.visibility ? 'Visibility: ' + f.visibility : '', ...(r.visibility || []), ...(r.mandatory || []), f.editability ? 'Editability: ' + f.editability : '', ...(r.editability || []), f.validation ? 'Validation: ' + f.validation : '', ...(r.validation || [])].filter(Boolean);
        return [[{ text: (ff && ff.label) || f.label, bold: true, color: mand ? 'CC0000' : undefined }].concat(tech ? [{ text: f.name, color: '7B91B0', size: 15 }] : []), f.type + (f.formOnly ? '\n(platform field)' : ''), mand ? 'Yes' : ((r.mandatory || []).length ? 'Conditional' : 'No'), ovl.join('\n') || '—', rl.slice(0, 6).join('\n') || '—', [f.description || '', f.requirement ? 'Requirement: ' + f.requirement : ''].filter(Boolean).join('\n') || '—', [{ existing: 'Existing', proposed: 'Proposed', modified: 'Modified', removed: 'Proposed removal' }[f.status] || f.status].concat(reqOf(f.name)).join('\n')]; };
      const rows = []; const done = new Set();
      if (primary && std) { rows.push({ sub: 'Form: ' + (primary.label || primary.name) + (primary.proposed ? ' (proposed layout)' : '') }); (primary.sections || []).forEach(s => { const vis = s.fields.filter(x => !x.hidden); if (!vis.length) return; rows.push({ sub: s.name }); vis.forEach(ff => { const f = fields.find(x => x.name === ff.field) || (ff.field && { name: ff.field, label: ff.label || ff.field, type: '', status: 'proposed' }); if (f && !done.has(f.name)) { done.add(f.name); rows.push(row(f, ff)); } }); }); }
      const rest = fields.filter(f => !done.has(f.name)); const onOther = rest.filter(f => (f.onForms || []).length || f.status === 'proposed'), modelOnly = rest.filter(f => !(f.onForms || []).length && f.status !== 'proposed');
      if (!std) { rows.push({ sub: 'Added, changed or removed for this customer' }); rest.forEach(f => rows.push(row(f))); } else if (onOther.length) { rows.push({ sub: 'Fields on other forms' }); onOther.forEach(f => rows.push(row(f))); }
      if (std && modelOnly.length && S.ws.brd.includeModelOnly !== false) { rows.push({ sub: 'Data-model fields not shown on any form' }); modelOnly.forEach(f => rows.push(row(f))); }
      P('Mandatory fields are shown in red' + (tech ? '; the API name is shown under each field name' : '') + '.', 'fnote', { style: 'caption' });
      TB(['Field Name', 'Field Type', 'Mandatory', 'Options / Lookup / Default', 'Visibility, Editability & Validation', 'Business Description', 'Status'], rows, [1.7, 1.1, 0.7, 1.8, 1.8, 1.6, 0.9], 'fields');
      }
      const pf = std ? [] : F.formsForModule(m.name).filter(x => x.proposed);
      if (pf.length) { H(2, 'Forms Agreed', 'h2fa'); TB(['Form', 'Section', 'Fields'], pf.flatMap(x => (x.sections || []).map(sc => [x.label || x.name, sc.name, (sc.fields || []).filter(y => !y.hidden).map(y => y.label || F.fieldLabel(m.name, y.field)).join(', ') || '—'])), [1.6, 1.6, 4], 'frm'); }
      const fr = B && std ? B.formRules.filter(r => r.module === m.name && r.enabled) : []; const lk = F.effFields(m.name).filter(f => f.lookup && f.status !== 'removed' && (std || f.status === 'proposed' || f.status === 'modified'));
      if (fr.length || lk.length) { H(2, 'Business Rules & Relationships', 'h2b');
        if (fr.length) TB(['Rule', 'When it applies', 'Effect'], fr.slice(0, 80).map(r => [r.name, [humanize(r.trigger), r.execute ? humanize(r.execute) + ' form' : '', r.triggerFields.length ? 'on change of ' + r.triggerFields.join(', ') : '', r.criteria && r.criteria.text ? 'when ' + r.criteria.text : ''].filter(Boolean).join('; '), r.actions.map(a => a.type + (a.fields.length ? ': ' + a.fields.join(', ') : '') + (a.hasScript ? ' (script — effect ' + TBC + ')' : '')).join('\n')]), [1.6, 2.4, 3], 'rules');
        if (lk.length) TB(['Field', 'Related module', 'Relationship'], lk.map(f => [f.label, (F.moduleView(f.lookup) || {}).label || f.lookup, (f.type === 'Multi Lookup' ? 'Many' : 'One') + ' ' + ((F.moduleView(f.lookup) || {}).label || f.lookup) + ' per ' + m.label + (f.status === 'proposed' ? ' (proposed)' : '')]), [2, 2, 3], 'rel'); }
      const wr = B && std ? B.workflowRules.filter(r => r.module === m.name && r.enabled) : []; const nt = B && std ? B.notifications.filter(r => r.module === m.name && r.enabled) : []; const bt = B && std ? B.buttons.filter(r => r.module === m.name && r.enabled) : []; const sl = B && std ? B.sla.filter(r => r.module === m.name && r.enabled) : [];
      if (wr.length + nt.length + bt.length + sl.length) { H(2, 'Workflows, Automations & Notifications', 'h2w');
        TB(['Name', 'Type', 'Trigger', 'Condition', 'What it does'], [].concat(wr.map(r => [r.name, 'Workflow rule', r.eventLabel, r.criteria && r.criteria.text || '—', F.actionsText(r.actions).join('\n')]), nt.map(r => [r.name, 'Notification', r.eventLabel, r.criteria && r.criteria.text || '—', 'Recipients: ' + (r.actions.recipients.join(', ') || TBC)]), bt.map(r => [r.name, 'Button', humanize(r.position), r.criteria && r.criteria.text || '—', (r.actionType || humanize(r.buttonType)) + (r.targetModule ? ' — creates ' + ((F.moduleView(r.targetModule) || {}).label || r.targetModule) : '') + (r.performers.length ? '\nAvailable to: ' + r.performers.map(p => p.name).join(', ') : '\nAvailable to: User / Role to Be Confirmed')]), sl.map(r => [r.name, 'SLA policy', 'Record matches policy', r.criteria && r.criteria.text || '—', r.commitments.map(c => c.entities.map(e => e.entity + ' within ' + F.secs(e.seconds)).join(', ')).join('; ')])), [1.5, 1, 1.5, 2, 2.4], 'auto'); }
      if (!std) {
        const nts = (S.ws.notifications || []).filter(n => n.module === m.name); if (nts.length) { H(2, 'Notifications Agreed', 'h2na'); TB(['Notification', 'Trigger', 'Channels', 'Recipients'], nts.map(n => [n.name || '—', [humanize(n.trigger || ''), n.state ? 'in ' + n.state : ''].filter(Boolean).join(' '), (n.channels || []).join(', ') || '—', (Array.isArray(n.recipients) ? n.recipients.join(', ') : String(n.recipients || '')) || TBC]), [1.8, 1.8, 1.2, 2.2], 'ntf'); }
        const perms = [], seenR = new Set(); const addP = rid => { if (seenR.has(rid)) return; seenR.add(rid); const p = root.FWBViews.proposedPerm ? root.FWBViews.proposedPerm(rid, m.name) : null; if (p) perms.push([F.actorLabel(rid), F.permText(p, m.name)]); }; Object.keys(S.ws.rolePermOps || {}).forEach(addP); (S.ws.roles || []).forEach(r => addP(r.id));
        if (perms.length) { H(2, 'Roles and Permissions Agreed', 'h2pa'); TB(['Role', 'Access'], perms, [2.4, 4.5], 'pma'); }
        const cxs = ((S.ws.crossLinks || {})[m.name] || []); if (cxs.length) { H(2, 'Actions Across Modules', 'h2cx'); TB(['Action', 'Goes to', 'What it does', 'When'], cxs.map(x => [x.name, ((F.moduleView(x.to) || {}).label) || x.to, humanize(x.kind || ''), x.condition || '—']), [2, 1.6, 1.6, 2], 'cxl'); }
        const apps = (((F.doc('design_proposals') || {}).items) || []).filter(p => p.kind === 'connectedapp' && p.status === 'applied' && [m.name, m.label].some(x => String(x).toLowerCase() === String(p.module).toLowerCase())); if (apps.length) { H(2, 'Connected Apps', 'h2ca'); TB(['App', 'Opens from', 'Purpose', 'Used by'], apps.map(p => [p.name, (p.triggerLabel ? p.triggerLabel + ' ' : '') + p.trigger, p.purpose + (p.shows ? ' It shows: ' + p.shows : ''), (p.users || []).join(', ') || TBC]), [1.6, 1.4, 3, 1.4], 'cap'); }
      }
      const cs = F.changeSummary(); const mine = [].concat(cs.additions.map(x => ['Addition', x]), cs.modifications.map(x => ['Modification', x]), cs.removals.map(x => ['Removal', x])).filter(([, x]) => x.module === m.name);
      if (mine.length) { H(2, 'Proposed Changes', 'h2c'); TB(['Change', 'Area', 'Item', 'Detail'], mine.map(([k, x]) => [k, x.area, x.item, x.detail]), [1, 1, 2, 3], 'chg'); }
      relSol.forEach(a => { H(2, 'Related solution: ' + a.label, 'h2rs:' + a.key); a.paras.forEach((t, i) => P(t, 'sol:' + a.key + ':' + i)); solNote(a.key); if (a.table) TB(a.table.headers, a.table.rows, a.table.widths, 'solt:' + a.key); });
      if (intSol.length) { H(2, 'Integrations', 'h2in'); P('This module takes part in: ' + intSol.join('; ') + '. The solution is written in the section Agreed Solution: Other Areas.', 'intref'); }
      H(2, 'Limitations, Assumptions & Open Questions', 'h2l'); const lim = [];
      const fo = F.effFields(m.name).filter(f => f.formOnly).length; if (fo) lim.push(fo + ' platform fields appear only on forms; their data-model attributes are ' + TBC + '.');
      flows.forEach(f => { const n = f.transitions.filter(t => !t.removed && t.enabled !== false && t.type === 'user' && (t.actors || []).every(F.isTbc)).length; if (n) lim.push(n + ' transition(s) in ' + q(f.name) + ' have no configured role and are shown as “User / Role to Be Confirmed”.'); });
      if (w.exceptions) w.exceptions.split('\n').filter(Boolean).forEach(x => lim.push(x)); (w.questions || '').split('\n').map(x => x.trim()).filter(Boolean).forEach(x => lim.push('Open question: ' + x));
      UL(lim.length ? lim : ['No limitations identified.'], 'lim');
    }
    return { blocks, stats: { modules: inScope.length, questions: allQuestions.length, confirmed: confirmed.length, pending: pending.length } };
  }

  // ---------- apply consultant edits ----------
  const cellText = c => Array.isArray(c) ? c.map(x => typeof x === 'object' && x ? x.text : String(x == null ? '' : x)).join('\n') : (c && typeof c === 'object' ? c.text : String(c == null ? '' : c));
  function applyEdits(blocks) {
    const d = BD(); const out = [];
    // inserted blocks (paragraph, heading, list or table) follow the block they were added after; they can be chained. An imported BRD is one title block plus a chain of these.
    const emit = id => (d.inserts[id] || []).forEach(ins => { const t = ins.t || 'p'; out.push(Object.assign({}, ins, { t, inserted: true, after: id }, t === 'table' ? { widths: ins.headers.map(() => 1), rows: ins.rows } : {})); emit(ins.id); });
    blocks.forEach(b => {
      if (d.hidden[b.id]) { out.push(Object.assign({}, b, { hiddenBlock: true })); return; }
      const e = d.edits[b.id]; let x = b;
      if (e && (b.t === 'p' || b.t === 'h')) x = Object.assign({}, b, { text: e.text, html: e.html, edited: true, stale: e.base !== undefined && e.base !== b.text, base: b.text });
      else if (e && b.t === 'ul') x = Object.assign({}, b, { items: e.text.split('\n').filter(Boolean), edited: true, stale: e.base !== undefined && e.base !== b.items.join('\n') });
      if (b.t === 'table') { let any = false; const rows = b.rows.map((r, ri) => r && r.sub ? r : r.map((c, ci) => { const ce = d.edits[b.id + '#' + ri + '.' + ci]; if (ce) { any = true; return { text: ce.text, edited: true }; } return c; })); const headers = b.headers.map((h, ci) => { const he = d.edits[b.id + '#h.' + ci]; if (he) { any = true; return he.text; } return h; }); if (any) x = Object.assign({}, b, { rows, headers, edited: true }); }
      out.push(x); emit(b.id);
    });
    return out;
  }
  // Rich text kept in an edited paragraph: only bold, italic, underline and line breaks survive; everything else becomes plain text.
  const escH = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const MARK = { B: 'b', STRONG: 'b', I: 'i', EM: 'i', U: 'u' };
  function cleanHtml(h) { const body = new DOMParser().parseFromString('<body>' + h, 'text/html').body; let out = ''; const walk = n => n.childNodes.forEach(c => { if (c.nodeType === 3) out += escH(c.nodeValue.replace(/ /g, ' ')); else if (c.nodeName === 'BR') out += '<br>'; else if (MARK[c.nodeName]) { out += '<' + MARK[c.nodeName] + '>'; walk(c); out += '</' + MARK[c.nodeName] + '>'; } else walk(c); }); walk(body); return out; }
  // cleaned html -> runs for the exports
  function htmlRuns(h) { const body = new DOMParser().parseFromString('<body>' + h, 'text/html').body; const out = []; const walk = (n, st) => n.childNodes.forEach(c => { if (c.nodeType === 3) out.push(Object.assign({ text: c.nodeValue }, st)); else if (c.nodeName === 'BR') out.push({ br: true }); else walk(c, MARK[c.nodeName] ? Object.assign({}, st, { [{ b: 'bold', i: 'italics', u: 'underline' }[MARK[c.nodeName]]]: true }) : st); }); walk(body, {}); return out; }
  function document_() { const r = buildBlocks(); r.blocks = applyEdits(r.blocks); return r; }

  // ---------- logos ----------
  async function logoData() { const d = BD(); const out = {}; for (const k of ['facilio', 'customer']) { const l = d.logos[k]; if (!l || !l.fileId) continue; try { const im = await root.FWBViews.docImage(await root.FWBViews.fileBlob(l.fileId)); const url = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(new Blob([im.u8], { type: im.mime })); }); out[k] = { u8: im.u8, url, w: im.w, h: im.h, type: im.type }; } catch (e) { console.warn('logo', k, e); } } return out; }
  // the size chosen for a figure on the BRD page: 'fit' (page width, default), 'large' (a full page) or 'land' (a landscape page of its own)
  const figSize = id => { const f = (BD().figSize || {})[id]; return ['large', 'land'].includes(f) ? f : 'fit'; };
  // render at about three pixels per printed pixel so a diagram stays sharp when enlarged in Word (within the browser's canvas limits)
  // and how much of that space it fills (30 to 100 %, default 100), set with − / + or by dragging the corner on the BRD page
  const figPct = id => { const v = Number((BD().figPct || {})[id]); return Number.isFinite(v) && v >= 30 && v <= 100 ? Math.round(v) : 100; };
  const figScale = (svg, targetPx) => { const m = String(svg).match(/viewBox="-?[\d.]+ -?[\d.]+ (\d+(?:\.\d+)?)/); const w = m ? +m[1] : 800; return Math.max(2, Math.min(6, 3 * targetPx / w)); };
  const fit = (w, h, mw, mh) => { const s = Math.min(mw / w, mh / h, 1); return { width: Math.max(1, Math.round(w * s)), height: Math.max(1, Math.round(h * s)) }; };

  // ================= DOCX =================
  async function toDocx(progress) {
    progress = progress || (() => { }); const X = await root.FWBViews.loadDocx();
    const P = profile(); const PW = P.page.w - P.page.left - P.page.right; const pr = S.ws.project; const font = P.font || 'Calibri';
    const { Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, AlignmentType, ImageRun, PageBreak, TableOfContents, Header, Footer, PageNumber, LevelFormat, VerticalAlign } = X;
    const docm = document_(); const logos = await logoData(); let body = []; const sections = [];
    const BORDER = { style: BorderStyle.SINGLE, size: 4, color: '000000' }; const borders = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER, insideHorizontal: BORDER, insideVertical: BORDER };
    const NOB = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }; const noBorders = { top: NOB, bottom: NOB, left: NOB, right: NOB, insideHorizontal: NOB, insideVertical: NOB };
    const run = (t, o) => new TextRun(Object.assign({ text: String(t == null ? '' : t), font }, o || {}));
    const cellParas = (v, o) => { o = o || {}; const lines = Array.isArray(v) ? v : (v && typeof v === 'object' ? [v] : String(v == null ? '' : v).split('\n')); return lines.flatMap(l => { if (l && typeof l === 'object') return String(l.text || '').split('\n').map(t => new Paragraph({ spacing: { after: 20 }, keepNext: o.keepNext, alignment: o.align, children: [run(t, { bold: l.bold || o.bold, color: l.color || o.color, size: l.size || o.size || 17, italics: l.italics })] })); return [new Paragraph({ spacing: { after: 20 }, keepNext: o.keepNext, alignment: o.align, children: [run(l, { bold: o.bold, color: o.color, size: o.size || 17 })] })]; }); };
    const logoRun = (l, mw, mh) => { const s = fit(l.w, l.h, mw, mh); return new ImageRun({ type: l.type, data: l.u8, transformation: s }); };
    let i = 0;
    for (const b of docm.blocks) {
      if (b.hiddenBlock) continue; if (++i % 40 === 0) { progress('Writing Word document… ' + Math.round(i / docm.blocks.length * 100) + '%'); await new Promise(r => setTimeout(r, 0)); }
      if (b.t === 'cover') { body.push(new Paragraph({ spacing: { before: 600 } }));
        if (logos.facilio || logos.customer) body.push(new Table({ width: { size: PW, type: WidthType.DXA }, columnWidths: [PW / 2, PW / 2], borders: noBorders, rows: [new TableRow({ children: [new TableCell({ borders: noBorders, width: { size: PW / 2, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.LEFT, children: logos.facilio ? [logoRun(logos.facilio, 200, 80)] : [] })] }), new TableCell({ borders: noBorders, width: { size: PW / 2, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: logos.customer ? [logoRun(logos.customer, 200, 80)] : [] })] })] })] }));
        body.push(new Paragraph({ spacing: { before: 2000, after: 240 }, alignment: AlignmentType.CENTER, children: [run(b.title, { bold: true, size: 52, color: P.h1.color })] }));
        body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [run(b.subtitle, { size: 30 })] })); body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [run('for', { size: 24, color: '607796' })] }));
        body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [run(b.customer, { bold: true, size: 36 })] }));
        body.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [run('Version ' + b.version + '  ·  ' + b.date, { size: 22, color: '607796' })] })); body.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [run('Status: ' + b.status, { size: 22, color: '607796' })] })); continue; }
      if (b.t === 'pagebreak') { body.push(new Paragraph({ children: [new PageBreak()] })); continue; }
      if (b.t === 'toc') { body.push(new Paragraph({ children: [run('Table of Contents', { bold: true, size: P.h1.size, color: P.h1.color })], spacing: { after: 200 } })); body.push(new TableOfContents('Table of Contents', { hyperlink: true, headingStyleRange: '1-2' })); body.push(new Paragraph({ children: [run('Right-click the table and choose “Update Field” to refresh page numbers.', { italics: true, size: 16, color: '7B91B0' })] })); continue; }
      if (b.t === 'h') { body.push(new Paragraph({ heading: [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3][b.lvl - 1], pageBreakBefore: !!b.pageBreakBefore, keepNext: true, children: [run(b.text)] })); continue; }
      if (b.t === 'p') { const kids = b.label ? [run(b.label, { bold: true }), run(' ' + b.text)] : b.html ? htmlRuns(b.html).map(r => r.br ? new TextRun({ break: 1 }) : run(r.text, { bold: !!b.bold || r.bold, italics: r.italics, underline: r.underline ? {} : undefined })) : [run(b.text, { bold: !!b.bold, italics: b.style === 'caption', size: b.style === 'caption' ? 17 : undefined, color: b.style === 'caption' ? '607796' : undefined })]; body.push(new Paragraph({ children: kids, spacing: { after: 120, line: 276 } })); continue; }
      if (b.t === 'ul') { b.items.forEach(x => body.push(new Paragraph({ numbering: { reference: 'bul', level: 0 }, spacing: { after: 60 }, children: [run(x)] }))); continue; }
      if (b.t === 'figure') { const sz = figSize(b.id); const land = sz === 'land';
        // page area in pixels (twips / 15); a landscape figure gets a page of its own turned sideways, a large one a full portrait page
        const k = figPct(b.id) / 100; let maxW = land ? Math.round((P.page.h - P.page.left - P.page.right) / 15) : Math.round(PW / 15), maxH = land ? Math.round((P.page.w - P.page.top - P.page.bottom) / 15) - 70 : sz === 'large' ? Math.round((P.page.h - P.page.top - P.page.bottom) / 15) - 90 : 820;
        maxW = Math.round(maxW * k); maxH = Math.round(maxH * k); if (land) { sections.push(body); body = []; }
        try { const png = await D.svgToPng(b.svg, figScale(b.svg, maxW)); const s = fit(png.width, png.height, maxW, maxH); if (sz === 'large') body.push(new Paragraph({ children: [new PageBreak()] })); body.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, children: [new ImageRun({ type: 'png', data: png.data, transformation: s })] })); } catch (e) { body.push(new Paragraph({ children: [run('[Diagram could not be rendered]')] })); } if (b.caption) body.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [run(b.caption, { italics: true, size: 18, color: '607796' })] }));
        if (land) { sections.push({ land: true, kids: body }); body = []; } continue; }
      if (b.t === 'table') { const tot = b.widths.reduce((a, c) => a + c, 0); const w = b.widths.map(x => Math.round(x * PW / tot));
        const hdr = new TableRow({ tableHeader: true, cantSplit: true, children: b.headers.map((h, k) => new TableCell({ width: { size: w[k], type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: 'auto', fill: P.tableHeaderFill }, verticalAlign: VerticalAlign.CENTER, margins: { top: 50, bottom: 50, left: 80, right: 80 }, children: cellParas(h, { bold: true, keepNext: true, color: P.tableHeaderColor, align: AlignmentType.CENTER }) })) });
        const trs = b.rows.map(r => r && r.sub ? new TableRow({ cantSplit: true, children: [new TableCell({ columnSpan: b.headers.length, width: { size: PW, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F2F2F2' }, margins: { top: 40, bottom: 40, left: 80, right: 80 }, children: cellParas(r.sub, { bold: true, keepNext: true }) })] }) : new TableRow({ cantSplit: true, children: r.map((c, k) => new TableCell({ width: { size: w[k], type: WidthType.DXA }, margins: { top: 40, bottom: 40, left: 80, right: 80 }, children: cellParas(c) })) }));
        body.push(new Table({ width: { size: PW, type: WidthType.DXA }, columnWidths: w, borders, rows: [hdr].concat(trs.length ? trs : [new TableRow({ children: [new TableCell({ columnSpan: b.headers.length, width: { size: PW, type: WidthType.DXA }, children: cellParas(b.empty || 'None', { color: '607796' }) })] })]) }));
        body.push(new Paragraph({ spacing: { after: 60 } })); continue; }
    }
    const hdrKids = [new Table({ width: { size: PW, type: WidthType.DXA }, columnWidths: [PW / 3, PW / 3, PW / 3], borders: noBorders, rows: [new TableRow({ children: [new TableCell({ borders: noBorders, width: { size: PW / 3, type: WidthType.DXA }, children: [new Paragraph({ children: logos.facilio ? [logoRun(logos.facilio, 110, 32)] : [] })] }), new TableCell({ borders: noBorders, width: { size: PW / 3, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run((P.headerText ? P.headerText + ' · ' : '') + titleOf(), { size: 15, color: '7B91B0' })] })] }), new TableCell({ borders: noBorders, width: { size: PW / 3, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: logos.customer ? [logoRun(logos.customer, 110, 32)] : [] })] })] })] })];
    const doc = new X.Document({ creator: pr.consultant || 'Facilio', title: (pr.client || 'Customer') + ' ' + titleOf(), description: 'Generated by Facilio Delivery Studio', features: { updateFields: true },
      styles: { default: { document: { run: { font, size: P.bodySize || 21 } } }, paragraphStyles: [1, 2, 3].map(n => ({ id: 'Heading' + n, name: 'Heading ' + n, basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: P['h' + n].size, bold: true, color: P['h' + n].color, font: P['h' + n].font || font }, paragraph: { spacing: { before: 240 - n * 20, after: 160 - n * 20 }, outlineLevel: n - 1, keepNext: true } })) },
      numbering: { config: [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }] },
      sections: sections.concat([body]).map(x => Array.isArray(x) ? { kids: x } : x).filter((x, i) => i === 0 || x.kids.length).map((x, i) => ({ properties: { page: { size: x.land ? { width: P.page.h, height: P.page.w, orientation: X.PageOrientation ? X.PageOrientation.LANDSCAPE : 'landscape' } : { width: P.page.w, height: P.page.h }, margin: { top: P.page.top, right: P.page.right, bottom: P.page.bottom, left: P.page.left } }, titlePage: i === 0 },
        headers: { default: new Header({ children: hdrKids }), first: new Header({ children: [new Paragraph('')] }) },
        footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run((P.footerText ? P.footerText + '  ·  ' : '') + 'Confidential  ·  Page ', { size: 16, color: '7B91B0' }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '7B91B0', font }), run(' of ', { size: 16, color: '7B91B0' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '7B91B0', font })] })] }), first: new Footer({ children: [new Paragraph('')] }) },
        children: x.kids })) });
    progress('Packaging the Word document…'); return { blob: await X.Packer.toBlob(doc), stats: docm.stats };
  }

  // ================= PDF (pdfmake; same blocks) =================
  async function toPdf(progress) {
    progress = progress || (() => { }); const V = root.FWBViews; const pm = await V.loadPdfMake();
    const P = profile(); const pr = S.ws.project; const docm = document_(); const logos = await logoData(); const c = h => '#' + h; const content = [];
    const pt = twip => twip / 20; const PWpt = pt(P.page.w - P.page.left - P.page.right);
    const cellNode = v => { const lines = Array.isArray(v) ? v : (v && typeof v === 'object' ? [v] : String(v == null ? '' : v).split('\n')); return { stack: lines.map(l => typeof l === 'object' && l ? { text: String(l.text || ''), bold: !!l.bold, color: l.color ? c(l.color) : undefined, fontSize: l.size ? l.size / 2 : 8.5 } : { text: String(l), fontSize: 8.5 }) }; };
    let i = 0; const toc = { toc: { title: { text: 'Table of Contents', style: 'h1' } } };
    for (const b of docm.blocks) {
      if (b.hiddenBlock) continue; if (++i % 40 === 0) { progress('Writing PDF… ' + Math.round(i / docm.blocks.length * 100) + '%'); await new Promise(r => setTimeout(r, 0)); }
      if (b.t === 'cover') { content.push({ columns: [logos.facilio ? Object.assign({ image: logos.facilio.url }, fit(logos.facilio.w, logos.facilio.h, 150, 60)) : { text: '' }, logos.customer ? Object.assign({ image: logos.customer.url, alignment: 'right' }, fit(logos.customer.w, logos.customer.h, 150, 60)) : { text: '' }], margin: [0, 20, 0, 0] });
        content.push({ text: b.title, fontSize: 26, bold: true, color: c(P.h1.color), alignment: 'center', margin: [0, 150, 0, 12] }, { text: b.subtitle, fontSize: 15, alignment: 'center', margin: [0, 0, 0, 6] }, { text: 'for', fontSize: 12, color: '#607796', alignment: 'center', margin: [0, 0, 0, 6] }, { text: b.customer, fontSize: 18, bold: true, alignment: 'center', margin: [0, 0, 0, 40] }, { text: 'Version ' + b.version + '  ·  ' + b.date, fontSize: 11, color: '#607796', alignment: 'center' }, { text: 'Status: ' + b.status, fontSize: 11, color: '#607796', alignment: 'center' }); continue; }
      if (b.t === 'pagebreak') { if (content.length) content[content.length - 1].pageBreak = 'after'; continue; }
      if (b.t === 'toc') { content.push(toc); continue; }
      if (b.t === 'h') { content.push({ text: b.text, style: 'h' + b.lvl, tocItem: b.lvl <= 2, tocMargin: [b.lvl === 2 ? 14 : 0, 0, 0, 0], pageBreak: b.pageBreakBefore ? 'before' : undefined, headlineLevel: b.lvl }); continue; }
      if (b.t === 'p') { content.push(b.label ? { text: [{ text: b.label + ' ', bold: true }, b.text], margin: [0, 0, 0, 6] } : { text: b.html ? htmlRuns(b.html).map(r => r.br ? { text: '\n' } : { text: r.text, bold: r.bold, italics: r.italics, decoration: r.underline ? 'underline' : undefined }) : b.text, bold: !!b.bold, italics: b.style === 'caption', fontSize: b.style === 'caption' ? 8.5 : undefined, color: b.style === 'caption' ? '#607796' : undefined, margin: [0, 0, 0, 6] }); continue; }
      if (b.t === 'ul') { content.push({ ul: b.items, margin: [0, 0, 0, 6] }); continue; }
      if (b.t === 'figure') { const sz = figSize(b.id); const land = sz === 'land'; const k = figPct(b.id) / 100; const mw = (land ? pt(P.page.h - P.page.left - P.page.right) : PWpt) * k, mh = (land ? pt(P.page.w - P.page.top - P.page.bottom) - 50 : sz === 'large' ? pt(P.page.h - P.page.top - P.page.bottom) - 60 : 640) * k;
        try { const png = await D.svgToPng(b.svg, figScale(b.svg, mw * 4 / 3)); const s = fit(png.width, png.height, mw, mh); content.push(Object.assign({ image: png.dataUrl, width: s.width, height: s.height, alignment: 'center', margin: [0, 4, 0, 2] }, land ? { pageBreak: 'before', pageOrientation: 'landscape' } : sz === 'large' ? { pageBreak: 'before' } : {})); } catch (e) { content.push({ text: '[Diagram could not be rendered]' }); } if (b.caption) content.push({ text: b.caption, italics: true, fontSize: 8.5, color: '#607796', alignment: 'center', margin: [0, 0, 0, 8] });
        if (land) content.push({ text: '', pageBreak: 'before', pageOrientation: 'portrait' }); continue; }
      if (b.t === 'table') { const tot = b.widths.reduce((a, x) => a + x, 0); const widths = b.widths.map(x => x / tot * PWpt - 4); const n = b.headers.length;
        const body = [b.headers.map(h => ({ text: h, bold: true, fillColor: c(P.tableHeaderFill), color: c(P.tableHeaderColor), alignment: 'center', fontSize: 8.5 }))];
        b.rows.forEach(r => { if (r && r.sub) body.push([Object.assign({ text: r.sub, bold: true, fillColor: '#F2F2F2', colSpan: n, fontSize: 8.5 })].concat(Array(n - 1).fill({}))); else body.push(r.map(cellNode)); });
        if (!b.rows.length) body.push([Object.assign({ text: b.empty || 'None', color: '#607796', colSpan: n, fontSize: 8.5 })].concat(Array(n - 1).fill({})));
        content.push({ table: { headerRows: 1, widths, body, dontBreakRows: true }, layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 2, paddingBottom: () => 2 }, margin: [0, 2, 0, 8] }); continue; }
    }
    const dd = { pageSize: { width: pt(P.page.w), height: pt(P.page.h) }, pageMargins: [pt(P.page.left), pt(P.page.top) + 10, pt(P.page.right), pt(P.page.bottom)], info: { title: (pr.client || 'Customer') + ' ' + (pr.docTitle || 'BRD'), creator: 'Facilio Delivery Studio' },
      defaultStyle: { font: 'Roboto', fontSize: (P.bodySize || 21) / 2 - 0.5, lineHeight: 1.15 }, styles: { h1: { fontSize: P.h1.size / 2, bold: true, color: c(P.h1.color), margin: [0, 12, 0, 8] }, h2: { fontSize: P.h2.size / 2, bold: true, color: c(P.h2.color), margin: [0, 10, 0, 6] }, h3: { fontSize: P.h3.size / 2, bold: true, color: c(P.h3.color), margin: [0, 8, 0, 4] } },
      header: (page) => page === 1 ? null : { columns: [logos.facilio ? Object.assign({ image: logos.facilio.url }, fit(logos.facilio.w, logos.facilio.h, 80, 24)) : { text: '' }, { text: (P.headerText ? P.headerText + ' · ' : '') + titleOf(), fontSize: 7.5, color: '#7B91B0', alignment: 'center', margin: [0, 6, 0, 0] }, logos.customer ? Object.assign({ image: logos.customer.url, alignment: 'right' }, fit(logos.customer.w, logos.customer.h, 80, 24)) : { text: '' }], margin: [pt(P.page.left), 20, pt(P.page.right), 0] },
      footer: (page, pages) => page === 1 ? null : { text: (P.footerText ? P.footerText + '  ·  ' : '') + 'Confidential  ·  Page ' + page + ' of ' + pages, fontSize: 8, color: '#7B91B0', alignment: 'center', margin: [0, 10, 0, 0] },
      pageBreakBefore: (node, following) => node.headlineLevel && following.length === 0, content };
    progress('Rendering PDF pages…'); const blob = await new Promise((res, rej) => { try { pm.createPdf(dd).getBlob(res); } catch (e) { rej(e); } });
    return { blob, stats: docm.stats };
  }

  root.FWBBrd = { includeStd, remove: removeBrd, cleanHtml, figSize, figPct, titleOf, TYPES, INTEG_RE, list: brdList, activeId, activeRec, state: BD, scopeSet, slug, buildBlocks, applyEdits, document: document_, toDocx, toPdf, profileTemplate, profile, SECTIONS, sectionOrder, DEFAULT_PROFILE, cellText, logoData, fit };
})(typeof window !== 'undefined' ? window : globalThis);

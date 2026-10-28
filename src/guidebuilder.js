/* User Guide Builder: a customer-specific procedural guide made of sections with text and screenshots.
   Starts blank, from the Configuration Inputs, or from an AI guide draft. Branding, quality checks, owner approval, Word and PDF export.
   Guides are project records (kind ugd); screenshots are project files (category guide_media). Approval is set only by the server's decision route. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items; const API = root.FWBApi;
  const { tag, drawer, closeDrawer, toast, ico, confirmDialog } = V;
  const canEdit = () => !V.isCustomer() && !S.readonly; const canApprove = () => !V.isCustomer() && S.project && S.project.role === 'owner';
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const TABS = [['content', 'Content'], ['update', 'Update from configuration'], ['versions', 'Version history'], ['brand', 'Branding'], ['checks', 'Quality checks'], ['export', 'Export']];
  let W = null, WID = null, timer = null, saving = false, dirtyAt = 0;
  const strip = t => String(t || '').replace(/\s*\[S\d+\]/g, '');
  const when = d => d ? V.fmtDate(d) : '';

  // ---------- markdown helpers ----------
  function parseMd(src) {
    const L = strip(src).split('\n'); const out = []; let ul = null, ol = null, tb = null, p = [];
    const flush = () => { if (p.length) { out.push({ t: 'p', text: p.join(' ') }); p = []; } if (ul) { out.push({ t: 'ul', items: ul }); ul = null; } if (ol) { out.push({ t: 'ol', items: ol }); ol = null; } if (tb) { out.push({ t: 'table', rows: tb }); tb = null; } };
    L.forEach(ln => { const t = ln.trim(); let m;
      if (!t) { flush(); return; }
      if (/^\|.*\|$/.test(t)) { if (/^\|[\s:|-]+\|$/.test(t)) return; const cells = t.slice(1, -1).split('|').map(c => c.trim()); if (!tb) { flush(); tb = []; } tb.push(cells); return; }
      if ((m = t.match(/^(#{1,3})\s+(.*)/))) { flush(); out.push({ t: 'h', lvl: m[1].length, text: m[2] }); return; }
      if ((m = t.match(/^[-*•]\s+(.*)/))) { if (!ul) { flush(); ul = []; } ul.push(m[1]); return; }
      if ((m = t.match(/^\d+[.)]\s+(.*)/))) { if (!ol) { flush(); ol = []; } ol.push(m[1]); return; }
      if (ul || ol || tb) flush(); p.push(t); });
    flush(); return out;
  }
  const runs = t => String(t).split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(x => /^\*\*[^*]+\*\*$/.test(x) ? { text: x.slice(2, -2), bold: true } : { text: x });
  function mdToBlocks(md, frames) {
    const blocks = []; let buf = [];
    const flush = () => { const t = buf.join('\n').trim(); if (t) blocks.push({ t: 'md', text: t }); buf = []; };
    strip(md).split('\n').forEach(ln => { const m = ln.match(/\[F(\d+)\]/); if (m) { const rest = ln.replace(/\[F\d+\]/g, '').trim(); if (rest) buf.push(rest); flush(); const f = (frames || [])[Number(m[1]) - 1]; if (f && f.fileId) blocks.push({ t: 'img', fileId: f.fileId, caption: f.caption || '' }); } else buf.push(ln); });
    flush(); return blocks;
  }
  V.guideMdToBlocks = mdToBlocks; V.ugSectionsFromMd = md => sectionsFromMd(md);
  function sectionsFromMd(md) {
    const secs = []; let cur = null; strip(md).split('\n').forEach(ln => { const m = ln.match(/^#{1,2}\s+(.*)/); if (m) { cur = { id: uid('s'), title: m[1].trim(), body: [] }; secs.push(cur); } else { if (!cur) { cur = { id: uid('s'), title: 'Introduction', body: [] }; secs.push(cur); } cur.body.push(ln); } });
    return secs.map(s => ({ id: s.id, title: s.title, blocks: s.body.join('\n').trim() ? [{ t: 'md', text: s.body.join('\n').trim() }] : [] })).filter(s => s.title);
  }

  // ---------- working copy ----------
  const guides = () => I().list('ugd').sort((a, b) => String(b._at || '').localeCompare(String(a._at || '')));
  function open(id) { const g = I().get('ugd', id); if (!g) return false; W = JSON.parse(JSON.stringify(g)); ['id', '_v', '_at', '_by', '_side', '_created', '_cside'].forEach(k => delete W[k]); W.sections = W.sections || []; W.brand = Object.assign({ accent: '#1570EF', footer: '', cover: true, logo: null }, W.brand || {}); WID = id; return true; }
  function schedule() { dirtyAt = Date.now(); clearTimeout(timer); timer = setTimeout(save, 900); const el = document.getElementById('ugState'); if (el) el.textContent = 'Unsaved changes…'; }
  async function save() {
    if (!W || saving || !canEdit()) return; clearTimeout(timer); saving = true; const at = dirtyAt;
    try { const r = await I().put('ugd', WID, W, { silent: true }); W.status = r.status; W.approvedBy = r.approvedBy; W.approvedAt = r.approvedAt; const el = document.getElementById('ugState'); if (el) el.textContent = at === dirtyAt ? 'All changes saved' : 'Unsaved changes…'; if (at !== dirtyAt) schedule(); }
    catch (e) { toast(e.message || 'Could not save', 6000, true); } finally { saving = false; }
  }
  const flush = async () => { if (W && dirtyAt && canEdit()) { await save(); } };
  const edit = fn => { fn(); schedule(); };
  V.ugCtx = { W: () => W, id: () => WID, edit, flush, canEdit, canApprove, schedule };
  const touchRender = () => { schedule(); V.render(); };

  // ---------- quality checks ----------
  function checks(g) {
    const out = []; const add = (sev, area, item, detail) => out.push({ sev, area, item, detail }); const secs = g.sections || [];
    if (!secs.length) add('medium', 'Guide', g.title, 'The guide has no sections yet.');
    if (!String(g.customer || '').trim()) add('low', 'Guide', 'Customer name', 'Add the customer name on the Branding tab (shown on the cover).');
    const titles = {}; let all = '';
    secs.forEach(s => {
      const txt = (s.blocks || []).filter(b => b.t === 'md').map(b => b.text).join('\n'); all += ' ' + s.title + ' ' + txt; const imgs = (s.blocks || []).filter(b => b.t === 'img');
      if (!txt.trim() && !imgs.length) add('medium', 'Section', s.title, 'The section is empty.');
      if ((txt.match(/^\s*\d+[.)]\s/gm) || []).length >= 3 && !imgs.length) add('low', 'Section', s.title, 'Has numbered steps but no screenshot.');
      imgs.forEach((b, i) => { if (!String(b.caption || '').trim()) add('low', 'Section', s.title, 'Screenshot ' + (i + 1) + ' has no caption.'); });
      if (/\[S\d+\]/.test(txt)) add('low', 'Section', s.title, 'AI source tags such as [S1] are still in the text (they are removed on export).');
      if (/\bMissing\b\s*[:.\-–]|\(Missing\)|\*\*Missing\*\*/i.test(txt)) add('medium', 'Section', s.title, 'A "Missing" marker from the AI draft is still in the text. Fill it in or remove it.');
      if (/\bAssumption\b\s*[:.\-–]|\(Assumption\)|\*\*Assumption\*\*/i.test(txt)) add('medium', 'Section', s.title, 'An "Assumption" label is still in the text. Confirm it with the customer.');
      if (/\b(TODO|TBD|TBC|XXX|lorem ipsum)\b/i.test(txt)) add('medium', 'Section', s.title, 'Placeholder text (TODO / TBD / TBC) is still in the text.');
      if (txt.length > 6000) add('low', 'Section', s.title, 'Very long section. Consider splitting it.');
      const k = s.title.trim().toLowerCase(); if (titles[k]) add('low', 'Section', s.title, 'Another section has the same title.'); titles[k] = 1;
    });
    const low = all.toLowerCase(); const cm = I().list('cmodx'), ca = I().list('capp');
    cm.filter(m => String(m.usage || '').trim()).forEach(m => { if (!low.includes(String(m.label || m.name).toLowerCase())) add('medium', 'Coverage', m.label || m.name, 'This custom module has usage instructions in Configuration Inputs but is not mentioned in the guide.'); });
    ca.forEach(a => { if (!low.includes(String(a.name).toLowerCase())) add('low', 'Coverage', a.name, 'This app is listed in Configuration Inputs but is not mentioned in the guide.'); });
    (V.guideUpdate && V.guideUpdate.checks ? V.guideUpdate.checks(g) : []).forEach(c => out.push(c));
    (V.ugDraft ? V.ugDraft.checks(g) : []).forEach(c => out.push(c));
    const o = { high: 0, medium: 1, low: 2 }; return out.sort((a, b) => o[a.sev] - o[b.sev]);
  }
  V.guideChecks = checks;

  // ---------- views ----------
  const STT = { draft: ['tbc', 'Draft'], approved: ['green', 'Approved'] };
  const stTag = s => { const x = STT[s] || STT.draft; return tag(x[0], x[1]); };
  V.guidebuilder = {
    html() {
      I().load(['ugd', 'cmodx', 'capp', 'vid', 'ai', 'ugv', 'ugu']); if (!I().ready(['ugd'])) return '<div class="page-body"><div class="muted" style="padding:20px">Loading…</div></div>';
      const can = canEdit();
      if (!S.ui.ugOpen || !(W && WID === S.ui.ugOpen) && !open(S.ui.ugOpen)) {
        S.ui.ugOpen = null; V.beforeLeave = null;
        return `<div class="page-header"><div class="t"><h1>User Guide Builder</h1><p>Write the customer's own procedural guide, the way a BRD is drafted: set up the modules, readers and sources, let the AI write each section from the project's records (or write them yourself), review and edit section by section, then approve and export to Word or PDF. Your edits are never overwritten, and sections whose sources change are flagged. (The <a href="#" data-act="nav" data-view="guide">Customer User Guide</a> is a different thing: the module workbook customers read before sessions.)</p></div><div class="row">${can ? `<button class="btn" data-act="ugNewUat">${ico('plus')}New UAT guide</button><button class="btn primary" data-act="ugNew">${ico('plus')}New guide</button>` : ''}</div></div>
        <div class="page-body"><div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Guide</th><th>Type</th><th>Audience</th><th>Status</th><th>Sections</th><th>Version</th><th>Updated</th><th></th></tr></thead><tbody>${guides().map(g => `<tr><td><b>${esc(g.title)}</b><div class="xs muted">${esc(g.customer || '')}</div></td><td class="small">${g.plan && g.plan.kind === 'uat' ? 'UAT guide' : 'User guide'}</td><td class="small">${esc(g.audience || '—')}</td><td>${stTag(g.status)}</td><td>${(g.sections || []).length}</td><td>${esc(g.version || '')}</td><td class="small">${esc(when(g._at))}</td><td style="text-align:right"><button class="btn sm" data-act="ugOpen" data-id="${esc(g.id)}">Open</button></td></tr>`).join('') || '<tr><td colspan="8" class="muted" style="padding:18px">No guides yet. Create one to get started.</td></tr>'}</tbody></table></div></div></div>`;
      }
      V.beforeLeave = () => { flush(); return true; };
      const tab = S.ui.ugTab || 'content'; const ck = checks(W);
      const head = `<div class="page-header"><div class="t"><h1>${esc(W.title)}</h1><p>${stTag(W.status)} <span class="small muted">${W.approvedBy ? 'Approved by ' + esc(W.approvedBy) + ' on ' + esc(when(W.approvedAt)) + '. ' : ''}<span id="ugState">All changes saved</span></span></p></div><div class="row"><button class="btn" data-act="ugBack">All guides</button></div></div>`;
      const bar = `<div class="tabs" role="tablist">${TABS.map(([k, l]) => `<button class="tab${tab === k ? ' active' : ''}" role="tab" data-act="ugTab" data-v="${k}">${l}${k === 'checks' && ck.length ? ` <span class="xs">(${ck.length})</span>` : ''}</button>`).join('')}</div>`;
      let body = '';
      if (tab === 'content') body = contentHtml(can);
      if (tab === 'update') body = V.guideUpdate ? V.guideUpdate.html() : '';
      if (tab === 'versions') body = V.guideUpdate ? V.guideUpdate.versionsHtml() : '';
      if (tab === 'brand') body = brandHtml(can);
      if (tab === 'checks') body = checksHtml(ck);
      if (tab === 'export') body = `<div class="card" style="padding:16px"><p class="small">Exports use the branding and the current content. ${W.status === 'approved' ? 'This guide is approved.' : 'This guide is a <b>draft</b>: the cover says so.'} AI source tags are removed. ${ck.filter(c => c.sev === 'medium').length ? `<b>${ck.filter(c => c.sev === 'medium').length} medium finding(s)</b> are still open on the Quality checks tab.` : ''}</p><div class="row" style="gap:8px"><button class="btn primary" data-act="ugDocx">${ico('dl')}Word (.docx)</button><button class="btn" data-act="ugPdf">${ico('dl')}PDF</button></div></div>`;
      return head + `<div class="page-body">${bar}<div style="margin-top:12px">${body}</div></div>`;
    },
    mount() { if (V.guideUpdate && V.guideUpdate.mount) V.guideUpdate.mount(); document.querySelectorAll('[data-ugimg]').forEach(async img => { try { const b = await V.fileBlob(img.getAttribute('data-ugimg')); img.src = URL.createObjectURL(b); } catch (e) { img.alt = 'Image not available'; } }); }
  };
  function contentHtml(can) {
    const s = W.sections; const d = can ? '' : 'disabled';
    return (V.ugDraft ? V.ugDraft.top(can) : '') + `<div class="row" style="gap:6px;margin-bottom:10px;flex-wrap:wrap">${can ? `<button class="btn sm" data-act="ugSecAdd">${ico('plus')}Add section</button><button class="btn sm" data-act="ugFromCfg">From Configuration Inputs</button><button class="btn sm" data-act="ugFromAi">From an AI guide draft</button><button class="btn sm" data-act="ugFromVid">From a walkthrough</button>${V.aiButton ? V.aiButton('guide', 'Generate guide draft') : ''}` : ''}</div>` +
      (s.map((sec, i) => `<div class="card" style="margin-bottom:12px"><div class="card-h"><input type="text" class="ug-title" data-ugt="${i}" value="${esc(sec.title)}" maxlength="120" ${d} style="font-weight:700;flex:1"><span class="row" style="gap:4px">${can ? `<button class="btn sm" data-act="ugSecMove" data-i="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button><button class="btn sm" data-act="ugSecMove" data-i="${i}" data-d="1" ${i === s.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button><button class="btn sm danger" data-act="ugSecDel" data-i="${i}">Delete</button>` : ''}</span></div>${V.ugDraft ? V.ugDraft.secBar(i, can) : ''}<div style="padding:0 14px 12px">${(sec.blocks || []).map((b, j) => b.t === 'img' ? `<div class="ug-blk" style="margin:8px 0"><img data-ugimg="${esc(b.fileId)}" alt="" style="max-width:100%;max-height:300px;border:1px solid #dbe6f7;border-radius:10px"><input type="text" data-ugc="${i}.${j}" value="${esc(b.caption || '')}" placeholder="Caption" maxlength="200" ${d}>${can ? blkTools(i, j, sec.blocks.length) : ''}</div>` : `<div class="ug-blk" style="margin:8px 0"><textarea data-ugm="${i}.${j}" rows="${Math.min(18, Math.max(4, String(b.text || '').split('\n').length + 1))}" ${d} style="font-family:ui-monospace,Menlo,monospace;font-size:12px">${esc(b.text || '')}</textarea>${can ? blkTools(i, j, sec.blocks.length) : ''}</div>`).join('')}${can ? `<div class="row" style="gap:6px;margin-top:6px"><button class="btn sm" data-act="ugTxtAdd" data-i="${i}">Add text</button><button class="btn sm" data-act="ugImgAdd" data-i="${i}">${ico('upl')}Add screenshot</button></div>` : ''}</div></div>`).join('') || '<div class="notice"><span>No sections yet. Add one, or start from the Configuration Inputs, an AI draft or a walkthrough.</span></div>') +
      `<div class="xs muted">Text accepts Markdown: # headings, - bullets, 1. steps, **bold**, and | tables |.</div>`;
  }
  const blkTools = (i, j, n) => `<span class="row" style="gap:4px;margin-top:4px"><button class="btn sm" data-act="ugBlkMove" data-i="${i}" data-j="${j}" data-d="-1" ${j === 0 ? 'disabled' : ''} aria-label="Move up">↑</button><button class="btn sm" data-act="ugBlkMove" data-i="${i}" data-j="${j}" data-d="1" ${j === n - 1 ? 'disabled' : ''} aria-label="Move down">↓</button><button class="btn sm danger" data-act="ugBlkDel" data-i="${i}" data-j="${j}">Remove</button></span>`;
  function brandHtml(can) {
    const b = W.brand; const d = can ? '' : 'disabled';
    return `<div class="card" style="padding:16px"><div class="fgrid"><div><label class="f">Guide title</label><input type="text" data-ugf="title" value="${esc(W.title)}" maxlength="120" ${d}></div><div><label class="f">Customer name</label><input type="text" data-ugf="customer" value="${esc(W.customer || '')}" maxlength="80" ${d}></div><div><label class="f">Audience / role</label><input type="text" data-ugf="audience" value="${esc(W.audience || '')}" maxlength="80" ${d}></div><div><label class="f">Version</label><input type="text" data-ugf="version" value="${esc(W.version || '')}" maxlength="20" ${d}></div><div><label class="f">Accent colour</label><input type="color" data-ugb="accent" value="${esc(b.accent || '#1570EF')}" ${d}></div><div><label class="f">Footer text</label><input type="text" data-ugb="footer" value="${esc(b.footer || '')}" maxlength="120" ${d} placeholder="e.g. Customer name · Confidential"></div></div>
      <label class="f" style="margin-top:10px"><input type="checkbox" data-ugb="cover" ${b.cover !== false ? 'checked' : ''} ${d}> Include a cover page</label>
      <label class="f">Customer logo (PNG or JPG, shown on the cover)</label>${b.logo ? `<div class="row" style="gap:8px"><img data-ugimg="${esc(b.logo.fileId)}" alt="" style="max-height:48px"><span class="small">${esc(b.logo.name || '')}</span>${can ? '<button class="btn sm danger" data-act="ugLogoDel">Remove</button>' : ''}</div>` : (can ? '<button class="btn sm" data-act="ugLogo">Upload logo</button>' : '<span class="muted small">None.</span>')}</div>`;
  }
  function checksHtml(ck) {
    const med = ck.filter(c => c.sev === 'medium').length;
    return `<div class="card"><div class="card-h"><h3>Quality checks (${ck.length})</h3><span class="row" style="gap:6px">${canApprove() ? (W.status === 'approved' ? '<button class="btn sm" data-act="ugDecide" data-d="reopen">Reopen as draft</button>' : `<button class="btn sm primary" data-act="ugDecide" data-d="approve">Approve guide</button>`) : '<span class="small muted">A project owner approves.</span>'}</span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Level</th><th>Area</th><th>Item</th><th>Finding</th></tr></thead><tbody>${ck.map(c => `<tr><td>${tag(c.sev === 'medium' ? 'tbc' : '', c.sev === 'medium' ? 'Medium' : 'Low')}</td><td class="small">${esc(c.area)}</td><td><b>${esc(c.item)}</b></td><td class="small">${esc(c.detail)}</td></tr>`).join('') || '<tr><td colspan="4" class="muted" style="padding:14px">Nothing flagged.</td></tr>'}</tbody></table></div><div class="xs muted" style="padding:8px 14px">${med ? med + ' medium finding(s) should be fixed before approval. ' : ''}Checks look at the text, screenshots and coverage of the Configuration Inputs. They cannot judge whether the steps are correct: have someone follow the guide in the system.</div></div>`;
  }

  // ---------- events ----------
  document.addEventListener('input', e => {
    if (!W) return; const t = e.target; if (!t.getAttribute) return;
    const sec = t.getAttribute('data-ugt'); if (sec != null && W.sections[sec]) { W.sections[sec].title = t.value; schedule(); return; }
    const m = t.getAttribute('data-ugm'); if (m) { const [i, j] = m.split('.').map(Number); if (W.sections[i] && W.sections[i].blocks[j]) { W.sections[i].blocks[j].text = t.value; if (V.ugMarkEdited) V.ugMarkEdited(i); schedule(); } return; }
    const c = t.getAttribute('data-ugc'); if (c) { const [i, j] = c.split('.').map(Number); if (W.sections[i] && W.sections[i].blocks[j]) { W.sections[i].blocks[j].caption = t.value; if (V.ugMarkEdited) V.ugMarkEdited(i); schedule(); } return; }
    const f = t.getAttribute('data-ugf'); if (f) { W[f] = t.value; schedule(); return; }
    const b = t.getAttribute('data-ugb'); if (b) { W.brand[b] = t.type === 'checkbox' ? t.checked : t.value; schedule(); }
  });
  document.addEventListener('change', e => { const t = e.target; if (t && t.getAttribute && t.getAttribute('data-ugb') && t.type === 'checkbox' && W) { W.brand[t.getAttribute('data-ugb')] = t.checked; schedule(); } });
  ACT.ugTab = a => { S.ui.ugTab = a.getAttribute('data-v'); V.render(); };
  ACT.ugBack = async () => { await flush(); S.ui.ugOpen = null; W = null; WID = null; V.beforeLeave = null; V.render(); };
  ACT.ugOpen = a => { S.ui.ugOpen = a.getAttribute('data-id'); S.ui.ugTab = 'content'; W = null; V.render(); };
  ACT.ugNew = () => {
    const ai = I().list('ai').filter(x => x.task === 'guide'); const cfg = I().list('cmodx').length + I().list('capp').length;
    drawer('New user guide', `<label class="f">Guide title</label><input type="text" id="ug_t" maxlength="120" value="User guide"><div class="fgrid"><div><label class="f">Customer</label><input type="text" id="ug_c" maxlength="80" value="${esc((S.project && S.project.customer) || '')}"></div><div><label class="f">Audience / role</label><input type="text" id="ug_a" maxlength="80" placeholder="e.g. Technicians"></div></div><label class="f">Start from</label><select id="ug_s"><option value="blank">A blank guide</option><option value="cfg"${cfg ? '' : ' disabled'}>Configuration Inputs (${cfg} described)</option><option value="ai"${ai.length ? '' : ' disabled'}>An AI guide draft (${ai.length} available)</option></select>${ai.length ? `<label class="f">AI draft to use</label><select id="ug_ai">${ai.map(x => `<option value="${esc(x.id)}">${esc(when(x._created))} · ${esc(x.status || 'draft')}</option>`).join('')}</select>` : ''}`,
      `<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="ugCreate">Create</button>`);
  };
  ACT.ugCreate = a => V.busy(a, async () => {
    const g = i => ((document.getElementById(i) || {}).value || '').trim(); if (!g('ug_t')) { toast('Enter a title'); return; } const id = I().uid('ug'); let sections = []; const src = g('ug_s');
    if (src === 'cfg') sections = cfgSections(); if (src === 'ai') { const d = I().get('ai', g('ug_ai')); if (d) sections = sectionsFromMd(d.content); }
    await I().put('ugd', id, { title: g('ug_t'), customer: g('ug_c'), audience: g('ug_a'), version: '0.1', status: 'draft', brand: { accent: '#1570EF', footer: '', cover: true, logo: null }, sections });
    closeDrawer(); S.ui.ugOpen = id; S.ui.ugTab = 'content'; W = null; V.render();
  });
  function cfgSections() {
    const out = []; I().list('cmodx').forEach(m => { const parts = []; const add = (h, t) => { if (String(t || '').trim()) parts.push('### ' + h + '\n' + String(t).trim()); }; add('What it is for', m.purpose); add('How to use it', m.usage); add('Where to find it', m.tabs); add('Actions', m.actions); add('Statuses', m.statuses); add('Workflow', m.workflow); add('Who can do what', m.roles); if (parts.length) out.push({ id: uid('s'), title: m.label || m.name, blocks: [{ t: 'md', text: parts.join('\n\n') }] }); });
    I().list('capp').forEach(a => { const parts = []; if (a.purpose) parts.push(String(a.purpose).trim()); if (a.navigation) parts.push('### How to open it\n' + a.navigation.trim()); (a.tabs || []).forEach(t => { const l = [t.purpose, t.functionality, t.navigation ? 'Navigation: ' + t.navigation : '', t.roles ? 'Available to: ' + t.roles : ''].filter(Boolean).join('\n'); parts.push('### ' + t.name + (l ? '\n' + l : '')); }); if (parts.length) out.push({ id: uid('s'), title: a.name, blocks: [{ t: 'md', text: parts.join('\n\n') }] }); });
    return out;
  }
  V.ugCfgSections = () => cfgSections();
  ACT.ugFromCfg = async () => { const s = cfgSections(); if (!s.length) { toast('Nothing is described in Configuration Inputs yet', 5000, true); return; } const have = new Set(W.sections.map(x => x.title.toLowerCase())); const add = s.filter(x => !have.has(x.title.toLowerCase())); edit(() => { W.sections = W.sections.concat(add); }); V.render(); toast(add.length + ' section(s) added' + (s.length - add.length ? ', ' + (s.length - add.length) + ' already there' : '')); };
  ACT.ugFromAi = () => { const ai = I().list('ai').filter(x => x.task === 'guide'); if (!ai.length) { toast('No AI guide draft yet. Use "User guide" under Deliverables & AI first.', 5000, true); return; } drawer('Add sections from an AI draft', `<p class="small">Sections are made from the draft's headings. AI labels (Missing, Assumption) stay in the text so the quality checks can flag them.</p><select id="ug_ai2">${ai.map(x => `<option value="${esc(x.id)}">${esc(when(x._created))} · ${esc(x.status || 'draft')}</option>`).join('')}</select>`, `<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="ugAiGo">Add sections</button>`); };
  ACT.ugAiGo = () => { const d = I().get('ai', document.getElementById('ug_ai2').value); closeDrawer(); if (!d) return; const s = sectionsFromMd(d.content); edit(() => { W.sections = W.sections.concat(s); }); V.render(); toast(s.length + ' section(s) added'); };
  ACT.ugFromVid = () => {
    const vids = I().list('vid').map(v => ({ v, drafts: I().list('ai').filter(a => a.task === 'vidguide' && a.vid === v.id) })).filter(x => x.drafts.length); if (!vids.length) { toast('No walkthrough has a draft yet. Use Video to Guide first.', 5000, true); return; }
    drawer('Add a section from a walkthrough', `<select id="ug_vd">${vids.flatMap(x => x.drafts.map(d => `<option value="${esc(x.v.id + '|' + d.id)}">${esc(x.v.title)} · ${esc(when(d._created))} · ${esc(d.status || 'draft')}</option>`)).join('')}</select>`, `<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="ugVidGo">Add section</button>`);
  };
  ACT.ugVidGo = () => { const [vid, aid] = document.getElementById('ug_vd').value.split('|'); const v = I().get('vid', vid), d = I().get('ai', aid); closeDrawer(); if (!v || !d) return; const m = d.content.match(/^#{1,2}\s+(.*)/m); edit(() => { W.sections.push({ id: uid('s'), title: (m ? m[1] : v.title) || 'Walkthrough', blocks: mdToBlocks(d.content.replace(/^#{1,2}\s+.*\n?/m, ''), v.frames) }); }); V.render(); toast('Section added'); };
  ACT.ugSecAdd = () => { edit(() => { W.sections.push({ id: uid('s'), title: 'New section', blocks: [{ t: 'md', text: '' }] }); }); V.render(); };
  ACT.ugSecDel = async a => { const i = Number(a.getAttribute('data-i')); if (!(await confirmDialog('Delete section', 'Remove "' + W.sections[i].title + '" from the guide?', 'Delete', true))) return; edit(() => { W.sections.splice(i, 1); }); V.render(); };
  ACT.ugSecMove = a => { const i = Number(a.getAttribute('data-i')), j = i + Number(a.getAttribute('data-d')); if (j < 0 || j >= W.sections.length) return; edit(() => { const t = W.sections[i]; W.sections[i] = W.sections[j]; W.sections[j] = t; }); V.render(); };
  const marked = a => { if (V.ugMarkEdited) V.ugMarkEdited(Number(a.getAttribute('data-i'))); };
  ACT.ugTxtAdd = a => { marked(a); edit(() => { W.sections[Number(a.getAttribute('data-i'))].blocks.push({ t: 'md', text: '' }); }); V.render(); };
  ACT.ugBlkDel = a => { marked(a); edit(() => { W.sections[Number(a.getAttribute('data-i'))].blocks.splice(Number(a.getAttribute('data-j')), 1); }); V.render(); };
  ACT.ugBlkMove = a => { marked(a); const bl = W.sections[Number(a.getAttribute('data-i'))].blocks; const j = Number(a.getAttribute('data-j')), k = j + Number(a.getAttribute('data-d')); if (k < 0 || k >= bl.length) return; edit(() => { const t = bl[j]; bl[j] = bl[k]; bl[k] = t; }); V.render(); };
  async function uploadImg() { const f = (await V.pickFile('.png,.jpg,.jpeg'))[0]; if (!f) return null; toast('Uploading…'); const rec = await API.uploadFile(S.project.id, f, 'guide_media', { guide: WID }); return { fileId: rec.id, name: f.name }; }
  ACT.ugImgAdd = async a => { try { const r = await uploadImg(); if (!r) return; marked(a); edit(() => { W.sections[Number(a.getAttribute('data-i'))].blocks.push({ t: 'img', fileId: r.fileId, caption: '' }); }); V.render(); } catch (e) { toast(e.message || 'Upload failed', 5000, true); } };
  ACT.ugLogo = async () => { try { const r = await uploadImg(); if (!r) return; edit(() => { W.brand.logo = r; }); V.render(); } catch (e) { toast(e.message || 'Upload failed', 5000, true); } };
  ACT.ugLogoDel = () => { edit(() => { W.brand.logo = null; }); V.render(); };
  ACT.ugDecide = a => V.busy(a, async () => {
    const d = a.getAttribute('data-d'); await flush(); const ck = checks(W).filter(c => c.sev === 'medium');
    if (d === 'approve' && ck.length && !(await confirmDialog('Open findings', ck.length + ' medium finding(s) are still open. Approve anyway?', 'Approve anyway', false))) return;
    try { const r = await API.post(`/api/projects/${S.project.id}/ugd/${WID}/decision`, { decision: d }); W.status = r.item.data.status; W.approvedBy = r.item.data.approvedBy; W.approvedAt = r.item.data.approvedAt; await I().load(['ugd'], true); toast(d === 'approve' ? 'Approved' : 'Reopened'); V.render(); } catch (e) { toast(e.message, 5000, true); }
  });

  // ---------- export ----------
  async function media(fileId) {
    const im = await V.docImage(await V.fileBlob(fileId)); const buf = im.u8, type = im.type, w = im.w, h = im.h;
    const dataUrl = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(new Blob([buf], { type: im.mime })); }); return { u8: buf, type, w, h, dataUrl };
  }
  const fit = (w, h, mw, mh) => { const s = Math.min(mw / w, mh / h, 1); return { width: Math.max(1, Math.round(w * s)), height: Math.max(1, Math.round(h * s)) }; };
  const hex = c => String(c || '#1570EF').replace('#', '').toUpperCase().padEnd(6, '0').slice(0, 6);
  const dateStr = () => new Date().toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  // a guide with no written steps or screenshots would export as a cover page only, so say so instead of producing it
  const hasContent = () => (W.sections || []).some(sec => (sec.blocks || []).some(b => b.t === 'img' ? !!b.fileId : String(b.text || '').trim()));
  const emptyGuide = () => { if (hasContent()) return false; toast('This guide has no steps or screenshots yet, so there is nothing to export. Add content on the Content tab first.', 6000, true); return true; };
  ACT.ugDocx = a => V.busy(a, async () => {
    if (emptyGuide()) return; await flush(); V.loading(true, 'Writing the Word document…');
    try {
      const X = await V.loadDocx(); const { Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, AlignmentType, ImageRun, PageBreak, TableOfContents, Footer, PageNumber, LevelFormat } = X;
      const acc = hex(W.brand.accent); const font = 'Calibri'; const run = (t, o) => new TextRun(Object.assign({ text: String(t == null ? '' : t), font }, o || {})); const rr = t => runs(t).map(x => run(x.text, x.bold ? { bold: true } : {}));
      const body = []; const B = { style: BorderStyle.SINGLE, size: 4, color: 'BBBBBB' }; const bd = { top: B, bottom: B, left: B, right: B };
      if (W.brand.cover !== false) {
        if (W.brand.logo) { try { const m = await media(W.brand.logo.fileId); body.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [new ImageRun({ type: m.type, data: m.u8, transformation: fit(m.w, m.h, 160, 70) })] })); } catch (e) { } }
        body.push(new Paragraph({ spacing: { before: 2600, after: 240 }, alignment: AlignmentType.CENTER, children: [run(W.title, { bold: true, size: 56, color: acc })] }));
        if (W.customer) body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [run('for ' + W.customer, { size: 32 })] }));
        if (W.audience) body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [run(W.audience, { size: 24, color: '607796' })] }));
        body.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [run('Version ' + (W.version || '') + '  ·  ' + dateStr() + '  ·  ' + (W.status === 'approved' ? 'Approved' : 'DRAFT'), { size: 22, color: '607796' })] }));
        body.push(new Paragraph({ children: [new PageBreak()] }));
      }
      body.push(new Paragraph({ children: [run('Contents', { bold: true, size: 32, color: acc })], spacing: { after: 160 } })); body.push(new TableOfContents('Contents', { hyperlink: true, headingStyleRange: '1-2' })); body.push(new Paragraph({ children: [new PageBreak()] }));
      for (let si = 0; si < W.sections.length; si++) {
        const sec = W.sections[si]; body.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: si > 0, keepNext: true, children: [run(sec.title)] }));
        for (const b of sec.blocks || []) {
          if (b.t === 'img') { try { const m = await media(b.fileId); const s = fit(m.w, m.h, 600, 760); body.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120 }, children: [new ImageRun({ type: m.type, data: m.u8, transformation: s })] })); if (b.caption) body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [run(b.caption, { italics: true, size: 18, color: '607796' })] })); } catch (e) { body.push(new Paragraph({ children: [run('[Screenshot not available]', { italics: true, color: '999999' })] })); } continue; }
          for (const p of parseMd(b.text)) {
            if (p.t === 'h') body.push(new Paragraph({ heading: p.lvl === 1 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3, keepNext: true, children: [run(p.text)] }));
            else if (p.t === 'p') body.push(new Paragraph({ spacing: { after: 120 }, children: rr(p.text) }));
            else if (p.t === 'ul') p.items.forEach(x => body.push(new Paragraph({ numbering: { reference: 'bul', level: 0 }, spacing: { after: 60 }, children: rr(x) })));
            else if (p.t === 'ol') p.items.forEach(x => body.push(new Paragraph({ numbering: { reference: 'num', level: 0 }, spacing: { after: 60 }, children: rr(x) })));
            else if (p.t === 'table') { const n = Math.max(...p.rows.map(r => r.length)); body.push(new Table({ width: { size: 9600, type: WidthType.DXA }, columnWidths: Array(n).fill(Math.floor(9600 / n)), rows: p.rows.map((r, ri) => new TableRow({ tableHeader: ri === 0, cantSplit: true, children: Array.from({ length: n }, (_, k) => new TableCell({ borders: bd, width: { size: Math.floor(9600 / n), type: WidthType.DXA }, shading: ri === 0 ? { type: ShadingType.CLEAR, color: 'auto', fill: 'E8F1FF' } : undefined, margins: { top: 50, bottom: 50, left: 80, right: 80 }, children: [new Paragraph({ children: rr(r[k] || '').map(x => x) })] })) })) })); body.push(new Paragraph({ spacing: { after: 100 } })); }
          }
        }
      }
      const doc = new X.Document({ creator: 'Facilio', title: W.title, description: 'Generated by Facilio Delivery Studio', features: { updateFields: true },
        styles: { default: { document: { run: { font, size: 22 } } }, paragraphStyles: [1, 2, 3].map(n => ({ id: 'Heading' + n, name: 'Heading ' + n, basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: [34, 28, 24][n - 1], bold: true, color: acc, font }, paragraph: { spacing: { before: n === 1 ? 240 : 200, after: 120 }, outlineLevel: n - 1 } })) },
        numbering: { config: [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }, { reference: 'num', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] }] },
        sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } }, titlePage: W.brand.cover !== false }, footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run((W.brand.footer ? W.brand.footer + '  ·  ' : '') + 'Page ', { size: 16, color: '7B91B0' }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '7B91B0', font })] })] }), first: new Footer({ children: [new Paragraph('')] }) }, children: body }] });
      V.download((W.title || 'User guide').replace(/[^\w-]+/g, '_') + '.docx', await X.Packer.toBlob(doc)); toast('Word document ready');
    } catch (e) { console.error(e); toast('Export failed: ' + (e.message || e), 7000, true); } finally { V.loading(false); }
  });
  ACT.ugPdf = a => V.busy(a, async () => {
    if (emptyGuide()) return; await flush(); V.loading(true, 'Writing the PDF…');
    try {
      const pm = await V.loadPdfMake(); const acc = '#' + hex(W.brand.accent); const content = [];
      if (W.brand.cover !== false) {
        if (W.brand.logo) { try { const m = await media(W.brand.logo.fileId); content.push(Object.assign({ image: m.dataUrl, alignment: 'right' }, fit(m.w, m.h, 130, 56))); } catch (e) { } }
        content.push({ text: W.title, fontSize: 28, bold: true, color: acc, alignment: 'center', margin: [0, 190, 0, 12] }); if (W.customer) content.push({ text: 'for ' + W.customer, fontSize: 16, alignment: 'center', margin: [0, 0, 0, 6] }); if (W.audience) content.push({ text: W.audience, fontSize: 12, color: '#607796', alignment: 'center', margin: [0, 0, 0, 24] });
        content.push({ text: 'Version ' + (W.version || '') + '  ·  ' + dateStr() + '  ·  ' + (W.status === 'approved' ? 'Approved' : 'DRAFT'), fontSize: 11, color: '#607796', alignment: 'center', pageBreak: 'after' });
      }
      content.push({ toc: { title: { text: 'Contents', style: 'h1' } }, pageBreak: 'after' });
      for (let si = 0; si < W.sections.length; si++) {
        const sec = W.sections[si]; content.push({ text: sec.title, style: 'h1', tocItem: true, pageBreak: si > 0 ? 'before' : undefined });
        for (const b of sec.blocks || []) {
          if (b.t === 'img') { try { const m = await media(b.fileId); const s = fit(m.w, m.h, 470, 600); content.push(Object.assign({ image: m.dataUrl, alignment: 'center', margin: [0, 6, 0, 2] }, s)); if (b.caption) content.push({ text: b.caption, italics: true, fontSize: 9, color: '#607796', alignment: 'center', margin: [0, 0, 0, 8] }); } catch (e) { content.push({ text: '[Screenshot not available]', italics: true, color: '#999999' }); } continue; }
          const rt = t => runs(t).map(x => ({ text: x.text, bold: !!x.bold }));
          for (const p of parseMd(b.text)) {
            if (p.t === 'h') content.push({ text: p.text, style: p.lvl === 1 ? 'h2' : 'h3' }); else if (p.t === 'p') content.push({ text: rt(p.text), margin: [0, 0, 0, 6] });
            else if (p.t === 'ul') content.push({ ul: p.items.map(x => ({ text: rt(x) })), margin: [0, 0, 0, 6] }); else if (p.t === 'ol') content.push({ ol: p.items.map(x => ({ text: rt(x) })), margin: [0, 0, 0, 6] });
            else if (p.t === 'table') { const n = Math.max(...p.rows.map(r => r.length)); content.push({ table: { headerRows: 1, widths: Array(n).fill('*'), body: p.rows.map((r, ri) => Array.from({ length: n }, (_, k) => ({ text: rt(r[k] || ''), bold: ri === 0, fillColor: ri === 0 ? '#E8F1FF' : undefined, fontSize: 9 }))) }, margin: [0, 0, 0, 8] }); }
          }
        }
      }
      const dd = { pageSize: 'A4', pageMargins: [56, 56, 56, 56], content, defaultStyle: { fontSize: 10.5, lineHeight: 1.25 }, styles: { h1: { fontSize: 18, bold: true, color: acc, margin: [0, 0, 0, 8] }, h2: { fontSize: 14, bold: true, color: acc, margin: [0, 8, 0, 4] }, h3: { fontSize: 12, bold: true, color: acc, margin: [0, 6, 0, 3] } },
        footer: (cur, total) => (cur === 1 && W.brand.cover !== false ? null : { text: (W.brand.footer ? W.brand.footer + '  ·  ' : '') + 'Page ' + cur + ' of ' + total, alignment: 'center', fontSize: 8, color: '#7B91B0', margin: [0, 18, 0, 0] }) };
      await new Promise((res, rej) => { try { pm.createPdf(dd).getBlob(b => { V.download((W.title || 'User guide').replace(/[^\w-]+/g, '_') + '.pdf', b); res(); }); } catch (e) { rej(e); } }); toast('PDF ready');
    } catch (e) { console.error(e); toast('Export failed: ' + (e.message || e), 7000, true); } finally { V.loading(false); }
  });
})(typeof window !== 'undefined' ? window : globalThis);

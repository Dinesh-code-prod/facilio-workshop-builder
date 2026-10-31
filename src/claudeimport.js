/* Import from Claude: one place to bring back what a team member got from Claude (their own account, via Open in Claude).
   Paste the reply or choose the file Claude made. It works out what it is, tells you where it will go, and nothing is saved until you press the button:
   - text (pasted, .txt, .md, or the words of a .docx)  -> an unapproved draft in Deliverables & AI for the deliverable you pick (same route as Import as draft)
   - a spreadsheet (.xlsx, .xlsm, .csv)                  -> the existing Tasks import (mapping and review) or the project plan
   - an organisation package (.zip) or loose XML         -> pointed to Package Analysis, which reads the package
   Everything is read in the browser first; no AI call is made. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const API = root.FWBApi; const I = () => V.items;
  const { drawer, closeDrawer, toast } = V;
  const DELIVERABLES = [['brd', 'Business Requirements Document', /\bbrd\b|business requirement|requirements? document/i], ['uat', 'UAT plan and test cases', /\buat\b|test case|acceptance/i], ['guide', 'Customer user guide', /user guide|how to|step \d|walkthrough/i], ['ftr', 'FTR report', /\bftr\b|first time right/i], ['config', 'Configuration documentation', /configuration|field|module setup/i], ['workshop', 'Workshop intelligence', /workshop|transcript|requirement session/i], ['golive', 'Go-live readiness review', /go.?live|readiness/i], ['hypercare', 'Hypercare status report', /hypercare/i], ['handover', 'Support handover pack', /handover|hand over/i], ['wsr', 'Weekly status report (WSR)', /weekly|\bwsr\b/i], ['monthly', 'Monthly report', /monthly/i], ['gaps', 'Missing requirements check', /missing|gap/i]];
  let X = null; // { name, kind, text, file, sheets, note }
  const guess = text => { const h = String(text).slice(0, 1500); const m = DELIVERABLES.find(d => d[2].test(h)); return m ? m[0] : 'brd'; };
  async function docxText(file) {
    await V.loadScript('vendor/jszip.min.js'); const zip = await root.JSZip.loadAsync(file); const f = zip.file('word/document.xml'); if (!f) throw new Error('This does not look like a Word document');
    const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'; const doc = new DOMParser().parseFromString(await f.async('string'), 'text/xml'); const out = [];
    const para = p => Array.from(p.getElementsByTagNameNS(W, 't')).map(t => t.textContent).join('');
    const walk = el => { for (const c of Array.from(el.children)) { if (c.localName === 'p') { const t = para(c); const st = c.getElementsByTagNameNS(W, 'pStyle')[0]; const sv = st && (st.getAttributeNS(W, 'val') || st.getAttribute('w:val') || ''); out.push(/^Heading(\d)/i.test(sv) ? '#'.repeat(Math.min(4, Number(/\d/.exec(sv)[0]))) + ' ' + t : t); }
      else if (c.localName === 'tbl') { Array.from(c.getElementsByTagNameNS(W, 'tr')).forEach(tr => out.push('| ' + Array.from(tr.getElementsByTagNameNS(W, 'tc')).map(tc => Array.from(tc.getElementsByTagNameNS(W, 'p')).map(para).join(' ')).join(' | ') + ' |')); } else if (c.localName === 'body' || c.localName === 'sdt' || c.localName === 'sdtContent') walk(c); } };
    walk(doc.documentElement); return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  async function csvToXlsx(text, name) { const E = await V.loadExcelJS(); const wb = new E.Workbook(); const ws = wb.addWorksheet('Sheet1'); const rows = []; let row = [], cell = '', q = false; for (let i = 0; i < text.length; i++) { const ch = text[i]; if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; } else if (ch === '"') q = true; else if (ch === ',') { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); cell = ''; rows.push(row); row = []; } else cell += ch; } if (cell || row.length) { row.push(cell); rows.push(row); } rows.forEach(r => ws.addRow(r)); const buf = await wb.xlsx.writeBuffer(); return new File([buf], name.replace(/\.csv$/i, '') + '.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); }
  async function sheetInfo(file) {
    const E = await V.loadExcelJS(); const wb = new E.Workbook(); await wb.xlsx.load(await file.arrayBuffer()); const norm = v => String(v == null ? '' : (v.result !== undefined ? v.result : v.text !== undefined ? v.text : v.richText ? v.richText.map(x => x.text).join('') : v)).trim().toLowerCase(); let kind = 'other', best = '';
    wb.worksheets.forEach(ws => { for (let r = 1; r <= Math.min(ws.rowCount, 25); r++) { const h = []; ws.getRow(r).eachCell({ includeEmpty: false }, c => h.push(norm(c.value))); const has = re => h.some(x => re.test(x)); if (has(/^(task|task name|activity|milestone)\b/) && has(/^(start|start date|planned start|begin)/)) { kind = 'plan'; best = ws.name; return; } if (kind !== 'plan' && has(/^(issue|observation|title|task|subject)/) && has(/status|assigned|owner|eta|module|area/)) { kind = 'tasks'; best = ws.name; } } });
    return { kind, sheet: best, sheets: wb.worksheets.map(w => w.name) };
  }
  async function read(file) {
    const n = file.name; const ext = (/\.([a-z0-9]+)$/i.exec(n) || [])[1] || ''; X = { name: n, ext: ext.toLowerCase(), size: file.size, file };
    if (file.size > 12e6) throw new Error('That file is larger than 12 MB');
    if (/^(txt|md|markdown)$/i.test(ext)) { X.kind = 'text'; X.text = await file.text(); }
    else if (/^docx$/i.test(ext)) { X.kind = 'text'; X.text = await docxText(file); }
    else if (/^(xlsx|xlsm)$/i.test(ext)) { const i = await sheetInfo(file); X.kind = 'sheet'; X.sheet = i; }
    else if (/^csv$/i.test(ext)) { X.file = await csvToXlsx(await file.text(), n); const i = await sheetInfo(X.file); X.kind = 'sheet'; X.sheet = i; X.note = 'Read as a spreadsheet (CSV).'; }
    else if (/^zip$/i.test(ext)) { await V.loadScript('vendor/jszip.min.js'); const z = await root.JSZip.loadAsync(file); X.kind = z.file('PackageConf.xml') ? 'package' : 'zip'; }
    else if (/^xml$/i.test(ext)) { X.kind = 'xml'; }
    else if (/^(doc|xls|ppt|pptx|pdf)$/i.test(ext)) { X.kind = 'unsupported'; }
    else throw new Error('That file type is not supported. Use .docx, .xlsx, .csv, .md, .txt, .zip or .xml, or paste the text.');
  }
  const dest = () => (X && X.kind === 'text' ? DELIVERABLES.find(d => d[0] === (X.task || guess(X.text))) : null);
  function body() {
    const paste = `<label class="f">Or paste Claude's reply</label><textarea id="ci_paste" rows="6" placeholder="Paste the full reply here" data-change="ciPaste"></textarea>`;
    const pick = `<div class="ci-drop"><input type="file" id="ci_file" accept=".docx,.xlsx,.xlsm,.csv,.md,.txt,.zip,.xml" data-change="ciFile" aria-label="Choose the file Claude made"><p class="xs muted" style="margin:6px 0 0">Word (.docx), Excel (.xlsx, .csv), Markdown or text, or an organisation package (.zip). Nothing is saved until you confirm.</p></div>`;
    let result = '';
    if (X) {
      const head = `<div class="ci-found"><b>${esc(X.name || 'Pasted text')}</b>${X.note ? `<span class="xs muted"> · ${esc(X.note)}</span>` : ''}</div>`;
      if (X.kind === 'text') { const g = X.task || guess(X.text); const len = X.text.trim().length; const short = len < 200;
        result = `${head}${parseFindings(X.text).length ? `<div class="notice" style="margin-bottom:8px"><span>This reply has <b>${parseFindings(X.text).length} findings</b> in the import format. You can create a task for each, or save the whole reply as a draft.</span></div>` : ''}<div class="notice"><span>This is <b>text</b> (${len.toLocaleString()} characters). It will be saved as an <b>unapproved draft</b> in Deliverables &amp; AI. A person reviews and approves it there. Sources cited as [S1], [S2] are checked against this project.</span></div>${short ? '<div class="notice warn" style="margin-top:8px"><span>This is too short to be a draft (at least 200 characters). Paste the whole reply.</span></div>' : ''}
          <label class="f" style="margin-top:10px">Which deliverable is this?</label><select id="ci_task" data-change="ciTask">${DELIVERABLES.map(d => `<option value="${d[0]}"${d[0] === g ? ' selected' : ''}>${esc(d[1])}</option>`).join('')}</select>
          <div class="ci-prev"><b class="xs">Preview</b><pre>${esc(X.text.slice(0, 900))}${X.text.length > 900 ? '\n…' : ''}</pre></div>`; }
      else if (X.kind === 'sheet') { const k = X.sheet.kind; const nm = x => ({ plan: 'a <b>project plan</b> (tasks with start dates)', tasks: 'a <b>task list</b> (issues with status, owner or ETA)', other: 'a spreadsheet that is not clearly tasks or a plan' })[x];
        result = `${head}<div class="notice"><span>This is ${nm(k)}. Sheets: ${X.sheet.sheets.map(esc).join(', ')}.</span></div><p class="small muted" style="margin:8px 0 0">${k === 'plan' ? 'Using it as the plan opens the Project Plan import and builds the timeline. ' : ''}Importing as tasks opens the Tasks import where you choose sheets, check the column mapping and review every row before anything is saved.</p>`; }
      else if (X.kind === 'package') result = `${head}<div class="notice"><span>This is an <b>organisation package</b> (it has PackageConf.xml). Package Analysis reads it and shows what is configured. To start a project from it, use New project and choose the package.</span></div>`;
      else if (X.kind === 'zip') result = `${head}<div class="notice warn"><span>This .zip has no PackageConf.xml, so it is not an organisation package. Unzip it and import the files inside one by one.</span></div>`;
      else if (X.kind === 'xml') result = `${head}<div class="notice warn"><span>A single XML file cannot be imported on its own. Configuration comes in as an organisation package (.zip with PackageConf.xml). If Claude made the XML, ask it to put the files in that structure, or paste the XML as text to keep it as a draft.</span></div>`;
      else if (X.kind === 'unsupported') result = `${head}<div class="notice warn"><span>This file type cannot be read here. In Claude, ask for a .docx or .xlsx instead, or paste the text.</span></div>`;
    }
    return `${pick}${paste}${result ? `<div id="ci_result" style="margin-top:12px">${result}</div>` : ''}`;
  }
  function foot() {
    const go = (act, label, primary) => `<button class="btn${primary ? ' primary' : ''}" data-act="${act}">${label}</button>`; let b = '';
    if (X && X.kind === 'text') b = (parseFindings(X.text).length ? go('ciFindings', 'Create tasks from findings', true) : '') + go('ciDraft', 'Import as draft', !parseFindings(X.text).length);
    else if (X && X.kind === 'sheet') b = (X.ext !== 'csv' && X.sheet.kind === 'plan' ? go('ciPlan', 'Use as the project plan') : '') + go('ciTasks', 'Import as tasks…', X.sheet.kind !== 'plan');
    else if (X && X.kind === 'package') b = go('ciPkg', 'Open Package Analysis', true);
    return `<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button>${b}`;
  }
  const open = () => drawer('Import from Claude', body(), foot());
  ACT.claudeImport = () => { X = null; open(); };
  ACT.ciFile = async el => { const f = el.files && el.files[0]; if (!f) return; try { await read(f); } catch (e) { X = null; toast(e.message, 6000, true); } open(); };
  ACT.ciPaste = el => { const t = el.value.trim(); if (!t) { X = null; open(); return; } X = { name: 'Pasted text', kind: 'text', text: t }; open(); const n = document.getElementById('ci_paste'); if (n) n.value = el.value; };
  ACT.ciTask = el => { if (X) X.task = el.value; };
  ACT.ciDraft = a => V.busy(a, async () => { if (!X || X.kind !== 'text') return; const task = (document.getElementById('ci_task') || {}).value || X.task || guess(X.text);
    try { const r = await API.post(`/api/projects/${S.project.id}/ai/import`, { task, content: X.text }); X = null; await I().load(['ai'], true); closeDrawer(); toast('Draft imported for review'); ACT.aiOpen({ getAttribute: () => r.item.id }); }
    catch (e) { toast(e.message || 'Could not import this', 6000, true); } });
  // hand the already-chosen file to an existing importer: it asks for a file through V.pickFile, so give it this one
  async function viaPicker(fn) { const orig = V.pickFile; const f = X.file; V.pickFile = async () => [f]; try { await fn(); } finally { V.pickFile = orig; } }
  ACT.ciTasks = async () => { if (!X || X.kind !== 'sheet') return; closeDrawer(); if (V.go) V.go('tasks'); await new Promise(r => setTimeout(r, 400)); await viaPicker(async () => { const el = document.querySelector('[data-act="tkImport"]'); if (ACT.tkImport) { ACT.tkImport(); const inp = document.querySelector('.drawer input[type="file"]'); if (inp) { const dt = new DataTransfer(); dt.items.add(X.file); inp.files = dt.files; inp.dispatchEvent(new Event('change', { bubbles: true })); } } }); };
  ACT.ciPlan = async () => { if (!X || X.kind !== 'sheet') return; closeDrawer(); if (V.go) V.go('plan'); await new Promise(r => setTimeout(r, 400)); await viaPicker(() => ACT.planUpload()); };
  ACT.ciPkg = () => { closeDrawer(); if (V.go) V.go('pkgan'); toast('Upload the package on Package Analysis'); };

  // ================= Project review in Claude: the whole project as one pack, and the findings brought back as tasks =================
  const FIND_SEV = { high: 'High', medium: 'Medium', low: 'Low' };
  function parseFindings(text) {
    const m = /```(?:json)?\s*([\s\S]*?)```/gi; let b; const cands = []; while ((b = m.exec(String(text)))) cands.push(b[1]); const raw = /\{\s*"findings"\s*:[\s\S]*\}/.exec(String(text)); if (raw) cands.push(raw[0]);
    for (const c of cands) { try { const j = JSON.parse(c.trim()); const a = Array.isArray(j) ? j : j && j.findings; if (Array.isArray(a) && a.length) return a.slice(0, 60).map(f => ({ area: String(f.area || '').slice(0, 80), gap: String(f.gap || '').slice(0, 400), evidence: String(f.evidence || '').slice(0, 300), severity: FIND_SEV[String(f.severity || '').toLowerCase()] || 'Medium', fix: String(f.fix || '').slice(0, 600), owner: /customer/i.test(f.owner || '') ? 'Customer' : 'Facilio' })).filter(f => f.gap); } catch (e) { /* try the next block */ } }
    return [];
  }
  V.parseFindings = parseFindings;
  async function createTasks(list) {
    let n = 0; for (const f of list) { await I().put('task', I().uid('t'), { title: (f.area ? f.area + ': ' : '') + f.gap, type: f.owner === 'Customer' ? 'Customer Action Required' : 'Internal Action', status: 'To Do', priority: f.severity, module: f.area, desc: (f.evidence ? 'Evidence: ' + f.evidence + '\n' : '') + (f.fix ? 'Suggested fix: ' + f.fix : ''), src: { type: 'ai', label: 'Claude project review' } }); n++; } return n;
  }
  ACT.ciFindings = a => V.busy(a, async () => { const t = (X && X.text) || (document.getElementById('rv_reply') || {}).value || ''; const list = parseFindings(t); if (!list.length) { toast('No findings block was found in the reply', 5000, true); return; }
    if (!(await V.confirmDialog('Create tasks from findings', `${list.length} task${list.length === 1 ? '' : 's'} will be added to Tasks, each marked as from the Claude project review. Examples: ${list.slice(0, 3).map(f => (f.area ? f.area + ': ' : '') + f.gap.slice(0, 70)).join(' | ')}`, 'Create tasks', false))) return;
    try { const n = await createTasks(list); closeDrawer(); X = null; toast(n + ' task' + (n === 1 ? '' : 's') + ' created from the review'); if (V.go) V.go('tasks'); } catch (e) { toast(e.message || 'Could not create the tasks', 6000, true); } });
  let RV = null;
  const short = 'Please review the attached Facilio project pack. Follow the instructions inside it and reply in the format it asks for.';
  const copy = async t => { try { await navigator.clipboard.writeText(t); return true; } catch (e) { return false; } };
  function reviewStep(copied) {
    const big = RV.chars > 130000;
    drawer('Project review in Claude', `<ol class="small" style="line-height:1.7"><li>${big ? `The pack is large (${RV.chars.toLocaleString()} characters). <b>Download it</b>, open a new Claude chat, attach the file, then paste the short message (copy it below) and send.` : copied ? 'The whole pack is copied. Open a new Claude chat, paste it (Ctrl+V) and send.' : 'Copy the pack with the button below, open a new Claude chat, paste it and send.'}</li><li>Claude lists the gaps it finds in this project, with the source of each. Copy its whole reply and paste it below.</li><li>Create tasks from the findings, or save the reply as a draft review.</li></ol>
      <div class="row" style="gap:8px;margin:8px 0;flex-wrap:wrap"><a class="btn" href="https://claude.ai/new" target="_blank" rel="noopener noreferrer">Open Claude (web)</a><a class="btn" href="claude://claude.ai/new" title="Works if the Claude desktop app is installed">Open Claude Desktop</a>${big ? '' : '<button class="btn" data-act="rvCopy">Copy the pack</button>'}<button class="btn" data-act="rvDl">Download the pack (.md)</button><button class="btn" data-act="rvShort">Copy the short message</button></div>
      ${V.skillsNote ? V.skillsNote() : ''}<div class="notice"><span>The pack holds this project's documents and records (${RV.sources.length} sources). It runs in your own Claude account and uses your own allowance. Delivery Studio sends nothing to Claude and reads nothing back. Do not share the pack outside your team: it contains customer information.</span></div>
      <details style="margin:10px 0"><summary class="small">What Claude is asked to check</summary><ul class="small" style="line-height:1.6"><li>Every confirmed requirement has matching configuration, and every configured item traces to a requirement</li><li>Contradictions between decisions, scope, the BRD and the configuration</li><li>Missing information: unanswered questions, unconfirmed requirements, modules without a state flow, role or notification</li><li>Plan and governance: overdue or ownerless work, open high risks, pending sign-offs</li><li>Agent projects: agents without data checks, rules or tests</li></ul></details>
      <label class="f">Claude's reply</label><textarea id="rv_reply" rows="10" placeholder="Paste Claude's whole reply here"></textarea>`,
      `<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button><button class="btn" data-act="rvDraft">Save as draft review</button><button class="btn primary" data-act="ciFindings">Create tasks from findings</button>`, { wide: true });
  }
  ACT.claudeReview = a => V.busy(a, async () => { try { const r = await API.post(`/api/projects/${S.project.id}/ai/review-pack`, {}); RV = { title: r.title, prompt: r.prompt, chars: r.chars, sources: r.sources || [] }; const ok = RV.chars <= 130000 ? await copy(RV.prompt) : false; reviewStep(ok); } catch (e) { toast(e.message || 'Could not prepare the review pack', 6000, true); } });
  ACT.rvCopy = async () => toast((await copy(RV.prompt)) ? 'Pack copied' : 'Copy was blocked. Use Download instead', 4000, false);
  ACT.rvShort = async () => toast((await copy(short)) ? 'Message copied' : 'Copy was blocked', 3000);
  ACT.rvDl = () => V.download((RV.title || 'project-review').replace(/[^\w-]+/g, '_') + '_pack.md', new Blob([RV.prompt], { type: 'text/markdown' }));
  ACT.rvDraft = a => V.busy(a, async () => { const t = (document.getElementById('rv_reply') || {}).value || ''; try { const r = await API.post(`/api/projects/${S.project.id}/ai/import`, { task: 'gaps', content: t }); await I().load(['ai'], true); closeDrawer(); toast('Saved as a draft review'); ACT.aiOpen({ getAttribute: () => r.item.id }); } catch (e) { toast(e.message || 'Could not save this reply', 6000, true); } });

  // ================= one hand-off for the places the built-in AI is used: pack -> your own Claude -> reply back into the same step =================
  // o: { title, url, body, extra (what else to do in Claude, e.g. attach a picture), into (id of a box to draw in, else a drawer), onReply(result) }
  let HO = null;
  V.claudeHandoff = async o => {
    try { const r = await API.post(o.url, Object.assign({}, o.body, { claudePack: true })); HO = Object.assign({}, o, { prompt: r.prompt, name: r.title || o.title }); const ok = await copy(r.prompt); if (ok) window.open('https://claude.ai/new', '_blank', 'noopener');
      const html = `<div class="notice"><span>${ok ? 'The prompt is copied. Paste it into the new Claude chat (Ctrl+V).' : 'Copy the prompt below, open Claude and paste it.'} ${esc(o.extra || '')} Then paste Claude's whole reply here.</span></div><div class="row" style="gap:8px;margin:8px 0;flex-wrap:wrap"><a class="btn sm" href="https://claude.ai/new" target="_blank" rel="noopener noreferrer">Open Claude (web)</a><a class="btn sm" href="claude://claude.ai/new">Open Claude Desktop</a><button type="button" class="btn sm" data-act="hoCopy">Copy the prompt</button></div>${V.skillsNote ? V.skillsNote() : ''}<textarea id="hoR" rows="8" placeholder="Paste Claude's reply here"></textarea><div class="row" style="gap:8px;margin-top:8px"><button type="button" class="btn sm primary" data-act="hoBack">Bring the reply back</button></div>`;
      const into = o.into && document.getElementById(o.into); if (into) into.innerHTML = html; else drawer((r.title || o.title || 'Use your own Claude'), html, '<span class="spacer"></span><button class="btn" data-act="closeDrawer">Cancel</button>', { wide: true }); }
    catch (e) { toast(e.message || 'Could not prepare the prompt', 6000, true); } };
  ACT.hoCopy = async () => toast((await copy((HO || {}).prompt || '')) ? 'Prompt copied' : 'Copy was blocked', 3000);
  ACT.hoBack = a => V.busy(a, async () => { if (!HO) return; const reply = (document.getElementById('hoR') || {}).value || ''; try { const r = await API.post(HO.url, Object.assign({}, HO.body, { reply })); const f = HO.onReply; if (!HO.into) closeDrawer(); HO = null; if (f) await f(r); } catch (e) { toast(e.message || 'Could not read the reply', 6000, true); } });
})(typeof window !== 'undefined' ? window : globalThis);

/* Contract & Workshop Planning: one guided workflow over Know Your Contract, Scope and the Requirement Session Planner.
   1 Upload MSA → 2 Review contract → 3 Review scope → 4 Plan sessions → 5 Review schedule (live Excel) → 6 Finalise & export.
   It adds no second copy of the data: contract fields go to the Know Your Contract records, scope items live in planner.scope,
   sessions in planner.sessions. The Excel preview is built from the sessions and edits made in it are written back to them. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc, humanize } = F; const V = root.FWBViews; const ACT = V.ACT; const API = root.FWBApi;
  const { tag, sel, toast, ico, drawer, closeDrawer, confirmDialog, loading } = V;
  const P = () => V.plannerDoc(); const I = () => V.items; const ro = () => S.readonly;
  const STEPS = [['upload', 'Upload MSA'], ['contract', 'Review contract'], ['scope', 'Review scope'], ['sessions', 'Plan sessions'], ['schedule', 'Review schedule'], ['final', 'Finalise & export']];
  const mod = m => (F.moduleView(m) || {}).label || humanize(m);

  // ---------- contract extraction (from the real document text; nothing is invented) ----------
  const MONTHS = 'january|february|march|april|may|june|july|august|september|october|november|december'; const MI = MONTHS.split('|');
  const WORDNUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, eighteen: 18, twenty: 20, 'twenty-four': 24, thirty: 30, sixty: 60, ninety: 90 };
  const num = s => { s = String(s).toLowerCase(); return WORDNUM[s] !== undefined ? WORDNUM[s] : Number(s); };
  const iso = (y, m, d) => (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1990 && y <= 2100) ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '';
  function parseDate(s) {
    s = String(s || ''); let m;
    if ((m = s.match(new RegExp('(\\d{1,2})(?:st|nd|rd|th)?[\\s\\-/]+(?:of\\s+)?(' + MONTHS + '|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?,?[\\s\\-/]+(\\d{4})', 'i')))) { const mi = MI.findIndex(x => x.startsWith(m[2].toLowerCase().slice(0, 3))); return iso(+m[3], mi + 1, +m[1]); }
    if ((m = s.match(new RegExp('(' + MONTHS + ')[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})', 'i')))) return iso(+m[3], MI.indexOf(m[1].toLowerCase()) + 1, +m[2]);
    if ((m = s.match(/(\d{4})-(\d{2})-(\d{2})/))) return iso(+m[1], +m[2], +m[3]);
    if ((m = s.match(/(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})/))) return iso(+m[3], +m[2], +m[1]);
    return '';
  }
  V.parseAnyDate = parseDate;
  function sentences(x) {
    const out = []; let sec = '';
    (x.pages || [{ n: null, text: x.text, method: 'text', conf: null }]).forEach(pg => {
      String(pg.text || '').replace(/[ \t]+/g, ' ').split(/\n{2,}|(?<=[.;:])\s+(?=[A-Z0-9(“"])|\n(?=\d+(?:\.\d+)*[.)]?\s+[A-Z])/).forEach(t => {
        t = t.replace(/\s*\n\s*/g, ' ').trim(); if (t.length < 15 || t.length > 700) return; const cm = t.match(/^(\d+(?:\.\d+){0,4})[.)]?\s+\S/); if (cm) sec = cm[1];
        out.push({ t, page: pg.n, section: sec, ocr: pg.method === 'ocr', conf: pg.conf });
      });
    });
    return out;
  }
  const lowConf = s => s && s.ocr && (s.conf == null || s.conf < 70);
  function extractContract(x) {
    const d = P(); const S2 = sentences(x); const fields = {}; const old = (d.contractX && d.contractX.fields) || {};
    const put = (k, label, value, hit, extra) => { const o = old[k]; const keep = o && (o.status === 'verified') ? o : null;
      fields[k] = keep || Object.assign({ k, label, value: value == null ? '' : value, page: hit ? hit.page : null, section: hit ? hit.section : '', snippet: hit ? hit.t.slice(0, 320) : '', status: value == null || value === '' ? 'missing' : (hit && lowConf(hit) ? 'uncertain' : 'extracted') }, extra || {}); };
    const first = x.pages ? x.pages.slice(0, 3).map(p => p.text).join('\n') : x.text.slice(0, 5000);
    const flat = first.replace(/\s+/g, ' ');
    // title and reference
    const tl = first.split(/\r?\n/).map(l => l.trim()).find(l => /agreement|contract/i.test(l) && l.length < 110 && !/^(this|the|whereas|between)\b/i.test(l)); put('title', 'Contract title', tl || '', tl ? { page: 1, section: '', t: tl } : null);
    const rm = flat.match(/(?:agreement|contract|reference|ref)\s*(?:no\.?|number|#|ref\.?)?\s*[:#]\s*([A-Z0-9][A-Z0-9/_-]{2,24})/i); put('reference', 'Contract reference', rm ? rm[1] : '', rm ? { page: 1, section: '', t: rm[0] } : null);
    // parties
    const pm = flat.match(/between\s+(.{3,110}?)\s*(?:\(([^)]{2,40})\))?\s*(?:,\s*)?\band\b\s+(.{3,110}?)\s*(?:\(([^)]{2,40})\)|,|\.|\s+(?:effective|dated|on)\b)/i);
    if (pm) { const clean = z => z.replace(/^(?:the\s+)?(?:company\s+)?/i, '').replace(/[“”"]/g, '').replace(/\s+/g, ' ').trim(); const role = r => { r = (r || '').replace(/[“”"']/g, '').replace(/^the\s+/i, '').trim(); return r ? r[0].toUpperCase() + r.slice(1) : 'Party'; };
      put('parties', 'Parties', [{ role: role(pm[2]), name: clean(pm[1]), signatory: '' }, { role: role(pm[4]), name: clean(pm[3]), signatory: '' }], { page: 1, section: '', t: pm[0] }, { rows: true }); }
    else put('parties', 'Parties', '', null);
    // dates
    const sg = S2.find(s => /\b(dated|made on|entered into|signed|executed)\b/i.test(s.t) && parseDate(s.t)); put('signed', 'Signed / agreement date', sg ? parseDate(sg.t) : '', sg);
    const ef = S2.find(s => /\b(effective date|commencement date|effective as of|shall commence|commences on)\b/i.test(s.t) && parseDate(s.t)); put('effective', 'Effective / start date', ef ? parseDate(ef.t) : '', ef);
    const en = S2.find(s => /\b(expires? on|expiry date|end date|shall end on|terminates? on)\b/i.test(s.t) && parseDate(s.t)); put('endDate', 'End date', en ? parseDate(en.t) : '', en);
    // term
    let tm = null, months = ''; for (const s of S2) { const m = s.t.match(/\b(?:initial\s+)?(?:term|period)\b[^.]{0,80}?\b(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten|twelve|eighteen|twenty-four)\s*(?:\(\d+\)\s*)?(year|month)s?\b/i) || s.t.match(/\b(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten|twelve|eighteen|twenty-four)\s*(?:\(\d+\)\s*)?(year|month)s?\b[^.]{0,40}?\b(?:term|period)\b/i); if (m && !isNaN(num(m[1]))) { tm = s; months = num(m[1]) * (/year/i.test(m[2]) ? 12 : 1); break; } }
    put('termMonths', 'Contract duration (months)', months, tm);
    // renewal, termination, notice
    const rn = S2.find(s => /\brenew/i.test(s.t)); put('renewal', 'Renewal terms', rn ? rn.t : '', rn);
    const tx = S2.find(s => /\bterminat/i.test(s.t) && /\bnotice\b/i.test(s.t)) || S2.find(s => /\bterminat/i.test(s.t)); put('exit', 'Termination terms', tx ? tx.t : '', tx);
    const nd = S2.find(s => /\bnotice\b/i.test(s.t) && /\b\d{1,3}\s*(?:\(\d+\)\s*)?(?:calendar\s+)?days?\b/i.test(s.t) && /renew|non-renewal|expir/i.test(s.t)); const ndm = nd && nd.t.match(/\b(\d{1,3})\s*(?:\(\d+\)\s*)?(?:calendar\s+)?days?\b/i); put('noticeDays', 'Renewal notice (days)', ndm ? Number(ndm[1]) : '', nd);
    // fees
    const pd = S2.find(s => /\b(payable|payment|invoice[sd]?)\b/i.test(s.t) && /\b(within|net)\s*\d{1,3}\s*(?:\(\d+\)\s*)?days?\b/i.test(s.t)); const pdm = pd && pd.t.match(/\b(?:within|net)\s*(\d{1,3})\s*(?:\(\d+\)\s*)?days?\b/i); put('paymentDays', 'Payment terms (days)', pdm ? Number(pdm[1]) : '', pd);
    const vl = S2.find(s => /\b(fees?|charges?|price|value|total)\b/i.test(s.t) && /(?:AED|USD|EUR|GBP|SAR|INR|\$|€|£)\s?\d[\d,]*(?:\.\d+)?|\d[\d,]*(?:\.\d+)?\s?(?:AED|USD|EUR|GBP|SAR|INR)/i.test(s.t)); const vm = vl && vl.t.match(/(?:AED|USD|EUR|GBP|SAR|INR|\$|€|£)\s?\d[\d,]*(?:\.\d+)?|\d[\d,]*(?:\.\d+)?\s?(?:AED|USD|EUR|GBP|SAR|INR)/i); put('value', 'Contract value / fees', vm ? vm[0] : '', vl, { noApply: true });
    // obligations (supplier and customer), from sentences that state them
    const ob = []; S2.forEach(s => { const m = s.t.match(/^(?:\d+(?:\.\d+)*[.)]?\s+)?(?:the\s+)?(customer|client|supplier|service provider|facilio|provider)\s+(shall|will|must|agrees to)\s+(.{12,260})/i); if (m && ob.length < 14) ob.push({ side: /customer|client/i.test(m[1]) ? 'Customer' : 'Facilio', text: m[3].replace(/[.;]+$/, ''), by: '', page: s.page, section: s.section }); });
    fields.obligations = old.obligations && old.obligations.status === 'verified' ? old.obligations : { k: 'obligations', label: 'Obligations and deliverables', value: ob, page: ob[0] ? ob[0].page : null, section: ob[0] ? ob[0].section : '', snippet: ob.length + ' obligation sentence(s) found', status: ob.length ? 'extracted' : 'missing', rows: true };
    // scope-side findings
    const take = (re, cap) => S2.filter(s => re.test(s.t)).slice(0, cap).map(s => ({ text: s.t.replace(/^\d+(?:\.\d+)*[.)]?\s+/, '').slice(0, 300), page: s.page, section: s.section, uncertain: lowConf(s) }));
    const scopeX = { exclusions: take(/\b(exclud|out of scope|not (?:be )?(?:included|covered|in scope)|does not include|shall not include)/i, 12), deliverables: take(/\bdeliverables?\b/i, 12), responsibilities: take(/\b(customer|client)\s+(shall|will|must|is responsible|agrees to)\b/i, 12), assumptions: take(/\b(assum|depend(?:s|ent)? on|subject to the customer|provided that the customer)/i, 12) };
    d.contractX = { at: new Date().toISOString(), fields, scopeX, from: d.msa ? d.msa.name : '' };
  }
  V.extractContract = extractContract; V.contractSentences = sentences;

  // ---------- mapping extracted fields into the existing Know Your Contract / Scope records ----------
  const rec = k => { const r = Object.assign({}, I().get(k, 'main') || {}); delete r.hist; return r; };
  const present = v => !(v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length));
  const TARGETS = {
    parties: ['ctrcore', 'parties'], signed: ['ctrcore', 'signed'], termMonths: ['ctrcore', 'termMonths'], renewal: ['ctrcore', 'renewal'], exit: ['ctrcore', 'exit'], noticeDays: ['ctrcore', 'noticeDays'], obligations: ['ctrcore', 'obligations'],
    effective: ['ctrcore', 'startDate'], paymentDays: ['ctrfees', 'paymentDays'] };
  const existing = k => { const t = TARGETS[k]; return t ? rec(t[0])[t[1]] : undefined; };
  ACT.mfApplyContract = async () => {
    const d = P(); const cx = d.contractX; if (!cx) return; const ks = Object.keys(TARGETS).filter(k => cx.fields[k] && ['extracted', 'verified'].includes(cx.fields[k].status) && present(cx.fields[k].value));
    if (!ks.length) { toast('Nothing extracted to apply — fill the fields or verify them first'); return; }
    const over = ks.filter(k => present(existing(k)) && JSON.stringify(existing(k)) !== JSON.stringify(cx.fields[k].value));
    if (!(await confirmDialog('Apply to Know Your Contract', `${ks.length} value(s) will be written to Know Your Contract.${over.length ? ' These already have a different value and will be replaced: ' + over.map(k => cx.fields[k].label).join(', ') + '.' : ''}`, 'Apply'))) return;
    const core = rec('ctrcore'), fees = rec('ctrfees');
    ks.forEach(k => { const [kind, key] = TARGETS[k]; const tgt = kind === 'ctrcore' ? core : fees; let v = cx.fields[k].value; if (k === 'obligations') v = v.map(o => ({ side: o.side, text: o.text, by: o.by || '' })); tgt[key] = v; if (k === 'effective') core.startRule = 'date'; cx.fields[k].applied = new Date().toISOString(); });
    await I().put('ctrcore', 'main', core, { silent: true }); await I().put('ctrfees', 'main', fees, { silent: true });
    F.changed('Contract details applied from the MSA', ks.length + ' fields', { section: 'planner' }); toast('Applied to Know Your Contract');
  };
  const SCOPE_MAP = { exclusions: 'exclusions', deliverables: 'deliverables', responsibilities: 'responsibilities', assumptions: 'assumptions' };
  const refTxt = o => (o.page ? ' (MSA p.' + o.page + (o.section ? ' §' + o.section : '') + ')' : o.section ? ' (MSA §' + o.section + ')' : ' (MSA)');
  ACT.mfApplyScope = async () => {
    const d = P(); const cx = d.contractX || { scopeX: {} }; const sc = Object.assign({}, I().get('scope', 'main') || {}); delete sc.hist; let added = 0;
    const addLines = (key, lines) => { const cur = (sc[key] || []).slice(); lines.forEach(l => { if (!cur.some(c => c.replace(/\s*\(MSA[^)]*\)\s*$/, '').toLowerCase() === l.replace(/\s*\(MSA[^)]*\)\s*$/, '').toLowerCase())) { cur.push(l); added++; } }); sc[key] = cur; };
    addLines('inclusions', d.scope.filter(x => x.source === 'msa' && x.status === 'matched').map(x => x.text.slice(0, 220) + refTxt(x)));
    Object.keys(SCOPE_MAP).forEach(k => addLines(SCOPE_MAP[k], (cx.scopeX[k] || []).filter(o => !o.rejected).map(o => o.text.slice(0, 220) + refTxt(o))));
    if (!added) { toast('The Scope page already has everything extracted'); return; }
    await I().put('scope', 'main', sc, { silent: true }); F.changed('Scope page updated from the MSA', added + ' line(s)', { section: 'planner' }); toast(added + ' line(s) added to Scope — contractual items carry their MSA page');
  };

  // ---------- state ----------
  // sub-navigation inside each step. 'review' / 'proposals' / 'live' are this workflow's own views; the rest are the original Know Your Contract, Scope and Requirement Session Planner screens, embedded unchanged.
  const SUBS = { contract: [['review', 'Extracted details'], ['know', 'Know Your Contract']], scope: [['review', 'Review MSA scope'], ['msa', 'MSA scope vs Facilio modules'], ['page', 'Scope document']],
    sessions: [['proposals', 'Proposals & order'], ['list', 'Session list'], ['dist', 'Module distribution'], ['att', 'Attendees'], ['changes', 'Schedule changes']], schedule: [['live', 'Live schedule'], ['export', 'Excel preview & saved copy']] };
  const PLTAB = { 'scope/msa': 'scope', 'sessions/list': 'sessions', 'sessions/dist': 'distribution', 'sessions/att': 'attendees', 'sessions/changes': 'changes', 'schedule/export': 'export' };
  const PL2SUB = { scope: ['scope', 'msa'], sessions: ['sessions', 'list'], distribution: ['sessions', 'dist'], attendees: ['sessions', 'att'], changes: ['sessions', 'changes'], export: ['schedule', 'export'] };
  const sub = (st) => { const a = SUBS[st]; if (!a) return ''; const v = (S.ui.mfSub || {})[st]; return a.some(x => x[0] === v) ? v : a[0][0]; };
  const setSub = (st, v) => { S.ui.mfSub = Object.assign({}, S.ui.mfSub || {}, { [st]: v }); };
  const subBar = st => { const a = SUBS[st]; if (!a) return ''; const cur = sub(st); return `<div class="tabs mf-sub" role="tablist">${a.map(([k, l]) => `<button class="tab${cur === k ? ' active' : ''}" role="tab" aria-selected="${cur === k}" data-act="mfSub" data-s="${st}" data-v="${k}">${esc(l)}</button>`).join('')}</div>`; };
  ACT.mfSub = a => { setSub(a.getAttribute('data-s'), a.getAttribute('data-v')); S.ui.mfStep = a.getAttribute('data-s'); V.render(); };
  // old planner entry points land here: the matching step and sub-tab
  V.mfOpenPlTab = t => { const [st, sb] = PL2SUB[t] || PL2SUB.sessions; setSub(st, sb); S.ui.plTab = t; S.ui.mfStep = st; if (S.ui.view !== 'msaflow') S.ui.view = 'msaflow'; V.render(); };
  V.mfRoute = (view, extra) => { // contract / scope / planner / msaflow → the Contract section
    if (view === 'contract') { setSub('contract', 'know'); S.ui.mfStep = 'contract'; }
    else if (view === 'scope') { setSub('scope', 'page'); S.ui.mfStep = 'scope'; }
    else if (view === 'planner') { const [st, sb] = PL2SUB[(extra && extra.plTab) || S.ui.plTab || 'sessions'] || PL2SUB.sessions; setSub(st, sb); S.ui.mfStep = st; }
    return 'msaflow'; };
  const embed = html => `<div class="mf-embed">${html}</div>`;
  const step = () => S.ui.mfStep || 'upload'; const setStep = s => { S.ui.mfStep = s; V.render(); };
  ACT.mfStep = a => { const v = a.getAttribute('data-v'); S.ui.mfSub = Object.assign({}, S.ui.mfSub || {}, { [v]: undefined }); setStep(v); }; // choosing a step opens its first sub-tab
  ACT.mfNext = a => { const i = STEPS.findIndex(x => x[0] === step()); setStep(STEPS[Math.min(STEPS.length - 1, Math.max(0, i + Number(a.getAttribute('data-d'))))][0]); };
  const confirmedScope = () => P().scope.filter(x => x.status === 'matched' && x.module);
  const scopeSig = () => JSON.stringify(confirmedScope().map(x => [x.id, x.module, x.text.slice(0, 60)]).sort());
  function msaState() {
    const d = P(), m = d.msa; if (d.msaFail && (!m || d.msaFail.at > m.uploadedAt)) return { k: 'failed', label: 'Failed', cls: 'red', notes: [d.msaFail.reason] };
    if (!m) return { k: 'none', label: 'Not uploaded', cls: 'low', notes: [] }; const notes = [];
    if (m.pages) { const bad = m.pages.filter(p => p.method === 'failed' || p.method === 'skipped'); const oc = m.pages.filter(p => p.method === 'ocr' && (p.conf == null || p.conf < 70));
      if (bad.length) notes.push(`${bad.length} page(s) could not be read (page ${bad.map(p => p.n).join(', ')}). They are not in the extraction.`); if (oc.length) notes.push(`${oc.length} page(s) were read by OCR below 70% confidence (page ${oc.map(p => p.n).join(', ')}) — check those items.`);
      if (bad.length === m.pages.length) return { k: 'failed', label: 'Failed', cls: 'red', notes: ['No page could be read.'] }; if (bad.length || oc.length) return { k: 'review', label: 'Needs review', cls: 'tbc', notes }; }
    else notes.push('Word / text file: no page numbers. Section references are used where the document has numbered headings.');
    if (!d.contractX) notes.push('Contract details have not been extracted yet — use Re-extract.');
    return { k: 'ok', label: 'Processed successfully', cls: 'green', notes };
  }
  const bar = () => { const st = step(); const m = msaState(); const d = P(); const done = { upload: m.k === 'ok' || m.k === 'review', contract: !!(d.contractX && Object.values(d.contractX.fields).some(f => f.status === 'verified')), scope: d.scope.some(x => x.status === 'matched'), sessions: d.sessions.some(s => s.status !== 'cancelled'), schedule: false, final: !!d.final };
    return `<div class="mf-steps" role="tablist">${STEPS.map(([k, l], i) => `<button role="tab" aria-selected="${st === k}" class="mf-step${st === k ? ' on' : ''}${done[k] ? ' done' : ''}" data-act="mfStep" data-v="${k}"><span class="n">${done[k] && st !== k ? '✓' : i + 1}</span><span>${esc(l)}</span></button>`).join('')}</div>`; };
  const stale = () => { const d = P(); return d.final && d.final.sig !== scopeSig() ? `<div class="notice warn" style="margin-bottom:12px"><span><b>The scope has changed since the schedule was finalised (${esc(V.fmtDate(d.final.at))}).</b> The finalised schedule has not been touched. Review the sessions, then finalise again or reopen it.</span></div>` : ''; };
  const nav = (back, next, nextLabel) => `<div class="row" style="margin-top:16px">${back ? `<button class="btn" data-act="mfNext" data-d="-1">← Back</button>` : ''}<span class="spacer"></span>${next ? `<button class="btn primary" data-act="mfNext" data-d="1">${esc(nextLabel || 'Continue')} →</button>` : ''}</div>`;

  // ---------- step 1: upload ----------
  function s1() {
    const d = P(), m = d.msa, st = msaState();
    const pgs = m && m.pages ? (() => { const n = k => m.pages.filter(p => p.method === k).length; return `${m.pages.length} page(s): ${n('text')} with a text layer, ${n('ocr')} read by OCR${n('failed') + n('skipped') ? `, ${n('failed') + n('skipped')} unreadable` : ''}`; })() : (m ? 'Page count not available for this file type' : '');
    return `<div class="grid g2"><div class="card"><div class="card-h"><h3>Master Services Agreement</h3>${tag(st.cls, st.label)}</div><div class="card-b small">
      ${m ? `<div><b>${esc(m.name)}</b> <span class="muted">· ${esc(V.fmtSize(m.size || 0))} · uploaded ${esc(V.fmtDate(m.uploadedAt))}</span></div><div style="margin-top:6px">${esc(pgs)}</div><div>Extracted text: ${m.chars ? '<b>' + m.chars.toLocaleString() + ' characters</b>' : '<span style="color:var(--fc-danger)">none</span>'}${m.ocr && m.ocr.used ? ' (includes OCR)' : ''}</div>` : '<div class="muted">No MSA has been uploaded for this project yet.</div>'}
      ${d.msaFail ? `<div class="notice err" style="margin-top:10px"><span><b>${esc(d.msaFail.name)} could not be processed:</b> ${esc(d.msaFail.reason)} Nothing was filled in from it.</span></div>` : ''}
      ${st.notes.length ? `<ul style="margin:10px 0 0;padding-left:18px">${st.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
      <div class="row" style="margin-top:12px">${ro() ? '' : `<button class="btn primary" data-act="uploadMsa">${ico('up')}${m ? 'Replace MSA' : 'Upload MSA (PDF)'}</button>`}${m && !ro() ? `<button class="btn" data-act="reExtract">Re-extract</button>` : ''}${m ? `<button class="btn" data-act="dlMsa">${ico('dl')}Download</button>` : ''}${m && /\.pdf$/i.test(m.name) ? `<button class="btn" data-act="mfPreview">Preview pages</button>` : ''}</div>
      <div class="xs muted" style="margin-top:8px">Scanned PDFs are read with OCR in your browser. Values below 70% OCR confidence are marked for review. Nothing is filled in from a file that cannot be read.</div></div></div>
      <div class="card"><div class="card-h"><h3>How the MSA flows through</h3></div><div class="card-b small"><ol style="margin:0;padding-left:18px"><li><b>Contract</b> — parties, dates, term, renewal, payment and obligations go to <i>Know Your Contract</i>, each with its page.</li><li><b>Scope</b> — scope lines, exclusions, deliverables and responsibilities go to <i>Scope</i> and the MSA scope list.</li><li><b>Sessions</b> — each confirmed scope module gets a proposed workshop session, with the scope lines that justify it.</li><li><b>Schedule</b> — the sessions fill the workshop-plan Excel; edits flow both ways.</li></ol></div></div></div>
      <div id="mfPreviewBox"></div>${nav(false, !!m && st.k !== 'failed', 'Review contract')}`;
  }
  let pv = null;
  ACT.mfPreview = async a => V.busy(a, async () => { const d = P(); const box = document.getElementById('mfPreviewBox'); if (!box || !d.msa) return; const x = await API.downloadFile(S.project.id, d.msa.fileId); const pdfjs = await V.pdfjs(); const doc = await pdfjs.getDocument({ data: new Uint8Array(await x.blob.arrayBuffer()), isEvalSupported: false }).promise; pv = { doc, n: 1 }; box.innerHTML = `<div class="card" style="margin-top:14px"><div class="card-h"><h3>Document preview</h3><span class="small muted" id="mfPvPos"></span><button class="btn sm" data-act="mfPage" data-d="-1">←</button><button class="btn sm" data-act="mfPage" data-d="1">→</button></div><div class="card-b" style="overflow:auto;max-height:70vh;text-align:center"><canvas id="mfPvCanvas" style="max-width:100%;border:1px solid var(--fc-border)"></canvas></div></div>`; await paintPage(); });
  async function paintPage() { if (!pv) return; const pg = await pv.doc.getPage(pv.n); const vp = pg.getViewport({ scale: 1.5 }); const cv = document.getElementById('mfPvCanvas'); if (!cv) return; cv.width = vp.width; cv.height = vp.height; await pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise; const p = document.getElementById('mfPvPos'); if (p) p.textContent = 'Page ' + pv.n + ' of ' + pv.doc.numPages; }
  ACT.mfPage = a => { if (!pv) return; pv.n = Math.min(pv.doc.numPages, Math.max(1, pv.n + Number(a.getAttribute('data-d')))); paintPage(); };

  // ---------- step 2: contract ----------
  const ST = { extracted: ['blue', 'Extracted'], verified: ['green', 'Verified by user'], missing: ['low', 'Missing from source'], uncertain: ['tbc', 'Needs review'] };
  const valTxt = f => Array.isArray(f.value) ? f.value.map(r => f.k === 'parties' ? `${r.role}: ${r.name}` : `${r.side}: ${r.text}`).join('\n') : String(f.value == null ? '' : f.value);
  function s2() {
    const d = P(), cx = d.contractX; if (!d.msa) return `<div class="card empty"><h3>Upload the MSA first</h3><p>Know Your Contract is filled from the document.</p><button class="btn primary" data-act="mfStep" data-v="upload">Go to step 1</button></div>`;
    if (!cx) return `<div class="card empty"><h3>Contract details have not been extracted</h3><p>Re-extract the MSA to read the contract fields.</p>${ro() ? '' : '<button class="btn primary" data-act="reExtract">Re-extract</button>'}</div>`;
    const fs = Object.values(cx.fields); const cnt = k => fs.filter(f => f.status === k).length;
    return `<div class="row" style="margin-bottom:12px">${tag('blue', cnt('extracted') + ' extracted')}${tag('green', cnt('verified') + ' verified')}${tag('tbc', cnt('uncertain') + ' need review')}${tag('low', cnt('missing') + ' missing from the MSA')}<span class="spacer"></span><button class="btn" data-act="nav" data-view="contract">Open Know Your Contract</button>${ro() ? '' : '<button class="btn primary" data-act="mfApplyContract">Apply to Know Your Contract</button>'}</div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:17%">Field</th><th>Value found in the MSA</th><th style="width:22%">Source</th><th style="width:15%">Status</th><th style="width:13%">In Know Your Contract</th><th></th></tr></thead><tbody>${fs.map(f => { const cur = existing(f.k); const st = ST[f.status] || ST.missing; const multi = Array.isArray(f.value) || /^(renewal|exit)$/.test(f.k);
        return `<tr><td><b>${esc(f.label)}</b></td><td class="small">${ro() || Array.isArray(f.value) ? `<div style="white-space:pre-wrap">${esc(valTxt(f)) || '<span class="dash">---</span>'}</div>` : multi ? `<textarea rows="3" data-change="mfField" data-k="${f.k}" style="width:100%">${esc(valTxt(f))}</textarea>` : `<input type="${/^(signed|effective|endDate)$/.test(f.k) ? 'date' : /^(termMonths|noticeDays|paymentDays)$/.test(f.k) ? 'number' : 'text'}" data-change="mfField" data-k="${f.k}" value="${esc(valTxt(f))}" style="width:100%">`}</td>
          <td class="xs">${f.page ? 'p. ' + f.page : ''}${f.section ? ' · § ' + esc(f.section) : ''}${f.snippet ? `<details><summary class="muted">Text</summary><div class="muted">${esc(f.snippet)}</div></details>` : f.status === 'missing' ? '<span class="muted">Not found</span>' : ''}</td>
          <td>${tag(st[0], st[1])}</td><td class="xs">${TARGETS[f.k] ? (present(cur) ? (JSON.stringify(cur) === JSON.stringify(f.value) || f.applied ? tag('green', 'Applied') : tag('tbc', 'Has a different value')) : '<span class="muted">Empty</span>') : '<span class="muted">Reference only</span>'}</td>
          <td class="acts">${ro() ? '' : `<button class="btn sm" data-act="mfVerify" data-k="${f.k}">${f.status === 'verified' ? 'Unverify' : 'Verify'}</button>`}</td></tr>`; }).join('')}</tbody></table></div>
      <div class="xs muted" style="margin-top:6px">Only values the document supports are filled in. <b>Value / fees</b> is shown for reference and is never applied automatically. Edit any value, then press Verify.</div>${nav(true, true, 'Review scope')}`;
  }
  ACT.mfField = el => { const f = P().contractX.fields[el.getAttribute('data-k')]; let v = el.value; if (el.type === 'number') v = v === '' ? '' : Number(v); f.value = v; f.status = v === '' ? 'missing' : 'uncertain'; delete f.applied; F.changed('Contract field edited', f.label, { section: 'planner' }); };
  ACT.mfVerify = a => { const f = P().contractX.fields[a.getAttribute('data-k')]; if (f.status === 'verified') f.status = present(f.value) ? 'extracted' : 'missing'; else if (present(f.value)) f.status = 'verified'; else { toast('Nothing to verify — enter a value first'); return; } F.changed('Contract field ' + f.status, f.label, { section: 'planner' }); };

  // ---------- step 3: scope ----------
  function s3() {
    const d = P(); if (!d.msa) return `<div class="card empty"><h3>Upload the MSA first</h3><button class="btn primary" data-act="mfStep" data-v="upload">Go to step 1</button></div>`;
    const cx = d.contractX || { scopeX: {} }; const msaI = d.scope.filter(x => x.source !== 'manual'), man = d.scope.filter(x => x.source === 'manual');
    const row = x => { const i = d.scope.indexOf(x); return `<tr><td class="small">${esc(x.text)}</td><td class="xs">${x.page ? 'p. ' + x.page : ''}${x.section ? ' · § ' + esc(x.section) : ''}${x.read === 'ocr' ? ' ' + tag('tbc', 'OCR') : ''}</td><td class="small">${esc(x.module ? mod(x.module) : '—')}</td><td>${tag(x.status === 'matched' ? 'green' : x.status === 'excluded' ? 'low' : 'tbc', x.status === 'matched' ? 'Confirmed' : x.status === 'excluded' ? 'Rejected' : 'Needs review')}</td><td class="acts">${ro() ? '' : `<button class="btn sm" data-act="mfScope" data-i="${i}" data-s="matched">Confirm</button><button class="btn sm" data-act="mfScope" data-i="${i}" data-s="excluded">Reject</button><button class="btn sm" data-act="mfScope" data-i="${i}" data-s="uncertain">Flag</button>`}</td></tr>`; };
    const lst = (k, title) => { const a = cx.scopeX[k] || []; return `<div class="card" style="margin-bottom:12px"><div class="card-h"><h3>${title}</h3><span class="small muted">${a.length} found in the MSA</span></div><div class="card-b small">${a.length ? a.map((o, j) => `<div style="margin-bottom:6px;${o.rejected ? 'opacity:.5;text-decoration:line-through' : ''}">${esc(o.text)} <span class="xs muted">${o.page ? 'p. ' + o.page : ''}${o.section ? ' · § ' + esc(o.section) : ''}</span>${o.uncertain ? ' ' + tag('tbc', 'OCR — check') : ''}${ro() ? '' : ` <button class="linkbtn" data-act="mfScopeX" data-k="${k}" data-j="${j}">${o.rejected ? 'Restore' : 'Reject'}</button>`}</div>`).join('') : '<span class="muted">Nothing found in the MSA text. Not stated ≠ none — add manually if the contract is silent on it.</span>'}</div></div>`; };
    return `<div class="row" style="margin-bottom:12px">${tag('green', msaI.filter(x => x.status === 'matched').length + ' confirmed')}${tag('tbc', d.scope.filter(x => x.status === 'uncertain').length + ' need review')}${tag('low', d.scope.filter(x => x.status === 'excluded').length + ' rejected')}<span class="spacer"></span><button class="btn" data-act="nav" data-view="scope">Open Scope</button><button class="btn" data-act="mfOpenMsaScope">Open MSA scope list</button>${ro() ? '' : '<button class="btn" data-act="applyScope">Mark confirmed modules in scope</button><button class="btn primary" data-act="mfApplyScope">Add to the Scope page</button>'}</div>
      <div class="card" style="margin-bottom:12px"><div class="card-h"><h3>Contractual scope — stated in the MSA</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:42%">Scope item</th><th>Source</th><th>Facilio module</th><th>Status</th><th></th></tr></thead><tbody>${msaI.map(row).join('') || '<tr><td colspan="5" class="empty">No scope lines were found in the MSA.</td></tr>'}</tbody></table></div></div>
      ${man.length ? `<div class="card" style="margin-bottom:12px"><div class="card-h"><h3>Added by the team — not stated in the MSA</h3>${tag('tbc', 'Assumption / inferred')}</div><div class="tbl-wrap"><table class="tbl"><tbody>${man.map(row).join('')}</tbody></table></div></div>` : ''}
      <div class="grid g2">${lst('deliverables', 'Services and deliverables')}${lst('exclusions', 'Exclusions')}${lst('responsibilities', 'Customer responsibilities')}${lst('assumptions', 'Dependencies and assumptions')}</div>
      <div class="xs muted">Supplier obligations are in step 2 (Obligations). Assumptions are listed separately and are never treated as contractual scope. Confirmed scope drives the sessions in step 4.</div>${nav(true, true, 'Plan sessions')}`;
  }
  ACT.mfScope = a => { const x = P().scope[+a.getAttribute('data-i')]; if (!x) return; x.status = a.getAttribute('data-s'); F.changed('Scope item ' + (x.status === 'matched' ? 'confirmed' : x.status === 'excluded' ? 'rejected' : 'flagged'), x.text.slice(0, 60), { section: 'planner' }); };
  ACT.mfScopeX = a => { const o = P().contractX.scopeX[a.getAttribute('data-k')][+a.getAttribute('data-j')]; o.rejected = !o.rejected; F.changed(null, null, { section: 'planner' }); };
  ACT.mfOpenMsaScope = () => V.mfOpenPlTab('scope');

  // ---------- step 4: sessions ----------
  const active = () => P().sessions.filter(s => s.status !== 'cancelled').sort((a, b) => (a.no || 0) - (b.no || 0));
  function s4() {
    const d = P(); const conf = confirmedScope(); const un = [...new Set(conf.map(x => x.module))].filter(m => !active().some(s => (s.modules || []).includes(m)));
    return `<div class="row" style="margin-bottom:12px">${un.length ? tag('tbc', un.length + ' confirmed module(s) have no session') : tag('green', 'Every confirmed module has a session')}<span class="spacer"></span><button class="btn" data-act="mfOpenSessions">Open Sessions tab</button>${ro() ? '' : `<button class="btn" data-act="newSession">${ico('plus')}Add session</button><button class="btn primary" data-act="mfPropose">Propose sessions from confirmed scope</button>`}</div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Session</th><th>Modules</th><th style="width:30%">Why (scope source)</th><th>Date · time</th><th>Status</th><th></th></tr></thead><tbody>${active().map((s, i, arr) => `<tr><td><b>Session ${esc(s.no)}</b><div class="small">${esc(s.title)}</div>${s.proposed ? tag('tbc', 'Proposed') : ''}</td><td class="small">${esc((s.modules || []).map(mod).join(', ') || '—')}</td><td class="xs">${esc(s.why || (s.scopeIds && s.scopeIds.length ? s.scopeIds.length + ' scope item(s)' : 'Added by the team'))}</td><td class="small">${s.date ? esc(V.fmtDate(s.date)) : '<span class="muted">No date</span>'}${s.start ? ' · ' + esc(V.fmt12(s.start)) : ''}<div class="xs muted">${esc(V.durText(V.sessionMinutes(s)))}</div></td><td>${tag(s.proposed ? 'tbc' : 'low', s.proposed ? 'Proposed' : humanize(s.status))}</td>
        <td class="acts">${ro() ? '' : `<button class="btn sm" data-act="editSession" data-id="${esc(s.id)}">Edit</button><button class="btn sm ghost" data-act="mfMove" data-id="${esc(s.id)}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button><button class="btn sm ghost" data-act="mfMove" data-id="${esc(s.id)}" data-d="1" ${i === arr.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>${i > 0 ? `<button class="btn sm ghost" data-act="mfMerge" data-id="${esc(s.id)}">Merge ↑</button>` : ''}${(s.modules || []).length > 1 ? `<button class="btn sm ghost" data-act="mfSplit" data-id="${esc(s.id)}">Split</button>` : ''}<button class="btn sm ghost" data-act="delSession" data-id="${esc(s.id)}">Delete</button>`}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">No sessions yet. Confirm scope in step 3, then propose sessions.</td></tr>'}</tbody></table></div>
      <div class="xs muted" style="margin-top:6px">Proposing sessions only adds sessions for confirmed modules that do not have one. Existing sessions and your edits are never changed or replaced.</div>${nav(true, true, 'Review schedule')}`;
  }
  ACT.mfOpenSessions = () => V.mfOpenPlTab('sessions');
  ACT.mfPropose = async () => {
    const d = P(); if (d.final && !(await confirmDialog('Schedule is finalised', 'The schedule is finalised. Proposed sessions are added alongside it and are marked Proposed — the finalised sessions are not touched.', 'Add proposals'))) return;
    const conf = confirmedScope(); const mods = [...new Set(conf.map(x => x.module))].filter(m => !d.sessions.some(s => s.status !== 'cancelled' && (s.modules || []).includes(m)));
    if (!mods.length) { toast(conf.length ? 'Every confirmed module already has a session' : 'Confirm scope items in step 3 first'); return; }
    let no = Math.max(0, ...d.sessions.map(s => s.no || 0)); const last = d.sessions.slice().sort((a, b) => (b.no || 0) - (a.no || 0))[0]; const H = V.plannerHelpers;
    mods.forEach(m => { const items = conf.filter(x => x.module === m); const first = items[0]; no++;
      d.sessions.push({ id: F.uid('ses'), no, status: 'planned', proposed: true, title: mod(m) + ' requirements workshop', modules: [m], date: '', start: last && last.start ? last.start : '11:00', end: '', minutes: d.settings.defaultMinutes, mode: d.settings.mode, topics: items.map(x => x.text.slice(0, 160)).join('\n'), participants: '', scopeIds: items.map(x => x.id), why: 'MSA' + (first.page ? ' p.' + first.page : '') + (first.section ? ' §' + first.section : '') + ': “' + first.text.slice(0, 90) + '”' + (items.length > 1 ? ' +' + (items.length - 1) + ' more' : ''), source: 'msa' }); });
    F.changed('Sessions proposed from the MSA scope', mods.length + ' session(s)', { section: 'planner' }); toast(mods.length + ' proposed session(s) added');
  };
  ACT.mfMove = a => { const arr = active(); const i = arr.findIndex(s => s.id === a.getAttribute('data-id')); const j = i + Number(a.getAttribute('data-d')); if (i < 0 || j < 0 || j >= arr.length) return; const t = arr[i].no; arr[i].no = arr[j].no; arr[j].no = t; F.changed('Sessions reordered', 'Session ' + arr[i].no + ' ↔ ' + arr[j].no, { section: 'planner' }); };
  ACT.mfMerge = async a => { const arr = active(); const i = arr.findIndex(s => s.id === a.getAttribute('data-id')); if (i < 1) return; const s = arr[i], t = arr[i - 1];
    if (!(await confirmDialog('Merge sessions', `Merge “${s.title}” into “${t.title}”? Its modules, topics and scope links move to the earlier session and this one is cancelled.`, 'Merge'))) return;
    t.modules = [...new Set((t.modules || []).concat(s.modules || []))]; t.topics = [t.topics, s.topics].filter(Boolean).join('\n'); t.scopeIds = [...new Set((t.scopeIds || []).concat(s.scopeIds || []))]; t.why = [t.why, s.why].filter(Boolean).join(' · '); s.status = 'cancelled'; s.notes = ((s.notes || '') + ' Merged into session ' + t.no).trim(); F.changed('Sessions merged', 'Session ' + s.no + ' → ' + t.no, { section: 'planner' }); };
  ACT.mfSplit = async a => { const d = P(); const s = d.sessions.find(x => x.id === a.getAttribute('data-id')); if (!s || (s.modules || []).length < 2) return; if (!(await confirmDialog('Split session', `Split into ${s.modules.length} sessions, one per module?`, 'Split'))) return;
    let no = Math.max(...d.sessions.map(x => x.no || 0)); const rest = s.modules.slice(1); s.modules = [s.modules[0]]; s.title = mod(s.modules[0]) + ' requirements workshop';
    rest.forEach(m => { no++; d.sessions.push(Object.assign(F.clone(s), { id: F.uid('ses'), no, modules: [m], title: mod(m) + ' requirements workshop', date: '', scopeIds: (s.scopeIds || []).filter(id => (d.scope.find(x => x.id === id) || {}).module === m) })); }); s.scopeIds = (s.scopeIds || []).filter(id => (d.scope.find(x => x.id === id) || {}).module === s.modules[0]); F.changed('Session split', s.title, { section: 'planner' }); };

  // ---------- step 5: live Excel schedule, one model with the sessions ----------
  const COLID = 29; let live = null;
  const sheetSig = () => JSON.stringify(V.sessionRows().map(r => [r.s.id, r.a, r.b, r.c, r.d, r.e, r.f, r.g, r.h]));
  const cellVal = c => { let v = c.value; if (v && typeof v === 'object' && !(v instanceof Date)) { if (v.richText) v = v.richText.map(t => t.text).join(''); else if (v.result !== undefined) v = v.result; else if (v.text !== undefined) v = v.text; } return v == null ? '' : v; };
  const txt = v => v instanceof Date ? '' : String(v == null ? '' : v).trim();
  function writeIds(ws) { ws.getCell(2, COLID).value = 'Session ID'; ws.getColumn(COLID).hidden = true; V.sessionRows().forEach((r, i) => { ws.getRow(3 + i).getCell(COLID).value = r.s.id; }); }
  function patchWs() {
    const ws = live.ws; const rs = V.sessionRows(); const n = Math.max(rs.length, live.n || 0);
    for (let i = 0; i < n; i++) { const row = ws.getRow(3 + i); const r = rs[i]; const vals = r ? [r.a, r.b, r.c, r.d, r.e ? new Date(r.e + 'T00:00:00Z') : null, r.f, r.g, r.h] : [null, null, null, null, null, null, null, null];
      vals.forEach((v, k) => { const c = row.getCell(k + 1); c.value = v; if (r && i >= (live.n || 0)) { c.style = JSON.parse(JSON.stringify(ws.getRow(3).getCell(k + 1).style || {})); } if (k === 4 && v) c.numFmt = 'dd-mmm-yyyy'; }); row.getCell(COLID).value = r ? r.s.id : null; }
    live.n = rs.length; live.sig = sheetSig();
  }
  function parseTime(t, tl) { t = String(t).replace(tl || '§', '').trim().toLowerCase(); const m = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/); if (!m) return null; let h = +m[1]; const mi = +(m[2] || 0); if (m[3] === 'pm' && h < 12) h += 12; if (m[3] === 'am' && h === 12) h = 0; if (h > 23 || mi > 59) return null; return String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0'); }
  function parseDur(t) { t = String(t).toLowerCase().trim(); let m = t.match(/^(\d+(?:\.\d+)?)\s*(?:hr|hrs|hour|hours|h)\b(?:\s*(\d+)\s*(?:min|mins|minutes?|m))?$/); if (m) return Math.round(+m[1] * 60 + (+m[2] || 0)); m = t.match(/^(\d+)\s*(?:min|mins|minutes?|m)$/); if (m) return +m[1]; m = t.match(/^(\d+(?:\.\d+)?)$/); if (m) return +m[1] >= 15 ? Math.round(+m[1]) : Math.round(+m[1] * 60); return null; }
  function applyFromSheet() {
    if (!live || live.applying) return; live.applying = true; const d = P(); const ws = live.ws; const errs = []; const changes = []; const seen = new Set(); const tl = d.settings.timeLabel; const byId = Object.fromEntries(d.sessions.map(s => [s.id, s])); const gen = Object.fromEntries(V.sessionRows().map(r => [r.s.id, r]));
    try {
      for (let r = 3; r <= Math.max(ws.rowCount, 3 + (live.n || 0) + 40); r++) { const row = ws.getRow(r); const id = txt(cellVal(row.getCell(COLID))); const v = [1, 2, 3, 4, 5, 6, 7, 8].map(c => cellVal(row.getCell(c))); const empty = v.every(x => x === '' || x == null);
        if (empty && !id) continue; if (empty && id) continue; // blank rows are handled by the "seen" sweep below
        let s = id ? byId[id] : null; const where = 'Row ' + r + ': '; const patch = {}; let isNew = false;
        if (!s) { isNew = true; s = { id: F.uid('ses'), no: 0, status: 'planned', modules: [], title: '', topics: '', participants: '', date: '', start: '', end: '', minutes: d.settings.defaultMinutes, mode: d.settings.mode, source: 'excel' }; }
        seen.add(s.id);
        const a = txt(v[0]); const nm = a.match(/(\d+)/); if (nm) { if (+nm[1] !== s.no) patch.no = +nm[1]; } else if (isNew) patch.no = Math.max(0, ...d.sessions.map(x => x.no || 0)) + 1; else errs.push(where + 'the session number “' + a + '” is not valid (use “Session 3”).');
        const b = txt(v[1]); const gb = gen[s.id] ? gen[s.id].b : null; if (!b) errs.push(where + 'the workshop item (title) is empty.'); else if (b !== gb) patch.title = b;
        const c = txt(v[2]); if (c !== (s.topics || '')) patch.topics = c; const dd = txt(v[3]); if (dd !== (s.participants || '')) patch.participants = dd;
        const ev = v[4]; if (ev instanceof Date) { const ds = iso(ev.getUTCFullYear(), ev.getUTCMonth() + 1, ev.getUTCDate()); if (!ds) errs.push(where + 'the date is out of range.'); else if (ds !== (s.date || '')) patch.date = ds; } else if (txt(ev)) { const ds = parseDate(txt(ev)); if (!ds) errs.push(where + 'the date “' + txt(ev) + '” is not valid (use for example 25-Nov-2026).'); else if (ds !== (s.date || '')) patch.date = ds; } else if (s.date) patch.date = '';
        const fv = txt(v[5]); let start = s.start; if (fv) { const t = parseTime(fv, tl ? ' ' + tl.toLowerCase() : ''); const t2 = t || parseTime(fv.replace(new RegExp('\\s*' + (tl || '§') + '\\s*$', 'i'), '')); if (!t2) errs.push(where + 'the time “' + fv + '” is not valid (use for example 11am).'); else if (t2 !== (s.start || '')) { patch.start = t2; start = t2; } } else if (s.start) { patch.start = ''; start = ''; }
        const gv = txt(v[6]); let minutes = V.sessionMinutes(s); if (gv) { const n = parseDur(gv); if (n === null || n < 15 || n > 600) errs.push(where + 'the duration “' + gv + '” is not valid (use for example 2 hrs or 90 min, 15–600 minutes).'); else if (!gen[s.id] || gen[s.id].g !== gv) { if (n !== minutes) { patch.minutes = n; minutes = n; } } }
        const h = txt(v[7]); if (h && h !== (s.mode || d.settings.mode)) patch.mode = h;
        if (patch.start !== undefined || patch.minutes !== undefined) patch.end = start ? V.plannerHelpers.addMin(start, minutes) : '';
        if (isNew) { if (!errs.some(e => e.startsWith(where))) { Object.assign(s, patch); if (!s.title) continue; d.sessions.push(s); row.getCell(COLID).value = s.id; changes.push('Row ' + r + ' added as Session ' + s.no); } }
        else if (Object.keys(patch).length && !errs.some(e => e.startsWith(where))) { Object.assign(s, patch); changes.push('Session ' + s.no + ': ' + Object.keys(patch).filter(k => k !== 'end').join(', ')); }
      }
      d.sessions.filter(s => s.status !== 'cancelled' && live.ids && live.ids.has(s.id) && !seen.has(s.id)).forEach(s => { s.status = 'cancelled'; s.notes = ((s.notes || '') + ' Removed in the Excel preview.').trim(); changes.push('Session ' + s.no + ' removed (cancelled)'); });
      live.ids = new Set(d.sessions.filter(s => s.status !== 'cancelled').map(s => s.id));
      patchWs(); // write the model back so the sheet shows exactly what was saved (invalid entries revert)
      if (changes.length) F.changed('Schedule edited in the Excel preview', changes.slice(0, 4).join('; ') + (changes.length > 4 ? '…' : ''), { section: 'planner' });
      if (errs.length) toast('Not saved — ' + errs.slice(0, 3).join(' ') + (errs.length > 3 ? ' (+' + (errs.length - 3) + ' more)' : ''), 9000, true);
      live.E.render();
    } finally { live.applying = false; }
  }
  function s5() {
    const d = P(); if (!d.sessions.some(s => s.status !== 'cancelled')) return `<div class="card empty"><h3>No sessions to show yet</h3><p>Propose or add sessions in step 4 and they appear here.</p><button class="btn primary" data-act="mfStep" data-v="sessions">Go to step 4</button></div>`;
    return `<div class="notice" style="margin-bottom:10px"><span>This is the workshop-plan Excel (template columns), built from the sessions. <b>Edit a cell and the session updates; edit a session and the sheet updates.</b> Use a row's number column to reorder; add a row to add a session; delete a row's content to remove (cancel) that session. Invalid dates, times and durations are rejected and the cell is restored.</span></div>
      <div class="row" style="margin-bottom:8px">${ro() ? '' : `<button class="btn" data-act="newSession">${ico('plus')}Add session (form)</button>`}<span class="spacer"></span><button class="btn" data-act="mfSheetDownload">${ico('dl')}Download Excel</button></div>
      <div id="mfxHost" style="min-height:420px"></div>${nav(true, true, 'Finalise')}`;
  }
  ACT.mfSheetDownload = async () => { if (!live) return; live.ws.getColumn(COLID).eachCell({ includeEmpty: false }, c => { c.value = null; }); try { const buf = await live.E.buffer(); V.download(F.slug(S.project.customer || 'Customer') + '_workshop_plan.xlsx', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); F.log('Workshop plan exported', 'from the live schedule'); } finally { writeIds(live.ws); live.E.render(); } };
  V.msaflowLive = () => live;
  function mountSchedule() {
    if (step() !== 'schedule' || sub('schedule') !== 'live' || !document.getElementById('mfxHost')) return;
    if (live && live.E && !live.applying) { const sg = sheetSig(); if (sg !== live.sig) { patchWs(); live.E.render(); } } // the sessions changed elsewhere: bring the sheet up to date
    V.hostLive('mfx', 'mfx', async L => { L.el.innerHTML = '<div class="empty">Building the schedule…</div>'; const wb = await V.sessionWb(); const ws = wb.getWorksheet('Tentative Workshop Sessions') || wb.worksheets[0]; writeIds(ws);
      L.el.innerHTML = ''; const E = new V.XlsEditor(L.el, wb, { readonly: ro(), sheet: wb.worksheets.indexOf(ws), actions: '', onChange: () => applyFromSheet() }); L.api = E;
      live = { E, wb, ws, n: V.sessionRows().length, sig: sheetSig(), ids: new Set(P().sessions.filter(s => s.status !== 'cancelled').map(s => s.id)), applying: false }; });
  }

  // ---------- step 6: finalise ----------
  function s6() {
    const d = P(); const m = msaState(); const act = active(); const un = V.uncoveredModules ? V.uncoveredModules() : []; const cx = d.contractX; const unconf = d.scope.filter(x => x.status === 'uncertain').length;
    const checks = [[m.k === 'ok' || m.k === 'review', 'MSA processed' + (m.k === 'review' ? ' (some pages need review)' : '')], [!!cx && Object.values(cx.fields).some(f => f.status === 'verified'), 'Contract details reviewed (at least one field verified)'], [unconf === 0, unconf ? unconf + ' scope item(s) still need review' : 'No scope items waiting for review'], [!un.length, un.length ? un.length + ' in-scope module(s) have no session' : 'All in-scope modules have a session'], [act.length > 0 && act.every(s => s.date), act.length ? (act.filter(s => !s.date).length ? act.filter(s => !s.date).length + ' session(s) have no date' : 'Every session has a date') : 'No sessions'], [!act.some(s => s.proposed), act.some(s => s.proposed) ? act.filter(s => s.proposed).length + ' session(s) are still marked Proposed' : 'No proposed sessions waiting for confirmation']];
    return `${stale()}<div class="card"><div class="card-h"><h3>Before you finalise</h3>${d.final ? tag('green', 'Finalised ' + V.fmtDate(d.final.at)) : tag('tbc', 'Not finalised')}</div><div class="card-b small">${checks.map(([ok, t]) => `<div style="margin-bottom:6px">${ok ? '<span style="color:var(--fc-success)">✓</span>' : '<span style="color:var(--fc-warning)">!</span>'} ${esc(t)}</div>`).join('')}
      <div class="row" style="margin-top:14px">${ro() ? '' : (d.final ? `<button class="btn" data-act="mfReopen">Reopen schedule</button>` : `<button class="btn primary" data-act="mfFinalise">Finalise schedule</button>`)}<button class="btn" data-act="exportPlan">${ico('dl')}Download Excel</button>${ro() ? '' : `<button class="btn" data-act="publishSchedule">Publish schedule to customer</button>`}<button class="btn" data-act="mfStep" data-v="schedule">Back to the schedule</button></div>
      <div class="xs muted" style="margin-top:8px">Finalising records the schedule and the confirmed scope it was built from. If the MSA or scope changes later, the finalised schedule is not overwritten; you are warned and decide what to change.</div></div></div>`;
  }
  ACT.mfFinalise = async () => { const d = P(); const act = active(); const warn = act.some(s => !s.date) || act.some(s => s.proposed); if (warn && !(await confirmDialog('Finalise with open items', 'Some sessions have no date or are still marked Proposed. Finalise anyway?', 'Finalise'))) return; act.forEach(s => { if (s.proposed) s.proposed = false; }); d.final = { at: new Date().toISOString(), by: S.user.name, sig: scopeSig(), sessions: act.length }; F.changed('Workshop schedule finalised', act.length + ' sessions', { section: 'planner' }); };
  ACT.mfReopen = async () => { if (!(await confirmDialog('Reopen the schedule', 'Reopen the finalised schedule for changes?', 'Reopen'))) return; delete P().final; F.changed('Workshop schedule reopened', '', { section: 'planner' }); };

  // ---------- page ----------
  V.msaflow = {
    html() {
      I().load(['ctrcore', 'ctrfees', 'ctrlegal', 'ctrrates', 'ctrwatch', 'scope']); const st = step(); const sb = sub(st); let body;
      if (sb === 'know') body = embed(V.contract.html()); else if (sb === 'page') body = embed(V.scope.html()); else if (PLTAB[st + '/' + sb]) body = V.plannerPane(PLTAB[st + '/' + sb]);
      else body = ({ upload: s1, contract: s2, scope: s3, sessions: s4, schedule: s5, final: s6 })[st]();
      return `<div class="page-header"><div class="t"><h1>Contract</h1><p>Start from the MSA: confirm the contract and scope, plan the requirement sessions, and keep the Excel schedule and the sessions in step.</p></div></div>
        <div class="page-body">${bar()}${subBar(st)}${st !== 'final' && st !== 'upload' ? stale() : ''}${body}</div>`;
    },
    mount() { I().load(['ctrcore', 'ctrfees', 'ctrlegal', 'ctrrates', 'ctrwatch', 'scope']); const st = step(); if (PLTAB[st + '/' + sub(st)]) { S.ui.plTab = PLTAB[st + '/' + sub(st)]; V.plannerPaneMount(); } mountSchedule(); }
  };
})(typeof window !== 'undefined' ? window : globalThis);

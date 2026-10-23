/* Know Your Contract (Facilio enters it, the customer reads it) and Scope. No AI: every value is typed or pasted by the
   implementation team and shown exactly as saved. Money, legal and rate-card sections are separate records that the server only
   releases to the customer when the matching Customer Portal switch is on. Watch-outs are deterministic rules over what is saved. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items;
  const { tag, drawer, closeDrawer, toast, ico } = V;
  const cust = () => V.isCustomer(); const canEdit = () => !cust() && !S.readonly;
  const EVENTS = [['signing', 'Contract signed'], ['po', 'Purchase order received'], ['kickoff', 'Kick-off'], ['brd', 'BRD sign-off'], ['uathandover', 'UAT handover'], ['uat', 'UAT sign-off'], ['golive', 'Go-live'], ['termstart', 'Subscription start'], ['anniversary', 'Anniversary'], ['date', 'Fixed date']];
  const APPLIES = ['one-time', 'subscription', 'both'];
  const DOCTYPES = ['Order Form + MSA + SOW', 'EULA + SOW', 'Customer paper', 'Change order', 'Other'];

  // section = { id, kind (record), title, hint, fields:[{k,l,t,cols}] } ; t: text | long | date | num | select | lines (one item per line) | rows (a | b | c per line)
  const SECTIONS = [
    { id: 'facts', kind: 'ctrcore', title: 'Key facts', fields: [{ k: 'docType', l: 'Contract documents', t: 'select', o: DOCTYPES }, { k: 'signed', l: 'Signed date', t: 'date' }, { k: 'product', l: 'Product and edition', t: 'text' }, { k: 'sites', l: 'Sites or entities covered', t: 'long' }, { k: 'parties', l: 'Parties and signatories (role | name | signatory)', t: 'rows', cols: ['role', 'name', 'signatory'] }] },
    { id: 'term', kind: 'ctrcore', title: 'Term, renewal and exit', fields: [{ k: 'termMonths', l: 'Term (months)', t: 'num' }, { k: 'startRule', l: 'Term starts on', t: 'select', o: ['signing', 'kickoff', 'golive', 'date'] }, { k: 'startDate', l: 'Fixed start date (only if "date")', t: 'date' }, { k: 'startOffset', l: 'Offset (days after the start event)', t: 'num' }, { k: 'renewal', l: 'Renewal', t: 'long' }, { k: 'noticeDays', l: 'Notice period before renewal (days)', t: 'num' }, { k: 'exit', l: 'Termination and exit', t: 'long' }] },
    { id: 'sla', kind: 'ctrcore', title: 'Service levels', fields: [{ k: 'support', l: 'Support hours', t: 'long' }, { k: 'uptime', l: 'Uptime commitment', t: 'text' }, { k: 'credits', l: 'Service credits', t: 'long' }] },
    { id: 'lic', kind: 'ctrcore', title: 'Licences, entitlements and limits', fields: [{ k: 'licences', l: 'One per line', t: 'lines' }] },
    { id: 'accept', kind: 'ctrcore', title: 'Acceptance and warranty', fields: [{ k: 'acceptance', l: 'How acceptance works', t: 'long' }, { k: 'deemedDays', l: 'Deemed acceptance after (days)', t: 'num' }, { k: 'warranty', l: 'Warranty', t: 'long' }] },
    { id: 'change', kind: 'ctrcore', title: 'Change control', fields: [{ k: 'changeControl', l: 'Process and approver', t: 'long' }] },
    { id: 'data', kind: 'ctrcore', title: 'Data, security and IP', fields: [{ k: 'dataTerms', l: 'Data residency, ownership, retention, security, IP of customisations', t: 'long' }] },
    { id: 'obl', kind: 'ctrcore', title: 'Who must do what', fields: [{ k: 'obligations', l: 'side (Facilio or Customer) | what | by when (optional)', t: 'rows', cols: ['side', 'text', 'by'] }] },
    { id: 'amend', kind: 'ctrcore', title: 'Amendments and change orders', fields: [{ k: 'amendments', l: 'One per line', t: 'lines' }] },
    { id: 'clauses', kind: 'ctrcore', title: 'Clauses that matter during delivery', fields: [{ k: 'clauses', l: 'clause | what it means for delivery | page', t: 'rows', cols: ['title', 'meaning', 'page'] }] },
    { id: 'dates', kind: 'ctrcore', title: 'Other key dates', fields: [{ k: 'keyDates', l: 'label | date (YYYY-MM-DD)', t: 'rows', cols: ['label', 'date'] }] },
    { id: 'fees', kind: 'ctrfees', title: 'Fees and payment milestones', money: true, fields: [{ k: 'oneTime', l: 'One-time fees', t: 'text' }, { k: 'subscription', l: 'Subscription', t: 'text' }, { k: 'paymentDays', l: 'Payment terms (days)', t: 'num' }, { k: 'milestones', l: 'label | % | amount | applies (one-time, subscription, both) | event (signing, po, kickoff, brd, uathandover, uat, golive, termstart, anniversary, date) | fixed date', t: 'rows', cols: ['label', 'pct', 'amount', 'applies', 'event', 'date'] }, { k: 'escalation', l: 'Price escalation', t: 'text' }] },
    { id: 'legal', kind: 'ctrlegal', title: 'Liability, penalties and law', fields: [{ k: 'liability', l: 'Liability cap', t: 'long' }, { k: 'penalties', l: 'Penalties and service-level remedies', t: 'long' }, { k: 'law', l: 'Governing law and jurisdiction', t: 'text' }, { k: 'convenience', l: 'Termination for convenience', t: 'text' }] },
    { id: 'rates', kind: 'ctrrates', title: 'Rate card', fields: [{ k: 'rates', l: 'role | rate | unit (day, hour)', t: 'rows', cols: ['role', 'rate', 'unit'] }, { k: 'currency', l: 'Currency', t: 'text' }] }
  ];
  const rec = kind => I().get(kind, 'main') || {};
  const C = () => ({ core: rec('ctrcore'), fees: rec('ctrfees'), legal: rec('ctrlegal'), rates: rec('ctrrates') });
  V.contractData = C;
  const val = (sec, k) => rec(sec.kind)[k];
  const has = v => Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && String(v).trim() !== '';
  const num = v => { const n = Number(String(v === undefined || v === null ? '' : v).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; };

  // ---------- dates ----------
  const planRows = () => (V.planRows ? V.planRows() : []);
  const planDate = re => { const r = planRows().find(x => !x.top && re.test(x.t)); return r ? { s: r.s, e: r.e } : null; };
  function eventDate(ev, ms) {
    const c = C(); const core = c.core;
    if (ms && ms.date) return ms.date;
    if (ev === 'signing') return core.signed || '';
    if (ev === 'kickoff') return (planDate(/kick.?off/i) || {}).s || (S.project && S.project.startDate) || '';
    if (ev === 'brd') return (planDate(/brd.*sign|sign.*brd|brd/i) || {}).e || '';
    if (ev === 'uathandover') return (planDate(/uat.*(hand|start|begin)|handover/i) || {}).s || '';
    if (ev === 'uat') return (planDate(/uat.*sign|uat/i) || {}).e || '';
    if (ev === 'golive') return (planDate(/go.?live/i) || {}).s || '';
    if (ev === 'termstart') return termStart();
    if (ev === 'anniversary') { const t = termStart(); return t ? V.addDays(t, 365) : ''; }
    return '';
  }
  function termStart() { const k = C().core; if (k.startRule === 'date') return k.startDate || ''; const base = eventDate(k.startRule || 'signing'); return base ? V.addDays(base, num(k.startOffset)) : ''; }
  function termEnd() { const t = termStart(); const m = num(C().core.termMonths); if (!t || !m) return ''; const d = new Date(t + 'T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() + m); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); }
  const noticeDeadline = () => { const e = termEnd(); const n = num(C().core.noticeDays); return e && n ? V.addDays(e, -n) : ''; };
  V.contractDates = { termStart, termEnd, noticeDeadline, eventDate };

  function milestoneRows() {
    const f = C().fees; const days = num(f.paymentDays);
    return (f.milestones || []).map(m => { const d = eventDate(m.event, m); return Object.assign({}, m, { invoice: d, due: d && days ? V.addDays(d, days) : '', pctN: num(m.pct) }); });
  }
  V.contractEvents = (from, to) => milestoneRows().filter(m => m.invoice && m.invoice >= from && m.invoice <= to).map(m => ({ date: m.invoice, type: 'invoice', title: 'Invoice can be raised: ' + (m.label || 'milestone'), side: 'Facilio', view: 'contract' }));
  function keyDates() {
    const out = []; const core = C().core; const add = (id, label, date) => { if (date) out.push({ id, label, date }); };
    add('signed', 'Contract signed', core.signed); add('start', 'Term starts', termStart()); add('notice', 'Renewal notice deadline', noticeDeadline()); add('end', 'Term ends', termEnd());
    (core.keyDates || []).forEach((k, i) => add('k' + i, k.label, k.date)); milestoneRows().forEach((m, i) => { add('inv' + i, 'Invoice: ' + (m.label || ''), m.invoice); });
    return out.filter(x => x.date).sort((a, b) => a.date.localeCompare(b.date));
  }
  V.contractKeyDates = within => { const today = V.today(); const hide = cust() && !V.custShow('fees'); return keyDates().filter(k => !(hide && /^Invoice:/.test(k.label))).filter(k => { const d = V.daysBetween(today, k.date); return d <= within && d >= -7; }).map(k => ({ id: k.id, text: `${k.label}: ${V.fmtDate(k.date)}`, late: k.date < today })); };

  // ---------- watch-outs (rules only) ----------
  function watchouts() {
    const { core, fees, legal, rates } = C(); const out = []; const add = (lvl, t) => out.push({ lvl, t }); const ms = milestoneRows();
    ['one-time', 'subscription'].forEach(t => { const l = ms.filter(m => m.applies === t || m.applies === 'both'); if (l.length) { const sum = l.reduce((a, m) => a + m.pctN, 0); if (Math.round(sum) !== 100) add('High', `Payment milestones for ${t} fees add up to ${Math.round(sum * 100) / 100}%, not 100%`); } });
    if (ms.some(m => ['uat', 'golive'].includes(m.event))) add('Medium', 'Some payments depend on UAT sign-off or go-live, so a delay moves the invoice date');
    if (num(fees.paymentDays) > 45) add('Medium', `Payment terms are ${num(fees.paymentDays)} days`);
    const nd = noticeDeadline(); if (nd) { const d = V.daysBetween(V.today(), nd); if (d <= 90 && d >= 0) add('High', `Renewal notice deadline is ${V.fmtDate(nd)} (${d} days)`); }
    if (has(core.termMonths) && !has(core.noticeDays)) add('Medium', 'No notice period recorded for renewal or exit');
    if (!(rates.rates || []).length) add('Low', 'No rate card recorded, so change requests cannot be priced from the contract');
    if (/uncapped|unlimited/i.test(legal.liability || '')) add('High', 'Liability looks uncapped');
    if (has(legal.penalties)) add('High', 'The contract has penalty or service-remedy clauses');
    if (has(legal.convenience) && !/^(no|none|not)/i.test(legal.convenience.trim())) add('Medium', 'Termination for convenience is allowed');
    if (core.docType === 'Customer paper') add('High', 'The contract is on the customer\'s paper, not Facilio standard terms');
    if (has(fees.subscription) && !has(fees.escalation)) add('Low', 'No price escalation recorded');
    if (has(core.acceptance) && !has(core.deemedAcceptance) && !has(core.deemedDays)) add('Low', 'No deemed-acceptance period recorded');
    (rec('ctrwatch').items || []).forEach(x => add(x.lvl || 'Medium', x.text));
    return out;
  }
  V.contractWatchouts = watchouts;
  const missing = () => SECTIONS.filter(s => s.kind === 'ctrcore' || s.id === 'fees').filter(s => !s.fields.some(f => has(val(s, f.k)))).map(s => s.title);

  // ---------- reading view ----------
  const money = v => (v === undefined || v === '' ? '' : esc(String(v)));
  function fieldHtml(sec, f) {
    const v = val(sec, f.k); if (!has(v)) return '';
    if (f.t === 'lines') return `<div class="kc-f"><div class="kc-l">${esc(f.l.replace(/ \(.*/, ''))}</div><ul>${v.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
    if (f.t === 'rows') { if (f.k === 'milestones') return ''; const head = f.cols; return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${v.map(r => `<tr>${head.map(h => `<td>${esc(r[h] === undefined ? '' : r[h])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; }
    const t = f.t === 'date' ? V.fmtDate(v) : v;
    return `<div class="kc-f"><div class="kc-l">${esc(f.l.replace(/ \(.*/, ''))}</div><div>${esc(String(t)).replace(/\n/g, '<br>')}</div></div>`;
  }
  function milestonesHtml() {
    const ms = milestoneRows(); if (!ms.length) return '';
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Milestone</th><th class="num">%</th><th>Amount</th><th>Applies to</th><th>Triggered by</th><th>Invoice date</th><th>Due</th></tr></thead><tbody>${ms.map(m => `<tr><td>${esc(m.label || '')}</td><td class="num">${esc(m.pct || '')}</td><td>${money(m.amount)}</td><td>${esc(m.applies || '')}</td><td>${esc((EVENTS.find(e => e[0] === m.event) || [0, m.event || ''])[1])}</td><td>${m.invoice ? V.fmtDate(m.invoice) : '<span class="muted">follows the plan</span>'}</td><td>${m.due ? V.fmtDate(m.due) : ''}</td></tr>`).join('')}</tbody></table></div><div class="xs muted" style="margin-top:6px">Invoice dates follow the project plan, so they move if a milestone moves.</div>`;
  }
  function secCard(sec) {
    const body = sec.fields.map(f => fieldHtml(sec, f)).join('') + (sec.id === 'fees' ? milestonesHtml() : '');
    if (!body.trim()) return canEdit() ? `<div class="card kc-empty"><div class="card-h"><h3>${esc(sec.title)}</h3><button class="btn sm" data-act="kcEdit" data-s="${sec.id}">${ico('edit')}Add</button></div><div class="card-b small muted">Nothing recorded yet.</div></div>` : '';
    return `<div class="card" style="margin-bottom:14px"><div class="card-h"><h3>${esc(sec.title)}</h3>${sec.kind !== 'ctrcore' && !cust() ? tag('tbc', 'Hidden from customer unless switched on') : ''}${canEdit() ? `<button class="btn sm" data-act="kcEdit" data-s="${sec.id}">${ico('edit')}Edit</button>` : ''}</div><div class="card-b">${body}</div></div>`;
  }
  V.contract = {
    html() {
      I().load(['ctrcore', 'ctrfees', 'ctrlegal', 'ctrrates', 'ctrwatch', 'action']); if (!I().ready(['ctrcore'])) return V.loading ? V.loading() : '<div class="muted">Loading…</div>';
      const core = C().core; const wo = cust() ? [] : watchouts(); const kd = keyDates().filter(k => !(cust() && !V.custShow('fees') && /^Invoice:/.test(k.label))); const nd = noticeDeadline(); const today = V.today();
      const hero = [['Signed', core.signed ? V.fmtDate(core.signed) : '—'], ['Term', core.termMonths ? core.termMonths + ' months' : '—'], ['Term starts', termStart() ? V.fmtDate(termStart()) : '—'], ['Renewal notice by', nd ? V.fmtDate(nd) : '—']];
      const secs = SECTIONS.filter(s => !(cust() && !I().ready([s.kind]))).map(secCard).join('');
      return `<div class="page-header"><div class="t"><h1>Know Your Contract</h1><p>${cust() ? 'The commitments that shape this project, in plain terms. Ask your project manager if anything looks wrong.' : 'Enter the contract once; the customer sees a clean, read-only version. Switch money, legal and rate-card sections on in Customer Portal.'}</p></div></div>
      <div class="page-body"><div class="grid g4" style="margin-bottom:14px">${hero.map(h => `<div class="card"><div class="card-b"><div class="xs muted">${h[0]}</div><b>${esc(h[1])}</b></div></div>`).join('')}</div>
      ${!cust() ? `<div class="card" style="margin-bottom:14px"><div class="card-h"><h3>Contract watch-outs</h3><span class="small muted">Facilio only</span>${canEdit() ? `<button class="btn sm" data-act="kcWatch">${ico('plus')}Add note</button>` : ''}</div><div class="card-b">${wo.length ? wo.map(w => `<div class="ev-row">${tag(w.lvl === 'High' ? 'danger' : w.lvl === 'Medium' ? 'tbc' : 'low', w.lvl)} <span>${esc(w.t)}</span></div>`).join('') : '<span class="small muted">Nothing flagged by the rules. Fill in the sections below and this list updates.</span>'}${missing().length ? `<div class="small muted" style="margin-top:10px"><b>Not recorded yet:</b> ${missing().map(esc).join(', ')}</div>` : ''}</div></div>` : ''}
      ${kd.length ? `<div class="card" style="margin-bottom:14px"><div class="card-h"><h3>Key dates</h3></div><div class="card-b small">${kd.map(k => `<div class="ev-row"><span class="ev-d">${V.fmtDate(k.date)}</span><span class="ev-t">${esc(k.label)}</span>${k.date < today ? tag('low', 'Past') : ''}</div>`).join('')}</div></div>` : ''}
      ${secs || '<div class="empty">Your project manager has not published the contract summary yet.</div>'}</div>`;
    }, mount() { }
  };
  function fieldInput(sec, f) {
    const v = val(sec, f.k); const id = `kc_${f.k}`; let ctl;
    if (f.t === 'long') ctl = `<textarea id="${id}" rows="3" maxlength="4000">${esc(v || '')}</textarea>`;
    else if (f.t === 'lines') ctl = `<textarea id="${id}" rows="4" maxlength="4000" placeholder="One per line">${esc((v || []).join('\n'))}</textarea>`;
    else if (f.t === 'rows') ctl = `<textarea id="${id}" rows="5" maxlength="6000" placeholder="${esc(f.cols.join(' | '))}">${esc((v || []).map(r => f.cols.map(c => r[c] === undefined ? '' : r[c]).join(' | ')).join('\n'))}</textarea>`;
    else if (f.t === 'select') ctl = `<select id="${id}"><option value=""></option>${f.o.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    else ctl = `<input type="${f.t === 'date' ? 'date' : f.t === 'num' ? 'number' : 'text'}" id="${id}" value="${esc(v === undefined ? '' : v)}" maxlength="400">`;
    return `<div style="margin-bottom:12px"><label class="f">${esc(f.l)}</label>${ctl}</div>`;
  }
  ACT.kcEdit = a => { const sec = SECTIONS.find(s => s.id === a.getAttribute('data-s')); drawer('Edit — ' + sec.title, sec.fields.map(f => fieldInput(sec, f)).join('') + (sec.kind !== 'ctrcore' ? '<div class="notice"><span>This section is only released to the customer when its Customer Portal switch is on.</span></div>' : ''), `<button class="btn" data-act="closeDrawer">Cancel</button><span class="spacer"></span><button class="btn primary" data-act="kcSave" data-s="${sec.id}">Save</button>`, { wide: true }); };
  ACT.kcSave = a => V.busy(a, async () => {
    const sec = SECTIONS.find(s => s.id === a.getAttribute('data-s')); const data = Object.assign({}, rec(sec.kind)); delete data.hist; let bad = '';
    sec.fields.forEach(f => { const el = document.getElementById('kc_' + f.k); let v = el.value;
      if (f.t === 'lines') v = v.split('\n').map(x => x.trim()).filter(Boolean); else if (f.t === 'rows') v = v.split('\n').map(x => x.trim()).filter(Boolean).map(l => { const p = l.split('|').map(x => x.trim()); const o = {}; f.cols.forEach((c, i) => { o[c] = p[i] || ''; }); return o; });
      else if (f.t === 'num') v = v === '' ? '' : Number(v); else v = v.trim();
      if (f.k === 'milestones') (v || []).forEach(m => { if (m.event && !EVENTS.some(e => e[0] === m.event)) bad = `"${m.event}" is not a known trigger. Use: ${EVENTS.map(e => e[0]).join(', ')}`; if (m.applies && !APPLIES.includes(m.applies)) bad = `"${m.applies}" is not valid. Use: ${APPLIES.join(', ')}`; if (m.date && !/^\d{4}-\d{2}-\d{2}$/.test(m.date)) bad = `Use YYYY-MM-DD for dates (${m.date})`; });
      if (f.k === 'keyDates') (v || []).forEach(m => { if (m.date && !/^\d{4}-\d{2}-\d{2}$/.test(m.date)) bad = `Use YYYY-MM-DD for dates (${m.date})`; });
      data[f.k] = v; });
    if (bad) { toast(bad, 6000, true); return; }
    await I().put(sec.kind, 'main', data); closeDrawer(); toast('Saved');
  });
  ACT.kcWatch = () => drawer('Add watch-out', `<label class="f">Level</label><select id="kw_l"><option>High</option><option selected>Medium</option><option>Low</option></select><label class="f" style="margin-top:10px">What should the team watch for?</label><textarea id="kw_t" rows="3" maxlength="400"></textarea>${((rec('ctrwatch').items) || []).map((x, i) => `<div class="ev-row">${esc(x.lvl)} · ${esc(x.text)} <button class="btn sm danger" data-act="kcWatchDel" data-i="${i}">Remove</button></div>`).join('')}`, `<button class="btn" data-act="closeDrawer">Close</button><span class="spacer"></span><button class="btn primary" data-act="kcWatchSave">Add</button>`);
  ACT.kcWatchSave = a => V.busy(a, async () => { const t = document.getElementById('kw_t').value.trim(); if (!t) { toast('Enter the watch-out'); return; } const r = Object.assign({}, rec('ctrwatch')); delete r.hist; r.items = (r.items || []).concat([{ lvl: document.getElementById('kw_l').value, text: t }]); await I().put('ctrwatch', 'main', r); closeDrawer(); });
  ACT.kcWatchDel = a => V.busy(a, async () => { const r = Object.assign({}, rec('ctrwatch')); delete r.hist; r.items = (r.items || []).filter((x, i) => i !== Number(a.getAttribute('data-i'))); await I().put('ctrwatch', 'main', r); closeDrawer(); });
  // rate card lookup for change requests: { role, rate, unit } or null
  V.rateFor = role => { const r = (C().rates.rates || []).find(x => (x.role || '').toLowerCase() === String(role || '').toLowerCase()); return r ? { rate: num(r.rate), unit: r.unit || 'day', currency: C().rates.currency || '' } : null; };

  // ---------- Scope ----------
  const SCOPE = [['summary', 'Summary', 'long'], ['inclusions', 'In scope', 'lines'], ['exclusions', 'Out of scope', 'lines'], ['integrations', 'Integrations (say if in scope)', 'lines'], ['migration', 'Data migration', 'lines'], ['training', 'Training', 'lines'], ['deliverables', 'Deliverables', 'lines'], ['assumptions', 'Assumptions', 'lines'], ['responsibilities', 'Customer responsibilities', 'lines']];
  const sc = () => I().get('scope', 'main') || {};
  V.scope = {
    html() {
      I().load(['scope', 'ctrcore']); if (!I().ready(['scope'])) return V.loading ? V.loading() : '<div class="muted">Loading…</div>'; const d = sc(); const mods = F.allModules().filter(m => m.inScope && !(V.controls().hiddenModules || []).includes(m.name)).sort((a, b) => a.label.localeCompare(b.label));
      const sow = (C().core.sowModules || []);
      return `<div class="page-header"><div class="t"><h1>Scope</h1><p>What is included, what is not, and what we are assuming.</p></div>${canEdit() ? `<button class="btn" data-act="scEdit">${ico('edit')}Edit scope</button>` : ''}</div><div class="page-body">
      <div class="card" style="margin-bottom:14px"><div class="card-h"><h3>Modules in scope (${mods.length})</h3></div><div class="card-b">${mods.map(m => `<span class="chip">${esc(m.label)}</span>`).join(' ') || '<span class="muted small">No modules are marked in scope yet.</span>'}</div></div>
      ${SCOPE.map(([k, l, t]) => { const v = d[k]; if (!has(v)) return ''; return `<div class="card" style="margin-bottom:14px"><div class="card-h"><h3>${l}</h3></div><div class="card-b">${t === 'lines' ? `<ul>${v.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : esc(v).replace(/\n/g, '<br>')}</div></div>`; }).join('') || `<div class="empty">${canEdit() ? 'Nothing recorded yet. Press Edit scope.' : 'Your project manager has not published the scope yet.'}</div>`}
      ${sow.length ? `<div class="card"><div class="card-h"><h3>Statement of work, by module</h3></div><div class="card-b">${sow.map(m => `<div style="margin-bottom:10px"><b>${esc(m.name)}</b>${m.ootb && m.ootb.length ? `<div class="xs muted">Out of the box</div><ul>${m.ootb.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}${m.custom && m.custom.length ? `<div class="xs muted">Custom use cases</div><ul>${m.custom.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>`).join('')}</div></div>` : ''}</div>`;
    }, mount() { }
  };
  ACT.scEdit = () => { const d = sc(); drawer('Edit scope', SCOPE.map(([k, l, t]) => `<div style="margin-bottom:12px"><label class="f">${l}</label><textarea id="sc_${k}" rows="${t === 'long' ? 3 : 4}" maxlength="5000" ${t === 'lines' ? 'placeholder="One per line"' : ''}>${esc(t === 'lines' ? (d[k] || []).join('\n') : d[k] || '')}</textarea></div>`).join('')
    + `<div style="margin-bottom:12px"><label class="f">Statement of work slices (one module per line: Module | out-of-the-box items separated by ; | custom items separated by ;)</label><textarea id="sc_sow" rows="5" maxlength="6000">${esc(((C().core.sowModules) || []).map(m => [m.name, (m.ootb || []).join('; '), (m.custom || []).join('; ')].join(' | ')).join('\n'))}</textarea></div>`, `<button class="btn" data-act="closeDrawer">Cancel</button><span class="spacer"></span><button class="btn primary" data-act="scSave">Save</button>`, { wide: true }); };
  ACT.scSave = a => V.busy(a, async () => {
    const d = Object.assign({}, sc()); delete d.hist; SCOPE.forEach(([k, , t]) => { const v = document.getElementById('sc_' + k).value; d[k] = t === 'lines' ? v.split('\n').map(x => x.trim()).filter(Boolean) : v.trim(); });
    await I().put('scope', 'main', d, { silent: true });
    const core = Object.assign({}, rec('ctrcore')); delete core.hist; core.sowModules = document.getElementById('sc_sow').value.split('\n').map(x => x.trim()).filter(Boolean).map(l => { const p = l.split('|').map(x => x.trim()); return { name: p[0], ootb: (p[1] || '').split(';').map(x => x.trim()).filter(Boolean), custom: (p[2] || '').split(';').map(x => x.trim()).filter(Boolean) }; }).filter(m => m.name);
    await I().put('ctrcore', 'main', core, { silent: true }); closeDrawer(); V.render(); toast('Saved');
  });
})(typeof window !== 'undefined' ? window : globalThis);

/* Data Onboarding: Facilio's standard data templates for the modules in scope (master data only, never transactions),
   an Excel workbook with dropdowns for lists and lookups, a checker that validates a filled workbook in the browser,
   a per-sheet tracker (customer: Not started / Filling / Sent; Facilio: Needs fixes / Validated / Loaded), files shared
   for modules without a template, and an animated walkthrough per sheet. Template data: public/onboarding/templates.json
   (ported from the Facilio Implementation Studio). The customer sees the plan Facilio publishes. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items; const API = root.FWBApi;
  const { tag, drawer, closeDrawer, toast, ico, confirmDialog, loading } = V;
  const cust = () => V.isCustomer(); const fac = () => !cust() && !S.readonly;
  const arr = x => (Array.isArray(x) ? x : []);
  let T = null, TL = null;
  const rx = o => (o && o.$re !== undefined ? new RegExp(o.$re, o.flags) : null);
  function loadT() { if (T || TL) return TL; TL = fetch('onboarding/templates.json').then(r => r.json()).then(j => { j.TPLS.forEach(t => { t.cat = rx(t.cat); t.re = rx(t.re); }); j.NO_TPL.forEach(t => { t.cat = rx(t.cat); t.re = rx(t.re); }); Object.keys(j.DUE_RE).forEach(k => { j.DUE_RE[k] = rx(j.DUE_RE[k]); }); j.ENT = Object.fromEntries(j.ONB.RULES.entities.map(e => [e.key, e])); T = j; V.render(); }); return TL; }
  V.onbTemplates = () => T;

  // Facilio module name → Studio catalogue key (used by the template rules)
  const CAT = [[/^(site|building|floor|space|basespace|portfolio)$/i, 'portfolio'], [/^(people|employee|users?)$/i, 'users'], [/^asset/i, 'asset'], [/^(plannedmaintenance|preventivemaintenance|jobplan|pmtrigger)/i, 'ppm'], [/^(item|tool|storeroom|inventory|itemtypes?|tooltypes?|purchaserequest|purchaseorder|receivable|transferrequest|inventoryrequest)/i, 'inv'], [/^tenant/i, 'tenant'], [/^(vendors?|vendorcontact|vendorquotes|requestforquotation)/i, 'vendor'], [/^serviceRequest$/i, 'helpdesk'], [/^inspection/i, 'insp'], [/^workorder$/i, 'wo'], [/^(sla|slapolicy)/i, 'sla'], [/^(client|clientcontact)/i, 'client'], [/^contracts?$/i, 'contract'], [/^workpermit/i, 'permit'], [/^(budget|chartofaccount)/i, 'budget'], [/^(facilitybooking|spacebooking)/i, 'workplace'], [/^(invitevisitor|visitorlog)/i, 'visitor'], [/^(attendance|shift)/i, 'attendance'], [/^(meter|energy)/i, 'energy']];
  const catOf = name => (CAT.find(([re]) => re.test(name)) || [, 'custom'])[1];
  const inScope = () => F.allModules().filter(m => m.inScope && !(V.controls().hiddenModules || []).includes(m.name)).map(m => ({ key: m.name, name: m.label, short: m.label, catalog: catOf(m.name) }));
  const hits = t => inScope().filter(m => (t.cat && t.cat.test(m.catalog)) || (t.re && t.re.test(`${m.key} ${m.name}`)));
  const sheetOf = k => T.ENT[k].sheet[0];

  // ---------- the plan: which sheets, files and asks apply ----------
  function buildPlan() {
    const tpls = T.TPLS.filter(t => t.always || hits(t).length); const files = T.NO_TPL.filter(t => hits(t).length); const sheets = [];
    tpls.forEach(t => t.ents.forEach(k => { const sh = sheetOf(k); let s = sheets.find(x => x.sheet === sh); if (!s) { s = { sheet: sh, ents: [], tpl: t.id, tplName: t.name, crit: t.crit, built: !!t.built, why: t.always ? ['Every project'] : hits(t).map(m => m.short) }; sheets.push(s); } s.ents.push(k); }));
    const rows = V.planRows ? V.planRows().filter(r => !r.top) : [];
    sheets.forEach(s => { const t = T.TPLS.find(x => x.id === s.tpl); const re = T.DUE_RE[s.sheet] || t.re || new RegExp(s.sheet.split(' ')[0], 'i'); const tre = new RegExp(t.name.split(' ')[0], 'i');
      const hit = rows.filter(r => /submi|data|template|share|provid|upload|onboard/i.test(r.t) && (re.test(r.t) || tre.test(r.t))).sort((a, b) => a.e.localeCompare(b.e))[0] || rows.filter(r => /onboard|data (collection|submission|templates?)/i.test(r.t)).sort((a, b) => a.e.localeCompare(b.e))[0];
      s.due = hit ? hit.e : null; s.dueTask = hit ? hit.t : ''; });
    const used = new Set([...tpls.flatMap(hits), ...files.flatMap(hits)].map(m => m.key));
    const master = inScope().map(m => { const mm = T.MASTER_MAP[m.catalog] || T.MASTER_MAP.custom; const ids = T.TPLS.filter(t => hits(t).some(x => x.key === m.key)).map(t => t.id); return { mod: m.short, need: mm[0], skip: mm[1], sheets: sheets.filter(s => ids.includes(s.tpl)).map(s => s.sheet) }; });
    return { sheets, files: files.map(f => ({ id: f.id, name: f.name, ask: f.ask, mods: hits(f).map(m => m.short) })), tpls: tpls.map(t => ({ id: t.id, name: t.name, crit: t.crit, need: t.need, built: !!t.built })), auto: tpls.some(t => t.id === 'asset') ? ['Asset Category Master'] : [], none: inScope().filter(m => !used.has(m.key)).map(m => m.short), master, at: new Date().toISOString() };
  }
  const plan = () => (cust() ? F.doc('onboarding_published') : (T ? buildPlan() : null));
  V.onboardingPlan = plan;
  // Sheet names that apply to one module, in plan order. Sheets every project gets are not module-specific, so they are left out.
  V.onboardingSheetsFor = name => { try { if (!cust() && !T) { loadT(); return []; } const m = F.allModules().find(x => x.name === name); if (!m) return []; const p = plan(); if (!p || !p.sheets) return []; return p.sheets.filter(sh => (sh.why || []).includes(m.label) && !(sh.why || []).includes('Every project')).map(sh => sh.sheet); } catch (e) { return []; } };

  // ---------- columns, rules, mistakes ----------
  const colLetter = n => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
  const lookupOf = (ent, col) => ((T.LOOKUPS[ent] || {})[col]) || null;
  function colsOf(key) { const e = T.ENT[key], doc = T.ONB.COLDOC[key] || {}; return Object.entries(e.columns).map(([k, c]) => ({ k, h: c.h[0], aliases: c.h, req: !!c.req, type: c.type || '', list: c.list ? T.ONB.RULES.lists[c.list] : null, listKey: c.list || '', sheetList: c.sheetList || '', lookup: lookupOf(key, k), long: !!c.long, min: c.min, allowNeg: !!c.allowNegative, doc: (doc[k] || [])[0] || '', ex: (doc[k] || [])[1] || '' })); }
  function expectOf(c, ent) {
    const parts = [c.req ? 'Required.' : 'Optional.'];
    if (c.lookup && T.ENT[c.lookup[0]]) parts.push(`Must match the ${sheetOf(c.lookup[0])} sheet's ${T.ENT[c.lookup[0]].columns[c.lookup[1]].h[0]} exactly.`);
    if (c.list) parts.push('Pick from the list: ' + c.list.slice(0, 6).join(', ') + (c.list.length > 6 ? '…' : '') + '.');
    if (c.sheetList) parts.push('Pick from the ' + ((T.ONB.RULES.sheetLists[c.sheetList] || {}).label || c.sheetList) + '.');
    const ty = { date: 'A date (DD/MM/YYYY).', number: 'A number, digits only' + (c.min === 0 ? ', 0 or more' : '') + '.', integer: 'A whole number' + (c.allowNeg ? '' : ', 0 or more') + '.', email: 'An email address.', phone: 'A phone number with country code.', bool: 'Yes or No.', time: 'A time (HH:MM).', lat: 'Latitude, -90 to 90.', lng: 'Longitude, -180 to 180.' }[c.type]; if (ty) parts.push(ty);
    const u = arr(T.ENT[ent].unique).find(x => x.cols.length === 1 && x.cols[0] === c.k); if (u) parts.push('No duplicates.'); if (c.long) parts.push('Longer text is fine.');
    return parts.join(' ');
  }
  function mistakesOf(s) {
    const out = []; s.ents.forEach(k => { const e = T.ENT[k]; colsOf(k).forEach(c => {
      if (c.lookup && T.ENT[c.lookup[0]]) out.push(`${c.h}: must match the ${sheetOf(c.lookup[0])} sheet's ${T.ENT[c.lookup[0]].columns[c.lookup[1]].h[0]} exactly. "ABC Site" and "ABC site" or "ABC Site " (extra space) will not import.`);
      if (c.list) out.push(`${c.h}: pick from the dropdown. Typing your own value fails the import.`);
      if (c.type === 'number' || c.type === 'integer') out.push(`${c.h}: digits only. Write 24, not "24 pcs" or "AED 24".`);
      if (c.type === 'date') out.push(`${c.h}: a real date, not text like "Q1 2026".`); });
      arr(e.unique).forEach(u => { if (u.cols.length === 1 && e.columns[u.cols[0]]) out.push(`${e.columns[u.cols[0]].h[0]}: no duplicates on this sheet.`); }); });
    out.push('Do not rename, reorder or delete the header row. Add custom fields as new columns at the end.');
    return [...new Set(out)].slice(0, 8);
  }

  // ---------- page ----------
  const OB_ST = { todo: ['low', 'Not started'], filling: ['blue', 'Filling'], sent: ['tbc', 'Sent to Facilio'], fix: ['red', 'Needs fixes'], validated: ['green', 'Validated'], loaded: ['green', 'Loaded'] }; const CUST_OB = ['todo', 'filling', 'sent'];
  const stOf = sheet => I().get('onb', F.slug(sheet)) || { sheet, status: 'todo' };
  const FOCUS = () => { try { return new URLSearchParams(location.search).get('focus') === 'excel'; } catch (e) { return false; } };
  const tabPick = () => { if (FOCUS()) return (S.ui.onbTab = 'excel'); if (S.ui.onbTab) return S.ui.onbTab; try { S.ui.onbTab = sessionStorage.getItem('fwb_onbtab_' + (S.project && S.project.id)) || 'plan'; } catch (e) { S.ui.onbTab = 'plan'; } return S.ui.onbTab; };
  const tabsHtml = t => `<div class="ob-tabs" role="tablist"><button role="tab" aria-selected="${t === 'plan'}" class="${t === 'plan' ? 'on' : ''}" data-act="onbTab" data-v="plan">Data Onboarding</button><button role="tab" aria-selected="${t === 'excel'}" class="${t === 'excel' ? 'on' : ''}" data-act="onbTab" data-v="excel">Excel Data Onboarding</button></div>`;
  ACT.onbTab = a => { S.ui.onbTab = a.getAttribute('data-v'); try { sessionStorage.setItem('fwb_onbtab_' + S.project.id, S.ui.onbTab); } catch (e) { } V.render(); };
  // ---------- Excel Data Onboarding: the standalone onboarding workspace, served from this site and shown in a frame ----------
  const wsKey = pid => 'facilio-onboarding-workspace-v2:' + pid; const dirtyKey = pid => 'facilio-onboarding-dirty:' + pid;
  function prepareWs() { const pid = S.project.id; if (S.ui.onbWsFor === pid) return; S.ui.onbWsFor = pid; const rec = I().get('onbws', 'main');
    try { if (!localStorage.getItem(dirtyKey(pid)) && rec && rec.json) localStorage.setItem(wsKey(pid), rec.json); } catch (e) { } }
  root.FWBOnbSave = async (pid, raw) => { if (!S.project || S.project.id !== pid || S.readonly) return true;
    try { const st = JSON.parse(raw); const rows = {}; Object.entries(st.tabs || {}).forEach(([k, v]) => { if (k === 'cat') return; const n = (v || []).filter(r => r && r.some(x => x !== '' && x != null)).length; if (n) rows[k] = n; });
      await I().put('onbws', 'main', { json: raw, rows, stage: 'prepared' }, { silent: true }); try { localStorage.removeItem(dirtyKey(pid)); } catch (e) { } return true; } catch (e) { return false; } };
  function excelBody() {
    if (!I().ready(['onbws'])) return '<div class="page-body"><div class="empty">Loading…</div></div>'; prepareWs(); const rec = I().get('onbws', 'main');
    const rows = rec ? Object.values(rec.rows || {}).reduce((a, b) => a + b, 0) : 0;
    return `<div class="ob-xl-note">${FOCUS() ? '' : `<button class="btn sm" style="float:right;margin:-6px 0 0 12px" data-act="onbPop">${ico('plus')}Open in new tab</button>`}Your work is saved to this project as you go${rec ? ` · last saved ${esc(new Date(rec.savedAt || rec._at).toLocaleString())}${rows ? ' · ' + rows + ' row(s) prepared' : ''}` : ''}. It is prepared data: nothing is imported into Facilio until the implementation team loads it.</div><div class="ob-frame"><iframe id="onbFrame" title="Excel Data Onboarding" src="onboarding-tool/index.html?p=${encodeURIComponent(S.project.id)}"></iframe></div>`;
  }
  V.onboarding = { html() {
    const t = tabPick(); if (t === 'excel' && FOCUS()) return `<div class="ob-focus-page">${excelBody()}</div>`;
    if (t === 'excel') return `<div class="page-header"><div class="t"><h1>Data Onboarding</h1></div></div><div class="page-body" style="padding-top:0">${tabsHtml(t)}${excelBody()}</div>`;
    return planHtml(t); },
  mount() { loadT(); I().load(['onb', 'onbsub', 'onbfile', 'onbws']); } };
  function planHtml(t) {
    loadT(); I().load(['onb', 'onbsub', 'onbfile', 'onbws']); const p = plan(); const ctl = V.controls();
    const head = `<div class="page-header"><div class="t"><h1>Data Onboarding</h1><p>${esc(T ? T.MASTER_LEAD : 'Facilio onboards master data only.')}</p></div><div class="row">${fac() ? `<span class="small muted">Customer: ${ctl.tabs.onboarding ? tag('green', 'Shown') : tag('low', 'Hidden')}</span><button class="btn" data-act="onbPublish">${ctl.tabs.onboarding ? 'Update customer view' : 'Publish to customer'}</button>` : ''}${p && p.sheets && p.sheets.length ? `<button class="btn" data-act="onbWalk">${ico('play')}Walkthrough</button><button class="btn primary" data-act="onbDownload">${ico('dl')}Download workbook</button>` : ''}</div></div>`;
    if (!T || !I().ready(['onb', 'onbsub', 'onbfile'])) return head + `<div class="page-body">${tabsHtml(t)}<div class="empty">Loading templates…</div></div>`;
    if (!p || !p.sheets) return head + `<div class="page-body">${tabsHtml(t)}<div class="card empty"><h3>${cust() ? 'Not published yet' : 'No modules in scope'}</h3><p>${cust() ? 'Your implementation team will publish the data templates here.' : 'Mark modules in scope in System Modules to see the templates they need.'}</p></div></div>`;
    const sts = p.sheets.map(s => stOf(s.sheet).status); const sent = sts.filter(x => ['sent', 'validated', 'loaded'].includes(x)).length; const nextDue = p.sheets.filter(s => s.due && !['sent', 'validated', 'loaded'].includes(stOf(s.sheet).status)).sort((a, b) => a.due.localeCompare(b.due))[0];
    const sel = S.ui.onbSel && (p.sheets.some(s => s.sheet === S.ui.onbSel) || S.ui.onbSel.startsWith('file:') || S.ui.onbSel === '_report' || S.ui.onbSel === '_master') ? S.ui.onbSel : '_master';
    const facts = `<div class="grid g4" style="margin-bottom:14px"><div class="card stat"><div class="v">${p.sheets.length}</div><div class="l">Sheets · ${p.tpls.length} templates</div></div><div class="card stat"><div class="v">${sent} / ${p.sheets.length}</div><div class="l">Sent to Facilio</div></div><div class="card stat"><div class="v">${sts.filter(x => x === 'loaded').length}</div><div class="l">Loaded</div></div><div class="card stat"><div class="v">${nextDue ? V.fmtDate(nextDue.due) : '—'}</div><div class="l">Next due${nextDue ? ' · ' + esc(nextDue.sheet) : ''}</div></div></div>
      <div class="ob-steps"><div><b>1 · Watch</b><span>Play the walkthrough for a sheet to see how to fill it.</span></div><div><b>2 · Fill</b><span>Download the workbook and fill the sheets. Lists and lookups are dropdowns.</span></div><div><b>3 · Check and send</b><span>Upload the filled workbook here. It is checked in your browser; send it when it is clean.</span></div></div>`;
    const navItem = (id, label, sub, pill) => `<button class="ob-nav-i${sel === id ? ' on' : ''}" data-act="onbSel" data-v="${esc(id)}"><span><b>${esc(label)}</b>${sub ? `<small>${sub}</small>` : ''}</span>${pill || ''}</button>`;
    const nav = `<nav class="ob-nav">${navItem('_master', 'What we need from you', '', '')}${navItem('_report', 'Check a filled workbook', '', I().list('onbsub').length ? tag('low', String(I().list('onbsub').length)) : '')}
      ${p.tpls.map(t => `<div class="ob-nav-g">${esc(t.name)} ${tag(t.crit === 'Critical' ? 'red' : t.crit === 'High' ? 'tbc' : 'low', t.crit)}</div>${p.sheets.filter(s => s.tpl === t.id).map(s => { const st = stOf(s.sheet); const o = OB_ST[st.status] || OB_ST.todo; const late = s.due && s.due < V.today() && !['sent', 'validated', 'loaded'].includes(st.status); return navItem(s.sheet, s.sheet, s.due ? `<span ${late ? 'class="late"' : ''}>Due ${V.fmtDate(s.due)}</span>` : '', tag(o[0], o[1])); }).join('')}`).join('')}
      ${p.files.length ? `<div class="ob-nav-g">Files to share</div>${p.files.map(f => { const n = I().list('onbfile').filter(x => x.tpl === f.id).length; return navItem('file:' + f.id, f.name, '', n ? tag('green', n + ' shared') : tag('low', 'To share')); }).join('')}` : ''}</nav>`;
    const body = sel === '_master' ? masterPane(p) : sel === '_report' ? reportPane() : sel.startsWith('file:') ? filePane(p.files.find(f => 'file:' + f.id === sel)) : sheetPane(p.sheets.find(s => s.sheet === sel));
    return head + `<div class="page-body">${tabsHtml(t)}${facts}<div class="ob-split">${nav}<div class="ob-main">${body}</div></div></div>`;
  }
  ACT.onbPop = () => { const w = root.open(location.pathname + '?focus=excel#/p/' + encodeURIComponent(S.project.id) + '/onboarding', '_blank'); if (!w) toast('Your browser blocked the new tab. Allow pop-ups for this site and try again.'); else toast('Opened in a new tab. Work in one tab at a time so saves do not overwrite each other.'); };
  ACT.onbSel = a => { S.ui.onbSel = a.getAttribute('data-v'); V.render(); };
  function masterPane(p) {
    return `<div class="card"><div class="card-h"><h3>What we need from you</h3></div><div class="card-b small"><p style="margin-top:0">${esc(T.MASTER_LEAD)}</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Module</th><th>We need</th><th>We don't need (created in Facilio)</th></tr></thead><tbody>${p.master.map(m => `<tr><td><b>${esc(m.mod)}</b></td><td><span class="ob-need">✓ ${esc(m.need)}</span>${m.sheets.length ? `<div class="xs muted">${esc(m.sheets.join(', '))} sheet${m.sheets.length > 1 ? 's' : ''}</div>` : ''}</td><td><span class="ob-skip">✕ ${esc(m.skip)}</span></td></tr>`).join('')}</tbody></table></div>
      ${p.auto.length ? `<p class="small muted">Facilio prepares the ${esc(p.auto.join(', '))} sheet itself.</p>` : ''}${p.none.length ? `<p class="small muted">No data needed for: ${esc(p.none.join(', '))}.</p>` : ''}</div></div>`;
  }
  function sheetPane(s) {
    if (!s) return '<div class="empty">Pick a sheet.</div>'; const g = T.ONB.GUIDE.sheets[s.sheet] || {}; const st = stOf(s.sheet); const o = OB_ST[st.status] || OB_ST.todo;
    const statusCtl = fac() ? `<select data-change="onbStatus" data-sheet="${esc(s.sheet)}" style="width:170px">${Object.entries(OB_ST).map(([k, v]) => `<option value="${k}" ${st.status === k ? 'selected' : ''}>${v[1]}</option>`).join('')}</select>` : cust() && CUST_OB.includes(st.status) && V.custAllow('onboarding') ? `<select data-change="onbStatus" data-sheet="${esc(s.sheet)}" style="width:170px">${CUST_OB.map(k => `<option value="${k}" ${st.status === k ? 'selected' : ''}>${OB_ST[k][1]}</option>`).join('')}</select>` : tag(o[0], o[1]);
    return `<div class="card"><div class="card-h"><h3>${esc(s.sheet)}</h3><span class="small muted">${esc(s.tplName)}${s.built ? ' · built by Facilio for this module' : ''} · for ${esc(s.why.join(', '))}</span>${statusCtl}<button class="btn sm" data-act="onbWalk" data-sheet="${esc(s.sheet)}">${ico('play')}Walkthrough</button><button class="btn sm" data-act="onbDownload" data-tpl="${esc(s.tpl)}">${ico('dl')}This template</button></div>
      <div class="card-b small">${st.status === 'fix' && st.note ? `<div class="notice err" style="margin-bottom:10px"><span><b>Facilio:</b> ${esc(st.note)}</span></div>` : ''}${s.due ? `<div style="margin-bottom:8px">Due <b ${s.due < V.today() && !['sent', 'validated', 'loaded'].includes(st.status) ? 'style="color:#c0393a"' : ''}>${V.fmtDate(s.due)}</b>${s.dueTask ? ` <span class="muted">· from the plan: ${esc(s.dueTask)}</span>` : ''}</div>` : ''}
      ${g.purpose ? `<p style="margin-top:0">${esc(g.purpose)}</p>` : ''}<div class="grid g2">${arr(g.steps).length ? `<div><div class="pink-label" style="margin-top:0">How to fill</div><ol style="margin:0;padding-left:18px">${g.steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol></div>` : ''}${arr(g.watch).length ? `<div><div class="pink-label" style="margin-top:0">Watch out for</div><ul style="margin:0;padding-left:18px">${g.watch.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}</div>
      ${arr(g.before).length ? `<div class="xs muted" style="margin-top:8px">Fill first: ${esc(g.before.join(', '))}</div>` : ''}
      ${s.ents.map(k => `<div class="pink-label">${esc(T.ENT[k].label)} columns</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:36px">Col</th><th>Column</th><th>What to enter</th><th>Example</th></tr></thead><tbody>${colsOf(k).map((c, i) => `<tr><td class="mono">${colLetter(i + 1)}</td><td><b>${esc(c.h)}</b>${c.req ? ' ' + tag('red', 'Required') : ''}${c.lookup ? ' ' + tag('violet', 'Lookup') : ''}${c.list ? ' ' + tag('blue', 'List') : ''}</td><td>${esc(c.doc)}<div class="xs muted">${esc(expectOf(c, k))}</div></td><td class="mono xs">${esc(c.ex)}</td></tr>`).join('')}</tbody></table></div>`).join('')}
      <div class="pink-label">What not to do</div><ul style="margin:0;padding-left:18px">${mistakesOf(s).map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="xs muted">${esc(T.CUSTOM_FIELD_TIP)}</p>
      ${(st.hist || []).length ? `<details><summary class="xs muted">Status history</summary>${st.hist.slice().reverse().map(h => `<div class="xs muted">${esc(new Date(h.at).toLocaleString())} · ${esc(h.who)} · ${esc(h.event)}</div>`).join('')}</details>` : ''}</div></div>`;
  }
  ACT.onbStatus = el => V.busy(null, async () => { const sheet = el.getAttribute('data-sheet'); const v = el.value; let note = '';
    if (v === 'fix') { note = root.prompt('What needs fixing on the ' + sheet + ' sheet?') || ''; if (!note.trim()) { toast('Add a note so the customer knows what to fix'); V.render(); return; } }
    await I().put('onb', F.slug(sheet), Object.assign({}, stOf(sheet), { sheet, status: v, note })); toast('Status updated'); });
  function filePane(f) {
    if (!f) return ''; const list = I().list('onbfile').filter(x => x.tpl === f.id); const can = cust() ? V.custAllow('onboarding') : fac();
    return `<div class="card"><div class="card-h"><h3>${esc(f.name)}</h3><span class="small muted">No template: share your own files</span></div><div class="card-b small"><p style="margin-top:0">${esc(f.ask)}</p>
      ${list.map(x => `<div class="list-item" style="cursor:default"><b>${esc(x.name || x.link)}</b> ${x.link ? `<a href="${esc(F.safeUrl(x.link))}" target="_blank" rel="noopener">Open link</a>` : `<a href="#" data-act="dlFile" data-id="${esc(x.fileId)}" data-name="${esc(x.name)}">Download</a>`}<div class="xs muted">${esc(x.note || '')} · ${esc(x.by || '')} · ${esc(V.fmtDate(x._at))}</div></div>`).join('') || '<div class="muted">Nothing shared yet.</div>'}
      ${can ? `<div class="fgrid" style="margin-top:12px"><div class="full"><label class="f">Share a link (SharePoint, OneDrive, Google Drive…)</label><input type="text" id="of_link" placeholder="https://…"></div><div class="full"><label class="f">Note</label><input type="text" id="of_note"></div></div><div class="row" style="margin-top:8px"><button class="btn" data-act="onbFileLink" data-tpl="${esc(f.id)}">Share link</button><button class="btn" data-act="onbFileUp" data-tpl="${esc(f.id)}">${ico('upl')}Upload a file</button></div>` : ''}</div></div>`;
  }
  ACT.onbFileLink = a => V.busy(a, async () => { const link = document.getElementById('of_link').value.trim(); if (!/^https?:\/\//.test(link)) { toast('The link must start with http:// or https://'); return; } await I().put('onbfile', I().uid('of'), { tpl: a.getAttribute('data-tpl'), link, name: link.replace(/^https?:\/\//, '').slice(0, 60), note: document.getElementById('of_note').value.trim() }); toast('Link shared'); });
  ACT.onbFileUp = a => V.busy(a, async () => { const f = (await V.pickFile('.xlsx,.xls,.csv,.pdf,.docx,.zip'))[0]; if (!f) return; loading(true, 'Uploading…'); try { const rec = await API.uploadFile(S.project.id, f, 'onboarding_files', { tpl: a.getAttribute('data-tpl') }); await I().put('onbfile', I().uid('of'), { tpl: a.getAttribute('data-tpl'), fileId: rec.id, name: f.name, note: (document.getElementById('of_note') || {}).value || '' }); toast('File shared'); } finally { loading(false); } });

  // ---------- publish to the customer ----------
  ACT.onbPublish = a => V.busy(a, async () => { const p = buildPlan(); if (!S.docs.onboarding_published) S.docs.onboarding_published = { data: null, version: 0 }; S.docs.onboarding_published.data = p; F.markDirty('onboarding_published');
    const c = F.doc('portal_controls'); c.tabs = Object.assign({}, c.tabs || {}, { onboarding: true }); F.markDirty('portal_controls'); await F.flush(); F.changed('Data onboarding published', p.sheets.length + ' sheets'); toast('Published: the customer now sees Data Onboarding'); });

  // ---------- workbook ----------
  const HDR_REQ = 'FF0A7AFF', HDR_OPT = 'FF0F1D3A';
  ACT.onbDownload = a => V.busy(a, async () => { await loadT(); const p = plan(); const only = a.getAttribute('data-tpl'); loading(true, 'Building the workbook…'); try {
    const ExcelJS = await V.loadExcelJS(); const wb = new ExcelJS.Workbook(); wb.creator = 'Facilio'; const sheets = p.sheets.filter(s => !only || s.tpl === only);
    const ov = wb.addWorksheet('Overview'); ov.getCell('B2').value = `${S.project.customer || 'Customer'} · Facilio data onboarding`; ov.getCell('B2').font = { size: 16, bold: true }; ov.getCell('B3').value = T.MASTER_LEAD; ov.getCell('B3').font = { italic: true, size: 9, color: { argb: 'FF6B6785' } };
    ['Sheet', 'Module', 'What it holds', 'Priority', 'Due'].forEach((h, i) => { const c = ov.getCell(5, i + 2); c.value = h; c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HDR_OPT } }; });
    sheets.forEach((s, i) => { const g = T.ONB.GUIDE.sheets[s.sheet] || {}; [s.sheet, s.tplName, g.purpose || '', s.crit, s.due ? new Date(s.due + 'T00:00:00Z') : ''].forEach((v, j) => { const c = ov.getCell(6 + i, j + 2); c.value = v; if (j === 4 && v) c.numFmt = 'dd-mmm-yyyy'; c.alignment = { wrapText: true, vertical: 'top' }; }); });
    [4, 22, 22, 60, 10, 14].forEach((w, i) => { ov.getColumn(i + 1).width = w; });
    const lists = wb.addWorksheet('Lists'); lists.state = 'veryHidden'; const listRef = {}; let lc = 1;
    Object.entries(T.ONB.RULES.lists).filter(([, vals]) => vals && vals.length).forEach(([k, vals]) => { vals.forEach((v, i) => { lists.getCell(i + 1, lc).value = v; }); listRef[k] = `Lists!$${colLetter(lc)}$1:$${colLetter(lc)}$${vals.length}`; lc++; });
    const needCat = sheets.some(s => s.ents.includes('asset')); const where = {}; // ent → {sheet, col letter per column, firstRow}
    sheets.forEach(s => { const ws = wb.addWorksheet(V.sheetName(wb, s.sheet)); const multi = s.ents.length > 1; let base = 1;
      s.ents.forEach(k => { const cols = colsOf(k); let hr = base; if (multi) { ws.getCell(base, 1).value = T.ENT[k].label; ws.getCell(base, 1).font = { bold: true, size: 13 }; hr = base + 1; }
        where[k] = { sheet: ws.name, first: hr + 3, last: hr + (multi ? 38 : 600), cols: {} };
        cols.forEach((c, i) => { const col = i + 1; const L = colLetter(col); where[k].cols[c.k] = L;
          const h = ws.getCell(hr, col); h.value = c.h + (c.req ? '*' : ''); h.font = { bold: true, color: { argb: 'FFFFFFFF' } }; h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.req ? HDR_REQ : HDR_OPT } }; h.alignment = { vertical: 'middle', wrapText: true };
          h.note = [c.doc, c.req ? 'Required.' : 'Optional.', c.lookup && T.ENT[c.lookup[0]] ? `Pick from the ${sheetOf(c.lookup[0])} sheet (${T.ENT[c.lookup[0]].columns[c.lookup[1]].h[0]}).` : '', c.ex ? 'Example: ' + c.ex : ''].filter(Boolean).join('\n');
          const d = ws.getCell(hr + 1, col); d.value = c.doc; d.font = { italic: true, size: 9, color: { argb: 'FF6B6785' } }; d.alignment = { wrapText: true, vertical: 'top' };
          const e = ws.getCell(hr + 2, col); e.value = c.ex; e.font = { color: { argb: 'FF9A97AE' } };
          ws.getColumn(col).width = Math.max(14, Math.min(40, c.h.length + 4)); });
        ws.getRow(hr + 1).height = 42; base = hr + 40; });
      if (!multi) ws.views = [{ state: 'frozen', ySplit: 2 }]; });
    if (needCat) { const cm = wb.addWorksheet(V.sheetName(wb, 'Asset Category Master')); cm.getCell('A1').value = 'Asset Category'; cm.getCell('A1').font = { bold: true, color: { argb: 'FFFFFFFF' } }; cm.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HDR_OPT } }; T.ONB.SPEC.assetCategories.forEach((v, i) => { cm.getCell(i + 2, 1).value = typeof v === 'string' ? v : (v.name || v[0] || ''); }); cm.getColumn(1).width = 40; listRef.__cat = `'${cm.name}'!$A$2:$A$${T.ONB.SPEC.assetCategories.length + 1}`; }
    // dropdowns: fixed lists, the asset category master, and lookups to the target sheet's column
    sheets.forEach(s => s.ents.forEach(k => { const w = where[k]; const ws = wb.getWorksheet(w.sheet); colsOf(k).forEach(c => { let f = null;
      if (c.list && listRef[c.listKey]) f = listRef[c.listKey]; else if (c.sheetList === 'assetCategory' && listRef.__cat) f = listRef.__cat; else if (c.lookup && where[c.lookup[0]] && where[c.lookup[0]].cols[c.lookup[1]]) { const t = where[c.lookup[0]]; const L = t.cols[c.lookup[1]]; f = `'${t.sheet}'!$${L}$${t.first}:$${L}$${t.last}`; }
      if (!f) return; for (let r = w.first - 1; r <= w.last; r++) ws.getCell(`${w.cols[c.k]}${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: [f], showErrorMessage: !c.lookup, errorTitle: c.h, error: 'Pick a value from the list.' }; }); }));
    const out = await wb.xlsx.writeBuffer(); V.download(`${F.slug(S.project.customer || 'customer')}-facilio-${only ? F.slug((p.tpls.find(t => t.id === only) || {}).name || only) : 'onboarding'}.xlsx`, new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  } finally { loading(false); } });

  // ---------- checker ----------
  let lastReport = null, lastFile = null;
  const norm = v => String(v == null ? '' : v).replace(/\*/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
  const cellVal = c => { let v = c.value; if (v && typeof v === 'object') { if (v instanceof Date) return v; if ('result' in v) v = v.result; else if (v.richText) v = v.richText.map(x => x.text).join(''); else if (v.text !== undefined) v = v.text; else if (v.hyperlink) v = v.text || v.hyperlink; } return v == null ? '' : v; };
  async function checkWorkbook(file) {
    const ExcelJS = await V.loadExcelJS(); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await file.arrayBuffer()); const p = plan();
    const findWs = names => wb.worksheets.find(w => names.some(n => w.name.trim().toLowerCase() === n.toLowerCase()));
    const data = {}; const rep = { sheets: {}, missing: [], rows: {}, issues: 0, at: new Date().toISOString(), file: file.name };
    const add = (sheet, row, col, msg, sev) => { (rep.sheets[sheet] = rep.sheets[sheet] || []).push({ row, col, msg, sev: sev || 'error' }); rep.issues++; };
    p.sheets.forEach(s => s.ents.forEach((k, ei) => { const e = T.ENT[k]; const ws = findWs(e.sheet); if (!ws) { if (!rep.missing.includes(s.sheet)) rep.missing.push(s.sheet); return; }
      const cols = colsOf(k); const other = s.ents.filter(x => x !== k).map(x => colsOf(x)); const max = Math.min(ws.rowCount, 5000); const doc = T.ONB.COLDOC[k] || {};
      // find the header row: the first row with every required column, else the best partial match (single-table sheets only)
      let hdr = null, best = null; const startRow = ei > 0 && data[s.ents[ei - 1]] ? data[s.ents[ei - 1]].end + 1 : 1;
      for (let r = startRow; r <= Math.min(max, startRow + 400); r++) { const vals = []; ws.getRow(r).eachCell({ includeEmpty: false }, (c, cn) => { vals[cn] = norm(cellVal(c)); }); const map = {}; cols.forEach(c => { const i = vals.findIndex(v => v && c.aliases.some(a => norm(a) === v)); if (i > 0) map[c.k] = i; });
        const n = Object.keys(map).length; if (n < Math.min(2, cols.length)) continue; if (cols.filter(c => c.req).every(c => map[c.k])) { hdr = { r, map }; break; } if (!best || n > Object.keys(best.map).length) best = { r, map }; }
      if (!hdr && best && s.ents.length === 1) hdr = best; if (!hdr) { add(s.sheet, null, null, `Could not find the ${e.label} header row. Keep the header row from the template.`); return; }
      cols.filter(c => c.req && !hdr.map[c.k]).forEach(c => add(s.sheet, hdr.r, c.h, `Required column "${c.h}" is missing`));
      const rows = []; let end = hdr.r;
      for (let r = hdr.r + 1; r <= max; r++) { const row = ws.getRow(r); const rec = {}; let any = false; cols.forEach(c => { if (!hdr.map[c.k]) return; const v = cellVal(row.getCell(hdr.map[c.k])); rec[c.k] = v; if (v !== '' && v !== null) any = true; });
        const cells = []; row.eachCell({ includeEmpty: false }, (c) => cells.push(norm(cellVal(c))));
        if (other.length && ((cells.length === 1 && s.ents.some(x => x !== k && (norm(T.ENT[x].label) === cells[0] || norm(x) === cells[0]))) || other.some(oc => cells.filter(v => oc.some(c => c.aliases.some(a => norm(a) === v))).length >= 2))) break;
        if (!any) continue; end = r;
        if (cols.every(c => { const v = rec[c.k]; return v === '' || v == null || norm(v) === norm((doc[c.k] || [])[0]) || norm(v) === norm((doc[c.k] || [])[1]); })) continue; // description / example rows
        rows.push({ r, rec }); }
      data[k] = { rows, end, sheet: s.sheet }; rep.rows[s.sheet] = (rep.rows[s.sheet] || 0) + rows.length;
      rows.forEach(({ r, rec }) => cols.forEach(c => { if (!hdr.map[c.k]) return; let v = rec[c.k]; const empty = v === '' || v == null; const col = colLetter(hdr.map[c.k]);
        if (empty) { if (c.req) add(s.sheet, r, col + ' ' + c.h, 'Required, but empty'); return; }
        const sv = v instanceof Date ? v : String(v).trim();
        if (c.type === 'number' && !(typeof v === 'number' || !isNaN(Number(String(sv).replace(/,/g, ''))))) add(s.sheet, r, col + ' ' + c.h, `"${sv}" is not a number`);
        else if (c.type === 'number' && c.min !== undefined && Number(String(sv).replace(/,/g, '')) < c.min) add(s.sheet, r, col + ' ' + c.h, `Must be ${c.min} or more`);
        if (c.type === 'integer' && !(c.allowNeg ? /^-?\d+$/ : /^\d+$/).test(String(sv))) add(s.sheet, r, col + ' ' + c.h, `"${sv}" is not a whole number`);
        if (c.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(sv))) add(s.sheet, r, col + ' ' + c.h, `"${sv}" is not an email address`);
        if (c.type === 'lat' && !(Math.abs(Number(sv)) <= 90)) add(s.sheet, r, col + ' ' + c.h, 'Latitude must be between -90 and 90 (no °)');
        if (c.type === 'lng' && !(Math.abs(Number(sv)) <= 180)) add(s.sheet, r, col + ' ' + c.h, 'Longitude must be between -180 and 180 (no °)');
        if (c.type === 'date' && !(v instanceof Date) && !(typeof v === 'number') && isNaN(Date.parse(String(sv))) && !/^\d{1,2}[/.-]\d{1,2}[/.-]\d{4}$/.test(String(sv))) add(s.sheet, r, col + ' ' + c.h, `"${sv}" is not a date`);
        if (c.list && !c.list.some(x => norm(x) === norm(sv))) add(s.sheet, r, col + ' ' + c.h, `"${sv}" is not in the list (${c.list.slice(0, 5).join(', ')}…)`); }));
      arr(e.unique).forEach(u => { const seen = {}; rows.forEach(({ r, rec }) => { const key = u.cols.map(x => norm(rec[x])).join('|'); if (!key.replace(/\|/g, '')) return; if (seen[key]) add(s.sheet, r, u.cols.map(x => (e.columns[x] || { h: [x] }).h[0]).join(' + '), u.msg || `Duplicate: same as row ${seen[key]}`, u.sev === 'Warning' ? 'warning' : 'error'); else seen[key] = r; }); });
    }));
    // lookups across sheets
    p.sheets.forEach(s => s.ents.forEach(k => { const d = data[k]; if (!d) return; colsOf(k).forEach(c => { if (!c.lookup) return; const t = data[c.lookup[0]]; if (!t || !t.rows.length) return; const vals = new Set(t.rows.map(x => String(x.rec[c.lookup[1]]).trim())); const loose = new Set([...vals].map(norm));
      d.rows.forEach(({ r, rec }) => { const raw = rec[c.k]; if (raw === '' || raw == null) return; (c.k === 'sites' ? String(raw).split(',') : [raw]).map(x => String(x).trim()).filter(Boolean).forEach(v => { if (vals.has(v)) return; add(s.sheet, r, c.h, loose.has(norm(v)) ? `"${v}" differs only in capitals or spaces from the ${sheetOf(c.lookup[0])} sheet` : `"${v}" is not on the ${sheetOf(c.lookup[0])} sheet. Pick it from the dropdown.`); }); }); }); }));
    // site building counts
    if (data.site && data.building) { const cnt = {}; data.building.rows.forEach(({ rec }) => { const k = norm(rec.site); cnt[k] = (cnt[k] || 0) + 1; }); data.site.rows.forEach(({ r, rec }) => { const n = Number(rec.buildings); if (!isNaN(n) && rec.buildings !== '' && n !== (cnt[norm(rec.name)] || 0)) add('Site', r, 'No. Of Buildings', `Says ${n}, but the Building sheet has ${cnt[norm(rec.name)] || 0} for this site`, 'warning'); }); }
    Object.keys(rep.sheets).forEach(k => { rep.sheets[k] = rep.sheets[k].slice(0, 400); });
    return rep;
  }
  V.onbCheckWorkbook = checkWorkbook;
  function reportPane() {
    const subs = I().list('onbsub').sort((a, b) => (b._created || '').localeCompare(a._created || '')); const can = cust() ? V.custAllow('onboarding') : fac(); const r = lastReport;
    const total = r ? Object.values(r.rows).reduce((a, b) => a + b, 0) : 0; const errs = r ? Object.values(r.sheets).flat().filter(x => x.sev === 'error').length : 0;
    return `<div class="card"><div class="card-h"><h3>Check a filled workbook</h3><span class="small muted">Checked in your browser: required values, types, lists, duplicates and lookups between sheets</span>${can ? `<button class="btn primary" data-act="onbCheck">${ico('upl')}Choose workbook</button>` : ''}</div><div class="card-b small">
      ${r ? `<div class="notice ${errs ? 'err' : total ? 'ok' : 'warn'}" style="margin-bottom:10px"><span><b>${esc(r.file)}:</b> ${!total ? 'No data found — only header and example rows.' : errs ? `${errs} issue(s) to fix before sending` : 'Ready to send'} · ${total} row(s)${r.missing.length ? ' · missing sheets: ' + esc(r.missing.join(', ')) : ''}</span>${!errs && total && can ? `<button class="btn sm primary" data-act="onbSend">Send to Facilio</button>` : ''}</div>
        ${Object.entries(r.sheets).map(([sh, list]) => `<div class="pink-label">${esc(sh)} · ${list.length} issue(s)</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:60px">Row</th><th style="width:180px">Column</th><th>Issue</th></tr></thead><tbody>${list.slice(0, 60).map(x => `<tr><td class="mono">${x.row || '—'}</td><td class="small">${esc(x.col || '')}</td><td class="small">${x.sev === 'warning' ? tag('tbc', 'Check') + ' ' : ''}${esc(x.msg)}</td></tr>`).join('')}</tbody></table></div>${list.length > 60 ? `<div class="xs muted">First 60 of ${list.length}</div>` : ''}`).join('')}` : '<p class="muted" style="margin-top:0">Choose the filled workbook to check it. Nothing is sent until you press Send to Facilio.</p>'}
      ${subs.length ? `<div class="pink-label">Sent workbooks</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>File</th><th>By</th><th>When</th><th>Rows</th><th>Issues</th><th></th></tr></thead><tbody>${subs.map(x => `<tr><td class="small">${esc(x.fileName)}</td><td class="small">${esc(x.by || '')}</td><td class="small">${esc(new Date(x._created).toLocaleString())}</td><td class="small">${Object.values(x.rows || {}).reduce((a, b) => a + b, 0)}</td><td class="small">${x.issues || 0}</td><td>${x.fileId ? `<a href="#" data-act="dlFile" data-id="${esc(x.fileId)}" data-name="${esc(x.fileName)}">Download</a>` : ''}</td></tr>`).join('')}</tbody></table></div>` : ''}</div></div>`;
  }
  ACT.onbCheck = () => V.busy(null, async () => { const f = (await V.pickFile('.xlsx'))[0]; if (!f) return; loading(true, 'Checking the workbook…'); try { lastReport = await checkWorkbook(f); lastFile = f; S.ui.onbSel = '_report'; V.render(); } catch (e) { toast('The workbook could not be read: ' + e.message, 6000, true); } finally { loading(false); } });
  ACT.onbSend = a => V.busy(a, async () => { const r = lastReport, f = lastFile; if (!r || !f) return; loading(true, 'Sending to Facilio…'); try {
    const rec = await API.uploadFile(S.project.id, f, 'onboarding_workbook', { rows: r.rows }); const sheets = Object.entries(r.rows).filter(([, n]) => n > 0).map(([s]) => s);
    await I().put('onbsub', I().uid('os'), { fileId: rec.id, fileName: f.name, rows: r.rows, issues: r.issues, sheets, sent: true }, { silent: true });
    for (const sh of sheets) { const st = stOf(sh); if (['validated', 'loaded'].includes(st.status)) continue; await I().put('onb', F.slug(sh), Object.assign({}, st, { sheet: sh, status: 'sent', file: { id: rec.id, name: f.name } }), { silent: true }); }
    lastReport = null; lastFile = null; V.render(); toast('Sent to Facilio'); } finally { loading(false); } });
  V.onboardingDigest = () => { const p = plan(); if (!p || !p.sheets) return []; const out = []; const loaded = p.sheets.filter(s => stOf(s.sheet).status === 'loaded').length; if (loaded) out.push(loaded + ' of ' + p.sheets.length + ' sheets loaded'); p.sheets.filter(s => stOf(s.sheet).status === 'fix').forEach(s => out.push(s.sheet + ' needs fixes')); return out; };

  // ---------- walkthrough player ----------
  let W = null;
  function scenes(s) {
    const out = [{ k: 'intro', title: s.sheet, text: (T.ONB.GUIDE.sheets[s.sheet] || {}).purpose || '', ms: 8000 }];
    s.ents.forEach(k => colsOf(k).forEach((c, i) => out.push({ k: 'col', ent: k, ci: i, title: c.h, text: (c.doc ? c.doc + ' ' : '') + expectOf(c, k), ex: c.ex, ms: 6500 })));
    s.ents.forEach(k => colsOf(k).filter(c => c.lookup && T.ENT[c.lookup[0]]).slice(0, 2).forEach(c => out.push({ k: 'lookup', ent: k, title: 'Lookups: ' + c.h, text: `${c.h} must match the ${sheetOf(c.lookup[0])} sheet exactly.`, good: c.ex || 'ABC Site', ms: 9000 })));
    out.push({ k: 'mistakes', title: 'What not to do', list: mistakesOf(s), ms: 9000 }, { k: 'custom', title: 'Need another field?', text: T.CUSTOM_FIELD_TIP, ms: 9000 }, { k: 'check', title: 'Check before you send', text: 'Upload the filled workbook on this page. It is checked in your browser and you can fix anything before sending it to Facilio.', ms: 8000 });
    return out;
  }
  function grid(s, sc, typed) {
    const k = sc.ent || s.ents[0]; const cols = colsOf(k); const at = sc.k === 'col' ? sc.ci : 0; const from = Math.max(0, Math.min(at - 1, cols.length - 4)); const view = cols.slice(from, from + 4);
    return `<div class="wk-xl"><div class="wk-xl-bar"><span>${esc(s.sheet)}.xlsx</span></div><table><thead><tr><th></th>${view.map((c, i) => `<th>${colLetter(from + i + 1)}</th>`).join('')}</tr></thead><tbody><tr><td class="rn">1</td>${view.map((c, i) => `<td class="h ${c.req ? 'req' : ''} ${from + i === at && sc.k === 'col' ? 'sel' : ''}">${esc(c.h)}${c.req ? '*' : ''}</td>`).join('')}</tr><tr><td class="rn">2</td>${view.map(c => `<td class="d">${esc(c.doc.slice(0, 40))}</td>`).join('')}</tr><tr><td class="rn">3</td>${view.map((c, i) => `<td class="${from + i === at && sc.k === 'col' ? 'sel' : ''}">${from + i === at && sc.k === 'col' ? esc(typed) + '<span class="caret"></span>' : ''}</td>`).join('')}</tr></tbody></table></div>`;
  }
  function paint() {
    const m = document.getElementById('wkModal'); if (!m || !W) return; const s = W.sheets[W.si]; const sc = W.list[W.i]; const typed = sc.ex ? sc.ex.slice(0, W.typed) : '';
    let body = '';
    if (sc.k === 'intro') body = `<div class="wk-intro"><div class="eyebrow">Sheet ${W.si + 1} of ${W.sheets.length}</div><h2>${esc(s.sheet)}</h2><p>${esc(sc.text)}</p>${arr((T.ONB.GUIDE.sheets[s.sheet] || {}).before).length ? `<p class="small muted">Fill first: ${esc(T.ONB.GUIDE.sheets[s.sheet].before.join(', '))}</p>` : ''}</div>`;
    else if (sc.k === 'col') body = grid(s, sc, typed) + `<div class="wk-cap"><b>${esc(sc.title)}</b><p>${esc(sc.text)}</p></div>`;
    else if (sc.k === 'lookup') body = `<div class="wk-cap"><b>${esc(sc.title)}</b><p>${esc(sc.text)}</p><div class="wk-lk"><div class="ok">“${esc(sc.good)}” ✓ imports</div><div class="bad">“${esc(sc.good.toLowerCase())}” ✕ capitals differ</div><div class="bad">“${esc(sc.good)} ” ✕ extra space</div></div></div>`;
    else if (sc.k === 'mistakes') body = `<div class="wk-cap"><b>${esc(sc.title)}</b><ul>${sc.list.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
    else body = `<div class="wk-cap"><b>${esc(sc.title)}</b><p>${esc(sc.text)}</p></div>`;
    m.querySelector('.wk-body').innerHTML = body;
    m.querySelector('.wk-prog').innerHTML = W.list.map((x, i) => `<i class="${i < W.i ? 'done' : i === W.i ? 'on' : ''}"></i>`).join('');
    m.querySelector('[data-wk=play]').textContent = W.playing ? 'Pause' : 'Play';
    m.querySelector('.wk-chips').innerHTML = W.list.map((x, i) => x.k === 'col' ? `<button class="${i === W.i ? 'on' : ''}" data-wk="go" data-i="${i}">${esc(x.title)}</button>` : '').join('');
  }
  function tick() { if (!W || !W.playing) return; const sc = W.list[W.i]; W.elapsed += 100; if (sc.ex && W.typed < sc.ex.length && W.elapsed % 100 === 0) W.typed = Math.min(sc.ex.length, Math.floor(W.elapsed / 55)); if (W.elapsed >= sc.ms) step(1); else paint(); }
  function step(d) { if (!W) return; W.i += d; W.elapsed = 0; W.typed = 0; if (W.i >= W.list.length) { if (W.si < W.sheets.length - 1) { W.si++; W.list = scenes(W.sheets[W.si]); W.i = 0; } else { W.i = W.list.length - 1; W.playing = false; } } if (W.i < 0) { if (W.si > 0) { W.si--; W.list = scenes(W.sheets[W.si]); W.i = W.list.length - 1; } else W.i = 0; } paint(); }
  function closeWalk() { if (W) clearInterval(W.timer); W = null; const m = document.getElementById('wkModal'); if (m) m.remove(); document.removeEventListener('keydown', wkKey); }
  function wkKey(e) { if (!W) return; if (e.key === 'Escape') closeWalk(); else if (e.key === 'ArrowRight') step(1); else if (e.key === 'ArrowLeft') step(-1); else if (e.key === ' ') { e.preventDefault(); W.playing = !W.playing; paint(); } }
  ACT.onbWalk = a => { const p = plan(); if (!p || !p.sheets || !p.sheets.length) return; const sh = a.getAttribute('data-sheet'); const sheets = sh ? p.sheets.filter(s => s.sheet === sh) : p.sheets; closeWalk();
    W = { sheets, si: 0, list: scenes(sheets[0]), i: 0, elapsed: 0, typed: 0, playing: !matchMedia('(prefers-reduced-motion: reduce)').matches };
    const m = document.createElement('div'); m.className = 'wk-scrim'; m.id = 'wkModal'; m.innerHTML = `<div class="wk" role="dialog" aria-modal="true" aria-label="How to fill the data templates"><div class="wk-h"><b>How to fill the templates</b><span class="spacer"></span><button class="btn sm" data-wk="prev">Back</button><button class="btn sm" data-wk="play">Pause</button><button class="btn sm" data-wk="next">Next</button><button class="btn sm ghost" data-wk="close" aria-label="Close">${ico('x')}</button></div><div class="wk-prog"></div><div class="wk-body"></div><div class="wk-chips"></div></div>`;
    document.body.appendChild(m); m.addEventListener('click', e => { const b = e.target.closest('[data-wk]'); if (e.target === m) return closeWalk(); if (!b) return; const k = b.getAttribute('data-wk'); if (k === 'close') closeWalk(); else if (k === 'next') step(1); else if (k === 'prev') step(-1); else if (k === 'play') { W.playing = !W.playing; paint(); } else if (k === 'go') { W.i = +b.getAttribute('data-i'); W.elapsed = 0; W.typed = 0; paint(); } });
    document.addEventListener('keydown', wkKey); W.timer = setInterval(tick, 100); paint(); };
})(typeof window !== 'undefined' ? window : globalThis);

/* Dashboard widget kit (8 Nov 2026): the shapes the Overview tab of the project dashboard uses for the team, the customer and the admin.
   pie, rings (concentric progress), dots (one dot per item), orbit (the project in the middle, one satellite per area), spine (a vertical journey), rows (stacked bars per row).
   Pure SVG / HTML strings styled by the `dk-` classes in src/ui.css. Every figure comes from saved records through V.sdd.X() (src/stagedash.js); nothing is invented,
   and an empty input draws a plain sentence instead of a chart. Run by tests/dashkit.mjs. */
(function (root) {
  'use strict';
  const F = root.FWB, V = root.FWBViews; const esc = F ? F.esc : (s => String(s == null ? '' : s));
  const OK = '#16a34a', WARN = '#f59e0b', BAD = '#ef4444', GREY = '#a3a3a3', BLUE = '#1570EF', NAVY = '#1D1A5E', SLATE = '#64748b';
  const none = t => `<p class="sd-none">${esc(t)}</p>`;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const legend = parts => `<ul class="sd-lg">${parts.map(p => `<li><i style="background:${p[2]}"></i><span>${esc(p[0])}</span><b>${p[1]}</b></li>`).join('')}</ul>`;

  // filled pie: parts = [[label, n, colour]]
  function pie(parts, empty) {
    const tot = parts.reduce((n, p) => n + p[1], 0); if (!tot) return none(empty || 'Nothing recorded yet.');
    let a0 = -Math.PI / 2; const on = parts.filter(p => p[1]);
    const seg = p => { if (on.length === 1) return `<circle cx="50" cy="50" r="46" fill="${p[2]}"/>`; const a1 = a0 + p[1] / tot * 2 * Math.PI, big = a1 - a0 > Math.PI ? 1 : 0;
      const d = `M50 50 L${(50 + 46 * Math.cos(a0)).toFixed(2)} ${(50 + 46 * Math.sin(a0)).toFixed(2)} A46 46 0 ${big} 1 ${(50 + 46 * Math.cos(a1)).toFixed(2)} ${(50 + 46 * Math.sin(a1)).toFixed(2)} Z`; a0 = a1; return `<path d="${d}" fill="${p[2]}" stroke="#fff" stroke-width="1.5"/>`; };
    return `<div class="dk-row"><svg viewBox="0 0 100 100" style="flex:none;width:132px;height:132px" role="img" aria-label="${esc(parts.map(p => p[0] + ' ' + p[1]).join(', '))}">${on.map(seg).join('')}</svg>${legend(parts)}</div>`;
  }

  // concentric progress rings: rows = [{ l, p: 0..100 or null, c, d }]
  function rings(rs, empty) {
    const ok = rs.filter(r => r.p != null); if (!ok.length) return none(empty || 'Nothing to measure yet.');
    const R = [44, 35, 26, 17, 9]; const svg = ok.slice(0, 5).map((r, i) => { const c = 2 * Math.PI * R[i], len = c * clamp(r.p, 0, 100) / 100;
      return `<circle cx="50" cy="50" r="${R[i]}" fill="none" stroke="rgba(0,0,0,.07)" stroke-width="6"/><circle cx="50" cy="50" r="${R[i]}" fill="none" stroke="${r.c}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${len.toFixed(1)} ${(c - len).toFixed(1)}" transform="rotate(-90 50 50)"/>`; }).join('');
    return `<div class="dk-row"><svg viewBox="0 0 100 100" style="flex:none;width:148px;height:148px" role="img" aria-label="${esc(ok.map(r => r.l + ' ' + Math.round(clamp(r.p, 0, 100)) + '%').join(', '))}">${svg}</svg><ul class="dk-rl">${rs.map(r => `<li><i style="background:${r.c}"></i><span>${esc(r.l)}${r.d ? `<small>${esc(r.d)}</small>` : ''}</span><b>${r.p == null ? '—' : Math.round(clamp(r.p, 0, 100)) + '%'}</b></li>`).join('')}</ul></div>`;
  }

  // dot matrix: items = [colour], so 40 test cases are 40 dots; leg = [[label, n, colour]]
  function dots(items, leg, empty) {
    if (!items.length) return none(empty || 'Nothing recorded yet.');
    return `<div class="dk-dots" role="img" aria-label="${esc(leg.map(p => p[0] + ' ' + p[1]).join(', '))}">${items.slice(0, 300).map(c => `<i style="background:${c}"></i>`).join('')}</div>${legend(leg)}${items.length > 300 ? `<p class="sd-none">Showing the first 300 of ${items.length}.</p>` : ''}`;
  }

  // orbit: the project in the middle, one numbered satellite per area; sats = [{ l, c, d }]
  function orbit(title, sub, sats, empty) {
    if (!sats.length) return none(empty || 'Nothing to show yet.');
    const n = sats.length, pos = i => { const a = -Math.PI / 2 + i / n * 2 * Math.PI; return [100 + 74 * Math.cos(a), 100 + 74 * Math.sin(a)]; };
    const dotsSvg = sats.map((s, i) => { const [x, y] = pos(i); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="13" fill="${s.c}"/><text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="600" fill="#fff">${i + 1}</text>`; }).join('');
    return `<div class="dk-orbit"><svg viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="${esc(title + ': ' + sats.map(s => s.l).join(', '))}"><circle cx="100" cy="100" r="74" fill="none" stroke="rgba(0,0,0,.14)" stroke-dasharray="3 5"/><circle cx="100" cy="100" r="40" fill="#fff" stroke="rgba(0,0,0,.1)"/><text x="100" y="98" text-anchor="middle" font-size="13" font-weight="600" fill="#0a0a0a">${esc(title)}</text><text x="100" y="114" text-anchor="middle" font-size="9.5" fill="#6b7280">${esc(sub || '')}</text>${dotsSvg}</svg>`
      + `<ol class="dk-ol">${sats.map((s, i) => `<li><span class="dk-n" style="background:${s.c}">${i + 1}</span><span>${esc(s.l)}${s.d ? `<small>${esc(s.d)}</small>` : ''}</span></li>`).join('')}</ol></div>`;
  }

  // spine: a vertical journey; nodes = [{ l, d, s: 'done'|'now'|'next'|'bad' }]
  function spine(nodes, empty) {
    if (!nodes.length) return none(empty || 'No steps yet.');
    const ic = { done: '✓', now: '●', bad: '!', next: '' };
    return `<ol class="dk-spine">${nodes.map(n => `<li class="${n.s}"><span class="dk-sn">${ic[n.s] || ''}</span><div><b>${esc(n.l)}</b>${n.d ? `<small>${esc(n.d)}</small>` : ''}</div></li>`).join('')}</ol>`;
  }

  // stacked rows: rs = [{ l, parts: [[n, colour, name]] }], one bar per row, the longest row fills the width
  function rows(rs, leg, empty) {
    const tot = r => r.parts.reduce((n, p) => n + p[0], 0), mx = Math.max(0, ...rs.map(tot)); if (!mx) return none(empty || 'Nothing recorded yet.');
    return `<ul class="dk-rows">${rs.map(r => `<li><span>${esc(r.l)}</span><i style="width:${(tot(r) / mx * 100).toFixed(1)}%">${r.parts.filter(p => p[0]).map(p => `<u style="flex:${p[0]};background:${p[1]}" title="${esc(p[2] || '')}: ${p[0]}"></u>`).join('')}</i><b>${tot(r)}</b></li>`).join('')}</ul>${leg ? legend(leg) : ''}`;
  }

  // a clickable list line, the same look as the older dashboard lists
  const line = (view, main, side, tone) => `<li><button type="button" class="cs-line" data-act="nav" data-view="${esc(view)}"><span>${esc(main || 'Untitled')}</span>${side ? `<em class="${tone || ''}">${esc(side)}</em>` : ''}</button></li>`;
  const list = (ls, empty) => (ls.length ? `<ul class="cs-ul">${ls.join('')}</ul>` : none(empty));

  const RAGC = { g: OK, a: WARN, r: BAD, n: GREY };
  const SO = { notdue: ['Not due yet', 'next'], requested: ['Waiting for signature', 'now'], signed: ['Signed', 'done'], concern: ['Concern raised', 'bad'] };

  // ---------- filters ----------
  const ui = () => F.S.ui;
  // calendar period (V.range, src/rangefilter.js): the project dashboard filters actions, tasks and the calendar by their date; the admin dashboard keeps the projects with activity in the period. Undated items are left out while a period is set.
  const RG = () => ui().dkR || (ui().dkR = { period: 'all' }), RGA = () => ui().dkRA || (ui().dkRA = { period: 'all' });
  if (V.range) {
    V.range.hooks.dk = { state: RG, change: () => V.render(), pdf: () => V.range.printLive(document.querySelector('.cs-page'), ((F.S.project && F.S.project.name) || 'Project') + ' · Dashboard') };
    V.range.hooks.dka = { state: RGA, change: () => V.setMode('admin'), pdf: () => V.range.printLive(document.querySelector('.adx'), 'Delivery Studio · Portfolio dashboard') };
  }
  // Export bar: PDF (the print dialog's Save as PDF, through V.range), a standalone HTML copy of what is on screen, and a CSV of its key figures, lists and tables.
  const exportBar = (key, withPdf) => `<span class="dk-exp no-print" role="group" aria-label="Export">${withPdf ? `<button type="button" class="dk-fr" data-act="rgPdf" data-k="${key}">Export PDF</button>` : ''}<button type="button" class="dk-fr" data-act="dkExp" data-v="html" data-k="${key}">Export HTML</button><button type="button" class="dk-fr" data-act="dkExp" data-v="csv" data-k="${key}">Export CSV</button></span>`;
  const rootEl = () => document.querySelector('.cs-page, .adx');
  const slug = t => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'dashboard';
  const docTitle = key => (key === 'dka' ? 'Portfolio dashboard' : ((F.S.project && F.S.project.name) || 'Project') + ' · ' + ((document.querySelector('.sd-tabs .tab.active') || {}).textContent || 'Dashboard').trim());
  function exportHtml(key) {
    const el = rootEl(); if (!el) return; const css = [...document.styleSheets].map(sh => { try { return [...sh.cssRules].map(r => r.cssText).join('\n'); } catch (e) { return ''; } }).join('\n');
    const c = el.cloneNode(true); c.querySelectorAll('.dk-fbar, .dk-exp, .sd-tabs, .adx-tabs, .rgbar, script').forEach(n => n.remove()); const t = docTitle(key), day = V.today();
    const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(t) + '</title><style>' + css + '\nbody{margin:0;background:#fafafa}.dk-doc{max-width:1440px;margin:0 auto;padding:28px}.dk-doc h1{font:600 22px/30px system-ui,sans-serif;margin:0 0 4px}.dk-doc>p{color:#6b7280;margin:0 0 20px;font:400 14px/20px system-ui,sans-serif}</style></head><body class="' + esc(document.body.className) + '"><div class="dk-doc"><h1>' + esc(t) + '</h1><p>Exported from Facilio Delivery Studio on ' + esc(day) + '. This is a static copy: links and filters do not work here.</p>' + c.outerHTML + '</div></body></html>';
    V.download(slug(t) + '-' + day + '.html', html, 'text/html;charset=utf-8');
  }
  function exportCsv(key) {
    const el = rootEl(); if (!el) return; const q = v => '"' + String(F.csvText(String(v == null ? '' : v))).replace(/"/g, '""') + '"', txt = n => (n ? n.textContent.replace(/\s+/g, ' ').trim() : ''); const out = [['Section', 'Item', 'Value', 'Detail']];
    el.querySelectorAll('.sd-kpi, .adx-stat').forEach(k => out.push(['Key figures', txt(k.querySelector('.sd-kl, .adx-sl')), txt(k.querySelector('.sd-kv, b')), txt(k.querySelector('.sd-ks, .adx-ss'))]));
    el.querySelectorAll('.sd-w, .adx-c').forEach(w => { const h = txt(w.querySelector('h3')); w.querySelectorAll('tbody tr').forEach(tr => out.push([h].concat([...tr.children].map(txt)))); w.querySelectorAll('li').forEach(li => { if (!li.closest('table')) out.push([h, txt(li)]); }); });
    const t = docTitle(key); V.download(slug(t) + '-' + V.today() + '.csv', '\uFEFF' + out.map(r => r.map(q).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
  }
  const PF = () => (ui().dkF || (ui().dkF = { win: 14, focus: 'all', who: 'all' }));
  const AF = () => (ui().dkA || (ui().dkA = { stage: 'all', health: 'all', customer: 'all', type: 'all', when: 'all', q: '' }));
  const sel = (act, k, label, opts, cur) => `<label class="dk-f"><span>${esc(label)}</span><select data-change="${act}" data-k="${k}" aria-label="${esc(label)}">${opts.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(cur) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  // project dashboard (team and customer): the calendar window, what to focus on, and whose work
  function projBar(k) {
    const f = PF(), dirty = f.win !== 14 || f.focus !== 'all' || f.who !== 'all' || RG().period !== 'all';
    return `<div class="dk-fbar" role="group" aria-label="Dashboard filters">${V.range ? V.range.bar('dk', RG(), { note: 'Actions, tasks and the calendar, by their date' }) : ''}${sel('dkF', 'win', 'Calendar window', [[7, 'Next 7 days'], [14, 'Next 14 days'], [30, 'Next 30 days'], [60, 'Next 60 days']], f.win)}${sel('dkF', 'focus', 'Show', [['all', 'Everything'], ['overdue', 'Overdue only'], ['soon', 'Due in the next 7 days']], f.focus)}${k ? '' : sel('dkF', 'who', 'Work of', [['all', 'Everyone'], ['me', 'Me only']], f.who)}${dirty ? '<button type="button" class="dk-fr" data-act="dkFReset">Reset filters</button>' : ''}${exportBar('dk', false)}</div>`;
  }
  const typeOf = p => String(p.type || (p.metrics || {}).type || '').toUpperCase();
  // Admin: the filters apply to every Admin tab, so a portfolio of hundreds of projects can be cut down to the part you are looking at
  function filterPortfolio(ps) {
    const f = AF(), D = V.sdd, today = V.today(), q = String(f.q || '').trim().toLowerCase();
    const sp = V.range ? V.range.span(RGA()) : ['', ''];
    return ps.filter(p => { const m = p.metrics || {}; if (V.range && !V.range.inRange(m.lastActivity, sp)) return false;
      if (f.stage !== 'all' && String(D.rstageOf(p)) !== f.stage) return false; if (f.health !== 'all' && p.health !== f.health) return false;
      if (f.customer !== 'all' && (p.customer || 'No customer') !== f.customer) return false; if (f.type !== 'all' && typeOf(p) !== f.type) return false;
      if (q && !((p.name || '') + ' ' + (p.customer || '')).toLowerCase().includes(q)) return false;
      if (f.when !== 'all') { const d = m.target ? V.daysBetween(today, m.target) : null; if (f.when === 'none') { if (d != null) return false; } else if (d == null || (f.when === 'late' ? d >= 0 : d < 0 || d > Number(f.when))) return false; }
      return true; });
  }
  function adminBar(all, shown) {
    const f = AF(), D = V.sdd, dirty = RGA().period !== 'all' || Object.keys(f).some(k => f[k] !== (k === 'q' ? '' : 'all')); const cu = [...new Set(all.map(p => p.customer || 'No customer'))].sort(), ty = [...new Set(all.map(typeOf).filter(Boolean))].sort();
    return `<div class="dk-fbar" role="group" aria-label="Portfolio filters">${V.range ? V.range.bar('dka', RGA(), { note: 'Projects with activity in this period' }) : ''}<label class="dk-f dk-fq"><span>Search</span><input type="search" data-change="dkAF" data-k="q" value="${esc(f.q || '')}" placeholder="Project or customer" aria-label="Search projects"></label>`
      + sel('dkAF', 'stage', 'Stage', [['all', 'All stages']].concat(D.RSTG.slice(1).map(([id, l]) => [String(id), l]), [['0', 'No dated plan yet']]), f.stage)
      + sel('dkAF', 'health', 'Health', [['all', 'Any health']].concat(D.ORDER.map(h => [h, D.HL[h]])), f.health)
      + sel('dkAF', 'customer', 'Customer', [['all', 'All customers']].concat(cu.map(c => [c, c])), f.customer) + (ty.length ? sel('dkAF', 'type', 'Type', [['all', 'All types']].concat(ty.map(t => [t, t])), f.type) : '')
      + sel('dkAF', 'when', 'Go-live', [['all', 'Any date'], ['late', 'Past target date'], ['30', 'Within 30 days'], ['60', 'Within 60 days'], ['none', 'No date set']], f.when)
      + `<span class="dk-fc">Showing <b>${shown.length}</b> of ${all.length} project${all.length === 1 ? '' : 's'}</span>${dirty ? '<button type="button" class="dk-fr" data-act="dkAReset">Reset filters</button>' : ''}${exportBar('dka', false)}</div>`;
  }

  // Pain points and pending: what is late, blocked or waiting, worst first, each one a link to where it is fixed. Team only; every figure is counted from saved records.
  function pains(c) {
    const out = [], D = V.sdd, add = (n, sev, one, many, view, go) => { if (n > 0) out.push({ n, sev, text: n + ' ' + (n === 1 ? one : many), view, go }); };
    const tks = V.items && V.items.ready(['task']) ? V.items.list('task') : [], Q = ((F.S.ws && F.S.ws.questions) || []).filter(q => !q.answer && q.status !== 'Closed');
    const rd = V.brdReadiness ? V.brdReadiness() : { blocking: 0 }, tcs = c.tcs, req = ['brd', 'uat', 'golive'].filter(id => c.sg(id).status === 'requested').length;
    add(c.openBy('Critical'), 'bad', 'critical UAT defect is open', 'critical UAT defects are open', 'delivery', 'Open UAT');
    add(c.failed, 'bad', 'test case failed or is blocked', 'test cases failed or are blocked', 'delivery', 'Open UAT');
    add(c.anyLate.filter(a => a.side !== 'customer').length, 'bad', 'action of ours is past its date', 'actions of ours are past their date', 'governance', 'Open actions');
    add(tks.filter(t => /block/i.test(t.status || '')).length, 'bad', 'task is blocked', 'tasks are blocked', 'tasks', 'Open tasks');
    add(rd.blocking, 'bad', 'BRD check blocks sign-off', 'BRD checks block sign-off', 'brd', 'Open the BRD');
    add(c.custLate.length, 'warn', 'customer action is past its date', 'customer actions are past their date', 'governance', 'Open actions');
    add(c.raidHigh.length, 'warn', 'high-impact risk or issue is open', 'high-impact risks or issues are open', 'governance', 'Open RAID log');
    add(req, 'warn', 'sign-off is waiting for the customer', 'sign-offs are waiting for the customer', 'governance', 'Open sign-offs');
    add(c.crOpen.filter(x => (D.ageOf(x, c.today) || 0) > 14).length, 'warn', 'change request has waited over 14 days', 'change requests have waited over 14 days', 'changes', 'Change requests');
    add(c.R.filter(r => !r.status || r.status === 'Draft').length, 'warn', 'requirement is still a draft', 'requirements are still drafts', 'brd', 'Open the BRD');
    add(Q.length, 'warn', 'customer question has no answer', 'customer questions have no answer', 'rsquestions', 'Open questions');
    add(c.due.length - c.hit.length, 'warn', 'plan step is due but not done', 'plan steps are due but not done', 'plan', 'Open the plan');
    add(tcs.length && !c.run ? tcs.length : 0, 'warn', 'test case has not been run', 'test cases have not been run', 'delivery', 'Open UAT');
    add(c.hcOpen.length, 'warn', 'hypercare issue is open', 'hypercare issues are open', 'hypercare', 'Open hypercare');
    add(c.st.n ? 0 : 1, 'warn', 'dated plan is missing', 'dated plan is missing', 'plan', 'Open the plan');
    return out.sort((a, b) => (a.sev === 'bad' ? 0 : 1) - (b.sev === 'bad' ? 0 : 1) || b.n - a.n);
  }
  // Stage map: how far each stage is, from the records it owns; each row opens that stage's dashboard tab.
  function stageMap(c) {
    const D = V.sdd, ppl = F.doc('people') || {}, list = k => (V.items && V.items.ready([k]) ? V.items.list(k) : []), ho = list('ho'), st = id => c.sg(id).status, so = id => (st(id) === 'signed' ? 100 : st(id) === 'requested' ? 70 : 0);
    const conf = c.R.filter(r => r.status === 'Confirmed').length, k0 = [(ppl.team || []).length > 0, (ppl.stakeholders || []).length > 0, c.st.n > 0, !!c.st.goLive].filter(Boolean).length;
    return [['kickoff', 'Kick-off', D.pct(k0, 4), 'team, stakeholders, dated plan, go-live date'], ['req', 'Requirements', c.R.length ? D.pct(conf, c.R.length) : null, conf + ' of ' + c.R.length + ' confirmed'], ['brd', 'BRD and sign-off', so('brd'), st('brd') === 'signed' ? 'signed' : st('brd') === 'requested' ? 'waiting for signature' : 'not signed'],
      ['build', 'Build and UAT', c.tcs.length ? D.pct(c.passed, c.tcs.length) : null, c.passed + ' of ' + c.tcs.length + ' test cases passed'], ['live', 'Go-live and hypercare', so('golive'), st('golive') === 'signed' ? 'go-live signed' : st('golive') === 'requested' ? 'waiting for signature' : 'go-live not signed'], ['handover', 'Handover', ho.length ? D.pct(ho.filter(x => x.done).length, ho.length) : null, ho.filter(x => x.done).length + ' of ' + ho.length + ' items ticked']];
  }
  const painList = (rs, empty) => (rs.length ? `<ul class="cs-ul">${rs.map(r => `<li><button type="button" class="cs-line" data-act="nav" data-view="${esc(r.view)}"><span><i class="dk-sev ${r.sev}" aria-hidden="true"></i>${esc(r.text)}</span><em class="${r.sev}">${esc(r.go)} \u2192</em></button></li>`).join('')}</ul>` : none(empty));
  const mapList = rs => `<ul class="dk-sm">${rs.map(([id, l, p, d]) => `<li><button type="button" data-act="sdTab" data-v="${id}" title="Open the ${esc(l)} dashboard"><span><b>${esc(l)}</b><small>${esc(d)}</small></span><i><u style="width:${p == null ? 0 : p}%"></u></i><em>${p == null ? '—' : p + '%'}</em></button></li>`).join('')}</ul>`;

  // Admin pain points: what is wrong across the portfolio, worst first. Each row either opens the tab where the story continues (admTab) or narrows the portfolio to the projects concerned (dkAQ).
  function adminPains(C, ps) {
    const D = V.sdd, today = C.today || V.today(), m = p => p.metrics || {}, W = C.workload || {}, sg = C.signals || [], out = [], sum = f => ps.reduce((n, p) => n + (Number(f(p)) || 0), 0);
    const dl = p => (m(p).target ? V.daysBetween(today, m(p).target) : null), H = h => ps.filter(p => p.health === h).length, tab = v => 'data-act="admTab" data-v="' + v + '"', q = (k, v) => 'data-act="dkAQ" data-k="' + k + '" data-v="' + v + '"';
    const add = (n, sev, one, many, attrs, go) => { if (n > 0) out.push({ n, sev, text: n + ' ' + (n === 1 ? one : many), attrs, go }); };
    add(sg.filter(x => x.sev === 'critical').length, 'bad', 'critical warning signal', 'critical warning signals', tab('risk'), 'Open Risk');
    add(H('blocked'), 'bad', 'project is blocked', 'projects are blocked', q('health', 'blocked'), 'Show them');
    add(H('overdue'), 'bad', 'project is overdue', 'projects are overdue', q('health', 'overdue'), 'Show them');
    add(ps.filter(p => dl(p) !== null && dl(p) < 0).length, 'bad', 'project is past its go-live target', 'projects are past their go-live target', q('when', 'late'), 'Show them');
    add(sum(p => m(p).overdueTasks), 'warn', 'task is overdue', 'tasks are overdue', tab('people'), 'Open People');
    add(sum(p => m(p).custWaiting), 'warn', 'item is waiting on a customer', 'items are waiting on customers', tab('customers'), 'Open Customers');
    add(sg.filter(x => x.sev === 'high').length, 'warn', 'high warning signal', 'high warning signals', tab('risk'), 'Open Risk');
    add((W.unassigned || []).reduce((n, u) => n + (u.n || 0), 0), 'warn', 'open task has no owner', 'open tasks have no owner', tab('people'), 'Open People');
    add((W.concentration || []).length, 'warn', 'project has one person holding most of its urgent work', 'projects have one person holding most of their urgent work', tab('people'), 'Open People');
    add(sum(p => m(p).crOpen), 'warn', 'change request is open', 'change requests are open', tab('customers'), 'Open Customers');
    add(ps.filter(p => !D.rstageOf(p)).length, 'warn', 'project has no dated plan', 'projects have no dated plan', q('stage', '0'), 'Show them');
    add(ps.filter(p => !m(p).target).length, 'warn', 'project has no go-live date', 'projects have no go-live date', q('when', 'none'), 'Show them');
    return out.sort((a, b) => (a.sev === 'bad' ? 0 : 1) - (b.sev === 'bad' ? 0 : 1) || b.n - a.n);
  }
  const adminPainList = rs => (rs.length ? `<ul class="cs-ul">${rs.map(r => `<li><button type="button" class="cs-line" ${r.attrs}><span><i class="dk-sev ${r.sev}" aria-hidden="true"></i>${esc(r.text)}</span><em class="${r.sev}">${esc(r.go)} \u2192</em></button></li>`).join('')}</ul>` : none('Nothing is blocked, late or waiting across the portfolio.'));

  // ---------- the Overview widgets, from the numbers V.sdd.X() already computes ----------
  function overview() {
    const D = V.sdd, S = V.sd, C = V.sdc; if (!D || !S || !C) throw new Error('dashboard parts missing');
    const c = D.X(), A = D.areas(c), ov = D.overall(A), k = c.k, pct = D.pct, today = c.today; const { widget, grid, kpi } = S;
    const FS = PF(), win = FS.win, focus = FS.focus, add7 = new Date(Date.parse(today + 'T00:00:00Z') + 7 * 864e5).toISOString().slice(0, 10), me = String((F.S.user && F.S.user.email) || '').toLowerCase();
    const rsp = V.range ? V.range.span(RG()) : ['', ''], inR = d => (V.range ? V.range.inRange(d, rsp) : true);
    const fa = a => inR(a.due) && (focus === 'all' || (focus === 'overdue' ? !!(a.due && a.due < today) : !!(a.due && a.due >= today && a.due <= add7)));   // the Show and period filters, for actions
    const conf = c.R.filter(r => r.status === 'Confirmed').length, signed = ['brd', 'uat', 'golive'].filter(id => c.sg(id).status === 'signed').length;
    const sc = c.spi == null ? null : Math.round(c.spi * 100), ad = c.due.length ? pct(c.hit.length, c.due.length) : null;
    const kpis = [['Overall status', C.rag(ov, D.OV[ov]), A.filter(x => x.s === 'r').length + ' red · ' + A.filter(x => x.s === 'a').length + ' amber · ' + A.filter(x => x.s === 'g').length + ' green', null],
      ['Schedule performance', c.spi == null ? '—' : c.spi.toFixed(2), c.spi == null ? 'needs a dated plan' : c.spi >= 1 ? 'on or ahead of plan' : 'below 1.00 means behind plan', sc == null ? null : Math.min(100, sc)],
      ['Milestone adherence', ad == null ? '—' : ad + '%', c.due.length ? c.hit.length + ' of ' + c.due.length + ' due plan steps are Done' : 'no plan step has come due yet', ad],
      [k ? 'Waiting on you' : 'Overdue', k ? c.actsOpen.filter(a => a.side === 'customer' && fa(a)).length : c.anyLate.filter(fa).length, k ? 'open actions on your side' : 'actions past their date', null]];
    const kp = `<div class="sd-kpis">${kpis.map((a, i) => kpi(a[0], a[1], a[2], i === 3 && !k && c.anyLate.length ? BAD : '#3b82f6', a[3])).join('')}</div>`;
    const rg = widget('Delivery progress', 'four measures, one ring each', rings([
      { l: 'Plan done', d: c.st.n ? 'against ' + c.st.planned + '% planned' : 'no dated plan', p: c.st.n ? c.st.actual : null, c: BLUE },
      { l: 'Requirements confirmed', d: conf + ' of ' + c.R.length, p: c.R.length ? pct(conf, c.R.length) : null, c: NAVY },
      { l: 'Test cases passed', d: c.passed + ' of ' + c.tcs.length, p: c.tcs.length ? pct(c.passed, c.tcs.length) : null, c: OK },
      { l: 'Sign-offs signed', d: signed + ' of 3', p: pct(signed, 3), c: WARN }]), 4);
    const open = c.actsOpen.filter(fa), isLate = a => a.due && a.due < today, late = open.filter(isLate), fac = open.filter(a => (a.side || 'facilio') === 'facilio' && !isLate(a)), cus = open.filter(a => a.side === 'customer' && !isLate(a));
    const myAll = c.acts.filter(a => a.side === 'customer' && fa(a)), myOpen = open.filter(a => a.side === 'customer');
    const who = k ? widget('Your actions', 'open, overdue and done', C.donut([['Open', myOpen.filter(a => !isLate(a)).length, BLUE], ['Overdue', myOpen.filter(isLate).length, BAD], ['Done', focus === 'all' ? myAll.length - myOpen.length : 0, OK]], String(myOpen.length), 'open', 'No actions recorded yet.'), 4)
      : widget('Who owes what', 'open actions by side', pie([['Facilio', fac.length, NAVY], ['Customer', cus.length, BLUE], ['Overdue', late.length, BAD]], 'No open actions.'), 4);
    const tks = k ? [] : (V.items && V.items.ready(['task']) ? V.items.list('task') : []).filter(t => (FS.who !== 'me' || String(t.owner || '').toLowerCase() === me) && inR(t.due || t.eta)); const ts = x => (/^(done|closed|resolved|complete|completed|cancelled)$/i.test(x.status || '') ? 'done' : /block/i.test(x.status || '') ? 'blocked' : /progress/i.test(x.status || '') ? 'prog' : 'todo');
    const by = s => tks.filter(t => ts(t) === s).length;
    const journey = (names) => spine(['brd', 'uat', 'golive'].map(id => { const m = SO[c.sg(id).status] || SO.notdue; return { l: names[id], d: m[0], s: m[1] }; }).concat(c.goDays != null ? [{ l: 'Go-live date', d: V.fmtDate(c.st.goLive) + ' · ' + (c.goDays >= 0 ? c.goDays + ' days to go' : -c.goDays + ' days ago'), s: c.goDays < 0 ? 'bad' : 'next' }] : []));
    const work = k ? widget('Your journey', 'what you are asked to approve', journey({ brd: 'Requirements (BRD)', uat: 'Testing (UAT)', golive: 'Go-live' }), 4)
      : widget('Work by status', 'all tasks', C.donut([['To do', by('todo'), SLATE], ['In progress', by('prog'), BLUE], ['Blocked', by('blocked'), BAD], ['Done', by('done'), OK]], String(tks.length), 'tasks', 'No tasks match the filters.'), 4);
    const orb = widget('Health by area', 'one satellite per area', orbit({ g: 'On track', a: 'Attention', r: 'Off track', n: 'No data' }[ov], 'overall', A.map(x => ({ l: x.l, c: RAGC[x.s], d: x.d }))), 7);
    const sp = k ? '' : widget('Sign-off journey', 'BRD, UAT and go-live', journey({ brd: 'BRD', uat: 'UAT', golive: 'Go-live' }), 5);
    const st = s => String(s.status || ''), GRY = '#d4d4d4'; const tcc = c.tcs.map(t => (/^(passed|approved)$/i.test(st(t)) ? OK : /^(failed|blocked)$/i.test(st(t)) ? BAD : /^(not started|ready for testing|deferred|)$/i.test(st(t)) ? GRY : WARN));
    const cnt = col => tcc.filter(x => x === col).length;
    const dt = widget('Test cases', 'one dot per test case', dots(tcc, [['Passed', cnt(OK), OK], ['In progress', cnt(WARN), WARN], ['Failed or blocked', cnt(BAD), BAD], ['Not started', cnt(GRY), GRY]], 'No test cases yet.'), 6);
    const TY = ['Risk', 'Assumption', 'Issue', 'Dependency'], rd = c.raidOpen, imp = x => x.impact || 'Medium';
    const rw = (!k || (V.custShow && V.custShow('risks'))) ? widget('Open RAID items', 'by type and impact', rows(TY.map(t => ({ l: t, parts: [['High', BAD], ['Medium', WARN], ['Low', GREY]].map(([im, col]) => [rd.filter(x => (x.type || 'Risk') === t && imp(x) === im).length, col, im]) })), [['High', rd.filter(x => imp(x) === 'High').length, BAD], ['Medium', rd.filter(x => imp(x) === 'Medium').length, WARN], ['Low', rd.filter(x => imp(x) === 'Low').length, GREY]], 'Nothing open in the RAID log.'), 6) : '';
    const ev = (V.events ? V.events({ days: win }) : []).filter(e => inR(e.date)).slice(0, 8), need = k ? myOpen.slice().sort((a, b) => (a.due || '9').localeCompare(b.due || '9')).slice(0, 5) : (V.attentionItems ? V.attentionItems() : []).slice(0, 6);
    const l1 = widget('Next ' + win + ' days', 'sessions and milestones', list(ev.map(e => line(e.view === 'overview' ? 'governance' : e.view, e.title, V.fmtDate(e.date))), 'Nothing is scheduled in the next 14 days.'), 6);
    const l2 = widget(k ? 'What we need from you' : 'Needs attention', k ? 'open actions, soonest first' : 'worth a look today', list(need.map(a => k ? line('governance', a.text || 'Action', a.due ? V.fmtDate(a.due) : '', isLate(a) ? 'bad' : '') : line(a.view || 'governance', a.t)), k ? 'Nothing is waiting on you right now.' : 'Nothing needs attention right now.'), k ? 5 : 6);
    const top = k ? '' : widget('Pain points and pending', 'worst first, each opens where it is fixed', painList(pains(c).slice(0, 8), 'Nothing is late, blocked or waiting. The project is clear.'), 7) + widget('Stage map', 'how far each stage is, click for its dashboard', mapList(stageMap(c)), 5);
    return projBar(k) + kp + grid(top + (k ? rg + who + work + orb + l2 + dt + rw + l1 : rg + who + work + orb + sp + dt + rw + l1 + l2));
  }

  // ---------- Admin: extra portfolio widgets, from the project list the Admin dashboard already has ----------
  function admin(ps) {
    const D = V.sdd, S = V.sd; if (!D || !S || !ps.length) return ''; const { widget, grid } = S, { HC, HL, ORDER, pct } = D; const RSTGS = D.RSTG.slice(1).concat([[0, 'No dated plan yet']]);
    const m = p => p.metrics || {}, on = ps.filter(p => p.health === 'on_track').length;
    const worst = ps.slice().sort((a, b) => ORDER.indexOf(a.health) - ORDER.indexOf(b.health)); const NS = 10;   // with hundreds of projects the orbit shows the ones that need attention first
    const orb = widget('Portfolio orbit', ps.length > NS ? 'the ' + NS + ' that need attention first, of ' + ps.length : 'one satellite per project, coloured by health', orbit(pct(on, ps.length) + '%', 'on track', worst.slice(0, NS).map(p => ({ l: p.name, c: HC[p.health] || GREY, d: (p.customer || '') + (m(p).target ? ' · target ' + V.fmtDate(m(p).target) : '') }))), 6);
    const leg = ORDER.map(h => [HL[h], ps.filter(p => p.health === h).length, HC[h]]);
    const dt = widget('Every project at a glance', 'one dot per project, worst first', dots(worst.map(p => HC[p.health] || GREY), leg), 6);
    const cust = {}; ps.forEach(p => { const k = p.customer || 'No customer'; (cust[k] = cust[k] || []).push(p); });
    const crowAll = Object.keys(cust).map(k => ({ l: k, parts: ORDER.map(h => [cust[k].filter(p => p.health === h).length, HC[h], HL[h]]) })).sort((a, b) => b.parts.reduce((n, p) => n + p[0], 0) - a.parts.reduce((n, p) => n + p[0], 0)), crow = crowAll.slice(0, 8);
    const cw = widget('Health by customer', crowAll.length > 8 ? 'the 8 biggest customers, of ' + crowAll.length : 'projects per customer', rows(crow, leg), 6);
    const stg = widget('Pipeline by stage', 'projects per stage, coloured by health', rows(RSTGS.map(([id, l]) => ({ l, parts: ORDER.map(h => [ps.filter(p => D.rstageOf(p) === id && p.health === h).length, HC[h], HL[h]]) })), leg), 6);
    const dated = ps.filter(p => D.rstageOf(p)).length, tgt = ps.filter(p => m(p).target).length;
    const rg = widget('Portfolio readiness', 'how much of the portfolio is planned', rings([{ l: 'On track', d: on + ' of ' + ps.length, p: pct(on, ps.length), c: OK }, { l: 'Has a dated plan', d: dated + ' of ' + ps.length, p: pct(dated, ps.length), c: BLUE }, { l: 'Has a go-live date', d: tgt + ' of ' + ps.length, p: pct(tgt, ps.length), c: NAVY }]), 6);
    const ty = {}; ps.forEach(p => { const t = String(p.type || m(p).type || '').toUpperCase(); if (t) ty[t] = (ty[t] || 0) + 1; }); const TC = [BLUE, NAVY, OK, WARN, SLATE, BAD];
    const tw = Object.keys(ty).length ? widget('Projects by type', 'share of the portfolio', pie(Object.keys(ty).map((t, i) => [t, ty[t], TC[i % TC.length]])), 6) : '';
    return grid(orb + dt + stg + cw + rg + tw);
  }

  const ACT = V.ACT;
  ACT.dkF = el => { const k = el.getAttribute('data-k'), v = el.value; PF()[k] = k === 'win' ? Number(v) : v; V.render(); };
  ACT.dkFReset = () => { ui().dkF = { win: 14, focus: 'all', who: 'all' }; ui().dkR = { period: 'all' }; V.render(); };
  ACT.dkAF = el => { AF()[el.getAttribute('data-k')] = el.value; V.setMode('admin'); };
  ACT.dkAQ = el => { const k = el.getAttribute('data-k'); ui().dkA = { stage: 'all', health: 'all', customer: 'all', type: 'all', when: 'all', q: '' }; AF()[k] = el.getAttribute('data-v'); V.setMode('admin'); };   // a pain-point row narrows the portfolio to its projects
  ACT.dkAReset = () => { ui().dkRA = { period: 'all' }; ui().dkA = { stage: 'all', health: 'all', customer: 'all', type: 'all', when: 'all', q: '' }; V.setMode('admin'); };
  ACT.dkExp = el => { const k = el.getAttribute('data-k'); try { if (el.getAttribute('data-v') === 'csv') exportCsv(k); else exportHtml(k); } catch (e) { V.toast && V.toast('Could not make the file: ' + (e.message || 'try again'), 5000, true); } };
  // click a widget anywhere that is not itself a control to open the page its header link names (the link stays for keyboard users)
  if (typeof document !== 'undefined') document.addEventListener('click', e => {
    const w = e.target.closest && e.target.closest('.sd-w[data-go], .adx-c[data-gotab]'); if (!w || e.target.closest('a, button, input, select, textarea, label, summary, [data-act], [data-change], [role=link]')) return;
    if (String(root.getSelection ? root.getSelection() : '')) return;   // the person is selecting text
    if (w.getAttribute('data-go')) { const b = document.createElement('button'); b.setAttribute('data-view', w.getAttribute('data-go')); ACT.nav(b); } else { ui().admTab = w.getAttribute('data-gotab'); V.setMode('admin'); }
  });
  V.dk = { pie, rings, dots, orbit, spine, rows, overview, admin, adminBar, filterPortfolio, pains, stageMap, adminPains, adminPainList, exportBar, none };
})(typeof window !== 'undefined' ? window : globalThis);

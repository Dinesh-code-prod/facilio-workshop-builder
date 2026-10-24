/* Admin dashboard visuals: sparklines, RAG boards, donuts, pivots, delivery trackers and stacked bars.
   Everything is computed from the data the dashboard already loads (A.data.projects, A.data.weekly/monthly, A.ins); nothing is estimated. */
(function (root) {
  'use strict';
  const F = root.FWB; const V = root.FWBViews; const { esc } = F;
  const RC = { r: '#D92D6A', a: '#F59E0B', g: '#12A594' }; const RN = { r: 'Red', a: 'Amber', g: 'Green' };
  const idle = p => Math.max(0, Math.floor((Date.now() - new Date(p.lastActivity || p.updatedAt).getTime()) / 864e5));
  const left = p => p.endDate ? Math.ceil((new Date(p.endDate).getTime() - Date.now()) / 864e5) : null;
  // Red = something is late or blocked. Amber = needs a nudge. Green = on track or live.
  function rag(p) {
    const why = []; const dl = left(p), id = idle(p);
    if (p.stage === 6) return { k: 'g', why: ['Live'] };
    if (p.overdue) why.push(p.overdue + ' overdue action' + (p.overdue > 1 ? 's' : '')); if (p.blocked) why.push(p.blocked + ' blocked'); if (dl !== null && dl < 0) why.push('Past planned end date'); if (id > 30) why.push('No activity for ' + id + ' days');
    if (why.length) return { k: 'r', why };
    if (id > 14) why.push('No activity for ' + id + ' days'); if (p.openFeedback >= 3) why.push(p.openFeedback + ' open customer questions'); if (dl !== null && dl <= 14) why.push('Ends in ' + dl + ' days');
    return why.length ? { k: 'a', why } : { k: 'g', why: ['On track'] };
  }
  const card = (t, sub, body, cls) => `<div class="adm-card ${cls || ''}"><div class="adm-h"><h3>${esc(t)}</h3>${sub ? `<span class="muted xs">${sub}</span>` : ''}</div>${body}</div>`;
  const none = t => `<div class="adm-empty">${esc(t || 'Nothing to show yet.')}</div>`;
  // ---- sparkline card: line + soft area, last value, change against the earlier average
  function spark(title, vals, labels, color, unit) {
    const n = vals.length; if (n === 1) return `<div class="sp-card"><span class="sp-t">${esc(title)}</span><div class="sp-v">${vals[0].toLocaleString()}${unit ? `<small>${esc(unit)}</small>` : ''}</div><span class="sp-r">Right now, across active projects</span></div>`;
    if (!n) return `<div class="sp-card"><span class="sp-t">${esc(title)}</span>${none('No data')}</div>`;
    const W = 220, H = 56, mx = Math.max(1, ...vals), mn = 0; const x = i => n === 1 ? W / 2 : 4 + i * (W - 8) / (n - 1), y = v => H - 6 - (v - mn) / (mx - mn || 1) * (H - 14);
    const pts = vals.map((v, i) => [x(i), y(v)]); const line = pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' ');
    const last = vals[n - 1], prev = n > 1 ? vals.slice(0, -1).reduce((a, b) => a + b, 0) / (n - 1) : last; const d = Math.round(last - prev);
    const gid = 'sg' + Math.random().toString(36).slice(2, 7);
    return `<div class="sp-card"><span class="sp-t">${esc(title)}</span><div class="sp-v">${last.toLocaleString()}${unit ? `<small>${esc(unit)}</small>` : ''}</div>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(title)} trend"><defs><linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><path d="${line} L${x(n - 1).toFixed(1)} ${H} L${x(0).toFixed(1)} ${H} Z" fill="url(#${gid})"/><path d="${line}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><circle cx="${pts[n - 1][0].toFixed(1)}" cy="${pts[n - 1][1].toFixed(1)}" r="3.4" fill="${color}"/></svg>
      <span class="sp-d ${d > 0 ? 'up' : d < 0 ? 'dn' : ''}">${d > 0 ? '▲ ' + d : d < 0 ? '▼ ' + Math.abs(d) : 'No change'} <i>vs earlier average</i></span>${labels ? `<span class="sp-r">${esc(labels[0])} to ${esc(labels[n - 1])}</span>` : ''}</div>`;
  }
  // ---- SVG donut with centre label and legend
  function donut(parts, centre, sub) {
    const tot = parts.reduce((a, p) => a + p.v, 0); if (!tot) return none(); const R = 52, C = 2 * Math.PI * R; let off = 0;
    const segs = parts.filter(p => p.v).map(p => { const len = p.v / tot * C; const s = `<circle r="${R}" cx="70" cy="70" fill="none" stroke="${p.c}" stroke-width="20" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}"><title>${esc(p.l)}: ${p.v}</title></circle>`; off += len; return s; }).join('');
    return `<div class="dn-wrap"><svg viewBox="0 0 140 140" class="dn-svg" role="img" aria-label="${esc(sub || 'Split')}"><circle r="${R}" cx="70" cy="70" fill="none" stroke="#E8EEF8" stroke-width="20"/><g transform="rotate(-90 70 70)">${segs}</g><text x="70" y="68" text-anchor="middle" class="dn-n">${esc(String(centre))}</text><text x="70" y="86" text-anchor="middle" class="dn-s">${esc(sub || '')}</text></svg>
      <ul class="dn-leg">${parts.map(p => `<li><i style="background:${p.c}"></i><span>${esc(p.l)}</span><b>${p.v}</b><em>${Math.round(p.v / tot * 100)}%</em></li>`).join('')}</ul></div>`;
  }
  // ---- stacked horizontal bars: rows [{l, parts:[{v,c,n}], go}]
  function stack(rows, legend) {
    if (!rows.length) return none(); const mx = Math.max(1, ...rows.map(r => r.parts.reduce((a, p) => a + p.v, 0)));
    return `<div class="sb">${legend ? `<div class="sb-leg">${legend.map(([n, c]) => `<span><i style="background:${c}"></i>${esc(n)}</span>`).join('')}</div>` : ''}${rows.map(r => { const t = r.parts.reduce((a, p) => a + p.v, 0); return `<div class="sb-r${r.go ? ' click' : ''}"${r.go ? ` data-act="${r.go[0]}" data-id="${esc(r.go[1])}" role="button" tabindex="0"` : ''}><span class="sb-l" title="${esc(r.l)}">${esc(r.l)}</span><div class="sb-t" style="width:${Math.max(4, t / mx * 100)}%">${r.parts.filter(p => p.v).map(p => `<b style="flex:${p.v};background:${p.c}" title="${esc(p.n + ': ' + p.v)}">${p.v}</b>`).join('') || '<b class="z" style="flex:1">0</b>'}</div><span class="sb-n">${t}</span></div>`; }).join('')}</div>`;
  }
  // ---- pivot: rows x columns with heat shading and totals
  function pivot(rowsLabel, cols, rows, color) {
    if (!rows.length) return none(); const mx = Math.max(1, ...rows.flatMap(r => r.cells)); const colT = cols.map((_, i) => rows.reduce((a, r) => a + r.cells[i], 0));
    return `<div class="tbl-wrap adm-tbl"><table class="tbl pv"><thead><tr><th>${esc(rowsLabel)}</th>${cols.map(c => `<th class="num">${esc(c)}</th>`).join('')}<th class="num">Total</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${esc(r.l)}</b></td>${r.cells.map(v => `<td class="num pv-c" style="${v ? `background:color-mix(in srgb, ${color} ${Math.round(14 + v / mx * 62)}%, #fff);` : ''}">${v || '<span class="muted">·</span>'}</td>`).join('')}<td class="num"><b>${r.cells.reduce((a, b) => a + b, 0)}</b></td></tr>`).join('')}</tbody><tfoot><tr><td>Total</td>${colT.map(v => `<td class="num">${v}</td>`).join('')}<td class="num">${colT.reduce((a, b) => a + b, 0)}</td></tr></tfoot></table></div>`;
  }
  // ---- delivery tracker: one track per project, filled to the stage reached, with RAG and planned end
  function tracker(list, STAGES) {
    if (!list.length) return none('No active projects yet.');
    return `<div class="trk">${list.map(p => { const r = rag(p), dl = left(p); return `<div class="trk-r click" data-act="admDetail" data-id="${esc(p.id)}" role="button" tabindex="0"><div class="trk-n"><i class="rg ${r.k}" title="${RN[r.k]}"></i><b>${esc(p.name)}</b><span class="xs muted">${esc(p.customer || '')}</span></div><div class="trk-t" aria-label="Stage ${p.stage} of 6: ${esc(STAGES[p.stage])}">${[1, 2, 3, 4, 5, 6].map(i => `<s class="${i <= p.stage ? 'on' : ''}${i === p.stage + 1 ? ' next' : ''}"></s>`).join('')}<u style="left:${Math.max(0, Math.min(100, p.stage / 6 * 100))}%"></u></div><div class="trk-s"><b>${esc(STAGES[p.stage])}</b><span class="xs ${dl !== null && dl < 0 && p.stage < 6 ? 'bad' : 'muted'}">${p.stage === 6 ? 'Live' : dl === null ? 'No end date' : dl < 0 ? Math.abs(dl) + ' days late' : dl + ' days left'}</span></div></div>`; }).join('')}</div>`;
  }
  // ---- RAG board: counts plus the projects in each colour, with the reason
  function ragBoard(act) {
    const g = { r: [], a: [], g: [] }; act.forEach(p => { const r = rag(p); g[r.k].push([p, r]); });
    return `<div class="rag">${['r', 'a', 'g'].map(k => `<div class="rag-c ${k}"><div class="rag-h"><i style="background:${RC[k]}"></i><b>${RN[k]}</b><span>${g[k].length}</span></div>${g[k].length ? `<ul>${g[k].slice(0, 6).map(([p, r]) => `<li class="click" data-act="admDetail" data-id="${esc(p.id)}" role="button" tabindex="0"><b>${esc(p.name)}</b><span>${esc(r.why.slice(0, 2).join(' · '))}</span></li>`).join('')}${g[k].length > 6 ? `<li class="more">+${g[k].length - 6} more</li>` : ''}</ul>` : '<div class="rag-z">None</div>'}</div>`).join('')}</div>`;
  }
  const ragSplit = act => { const c = { r: 0, a: 0, g: 0 }; act.forEach(p => { c[rag(p).k]++; }); return c; };
  const short = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

  function extra(tab, X) {
    const A = X.A, act = A.data.projects.filter(p => !p.archived), ST = X.STAGES; if (!act.length) return '';
    const sp = ragSplit(act); const ragParts = [{ l: 'Green', v: sp.g, c: RC.g }, { l: 'Amber', v: sp.a, c: RC.a }, { l: 'Red', v: sp.r, c: RC.r }];
    if (tab === 'overview') {
      const d = A.data; const wk = d.weekly || [], mo = d.monthly || [];
      const byStage = ST.map((nm, i) => { const g = act.filter(p => p.stage === i); const c = { r: 0, a: 0, g: 0 }; g.forEach(p => { c[rag(p).k]++; }); return { l: nm, parts: [{ v: c.g, c: RC.g, n: 'Green' }, { v: c.a, c: RC.a, n: 'Amber' }, { v: c.r, c: RC.r, n: 'Red' }] }; });
      return `<h2 class="adm-sec">Portfolio insights</h2>
      <div class="sp-row">${spark('Platform activity', wk.map(w => w.n), wk.map(w => w.week.slice(5)), '#1570EF', 'actions')}${spark('New projects', mo.map(m => m.n), mo.map(m => m.month), '#E5197F', 'projects')}${spark('Open actions', [act.reduce((a, p) => a + p.openActions, 0)], null, '#12A594', 'open')}${spark('Overdue actions', [act.reduce((a, p) => a + p.overdue, 0)], null, '#D92D6A', 'overdue')}</div>
      <div class="adm-row two">${card('Portfolio RAG', 'Red late or blocked · Amber needs a nudge · Green on track', ragBoard(act), 'rag-card')}${card('RAG split', act.length + ' active projects', donut(ragParts, act.length, 'projects'))}</div>
      ${card('Where projects sit, by RAG', 'Stacked by stage', stack(byStage, [['Green', RC.g], ['Amber', RC.a], ['Red', RC.r]]))}`;
    }
    if (tab === 'delivery') {
      const cust = {}; act.forEach(p => { const k = (p.customer || '—').trim() || '—'; (cust[k] = cust[k] || ST.map(() => 0))[p.stage]++; });
      const rows = Object.keys(cust).map(k => ({ l: short(k, 28), cells: cust[k] })).sort((a, b) => b.cells.reduce((x, y) => x + y, 0) - a.cells.reduce((x, y) => x + y, 0));
      const work = act.filter(p => p.openActions || p.blocked).sort((a, b) => (b.overdue + b.blocked) - (a.overdue + a.blocked) || b.openActions - a.openActions).slice(0, 10).map(p => ({ l: short(p.name, 26), go: ['admDetail', p.id], parts: [{ v: Math.max(0, p.openActions - p.overdue - p.blocked), c: '#1570EF', n: 'On track' }, { v: p.overdue, c: RC.r, n: 'Overdue' }, { v: p.blocked, c: RC.a, n: 'Blocked' }] }));
      const trk = act.slice().sort((a, b) => b.stage - a.stage || a.name.localeCompare(b.name)).slice(0, 14);
      return `<h2 class="adm-sec">Delivery insights</h2>
      ${card('Delivery tracker', 'Stage reached and time to planned end', tracker(trk, ST))}
      <div class="adm-row two">${card('Customers by stage', 'Pivot: projects per customer and stage', pivot('Customer', ST.map(s => s.replace('Not started', 'New')), rows, '#1570EF'))}${card('Delivery RAG', 'Active projects', `${donut(ragParts, act.length, 'projects')}`)}</div>
      ${card('Open work by project', 'Stacked: on track, overdue, blocked', stack(work, [['On track', '#1570EF'], ['Overdue', RC.r], ['Blocked', RC.a]]))}`;
    }
    if (tab === 'customers') {
      const m = {}; act.forEach(p => { const k = (p.customer || '—').trim() || '—'; const c = m[k] = m[k] || { n: k, r: 0, a: 0, g: 0, req: 0, act: 0, q: 0 }; c[rag(p).k]++; c.req += p.requirements; c.act += p.openActions; c.q += p.openFeedback; });
      const rows = Object.values(m).sort((a, b) => (b.r + b.a + b.g) - (a.r + a.a + a.g)).slice(0, 12);
      return `<h2 class="adm-sec">Customer insights</h2>
      <div class="adm-row two">${card('Customer health (RAG)', 'Stacked by project', stack(rows.map(c => ({ l: short(c.n, 26), go: ['admCust', ''], parts: [{ v: c.g, c: RC.g, n: 'Green' }, { v: c.a, c: RC.a, n: 'Amber' }, { v: c.r, c: RC.r, n: 'Red' }] })), [['Green', RC.g], ['Amber', RC.a], ['Red', RC.r]]))}${card('Portfolio RAG', 'All customers', donut(ragParts, act.length, 'projects'))}</div>
      ${card('Customer workload', 'Pivot: requirements, open actions and open questions', pivot('Customer', ['Projects', 'Requirements', 'Open actions', 'Open questions'], rows.map(c => ({ l: short(c.n, 30), cells: [c.r + c.a + c.g, c.req, c.act, c.q] })), '#14a8a8'))}`;
    }
    if (tab === 'usage') {
      const i = A.ins; if (!i) return '';
      const own = {}; act.forEach(p => { const o = X.ownerName(p.owners); const x = own[o] = own[o] || { g: 0, a: 0, r: 0 }; x[rag(p).k]++; });
      const rows = Object.keys(own).map(k => ({ l: short(k, 26), parts: [{ v: own[k].g, c: RC.g, n: 'Green' }, { v: own[k].a, c: RC.a, n: 'Amber' }, { v: own[k].r, c: RC.r, n: 'Red' }] })).sort((a, b) => b.parts.reduce((x, y) => x + y.v, 0) - a.parts.reduce((x, y) => x + y.v, 0)).slice(0, 10);
      const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; const perDay = dow.map(() => 0); (i.heat || []).forEach(c => { perDay[c.d] += c.n; });
      const hrs = ['Night 0-6', 'Morning 6-12', 'Afternoon 12-18', 'Evening 18-24']; const pv = [1, 2, 3, 4, 5, 6, 0].map(d => ({ l: dow[d], cells: hrs.map((_, b) => (i.heat || []).filter(c => c.d === d && c.h >= b * 6 && c.h < b * 6 + 6).reduce((a, c) => a + c.n, 0)) }));
      return `<h2 class="adm-sec">Team insights</h2>
      <div class="sp-row">${spark('Staff active per day', i.daily.map(d => d.staff), i.daily.map(d => d.day.slice(5)), '#1570EF', 'people')}${spark('Customer visits per day', i.daily.map(d => d.customers), i.daily.map(d => d.day.slice(5)), '#6B4EE6', 'visits')}${spark('Sign-ups per week', i.signups.map(w => w.staff + w.guests), i.signups.map(w => w.week.slice(5)), '#E5197F', 'accounts')}</div>
      <div class="adm-row two">${card('Project health by owner', 'Stacked RAG', stack(rows, [['Green', RC.g], ['Amber', RC.a], ['Red', RC.r]]))}${card('Activity by day and time', 'Pivot: recorded sessions', pivot('Day', hrs, pv, '#1570EF'))}</div>`;
    }
    if (tab === 'quality') {
      const i = A.ins; if (!i) return '';
      const kinds = [['action', 'Actions'], ['raid', 'Risks & issues'], ['uat', 'UAT cases']]; const cls = s => /done|closed|signed|resolved|passed|mitigated/i.test(s) ? 'done' : /block|fail|overdue|open|rejected/i.test(s) ? 'bad' : 'wip';
      const rows = kinds.map(([k, nm]) => { const c = { done: 0, wip: 0, bad: 0 }; i.items.filter(r => r.kind === k).forEach(r => { c[cls(String(r.st || ''))] += r.n; }); return { l: nm, parts: [{ v: c.done, c: RC.g, n: 'Done' }, { v: c.wip, c: '#1570EF', n: 'In progress' }, { v: c.bad, c: RC.r, n: 'Open or failing' }] }; });
      const mat = act.slice().sort((a, b) => b.requirements - a.requirements).slice(0, 12).map(p => ({ l: short(p.name, 28), cells: [p.requirements, p.flows, p.openActions, p.raidOpen || 0, p.uat || 0, p.signed || 0] }));
      const q = i.feedback.weekly || [];
      return `<h2 class="adm-sec">Quality insights</h2>
      <div class="sp-row">${spark('New customer questions', q.map(w => w.n), q.map(w => w.week.slice(5)), '#E5197F', 'questions')}${spark('Storage added per month', i.storage.map(m => Math.round(m.bytes / 1e5) / 10), i.storage.map(m => m.month), '#12A594', 'MB')}</div>
      <div class="adm-row two">${card('Records by state', 'Stacked: done, in progress, open or failing', stack(rows, [['Done', RC.g], ['In progress', '#1570EF'], ['Open or failing', RC.r]]))}${card('Quality RAG', 'Same rule as the portfolio', donut(ragParts, act.length, 'projects'))}</div>
      ${card('Project records matrix', 'Pivot: what each project has captured (top 12)', pivot('Project', ['Requirements', 'State flows', 'Open actions', 'Open risks', 'UAT cases', 'Sign-offs'], mat, '#6B4EE6'))}`;
    }
    return '';
  }
  V.admViz = { extra, rag, spark, donut, stack, pivot, tracker };
})(typeof window !== 'undefined' ? window : globalThis);

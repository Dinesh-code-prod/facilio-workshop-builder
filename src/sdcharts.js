/* Small chart primitives for the stage dashboards (V.sdc): donut, gauge, sparkline, stacked bar, heat map, funnel, RAG chip and checklist.
   Pure SVG / HTML strings styled by the `sd-` classes in src/ui.css (coss tokens, light theme). Every function takes numbers already computed
   from saved records and draws them; none invents data, and an empty input draws an empty state, not a fake chart. */
(function (root) {
  'use strict';
  const F = root.FWB; const V = root.FWBViews; if (!F || !V) return;
  const esc = F.esc;
  const RAG = { g: ['Green', '#22c55e'], a: ['Amber', '#f59e0b'], r: ['Red', '#ef4444'], n: ['No data', '#a3a3a3'] };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const none = t => `<p class="sd-none">${esc(t)}</p>`;
  const legend = parts => { const T = parts.reduce((n, p) => n + (typeof p[1] === 'number' ? p[1] : 0), 0), pc = p => (typeof p[1] === 'number' && T > 0 && parts.length > 1 ? `<em>${Math.round(p[1] * 100 / T)}%</em>` : ''); return `<ul class="sd-lg">${parts.map(p => `<li><i style="background:${p[2]}"></i><span>${esc(p[0])}</span><b>${p[1]}</b>${pc(p)}</li>`).join('')}</ul>`; };   // each part also shows its share

  // ring chart: parts = [[label, n, colour]]; the centre shows `center` with a small `sub` line
  function donut(parts, center, sub, empty) {
    const tot = parts.reduce((n, p) => n + p[1], 0); if (!tot) return none(empty || 'Nothing recorded yet.');
    const r = 40, c = 2 * Math.PI * r; let off = 0; const many = parts.filter(p => p[1]).length > 1;
    const segs = parts.filter(p => p[1]).map(p => { const len = c * p[1] / tot, g = many ? Math.min(2.5, len / 3) : 0; const s = `<circle cx="50" cy="50" r="${r}" fill="none" stroke="${p[2]}" stroke-width="11" stroke-dasharray="${Math.max(0, len - g).toFixed(1)} ${(c - Math.max(0, len - g)).toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}" transform="rotate(-90 50 50)"><title>${esc(p[0])}: ${p[1]}</title></circle>`; off += len; return s; }).join('');
    return `<div class="sd-dn"><svg viewBox="0 0 100 100" width="132" height="132" role="img" aria-label="${esc(parts.map(p => p[0] + ' ' + p[1]).join(', '))}"><circle cx="50" cy="50" r="${r}" fill="none" stroke="rgba(0,0,0,.06)" stroke-width="11"/>${segs}<text x="50" y="52" text-anchor="middle" font-size="19" font-weight="600" fill="#0a0a0a">${esc(String(center))}</text>${sub ? `<text x="50" y="65" text-anchor="middle" font-size="6.5" fill="#737373">${esc(sub)}</text>` : ''}</svg>${legend(parts)}</div>`;
  }

  // half-circle gauge: value 0..100 (or null for no data), big label in the middle, caption below
  function gauge(v, big, caption, col, empty) {
    if (v == null || isNaN(v)) return none(empty || 'Not enough recorded to draw this.');
    const val = clamp(v, 0, 100), len = Math.PI * 50;
    return `<div class="sd-gz"><svg viewBox="0 0 120 70" width="200" height="117" role="img" aria-label="${esc(caption || '')} ${Math.round(val)}%"><path d="M10 62 A50 50 0 0 1 110 62" fill="none" stroke="rgba(0,0,0,.07)" stroke-width="11" stroke-linecap="round"/><path d="M10 62 A50 50 0 0 1 110 62" fill="none" stroke="${col || '#3b82f6'}" stroke-width="11" stroke-linecap="round" stroke-dasharray="${(len * val / 100).toFixed(1)} ${len.toFixed(1)}"/><text x="60" y="54" text-anchor="middle" font-size="19" font-weight="600" fill="#0a0a0a">${esc(String(big))}</text></svg><span>${esc(caption || '')}</span></div>`;
  }

  // sparkline of a series of numbers; labels = [first, last] captions under the line
  function spark(vals, col, labels, unit) {
    if (!vals || vals.length < 2) return none('Needs at least two dated points.');
    const W = 260, H = 64, mx = Math.max(1, ...vals), px = i => 4 + i / (vals.length - 1) * (W - 8), py = v => H - 6 - v / mx * (H - 14);
    const pts = vals.map((v, i) => px(i).toFixed(1) + ',' + py(v).toFixed(1)).join(' '); const last = vals[vals.length - 1];
    return `<div class="sd-sp"><svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" role="img" aria-label="${esc((unit || 'Trend') + ': from ' + vals[0] + ' to ' + last)}"><polygon points="${px(0).toFixed(1)},${H - 6} ${pts} ${px(vals.length - 1).toFixed(1)},${H - 6}" fill="${col}" opacity=".12"/><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>${labels ? `<div class="sd-spl"><span>${esc(labels[0])}</span><b>${last} ${esc(unit || '')}</b><span>${esc(labels[1])}</span></div>` : ''}</div>`;
  }

  // one stacked horizontal bar with a legend
  function stack(parts, empty) {
    const tot = parts.reduce((n, p) => n + p[1], 0); if (!tot) return none(empty || 'Nothing recorded yet.');
    return `<div class="sd-stk" role="img" aria-label="${esc(parts.map(p => p[0] + ' ' + p[1]).join(', '))}">${parts.filter(p => p[1]).map(p => `<i style="flex:${p[1]};background:${p[2]}" title="${esc(p[0])}: ${p[1]}"></i>`).join('')}</div>${legend(parts)}`;
  }

  // stacked columns: labels = one per column, series = [[name, colour]], rows[i][j] = the count of series j in column i. Gridlines and a small axis; every segment has a tooltip.
  const niceStep = m => { const p = Math.pow(10, Math.floor(Math.log10(Math.max(1, m) / 4))), r = Math.max(1, m) / 4 / p; return Math.max(1, (r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10) * p); };
  function columns(labels, series, rows, empty) {
    const tot = rows.reduce((n, r) => n + r.reduce((a, b) => a + b, 0), 0); if (!tot) return none(empty || 'Nothing recorded yet.');
    const W = 440, H = 196, L = 30, B = 26, T = 10, mx = Math.max(1, ...rows.map(r => r.reduce((a, b) => a + b, 0))), step = niceStep(mx), top = Math.ceil(mx / step) * step, gx = (W - L - 6) / rows.length, bw = Math.min(36, gx * 0.58); let g = '', bars = '';
    for (let v = 0; v <= top; v += step) { const y = T + (H - T - B) * (1 - v / top); g += `<line x1="${L}" x2="${W}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(0,0,0,.07)"/><text x="${L - 6}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#737373">${v}</text>`; }
    rows.forEach((r, i) => { let y = H - B; const x = L + gx * i + (gx - bw) / 2; r.forEach((n, j) => { if (!n) return; const h = (H - T - B) * n / top; y -= h; bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, h - 1).toFixed(1)}" rx="3" fill="${series[j][1]}"><title>${esc(labels[i])}: ${esc(series[j][0])} ${n}</title></rect>`; }); bars += `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 9}" text-anchor="middle" font-size="9" fill="#737373">${esc(labels[i])}</text>`; });
    return `<div class="sd-cols"><svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(series.map((s, j) => s[0] + ' ' + rows.reduce((n, r) => n + r[j], 0)).join(', '))}">${g}${bars}</svg>${legend(series.map((s, j) => [s[0], rows.reduce((n, r) => n + r[j], 0), s[1]]))}</div>`;
  }

  // line / area chart with several series: labels = x captions, series = [{ name, color, values }], opt = { max, unit, marks: [{ i, v, label, color }], today: index of a vertical marker }. Flat translucent area under each line.
  function line(labels, series, opt) {
    opt = opt || {}; const all = series.flatMap(s => s.values); if (!all.some(v => v > 0) && !(opt.marks || []).length) return none(opt.empty || 'Nothing recorded in this period.');
    const W = 560, H = 214, L = 34, R = 12, T = 14, B = 28, n = labels.length, mx = opt.max || Math.max(1, ...all), step = opt.max ? 25 : niceStep(mx), top = Math.ceil(mx / step) * step, px = i => L + (n < 2 ? 0 : i / (n - 1)) * (W - L - R), py = v => T + (H - T - B) * (1 - v / top), unit = opt.unit || '';
    let g = ''; for (let v = 0; v <= top; v += step) { const y = py(v); g += `<line x1="${L}" x2="${W - R}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(0,0,0,.07)"/><text x="${L - 6}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#737373">${v}${unit}</text>`; }
    const every = Math.max(1, Math.ceil(n / 7)); let xs = ''; labels.forEach((l, i) => { if (i % every === 0 || i === n - 1) xs += `<text x="${px(i).toFixed(1)}" y="${H - 9}" text-anchor="middle" font-size="9" fill="#737373">${esc(l)}</text>`; });
    const lines = series.map(s => { const pts = s.values.map((v, i) => px(i).toFixed(1) + ',' + py(v).toFixed(1)); const last = s.values.length - 1, hi = Math.max(...s.values); return `<polygon points="${px(0).toFixed(1)},${py(0).toFixed(1)} ${pts.join(' ')} ${px(last).toFixed(1)},${py(0).toFixed(1)}" fill="${s.color}" opacity=".10"/><polyline points="${pts.join(' ')}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>${s.values.map((v, i) => ((i === last || (v === hi && v > 0)) ? `<circle cx="${px(i).toFixed(1)}" cy="${py(v).toFixed(1)}" r="3.2" fill="#fff" stroke="${s.color}" stroke-width="2"><title>${esc(s.name)} ${esc(labels[i])}: ${v}${unit}</title></circle>` : '')).join('')}`; }).join('');
    const td = opt.today != null ? `<line x1="${px(opt.today).toFixed(1)}" x2="${px(opt.today).toFixed(1)}" y1="${T}" y2="${H - B}" stroke="#ef4444" stroke-dasharray="3 3" stroke-width="1.2"/><text x="${px(opt.today).toFixed(1)}" y="${T - 3}" text-anchor="middle" font-size="9" fill="#ef4444">today</text>` : '';
    const mk = (opt.marks || []).map(m => `<circle cx="${px(m.i).toFixed(1)}" cy="${py(m.v).toFixed(1)}" r="5" fill="${m.color}" stroke="#fff" stroke-width="2"/><text x="${(px(m.i) - 8).toFixed(1)}" y="${(py(m.v) - 9).toFixed(1)}" text-anchor="end" font-size="10" font-weight="600" fill="${m.color}">${esc(m.label)}</text>`).join('');
    return `<div class="sd-ln"><svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(series.map(s => s.name).join(', '))}">${g}${xs}${td}${lines}${mk}</svg>${legendNames(series.map(s => [s.name, s.color]).concat((opt.marks || []).map(m => [m.label, m.color])))}</div>`;
  }
  const legendNames = parts => `<ul class="sd-lg sd-lgl">${parts.map(p => `<li><i style="background:${p[1]}"></i><span>${esc(p[0])}</span></li>`).join('')}</ul>`;

  // plan timeline (gantt): rows = [{ l, s, e, st: done|prog|late|todo }] with ISO dates; today is a dashed marker
  function gantt(rows, today, empty) {
    const r = rows.filter(x => x.s && x.e); if (!r.length) return none(empty || 'No dated plan steps yet.'); const MS = 864e5, d = x => Date.parse(x + 'T00:00:00Z'); const t0 = Math.min(...r.map(x => d(x.s))), t1 = Math.max(...r.map(x => d(x.e)), d(today)), span = Math.max(MS * 7, t1 - t0);
    const COL = { done: '#22c55e', prog: '#3b82f6', late: '#ef4444', todo: '#cbd5e1' }, pc = ms => ((ms - t0) / span * 100).toFixed(2);
    const ticks = []; for (let i = 0; i <= 5; i++) { const ms = t0 + span * i / 5; ticks.push(`<span style="left:${(i * 20)}%">${new Date(ms).toLocaleDateString('en', { day: 'numeric', month: 'short', timeZone: 'UTC' })}</span>`); }
    return `<div class="sd-gn" role="img" aria-label="Plan timeline"><div class="sd-gt"><b></b><div class="sd-gx">${ticks.join('')}</div></div>${r.map(x => `<div class="sd-gr"><b title="${esc(x.l)}">${esc(x.l)}</b><div class="sd-gb"><i style="left:${pc(d(x.s))}%;width:${Math.max(1.2, (d(x.e) - d(x.s)) / span * 100).toFixed(2)}%;background:${COL[x.st] || COL.todo}" title="${esc(x.l)}: ${esc(x.s)} to ${esc(x.e)}"></i><u style="left:${pc(d(today))}%"></u></div></div>`).join('')}${legendNames([['Done', COL.done], ['In progress', COL.prog], ['Late', COL.late], ['Not started', COL.todo]])}</div>`;
  }

  // small trend bars for a KPI tile
  const minibars = (vals, col) => { const mx = Math.max(1, ...vals), w = 100 / vals.length; return `<svg class="sd-ksp" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">${vals.map((v, i) => `<rect x="${(i * w + w * .16).toFixed(1)}" y="${(26 - Math.max(v ? 3 : 1.2, v / mx * 24)).toFixed(1)}" width="${(w * .68).toFixed(1)}" height="${Math.max(v ? 3 : 1.2, v / mx * 24).toFixed(1)}" rx="1.6" fill="${col}" opacity="${i === vals.length - 1 ? 1 : .45}"/>`).join('')}</svg>`; };

  // heat map: rows = [label], cols = [[label, colour]], cells[r][c] = number; the stronger the colour, the bigger the number
  function heat(rows, cols, cells, empty) {
    const mx = Math.max(0, ...cells.flat()); if (!rows.length || !mx) return none(empty || 'Nothing to compare yet.');
    return `<div class="sd-hm" style="--n:${cols.length}" role="table"><div class="sd-hmh" role="row"><span></span>${cols.map(c => `<span role="columnheader">${esc(c[0])}</span>`).join('')}</div>${rows.map((r, i) => `<div class="sd-hmr" role="row"><span role="rowheader">${esc(r)}</span>${cols.map((c, j) => { const n = cells[i][j]; return `<b role="cell" class="${n ? '' : 'z'}" style="--c:${c[1]};--a:${n ? (0.18 + 0.72 * n / mx).toFixed(2) : 0}" title="${esc(r + ' · ' + c[0] + ': ' + n)}">${n || ''}</b>`; }).join('')}</div>`).join('')}</div>`;
  }

  // funnel: rows = [label, n, colour]; the bar width is n against the largest
  function funnel(rows, empty) {
    const mx = Math.max(0, ...rows.map(r => r[1])); if (!mx) return none(empty || 'No projects yet.');
    return `<ul class="sd-fn">${rows.map(([l, n, c]) => `<li><span>${esc(l)}</span><i><u style="width:${Math.max(3, n / mx * 100).toFixed(1)}%;background:${c}"></u></i><b>${n}</b></li>`).join('')}</ul>`;
  }

  // RAG chip: state g|a|r|n
  const rag = (s, text) => `<span class="sd-rag ${s}" style="--c:${(RAG[s] || RAG.n)[1]}"><i></i>${esc(text || (RAG[s] || RAG.n)[0])}</span>`;
  const worst = list => (list.includes('r') ? 'r' : list.includes('a') ? 'a' : list.includes('g') ? 'g' : 'n');

  // checklist with RAG: items = [{ l, s: g|a|r|n, d }]
  function checklist(items, empty) {
    if (!items.length) return none(empty || 'Nothing to check yet.');
    const ic = { g: '✓', a: '!', r: '✕', n: '–' };
    return `<ul class="sd-ck">${items.map(x => `<li class="${x.s}${x.v ? ' sd-click' : ''}"${x.v ? ` data-act="nav" data-view="${esc(x.v)}" role="link" tabindex="0" title="Open where this is fixed"` : ''}><span class="sd-ci" style="--c:${(RAG[x.s] || RAG.n)[1]}" aria-hidden="true">${ic[x.s] || '–'}</span><div><b>${esc(x.l)}</b>${x.d ? `<small>${esc(x.d)}</small>` : ''}</div>${rag(x.s)}</li>`).join('')}</ul>`;
  }

  V.sdc = { RAG, donut, gauge, columns, line, gantt, minibars, spark, stack, heat, funnel, rag, worst, checklist, none, legend };
})(typeof window !== 'undefined' ? window : globalThis);

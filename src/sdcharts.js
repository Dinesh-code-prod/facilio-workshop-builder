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
  const legend = parts => `<ul class="sd-lg">${parts.map(p => `<li><i style="background:${p[2]}"></i><span>${esc(p[0])}</span><b>${p[1]}</b></li>`).join('')}</ul>`;

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
    return `<ul class="sd-ck">${items.map(x => `<li class="${x.s}"><span class="sd-ci" style="--c:${(RAG[x.s] || RAG.n)[1]}" aria-hidden="true">${ic[x.s] || '–'}</span><div><b>${esc(x.l)}</b>${x.d ? `<small>${esc(x.d)}</small>` : ''}</div>${rag(x.s)}</li>`).join('')}</ul>`;
  }

  V.sdc = { RAG, donut, gauge, spark, stack, heat, funnel, rag, worst, checklist, none, legend };
})(typeof window !== 'undefined' ? window : globalThis);

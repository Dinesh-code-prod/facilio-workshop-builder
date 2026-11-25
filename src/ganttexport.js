/* Plan timeline export (user, 24 Nov 2026: "export the Gantt chart in Excel and HTML as well"): the rows of the plan timeline (plan_struct) as
   one self-contained HTML page (a task table and a Gantt by week, today line, milestones, phases, legend; no outside requests) and the week grid
   the Excel export fills (src/timeline.js ACT.tlXlsx). Pure code, tested by tests/gantt_export.mjs. Nothing is invented: a row without dates is listed, not drawn. */
(function (root) {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const day = d => (/^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) ? String(d) : '');
  const ms = d => Date.parse(d + 'T00:00:00Z');
  const iso = t => new Date(t).toISOString().slice(0, 10);
  const monday = d => { const t = ms(d); const w = (new Date(t).getUTCDay() + 6) % 7; return iso(t - w * 864e5); };
  const pct = r => (r.status === 'Done' ? 100 : Math.max(0, Math.min(100, Number(r.pct) || 0)));
  const OWN = { Facilio: ['#1570EF', '#D1E9FF'], Customer: ['#EF6820', '#FDEAD7'], Both: ['#0E9384', '#CCFBEF'] };
  const fmt = d => (d ? new Date(ms(d)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');
  const mon = d => new Date(ms(d)).toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  // the weeks the dated rows span, Monday by Monday, at most two years
  function weeks(rows) {
    const ds = (Array.isArray(rows) ? rows : []).flatMap(r => [day(r.start), day(r.end) || day(r.start)]).filter(Boolean).sort(); if (!ds.length) return [];
    const out = []; for (let t = ms(monday(ds[0])), last = ms(ds[ds.length - 1]); t <= last && out.length < 104; t += 7 * 864e5) out.push(iso(t)); return out;
  }
  function build(rows, o) {
    o = o || {}; rows = Array.isArray(rows) ? rows : []; const names = Object.assign({ Facilio: 'Facilio', Customer: 'Customer', Both: 'Both' }, o.names || {});
    const W = weeks(rows); const today = day(o.today) || iso(Date.now()); const cw = 26, pxd = cw / 7; const t0 = W.length ? ms(W[0]) : 0;
    const x = d => Math.round((ms(d) - t0) / 864e5 * pxd); const span = W.length * cw;
    const newMonth = i => i === 0 || W[i].slice(5, 7) !== W[i - 1].slice(5, 7);
    const head = W.map((w, i) => `<th class="wk${newMonth(i) && i ? ' m' : ''}" title="Week of ${esc(fmt(w))}">${newMonth(i) ? esc(mon(w)) : ''}</th>`).join('');
    const tx = W.length && today >= W[0] && ms(today) < ms(W[W.length - 1]) + 7 * 864e5 ? x(today) : -1;
    // a phase without its own dates is drawn over the span of its dated tasks (as the app draws it); its date cells stay empty
    const span0 = r => { if (!r.isPhase || day(r.start)) return [day(r.start), day(r.end) || day(r.start)]; const ds = rows.filter(k => !k.isPhase && k.phase === r.title).flatMap(k => [day(k.start), day(k.end) || day(k.start)]).filter(Boolean).sort(); return ds.length ? [ds[0], ds[ds.length - 1]] : ['', '']; };
    const row = r => {
      const [s, e] = span0(r); const own = OWN[r.owner] ? r.owner : 'Facilio'; const [c, bg] = OWN[own]; const late = !r.isPhase && !!s && e < today && pct(r) < 100;
      const w = Math.max(4, x(e) - x(s) + Math.round(pxd));
      const mark = !s || !W.length ? '' : r.isPhase ? `<i class="ph" style="left:${x(s)}px;width:${w}px"></i>`
        : r.ms ? `<i class="mk" style="left:${x(s) - 5}px;background:${c}" title="${esc(fmt(s))}"></i>`
        : `<i class="br" style="left:${x(s)}px;width:${w}px;background:${bg}"><b style="width:${pct(r)}%;background:${c}"></b></i>`;
      return `<tr class="${r.isPhase ? 'phr' : ''}${late ? ' late' : ''}"><td class="t">${r.isPhase ? '' : '<span class="in"></span>'}${esc(r.title || 'Untitled')}</td><td>${r.isPhase ? '' : esc(names[own])}</td><td class="n">${esc(fmt(r.isPhase ? day(r.start) : s))}</td><td class="n">${esc(fmt(r.isPhase ? day(r.end) : e))}</td><td>${r.isPhase ? '' : esc(r.status || 'Not started') + (late ? ' · late' : '')}</td><td class="n">${r.isPhase ? '' : pct(r) + '%'}</td><td class="g" colspan="${Math.max(1, W.length)}"><div class="gl" style="width:${span}px">${tx >= 0 ? `<s style="left:${tx}px"></s>` : ''}${mark}</div></td></tr>`;
    };
    const tasks = rows.filter(r => !r.isPhase), nDated = tasks.filter(r => day(r.start)).length;
    const css = 'body{font:14px/1.45 Inter,system-ui,-apple-system,Segoe UI,sans-serif;color:#0F172A;margin:24px;background:#fff}h1{font-size:24px;margin:0 0 4px}p.m{color:#475569;margin:0 0 16px}'
      + '.lg{display:flex;flex-wrap:wrap;gap:6px 18px;margin:0 0 12px;color:#475569;font-size:13px}.lg i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-1px}'
      + '.wrap{overflow-x:auto;border:1px solid #E2E8F0;border-radius:12px}table{border-collapse:collapse;font-size:13px}th,td{padding:6px 10px;border-bottom:1px solid #E2E8F0;white-space:nowrap;text-align:left;vertical-align:middle}'
      + 'th{background:#F8FAFC;color:#475569;font-weight:600}th.wk{width:' + cw + 'px;min-width:' + cw + 'px;max-width:' + cw + 'px;padding:6px 0;font-size:11px;overflow:visible}th.wk.m{border-left:1px solid #CBD5E1}'
      + 'td.t{max-width:340px;overflow:hidden;text-overflow:ellipsis}td.n{font-variant-numeric:tabular-nums}.in{display:inline-block;width:14px}tr.phr td{background:#F1F5F9;font-weight:600}tr.late td.t{color:#B42318}'
      + 'td.g{padding:0}.gl{position:relative;height:30px}.gl s{position:absolute;top:0;bottom:0;width:2px;background:#1570EF;opacity:.55}'
      + '.br{position:absolute;top:8px;height:14px;border-radius:4px;overflow:hidden}.br b{position:absolute;left:0;top:0;bottom:0}.ph{position:absolute;top:11px;height:8px;border-radius:4px;background:#94A3B8}'
      + '.mk{position:absolute;top:10px;width:10px;height:10px;transform:rotate(45deg)}@media print{body{margin:8mm}.wrap{overflow:visible;border:0}}';
    const legend = `<div class="lg">${['Facilio', 'Customer', 'Both'].map(k => `<span><i style="background:${OWN[k][0]}"></i>${esc(names[k])}</span>`).join('')}<span><i style="background:#94A3B8"></i>Phase</span><span><i style="background:#1570EF;width:2px"></i>Today (${esc(fmt(today))})</span><span>&#9670; Milestone · the darker part of a bar is done</span></div>`;
    const title = (o.project ? o.project + ' · ' : '') + 'Project plan';
    const body = `<h1>${esc(title)}</h1><p class="m">${o.customer ? esc(o.customer) + ' · ' : ''}${nDated} of ${tasks.length} tasks dated · exported ${esc(fmt(today))} from Facilio Delivery Studio</p>${legend}`
      + `<div class="wrap"><table><thead><tr><th>Task</th><th>Owner</th><th>Start</th><th>End</th><th>Status</th><th>Done</th>${head || '<th></th>'}</tr></thead><tbody>${rows.map(row).join('')}</tbody></table></div>`;
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${css}</style></head><body>${body}</body></html>`;
  }
  // the Excel week grid: for each row, which week columns it covers
  function grid(rows) { rows = Array.isArray(rows) ? rows : []; const W = weeks(rows); return { weeks: W, cells: rows.map(r => { const s = day(r.start), e = day(r.end) || s; return W.map(w => !!s && ms(w) <= ms(e) && ms(w) + 6 * 864e5 >= ms(s)); }) }; }
  const api = { build, grid, weeks, OWN, pct, fmt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBGanttExport = api;
})(typeof window !== 'undefined' ? window : globalThis);

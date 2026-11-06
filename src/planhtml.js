/* Project plan as one self-contained HTML file (roadmap E15 Stage 1): timeline, Gantt chart, milestones with where each date comes from, and the assumptions, gaps and conflicts.
   Pure code (run by tests/plan_html.mjs); built from the stored `kickoff_pack` only, nothing invented. Uses the shared pageShell of src/kickoffhtml.js: system fonts, inline CSS, a policy that blocks every outside request.
   The app's own timeline and calendar views are not touched; this file draws its own static copy. */
(function (root) {
  'use strict';
  const arr = x => (Array.isArray(x) ? x : []);
  const K = () => root.FWBKickoffDeck || (typeof require === 'function' ? require('./kickoffhtml.js') : null);
  const ORIGIN = { contract: 'From the contract', interpreted: 'Interpreted from the contract', assumed: 'Facilio assumption', confirmed: 'Confirmed by a person' };
  const day = d => (/^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) ? String(d) : '');
  const ms = d => Date.parse(d + 'T00:00:00Z');
  const CSS = 'header.hd{background:#1D1A5E;color:#fff;border-radius:14px;padding:24px}header.hd h1{color:#fff}header.hd .meta{color:#8DB8FF}.st{display:inline-block;margin-top:8px;padding:3px 12px;border-radius:999px;background:#fff;color:#1D1A5E;font-weight:700;font-size:13px}'
    + '.tlw{display:grid;gap:0}.ti{display:grid;grid-template-columns:130px 1fr;gap:14px;padding:10px 0;border-left:3px solid #1570EF;margin-left:6px;padding-left:16px;position:relative}.ti:before{content:"";position:absolute;left:-9px;top:16px;width:15px;height:15px;border-radius:50%;background:#fff;border:3px solid #1570EF}.ti b{display:block}.ti .d{font-weight:700;color:#1570EF}'
    + '.gw{display:grid;gap:8px}.gr{display:grid;grid-template-columns:minmax(120px,220px) 1fr;gap:10px;align-items:center;font-size:14px}.gt{position:relative;height:22px;background:#F1F5FB;border-radius:11px}.gt i{position:absolute;top:0;height:22px;min-width:6px;border-radius:11px;background:#1570EF}.gt i.c{background:#1D1A5E}.gt i.a{background:#8DB8FF}'
    + '.or{display:inline-block;font-size:12px;padding:2px 8px;border-radius:999px;background:#EAF2FF;color:#1D1A5E;white-space:nowrap}.or.contract{background:#1D1A5E;color:#fff}.or.assumed{background:#F1F5FB;color:#4A5784}'
    + '.bad li{color:#E5197F}.leg{display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:#4A5784;margin-top:10px}.leg i{display:inline-block;width:14px;height:14px;border-radius:4px;vertical-align:-2px;margin-right:4px}@media(max-width:600px){.ti{grid-template-columns:1fr}.gr{grid-template-columns:1fr}}@media print{body{background:#fff}section{break-inside:avoid;box-shadow:none}}';
  /** pack: the stored kickoff_pack. o: { customer, project, fmt } */
  function build(pack, o) {
    const D = K(), esc = D.esc, p = pack && pack.plan || {}, w = p.window || {}, fmt = (o && o.fmt) || (x => x); const f = d => (day(d) ? esc(fmt(d)) : 'Date to confirm');
    const rows = arr(p.milestones).filter(m => m && day(m.start)).map(m => Object.assign({}, m, { end: day(m.end) && m.end >= m.start ? m.end : m.start })).sort((a, b) => a.start.localeCompare(b.start));
    const undated = arr(p.milestones).filter(m => m && !day(m.start)).map(m => m.name || m.id).filter(Boolean);   // never dropped without a word
    const t0 = rows.length ? rows[0].start : '', t1 = rows.length ? rows.map(m => day(m.end) || m.start).sort().slice(-1)[0] : '', span = t0 ? Math.max(1, (ms(t1) - ms(t0)) / 864e5 + 1) : 1;
    const orLabel = x => `<span class="or ${esc(x || 'assumed')}">${esc(ORIGIN[x] || ORIGIN.assumed)}</span>`;
    const timeline = rows.map(m => `<div class="ti"><div class="d">${f(m.start)}${day(m.end) && m.end !== m.start ? '<br>to ' + f(m.end) : ''}</div><div><b>${esc(m.name)}</b>${m.outcome ? `<div>${esc(m.outcome)}</div>` : ''}${orLabel(m.origin)}</div></div>`).join('');
    const gantt = rows.map(m => { const a = (ms(m.start) - ms(t0)) / 864e5, b = (ms(day(m.end) || m.start) - ms(t0)) / 864e5 + 1;
      return `<div class="gr"><span>${esc(m.name)}</span><div class="gt" role="img" aria-label="${esc(m.name)}: ${esc(m.start)} to ${esc(day(m.end) || m.start)}"><i class="${m.origin === 'contract' ? 'c' : m.origin === 'assumed' ? '' : 'a'}" style="left:${(a / span * 100).toFixed(2)}%;width:${Math.max(1, (b - a) / span * 100).toFixed(2)}%"></i></div></div>`; }).join('');
    const table = rows.map(m => `<tr><td>${esc(m.name)}</td><td>${f(m.start)}${day(m.end) && m.end !== m.start ? ' – ' + f(m.end) : ''}</td><td>${esc(m.responsible || '')}</td><td>${arr(m.deliverables).map(esc).join('<br>')}</td><td>${orLabel(m.origin)}</td></tr>`).join('');
    const list = (title, items, cls) => arr(items).length ? `<section><h2>${title}</h2><ul class="l ${cls || ''}">${arr(items).map(i => `<li>${esc(i && i.message ? i.message : i)}</li>`).join('')}</ul></section>` : '';
    const status = pack && pack.status === 'approved' ? 'Approved' + (pack.approvedAt ? ' ' + esc(fmt(String(pack.approvedAt).slice(0, 10))) : '') : 'Draft, not yet approved';
    const body = `<main><header class="hd"><h1>Project plan</h1><div class="meta">${esc((o && o.customer) || 'Customer')} × Facilio · ${esc((o && o.project) || '')}</div><div class="meta">${f(w.start)} to ${f(w.end)}${w.workingDays ? ' · ' + esc(w.workingDays) + ' working days' : ''}</div><span class="st">${status}</span></header>`
      + (rows.length ? `<section><h2>Timeline</h2><div class="tlw">${timeline}</div></section><section><h2>Gantt chart</h2><p class="note">${f(t0)} to ${f(t1)}</p><div class="gw">${gantt}</div><div class="leg"><span><i style="background:#1D1A5E"></i>Date in the contract</span><span><i style="background:#1570EF"></i>Facilio assumption</span><span><i style="background:#8DB8FF"></i>Interpreted from the contract</span></div></section>`
        + `<section><h2>Milestones</h2><div class="tw"><table><thead><tr><th>Phase</th><th>Dates</th><th>Who</th><th>Deliverables</th><th>Where it comes from</th></tr></thead><tbody>${table}</tbody></table></div></section>` : '<section><h2>No dated plan</h2><p>The plan has no dated phases yet.</p></section>')
      + list('Dates to confirm', undated.map(n => n + ': no valid date yet')) + list('Conflicts', p.conflicts, 'bad') + list('Missing from the contract', p.gaps) + list('Assumptions', p.assumptions)
      + '<p class="note">Only dates written in the contract are fixed. Everything else is Facilio’s suggestion until the customer confirms it.</p></main>';
    return D.pageShell({ title: ((o && o.customer) || 'Customer') + ' × Facilio: Project plan', css: CSS, body });
  }
  const api = { build };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBPlanHtml = api;
})(typeof window !== 'undefined' ? window : globalThis);

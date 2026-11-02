/* Customer introduction (prompt section 7): an optional, per-project, customer-safe page built from existing project data and exported as ONE standalone HTML file.
   facilio.work lets only Facilio staff sign in, so the customer receives the exported file (or prints it to PDF). Nothing internal is included unless ticked:
   no notes, RAID, AI drafts, other customers or fees. Stage status comes from recorded data (V.roadmapStages). */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const I = () => V.items;
  const { toast } = V;
  V.extraSections = (V.extraSections || []).concat(['custintro']);
  const D = () => { const d = F.doc('custintro'); d.include = d.include || { objectives: true, modules: true, roadmap: true, guides: false }; d.objectives = d.objectives || ''; d.welcome = d.welcome || ''; return d; };
  const canEdit = () => !V.isCustomer() && !S.readonly;
  const SEC = [['objectives', 'Objectives and scope summary'], ['modules', 'Modules in scope'], ['roadmap', 'Delivery roadmap with recorded status'], ['guides', 'Approved user guides (titles only)']];
  function data() {
    const p = S.project || {}; const d = D(); const mods = F.allModules().filter(m => m.inScope && !(V.controls && V.controls().hiddenModules || []).includes(m.name)).map(m => m.label || m.name).sort();
    const guides = I().list('ugd').filter(g => g.status === 'approved').map(g => g.title);
    return { p, d, mods, guides, stages: V.roadmapStages ? V.roadmapStages() : [] };
  }
  function pageHtml() {
    const { p, d, mods, guides, stages } = data(); const inc = d.include; const col = { none: '#98A2B3', progress: '#1570EF', done: '#027A48' }; const lab = { none: 'Not started', progress: 'In progress', done: 'Complete' };
    const dates = (p.startDate ? 'Start ' + V.fmtDate(p.startDate) : '') + (p.endDate ? (p.startDate ? ' · ' : '') + 'Go-live ' + V.fmtDate(p.endDate) : '');
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(p.customer || p.name)} — Facilio implementation</title><style>
:root{--text:#101828;--desc:#667085;--line:#E4E7EC;--blue:#1570EF}*{box-sizing:border-box}body{margin:0;font:15px/1.55 Roboto,Inter,system-ui,sans-serif;color:var(--text);background:#F8F9FB}main{max-width:860px;margin:0 auto;padding:32px 20px 60px}
h1{font-size:28px;margin:0 0 4px}h2{font-size:18px;margin:32px 0 10px}.sub{color:var(--desc)}.card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:16px 18px}.mods{display:flex;flex-wrap:wrap;gap:8px;padding:0;list-style:none}.mods li{background:#EEF4FF;color:#1058c9;border-radius:99px;padding:4px 12px;font-size:13px}
.st{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}.st .card{border-left:4px solid var(--c)}.st b{display:block}.st small{color:var(--desc)}footer{margin-top:40px;color:var(--desc);font-size:12px}@media print{body{background:#fff}}
</style></head><body><main><div class="sub">Facilio Delivery Studio</div><h1>${esc(p.customer || p.name)}</h1><div class="sub">${esc(p.name || '')}${dates ? ' · ' + esc(dates) : ''}</div>
${d.welcome ? `<p style="margin-top:18px">${esc(d.welcome).replace(/\n/g, '<br>')}</p>` : ''}
${inc.objectives && (d.objectives || p.description) ? `<h2>Objectives and scope</h2><div class="card">${esc(d.objectives || p.description).replace(/\n/g, '<br>')}</div>` : ''}
${inc.modules && mods.length ? `<h2>Modules in scope</h2><ul class="mods">${mods.map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
${inc.roadmap ? `<h2>Delivery roadmap</h2><div class="st">${stages.map((s, i) => `<div class="card" style="--c:${col[s.state]}"><b>${i + 1}. ${esc(s.name)}</b><small>${lab[s.state]}${s.detail ? ' · ' + esc(s.detail) : ''}</small></div>`).join('')}</div>` : ''}
${inc.guides && guides.length ? `<h2>User guides</h2><div class="card">${guides.map(g => `<div>${esc(g)}</div>`).join('')}</div>` : ''}
<footer>Prepared ${esc(V.fmtDate(new Date().toISOString()))} from the project record. Status shows only what has been recorded.</footer></main></body></html>`;
  }
  V.custintro = {
    html() {
      I().load(['scope', 'build', 'uat', 'checklist', 'ugd', 'hc', 'ho', 'close']); if (!I().ready(['ugd'])) return '<div class="page-body"><div class="muted" style="padding:20px">Loading…</div></div>';
      const d = D(); const can = canEdit(); const dis = can ? '' : 'disabled';
      return `<div class="page-header"><div class="t"><h1>Customer Introduction</h1><p>A customer-safe overview of this project: choose what to include, add a short welcome and objectives, preview it and export one HTML file to send (or print to PDF). Only what you tick is included; internal notes, risks, AI drafts, fees and other customers are never part of it.</p></div><div class="row"><button class="btn primary" data-act="ciExport">Export HTML</button></div></div>
      <div class="page-body"><div class="grid g2"><div class="card" style="padding:16px"><label class="f">Welcome message (optional)</label><textarea rows="3" data-bind="@custintro:welcome" data-change="ciRefresh" ${dis}>${esc(d.welcome)}</textarea><label class="f" style="margin-top:10px">Objectives and scope summary (defaults to the project description)</label><textarea rows="5" data-bind="@custintro:objectives" data-change="ciRefresh" ${dis}>${esc(d.objectives)}</textarea>
      <div style="margin-top:12px"><b class="small">Include</b>${SEC.map(([k, l]) => `<label class="row" style="gap:8px;margin-top:6px"><input type="checkbox" data-change="ciInc" data-k="${k}" ${d.include[k] ? 'checked' : ''} ${dis}> ${esc(l)}</label>`).join('')}</div></div>
      <div class="card" style="padding:0;overflow:hidden"><div class="card-h"><h3>Preview</h3></div><iframe title="Customer introduction preview" sandbox style="width:100%;height:560px;border:0" srcdoc="${esc(pageHtml())}"></iframe></div></div></div>`;
    }
  };
  ACT.ciInc = el => { if (!canEdit()) return; const d = D(); d.include[el.getAttribute('data-k')] = el.checked; F.changed('Customer introduction updated', el.getAttribute('data-k'), { section: 'custintro' }); };
  ACT.ciRefresh = () => setTimeout(() => V.render(), 60);
  ACT.ciExport = () => { const p = S.project || {}; V.download((p.customer || p.name || 'project').replace(/[^A-Za-z0-9 _-]/g, '') + ' - Delivery introduction.html', pageHtml(), 'text/html'); toast('Introduction exported'); };
})(typeof window !== 'undefined' ? window : globalThis);

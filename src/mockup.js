/* Stage 3, Mockup tab (roadmap E20): the prototype brief for Meteor, built ONLY from what the team has already applied or confirmed.
   Meteor (meteor.facilio.work, "From a PRD") reads a pasted spec of any length into a plan and builds a clickable Facilio prototype from the CMMS Demo Kit; "Connected App" is its own start option.
   So this tab compiles one spec from the project's design: confirmed requirements, state flows, custom fields, forms, flows across modules and the connected apps. Nothing here is written to the server:
   the spec is copied, downloaded, or taken to Meteor by hand. The pure builder is exported as V.mockupLogic.build (tests/mockup_spec.mjs). */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const { toast } = V;
  const arr = v => (Array.isArray(v) ? v : []);
  const list = a => arr(a).filter(Boolean).join(', ');

  /** pure: the spec text and the counts from plain data (see gather for the shape) */
  function build(d) {
    const mods = arr(d.modules).filter(m => m.requirements.length || m.flows.length || m.fields.length || m.forms.length);
    const out = ['# Prototype brief: ' + (d.customer ? d.customer + ' · ' : '') + (d.project || 'Facilio project'), '',
      'Build a clickable Facilio prototype of the solution below. It is made only from what the delivery team has confirmed. Use standard Facilio screens and behaviour wherever this brief is silent, and do not invent states, fields or steps.', ''];
    mods.forEach(m => {
      out.push('## ' + m.label, '');
      if (m.requirements.length) { out.push('Confirmed requirements:'); m.requirements.forEach(r => out.push('- ' + r.id + ' ' + r.title + (r.objective ? ': ' + r.objective : ''))); out.push(''); }
      m.flows.forEach(f => { out.push('State flow “' + f.name + '”: ' + list(f.states) + '.'); f.transitions.forEach(t => out.push('- ' + t.name + ': ' + t.from + ' → ' + t.to)); out.push(''); });
      if (m.fields.length) { out.push('Custom fields:'); m.fields.forEach(x => out.push('- ' + x.label + ' (' + x.type + (x.required ? ', required' : '') + (x.options && x.options.length ? ': ' + list(x.options) : '') + ')')); out.push(''); }
      m.forms.forEach(f => { out.push('Form “' + f.label + '”:'); f.sections.forEach(s => out.push('- ' + s.name + ': ' + list(s.fields))); out.push(''); });
    });
    if (arr(d.crosslinks).length) { out.push('## Flows across modules', ''); d.crosslinks.forEach(c => out.push('- ' + c.from + ' → ' + c.to + ': ' + c.name + (c.condition ? ' (when ' + c.condition + ')' : ''))); out.push(''); }
    if (arr(d.apps).length) {
      out.push('## Connected apps', '', 'Each of these is a connected app: show it opening from the place named, as a separate screen.', '');
      d.apps.forEach(a => out.push('- ' + a.name + ' (' + a.module + '): opens from the ' + (a.triggerLabel ? a.triggerLabel + ' ' : '') + a.trigger + '. ' + a.purpose + (a.shows ? ' It shows: ' + a.shows : '') + (a.users && a.users.length ? ' Used by: ' + list(a.users) + '.' : '')));
      out.push('');
    }
    const counts = { modules: mods.length, flows: mods.reduce((n, m) => n + m.flows.length, 0), fields: mods.reduce((n, m) => n + m.fields.length, 0), forms: mods.reduce((n, m) => n + m.forms.length, 0), crosslinks: arr(d.crosslinks).length, apps: arr(d.apps).length, requirements: mods.reduce((n, m) => n + m.requirements.length, 0) };
    return { text: out.join('\n').trim() + '\n', counts, empty: !mods.length && !counts.crosslinks && !counts.apps };
  }
  /** pure: the same brief as one self-contained HTML page (Facilio colours, no outside files); it prints cleanly, so the browser's Print can save it as a PDF */
  function toHtml(d) {
    const mods = arr(d.modules).filter(m => m.requirements.length || m.flows.length || m.fields.length || m.forms.length); const e = esc; const li = a => '<ul>' + a.map(x => '<li>' + x + '</li>').join('') + '</ul>';
    const body = [];
    mods.forEach(m => {
      body.push('<section><h2>' + e(m.label) + '</h2>');
      if (m.requirements.length) body.push('<h3>Confirmed requirements</h3>' + li(m.requirements.map(r => '<b>' + e(r.id) + '</b> ' + e(r.title) + (r.objective ? ': ' + e(r.objective) : ''))));
      m.flows.forEach(f => body.push('<h3>State flow: ' + e(f.name) + '</h3><p class="st">' + f.states.map(s => '<span>' + e(s) + '</span>').join('<i>›</i>') + '</p>' + li(f.transitions.map(t => '<b>' + e(t.name) + '</b>: ' + e(t.from) + ' → ' + e(t.to)))));
      if (m.fields.length) body.push('<h3>Custom fields</h3>' + li(m.fields.map(x => '<b>' + e(x.label) + '</b> (' + e(x.type) + (x.required ? ', required' : '') + (x.options && x.options.length ? ': ' + e(list(x.options)) : '') + ')')));
      m.forms.forEach(f => body.push('<h3>Form: ' + e(f.label) + '</h3>' + li(f.sections.map(s => '<b>' + e(s.name) + '</b>: ' + e(list(s.fields))))));
      body.push('</section>');
    });
    if (arr(d.crosslinks).length) body.push('<section><h2>Flows across modules</h2>' + li(d.crosslinks.map(c => e(c.from) + ' → ' + e(c.to) + ': <b>' + e(c.name) + '</b>' + (c.condition ? ' (when ' + e(c.condition) + ')' : ''))) + '</section>');
    if (arr(d.apps).length) body.push('<section><h2>Connected apps</h2>' + li(d.apps.map(a => '<b>' + e(a.name) + '</b> (' + e(a.module) + '): opens from the ' + e((a.triggerLabel ? a.triggerLabel + ' ' : '') + a.trigger) + '. ' + e(a.purpose) + (a.shows ? ' It shows: ' + e(a.shows) : '') + (a.users && a.users.length ? ' Used by: ' + e(list(a.users)) + '.' : ''))) + '</section>');
    const title = (d.customer ? d.customer + ' · ' : '') + (d.project || 'Facilio project');
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prototype brief: ' + e(title) + '</title><style>'
      + 'body{margin:0;background:#F7FAFF;color:#1D1A5E;font:16px/1.55 system-ui,Segoe UI,Arial,sans-serif}main{max-width:860px;margin:0 auto;padding:32px 20px}h1{font-size:28px;margin:0 0 6px}.lead{color:#4A5784;margin:0 0 24px}section{background:#fff;border:1px solid #DCE4F3;border-radius:14px;padding:18px 22px;margin:0 0 16px;break-inside:avoid}h2{margin:0 0 8px;font-size:20px;border-bottom:2px solid #1570EF;padding-bottom:6px}h3{margin:14px 0 4px;font-size:16px;color:#1570EF}ul{margin:4px 0 0;padding-left:20px}.st{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0}.st span{padding:2px 10px;border-radius:999px;background:#EAF2FF;border:1px solid #CFE0FF}.st i{font-style:normal;color:#E5197F}@media print{body{background:#fff}section{border-color:#ccc}}'
      + '</style></head><body><main><h1>Prototype brief</h1><p class="lead">' + e(title) + '. Made only from what the delivery team has confirmed or applied.</p>' + body.join('') + '</main></body></html>';
  }
  const HOSTS = ['meteor.facilio.work', 'comet.facilio.work'];
  /** pure: a prototype link is shown inside Studio only when it is https on a Facilio prototype host (the page already allows framing exactly these) */
  function framable(url) { try { const u = new URL(String(url || '').trim()); return u.protocol === 'https:' && HOSTS.includes(u.hostname); } catch (e) { return false; } }
  /** pure: ONE brief per flow (a state flow of a module, a flow across modules, a connected app), because Meteor builds one prototype per idea. The first flow of a module also carries the module's requirements, fields and forms. */
  function buildItems(d) {
    const mk = (key, label, sub) => { const r = build(Object.assign({ customer: d.customer, project: d.project, modules: [], crosslinks: [], apps: [] }, sub)); return r.empty ? null : { key, label, text: r.text }; };
    const out = [];
    arr(d.modules).forEach(m => {
      const flows = arr(m.flows);
      flows.forEach((f, i) => out.push(mk('flow:' + (m.name || m.label) + ':' + (f.id || f.name), m.label + ': ' + f.name, { modules: [Object.assign({}, m, { flows: [f] }, i ? { requirements: [], fields: [], forms: [] } : {})] })));
      if (!flows.length) out.push(mk('module:' + (m.name || m.label), m.label + ': fields and forms', { modules: [m] }));
    });
    arr(d.crosslinks).forEach(c => out.push(mk('link:' + c.from + '>' + c.to + ':' + c.name, c.from + ' to ' + c.to + ': ' + c.name, { crosslinks: [c] })));
    arr(d.apps).forEach(a => out.push(mk('app:' + (a.id || a.name), 'Connected app: ' + a.name, { apps: [a] })));
    return out.filter(Boolean);
  }
  /** Brief for a Comet walkthrough video of one finished prototype. label is "Module: flow"; url is the Meteor share link (may be empty). Fictional data only, every step shown, the module named. */
  function cometBrief(label, url, project) {
    const nl = String.fromCharCode(10); const L = String(label || '').trim(); const i = L.indexOf(': '); const mod = i > 0 ? L.slice(0, i) : ''; const what = i > 0 ? L.slice(i + 2) : L;
    return ['# Walkthrough video brief: ' + (L || 'prototype'), '', 'Make a short walkthrough video of the finished prototype below, for ' + (project ? 'the customer "' + project + '"' : 'the customer') + '. Show the screens in order, say what each step does, and use fictional sample data only.', '',
      mod ? 'Module (model): ' + mod : '', 'Flow or part shown: ' + what, url ? 'Prototype (Meteor): ' + url : 'Prototype: the Meteor prototype for this flow (the link will be pasted in).', '', 'Purpose: Customer demo.'].filter((x, k, a) => x !== '' || a[k - 1] !== '').join(nl).trim();
  }
  V.mockupLogic = { cometBrief, build, toHtml, buildItems, framable };

  /** the project's applied design as plain data */
  function gather() {
    const label = m => (F.moduleView(m) || {}).label || m; const props = (F.doc('design_proposals') || {}).items || [];
    const modules = (F.allModules() || []).filter(m => m.inScope).map(m => {
      const flows = Object.values(S.ws.flows || {}).filter(f => f.module === m.name && f.enabled !== false).map(f => { const lab = id => (f.states.find(s => s.id === id) || {}).label || id; return { id: f.id, name: f.name, states: f.states.map(s => s.label), transitions: f.transitions.filter(t => !t.removed && t.enabled !== false).map(t => ({ name: t.name, from: lab(t.from), to: lab(t.to) })) }; });
      const fields = F.effFields(m.name).filter(x => x.status === 'proposed' || x.status === 'modified').map(x => ({ label: x.label, type: x.type, required: !!x.required, options: x.options || [] }));
      const forms = F.formsForModule(m.name).filter(f => f && f.proposed).map(f => ({ label: f.label || f.name, sections: (f.sections || []).map(s => ({ name: s.name, fields: (s.fields || []).filter(x => !x.hidden).map(x => x.label || F.fieldLabel(m.name, x.field)) })) }));
      const requirements = (S.ws.requirements || []).filter(r => r.status === 'Confirmed' && (r.modules || []).includes(m.name)).map(r => ({ id: r.id, title: r.title, objective: r.objective }));
      return { name: m.name, label: m.label || m.name, flows, fields, forms, requirements };
    });
    const crosslinks = []; Object.entries(S.ws.crossLinks || {}).forEach(([from, l]) => arr(l).forEach(x => crosslinks.push({ from: label(from), to: label(x.to), name: x.name, condition: x.condition || '' })));
    return { customer: (S.project && S.project.customer) || '', project: (S.project && S.project.name) || '', modules, crosslinks, apps: props.filter(p => p.kind === 'connectedapp' && p.status === 'applied') };
  }
  const spec = () => build(gather());

  V.mockup = { html() {
    if (V.isCustomer()) return '';
    const r = spec(), c = r.counts;
    const store = S.ws.mockups || {}; const cards = () => buildItems(gather()).map(it => { const url = (store[it.key] || {}).url || ''; return '<article class="mk-it"><div class="mk-ith"><b>' + esc(it.label) + '</b><span class="mk-itb"><button class="btn sm" data-act="mkItemCopy" data-key="' + esc(it.key) + '">Copy the brief</button><button class="btn sm" data-act="mkMeteor">Open Meteor</button></span></div><div class="mk-link"><input type="url" class="mk-url" data-key="' + esc(it.key) + '" placeholder="Paste the link of the prototype Meteor made" value="' + esc(url) + '"' + (S.readonly ? ' disabled' : '') + '><button class="btn sm primary" data-act="mkSaveUrl" data-key="' + esc(it.key) + '"' + (S.readonly ? ' disabled' : '') + '>Save link</button>' + (url ? '<a class="btn sm" href="' + esc(url) + '" target="_blank" rel="noopener">Open</a>' : '') + '</div>' + (url && framable(url) ? '<iframe class="mk-frame" src="' + esc(url) + '" loading="lazy" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups allow-forms" title="Prototype: ' + esc(it.label) + '"></iframe>' : (url ? '<p class="xs muted">This link is not on Meteor or Comet, so it cannot be shown here. Use Open.</p>' : '')) + '<div class="mk-link"><input type="url" class="mk-vid" data-key="' + esc(it.key) + '" placeholder="Paste the link of the Comet video of this prototype" value="' + esc((store[it.key] || {}).video || '') + '"' + (S.readonly ? ' disabled' : '') + '><button class="btn sm" data-act="mkVidCopy" data-key="' + esc(it.key) + '">Copy the Comet brief</button><button class="btn sm primary" data-act="mkVidSave" data-key="' + esc(it.key) + '"' + (S.readonly ? ' disabled' : '') + '>Save video</button></div>' + ((store[it.key] || {}).video && framable((store[it.key] || {}).video) ? '<iframe class="mk-frame" src="' + esc((store[it.key] || {}).video) + '" loading="lazy" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups allow-forms" title="Video: ' + esc(it.label) + '"></iframe>' : ((store[it.key] || {}).video ? '<p class="xs muted">The video link is not on Comet, so it cannot be shown here: <a href="' + esc((store[it.key] || {}).video) + '" target="_blank" rel="noopener">open it</a>.</p>' : '')) + '<details class="mk-d"><summary>See the brief</summary><pre class="mk-pre">' + esc(it.text) + '</pre></details></article>'; }).join('');
    const chip = (n, w) => '<span class="mk-c"><b>' + n + '</b> ' + w + '</span>';
    return '<div class="page-header"><div class="t"><h1>Mockup</h1><p>The brief for the prototype, built only from what your team has confirmed or applied. Take it to Meteor to get a clickable prototype and a walkthrough you can show the customer.</p></div></div>'
      + '<div class="page-body"><section class="mk"><div class="mk-top"><div class="mk-chips">' + chip(c.modules, 'modules') + chip(c.requirements, 'confirmed requirements') + chip(c.flows, 'state flows') + chip(c.fields, 'custom fields') + chip(c.forms, 'forms') + chip(c.crosslinks, 'flows across modules') + chip(c.apps, 'connected apps') + '</div>'
      + '<div class="mk-acts"><button class="btn sm primary" data-act="mkCopy"' + (r.empty ? ' disabled' : '') + '>Copy the whole project brief</button><button class="btn sm" data-act="mkMeteor">Open Meteor</button><button class="btn sm" data-act="mkDownload"' + (r.empty ? ' disabled' : '') + '>Download (text)</button><button class="btn sm" data-act="mkHtml"' + (r.empty ? ' disabled' : '') + ' title="One web page you can open, share or print to PDF">Export HTML</button></div></div>'
      + (r.empty ? '<p class="small muted">Nothing is applied yet. Apply the proposed flows, fields, forms and connected apps and confirm the requirements (Requirement sessions, System modules, BRD tabs), then come back.</p>' : '<ol class="small mk-how"><li>Each card below is ONE prototype: a state flow, a flow across modules or a connected app. Press <b>Copy the brief</b> on a card.</li><li>Press <b>Open Meteor</b>, choose <b>From a PRD</b> (or <b>Connected App</b> for a connected app) and paste it.</li><li>When Meteor has built it, paste its link on the card and press <b>Save link</b>: the prototype then shows here, and the cards in order are your demo. Teammates must be signed in to Meteor (their Facilio account) to see it here; a customer cannot.</li></ol><div class="mk-items">' + cards() + '</div>')
      + '<p class="xs muted">Only modules in scope, confirmed requirements and applied changes are included. The standard Facilio screens are not listed: Meteor builds those from the CMMS Demo Kit.</p></section></div>';
  } };
  ACT.mkCopy = async () => { const r = spec(); if (r.empty) return; let ok = false; try { await navigator.clipboard.writeText(r.text); ok = true; } catch (e) { /* blocked: the brief is on the page to select */ } toast(ok ? 'The brief is copied. Open Meteor, choose From a PRD and paste it.' : 'Your browser blocked copying. Select the brief on the page and copy it.', 6000, !ok); };
  ACT.mkItemCopy = async a => { const it = buildItems(gather()).find(x => x.key === a.getAttribute('data-key')); if (!it) return; let ok = false; try { await navigator.clipboard.writeText(it.text); ok = true; } catch (e) { /* blocked: the brief is under See the brief */ } toast(ok ? 'The brief is copied. In Meteor choose From a PRD and paste it.' : 'Your browser blocked copying. Open See the brief and copy it.', 6000, !ok); };
  ACT.mkVidCopy = async a => { const key = a.getAttribute('data-key'); const it = buildItems(gather()).find(x => x.key === key); if (!it) return; const d = gather(); const t = cometBrief(it.label, ((S.ws.mockups || {})[key] || {}).url || '', d.customer || d.project || ''); let ok = false; try { await navigator.clipboard.writeText(t); ok = true; } catch (e) { /* blocked */ } toast(ok ? 'The brief is copied. In Comet start a new video and paste it (or ask your Claude to send the prototype to Comet).' : 'Your browser blocked copying.', 7000, !ok); };
  ACT.mkVidSave = a => { if (S.readonly) return; const key = a.getAttribute('data-key'); const box = Array.prototype.find.call(document.querySelectorAll('.mk-vid'), x => x.getAttribute('data-key') === key); const url = box ? box.value.trim() : ''; const it = buildItems(gather()).find(x => x.key === key); if (!it) return; const next = Object.assign({}, S.ws.mockups || {}); const cur = Object.assign({}, next[key] || {});
    if (!url) delete cur.video; else { let ok = false; try { ok = new URL(url).protocol === 'https:'; } catch (e) { /* not a link */ } if (!ok) { toast('Paste the full link, starting with https://', 5000, true); return; } cur.video = url.slice(0, 600); cur.by = (S.user && (S.user.name || S.user.email)) || ''; cur.at = new Date().toISOString(); }
    if (cur.url || cur.video) next[key] = cur; else delete next[key]; S.ws.mockups = next; F.changed(url ? 'Mockup video link saved' : 'Mockup video link removed', it.label); toast(url ? 'Saved.' : 'Video link removed.', 3000); V.render(); };
  ACT.mkSaveUrl = a => { if (S.readonly) return; const key = a.getAttribute('data-key'); const box = Array.prototype.find.call(document.querySelectorAll('.mk-url'), x => x.getAttribute('data-key') === key); const url = box ? box.value.trim() : ''; const it = buildItems(gather()).find(x => x.key === key); if (!it) return; const next = Object.assign({}, S.ws.mockups || {});
    if (!url) { if ((next[key] || {}).video) next[key] = { video: next[key].video, by: next[key].by, at: next[key].at }; else delete next[key]; } else { let ok = false; try { ok = new URL(url).protocol === 'https:'; } catch (e) { /* not a link */ } if (!ok) { toast('Paste the full link, starting with https://', 5000, true); return; } next[key] = Object.assign({}, next[key] || {}, { url: url.slice(0, 600), by: (S.user && (S.user.name || S.user.email)) || '', at: new Date().toISOString() }); }
    S.ws.mockups = next; F.changed(url ? 'Prototype link saved' : 'Prototype link removed', it.label); toast(url ? (framable(url) ? 'Saved. The prototype shows below.' : 'Saved. It is not on Meteor or Comet, so it opens in a new tab.') : 'Link removed.', 4000); V.render(); };
  ACT.mkMeteor = () => { window.open('https://meteor.facilio.work/#/new', '_blank', 'noopener'); };
  ACT.mkHtml = () => { const d = gather(); if (build(d).empty) return; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([V.mockupLogic.toHtml(d)], { type: 'text/html' })); a.download = ((S.project && S.project.name) || 'project').replace(/[^A-Za-z0-9 _-]+/g, ' ').trim().replace(/\s+/g, '-') + '-prototype-brief.html'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); toast('Saved as an HTML page. To get a PDF, open it and use Print, then Save as PDF.', 7000); };
  ACT.mkDownload = () => { const r = spec(); if (r.empty) return; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([r.text], { type: 'text/markdown' })); a.download = ((S.project && S.project.name) || 'project').replace(/[^A-Za-z0-9 _-]+/g, ' ').trim().replace(/\s+/g, '-') + '-prototype-brief.md'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
})(typeof window !== 'undefined' ? window : globalThis);

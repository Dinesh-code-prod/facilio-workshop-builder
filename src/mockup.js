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
  V.mockupLogic = { build };

  /** the project's applied design as plain data */
  function gather() {
    const label = m => (F.moduleView(m) || {}).label || m; const props = (F.doc('design_proposals') || {}).items || [];
    const modules = (F.allModules() || []).filter(m => m.inScope).map(m => {
      const flows = Object.values(S.ws.flows || {}).filter(f => f.module === m.name && f.enabled !== false).map(f => { const lab = id => (f.states.find(s => s.id === id) || {}).label || id; return { name: f.name, states: f.states.map(s => s.label), transitions: f.transitions.filter(t => !t.removed && t.enabled !== false).map(t => ({ name: t.name, from: lab(t.from), to: lab(t.to) })) }; });
      const fields = F.effFields(m.name).filter(x => x.status === 'proposed' || x.status === 'modified').map(x => ({ label: x.label, type: x.type, required: !!x.required, options: x.options || [] }));
      const forms = F.formsForModule(m.name).filter(f => f && f.proposed).map(f => ({ label: f.label || f.name, sections: (f.sections || []).map(s => ({ name: s.name, fields: (s.fields || []).filter(x => !x.hidden).map(x => x.label || F.fieldLabel(m.name, x.field)) })) }));
      const requirements = (S.ws.requirements || []).filter(r => r.status === 'Confirmed' && (r.modules || []).includes(m.name)).map(r => ({ id: r.id, title: r.title, objective: r.objective }));
      return { label: m.label || m.name, flows, fields, forms, requirements };
    });
    const crosslinks = []; Object.entries(S.ws.crossLinks || {}).forEach(([from, l]) => arr(l).forEach(x => crosslinks.push({ from: label(from), to: label(x.to), name: x.name, condition: x.condition || '' })));
    return { customer: (S.project && S.project.customer) || '', project: (S.project && S.project.name) || '', modules, crosslinks, apps: props.filter(p => p.kind === 'connectedapp' && p.status === 'applied') };
  }
  const spec = () => build(gather());

  V.mockup = { html() {
    if (V.isCustomer()) return '';
    const r = spec(), c = r.counts;
    const chip = (n, w) => '<span class="mk-c"><b>' + n + '</b> ' + w + '</span>';
    return '<div class="page-header"><div class="t"><h1>Mockup</h1><p>The brief for the prototype, built only from what your team has confirmed or applied. Take it to Meteor to get a clickable prototype and a walkthrough you can show the customer.</p></div></div>'
      + '<div class="page-body"><section class="mk"><div class="mk-top"><div class="mk-chips">' + chip(c.modules, 'modules') + chip(c.requirements, 'confirmed requirements') + chip(c.flows, 'state flows') + chip(c.fields, 'custom fields') + chip(c.forms, 'forms') + chip(c.crosslinks, 'flows across modules') + chip(c.apps, 'connected apps') + '</div>'
      + '<div class="mk-acts"><button class="btn sm primary" data-act="mkCopy"' + (r.empty ? ' disabled' : '') + '>Copy the brief</button><button class="btn sm" data-act="mkMeteor">Open Meteor</button><button class="btn sm" data-act="mkDownload"' + (r.empty ? ' disabled' : '') + '>Download</button></div></div>'
      + (r.empty ? '<p class="small muted">Nothing is applied yet. Apply the proposed flows, fields, forms and connected apps and confirm the requirements (Requirement sessions, System modules, BRD tabs), then come back.</p>' : '<ol class="small mk-how"><li>Press <b>Copy the brief</b>.</li><li>Press <b>Open Meteor</b>, choose <b>From a PRD</b> and paste it. Choose <b>Connected App</b> for a connected app on its own.</li><li>Check the prototype against the customer’s words before you show it.</li></ol><pre class="mk-pre">' + esc(r.text) + '</pre>')
      + '<p class="xs muted">Only modules in scope, confirmed requirements and applied changes are included. The standard Facilio screens are not listed: Meteor builds those from the CMMS Demo Kit.</p></section></div>';
  } };
  ACT.mkCopy = async () => { const r = spec(); if (r.empty) return; let ok = false; try { await navigator.clipboard.writeText(r.text); ok = true; } catch (e) { /* blocked: the brief is on the page to select */ } toast(ok ? 'The brief is copied. Open Meteor, choose From a PRD and paste it.' : 'Your browser blocked copying. Select the brief on the page and copy it.', 6000, !ok); };
  ACT.mkMeteor = () => { window.open('https://meteor.facilio.work/#/new', '_blank', 'noopener'); };
  ACT.mkDownload = () => { const r = spec(); if (r.empty) return; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([r.text], { type: 'text/markdown' })); a.download = ((S.project && S.project.name) || 'project').replace(/[^A-Za-z0-9 _-]+/g, ' ').trim().replace(/\s+/g, '-') + '-prototype-brief.md'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
})(typeof window !== 'undefined' ? window : globalThis);

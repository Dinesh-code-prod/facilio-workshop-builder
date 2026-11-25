/* Stage 3, Solution design and BRD: what Claude proposes for the design, shown on the Process whiteboard (Requirement sessions) and on the State flow builder (roadmap E20).
   Claude saves proposals (state flows: standard flow changed, or new; flows that cross modules) in the project document design_proposals (work/server/_dsapi.mjs). A person looks at each one with the words it rests on and
   presses Apply (it becomes a state flow or a cross-module action in the project's design, with the person's name kept on the proposal) or Dismiss. Nothing Claude proposes is part of the design until a person applies it.
   Also here: one button that saves the project's copy of the STANDARD state flow for every module in scope (no Claude needed), so every flow is stored even when the sessions never changed it. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const { toast } = V;
  (V.extraSections = V.extraSections || []).push('design_proposals');
  const J = () => V.studioJobs;
  const items = () => { const d = F.doc('design_proposals'); return d && Array.isArray(d.items) ? d.items : []; };
  const team = () => !!(S.user && S.user.kind !== 'customer' && S.project && S.project.id && !S.readonly && (!V.isCustomer || !V.isCustomer()));
  const modKey = name => { const n = String(name || '').trim().toLowerCase(); const m = (F.allModules() || []).find(x => String(x.name).toLowerCase() === n || String(x.label || '').toLowerCase() === n); return m ? m.name : ''; };
  const modLabel = key => { const m = (F.allModules() || []).find(x => x.name === key); return (m && (m.label || m.name)) || key; };
  const BASIS = { default: 'Standard flow with small changes', changed: 'Changed in a session', new: 'A new flow' };

  /** pure: the state flow object a proposal describes (same shape the flow builder keeps); module is the project's module name */
  function flowFromProposal(p, module, uid, layout) {
    const sid = l => 's_' + F.slug(l); const states = p.states.map((l, i) => ({ id: sid(l), name: F.slug(l), label: l, x: 80 + (i % 4) * 220, y: 80 + Math.floor(i / 4) * 150, origin: 'proposed' }));
    const trans = p.transitions.map(t => ({ id: uid('t'), baselineId: null, name: t.name, from: sid(t.from), to: sid(t.to), type: 'user', enabled: true, actors: [], condition: '', conditionFields: [], commentRequired: false, form: null, validations: [], schedule: null, portals: [], emailLink: null,
      approval: { required: /approv|reject/i.test(t.name), approvers: [] }, actions: [], fieldUpdates: [], notifications: [], notes: '', origin: 'proposed', removed: false }));
    if (layout) { try { layout(states, trans, states[0].id); } catch (e) { /* the grid positions above stay */ } }
    return { id: module + '::proposed_' + uid('f').slice(2), module, name: p.name, description: p.description || p.why || '', criteria: '', initial: states[0].id, states, transitions: trans, origin: 'proposed', enabled: true, workshopCopy: true, isDefault: false, fromProposal: p.id };
  }
  /** pure: the custom field a proposal describes (the shape the module builder keeps in fieldOps.add) */
  const fieldFromProposal = p => ({ name: F.slug(p.name), label: p.name, type: p.fieldType || 'Single Line Text', required: !!p.required, options: p.options || [], lookup: p.lookup || '', validation: p.validation || '', description: p.description || '', status: 'proposed', origin: 'Custom (proposed)', onForms: [], fromProposal: p.id });
  /** pure: the form a proposal describes (the shape the form builder keeps in formOps); resolve turns a field label or name into the module's field name, or '' when the module has no such field */
  function formFromProposal(p, module, resolve) {
    const missing = []; const sections = p.sections.map((s, i) => ({ name: s.name, link: F.slug(s.name) || 'details', seq: i + 1, fields: s.fields.map(x => { const n = resolve(x.field); if (!n.name) { missing.push(x.field); return null; } return { field: n.name, label: n.label, required: !!x.required, hidden: !!x.hidden, default: '', span: 12 }; }).filter(Boolean) }));
    const key = module + '::' + (F.slug(p.name) || 'form'); return { missing, form: { key, name: F.slug(p.name) || 'form', module, label: p.name, app: 'maintenance', description: p.description || '', sections, fromProposal: p.id } };
  }
  /** pure: the requirement a proposal describes, as a Draft (only Confirmed requirements reach the BRD, and only a person confirms) */
  const requirementFromProposal = (p, modules, id, now, by) => ({ id, created: now, title: p.name, objective: p.objective, rules: p.rules || '', approvals: p.approvals || '', exceptions: p.exceptions || '', modules, classification: p.classification || 'change', status: 'Draft', fields: [], transitions: [], brdSection: 'module', source: { proposal: p.id, quote: p.quote || '', session: p.source || '' }, history: [{ at: now, by, change: 'Drafted by Claude, applied by a person' }] });
  /** pure: which of the three BRD introduction texts can be filled: only the ones the project left empty */
  const introFill = (p, project) => { const out = {}; if (p.background && !String(project.background || '').trim()) out.background = p.background; if (p.objectives && !String(project.objective || '').trim()) out.objective = p.objectives; if (p.scopeNotes && !String(project.scopeNotes || '').trim()) out.scopeNotes = p.scopeNotes; return out; };
  /** pure: a connected app described as a requirement proposal (classification custom), so it reaches the BRD like any other requirement once a person confirms it */
  const appAsRequirement = p => ({ id: p.id, name: 'Connected app: ' + p.name, objective: p.purpose + (p.shows ? ' It shows: ' + p.shows : ''), rules: 'Opens from the ' + (p.triggerLabel ? p.triggerLabel + ' ' : '') + p.trigger + ' of ' + p.module + (p.users && p.users.length ? '. Used by: ' + p.users.join(', ') : ''), approvals: '', exceptions: p.notes || '', classification: 'custom', quote: p.quote, source: p.source });
  /** pure: the prompt to paste into Vibe (Facilio Build) to build one connected app: one app, one need, for one customer, finished for the customer to use */
  const vibePrompt = (p, customer) => ['Build one custom app for ' + (customer || 'the customer') + '. It is a finished solution that the customer’s own people use, not a builder, and it covers this one need only.', 'App name: ' + p.name + '.', 'It opens from the ' + (p.triggerLabel ? p.triggerLabel + ' ' : '') + p.trigger + ' of the ' + p.module + ' module in Facilio, so it must be a connected app that can be linked there.', 'Purpose: ' + p.purpose, p.shows ? 'What it shows and lets the person do: ' + p.shows : '', p.users && p.users.length ? 'Used by: ' + p.users.join(', ') + '.' : '', p.notes ? 'Open questions for the customer (do not guess these): ' + p.notes : ''].filter(Boolean).join('\n');
  V.designLogic = { flowFromProposal, fieldFromProposal, formFromProposal, requirementFromProposal, introFill, appAsRequirement, vibePrompt };

  function summary(p) {
    if (p.kind === 'flow') return '<div class="ds-st">' + p.states.map(s => '<span>' + esc(s) + '</span>').join('<i>›</i>') + '</div><ol class="ds-tr">' + p.transitions.slice(0, 12).map(t => '<li><b>' + esc(t.name) + '</b>' + (t.from && t.to ? '<span>' + esc(t.from) + ' → ' + esc(t.to) + '</span>' : '') + ((t.by || t.actors) ? '<em>' + esc([].concat(t.by || t.actors).map(x => (x && (x.label || x.actor)) || x).join(', ')) + '</em>' : '') + (t.approval || t.approver ? '<em class="ap">Approval: ' + esc([].concat(t.approver || (t.approval && t.approval.approvers) || []).map(x => (x && x.label) || x).join(', ') || 'yes') + '</em>' : '') + '</li>').join('') + '</ol>' + (p.transitions.length > 12 ? '<div class="xs muted">and ' + (p.transitions.length - 12) + ' more</div>' : '');
    if (p.kind === 'field') return '<div class="ds-st"><span>' + esc(p.fieldType) + '</span>' + (p.required ? '<span>Required</span>' : '') + '</div><div class="xs muted">' + (p.options && p.options.length ? 'Options: ' + esc(p.options.join(', ')) : '') + (p.lookup ? ' Lookup: ' + esc(p.lookup) : '') + (p.description ? ' ' + esc(p.description) : '') + '</div>';
    if (p.kind === 'connectedapp') return '<div class="ds-st"><span>' + esc(p.trigger) + (p.triggerLabel ? ': ' + esc(p.triggerLabel) : '') + '</span>' + (p.users || []).map(u => '<span>' + esc(u) + '</span>').join('') + '</div><div class="xs muted">' + esc(p.purpose) + '</div>' + (p.shows ? '<p class="small">Shows: ' + esc(p.shows) + '</p>' : '');
    if (p.kind === 'requirement') return '<div class="ds-st"><span>' + esc(p.classification) + '</span>' + (p.modules || []).map(m => '<span>' + esc(m) + '</span>').join('') + '</div><div class="xs muted">' + esc(p.objective) + '</div>';
    if (p.kind === 'brdintro') return '<div class="xs muted">' + [p.background && 'Background', p.objectives && 'Business objectives', p.scopeNotes && 'Scope notes'].filter(Boolean).join(', ') + '</div><p class="small">' + esc([p.background, p.objectives, p.scopeNotes].filter(Boolean).join(' ').slice(0, 280)) + '…</p>';
    if (p.kind === 'form') return '<div class="ds-st">' + p.sections.map(s => '<span>' + esc(s.name) + ' (' + s.fields.length + ')</span>').join('') + '</div><div class="xs muted">' + esc(p.sections.flatMap(s => s.fields.map(x => x.field)).slice(0, 10).join(', ')) + '</div>';
    return '<div class="ds-st"><span>' + esc(p.from) + '</span><i>›</i><span>' + esc(p.to) + '</span></div><div class="xs muted">' + esc(p.name) + (p.condition ? ' · when ' + esc(p.condition) : '') + '</div>';
  }
  // proposals in one section per module, flows first; each section can ask Claude for that module's flows on their own
  const groupOf = p => (p.kind === 'brdintro' ? 'BRD introduction' : p.kind === 'requirement' ? 'Requirements' : p.kind === 'crosslink' ? 'Across modules' : String(p.module || 'Other'));
  function groups(open) {
    const by = new Map(); open.forEach(p => { const g = groupOf(p); if (!by.has(g)) by.set(g, []); by.get(g).push(p); }); const ORDER = { flow: 0, transition: 1, form: 2, field: 3, connectedapp: 4 };
    return '<div class="ds-groups">' + [...by.entries()].sort((a, b) => b[1].length - a[1].length).map(([g, ps]) => { const mod = !['BRD introduction', 'Requirements', 'Across modules', 'Other'].includes(g);
      return '<section class="ds-g"><div class="ds-gh"><b>' + esc(g) + '</b><span class="xs muted">' + ps.length + ' proposal' + (ps.length === 1 ? '' : 's') + '</span><span class="spacer"></span>' + (mod ? '<button type="button" class="btn sm" data-act="dsAskMod" data-m="' + esc(g) + '">\u2726 Ask Claude for this module\u2019s flows</button>' : '') + '</div><div class="ds-list">' + ps.sort((a, b) => (ORDER[a.kind] ?? 9) - (ORDER[b.kind] ?? 9)).map(card).join('') + '</div></section>'; }).join('') + '</div>';
  }
  ACT.dsAskMod = a => { if (J().guard()) return; const m = a.getAttribute('data-m'); return J().post('/jobs', { kind: 'capture_flows', note: ('Only the module ' + m + ': define each of its state flows as its own proposal (one flow per process: states, the buttons, who presses each and who approves), from the sessions and the contract.').slice(0, 560) }).then(() => toast('Sent to Claude. The flows of ' + m + ' appear here to apply.', 5000)); };
  // pick a module the contract delivers; Claude generates its flow and draws it on the open whiteboard (the draw_flow job), or proposes it when not on the whiteboard
  function flowPicker() {
    const mods = (F.allModules() || []).filter(m => m.inScope).sort((x, y) => String(x.label).localeCompare(String(y.label))); if (!mods.length) return '';
    const sel = S.ui.dsMod && mods.some(m => m.name === S.ui.dsMod) ? S.ui.dsMod : mods[0].name;
    return '<div class="ds-pick"><label class="sr-only" for="dsModSel">Module</label><select id="dsModSel" data-change="dsModPick" aria-label="Module from the contract">' + mods.map(m => '<option value="' + esc(m.name) + '"' + (m.name === sel ? ' selected' : '') + '>' + esc(m.label) + '</option>').join('') + '</select><button type="button" class="btn sm primary" data-act="dsGenFlow">\u2726 Generate its flow with Claude</button></div>';
  }
  ACT.dsModPick = el => { S.ui.dsMod = el.value; };
  ACT.dsGenFlow = a => V.busy(a, async () => { if (J().guard()) return; const el = document.getElementById('dsModSel'), name = (el && el.value) || S.ui.dsMod || ''; if (!name) return; const lab = (F.moduleView(name) || {}).label || name;
    const onBoard = /\/whiteboard$/.test(String(root.location && root.location.hash || '')), W = V.whiteboardState, board = W && (W.boardId || (W.B && W.B.id));
    const note = 'Generate the state flow of the module ' + lab + ' for this customer, based only on the MSA contract and the sessions and on how Facilio works: its states in order, each button (transition) with who presses it, the approvals and anything the system does by itself. One flow per process of this module.';
    const r = onBoard ? await J().post('/jobs', { kind: 'draw_flow', note: note + ' Draw it on this whiteboard so the team can review it and keep it.', ref: board || '' }) : await J().post('/jobs', { kind: 'capture_flows', note: ('Only the module ' + lab + '. ' + note).slice(0, 560) });
    toast(r && r.duplicate ? 'Claude already has this request.' : onBoard ? 'Sent to Claude. It draws the ' + lab + ' flow on this whiteboard; you review it before it is kept.' : 'Sent to Claude. The ' + lab + ' flow appears here as a proposal to apply.', 6000); });
  function card(p) {
    const title = p.kind === 'crosslink' ? 'Across modules: ' + esc(p.name) : p.kind === 'requirement' ? esc(p.name) : p.kind === 'connectedapp' ? esc(p.module) + ': ' + esc(p.name) : p.kind === 'brdintro' ? 'Background, objectives and scope notes' : esc(p.module) + ': ' + esc(p.name); const tag = p.kind === 'connectedapp' ? 'A connected app' : p.kind === 'requirement' ? 'A requirement (Draft)' : p.kind === 'brdintro' ? 'BRD introduction' : p.kind === 'flow' ? BASIS[p.basedOn] || BASIS.new : p.kind === 'field' ? 'A custom field' : p.kind === 'form' ? 'A form' : 'Flow across modules';
    return '<article class="ds-p"><div class="ds-h"><b>' + title + '</b><span class="tag">' + esc(tag) + '</span></div>' + summary(p)
      + (p.why ? '<p class="small">' + esc(p.why) + '</p>' : '') + (p.quote ? '<blockquote class="ds-q">' + esc(p.quote) + (p.source ? '<cite>' + esc(p.source) + '</cite>' : '') + '</blockquote>' : '')
      + '<div class="ds-b"><button class="btn sm primary" data-act="dsApply" data-id="' + esc(p.id) + '">Apply</button><button class="btn sm" data-act="dsDismiss" data-id="' + esc(p.id) + '">Dismiss</button></div></article>';
  }
  /** the panel shown above the whiteboard and the state flow builder */
  V.designPanel = () => {
    if (!team() || /[?&]focus=whiteboard/.test(root.location ? root.location.search : '')) return ''; const all = items().filter(p => p.kind !== 'solution'), open = all.filter(p => p.status === 'open'), done = all.length - open.length;
    const j = J() && J().K() && Array.isArray(J().K().jobs) ? J().K().jobs.filter(x => x.kind === 'capture_flows' && ['waiting', 'claimed', 'needs_input'].includes(x.status)).length : 0;
    const jf = J() && J().K() && Array.isArray(J().K().jobs) ? J().K().jobs.filter(x => x.kind === 'fill_forms' && ['waiting', 'claimed', 'needs_input'].includes(x.status)).length : 0;
    const apps = all.filter(p => p.kind === 'connectedapp' && p.status === 'applied');
    const jb = J() && J().K() && Array.isArray(J().K().jobs) ? J().K().jobs.filter(x => x.kind === 'draft_brd' && ['waiting', 'claimed', 'needs_input'].includes(x.status)).length : 0;
    const ja = J() && J().K() && Array.isArray(J().K().jobs) ? J().K().jobs.filter(x => x.kind === 'capture_apps' && ['waiting', 'claimed', 'needs_input'].includes(x.status)).length : 0;
    // with nothing open the panel is one line (title, a short state, the Claude buttons); proposals, when there are any, get the full panel
    return '<section class="ds-panel' + (open.length ? '' : ' ds-empty') + '"><div class="ds-top"><div><b>Proposals for the design</b><span>' + (open.length ? 'Claude reads the sessions and proposes flows, fields and forms. You look at each one and apply or dismiss it.' : (all.length ? 'No open proposals.' : 'No proposals yet. Claude reads the sessions and proposes flows, fields and forms; you apply or dismiss each.')) + '</span></div><div class="ds-acts">'
      + (/\/brd$/.test(String(root.location && root.location.hash || '')) ? '<button class="btn sm" data-act="opkZip" data-drafts="1" title="Builds the organisation package (XML, as a ZIP) from what the BRD settled: new modules, fields, state flows, notifications. Before sign-off it is a draft.">Download as org package (XML)</button>' : '') + flowPicker() + '<details class="ds-more"><summary class="btn sm">More</summary><div class="ds-menu"><button type="button" data-act="dsDefaults"><b>Save the standard flows</b><span>A project copy of the Facilio standard flow for every module that has none</span></button>'
      + '<button type="button" data-act="dsAsk"' + (j ? ' disabled' : '') + '><b>' + (j ? 'Claude is capturing the flows' : 'Capture the flows from the sessions') + '</b><span>Claude reads every session and proposes the flows that changed</span></button><button type="button" data-act="dsAskForms"' + (jf ? ' disabled' : '') + '><b>' + (jf ? 'Claude is on the fields and forms' : 'Propose fields and forms') + '</b><span>New or changed fields and the forms they sit on</span></button><button type="button" data-act="dsAskBrd"' + (jb ? ' disabled' : '') + '><b>' + (jb ? 'Claude is drafting the BRD' : 'Draft the BRD') + '</b><span>Requirements and the introduction, as proposals</span></button><button type="button" data-act="dsAskApps"' + (ja ? ' disabled' : '') + '><b>' + (ja ? 'Claude is on the connected apps' : 'Propose connected apps') + '</b><span>Apps the contract and the sessions call for</span></button></div></details></div></div>'
      + (open.length ? groups(open) : '')
      + (apps.length ? '<div class="ds-apps"><b>Connected apps to build in Vibe</b>' + apps.map(p => '<div class="ds-app"><span>' + esc(p.module) + ': ' + esc(p.name) + '</span><button class="btn sm" data-act="dsVibe" data-id="' + esc(p.id) + '">Copy the Vibe prompt</button></div>').join('') + '</div>' : '')
      + (done ? '<p class="xs muted">' + done + ' proposal' + (done === 1 ? '' : 's') + ' already applied or dismissed.</p>' : '') + '</section>';
  };
  [['whiteboard'], ['flow'], ['modules'], ['brd']].forEach(([id]) => { const v = V[id]; if (!v || typeof v.html !== 'function') return; const h = v.html; v.html = function () { const out = h.apply(this, arguments); if (typeof out !== 'string') return out; const p = V.designPanel(); if (id !== 'brd' || !p) return p + out; const n = items().filter(x => x.kind !== 'solution' && x.status === 'open').length; return '<details class="ds-fold"' + (n ? ' open' : '') + '><summary>Claude proposals for the design' + (n ? ' (' + n + ' to review)' : '') + '</summary>' + p + '</details>' + out; }; });

  const decide = async (id, status, apply) => {
    if (J().guard()) return; const prev = JSON.parse(JSON.stringify(F.doc('design_proposals') || { items: [] })); const p = items().find(x => x.id === id); if (!p || p.status !== 'open') return;
    if (apply) { const err = apply(p); if (err) { toast(err, 6000, true); return; } }
    J().setDoc('design_proposals', { items: items().map(x => (x.id === id ? Object.assign({}, x, { status, by: S.user.email, byAt: new Date().toISOString() }) : x)) }); F.changed(null, null, { section: 'design_proposals' });
    if (!(await J().saved('design_proposals'))) { J().setDoc('design_proposals', prev); S.docs.design_proposals.dirty = false; V.render(); toast('Not saved: the server refused it or someone changed this at the same time. Nothing was changed; try again.', 7000, true); return false; }
    return true;
  };
  V.designDecide = decide;   // the Solution tab accepts and dismisses its own proposals through the same saved-or-undone rule
  ACT.dsApply = async a => {
    const id = a.getAttribute('data-id'); let undo = null;
    const ok = await decide(id, 'applied', p => {
      if (p.kind === 'flow') {
        const m = modKey(p.module); if (!m) return 'This project has no module called “' + p.module + '”. Dismiss it, or add the module first.';
        const f = V.designLogic.flowFromProposal(p, m, F.uid, F.autoLayout); S.ws.flows[f.id] = f; setTimeout(() => { if (V.ACT.roleUseSugg) V.ACT.roleUseSugg(); if (V.ACT.ntAddSugg) V.ACT.ntAddSugg(); }, 0); undo = () => { delete S.ws.flows[f.id]; };
        F.changed('State flow applied', modLabel(m) + ' › ' + p.name); return '';
      }
      if (p.kind === 'brdintro') {
        const fill = V.designLogic.introFill(p, S.ws.project); const ks = Object.keys(fill); if (!ks.length) return 'The BRD introduction already has text in every part this covers. Edit it by hand in Project Settings, or dismiss this.'; Object.assign(S.ws.project, fill); F.changed('BRD introduction filled', ks.join(', ')); return '';
      }
      if (p.kind === 'retire') {   // left out of the agreed BRD: out of scope (a requirement) or switched off (a flow); nothing is deleted
        const at = new Date().toISOString(), who = S.user.name || S.user.email;
        if (p.target === 'requirement') { const r = S.ws.requirements.find(x => x.id === p.ref); if (!r) return 'Requirement ' + p.ref + ' is not in this project any more. Dismiss this.'; const was = { status: r.status, history: r.history };
          r.status = 'Out of scope'; r.history = (r.history || []).concat({ at, by: who, change: 'Out of scope: not in the agreed BRD' }); undo = () => Object.assign(r, was); F.changed('Requirement out of scope (not in the agreed BRD)', r.id + ' ' + r.title); return ''; }
        const f = S.ws.flows[p.ref] || Object.values(S.ws.flows).find(x => String(x.name).toLowerCase() === String(p.name).toLowerCase() && (!p.module || x.module === modKey(p.module))); if (!f) return 'That state flow is not in this project any more. Dismiss this.';
        const was = f.enabled; f.enabled = false; undo = () => { f.enabled = was; }; F.changed('State flow switched off (not in the agreed BRD)', modLabel(f.module) + ' › ' + f.name); return '';
      }
      if (p.kind === 'answer') { const q = (S.ws.questions || []).find(x => x.id === p.ref); if (!q) return 'That question is not in this project any more. Dismiss this.'; const was = { answer: q.answer, status: q.status }; q.answer = p.answer; q.status = 'answered'; undo = () => Object.assign(q, was); F.changed('Question answered from the agreed BRD', String(q.text || '').slice(0, 80)); return ''; }
      if (p.kind === 'requirement' && p.replaces) {   // the agreed BRD rewrote it: the BRD wording, confirmed (the customer agreed it)
        const r = S.ws.requirements.find(x => x.id === p.replaces); if (!r) return 'Requirement ' + p.replaces + ' is not in this project any more. Dismiss this.'; const was = JSON.parse(JSON.stringify(r));
        Object.assign(r, { title: p.name, objective: p.objective, rules: p.rules || '', approvals: p.approvals || '', exceptions: p.exceptions || '', status: 'Confirmed', history: (r.history || []).concat({ at: new Date().toISOString(), by: S.user.name || S.user.email, change: 'Updated to the agreed BRD' }) });
        undo = () => { Object.keys(r).forEach(k => { delete r[k]; }); Object.assign(r, was); }; F.changed('Requirement updated to the agreed BRD', r.id + ' ' + r.title); return '';
      }
      if (p.kind === 'requirement' || p.kind === 'connectedapp') {
        const q = p.kind === 'connectedapp' ? Object.assign({}, p, V.designLogic.appAsRequirement(p)) : p; const ms = (p.kind === 'connectedapp' ? [p.module] : (p.modules || [])).map(modKey); if (ms.some(x => !x)) return 'A module of this proposal (“' + (p.kind === 'connectedapp' ? p.module : p.modules[ms.indexOf('')]) + '”) is not in this project.'; const now = new Date().toISOString();
        const rec = V.designLogic.requirementFromProposal(q, ms, F.nextReqId(ms[0] ? F.modulePrefix(ms[0]) : 'GEN'), now, S.user.name || S.user.email); if (p.brd) { rec.status = 'Confirmed'; rec.history = [{ at: now, by: S.user.name || S.user.email, change: 'From the agreed BRD, applied by a person' }]; } S.ws.requirements.push(rec); undo = () => { S.ws.requirements = S.ws.requirements.filter(r => r.id !== rec.id); }; F.changed('Requirement drafted', rec.id + ' ' + rec.title); return '';
      }
      if (p.kind === 'field') {
        const m = modKey(p.module); if (!m) return 'This project has no module called “' + p.module + '”.'; const have = F.effFields(m).find(x => x.name === F.slug(p.name) || String(x.label).toLowerCase() === p.name.toLowerCase()); if (have) return 'The ' + modLabel(m) + ' module already has a field “' + have.label + '”. Dismiss this one.';
        F.fops(m).add.push(V.designLogic.fieldFromProposal(p)); F.changed('Field applied', modLabel(m) + ' › ' + p.name); return '';
      }
      if (p.kind === 'form') {
        const m = modKey(p.module); if (!m) return 'This project has no module called “' + p.module + '”.'; const fs = F.effFields(m); const r = V.designLogic.formFromProposal(p, m, ref => { const x = fs.find(z => z.name === ref || String(z.label).toLowerCase() === String(ref).toLowerCase() || z.name === F.slug(ref)); return x ? { name: x.name, label: x.label } : { name: '' }; });
        if (r.missing.length) return 'These fields are not on the ' + modLabel(m) + ' module yet: ' + r.missing.join(', ') + '. Apply the field proposals first, or dismiss this form.'; if (S.ws.formOps[r.form.key] || (S.baseline && S.baseline.forms[r.form.key])) return 'A form called “' + p.name + '” already exists on ' + modLabel(m) + '. Dismiss this one.';
        S.ws.formOps[r.form.key] = r.form; undo = () => { delete S.ws.formOps[r.form.key]; }; F.changed('Form applied', modLabel(m) + ' › ' + p.name); return '';
      }
      const from = modKey(p.from), to = modKey(p.to); if (!from || !to) return 'A module in this flow (“' + (from ? p.to : p.from) + '”) is not in this project.';
      const rec = { id: F.uid('cx'), name: p.name, to, kind: p.linkKind || 'create_record', condition: p.condition || '', who: [], source: 'proposed', verified: false, fromProposal: p.id };
      (S.ws.crossLinks[from] = S.ws.crossLinks[from] || []).push(rec); undo = () => { S.ws.crossLinks[from] = (S.ws.crossLinks[from] || []).filter(z => z.id !== rec.id); }; F.changed('Cross-module action applied', modLabel(from) + ' › ' + p.name); return '';
    });
    if (ok === false && undo) undo(); if (ok) toast('Applied. It is now part of the design.', 3500); V.render();
  };
  ACT.dsAskForms = a => V.busy(a, async () => { if (J().guard()) return; const r = await J().post('/jobs', { kind: 'fill_forms' }); toast(r && r.duplicate ? 'Claude already has this request.' : 'Sent. Claude’s progress shows in the assistant panel.', 5000); const st = S.ui.asst; if (st) { st.open = true; st.sig = ''; } J().load(true); });
  ACT.dsAskBrd = a => V.busy(a, async () => { if (J().guard()) return; const r = await J().post('/jobs', { kind: 'draft_brd' }); toast(r && r.duplicate ? 'Claude already has this request.' : 'Sent. Claude’s progress shows in the assistant panel.', 5000); const st = S.ui.asst; if (st) { st.open = true; st.sig = ''; } J().load(true); });
  ACT.dsAskApps = a => V.busy(a, async () => { if (J().guard()) return; const r = await J().post('/jobs', { kind: 'capture_apps' }); toast(r && r.duplicate ? 'Claude already has this request.' : 'Sent. Claude’s progress shows in the assistant panel.', 5000); const st = S.ui.asst; if (st) { st.open = true; st.sig = ''; } J().load(true); });
  ACT.dsVibe = async a => { const p = items().find(x => x.id === a.getAttribute('data-id')); if (!p) return; const text = V.designLogic.vibePrompt(p, (S.project && S.project.customer) || ''); let ok = false; try { await navigator.clipboard.writeText(text); ok = true; } catch (e) { /* clipboard blocked: shown below */ } window.open('https://vibe.facilio.com/home', '_blank', 'noopener'); toast(ok ? 'The prompt is copied. In Vibe, click the box and press Ctrl+V, then check the app against the build checklist.' : 'Your browser blocked copying. Select the prompt in the box that opened and copy it.', 8000, !ok); if (!ok) V.drawer('Prompt for Vibe', '<textarea rows="12" style="width:100%" readonly>' + esc(text) + '</textarea>', '<button class="btn" data-act="closeDrawer">Close</button>'); };
  ACT.dsDismiss = async a => { if (await decide(a.getAttribute('data-id'), 'dismissed', null)) V.render(); };
  ACT.dsAsk = a => V.busy(a, async () => { if (J().guard()) return; const r = await J().post('/jobs', { kind: 'capture_flows' }); toast(r && r.duplicate ? 'Claude already has this request.' : 'Sent. Claude’s progress shows in the assistant panel.', 5000); const st = S.ui.asst; if (st) { st.open = true; st.sig = ''; } J().load(true); });
  ACT.dsDefaults = a => V.busy(a, async () => {
    if (J().guard()) return; let n = 0, none = 0; (F.allModules() || []).filter(m => m.inScope).forEach(m => { const d = F.flowsForModule(m.name).find(x => x.isDefault && x.origin === 'existing'); if (!d) { none++; return; } if (!S.ws.flows[d.id]) { F.editableFlow(d.id); n++; } });
    if (n) F.changed('Standard state flows saved', n + ' module' + (n === 1 ? '' : 's')); toast(n ? 'Saved the standard flow of ' + n + ' module' + (n === 1 ? '' : 's') + ' in scope.' : 'Every module in scope already has its flow saved' + (none ? ' (' + none + ' have no standard flow)' : '') + '.', 5000); V.render();
  });
})(typeof window !== 'undefined' ? window : globalThis);

/* Stage 3, Mockup and BRD: what Claude proposes for the design, shown on the Process whiteboard (Requirement sessions) and on the State flow builder (roadmap E20).
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
  V.designLogic = { flowFromProposal };

  function summary(p) {
    if (p.kind === 'flow') return '<div class="ds-st">' + p.states.map(s => '<span>' + esc(s) + '</span>').join('<i>›</i>') + '</div><div class="xs muted">' + p.transitions.length + ' transitions: ' + esc(p.transitions.slice(0, 6).map(t => t.name).join(', ')) + (p.transitions.length > 6 ? ', …' : '') + '</div>';
    return '<div class="ds-st"><span>' + esc(p.from) + '</span><i>›</i><span>' + esc(p.to) + '</span></div><div class="xs muted">' + esc(p.name) + (p.condition ? ' · when ' + esc(p.condition) : '') + '</div>';
  }
  function card(p) {
    const title = p.kind === 'flow' ? esc(p.module) + ': ' + esc(p.name) : 'Across modules: ' + esc(p.name);
    return '<article class="ds-p"><div class="ds-h"><b>' + title + '</b><span class="tag">' + (p.kind === 'flow' ? esc(BASIS[p.basedOn] || BASIS.new) : 'Flow across modules') + '</span></div>' + summary(p)
      + (p.why ? '<p class="small">' + esc(p.why) + '</p>' : '') + (p.quote ? '<blockquote class="ds-q">' + esc(p.quote) + (p.source ? '<cite>' + esc(p.source) + '</cite>' : '') + '</blockquote>' : '')
      + '<div class="ds-b"><button class="btn sm primary" data-act="dsApply" data-id="' + esc(p.id) + '">Apply</button><button class="btn sm" data-act="dsDismiss" data-id="' + esc(p.id) + '">Dismiss</button></div></article>';
  }
  /** the panel shown above the whiteboard and the state flow builder */
  V.designPanel = () => {
    if (!team()) return ''; const all = items(), open = all.filter(p => p.status === 'open'), done = all.length - open.length;
    const j = J() && J().K() && Array.isArray(J().K().jobs) ? J().K().jobs.filter(x => x.kind === 'capture_flows' && ['waiting', 'claimed', 'needs_input'].includes(x.status)).length : 0;
    return '<section class="ds-panel"><div class="ds-top"><div><b>Flows for the design</b><span>Claude reads the sessions and proposes the flows. You look at each one and apply or dismiss it.</span></div><div class="ds-acts">'
      + '<button class="btn sm" data-act="dsDefaults" title="Saves the project copy of the standard state flow for every module in scope that has none">Save the standard flows</button>'
      + '<button class="btn sm primary" data-act="dsAsk"' + (j ? ' disabled' : '') + '>' + (j ? 'Claude is on it' : 'Ask Claude to capture the flows') + '</button></div></div>'
      + (open.length ? '<div class="ds-list">' + open.map(card).join('') + '</div>' : '<p class="small muted">' + (all.length ? 'No open proposals.' : 'No proposals yet. Press “Ask Claude to capture the flows” after the sessions, or “Save the standard flows” to store the standard flow of every module in scope.') + '</p>')
      + (done ? '<p class="xs muted">' + done + ' proposal' + (done === 1 ? '' : 's') + ' already applied or dismissed.</p>' : '') + '</section>';
  };
  [['whiteboard'], ['flow']].forEach(([id]) => { const v = V[id]; if (!v || typeof v.html !== 'function') return; const h = v.html; v.html = function () { const out = h.apply(this, arguments); return typeof out === 'string' ? V.designPanel() + out : out; }; });

  const decide = async (id, status, apply) => {
    if (J().guard()) return; const prev = JSON.parse(JSON.stringify(F.doc('design_proposals') || { items: [] })); const p = items().find(x => x.id === id); if (!p || p.status !== 'open') return;
    if (apply) { const err = apply(p); if (err) { toast(err, 6000, true); return; } }
    J().setDoc('design_proposals', { items: items().map(x => (x.id === id ? Object.assign({}, x, { status, by: S.user.email, byAt: new Date().toISOString() }) : x)) }); F.changed(null, null, { section: 'design_proposals' });
    if (!(await J().saved('design_proposals'))) { J().setDoc('design_proposals', prev); S.docs.design_proposals.dirty = false; V.render(); toast('Not saved: the server refused it or someone changed this at the same time. Nothing was changed; try again.', 7000, true); return false; }
    return true;
  };
  ACT.dsApply = async a => {
    const id = a.getAttribute('data-id'); let undo = null;
    const ok = await decide(id, 'applied', p => {
      if (p.kind === 'flow') {
        const m = modKey(p.module); if (!m) return 'This project has no module called “' + p.module + '”. Dismiss it, or add the module first.';
        const f = V.designLogic.flowFromProposal(p, m, F.uid, F.autoLayout); S.ws.flows[f.id] = f; undo = () => { delete S.ws.flows[f.id]; };
        F.changed('State flow applied', modLabel(m) + ' › ' + p.name); return '';
      }
      const from = modKey(p.from), to = modKey(p.to); if (!from || !to) return 'A module in this flow (“' + (from ? p.to : p.from) + '”) is not in this project.';
      const rec = { id: F.uid('cx'), name: p.name, to, kind: p.linkKind || 'create_record', condition: p.condition || '', who: [], source: 'proposed', verified: false, fromProposal: p.id };
      (S.ws.crossLinks[from] = S.ws.crossLinks[from] || []).push(rec); undo = () => { S.ws.crossLinks[from] = (S.ws.crossLinks[from] || []).filter(z => z.id !== rec.id); }; F.changed('Cross-module action applied', modLabel(from) + ' › ' + p.name); return '';
    });
    if (ok === false && undo) undo(); if (ok) toast('Applied. It is now part of the design.', 3500); V.render();
  };
  ACT.dsDismiss = async a => { if (await decide(a.getAttribute('data-id'), 'dismissed', null)) V.render(); };
  ACT.dsAsk = a => V.busy(a, async () => { if (J().guard()) return; const r = await J().post('/jobs', { kind: 'capture_flows' }); toast(r && r.duplicate ? 'Claude already has this request.' : 'Sent. Claude’s progress shows in the assistant panel.', 5000); const st = S.ui.asst; if (st) { st.open = true; st.sig = ''; } J().load(true); });
  ACT.dsDefaults = a => V.busy(a, async () => {
    if (J().guard()) return; let n = 0, none = 0; (F.allModules() || []).filter(m => m.inScope).forEach(m => { const d = F.flowsForModule(m.name).find(x => x.isDefault && x.origin === 'existing'); if (!d) { none++; return; } if (!S.ws.flows[d.id]) { F.editableFlow(d.id); n++; } });
    if (n) F.changed('Standard state flows saved', n + ' module' + (n === 1 ? '' : 's')); toast(n ? 'Saved the standard flow of ' + n + ' module' + (n === 1 ? '' : 's') + ' in scope.' : 'Every module in scope already has its flow saved' + (none ? ' (' + none + ' have no standard flow)' : '') + '.', 5000); V.render();
  });
})(typeof window !== 'undefined' ? window : globalThis);

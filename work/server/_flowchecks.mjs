/* The automatic state-flow checks (plan CONTRACT-TO-BRD step 4), ONE copy for the page and the server. build.mjs adds this file to the browser bundle
   (a plain script: it sets window.FWBFlowChecks, used by the State flows tile of the Solution map, src/solmap.js); the server imports it as a module
   (globalThis.FWBFlowChecks) for the review pack Claude reads (get_review_pack). Pure code: no DOM, no network. Run by tests/sollogic.mjs. */
(function (root) {
  'use strict';
  const arr = v => (Array.isArray(v) ? v : []);
  /** the four automatic checks of a state flow (plan CONTRACT-TO-BRD step 4), shown on the module's State flows tile: a state nothing reaches, a user button nobody can press,
      an approval with no approver, a key step (an approval, or the move into a final state) that tells nobody. flow: the flow model; notes: the module's notifications.
      Returns [{ kind, text }]. A transition with no from state counts as "from any state".
      Only flows the team designs (proposed, or a standard flow it edited) get all four: in an untouched standard Facilio flow a button with no role is open to anyone
      with access, states can be set outside the flow and the package carries no notifications, so there only an approval without approver is reported. */
  function check(flow, notes) {
    const f = flow && typeof flow === 'object' ? flow : {}; const states = arr(f.states); const lab = id => ((states.find(s => s.id === id) || {}).label || id || '?');
    const ts = arr(f.transitions).filter(t => t && !t.removed && t.enabled !== false); const out = [];
    const ours = f.origin === 'proposed' || !!f.workshopCopy;
    const seen = new Set(f.initial ? [f.initial] : []); for (let grew = true; grew;) { grew = false; ts.forEach(t => { if ((!t.from || seen.has(t.from)) && t.to && !seen.has(t.to)) { seen.add(t.to); grew = true; } }); }
    if (ours && f.initial) states.filter(s => !seen.has(s.id)).forEach(s => out.push({ kind: 'unreachable', text: 'No transition leads to "' + lab(s.id) + '", so a record never reaches it.' }));
    const tbc = a => !a || a.status === 'tbc' || /^tbc:/.test(String(a.actor || ''));
    if (ours) ts.filter(t => (t.type || 'user') === 'user' && arr(t.actors).every(tbc)).forEach(t => out.push({ kind: 'nobody', text: 'Nobody is named to press "' + (t.name || lab(t.from) + ' to ' + lab(t.to)) + '".' }));
    ts.filter(t => t.approval && t.approval.required && !arr(t.approval.approvers).length).forEach(t => out.push({ kind: 'approver', text: '"' + (t.name || lab(t.to)) + '" needs an approval but has no approver.' }));
    const final = id => !ts.some(t => t.from === id);
    const told = t => arr(t.notifications).length || arr(notes).some(n => n && n.trigger === 'state' && n.status !== 'off' && [t.to, lab(t.to)].includes(n.state));
    const silent = new Set(); if (ours) ts.filter(t => t.to && ((t.approval && t.approval.required) || final(t.to)) && !told(t)).forEach(t => silent.add(t.to));
    silent.forEach(id => out.push({ kind: 'silent', text: 'Nobody is told when a record moves to "' + lab(id) + '".' }));
    return out.filter((x, i) => out.findIndex(y => y.text === x.text) === i);   // buttons with the same name in several places read as one line
  }
  root.FWBFlowChecks = { check };
})(typeof window !== 'undefined' ? window : globalThis);

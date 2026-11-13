/* Suggestions read from the saved state flows, so people do not type what the flows already say:
   - roleLevels: a role that performs or approves a transition of a module needs at least "Create & edit" on that module;
   - notifications: for each state a record moves into, tell the people who must act next (the actors of the transitions leaving that state), and tell them when a record is created.
   The state flows themselves come from the sessions (Claude's capture_flows job proposes them from the transcripts), so transcripts -> flows -> roles and notifications.
   Pure code over plain flow models (tests/autosuggest.mjs); the pages call it with F.flowModel(...) of the modules in scope. */
(function (root) {
  'use strict';
  const arr = v => (Array.isArray(v) ? v : []);
  const live = t => t && !t.removed && t.enabled !== false;
  /** flows: [{ module, states: [{ id, label }], transitions: [{ name, from, to, type, actors: [{ actor }], approval: { required, approvers } }] }] -> { [actorId]: { [module]: 'edit' } } */
  function roleLevels(flows) {
    const out = {}; const put = (a, m) => { if (!a || !m || /^tbc:/.test(a)) return; (out[a] = out[a] || {})[m] = 'edit'; };
    arr(flows).forEach(f => arr(f.transitions).filter(live).forEach(t => { arr(t.actors).forEach(x => put(x && x.actor, f.module)); if (t.approval && t.approval.required) arr(t.approval.approvers).forEach(a => put(a, f.module)); }));
    return out;
  }
  /** flows as above; label(actorId) -> name; existing: the notifications already recorded (module, trigger, state). Returns new suggestions in the shape of S.ws.notifications. */
  function notifications(flows, label, existing) {
    const lab = typeof label === 'function' ? label : (x => x); const have = new Set(arr(existing).map(n => [n.module, n.trigger, n.state || ''].join('|'))); const out = [];
    arr(flows).forEach(f => {
      const ts = arr(f.transitions).filter(live); const st = id => ((arr(f.states).find(s => s.id === id) || {}).label || id);
      const who = stateId => [...new Set(ts.filter(t => t.from === stateId && t.type !== 'system').flatMap(t => arr(t.actors).map(x => x && x.actor).concat(t.approval && t.approval.required ? arr(t.approval.approvers) : [])).filter(a => a && !/^tbc:/.test(a)).map(lab))];
      const add = (trigger, state, recipients, name) => { const k = [f.module, trigger, state || ''].join('|'); if (have.has(k) || !recipients.length) return; have.add(k); out.push({ name, module: f.module, trigger, state: state || '', channels: { email: true }, recipients: recipients.slice(0, 10), status: 'on', note: 'Suggested from the state flow' + (f.name ? ' "' + f.name + '"' : '') }); };
      const first = ts.filter(t => !ts.some(u => u.to === t.from)).map(t => t.from)[0]; if (first) add('created', '', who(first), 'New record: tell who acts first');
      [...new Set(ts.map(t => t.to))].forEach(to => { const r = who(to); if (r.length) add('state', st(to), r, 'Moved to ' + st(to) + ': tell who acts next'); });
    });
    return out;
  }
  const api = { roleLevels, notifications };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBAutoSuggest = api;
})(typeof window !== 'undefined' ? window : globalThis);

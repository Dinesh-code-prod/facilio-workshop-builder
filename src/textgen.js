/* Business-language text generation shared by the UI previews and the BRD. Only states what the configuration or the workshop establishes. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, humanize } = F;
  const TBC = '[To be confirmed]';
  const q = s => '“' + s + '”';
  const list = a => { a = a.filter(Boolean); return a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; };

  function portalsFor(m) {
    const B = S.baseline; if (!B) return [];
    return B.portalEvidence.filter(p => p.tabs.some(t => t.modules.indexOf(m) >= 0) || p.forms.some(f => f.module === m)).map(p => ({ name: p.name, enabled: p.enabled, canCreate: p.forms.some(f => f.module === m), tabs: p.tabs.filter(t => t.modules.indexOf(m) >= 0).map(t => t.name) }));
  }
  function fieldRules(m) {
    const B = S.baseline; const out = {}; if (!B) return out;
    B.formRules.filter(r => r.module === m && r.enabled).forEach(r => r.actions.forEach(a => a.fieldNames.forEach((fn, i) => {
      const when = r.criteria && r.criteria.text ? ' when ' + r.criteria.text : (r.triggerFields.length ? ' when ' + list(r.triggerFields) + ' changes' : (r.trigger === 'FORM_ON_LOAD' ? ' when the form opens' : ''));
      const scope = r.execute === 'EDIT' ? ' (edit form)' : r.execute === 'CREATE' ? ' (create form)' : '';
      const k = /Hide|Show/.test(a.type) ? 'visibility' : /Disable|Enable/.test(a.type) ? 'editability' : /mandatory/i.test(a.type) ? 'mandatory' : /filter/i.test(a.type) ? 'validation' : 'other';
      (out[fn] = out[fn] || { visibility: [], editability: [], mandatory: [], validation: [], other: [] })[k].push(a.type + when + scope);
    })));
    return out;
  }
  function modulePurpose(name) {
    const m = F.moduleView(name); if (!m) return '';
    const w = S.ws.modules[name] || {}; const B = S.baseline;
    const parts = [];
    if (w.purpose) parts.push(w.purpose.trim());
    else if (m.description) parts.push(`The ${m.label} module is used to ${m.description.charAt(0).toLowerCase() + m.description.slice(1).replace(/\.$/, '')}.`);
    else parts.push(`The business purpose of the ${m.label} module for the customer is ${TBC}.`);
    if (w.objective) parts.push('Business objective: ' + w.objective.trim());
    const ev = m.evidence.filter(e => e.kind === 'menu' && !/app disabled/.test(e.text)).map(e => e.text.replace(/^Menu tab /, ''));
    const portals = portalsFor(name).filter(p => p.enabled && p.tabs.length);
    const who = [];
    if (ev.length) who.push('internal users through ' + list(ev.slice(0, 3)));
    if (portals.length) who.push(list(portals.map(p => p.name)) + ' users');
    if (who.length) parts.push(`In the current configuration it is used by ${list(who)}.`);
    const creators = portalsFor(name).filter(p => p.enabled && p.canCreate).map(p => p.name);
    if (creators.length) parts.push(`Create forms for this module are configured in the ${list(creators)}; whether portal users raise these records is ${TBC}.`);
    const deps = m.dependsOn.filter(d => F.moduleView(d) && F.moduleView(d).inUse).map(d => F.moduleView(d).label).slice(0, 6);
    if (deps.length) parts.push(`Each record links to ${list(deps)}.`);
    const users = m.usedBy.filter(d => F.moduleView(d) && F.moduleView(d).inScope).map(d => F.moduleView(d).label).slice(0, 6);
    if (users.length) parts.push(`It is referenced by ${list(users)}.`);
    const flows = m.flowIds.map(F.flowModel).filter(f => f && f.enabled !== false);
    if (flows.length) { const f = flows[0]; const ini = f.states.find(s => s.id === f.initial); parts.push(`Records follow the ${q(f.name)} process${ini ? ', starting in ' + q(ini.label) : ''}, with ${f.transitions.filter(t => !t.removed && t.enabled !== false).length} available actions.`); }
    if (w.outcome) parts.push('Expected outcome: ' + w.outcome.trim());
    else parts.push(`Expected outcome for the customer: ${TBC}.`);
    return parts.join(' ');
  }
  function actorsText(t) {
    const a = (t.actors || []); if (!a.length) return 'User / Role to Be Confirmed';
    return a.map(x => F.actorLabel(x.actor) + (x.status === 'proposed' ? ' (proposed)' : x.status === 'confirmed' ? ' (confirmed)' : '')).join('; ');
  }
  function transitionConditions(t) {
    const out = [];
    if (t.type === 'scheduled') out.push('Runs automatically after ' + (F.secs(t.schedule && t.schedule.intervalSeconds) || 'a configured interval'));
    if (t.type === 'scheduled-date') out.push('Runs automatically ' + (F.secs(t.schedule && t.schedule.intervalSeconds) || 'a configured time') + ' relative to ' + ((t.schedule && t.schedule.dateFieldLabel) || 'a date field'));
    if (t.type === 'automatic') out.push('Runs automatically when the criteria match');
    if (t.condition) out.push('Condition: ' + t.condition);
    if (t.commentRequired) out.push('Comment required');
    if (t.form) out.push('User completes form ' + q(humanize(t.form)));
    (t.validations || []).forEach(v => out.push('Validation: ' + v));
    if (t.approval && t.approval.required) out.push('Approval required' + (t.approval.approvers && t.approval.approvers.length ? ' by ' + t.approval.approvers.map(F.actorLabel).join(', ') : ''));
    if (t.emailLink) out.push('Can be actioned from the email link');
    if ((t.portals || []).length) out.push('Also shown in ' + list(t.portals.map(p => humanize(p) + ' Portal')));
    return out;
  }
  function flowNarrative(f) {
    if (!f) return [];
    const live = f.transitions.filter(t => !t.removed && t.enabled !== false);
    const st = id => (f.states.find(s => s.id === id) || {}).label || id;
    const out = [];
    const ini = f.states.find(s => s.id === f.initial);
    out.push(`A new record starts in ${q(ini ? ini.label : TBC)}.`);
    const order = []; const seen = new Set([f.initial]); const qq = [f.initial];
    while (qq.length) { const c = qq.shift(); order.push(c); live.filter(t => t.from === c).forEach(t => { if (!seen.has(t.to)) { seen.add(t.to); qq.push(t.to); } }); }
    f.states.forEach(s => { if (!seen.has(s.id)) order.push(s.id); });
    order.forEach(sid => {
      const outs = live.filter(t => t.from === sid); if (!outs.length) return;
      const sentences = outs.map(t => {
        const who = t.type === 'user' ? actorsText(t) : 'The system';
        const how = t.type === 'user' ? `${who} can select ${q(t.name)}` : `${who} applies ${q(t.name)}${t.type === 'scheduled' ? ' after ' + (F.secs(t.schedule && t.schedule.intervalSeconds) || 'a set interval') : t.type === 'scheduled-date' ? ' ' + (F.secs(t.schedule && t.schedule.intervalSeconds) || '') + ' relative to ' + ((t.schedule && t.schedule.dateFieldLabel) || 'a date field') : ' when its criteria are met'}`;
        const extra = []; if (t.condition) extra.push('when ' + t.condition); if (t.commentRequired) extra.push('a comment is mandatory'); if ((t.portals || []).length) extra.push('this action is also available in the ' + list(t.portals.map(p => humanize(p) + ' Portal')));
        if ((t.notifications || []).length) extra.push('notifications go to ' + list(t.notifications));
        return `${how} to move it to ${q(st(t.to))}${extra.length ? ' (' + extra.join('; ') + ')' : ''}.`;
      });
      out.push(`From ${q(st(sid))}: ` + sentences.map(x => x.charAt(0).toUpperCase() + x.slice(1)).join(' '));
    });
    const finals = f.states.filter(s => !live.some(t => t.from === s.id)).map(s => q(s.label));
    if (finals.length) out.push(`The process ends in ${list(finals)}.`);
    const exc = live.filter(t => /reject|cancel|hold|pause|reopen|re-open|return|revert|escalat|reassign/i.test(t.name)).map(t => q(t.name));
    if (exc.length) out.push(`Alternate and exception paths: ${list(exc)}.`);
    const tbc = live.filter(t => t.type === 'user' && (t.actors || []).every(F.isTbc)).map(t => q(t.name));
    if (tbc.length) out.push(`The responsible role for ${list(tbc)} is not defined in the configuration and must be confirmed with the customer.`);
    return out;
  }
  function processNarrative(p) {
    const out = [];
    if (p.objective) out.push(p.objective);
    if (p.trigger) out.push('The process is triggered when ' + p.trigger.replace(/^when\s+/i, '') + '.');
    p.steps.forEach((s, i) => {
      const who = F.actorLabel(s.lane);
      let line = `${i + 1}. ${who}${s.interface ? ' (' + s.interface + ')' : ''}: ${s.action}`;
      if (s.recordLabel) line += ` — record: ${s.recordLabel}`;
      if (s.verification && s.verification !== 'verified') line += ` [${F.VERIFICATION[s.verification]}]`;
      out.push(line.replace(/\.?$/, '.'));
    });
    if (p.outcome) out.push('Outcome: ' + p.outcome);
    return out;
  }
  root.FWBText = { modulePurpose, flowNarrative, processNarrative, transitionConditions, actorsText, fieldRules, portalsFor, list, TBC };
})(typeof window !== 'undefined' ? window : globalThis);

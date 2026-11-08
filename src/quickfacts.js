/* Quick facts: a question the project records answer exactly (the go-live date, where we are, the next step, a step's dates, progress, overdue and my tasks, sign-offs, open risks)
   is answered here at once from the loaded records, with no AI and no wait. Anything else returns null and goes on to the assistant's router (DeepSeek for look-ups, Claude for work). */
(function (root) {
  'use strict';
  const F = root.FWB; const V = root.FWBViews; if (!F || !V) return; const { S } = F; const I = () => V.items;
  const fd = d => (d ? V.fmtDate(d) : 'not set'); const today = () => V.today();
  const days = d => { const n = V.daysBetween(today(), d); return n === 0 ? 'today' : n > 0 ? 'in ' + n + ' day' + (n === 1 ? '' : 's') : -n + ' day' + (n === -1 ? '' : 's') + ' ago'; };
  const me = () => String((S.user && S.user.email) || '').toLowerCase();
  const isOpen = t => !/^(done|closed|resolved|cancelled|complete|completed|answered)$/i.test(String(t.status || ''));
  const dueOf = t => String(t.due || t.eta || '');
  const lines = a => a.filter(Boolean).join('\n');
  const phases = () => { const p = V.phaseNow ? V.phaseNow() : null; return p && p.info ? p : { cur: -1, info: [] }; };
  const words = x => String(x.title).toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3);
  const named = m => phases().info.filter(x => words(x).some(w => new RegExp('\\b' + w + '\\b').test(m))).slice(0, 3);
  const RULES = [
    // [test, answer, page that holds it]
    [m => /go[- ]?live/.test(m) && /(date|when|plan|schedule|due)/.test(m), () => { const st = V.planStats ? V.planStats() : null; return st && st.goLive ? 'Go-live is planned for ' + fd(st.goLive) + ' (' + days(st.goLive) + ').' : 'No go-live date is set in the project plan yet.'; }, 'timeline'],
    [m => /(which|what|current|present).*(stage|phase|step)|where (are|do) we|where we are/.test(m), () => { const p = phases(); const x = p.cur >= 0 ? p.info[p.cur] : null; return x ? lines(['We are in plan step ' + (x.i + 1) + ' of ' + p.info.length + ': ' + x.title + '.', x.start ? 'It runs ' + fd(x.start) + ' to ' + fd(x.end) + '.' : 'It has no dates yet.']) : 'The plan has not started yet.'; }, 'timeline'],
    [m => /(progress|percent|how far|ahead|behind|on track|on plan|% done)/.test(m), () => { const st = V.planStats ? V.planStats() : null; if (!st || !st.n) return 'There is no dated plan yet, so progress cannot be compared with plan.'; const g = st.actual - st.planned; return st.actual + '% is done against ' + st.planned + '% planned: ' + (g === 0 ? 'on plan' : g > 0 ? g + (g === 1 ? ' point' : ' points') + ' ahead' : -g + (g === -1 ? ' point' : ' points') + ' behind') + '.'; }, 'timeline'],
    [m => /\bnext\b.*(milestone|step|phase|stage)|what('s| is) next|what comes next/.test(m), () => { const p = phases(); const x = p.info[p.cur + 1]; return x ? 'Next is step ' + (x.i + 1) + ': ' + x.title + (x.start ? ', starting ' + fd(x.start) + ' (' + days(x.start) + ').' : ', with no dates yet.') : 'There is no later step in the plan.'; }, 'timeline'],
    [m => /(timeline|schedule|dates?|due|start|end|when)/.test(m) && named(m).length > 0, m => lines(named(m).map(x => x.title + ': ' + (x.start ? fd(x.start) + ' to ' + fd(x.end) : 'no dates yet'))), 'timeline'],
    [m => /(overdue|late)/.test(m) && /task|item|action|what|which|how many/.test(m), () => { const l = I().list('task').filter(t => isOpen(t) && dueOf(t) && dueOf(t) < today()); return l.length ? lines([l.length + ' task' + (l.length === 1 ? ' is' : 's are') + ' overdue:'].concat(l.slice(0, 6).map(t => '- ' + (t.n ? 'T-' + t.n + ' ' : '') + t.title + ' (due ' + fd(dueOf(t)) + (t.owner ? ', ' + String(t.owner).split('@')[0] : '') + ')'))) : 'No task is overdue.'; }, 'tasks'],
    [m => /\b(my|mine)\b.*(task|work|to ?do|open)|what (do|should) i (do|have)|assigned to me/.test(m), () => { const l = I().list('task').filter(t => isOpen(t) && String(t.owner || '').toLowerCase() === me()); return l.length ? lines(['You have ' + l.length + ' open task' + (l.length === 1 ? '' : 's') + ':'].concat(l.slice(0, 6).map(t => '- ' + (t.n ? 'T-' + t.n + ' ' : '') + t.title + (dueOf(t) ? ' (due ' + fd(dueOf(t)) + ')' : '')))) : 'You have no open task on this project.'; }, 'tasks'],
    [m => /sign[- ]?offs?/.test(m), () => { const L = { brd: 'BRD sign-off', uat: 'UAT sign-off', golive: 'Go-live acceptance' }; const T = { notdue: 'not due yet', requested: 'waiting for the customer', signed: 'signed', concern: 'a concern was raised' }; return lines(Object.keys(L).map(k => { const x = I().get('signoff', k) || { status: 'notdue' }; return L[k] + ': ' + (T[x.status] || x.status) + (x.status === 'signed' && x.signer ? ' by ' + x.signer : x.due ? ' (due ' + fd(x.due) + ')' : ''); })); }, 'governance'],
    [m => /(risk|issue|raid)/.test(m) && /(how many|count|open|high|number)/.test(m), () => { const l = I().list('raid').filter(r => r.status !== 'Closed'); const hi = l.filter(r => r.impact === 'High'); return l.length + ' open RAID item' + (l.length === 1 ? '' : 's') + (hi.length ? ', ' + hi.length + ' of high impact' : '') + '.'; }, 'governance']
  ];
  /** returns { text, view } for a question the records answer exactly, or null (then the assistant's router decides) */
  V.quickFacts = function (message) {
    const m = String(message || '').toLowerCase(); if (!m || m.length > 160 || /\b(change|update|make|create|write|draft|fix|add|remove|delete|rename|revamp|rewrite|explain|why|summar|compare|check|review)\b/.test(m)) return null;
    if (!I().ready(['task', 'signoff', 'raid'])) { I().load(['task', 'signoff', 'raid']); return null; }
    for (const [test, answer, view] of RULES) { if (test(m)) { let t = ''; try { t = answer(m); } catch (e) { t = ''; } if (t) return { text: t + '\n\nFrom the project records, no AI used.', view }; } }
    return null;
  };
})(typeof window !== 'undefined' ? window : globalThis);

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
  const STOP = new Set(['off', 'sign', 'and', 'the', 'for', 'with', 'phase', 'step', 'final', 'deck']);   // words that sit in many step names ("Kick-Off", "BRD Sign-Off") and say nothing about which one is meant
  const words = x => String(x.title).toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !STOP.has(w));
  const named = m => phases().info.filter(x => words(x).some(w => new RegExp('\\b' + w + '\\b').test(m))).slice(0, 3);
  const RULES = [
    // [test, answer, page that holds it]
    [m => /go[- ]?live/.test(m) && /(date|when|plan|schedule|due)/.test(m), () => { const st = V.planStats ? V.planStats() : null; return st && st.goLive ? 'Go-live is planned for ' + fd(st.goLive) + ' (' + days(st.goLive) + ').' : 'No go-live date is set in the project plan yet.'; }, 'timeline'],
    [m => /(which|what|current|present).*(stage|phase|step)|where (are|do) we|where we are/.test(m), () => { const p = phases(); const x = p.cur >= 0 ? p.info[p.cur] : null; return x ? lines(['We are in plan step ' + (x.i + 1) + ' of ' + p.info.length + ': ' + x.title + '.', x.start ? 'It runs ' + fd(x.start) + ' to ' + fd(x.end) + '.' : 'It has no dates yet.']) : 'The plan has not started yet.'; }, 'timeline'],
    [m => /(progress|percent|how far|ahead|behind|on track|on plan|% done)/.test(m), () => { const st = V.planStats ? V.planStats() : null; if (!st || !st.n) return 'There is no dated plan yet, so progress cannot be compared with plan.'; const g = st.actual - st.planned; return st.actual + '% is done against ' + st.planned + '% planned: ' + (g === 0 ? 'on plan' : g > 0 ? g + (g === 1 ? ' point' : ' points') + ' ahead' : -g + (g === -1 ? ' point' : ' points') + ' behind') + '.'; }, 'timeline'],
    [m => /\bnext\b.*(milestone|step|phase|stage)|what('s| is) next|what comes next/.test(m), () => { const p = phases(); const x = p.info[p.cur + 1]; return x ? 'Next is step ' + (x.i + 1) + ': ' + x.title + (x.start ? ', starting ' + fd(x.start) + ' (' + days(x.start) + ').' : ', with no dates yet.') : 'There is no later step in the plan.'; }, 'timeline'],
    [m => /\b(timeline|schedule|dates?|due|starts?|ends?|when)\b/.test(m) && !/\b(updated?|changed?|done|ready|finished|sent|approved|redesigned|reworded)\b/.test(m) && named(m).length > 0, m => lines(named(m).map(x => x.title + ': ' + (x.start ? fd(x.start) + ' to ' + fd(x.end) : 'no dates yet'))), 'timeline'],
    [m => /\btasks?\b|work ?load/.test(m) && /(who|workload|per person|by person|each person|everyone)/.test(m), () => { const l = I().list('task').filter(isOpen); if (!l.length) return 'No open tasks.'; const by = {}; l.forEach(t => { const k = t.owner ? String(t.owner).split('@')[0] : 'Unassigned'; by[k] = (by[k] || 0) + 1; }); return lines(['Open tasks by person:'].concat(Object.keys(by).sort((a, b) => by[b] - by[a]).slice(0, 8).map(k => '- ' + k + ': ' + by[k]))); }, 'tasks'],
    [m => /sign[- ]?offs?/.test(m), () => { const L = { brd: 'BRD sign-off', uat: 'UAT sign-off', golive: 'Go-live acceptance' }; const T = { notdue: 'not due yet', requested: 'waiting for the customer', signed: 'signed', concern: 'a concern was raised' }; return lines(Object.keys(L).map(k => { const x = I().get('signoff', k) || { status: 'notdue' }; return L[k] + ': ' + (T[x.status] || x.status) + (x.status === 'signed' && x.signer ? ' by ' + x.signer : x.due ? ' (due ' + fd(x.due) + ')' : ''); })); }, 'governance'],
  ];
  // "Is the kick-off deck updated?" is answered by the Claude request behind it, in plain words (done, working with time left, waiting, asking you something, failed), never by a date list.
  // With no matching request it says nothing here and the router decides.
  const STATUS_Q = /\b(is|was|has|have|did|are|were|any)\b.*\b(updated?|changed|done|finished|ready|applied|sent|redesigned|reworded|completed?|news|progress)\b|\bhow long\b|\bstatus of\b.*\b(request|job|change)/;
  const TOPICS = [[/kick-?off|deck|slides?/, /kick|deck|slide|apply_change/], [/\bbrd\b|requirement/, /brd|requirement/], [/\bplan\b|schedule/, /plan/], [/solution/, /solution/], [/guide|training/, /guide|training/], [/mail|e-?mail|repl(y|ies)/, /mail|repl/]];
  const ago = ts => { const m = Math.max(0, (Date.now() - Date.parse(ts)) / 6e4); return m < 1 ? 'less than a minute' : m < 60 ? Math.round(m) + (Math.round(m) === 1 ? ' minute' : ' minutes') : m < 1440 ? Math.round(m / 60) + (Math.round(m / 60) === 1 ? ' hour' : ' hours') : Math.round(m / 1440) + ' day(s)'; };
  const short = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t; };
  function followUp(m) {
    if (!STATUS_Q.test(m)) return null; const J = V.studioJobs, Lg = root.FWBKickoffLogic; if (!J || !J.K || !Lg || !Lg.jobRows || !S.project) return null;
    const k = J.K(); if (!k || k.pid !== S.project.id || !Array.isArray(k.jobs)) return null;
    const topic = TOPICS.find(t => t[0].test(m)); const mine = Lg.jobRows(k.jobs).sort((a, b) => Date.parse(b.at || 0) - Date.parse(a.at || 0));
    const j = mine.find(x => x.status !== 'cancelled' && (!topic || topic[1].test([x.kind, x.label, x.note].join(' ').toLowerCase()))); if (!j) return null;
    const what = short(j.kind === 'chat' ? j.note : j.label, 80), view = topic && topic[0].test('kickoff') ? 'kickoff' : '';
    const done = mine.filter(x => x.kind === j.kind && x.status === 'done' && x.claimedAt && x.finishedAt).map(x => (Date.parse(x.finishedAt) - Date.parse(x.claimedAt)) / 6e4).sort((a, b) => a - b), med = done.length ? done[Math.floor(done.length / 2)] : (j.size === 'heavy' ? 12 : 2);
    const cap = x => x.charAt(0).toUpperCase() + x.slice(1); let t;
    if (j.status === 'done') t = 'Yes. Claude finished "' + what + '" ' + ago(j.finishedAt || j.at) + ' ago: ' + short(String(j.summary || 'Done.').replace(/\n?\s*Tab:\s*[a-z_]+\s*$/i, ''), 260);
    else if (j.status === 'claimed') { const el = (Date.now() - Date.parse(j.claimedAt || j.at)) / 6e4, left = Math.max(1, Math.round(med - el)); t = 'Not yet. Claude is working on "' + what + '": started ' + ago(j.claimedAt || j.at) + ' ago. Requests like this usually take about ' + Math.max(1, Math.round(med)) + ' minute' + (Math.round(med) === 1 ? '' : 's') + (el < med ? ', so roughly ' + left + ' more.' : ', so it should finish any moment.'); }
    else if (j.status === 'waiting') t = 'Not yet. "' + what + '" is still in the queue (' + ago(j.at) + '). Claude takes requests when it checks, usually within a few minutes; if nobody has Claude open it waits until someone does.';
    else if (j.status === 'needs_input') t = 'Claude is waiting for your answer on "' + what + '": ' + short((j.questions || []).filter(x => !/^[-•]\s/.test(String(x).trim())).join(' '), 260);
    else if (j.status === 'failed') t = 'That did not work: "' + what + '" could not be completed (' + short(j.summary || 'no reason given', 200) + '). Send it again to try once more.';
    else return null;
    return { text: cap(t) + '\n\nFrom your Claude requests in this project.', view: j.status === 'done' ? view : '' };
  }
  // the question engine (src/qengine.js) reads the question: what it is about, which ones (priority, status, owner, due date, type, a word), how (list, count, next); the last reading is kept for follow-ups
  let LAST = null, LASTPID = ''; const pidNow = () => String((S.project || {}).id || '');
  const qctx = () => ({ today: today(), me: me(), members: S.members || [], fmtDate: fd, rowsFor: k => I().list(k) });
  const qkind = m => { const Q = root.FWBQuery; return Q ? (Object.keys(Q.KINDS).find(k => Q.KINDS[k].re.test(m)) || (LAST && LAST.kind) || '') : ''; };
  function engine(m) {
    const Q = root.FWBQuery; if (!Q) return null; if (LASTPID !== pidNow()) { LAST = null; LASTPID = pidNow(); }
    const k = qkind(m); if (!k) return null; if (!I().ready([k])) { I().load([k]); return null; }
    const r = Q.answer(m, qctx(), LAST); if (!r) return null; LAST = r.intent; return { text: r.text + '\n\nFrom the project records, no AI used.', view: r.view };
  }
  /** how the engine reads a message, in plain words (empty when it is not a records question): sent to the AI as a hint so DeepSeek and Claude answer the same question */
  V.quickHint = function (message) { try { const Q = root.FWBQuery; if (!Q) return ''; const it = Q.parse(String(message || ''), Object.assign(qctx(), { rows: I().list(qkind(String(message || '').toLowerCase()) || 'task') }), LAST); return it ? Q.describe(it) : ''; } catch (e) { return ''; } };
  /** returns { text, view } for a question the records answer exactly, or null (then the assistant's router decides) */
  V.quickFacts = function (message) {
    const m = String(message || '').toLowerCase(); const fu = m && m.length <= 200 ? followUp(m) : null; if (fu) return fu; if (!m || m.length > 160 || /\b(change[ds]?|update[ds]?|updating|make|made|create[ds]?|write|written|draft|drafted|fix|fixed|add|added|remove[ds]?|delete[ds]?|rename[ds]?|revamp|redesign(ed)?|reword(ed)?|rewrite|rewritten|explain|why|summar|compare|check|review|deck|slides?)\b/.test(m)) return null;   // work, and questions about whether a document was changed, go to Claude or the router, never to a date look-up
    if (!I().ready(['task', 'signoff', 'raid'])) { I().load(['task', 'signoff', 'raid']); return null; }
    const ex = engine(m); if (ex) return ex;
    for (const [test, answer, view] of RULES) { if (test(m)) { let t = ''; try { t = answer(m); } catch (e) { t = ''; } if (t) return { text: t + '\n\nFrom the project records, no AI used.', view }; } }
    return null;
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* Question engine (9 Nov 2026): reads a question about the project's records the way a person means it and answers it exactly.
   It finds WHAT is asked about (tasks, risks and issues, change requests, decisions, actions, test cases, tickets), WHICH ones (priority, status, owner, due date, type, a word in the title)
   and HOW (a list, a count, the next one), then applies exactly those filters to the records and says how it read the question. A question it cannot read with confidence returns null, so the AI
   (DeepSeek or Claude) takes it, with the same reading passed along as a hint (see describe). Follow-ups ("only mine", "which of those are overdue") reuse the last question.
   Pure code: no DOM, no network. Run by tests/qengine.mjs; used by src/quickfacts.js and src/assistant.js. */
(function (root) {
  'use strict';
  const lc = v => String(v == null ? '' : v).toLowerCase(); const pick = (o, ks) => { for (const k of ks) if (o && o[k] != null && o[k] !== '') return o[k]; return ''; };
  const KINDS = {
    task: { re: /\b(tasks?|to-?dos?)\b/, one: 'task', many: 'tasks', id: t => t.n ? 'T-' + t.n : '', title: ['title'], status: ['status'], prio: ['priority'], owner: ['owner'], due: ['due', 'eta'], mod: ['module'], view: 'tasks', done: /^(done|closed|resolved|cancelled|canceled|complete|completed|answered)$/i },
    raid: { re: /\b(risks?|issues?|raid|assumptions?|dependenc(y|ies))\b/, one: 'RAID item', many: 'RAID items', id: () => '', title: ['title'], status: ['status'], prio: ['impact'], owner: ['owner'], due: ['due'], mod: ['mod'], type: ['type'], view: 'governance', done: /^(closed|resolved|mitigated|accepted)$/i },
    cr: { re: /\bchange requests?\b|\bcrs?\b/, one: 'change request', many: 'change requests', id: t => t.n ? 'CR-' + t.n : '', title: ['title', 'summary'], status: ['status'], prio: ['priority', 'impact'], owner: ['owner', 'requestedBy'], due: [], mod: ['mod', 'module'], view: 'changes', done: /converted|rejected|closed|implemented|cancel|withdrawn/i },
    decision: { re: /\bdecisions?\b/, one: 'decision', many: 'decisions', id: () => '', title: ['title'], status: ['status'], prio: [], owner: ['owner', 'by'], due: [], mod: ['mod'], view: 'governance', done: /^(superseded|rejected)$/i },
    action: { re: /\bactions?( items?)?\b/, one: 'action', many: 'actions', id: () => '', title: ['text'], status: ['status'], prio: [], owner: ['owner'], due: ['due'], mod: ['mod'], view: 'governance', done: /^(done|closed|cancelled)$/i },
    utc: { re: /\b(uat|test cases?|tests?)\b/, one: 'test case', many: 'test cases', id: () => '', title: ['title', 'name', 'scenario'], status: ['result'], prio: ['priority'], owner: ['owner', 'tester'], due: [], mod: ['module', 'mod'], view: 'delivery', done: /^(passed|failed)$/i },
    tkt: { re: /\btickets?\b/, one: 'ticket', many: 'tickets', id: t => t.n ? 'TKT-' + t.n : '', title: ['subject'], status: ['status'], prio: ['priority'], owner: ['assignee', 'owner'], due: ['due'], mod: ['category'], view: 'tickets', done: /^(resolved|closed|cancelled)$/i }
  };
  const TYPE_CODE = { R: 'risk', A: 'assumption', I: 'issue', D: 'dependency' };
  const LEVELS = { high: /^(high|critical|urgent|highest|p1|major)$/i, medium: /^(medium|normal|moderate|p2)$/i, low: /^(low|minor|lowest|p3)$/i };
  const LEVEL_WORDS = [['high', 'high(?:est)?|critical|urgent|top|important|major|p1'], ['medium', 'medium|normal|moderate|p2'], ['low', 'low(?:est)?|minor|p3']];
  const STATUS_WORDS = [['done', /\b(done|completed?|finished|closed|resolved|passed|signed|converted|approved|agreed)\b/g], ['blocked', /\b(blocked|stuck|on hold|waiting|stalled)\b/g], ['progress', /\b(in progress|ongoing|started|working on|being worked|underway|in review|under review)\b/g], ['failed', /\b(failed|failing|not passed)\b/g],
    ['open', /\b(pending|open|outstanding|remaining|unresolved|to ?do|not (?:yet )?(?:done|started|finished|complete|completed)|still|left|active|new|proposed|draft)\b/g]];
  const STOP = new Set(('what whats which who whom whose are is was were the a an of on in at to for from with and or any all me my mine our us we you your please show list give tell see have has had do does did there their this that those these them it its be been being can could would should will just only also about now currently today right yet still more most some how many much number count total tasks task risk risks issue issues change request requests decision decisions action actions item items test tests case cases ticket tickets raid priority priorities impact status statuses level levels one ones next first last due by before after than then ok okay hi hello thanks thank pending open outstanding remaining done completed finished closed resolved high medium low critical urgent important minor normal overdue late blocked stuck waiting progress ongoing assigned owned owner belongs belonging people person team project week month tomorrow yesterday soon upcoming unassigned nobody uat').split(' '));
  const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
  const word = s => String(s || '').toLowerCase().replace(/[^a-z0-9@.' -]/g, ' ').replace(/\s+/g, ' ').trim();
  const local = e => String(e || '').split('@')[0];
  const NO_WAY = /\b(who|workload|per person|by person|each person|everyone|most|least|average|trend|why|how (?:do|can|should)|explain|summar\w*|compare|draft|write|create|update|make|add|remove|delete|rename|send)\b/;
  /** the people the records know: owner values and members, so "assigned to sam" can be matched */
  function peopleOf(rows, def, ctx) { const set = new Map(); const add = (email, name) => { const k = lc(email || name); if (k && !set.has(k)) set.set(k, { key: k, email: lc(email), name: String(name || local(email) || '') }); };
    (ctx.members || []).forEach(m => add(m.email, m.name)); rows.forEach(r => { const o = pick(r, def.owner); if (o) add(/@/.test(o) ? o : '', /@/.test(o) ? local(o) : o); }); return [...set.values()]; }
  const matchPerson = (tok, people) => { const t = lc(tok).replace(/['’]s$/, '').trim(); if (!t) return null; const hits = people.filter(p => lc(p.name).split(/[\s._-]+/).includes(t) || local(p.email).split(/[._-]+/).includes(t) || lc(p.name) === t || local(p.email) === t); return hits.length === 1 ? hits[0] : null; };
  const kindOf = m => Object.keys(KINDS).find(k => KINDS[k].re.test(m));

  /** read the question: { kind, f: {prio, status, owner, due, type, text[]}, ask } or null when it is not a records question that can be read with confidence */
  function parse(msg, ctx, last) {
    const m = word(msg); if (!m || m.length > 200) return null; ctx = ctx || {};
    let kind = kindOf(m); const followOpen = /^(and |but |now |ok |so |what about |how about |only |just |also |which |of those|of them|those|them|the )/.test(m) || m.split(' ').length <= 5;
    let carried = false; if (!kind && last && last.kind && followOpen) { kind = last.kind; carried = true; } if (!kind) return null; const def = KINDS[kind];
    if (NO_WAY.test(m.replace(/\bchange requests?\b/g, ''))) return null;
    const f = { prio: '', status: '', owner: null, due: '', type: '', text: [] }; let rest = ' ' + m + ' '; const cut = re => { rest = rest.replace(re, ' '); };
    // priority / impact
    if (def.prio.length) {
      if (/\b(no|without|missing) (priority|impact)\b|\bunprioriti[sz]ed\b/.test(m)) { f.prio = 'none'; cut(/\b(no|without|missing) (priority|impact)\b|\bunprioriti[sz]ed\b/g); }
      else for (const [lvl, src] of LEVEL_WORDS) { const re = new RegExp('\\b(' + src + ')\\b'); if (re.test(m)) { f.prio = lvl; cut(new RegExp('\\b(' + src + ')( priority| impact| severity)?\\b', 'g')); break; } }
      cut(/\b(priority|impact|severity)\b/g); }
    // owner
    const people = peopleOf(ctx.rows || [], def, ctx);
    if (/\b(my|mine|assigned to me|for me|i (?:have|own|am)|on me|owned by me)\b/.test(m)) { f.owner = { me: true }; cut(/\b(my|mine|assigned to me|for me|owned by me|on me|i (?:have|own|am))\b/g); }
    else if (/\b(unassigned|no owner|nobody|without (?:an )?owner|not assigned)\b/.test(m)) { f.owner = { none: true }; cut(/\b(unassigned|no owner|nobody|without (?:an )?owner|not assigned)\b/g); }
    else { const pm = /\b(?:assigned to|owned by|owner is|belonging to|belongs to|given to)\s+([a-z][a-z.'-]*)|\b([a-z][a-z.-]{2,})'s\s+(?:open |pending |overdue |high )?(?:tasks?|risks?|issues?|actions?|items?|tickets?)|\b(?:of|for|by)\s+([a-z][a-z.-]{2,})\b/.exec(m);
      if (pm) { const tok = pm[1] || pm[2] || pm[3]; const p = tok && !STOP.has(tok) ? matchPerson(tok, people) : null; if (p) { f.owner = { key: p.key, name: p.name }; cut(new RegExp('\\b(assigned to|owned by|owner is|belonging to|belongs to|given to|of|for|by)\\s+' + tok.replace(/\./g, '\\.') + "\\b|\\b" + tok.replace(/\./g, '\\.') + "'s\\b", 'g')); } else if (/\b(assigned to|owned by)\b/.test(m)) return null; } }
    // due
    if (/\b(overdue|late|past due|missed)\b/.test(m)) { f.due = 'overdue'; cut(/\b(overdue|late|past due|missed)\b/g); } else if (/\bdue today\b|\btoday\b/.test(m)) { f.due = 'today'; cut(/\b(due )?today\b/g); } else if (/\btomorrow\b/.test(m)) { f.due = 'tomorrow'; cut(/\b(due )?tomorrow\b/g); } else if (/\bnext week\b/.test(m)) { f.due = 'nextweek'; cut(/\b(due )?next week\b/g); } else if (/\b(this week|due soon|upcoming|coming up|next few days)\b/.test(m)) { f.due = 'week'; cut(/\b(due )?(this week|soon|upcoming|coming up|next few days)\b/g); } else if (/\bthis month\b/.test(m)) { f.due = 'month'; cut(/\b(due )?this month\b/g); } else if (/\b(without|no) (a )?(due|deadline)\b/.test(m)) { f.due = 'nodue'; cut(/\b(without|no) (a )?(due|deadline)\b/g); }
    cut(/\bdue( dates?)?\b|\bdeadlines?\b/g);
    // status
    for (const [k, re] of STATUS_WORDS) { re.lastIndex = 0; if (re.test(m)) { f.status = k; re.lastIndex = 0; cut(re); break; } }
    // RAID type
    if (kind === 'raid') { const tm = /\b(risks?|issues?|assumptions?|dependenc(?:y|ies))\b/.exec(m); if (tm) f.type = tm[1].replace(/ies$/, 'y').replace(/s$/, ''); }
    // what is left: a few specific words become a text filter; many unknown words mean this is not a records question
    cut(def.re); cut(/\b(how many|number of|count of|count)\b/g);
    const left = word(rest).split(' ').filter(w => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w)); if (left.length > 3) return null; f.text = left;
    const ask = /\bhow many|number of|\bcount\b|\btotal\b/.test(m) ? 'count' : /\b(next|earliest|soonest)\b/.test(m) ? 'next' : 'list';
    const own = !!(f.prio || f.status || f.owner || f.due || f.type || f.text.length);
    if (carried && !own) return null;
    if (carried && last && last.f) { ['prio', 'status', 'owner', 'due', 'type'].forEach(k => { if (!f[k] && last.f[k]) f[k] = last.f[k]; }); if (!f.text.length && last.f.text) f.text = last.f.text.slice(); }
    return { kind, f, ask, carried };
  }
  const isDone = (def, r) => def.done.test(String(pick(r, def.status)).trim());
  function statusOk(def, r, s) { const v = lc(pick(r, def.status)); if (!s || s === 'open') return !isDone(def, r); if (s === 'done') return isDone(def, r); if (s === 'blocked') return /block|hold|wait|stuck/.test(v); if (s === 'progress') return /progress|doing|work|review|started/.test(v); if (s === 'failed') return /fail/.test(v); return true; }
  function dueState(def, r, due, T) { const d = String(pick(r, def.due) || '').slice(0, 10); if (due === 'nodue') return !d; if (!d) return false; const n = days(T, d); return due === 'overdue' ? n < 0 : due === 'today' ? n === 0 : due === 'tomorrow' ? n === 1 : due === 'week' ? n >= 0 && n <= 7 : due === 'nextweek' ? n >= 7 && n <= 14 : due === 'month' ? n >= 0 && n <= 31 : true; }
  function apply(intent, rows, ctx) {
    const def = KINDS[intent.kind], f = intent.f, T = (ctx || {}).today || new Date().toISOString().slice(0, 10), me = lc((ctx || {}).me);
    return rows.filter(r => {
      if (!statusOk(def, r, f.status)) return false;
      if (f.prio) { const v = String(pick(r, def.prio)).trim(); if (f.prio === 'none' ? !!v : !LEVELS[f.prio].test(v)) return false; }
      if (f.owner) { const o = lc(pick(r, def.owner)); const ok = f.owner.me ? !!(o && (o === me || local(o) === local(me))) : f.owner.none ? !o : !!(o && (o === f.owner.key || local(o) === local(f.owner.key) || lc(local(o)).replace(/[._-]/g, ' ') === lc(f.owner.name))); if (!ok) return false; }
      if (f.due && !dueState(def, r, f.due, T)) return false;
      if (f.type) { const t = String(pick(r, def.type)); if ((TYPE_CODE[t.toUpperCase()] || lc(t)) !== f.type) return false; }
      if (f.text.length) { const hay = lc([pick(r, def.title), pick(r, def.mod), r.desc, r.detail, r.notes, r.stage].join(' ')); if (!f.text.every(w => hay.includes(w))) return false; }
      return true; });
  }
  /** how the question was read, in plain words (shown to the person, and passed to the AI as a hint) */
  function describe(intent, count) { const def = KINDS[intent.kind], f = intent.f, bits = [], sing = count === 1;
    bits.push(({ done: 'finished', open: 'open', blocked: 'blocked or waiting', progress: 'in progress', failed: 'failed' })[f.status] || 'open'); bits.push(f.type ? f.type + (sing ? '' : 's') : sing ? def.one : def.many);
    if (f.prio) bits.push(f.prio === 'none' ? 'with no ' + (def.prio[0] === 'impact' ? 'impact' : 'priority') + ' set' : 'with ' + f.prio + ' ' + (def.prio[0] === 'impact' ? 'impact' : 'priority'));
    if (f.owner) bits.push(f.owner.me ? 'assigned to you' : f.owner.none ? 'with no owner' : 'assigned to ' + f.owner.name);
    if (f.due) bits.push(({ overdue: sing ? 'that is overdue' : 'that are overdue', today: 'due today', tomorrow: 'due tomorrow', week: 'due in the next 7 days', nextweek: 'due next week', month: 'due this month', nodue: 'with no due date' })[f.due]);
    if (f.text.length) bits.push('mentioning "' + f.text.join(' ') + '"'); return bits.join(' '); }
  const SHOW = 8;
  function answer(msg, ctx, last) {
    const m = word(msg); const k0 = kindOf(m) || (last && last.kind) || 'task'; const rows0 = ctx.rowsFor ? ctx.rowsFor(k0) : [];
    const intent = parse(msg, Object.assign({}, ctx, { rows: rows0 }), last); if (!intent) return null;
    const def = KINDS[intent.kind], rows = intent.kind === k0 ? rows0 : (ctx.rowsFor ? ctx.rowsFor(intent.kind) : []); const hit = apply(intent, rows, ctx);
    if (!hit.length && intent.f.text.length) return null;   // an unknown word matched nothing: do not claim "none", let the AI look
    const fmt = ctx.fmtDate || (d => d);
    const line = r => { const meta = [pick(r, def.owner) ? local(pick(r, def.owner)) : '', pick(r, def.due) ? 'due ' + fmt(String(pick(r, def.due)).slice(0, 10)) : '', pick(r, def.prio) || '', pick(r, def.status) && !intent.f.status ? pick(r, def.status) : ''].filter(Boolean); return '- ' + [def.id(r), String(pick(r, def.title) || '(no title)').slice(0, 90)].filter(Boolean).join(' ') + (meta.length ? ' (' + meta.join(' · ') + ')' : ''); };
    const said = describe(intent); let t;
    if (intent.ask === 'count') t = hit.length + ' ' + describe(intent, hit.length) + '.';
    else if (!hit.length) { let alt = ''; if (intent.f.prio && intent.f.prio !== 'none' && def.prio.length) { const open = apply({ kind: intent.kind, f: Object.assign({}, intent.f, { prio: '' }) }, rows, ctx); const nop = open.filter(r => !String(pick(r, def.prio)).trim()).length; if (open.length) alt = '\n' + open.length + ' ' + describe({ kind: intent.kind, f: Object.assign({}, intent.f, { prio: '' }) }) + (nop === open.length ? ' in all, and none of them has a ' + (def.prio[0] === 'impact' ? 'impact' : 'priority') + ' set.' : nop ? ' in all, ' + nop + ' of them with no ' + (def.prio[0] === 'impact' ? 'impact' : 'priority') + ' set.' : ' in all.'); } t = 'None: no ' + said + '.' + alt; }
    else if (intent.ask === 'next') { const s = hit.filter(r => pick(r, def.due)).sort((a, b) => String(pick(a, def.due)).localeCompare(String(pick(b, def.due)))); t = s.length ? 'The next one due:\n' + line(s[0]) : 'None of the ' + hit.length + ' ' + said + ' has a due date.'; }
    else t = hit.length + ' ' + describe(intent, hit.length) + ':\n' + hit.slice(0, SHOW).map(line).join('\n') + (hit.length > SHOW ? '\n…and ' + (hit.length - SHOW) + ' more (open the page for all).' : '');
    return { text: 'I read this as: ' + said + '.\n' + t, view: def.view, intent: { kind: intent.kind, f: intent.f }, said };
  }
  const api = { parse, apply, describe, answer, KINDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; root.FWBQuery = api;
})(typeof window !== 'undefined' ? window : globalThis);

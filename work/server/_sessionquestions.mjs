/* ONE copy of these rules, used in two places: build.mjs adds this file to the browser bundle (a plain script: it sets window.FWBSessionQuestions) and the server and the tests
   import it as a module (it sets globalThis.FWBSessionQuestions, read by work/server/_questionsapi.mjs). It lives under work/server so that build.mjs copies it to dist/server. Questions to ask in a workshop: pure code (no DOM, no network, no model), run by tests/session_questions.mjs.
   prepareQuestions(input): from what the Studio already holds (scope items, requirements, open questions, MSA exclusion sentences, planned sessions, optional earlier
   transcript statements) it works out which questions a consultant should put to the customer before and during a workshop. Every question names the data that
   triggered it (sources) and says why it is asked. Nothing is invented: no data, no question. The wording of a question may be rephrased by a person or by Claude later;
   the SET of questions and the reasons come only from the rules below. A spoken statement is only ever quoted as context; it never becomes a requirement.
   liveAsk(prepared, transcriptSoFar, options): during a call, marks which prepared questions now look answered (word overlap, documented thresholds) and suggests what to ask next.
   It never claims certainty: the best answer is 'likely', and a person decides. */
(function (root) {
  'use strict';
  const PRI = { must: 0, should: 1, could: 2 };
  const KINDS = ['conflict', 'scope_unclear', 'scope_no_requirement', 'open_question', 'decision_pending', 'requirement_gap', 'dependency', 'onboarding_data', 'no_session'];   // tie-break order inside one priority
  const CAP = 600, QUOTE = 240, MAXN = 5000;   // hostile input: strings are cut, lists are limited
  const STOP = new Set('that this with from shall will must should have been were their there which when what whether also only other than then into over under about after before between within without would could these those them they customer client facilio system module modules include included including provide provided service services agreement project solution support require required requirement requirements need needs able allow allows user users data process processes manage management does your ours and the for are can not all any has had its our who how why per via'.split(' '));
  const str = (v, n) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '').replace(/\s+/g, ' ').trim().slice(0, n || CAP);
  const arr = v => (Array.isArray(v) ? v.slice(0, MAXN) : []);
  const obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  // significant words: lower case, 3+ letters, trailing "s" dropped so "orders" meets "order"
  const words = s => { const out = []; String(s == null ? '' : s).slice(0, CAP * 4).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(' ').forEach(w => { if (w.length >= 3 && !STOP.has(w)) { const x = w.length > 4 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w; if (!out.includes(x)) out.push(x); } }); return out; };
  const shared = (a, bset) => a.filter(w => bset.has(w));
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const qid = (kind, mod, refs) => 'sq_' + hash(kind + '|' + mod + '|' + refs.slice().sort().join('|'));
  const OUT = /^(rejected|deferred|superseded|removed|merged|cancelled|withdrawn|declined)$/i;
  const CLOSED = /^(answered|closed|resolved|done|decided|approved)$/i;
  const HAS_ACCEPT = /\b(acceptance|accepted when|done when|success (?:is|means|criteria)|given\b.{0,120}\bthen\b|within \d|at least \d|no more than|not more than|less than \d|\d+ ?(?:%|percent|seconds|minutes|hours|days))\b|\d ?%/i;
  const scopeStatus = s => { s = String(s || '').toLowerCase(); return s === 'confirmed' || s === 'matched' ? 'confirmed' : s === 'excluded' ? 'excluded' : 'unclear'; };

  // ---------- the rules ----------
  function prepareQuestions(input) {
    const inp = obj(input); const gaps = []; const gap = (code, message) => { if (!gaps.some(g => g.code === code && g.message === message)) gaps.push({ code, message }); };
    const rawMods = arr(inp.modules); const hasSessions = Array.isArray(inp.sessions); const sessions = arr(inp.sessions).map(obj);
    const statements = arr(inp.statements).map(obj).filter(s => str(s.text)).map(s => ({ speaker: str(s.speaker, 80), at: str(s.at, 40), text: str(s.text, QUOTE * 2), ref: str(s.ref || s.id, 80), w: words(s.text) }));
    const globalEx = arr(inp.exclusions).map(e => str(typeof e === 'string' ? e : obj(e).text)).filter(Boolean);
    const mods = []; let skipped = 0; const seenMod = new Set();
    rawMods.forEach(m0 => { if (!m0 || typeof m0 !== 'object' || Array.isArray(m0)) { skipped++; return; } const m = m0; const name = str(m.name, 80); if (seenMod.has(name)) return; if (!name && !arr(m.scopeItems).length && !arr(m.requirements).length && !arr(m.openQuestions).length) { skipped++; return; } seenMod.add(name);
      mods.push({ name, label: str(m.label, 80) || name || 'General (not linked to a module)',
        scope: arr(m.scopeItems).map(obj).map((x, i) => ({ id: str(x.id, 80) || 'scope-' + (i + 1), text: str(x.text), status: scopeStatus(x.status) })).filter(x => x.text),
        reqs: arr(m.requirements).map(obj).map((x, i) => ({ id: str(x.id, 80) || 'req-' + (i + 1), text: str(x.text), status: str(x.status, 40), owner: str(x.owner, 120), acceptance: str(x.acceptance, 400) })).filter(x => x.text && !OUT.test(x.status)),
        qs: arr(m.openQuestions).map(obj).map((x, i) => ({ id: str(x.id, 80) || 'oq-' + (i + 1), text: str(x.text), from: x.from === 'facilio' ? 'facilio' : 'customer', status: str(x.status, 40) })).filter(x => x.text && !CLOSED.test(x.status)),
        ex: arr(m.exclusions).map(e => str(typeof e === 'string' ? e : obj(e).text)).filter(Boolean).concat(globalEx),
        decisions: arr(m.decisions).map(obj).map((x, i) => ({ id: str(x.id, 80) || 'dec-' + (i + 1), text: str(x.text), status: str(x.status, 40) })).filter(x => x.text && !CLOSED.test(x.status)),
        data: arr(m.onboardingData).map(obj).map((x, i) => ({ id: str(x.id, 80) || 'data-' + (i + 1), text: str(x.text), status: str(x.status, 40) })).filter(x => x.text && !/^(confirmed|received|provided|done|approved)$/i.test(x.status)) }); });
    if (skipped) gap('skipped_input', skipped + ' module entr' + (skipped === 1 ? 'y was' : 'ies were') + ' not usable (not an object, or no name and no content) and were skipped.');
    if (!mods.length) { gap('no_modules', 'No modules were supplied, so no questions can be prepared.'); return { byModule: [], gaps }; }
    if (!hasSessions) gap('sessions_not_supplied', 'Planned sessions were not supplied, so "no session planned" questions were not worked out.');
    if (!statements.length) gap('no_statements', 'No earlier transcript statements were supplied; questions carry no spoken context.');
    const planned = name => sessions.some(s => (str(s.module, 80) === name || arr(s.modules).some(x => str(x, 80) === name)) && !/^(cancelled|canceled|postponed)$/i.test(str(s.status, 20)));   // a held session still counts as planned for the module; a cancelled or postponed one does not
    const byId = new Map();
    // earlier statements that overlap the trigger text enough (3 shared words) are attached as context only
    const context = text => { const tw = new Set(words(text)); if (tw.size < 3) return []; const out = []; for (let i = 0; i < statements.length && out.length < 2; i++) { if (shared(statements[i].w, tw).length >= 3) out.push({ type: 'statement', ref: statements[i].ref || ('statement-' + (i + 1)), quote: statements[i].text.slice(0, QUOTE), speaker: statements[i].speaker, at: statements[i].at }); } return out; };
    const src = (type, ref, quote) => (quote ? { type, ref, quote: quote.slice(0, QUOTE) } : { type, ref });
    const add = (m, kind, priority, text, why, sources, topic) => { const refs = sources.map(s => s.type + ':' + s.ref); const id = qid(kind, m.name, refs); if (byId.has(id)) return; byId.set(id, { module: m.name, q: { id, text, kind, why, sources: sources.concat(context(topic || '')), priority } }); };

    mods.forEach(m => {
      const live = m.scope.filter(x => x.status !== 'excluded');
      const reqW = m.reqs.map(r => ({ r, w: new Set(words(r.text)) }));
      const mention = (text) => { const w = words(text); if (!w.length) return []; const need = Math.min(2, w.length); return reqW.filter(x => shared(w, x.w).length >= need).map(x => x.r); };
      m.scope.forEach(x => {
        if (x.status === 'unclear') add(m, 'scope_unclear', 'must', 'Is "' + x.text + '" in scope for ' + m.label + '? Please confirm what is included.', 'The scope item "' + x.text + '" is marked unclear, so neither side has confirmed it.', [src('scope', x.id, x.text)], x.text);
        else if (x.status === 'confirmed' && !mention(x.text).length) add(m, 'scope_no_requirement', 'must', 'What exactly do you need from "' + x.text + '" in ' + m.label + '? Walk us through how you do it today.', 'The scope item "' + x.text + '" is confirmed but no requirement for ' + m.label + ' mentions it yet.', [src('scope', x.id, x.text)], x.text);
        else if (x.status === 'excluded') mention(x.text).forEach(r => add(m, 'conflict', 'must', 'Requirement ' + r.id + ' mentions "' + x.text + '", which is marked as excluded from scope. Should it be removed, or does it need a change request?', 'Excluded scope item "' + x.text + '" and requirement ' + r.id + ' ("' + r.text.slice(0, 100) + '") share the same wording.', [src('scope', x.id, x.text), src('requirement', r.id, r.text)], x.text + ' ' + r.text));
      });
      m.ex.forEach((e, i) => { const ew = words(e); if (ew.length < 2) return; reqW.forEach(({ r, w }) => { const hit = shared(ew, w); if (hit.length >= 3 || (hit.length >= 2 && ew.length <= 3)) add(m, 'conflict', 'must', 'Requirement ' + r.id + ' may fall under an MSA exclusion. Is it in scope, or does it need a change request?', 'The MSA exclusion "' + e.slice(0, 120) + '" shares the words ' + hit.slice(0, 4).join(', ') + ' with requirement ' + r.id + '. Read the clause: this is a word match, not a contract decision.', [src('exclusion', hash(e), e), src('requirement', r.id, r.text)], e + ' ' + r.text); }); });
      m.qs.forEach(q => add(m, 'open_question', 'should', (q.from === 'customer' ? 'Customer to answer: ' : 'Facilio to answer: ') + q.text, 'Open question ' + q.id + ' is unanswered; the ' + (q.from === 'customer' ? 'customer' : 'Facilio team') + ' owes the answer.', [src('openQuestion', q.id, q.text)], q.text));
      m.decisions.forEach(d => add(m, 'decision_pending', 'must', 'Decision needed: ' + d.text, 'Decision ' + d.id + ' is still pending.', [src('decision', d.id, d.text)], d.text));
      m.reqs.forEach(r => { const noOwner = !r.owner, noAcc = !(r.acceptance || HAS_ACCEPT.test(r.text)); if (!noOwner && !noAcc) return; const miss = [noOwner && 'an owner', noAcc && 'acceptance wording'].filter(Boolean).join(' and ');
        add(m, 'requirement_gap', 'should', (noOwner ? 'Who on your side owns requirement ' + r.id + '? ' : '') + (noAcc ? 'How will we know requirement ' + r.id + ' is done and accepted?' : ''), 'Requirement ' + r.id + ' has no ' + miss + '.', [src('requirement', r.id, r.text)], r.text); });
      if (hasSessions && (live.length || m.reqs.length) && m.name && !planned(m.name)) add(m, 'no_session', 'must', 'No workshop is planned for ' + m.label + '. When can the right people meet?', m.label + ' has ' + (live.length ? live.length + ' scope item(s)' : m.reqs.length + ' requirement(s)') + ' but no open planned session.', [src('module', m.name)], '');
      m.data.forEach(d => add(m, 'onboarding_data', 'should', 'Can you confirm this data for onboarding: ' + d.text + '?', 'Onboarding data "' + d.text + '" has not been confirmed by anyone.', [src('onboardingData', d.id, d.text)], d.text));
      // dependency: another module's name appears in this module's scope text
      mods.forEach(o => { if (o === m || !o.name || o.label.length < 4) return; const re = new RegExp('(^|[^a-z0-9])' + o.label.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, '[^a-z0-9]+') + '([^a-z0-9]|$)'); live.forEach(x => { if (re.test(x.text.toLowerCase())) add(m, 'dependency', 'should', m.label + ' refers to ' + o.label + ' ("' + x.text.slice(0, 100) + '"). What does ' + m.label + ' need from ' + o.label + ', and which has to be ready first?', 'The scope item "' + x.text + '" in ' + m.label + ' names the module ' + o.label + '.', [src('scope', x.id, x.text), src('module', o.name)], x.text); }); });
    });
    const label = new Map(mods.map(m => [m.name, m.label]));
    const all = Array.from(byId.values()).sort((a, b) => PRI[a.q.priority] - PRI[b.q.priority] || (a.module < b.module ? -1 : a.module > b.module ? 1 : 0) || KINDS.indexOf(a.q.kind) - KINDS.indexOf(b.q.kind) || (a.q.id < b.q.id ? -1 : 1));
    const by = new Map(); all.forEach(x => { if (!by.has(x.module)) by.set(x.module, []); by.get(x.module).push(x.q); });
    mods.forEach(m => { if (!by.has(m.name)) { gap('no_questions', label.get(m.name) + ': the supplied data raised no question.'); } if (!m.scope.length) gap('no_scope_items', label.get(m.name) + ' has no scope items, so scope questions cannot be worked out for it.'); });
    return { byModule: Array.from(by.entries()).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map(([module, questions]) => ({ module, label: label.get(module) || module, questions })), gaps };
  }

  // plain-text agenda for copying (the same set, in the same order)
  function agendaText(prepared, title) { const p = obj(prepared); const out = [str(title, 120) || 'Workshop questions', '']; arr(p.byModule).forEach(g => { out.push(String(g.label || g.module || 'General').toUpperCase()); arr(g.questions).forEach((q, i) => { out.push((i + 1) + '. [' + q.priority + '] ' + q.text); out.push('   Why: ' + q.why); arr(q.sources).filter(s => s.type !== 'statement').forEach(s => out.push('   Source: ' + s.type + ' ' + s.ref + (s.quote ? ' - "' + s.quote + '"' : ''))); }); out.push(''); }); if (arr(p.gaps).length) { out.push('NOT WORKED OUT'); arr(p.gaps).forEach(g => out.push('- ' + g.message)); } return out.join('\n').trim(); }

  // ---------- live ----------
  /* A prepared question looks answered when ONE chunk (or two neighbouring chunks by the same speaker) is not itself a question, adds words the question does not contain,
     and shares enough of the question's topic words (the words of the data that triggered it; the question wording itself is ignored, so "what" and "confirm" never count):
       likely   : at least 3 topic words shared and at least 60% of them
       possible : at least 2 topic words shared and at least 40% of them
     A question with fewer than 2 topic words can never be marked answered (nothing to match on). 'likely' is the highest claim: a person must still confirm. */
  const LIKELY = { n: 3, r: 0.6 }, POSSIBLE = { n: 2, r: 0.4 };
  function liveAsk(prepared, transcriptSoFar, options) {
    const o = obj(options); const lk = obj(o.likely), ps = obj(o.possible); const L = { n: Number(lk.n) || LIKELY.n, r: Number(lk.r) || LIKELY.r }, P = { n: Number(ps.n) || POSSIBLE.n, r: Number(ps.r) || POSSIBLE.r };
    const qs = []; arr(obj(prepared).byModule).forEach(g => arr(obj(g).questions).forEach(q => { q = obj(q); if (str(q.id, 80)) { const topic = arr(q.sources).filter(s => obj(s).type !== 'statement').map(s => obj(s).quote || '').join(' ') || str(q.text); qs.push({ q, topic: new Set(words(topic)) }); } }));
    let chunks = Array.isArray(transcriptSoFar) ? transcriptSoFar : typeof transcriptSoFar === 'string' ? transcriptSoFar.split(/\r?\n/).map(t => ({ text: t })) : [];
    chunks = chunks.slice(-MAXN * 2).map(c => { c = obj(c); const text = str(c.text, 2000); return { speaker: str(c.speaker, 80), at: str(c.at, 40), text, w: words(text), isQ: /\?\s*$/.test(text) }; }).filter(c => c.text);
    const index = new Map(); qs.forEach((x, i) => { if (x.topic.size >= 2) x.topic.forEach(w => { if (!index.has(w)) index.set(w, []); index.get(w).push(i); }); });
    const best = new Map();   // question index -> best evidence
    const test = (c, quote, speaker, at) => { if (c.isQ || !c.w.length) return; const hits = new Map(); c.w.forEach(w => { (index.get(w) || []).forEach(i => hits.set(i, (hits.get(i) || 0) + 1)); });
      hits.forEach((n, i) => { const t = qs[i].topic; const r = n / t.size; if (c.w.length <= n) return;   // an answer adds something the question did not say
        const conf = n >= L.n && r >= L.r ? 'likely' : n >= P.n && r >= P.r ? 'possible' : ''; if (!conf) return; const sc = (conf === 'likely' ? 2 : 1) + r; const b = best.get(i); if (!b || sc > b.sc) best.set(i, { sc, conf, evidence: { speaker, at, quote: quote.slice(0, 200) } }); }); };
    for (let k = 0; k < chunks.length; k++) { const c = chunks[k]; test(c, c.text, c.speaker, c.at); const d = chunks[k + 1]; if (d && c.speaker && c.speaker === d.speaker && !c.isQ) test({ w: Array.from(new Set(c.w.concat(d.w))), isQ: d.isQ }, c.text + ' ' + d.text, c.speaker, c.at); }
    const answered = [], open = []; qs.forEach((x, i) => { const b = best.get(i); if (b) answered.push({ id: x.q.id, evidence: b.evidence, confidence: b.conf }); else open.push(i); });
    const recent = new Set(); chunks.slice(-5).forEach(c => c.w.forEach(w => recent.add(w)));
    const rel = i => shared(Array.from(qs[i].topic), recent).length;
    const next = open.slice().sort((a, b) => PRI[qs[a].q.priority] - PRI[qs[b].q.priority] || rel(b) - rel(a) || a - b).slice(0, 3).map(i => ({ id: qs[i].q.id, why: (qs[i].q.priority === 'must' ? 'Must-ask, not answered yet' : 'Not answered yet') + (rel(i) ? ' and related to what is being discussed now' : '') + '. ' + str(qs[i].q.why, 200) }));
    return { answered, stillOpen: open.map(i => qs[i].q.id), nextSuggested: next };
  }

  const api = { prepareQuestions, liveAsk, agendaText, words, LIKELY, POSSIBLE };
  root.FWBSessionQuestions = api; if (typeof module !== 'undefined' && module.exports) module.exports = api;   // the global is always set: a module import has no other way to hand the rules over
})(typeof window !== 'undefined' ? window : globalThis);

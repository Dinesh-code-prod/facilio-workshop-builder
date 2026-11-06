/* ONE copy of these rules, used in two places: build.mjs adds this file to the browser bundle (a plain script: it sets window.FWBPlanFromMsa) and the server and the tests import it as a module
   (it sets globalThis.FWBPlanFromMsa, read by work/server/_kickoffpack.mjs). It lives under work/server so that build.mjs copies it to dist/server.
   Project plan drafted from the contract (pure code, no DOM, no network; also run by tests/plan_from_msa.mjs). Roadmap E2 workspace 1, "Auto project plan".
   Nothing is invented: it only uses the dates, commitments, modules, responsibilities and exclusions it is given. Everything else is listed as an `assumption`
   (a choice this code made, for example the default 90 days) or a `gap` (information the contract did not give), and a commitment date that cannot be met is
   reported in `conflicts`, never hidden. Each milestone says where it comes from (`origin`):
     contract    a dated contractual commitment fixed this milestone's date
     interpreted a contract commitment was matched to this milestone by its wording, but gave no date
     assumed     Facilio's suggested phase and its proposed dates (an inferred recommendation)
   The project manager reviews, edits and approves the result; nothing here writes to the project.
   Dates are YYYY-MM-DD. `durationDays` is working days. A task starts on the working day after the last task it depends on has ended. */
(function (root) {
  'use strict';
  const DAY = 864e5, DEFAULT_DAYS = 90, MAX_WINDOW = 730;
  const arr = x => (Array.isArray(x) ? x : []);
  const str = (x, n) => (typeof x === 'string' || typeof x === 'number' ? String(x).replace(/\s+/g, ' ').trim().slice(0, n || 300) : '');
  const ms = d => Date.parse(d + 'T00:00:00Z');
  const okDate = s => { s = typeof s === 'string' ? s.trim() : ''; if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return ''; const t = ms(s); return isNaN(t) || new Date(t).toISOString().slice(0, 10) !== s || s < '1990-01-01' || s > '2100-12-31' ? '' : s; };
  const addDays = (d, n) => new Date(ms(d) + n * DAY).toISOString().slice(0, 10);
  const dayNo = d => new Date(ms(d)).getUTCDay();
  const uniq = a => [...new Set(a)];
  const ORIGINS = ['contract', 'interpreted', 'assumed'];
  // today as a LOCAL date in India (IST): between 00:00 and 05:30 IST the UTC date is still yesterday
  const istToday = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);

  // phases in order; w = relative weight; dep = ids it waits for; pin = which end of the milestone a commitment date fixes; re = wording that links a commitment to it
  const PH = [
    { id: 'kickoff', name: 'Kick-off', w: 1, dep: [], who: 'Joint', pin: 'start', re: /kick.?off/i, desc: 'Kick-off meeting that introduces both teams, the objectives, the scope and the plan.', del: ['Kick-off meeting held', 'Project team and contacts shared'], out: 'Both teams agree how the project will run.', crit: ['Kick-off meeting held with the customer sponsor and key contacts', 'Attendees and next steps recorded'] },
    { id: 'intro', name: 'Introduction', w: 2, dep: ['kickoff'], who: 'Facilio', re: /\bintroduction\b|intro session/i, desc: 'Introduce the Facilio solution and the delivery method to the customer team.', del: ['Introduction session held', 'Delivery method and roles explained'], out: 'The customer team knows what to expect and who does what.', crit: ['Introduction session held', 'Customer contacts named'] },
    { id: 'scope', name: 'Scope confirmation', w: 4, dep: ['intro'], who: 'Joint', re: /scope\s+(confirm|sign|review)|confirm\w*\s+(of\s+)?(the\s+)?scope/i, desc: 'Confirm the contractual scope, the modules and the exclusions with the customer.', del: ['Confirmed scope list', 'Exclusions agreed'], out: 'One agreed scope that the workshops and the design are based on.', crit: ['Every scope item is confirmed or excluded', 'Customer has seen the exclusions'] },
    { id: 'custprep', name: 'Customer preparation', w: 5, dep: ['scope'], who: 'Customer', re: /customer (preparation|readiness)|\breadiness\b/i, desc: 'The customer prepares people, access, documents and data for the workshops.', del: ['Named workshop attendees', 'Documents and data requested for the workshops'], out: 'The customer is ready to take part in the workshops.', crit: ['Attendees confirmed for each workshop', 'Requested documents received or dated'] },
    { id: 'data', name: 'Data onboarding', w: 8, dep: ['custprep'], who: 'Joint', re: /data\s+(onboarding|migration|load|collection|template)/i, desc: 'The customer fills in the data templates and Facilio checks them.', del: ['Data templates returned', 'Data checked and accepted'], out: 'Master data is ready to be loaded.', crit: ['All data templates returned', 'Data checked with no open errors'] },
    { id: 'workshops', name: 'Requirements workshops', w: 10, dep: ['custprep'], who: 'Joint', re: /workshop|requirements?\s+(gathering|session|capture)/i, desc: 'Workshops with the customer, one per module, to capture how they work and what they need.', del: ['Workshops held', 'Requirements and decisions recorded'], out: 'Requirements agreed in the workshops.', crit: ['Every planned workshop held', 'Open questions answered or owned'] },
    { id: 'design', name: 'Solution design', w: 8, dep: ['workshops', 'data'], who: 'Facilio', re: /solution design|design\s+(sign|review|approval)/i, desc: 'Design the solution from the requirements and the data.', del: ['Solution design', 'Mock-ups for review'], out: 'A design the customer can review.', crit: ['Design covers every confirmed requirement', 'Design reviewed internally'] },
    { id: 'brd', name: 'BRD preparation and approval', w: 8, dep: ['design'], who: 'Joint', re: /\bbrd\b|business requirements?/i, desc: 'Write the business requirements document and get the customer to approve it.', del: ['BRD draft', 'Signed-off BRD'], out: 'An approved BRD that configuration is built from.', crit: ['BRD sent for review', 'Customer approval recorded'] },
    { id: 'config', name: 'Configuration', w: 18, dep: ['brd'], who: 'Facilio', re: /\bconfigur|implementation complete|build complete/i, desc: 'Configure the solution as the approved BRD describes.', del: ['Configured solution', 'Configuration notes'], out: 'A configured solution ready for checking.', crit: ['Every approved requirement is configured', 'Configuration notes written'] },
    { id: 'validation', name: 'Internal validation', w: 5, dep: ['config'], who: 'Facilio', re: /internal\s+(validation|test)/i, desc: 'Facilio checks the configuration against the BRD before the customer sees it.', del: ['Internal test results', 'Fixes applied'], out: 'The solution is ready for the customer to test.', crit: ['Internal tests run', 'No open blocking issues'] },
    { id: 'uat', name: 'UAT preparation and execution', w: 10, dep: ['validation'], who: 'Joint', re: /\buat\b|user acceptance/i, desc: 'Prepare the acceptance test scenarios and let the customer test the solution.', del: ['UAT scenarios and guide', 'UAT results and fixes'], out: 'The customer has tested the solution and raised issues.', crit: ['Every UAT scenario run', 'Issues fixed or agreed'] },
    { id: 'ftr', name: 'FTR', w: 3, dep: ['uat'], who: 'Facilio', re: /\bftr\b/i, desc: 'Final test and review of the configuration against the approved design.', del: ['FTR checklist completed'], out: 'The configuration is confirmed against the design.', crit: ['FTR checklist completed', 'Differences from the design listed'] },
    { id: 'training', name: 'Training', w: 5, dep: ['ftr'], who: 'Joint', re: /\btrain(ing|ed|s)?\b/i, desc: 'Train the customer team to use the solution.', del: ['Training sessions held', 'User guides shared'], out: 'The customer team can use the solution.', crit: ['Training sessions held', 'User guides handed over'] },
    { id: 'golive', name: 'Go-live preparation', w: 4, dep: ['training'], who: 'Joint', re: /go.?live|\blaunch/i, desc: 'Prepare the move to live use: final data, access and a go-live check.', del: ['Go-live checklist', 'Final data loaded'], out: 'The solution is ready to go live.', crit: ['Go-live checklist signed off', 'Live access ready'] },
    { id: 'handover', name: 'Handover', w: 3, dep: ['golive'], who: 'Joint', re: /hand.?over|hand over/i, desc: 'Hand the project over to support and close the delivery.', del: ['Handover document', 'Support contacts shared'], out: 'The customer and support own the solution.', crit: ['Handover document accepted', 'Open items owned'] }
  ];
  const BY = {}; PH.forEach(p => { BY[p.id] = p; });

  function calendar(weekend) {
    const wk = Array.isArray(weekend) && weekend.length && weekend.length < 7 && weekend.every(n => Number.isInteger(n) && n >= 0 && n <= 6) ? weekend : [0, 6];
    const isWd = d => !wk.includes(dayNo(d));
    const nextWd = d => { while (!isWd(d)) d = addDays(d, 1); return d; };
    const prevWd = d => { while (!isWd(d)) d = addDays(d, -1); return d; };
    const addWd = (d, n) => { while (n-- > 0) d = nextWd(addDays(d, 1)); return d; };       // d is a working day; n working days later
    const subWd = (d, n) => { while (n-- > 0) d = prevWd(addDays(d, -1)); return d; };
    const count = (a, b) => { let n = 0; for (let d = a; d <= b; d = addDays(d, 1)) if (isWd(d)) n++; return n; };
    return { wk, isWd, nextWd, prevWd, addWd, subWd, count };
  }

  // A commitment can match several phases ("Go-live by 30 June 2027 subject to UAT sign-off"). Every matching phase is scored: the phase named FIRST is the subject; a phase named after
  // "subject to / after / once / following / before / prior to" is a condition and loses; on a tie the later phase wins when it is go-live, handover or UAT (the date is the end of that work).
  const COND = /\b(subject to|after|once|following|upon|before|prior to|pending|depends? on|dependent on)\b[^.;,]*$/i; const LATE = ['uat', 'golive', 'handover'];
  function pickPhase(text) {
    let best = null; PH.forEach((p, i) => { const m = p.re.exec(text); if (!m) return; const cond = COND.test(text.slice(0, m.index)); const score = (cond ? 0 : 1000) - m.index + (LATE.includes(p.id) ? 0.5 + i / 100 : 0); if (!best || score > best.score) best = { p, score }; });
    return best && best.p;
  }

  // input: { start?, end?, durationDays?, commitments:[{text,date?,source?}], modules:[], customerResponsibilities:[], exclusions:[], weekend?:[0..6] }  opt: { today? } (only used when no start date is given)
  function buildPlan(input, opt) {
    const inp = input && typeof input === 'object' ? input : {}; const assumptions = [], gaps = [], conflicts = [];
    const C = calendar(inp.weekend); const wkNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const modules = uniq(arr(inp.modules).map(m => str(m, 120)).filter(Boolean)).slice(0, 60);
    const resp = arr(inp.customerResponsibilities).map(x => str(x, 300)).filter(Boolean).slice(0, 40), excl = arr(inp.exclusions).map(x => str(x, 300)).filter(Boolean).slice(0, 40);

    // ---- the window
    let start = okDate(inp.start), end = okDate(inp.end); const dur = Number(inp.durationDays);
    if (!start) { const t = okDate(opt && opt.today) || istToday(); start = t; gaps.push('No start date was given. The plan starts on ' + t + ' (the date it was drafted); change it when the real start date is known.'); }
    const s0 = start; start = C.nextWd(start); if (start !== s0) assumptions.push('The start date ' + s0 + ' is a non-working day, so the plan starts on the next working day, ' + start + '.');
    if (end && end < start) { conflicts.push({ kind: 'window', milestone: '', message: 'The end date ' + end + ' is before the start date ' + start + '. It was not used.' }); end = ''; }
    if (end && ms(end) - ms(start) > MAX_WINDOW * DAY) { gaps.push('The end date ' + end + ' is more than ' + MAX_WINDOW + ' days after the start. That looks like the contract term, not the implementation, so it was not used.'); end = ''; }
    if (!end && dur >= 1 && dur <= MAX_WINDOW) { end = addDays(start, Math.floor(dur) - 1); assumptions.push('The project length of ' + Math.floor(dur) + ' days was given, so the end date is ' + end + '.'); }
    if (!end) { end = addDays(start, DEFAULT_DAYS - 1); assumptions.push('No end date or project length was given, so the default of ' + DEFAULT_DAYS + ' days is used: the plan ends on ' + end + '.'); }
    end = C.prevWd(end); if (end < start) end = start;
    const W = C.count(start, end);
    assumptions.push(C.wk.map(n => wkNames[n]).join(' and ') + ' are non-working days. Public holidays and customer shutdown days are not known and are not excluded.');
    assumptions.push('The phases and their lengths are Facilio\'s suggestion: the working days available are shared in proportion to each phase\'s usual weight. The contract does not state them.');

    // ---- commitments: match by wording; a dated one pins the milestone
    const pins = {}, attached = {}; let dated = 0;
    arr(inp.commitments).slice(0, 80).forEach(c => {
      const o = c && typeof c === 'object' ? c : { text: c }; const text = str(o.text, 300); if (!text) return; const date = okDate(o.date), source = str(o.source, 120);
      const ph = pickPhase(text); const cm = { text, date, source, origin: ORIGINS.includes(o.origin) ? o.origin : 'contract' };
      if (!ph) { gaps.push('The commitment "' + text + '"' + (date ? ' (' + date + ')' : '') + ' does not match any phase of the plan' + (date ? ', so its date is not in the plan. Add it by hand.' : ' and has no date. It is not used.')); return; }
      (attached[ph.id] = attached[ph.id] || []).push(cm); if (!date) return; dated++;
      let d = date; if (!C.isWd(d)) { const w = C.prevWd(d); assumptions.push('The commitment date ' + d + ' for "' + ph.name + '" is a non-working day, so the milestone is fixed on the working day before, ' + w + '.'); d = w; }
      if (pins[ph.id]) { const keep = pins[ph.id].date <= d ? pins[ph.id] : { date: d, c: cm }; const drop = keep === pins[ph.id] ? cm : pins[ph.id].c; conflicts.push({ kind: 'duplicate', milestone: ph.id, message: 'Two dated commitments for "' + ph.name + '". The earlier date, ' + keep.date + ', is used; "' + drop.text + '" (' + (drop.date || 'no date') + ') is not.' }); pins[ph.id] = keep; } else pins[ph.id] = { date: d, c: cm };
    });
    if (!dated) gaps.push('The contract gave no dated commitment that matches a phase, so every date in this plan is an assumption.');
    if (!modules.length) gaps.push('No modules were given, so the workshops and the configuration cannot name the modules in scope. Confirm the scope first.');
    if (!resp.length) gaps.push('No customer responsibilities were read from the contract. Not stated is not the same as none: ask the customer what they must provide.');
    if (!excl.length) gaps.push('No exclusions were read from the contract. Not stated is not the same as none: check the contract for what is out of scope.');
    if (pins.golive) assumptions.push('A go-live date is taken as the end of "Go-live preparation".');
    PH.forEach(p => { const pin = pins[p.id]; if (pin && pin.c.origin !== 'contract') assumptions.push('The date ' + pin.date + ' for "' + p.name + '" is not given as contract text (' + pin.c.origin + '); it is used as given and marked ' + pin.c.origin + ', not contract.'); });

    // ---- durations: share the working days by weight along the longest chain, then fit
    const chain = {}; PH.forEach(p => { chain[p.id] = p.w + Math.max(0, ...p.dep.map(d => chain[d])); }); const critW = Math.max(...Object.values(chain));
    const ideal = {}, d = {}; PH.forEach(p => { ideal[p.id] = p.w * W / critW; d[p.id] = Math.max(1, Math.round(ideal[p.id])); });
    function place() {
      const res = {}, conf = [];
      PH.forEach(p => {
        const early = p.dep.length ? C.nextWd(addDays(p.dep.map(x => res[x].end).sort().pop(), 1)) : start; const n = d[p.id], pin = pins[p.id]; let s = early, e = C.addWd(early, n - 1), pinned = false;
        if (pin) {
          if (p.pin === 'start') { if (pin.date >= early) { s = pin.date; e = C.addWd(s, n - 1); pinned = true; } }
          else if (pin.date >= early) { s = C.subWd(pin.date, n - 1); if (s < early) s = early; e = pin.date; pinned = true; }
          if (!pinned) conf.push({ kind: 'commitment', milestone: p.id, message: 'The commitment "' + pin.c.text + '" fixes "' + p.name + '" on ' + pin.date + ', but the tasks it depends on end too late for that: the earliest it can start is ' + early + '. It is planned from then instead. Talk to the customer or move the earlier phases.' });
        }
        res[p.id] = { start: s, end: e, pinned };
      });
      return { res, conf, last: Object.values(res).map(r => r.end).sort().pop() };
    }
    let cur = place(), guard = 0; const byGap = f => PH.map(p => p.id).sort((a, b) => f(b) - f(a));
    while (cur.last > end && guard++ < 3000) { let ok = false; for (const id of byGap(x => d[x] - ideal[x])) { if (d[id] <= 1) continue; d[id]--; const t = place(); if (t.last < cur.last) { cur = t; ok = true; break; } d[id]++; } if (!ok) break; }
    while (guard++ < 3000) { let ok = false; for (const id of byGap(x => ideal[x] - d[x])) { if (ideal[id] - d[id] <= 0) break; d[id]++; const t = place(); if (t.last <= end && t.conf.length <= cur.conf.length) { cur = t; ok = true; break; } d[id]--; } if (!ok) break; }
    conflicts.push(...cur.conf);
    if (cur.last > end) conflicts.push({ kind: 'window', milestone: '', message: 'The plan cannot fit before the end date ' + end + ': even with the shortest phases it ends on ' + cur.last + (Object.keys(pins).length ? ', because of the dated commitments' : '') + '. Move the end date or reduce what the plan covers.' });
    PH.forEach(p => { const r = cur.res[p.id], pin = pins[p.id]; if (pin && r.pinned && pin.date > end) conflicts.push({ kind: 'window', milestone: p.id, message: 'The commitment "' + pin.c.text + '" (' + pin.date + ') falls after the project end date ' + end + '.' }); });

    // ---- milestones
    const milestones = PH.map(p => {
      const r = cur.res[p.id], att = attached[p.id] || [], del = p.del.slice(), crit = p.crit.slice();
      if (p.id === 'scope') { if (modules.length) del.push('Modules in scope: ' + modules.join(', ')); excl.forEach(x => crit.push('Excluded in the contract: ' + x)); }
      if (p.id === 'workshops' && modules.length) del.push('One workshop per module: ' + modules.join(', '));
      if (p.id === 'config' && modules.length) del.push('Configured modules: ' + modules.join(', '));
      if (p.id === 'custprep') resp.forEach(x => del.push('Customer responsibility in the contract: ' + x));
      att.forEach(c => crit.push('Contract commitment: ' + c.text + (c.date ? ' (' + c.date + ')' : '') + (c.source ? ' [' + c.source + ']' : '')));
      return { id: p.id, name: p.name, description: p.desc, start: r.start, end: r.end, durationDays: C.count(r.start, r.end), dependsOn: p.dep.slice(), deliverables: del, responsible: p.who, outcome: p.out, completionCriteria: crit, origin: r.pinned ? (pins[p.id].c.origin === 'contract' ? 'contract' : pins[p.id].c.origin === 'interpreted' ? 'interpreted' : 'assumed') : att.length ? 'interpreted' : 'assumed', commitments: att, pinned: r.pinned };
    });
    return { milestones, assumptions, gaps, conflicts, window: { start, end, workingDays: W } };
  }

  // the rows the project plan timeline (plan_struct) keeps: { id, title, phase, start, end, owner, status, pct, ms, dep:[ids] }; src/tldepslogic.js reads `dep`
  function toPlanStruct(milestones, opt) {
    const pre = (opt && typeof opt.idPrefix === 'string' && opt.idPrefix) || 'tr_msa_'; const own = { Facilio: 'Facilio', Customer: 'Customer', Joint: 'Both' };
    return arr(milestones).filter(m => m && m.id && okDate(m.start)).map(m => { const row = { id: pre + m.id, title: str(m.name, 200), phase: '', start: m.start, end: okDate(m.end) || m.start, owner: own[m.responsible] || 'Facilio', status: 'Not started', pct: 0, ms: m.start === (okDate(m.end) || m.start), origin: m.origin }; const dep = arr(m.dependsOn).map(x => pre + x); if (dep.length) row.dep = dep; return row; });
  }

  const api = { buildPlan, toPlanStruct, PHASES: PH.map(p => ({ id: p.id, name: p.name })) };
  root.FWBPlanFromMsa = api; if (typeof module !== 'undefined' && module.exports) module.exports = api;   // the global is always set: a module import has no other way to hand the rules over
})(typeof window !== 'undefined' ? window : globalThis);

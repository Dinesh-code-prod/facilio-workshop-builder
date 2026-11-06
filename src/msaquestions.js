/* Questions from the contract: every project has a different MSA, so the standard module guides get an extra section, "From your contract", and Learn & Prepare gets a card.
   The team side reads what the MSA review holds (scope lines, customer responsibilities, exclusions, assumptions), turns each line into a plain question for the module it belongs to and stores the result in the
   document contract_prep (customers can read that document; they cannot read the planner, so the contract text itself stays with the team). The standard questions stay as they are; these are added after them.
   The answers use the guide's own storage (key <module>:a:msa_<hash>), so they save, show progress and reach the team like every other answer. The rules are in tests/msa_questions.mjs. */
(function (root) {
  'use strict';
  const arr = v => (Array.isArray(v) ? v : []);
  // first match wins: planned maintenance and field service before work orders, which they also mention
  const MOD = [['ppm', /preventive|\bppm\b|planned maintenance|scheduled maintenance/i], ['fsm', /field service|technician|dispatch|\bfsm\b/i], ['sr', /service request|help ?desk|tenant request/i], ['insp', /inspection|checklist|\brounds?\b/i], ['vendor', /vendor|contractor|supplier|procure|purchase order|quotation/i], ['inv', /inventor|stock|spare part|store ?room/i], ['budget', /budget/i], ['asset', /\bassets?\b|equipment|asset register/i], ['wo', /work ?orders?|corrective|reactive/i]];
  const modOf = text => { const m = MOD.find(x => x[1].test(String(text || ''))); return m ? m[0] : ''; };
  const hash = s => { let h = 5381; s = String(s); for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };
  const clean = (t, n) => String(t || '').replace(/\s+/g, ' ').replace(/^\d+(?:\.\d+)*[.)]?\s+/, '').trim().slice(0, n || 220);
  const CAP = { module: 6, list: 8 };
  /** planner = the planner document. Returns the contract_prep document: { has, from, byModule: { wo: [{ id, q, why }] }, prepare: { scope, mine, out, assumed } } */
  function build(planner) {
    const d = planner || {}; const sx = ((d.contractX || {}).scopeX) || {}; const out = { has: false, from: (d.msa && d.msa.name) || '', byModule: {}, prepare: { scope: [], mine: [], out: [], assumed: [] } };
    const add = (kind, text, mod, make) => { const t = clean(text); if (t.length < 12) return; const m = mod || modOf(t); const id = 'msa_' + hash(kind + '|' + t);
      const list = out.prepare[kind]; if (list.length < CAP.list && !list.some(x => x.id === id)) list.push({ id, text: t, module: m });
      if (m) { const l = out.byModule[m] = out.byModule[m] || []; if (l.length < CAP.module && !l.some(x => x.id === id)) l.push({ id, q: make(t), why: 'Contract: "' + t.slice(0, 140) + (t.length > 140 ? '…' : '') + '"' }); } };
    arr(d.scope).filter(s => s && s.status !== 'excluded' && s.text).forEach(s => add('scope', s.text, '', t => 'Your contract includes: "' + t + '". What do you need from Facilio here, and how do you handle it today?'));
    arr(sx.responsibilities).forEach(r => add('mine', r.text, '', t => 'Your contract makes your team responsible for: "' + t + '". Who owns this on your side, and is it ready?'));
    arr(sx.exclusions).concat(arr(d.scope).filter(s => s && s.status === 'excluded')).forEach(e => add('out', e.text, '', t => 'Your contract leaves this out: "' + t + '". Do you still need any of it? If so, tell us so it can be handled as a change request.'));
    arr(sx.assumptions).forEach(a => add('assumed', a.text, '', t => 'The plan assumes: "' + t + '". Is that true for you today?'));
    out.has = Object.values(out.prepare).some(l => l.length) || Object.keys(out.byModule).length > 0; return out;
  }
  const V = root.FWBViews; if (V) V.msaQuestionsLogic = { build, modOf };
  const F = root.FWB; if (!F || !F.S || !V) return; const { S, esc } = F;
  const cust = () => !!(V.isCustomer && V.isCustomer());
  const sig = o => JSON.stringify({ b: o.byModule, p: o.prepare, f: o.from });
  /** team side: keep contract_prep in step with the MSA review (only writes when something changed) */
  function refresh() {
    if (cust() || S.readonly || !S.project) return; const pl = F.doc('planner'); if (!pl || !(pl.contractX || arr(pl.scope).length)) return; const next = build(pl); if (!next.has) return; const cur = F.doc('contract_prep'); if (sig(cur || {}) === sig(next)) return;
    Object.keys(cur).forEach(k => delete cur[k]); Object.assign(cur, next, { at: new Date().toISOString() }); F.changed(null, null, { section: 'contract_prep', render: false });
  }
  /** put the "From your contract" section into each module guide that has questions (idempotent; the standard sections are untouched) */
  function apply() {
    const L = root.FWBLearn; if (!L || !L.MODS) return; refresh(); const cp = F.doc('contract_prep') || {};
    L.MODS.forEach(lm => { const q = arr((cp.byModule || {})[lm.key]); const at = lm.form.findIndex(s => s.fromContract); if (at >= 0) lm.form.splice(at, 1); if (q.length) lm.form.push({ section: 'From your contract', fromContract: true, questions: q.map(x => ({ id: x.id, q: x.q, type: 'long', placeholder: x.why })) }); });
  }
  /** the Learn & Prepare card */
  function card() {
    const cp = F.doc('contract_prep') || {}; const p = cp.prepare || {}; if (!cp.has && !arr(p.scope).length && !arr(p.mine).length) return '';
    const L = root.FWBLearn; const by = cp.byModule || {}; const names = L && L.BY ? Object.keys(by).filter(k => L.BY[k] && by[k].length).map(k => L.BY[k].name) : [];
    const list = (title, l, note) => arr(l).length ? `<div class="card" style="padding:14px"><h3 style="margin:0 0 6px">${esc(title)}</h3>${note ? `<p class="xs muted" style="margin:0 0 6px">${esc(note)}</p>` : ''}<ul class="small" style="padding-left:18px;line-height:1.6;margin:0">${l.map(x => `<li>${esc(x.text)}</li>`).join('')}</ul></div>` : '';
    return `<div class="sec-k" style="margin-top:22px"><p>Written for this project</p><h2>From your contract</h2></div>
      <p class="small muted" style="margin:0 0 10px">Every project has its own contract, so these come from yours. ${names.length ? `We added questions about them to the module guides (${esc(names.join(', '))}).` : ''}</p>
      <div class="grid g2">${list('Included in your project', p.scope)}${list('Your team is responsible for', p.mine, 'Please plan who does this and by when.')}${list('Not part of this project', p.out, 'Tell us if you need any of it; it can become a change request.')}${list('We are assuming', p.assumed, 'Tell us if any of this is not true.')}</div>
      ${names.length ? `<div class="row" style="margin-top:10px"><button class="btn" data-act="nav" data-view="learnlib">Answer the contract questions in the module guides</button></div>` : ''}`;
  }
  V.msaQuestions = { apply, refresh, card };
})(typeof window !== 'undefined' ? window : globalThis);

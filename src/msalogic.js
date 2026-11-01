/* MSA scope check: the rules (pure code, also run by tests/msa.mjs).
   Compares what the customer asked for and confirmed (requirements, use cases) with what Delivery Studio read from the signed MSA (scope entries a person
   confirmed or excluded, and the exclusion sentences) and says what it found, in five different kinds. It matches words and modules; it does not decide a
   contract question. Every finding names the item, the MSA wording it rests on (page and section when known), why, and what to do next. Findings are
   worked out again each time from the saved records; only the person's decision on a finding is stored (src/msafind.js). */
(function (root) {
  'use strict';
  const CLASSES = [['conflict', 'Confirmed contractual conflict'], ['deviation', 'Potential scope deviation'], ['missing', 'Missing contractual information'], ['pending', 'Pending customer clarification'], ['unconfirmed', 'Requirement not sufficiently confirmed']];
  const RESOLUTION = ['Open', 'In clarification', 'Needs change request', 'Resolved', 'Not an issue'];
  const ACTIVE = ['Open', 'In clarification', 'Needs change request'];
  const SEV = { high: 0, medium: 1, low: 2 };
  const STOP = new Set('that this with from shall will must should have been were their there which when what whether also only other than then into over under about after before between within without would could these those them they customer client facilio system module modules include included including provide provided service services agreement project solution support require required requirement requirements need needs able allow allows user users data process processes manage management'.split(' '));
  const words = s => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w.length >= 4 && !STOP.has(w));
  const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 40);
  const REQ_OUT = /^(rejected|deferred|superseded|removed|merged|cancelled|withdrawn|declined)$/i;
  // inp: { msaUploaded, scope:[{text,module,status,page,section}], exclusions:[{text,page,section}], requirements:[], useCases:[], questions:[], labels:{module:label} }
  function analyse(inp) {
    const out = []; const seen = new Set(); const label = m => (inp.labels || {})[m] || m;
    const add = f => { let k = f.cls + '|' + (f.ref ? f.ref.kind + ':' + f.ref.id : 'project') + '|' + (f.msa ? slug(f.msa.text) : slug(f.module)); const base = k; let n = 2; while (seen.has(k)) k = base + '#' + n++; seen.add(k); out.push(Object.assign({ key: k }, f)); };
    const scope = inp.scope || []; const excl = inp.exclusions || []; const matchedAll = scope.filter(x => x.status === 'matched').length; const up = !!inp.msaUploaded; const known = up && (matchedAll > 0 || excl.length > 0);
    if (!up) add({ cls: 'missing', sev: 'high', ref: null, module: '', msa: null, why: 'No MSA has been uploaded, so nothing can be compared with the contract.', action: 'Upload the signed MSA in Contract.' });
    else if (!known) add({ cls: 'missing', sev: 'medium', ref: null, module: '', msa: null, why: 'The MSA is uploaded but no confirmed scope entry and no exclusion was read from it, so nothing can be compared yet.', action: 'In Contract, confirm the scope entries that came from the MSA, or add the contractual scope by hand.' });
    const items = [].concat((inp.requirements || []).filter(r => !REQ_OUT.test(String(r.status || ''))).map(r => ({ kind: 'requirement', id: r.id, title: r.title || r.id, text: [r.title, r.objective, r.description, r.notes].join(' '), modules: r.modules || [], confirmed: r.status === 'Confirmed', status: r.status || 'Draft' })),
      (inp.useCases || []).filter(u => !REQ_OUT.test(String(u.status || ''))).map(u => ({ kind: 'usecase', id: u.id, title: u.title || u.id, text: [u.title, u.description, u.solution, u.notes].join(' '), modules: u.modules || [], confirmed: /confirmed/i.test(String(u.confirmation || '')) && !/^un/i.test(String(u.confirmation || '')), status: u.confirmation || 'Unconfirmed' })));
    items.forEach(it => {
      const ref = { kind: it.kind, id: it.id, title: it.title }; const what = (it.kind === 'usecase' ? 'Use case ' : 'Requirement ') + it.id;
      if (!it.modules.length) add({ cls: 'missing', sev: 'low', ref, module: '', msa: null, why: what + ' is not linked to a module, so it cannot be compared with the MSA scope.', action: 'Link it to the module it belongs to.' });
      if (known) {
        const tk = new Set(words(it.text)); let strong = null, weak = null;
        excl.forEach(e => { const ew = words(e.text); const hit = ew.filter(w => tk.has(w)).length; const named = it.modules.some(m => { const l = String(label(m)).toLowerCase(); return l.length >= 4 && String(e.text).toLowerCase().includes(l); }); if (named || hit >= 3) { if (!strong || hit > strong.hit) strong = { e, hit, named }; } else if (hit === 2 && !weak) weak = { e, hit }; });
        const refOf = e => ({ text: e.text, page: e.page || null, section: e.section || '', kind: 'exclusion' });
        if (strong) add({ cls: it.confirmed ? 'conflict' : 'deviation', sev: it.confirmed ? 'high' : 'medium', ref, module: it.modules[0] || '', msa: refOf(strong.e), why: what + ' is ' + (it.confirmed ? 'confirmed' : 'not yet confirmed') + ' and its ' + (strong.named ? 'module is named in' : 'wording overlaps (' + strong.hit + ' key words) with') + ' this MSA exclusion. Read the clause before deciding.', action: it.confirmed ? 'Raise it with the customer: remove the requirement, or agree a change request that adds it to the contract.' : 'Check the clause before the customer confirms it; if it is excluded, say so now.' });
        else if (weak) add({ cls: 'deviation', sev: 'low', ref, module: it.modules[0] || '', msa: refOf(weak.e), why: what + ' shares some wording with this MSA exclusion. It may be unrelated.', action: 'Read the clause; mark this finding "Not an issue" if it does not apply.' });
        it.modules.forEach(m => { const ents = scope.filter(x => x.module === m); if (ents.some(x => x.status === 'matched')) return; const exd = ents.find(x => x.status === 'excluded'), unc = ents.find(x => x.status === 'uncertain');
          if (exd) add({ cls: 'deviation', sev: it.confirmed ? 'high' : 'medium', ref, module: m, msa: { text: exd.text, page: exd.page || null, section: exd.section || '', kind: 'scope-excluded' }, why: 'The MSA scope entry for ' + label(m) + ' was marked as not included, and ' + what + ' relies on it.', action: 'Confirm with the customer; if it is out of scope, record a change request before design work.' });
          else if (unc) add({ cls: 'pending', sev: 'medium', ref, module: m, msa: { text: unc.text, page: unc.page || null, section: unc.section || '', kind: 'scope-uncertain' }, why: 'The MSA wording for ' + label(m) + ' was read with low certainty and nobody has confirmed it, so ' + what + ' cannot be checked.', action: 'In Contract > Scope, confirm or exclude this entry, or ask the customer.' });
          else add({ cls: 'deviation', sev: it.confirmed ? 'medium' : 'low', ref, module: m, msa: null, why: 'The MSA scope read for this project has no entry for ' + label(m) + ', and ' + what + ' relies on it.', action: 'Check the MSA for ' + label(m) + '. If it is not there, treat it as outside the contract until a change request says otherwise.' }); });
      }
      (inp.questions || []).filter(q => q.reqId === it.id && !/^(answered|closed|resolved)$/i.test(String(q.status || ''))).forEach(q => add({ cls: 'pending', sev: 'medium', ref, module: it.modules[0] || '', msa: null, why: 'There is an open question on ' + what + ': "' + String(q.text || '').slice(0, 140) + '"', action: 'Get the customer\'s answer and record it.' }));
      if (!it.confirmed) add({ cls: 'unconfirmed', sev: 'low', ref, module: it.modules[0] || '', msa: null, why: what + ' is ' + String(it.status).toLowerCase() + ': the customer has not confirmed it.', action: 'Confirm it with the customer in a session and record who confirmed it.' });
    });
    return out.sort((a, b) => SEV[a.sev] - SEV[b.sev] || CLASSES.findIndex(c => c[0] === a.cls) - CLASSES.findIndex(c => c[0] === b.cls));
  }
  // decisions on findings: [{ key, status, note }] -> each finding with its status; a decision on a finding that no longer exists is simply not shown
  function withDecisions(findings, decisions) { const by = {}; (decisions || []).forEach(d => { by[d.key] = d; }); return findings.map(f => Object.assign({}, f, { status: (by[f.key] && RESOLUTION.includes(by[f.key].status)) ? by[f.key].status : 'Open', note: (by[f.key] && by[f.key].note) || '', by: (by[f.key] && by[f.key].by) || '', at: (by[f.key] && by[f.key].at) || '' })); }
  function summary(fs) { const by = {}; CLASSES.forEach(([k]) => { by[k] = { active: 0, total: 0 }; }); fs.forEach(f => { by[f.cls].total++; if (ACTIVE.includes(f.status || 'Open')) by[f.cls].active++; }); return { by, active: fs.filter(f => ACTIVE.includes(f.status || 'Open')).length, total: fs.length }; }
  const api = { CLASSES, RESOLUTION, ACTIVE, analyse, withDecisions, summary, words };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBMsa = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* The BRD drafts itself from what the team confirmed.
   Every finding confirmed on Checks & validations (promised, asked, use case, custom use case, additional request, decision) becomes a CONFIRMED requirement in the workshop document,
   which is what the BRD is built from (src/brd.js). The team's own answer (the solution typed when confirming) becomes the requirement's rules, the quote and session are kept for traceability,
   and the module is found from the module names in the text. A finding that is no longer confirmed takes its requirement back to Draft, so the BRD drops it. Nothing is deleted, and a requirement a person edited by hand is never overwritten.
   `drafts` is the pure rule (tests/brd_draft.mjs); `sync` applies it to the open project. */
(function (root) {
  'use strict';
  const KEEP = ['promise', 'ask', 'usecase', 'custom_usecase', 'additional', 'decision'];
  const arr = v => (Array.isArray(v) ? v : []);
  const esc = s => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hits = (text, m) => { const names = [m.label, m.name].filter(Boolean).map(x => String(x).replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()); const t = String(text || '').toLowerCase();
    const words = String(m.label || '').toLowerCase().split(/[^a-z]+/).filter(Boolean); if (words.length > 1 && words.length < 4) names.push(words.map(w => w[0]).join('')); if (names.some(n => n === 'asset')) names.push('equipment');
    return names.some(n => { const b = n.replace(/s$/, ''); return b.length >= 2 && new RegExp('(^|[^a-z])' + esc(b) + '(s|es)?([^a-z]|$)', 'i').test(t); }); };
  const title = t => { const s = String(t || '').replace(/\s+/g, ' ').trim(); return s.length > 90 ? s.slice(0, 87).replace(/\s+\S*$/, '') + '...' : s; };
  /** findings: rs_findings items; reqs: the current requirements; mods: [{ name, label, prefix }] (in scope). Returns { add: [requirement], update: [{ id, patch }], n } */
  function drafts(findings, reqs, mods, now, by) {
    const have = arr(reqs); const byFinding = {}; have.forEach(r => { if (r && r.source && r.source.finding) byFinding[r.source.finding] = r; });
    const max = {}; have.forEach(r => { const m = String(r.id || '').match(/^(.*)-(\d+)$/); if (m) max[m[1]] = Math.max(max[m[1]] || 0, Number(m[2])); });
    const out = { add: [], update: [], n: 0 };
    arr(findings).forEach(f => {
      if (!f || !f.id) return; const ex = byFinding[f.id]; const sol = String(f.solution || '').trim();
      if (f.status === 'confirmed' && KEEP.includes(f.kind)) {
        if (!ex) {
          const ms = arr(mods).filter(m => hits(f.text + ' ' + (f.quote || ''), m)); const p = (ms[0] && ms[0].prefix) || 'GEN'; max[p] = (max[p] || 0) + 1;
          out.add.push({ id: p + '-' + String(max[p]).padStart(3, '0'), created: now, title: title(f.text), objective: String(f.text || ''), rules: sol, approvals: '', exceptions: '', modules: ms.map(m => m.name), classification: f.kind === 'custom_usecase' || f.kind === 'additional' ? 'change' : 'standard', status: 'Confirmed', fields: [], transitions: [], brdSection: 'module',
            source: { finding: f.id, kind: f.kind, transcriptId: f.transcriptId || '', quote: f.quote || '', speaker: f.speaker || '', auto: true, autoRules: sol }, history: [{ at: now, by: by || '', change: 'Drafted from a confirmed item on Checks & validations' }] }); out.n++;
        } else if (ex.source && ex.source.auto) {
          const patch = {}; if (ex.status !== 'Confirmed') patch.status = 'Confirmed'; if (sol !== (ex.source.autoRules || '') && (ex.rules || '') === (ex.source.autoRules || '')) { patch.rules = sol; patch.source = Object.assign({}, ex.source, { autoRules: sol }); }
          if (Object.keys(patch).length) { out.update.push({ id: ex.id, patch }); out.n++; }
        }
      } else if (ex && ex.source && ex.source.auto && ex.status === 'Confirmed') { out.update.push({ id: ex.id, patch: { status: 'Draft' } }); out.n++; }   // no longer confirmed: out of the BRD, kept as a draft
    });
    return out;
  }
  const V = root.FWBViews; if (V) V.brdDraft = { drafts, KEEP };
  /** apply to the open project; returns the number of requirements added or changed (0 when nothing to do) */
  function sync() {
    const F = root.FWB; if (!F || !F.S || !F.S.ws) return 0; const S = F.S; const mods = (F.allModules() || []).filter(m => m.inScope).map(m => ({ name: m.name, label: m.label || m.name, prefix: F.modulePrefix(m.name) }));
    const fds = ((F.doc('rs_findings') || {}).items) || []; const now = new Date().toISOString(); const by = (S.user && (S.user.name || S.user.email)) || '';
    const r = drafts(fds, S.ws.requirements || [], mods, now, by); if (!r.n) return 0;
    S.ws.requirements = (S.ws.requirements || []).map(q => { const u = r.update.find(x => x.id === q.id); return u ? Object.assign({}, q, u.patch, { history: (q.history || []).concat([{ at: now, by, change: 'Updated from Checks & validations' }]) }) : q; }).concat(r.add);
    F.changed('BRD requirements updated from confirmations', r.add.length ? r.add.map(x => x.id).join(', ') : String(r.n)); return r.n;
  }
  if (V) V.brdDraft.sync = sync;
})(typeof window !== 'undefined' ? window : globalThis);

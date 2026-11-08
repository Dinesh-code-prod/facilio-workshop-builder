/* Questions from a file: the extra questions a consultant already has (an Excel sheet of any layout, a Word or PDF document, plain text) become question-bank entries. Pure code, no network (tested by tests/qimport.mjs).
   fromRows(rows, modules): rows is a sheet as arrays of cells; the header row is found by its words (Question, Module, Category, Priority, Why, Expected, Notes), a sheet without a header uses its widest text column.
   fromText(text, modules): lines that are questions (they contain a question mark, or a numbered or bulleted line that starts like one).
   modules: [{ name, label }]; a question that names a module of the project is filed under it. The result goes through the bank's own checks (work/server/_qbank.mjs merge), which also drop duplicates. */
(function (root) {
  'use strict';
  const arr = v => (Array.isArray(v) ? v : []);
  const txt = v => { if (v == null) return ''; if (v instanceof Date) return v.toISOString().slice(0, 10); if (typeof v === 'object') return String(v.text != null ? v.text : v.result != null ? v.result : (v.richText ? v.richText.map(t => t.text).join('') : '')); return String(v); };
  const clean = s => txt(s).replace(/\s+/g, ' ').trim();
  const nz = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/s$/, '');
  const HEAD = { text: /^(questions?|query|queries|ask|item|topic|what to ask|question to ask)$/i, module: /^(module|module\s*\/\s*area|area|functional area)$/i, category: /^(category|type|theme)$/i, priority: /^(priority|importance|must\s*\/?\s*should)$/i, why: /^(why|reason|purpose|justification|why ask)$/i, expected: /^(expected( answer| response)?|good answer|answer)$/i, notes: /^(notes?|comments?|remarks?)$/i };
  const PRIO = x => { const t = String(x || '').toLowerCase().trim(); return /^(must|high|critical|p1|urgent)/.test(t) ? 'must' : /^(could|low|p3|p4|nice)/.test(t) ? 'could' : /^(should|medium|normal|p2)/.test(t) ? 'should' : ''; };
  const modOf = (text, modules, given) => {
    const list = arr(modules); const g = nz(given); if (g) { const m = list.find(x => nz(x.name) === g || nz(x.label) === g); if (m) return m.name; }
    const low = ' ' + String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' '; const hit = list.find(x => [x.label, x.name].some(n => { const k = String(n || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); return k.length > 2 && (low.includes(' ' + k + ' ') || low.includes(' ' + k.replace(/s$/, '') + ' ') || low.includes(' ' + k + 's ')); })); return hit ? hit.name : '';
  };
  function fromRows(rows, modules) {
    const R = arr(rows).map(r => arr(r).map(clean)); if (!R.length) return [];
    let hi = R.findIndex(r => r.some(c => HEAD.text.test(c))); const col = {};
    if (hi >= 0) R[hi].forEach((c, i) => { const k = Object.keys(HEAD).find(x => HEAD[x].test(c)); if (k && col[k] === undefined) col[k] = i; });
    else { const w = []; R.forEach(r => r.forEach((c, i) => { w[i] = (w[i] || 0) + c.length; })); col.text = w.indexOf(Math.max(...w)); hi = -1; }
    const out = []; R.slice(hi + 1).forEach(r => { const g = k => (col[k] === undefined ? '' : r[col[k]] || ''); const text = g('text'); if (text.length < 8) return;
      out.push({ text: text.slice(0, 600), module: modOf(text + ' ' + g('module'), modules, g('module')), category: g('category'), priority: PRIO(g('priority')), why: g('why'), expected: g('expected'), notes: g('notes') }); });
    return out.slice(0, 300);
  }
  const ASKS = /^(what|who|whom|whose|how|when|where|which|why|can|could|do|does|did|is|are|was|were|will|would|should|shall|may|please|confirm|share|provide|tell|describe|list|clarify|explain)\b/i;
  function fromText(text, modules) {
    const out = []; const seen = new Set();
    String(text || '').split(/\r?\n/).forEach(line => {
      const bullet = /^\s*(?:\d+[.)]|[a-z][.)]|[-•*·–])\s+/i.test(line); let t = clean(line.replace(/^\s*(?:\d+[.)]|[a-z][.)]|[-•*·–])\s+/i, '')); if (t.length < 12 || t.length > 600) return;
      const isQ = /\?/.test(t) || (bullet && ASKS.test(t)); if (!isQ) return;
      const parts = /\?/.test(t) && t.split('?').filter(x => x.trim().length > 12).length > 1 ? t.split(/(?<=\?)\s+/).filter(x => x.length > 12) : [t];
      parts.forEach(p => { const k = p.toLowerCase(); if (seen.has(k)) return; seen.add(k); out.push({ text: p.slice(0, 600), module: modOf(p, modules, ''), category: '', priority: '', why: '', expected: '', notes: '' }); });
    });
    return out.slice(0, 300);
  }
  const api = { fromRows, fromText };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBQImport = api;
})(typeof window !== 'undefined' ? window : globalThis);

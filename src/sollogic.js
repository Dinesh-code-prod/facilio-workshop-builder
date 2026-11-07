/* Solution tab rules (plan: docs/reference/SOLUTION-TAB-PLAN-2026-11-07.md). Pure code, no page, no network; tested by tests/sollogic.mjs, used by src/solution.js, src/brd.js and the Word export.
   The solutions are the project document `solutions`: { items: { "<areaKey>": { text, status, sources[], versions[], updatedAt, updatedBy } } }.
   An area is one module in scope (key module:<name>) or one fixed area (key area:<id>). Every change is a new version that keeps the previous text, who, when and why. Nothing here calls Claude:
   a proposal (design_proposals, kind solution) only becomes text when a person accepts it (accept). */
(function (root) {
  'use strict';
  const arr = v => (Array.isArray(v) ? v : []);
  const STATUSES = ['Draft', 'Agreed', 'Changed by customer'];
  const GROUPS = ['Modules', 'Connected apps', 'Templates and PDFs', 'KPIs and SLA', 'Notifications and roles'];
  const FIXED = [{ key: 'area:apps', group: 'Connected apps', label: 'Connected apps' }, { key: 'area:templates', group: 'Templates and PDFs', label: 'PDF templates and print layouts' }, { key: 'area:kpis', group: 'KPIs and SLA', label: 'KPIs' }, { key: 'area:sla', group: 'KPIs and SLA', label: 'SLA and escalation matrix' },
    { key: 'area:notifications', group: 'Notifications and roles', label: 'Notifications' }, { key: 'area:approvals', group: 'Notifications and roles', label: 'Approval rules' }, { key: 'area:roles', group: 'Notifications and roles', label: 'Roles and access' }, { key: 'area:other', group: 'Notifications and roles', label: 'Other contract commitments' }];
  const KEY_RE = /^(module:[A-Za-z0-9_.-]{1,80}|area:[a-z]{2,20})$/;
  const MAX_VERSIONS = 30, MAX_TEXT = 6000;
  const clean = s => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]+/g, ' ').replace(/\r\n?/g, '\n').trim().slice(0, MAX_TEXT);

  /** the areas of a project: modules in scope first (mods: [{ name, label }]), then the fixed ones */
  const areasFor = mods => arr(mods).map(m => ({ key: 'module:' + m.name, group: 'Modules', label: m.label || m.name, module: m.name })).concat(FIXED);
  const itemsOf = doc => (doc && doc.items && typeof doc.items === 'object' && !Array.isArray(doc.items) ? doc.items : {});
  const recOf = (doc, key) => itemsOf(doc)[key] || null;
  const textOf = (doc, key) => { const r = recOf(doc, key); return r && r.text ? String(r.text).trim() : ''; };
  const statusOf = (doc, key) => { const r = recOf(doc, key); return r && r.text ? (STATUSES.includes(r.status) ? r.status : 'Draft') : 'Not written'; };

  /** the confirmed requirements of a module area, as read-only lines: { id, title, text } (never copied into the record) */
  function reqLines(reqs, key) {
    if (!/^module:/.test(key)) return []; const m = key.slice(7);
    return arr(reqs).filter(r => r && r.status === 'Confirmed' && arr(r.modules).includes(m)).map(r => ({ id: r.id, title: r.title || '', text: String(r.objective || r.title || '').trim() }));
  }

  /** a new document with the text saved as a new version; the previous text goes to the history. opts: { by, at, why, status, sources: [{ quote, source }] } */
  function save(doc, key, text, opts) {
    if (!KEY_RE.test(String(key))) throw new Error('Unknown solution area.'); const o = opts || {}; const t = clean(text); const items = Object.assign({}, itemsOf(doc)); const cur = items[key] || { text: '', status: 'Draft', sources: [], versions: [] };
    const status = STATUSES.includes(o.status) ? o.status : cur.status; if (t === (cur.text || '') && status === cur.status && !arr(o.sources).length) return { items };
    const versions = (cur.text && cur.text !== t ? [{ at: cur.updatedAt || '', by: cur.updatedBy || '', why: cur.why || '', text: cur.text }].concat(arr(cur.versions)) : arr(cur.versions)).slice(0, MAX_VERSIONS);
    const src = arr(o.sources).map(s => ({ quote: clean(s && s.quote).slice(0, 500), source: clean(s && s.source).slice(0, 160), at: o.at || '' })).filter(s => s.quote || s.source);
    items[key] = { text: t, status, sources: arr(cur.sources).concat(src).slice(-40), versions, updatedAt: o.at || '', updatedBy: o.by || '', why: clean(o.why).slice(0, 300) };
    return { items };
  }
  /** restore an older version: it becomes the newest one (the current text is kept in the history) */
  function restore(doc, key, i, by, at) { const r = recOf(doc, key); const v = r && arr(r.versions)[i]; if (!v) throw new Error('That version does not exist.'); return save(doc, key, v.text, { by, at, why: 'Restored the version of ' + (v.at || 'an earlier date').slice(0, 10) }); }
  /** accept a proposal (kind solution) of design_proposals: text becomes the new version, the quote is kept as a source; a customer-sourced one marks the area Changed by customer */
  function accept(doc, p, by, at) {
    if (!p || p.kind !== 'solution') throw new Error('Not a solution proposal.'); return save(doc, p.module, p.text, { by, at, why: p.why || 'Accepted a proposal', status: p.fromCustomer ? 'Changed by customer' : undefined, sources: [{ quote: p.quote, source: p.source }] });
  }

  /** word-level difference of two texts for the before/after view: [{ t: 'same'|'del'|'add', w }] */
  function diff(a, b) {
    const x = String(a || '').split(/(\s+)/).filter(Boolean), y = String(b || '').split(/(\s+)/).filter(Boolean); const n = x.length, m = y.length; if (n * m > 4e6) return [{ t: 'del', w: String(a || '') }, { t: 'add', w: String(b || '') }];
    const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1)); for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = x[i] === y[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const out = []; const push = (t, w) => { const l = out[out.length - 1]; if (l && l.t === t) l.w += w; else out.push({ t, w }); }; let i = 0, j = 0;
    while (i < n && j < m) { if (x[i] === y[j]) { push('same', x[i]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) push('del', x[i++]); else push('add', y[j++]); }
    while (i < n) push('del', x[i++]); while (j < m) push('add', y[j++]); return out;
  }

  /** BRD: the paragraphs of a solution text (blank line = new paragraph); empty list when nothing is written */
  const paras = text => String(text || '').split(/\n\s*\n/).map(s => s.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
  /** BRD: the fixed areas that have text, as [{ key, label, paras }] in menu order */
  const otherAreas = doc => FIXED.map(a => ({ key: a.key, label: a.label, paras: paras(textOf(doc, a.key)) })).filter(a => a.paras.length);

  /** Word export rows: [Module / area, Customer requirement, Solution] for every area that has a requirement or a solution */
  function wordRows(areas, doc, reqs) {
    return arr(areas).map(a => ({ label: a.label, req: reqLines(reqs, a.key).map(r => r.id + ' ' + (r.text || r.title)).join('\n'), sol: textOf(doc, a.key) })).filter(r => r.req || r.sol).map(r => [r.label, r.req || '—', r.sol || 'To be written']);
  }

  /** the solution proposals of design_proposals: open ones, optionally for one area */
  const proposalsFor = (props, key) => arr(props).filter(p => p && p.kind === 'solution' && p.status === 'open' && (!key || p.module === key));

  const api = { STATUSES, GROUPS, FIXED, KEY_RE, areasFor, itemsOf, recOf, textOf, statusOf, reqLines, save, restore, accept, diff, paras, otherAreas, wordRows, proposalsFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBSolutionLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);

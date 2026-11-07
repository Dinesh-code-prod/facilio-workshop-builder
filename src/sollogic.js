/* Solution tab rules (plan: docs/reference/SOLUTION-TAB-PLAN-2026-11-07.md). Pure code, no page, no network; tested by tests/sollogic.mjs, used by src/solution.js, src/brd.js and the Word export.
   The solutions are the project document `solutions`: { items: { "<areaKey>": { text, status, sources[], versions[], updatedAt, updatedBy } } }.
   An area is one module in scope (key module:<name>) or one fixed area (key area:<id>). Every change is a new version that keeps the previous text, who, when and why. Nothing here calls Claude:
   a proposal (design_proposals, kind solution) only becomes text when a person accepts it (accept). */
(function (root) {
  'use strict';
  const arr = v => (Array.isArray(v) ? v : []);
  const STATUSES = ['Draft', 'Agreed', 'Changed by customer'];
  const GROUPS = ['Modules', 'Integrations', 'Connected apps', 'Templates and PDFs', 'KPIs and SLA', 'Notifications and roles', 'Other areas'];
  /** what a person can add: the type decides the group. Integrations come first because most contracts have one (service desk, procurement or ERP, the customer's own portal, single sign-on, data feeds). */
  const TYPES = [['int_sr', 'Integration: service requests with the customer’s system or portal', 'Integrations'], ['int_proc', 'Integration: procurement, ERP or finance', 'Integrations'], ['int_portal', 'Integration: the customer’s own portal or app', 'Integrations'], ['int_sso', 'Integration: sign-on or directory', 'Integrations'], ['int_data', 'Integration: data feed, API or file exchange', 'Integrations'], ['module_contract', 'A module or service named in the contract', 'Modules'], ['app', 'Connected app', 'Connected apps'], ['other', 'Another commitment of the contract', 'Other areas']];
  const INT_HINT = ['Systems on both sides and who owns each.', 'Direction and trigger: what starts the exchange, and from which Facilio state or event.', 'The data exchanged: records, fields and statuses in each direction, and what the key is.', 'Frequency or real-time, volumes, and what happens on an error or a retry.', 'Security: sign-in method and who holds the credentials.', 'Who builds and who tests each side, and whether it is inside the contract scope.'];
  const FIXED = [{ key: 'area:integrations', group: 'Integrations', label: 'Integrations: overview and scope' }, { key: 'area:apps', group: 'Connected apps', label: 'Connected apps' }, { key: 'area:templates', group: 'Templates and PDFs', label: 'PDF templates and print layouts' }, { key: 'area:kpis', group: 'KPIs and SLA', label: 'KPIs' }, { key: 'area:sla', group: 'KPIs and SLA', label: 'SLA and escalation matrix' },
    { key: 'area:notifications', group: 'Notifications and roles', label: 'Notifications' }, { key: 'area:approvals', group: 'Notifications and roles', label: 'Approval rules' }, { key: 'area:roles', group: 'Notifications and roles', label: 'Roles and access' }, { key: 'area:other', group: 'Notifications and roles', label: 'Other contract commitments' }];
  const KEY_RE = /^(module:[A-Za-z0-9_.-]{1,80}|area:[a-z]{2,20}|custom:[a-z0-9-]{1,40})$/;
  const MAX_VERSIONS = 30, MAX_TEXT = 6000;
  const clean = s => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]+/g, ' ').replace(/\r\n?/g, '\n').trim().slice(0, MAX_TEXT);

  /** the table of an area: its columns depend on what kind of solution it is. The first column names the row; every row also has a status. Keep in step with work/server/_solctx.mjs (tests/solctx.mjs checks it). */
  const ROW_STATUS = ['Draft', 'Agreed', 'Open question'];
  const LAYOUTS = {
    module: { label: 'Solution by topic', cols: [['topic', 'Topic', 1.3], ['solution', 'What Facilio does', 3.2], ['who', 'Who is involved', 1.4], ['reqs', 'Requirements', 1.1]], topics: ['Process and states', 'Approvals', 'Notifications', 'Fields and forms', 'Access and roles', 'SLA and reports', 'Integrations', 'Exceptions and limits'] },
    apps: { label: 'Connected apps', cols: [['app', 'App', 1.3], ['opens', 'Opens from', 1.4], ['what', 'What it does', 3], ['users', 'Used by', 1.2]] },
    integration: { label: 'Integrations', cols: [['name', 'Integration', 1.2], ['systems', 'Systems and owners', 1.5], ['flow', 'Direction and trigger', 1.7], ['data', 'Data exchanged', 1.8], ['errors', 'Frequency and errors', 1.4], ['build', 'Who builds and tests', 1.2]] },
    kpis: { label: 'KPIs', cols: [['kpi', 'KPI', 1.3], ['measure', 'What it measures', 2], ['how', 'How Facilio delivers it', 2.4], ['target', 'Target', 1]] },
    sla: { label: 'SLA and escalation', cols: [['scope', 'Module and priority', 1.4], ['commit', 'Commitment', 2], ['how', 'How it is tracked', 2], ['esc', 'Escalation', 1.8]] },
    notifications: { label: 'Notifications', cols: [['event', 'Event', 1.6], ['who', 'Who is told', 1.6], ['channel', 'Channel', 1], ['text', 'What it says', 2.4]] },
    approvals: { label: 'Approval rules', cols: [['name', 'Approval', 1.4], ['rule', 'When it applies', 2.2], ['who', 'Who approves', 1.6], ['then', 'On approve and reject', 2]] },
    roles: { label: 'Roles and access', cols: [['role', 'Role', 1.3], ['can', 'Can do', 2.8], ['cannot', 'Cannot do', 2], ['notes', 'Notes', 1.4]] },
    templates: { label: 'PDF templates and print layouts', cols: [['doc', 'Document', 1.4], ['when', 'When it is made', 1.6], ['content', 'Contents and layout', 3], ['notes', 'Notes', 1.2]] },
    other: { label: 'Commitments', cols: [['item', 'Commitment', 1.5], ['detail', 'What Facilio does', 3.4], ['notes', 'Notes', 1.5]] }
  };
  const kindOfKey = (doc, key) => { if (/^module:/.test(key)) return 'module'; if (key === 'area:integrations') return 'integration'; const k = /^area:/.test(key) ? key.slice(5) : ''; if (LAYOUTS[k]) return k; const c = customOf(doc).find(x => x.key === key); return c ? (/^int_/.test(c.type || '') ? 'integration' : c.type === 'app' ? 'apps' : c.type === 'module_contract' ? 'module' : 'other') : 'other'; };
  const layoutOf = (doc, key) => LAYOUTS[kindOfKey(doc, key)];
  /** rows cleaned to the layout: only its columns, text clipped, a valid status, empty rows dropped, at most 40; ids kept or made */
  function cleanRows(rows, kind) {
    const cols = (LAYOUTS[kind] || LAYOUTS.other).cols.map(c => c[0]); let n = 0; const ids = new Set(arr(rows).map(r => r && r.id).filter(Boolean));
    return arr(rows).slice(0, 40).map(r => { const cells = {}; cols.forEach(k => { const v = clean(r && r.cells && r.cells[k]).slice(0, 700); if (v) cells[k] = v; }); if (!Object.keys(cells).length) return null; let id = r && /^r[0-9a-z]{1,10}$/.test(r.id || '') ? r.id : ''; while (!id) { const c = 'r' + (++n); if (!ids.has(c)) { id = c; ids.add(c); } } return { id, cells, status: ROW_STATUS.includes(r && r.status) ? r.status : 'Draft' }; }).filter(Boolean);
  }
  /** a row has something to show when a column other than its name is filled */
  const rowFilled = (r, kind) => (LAYOUTS[kind] || LAYOUTS.other).cols.slice(1).some(c => r.cells && r.cells[c[0]]);
  const rowText = (r, kind) => (LAYOUTS[kind] || LAYOUTS.other).cols.map(c => (r.cells && r.cells[c[0]]) || '').filter(Boolean).join(' - ');
  /** whether an area has anything written: an overview or at least one row with content */
  const hasContent = (doc, key) => { const r = recOf(doc, key); if (!r) return false; const k = kindOfKey(doc, key); return !!(r.text || arr(r.rows).some(x => rowFilled(x, k))); };
  /** one text for the whole area (overview, then one line per row): used by the Word export and by searches */
  const flatText = (doc, key) => { const r = recOf(doc, key); if (!r) return ''; const k = kindOfKey(doc, key); return [r.text || ''].concat(arr(r.rows).filter(x => rowFilled(x, k)).map(x => rowText(x, k).replace(' - ', ': '))).filter(Boolean).join('\n'); };
  /** BRD and Word: the table of an area { headers, rows, widths } or null; a Status column only when some row is not agreed */
  function table(doc, key) {
    const r = recOf(doc, key); const k = kindOfKey(doc, key), L = LAYOUTS[k]; const rows = arr(r && r.rows).filter(x => rowFilled(x, k)); if (!rows.length) return null; const st = rows.some(x => x.status !== 'Agreed');
    return { headers: L.cols.map(c => c[1]).concat(st ? ['Status'] : []), rows: rows.map(x => L.cols.map(c => (x.cells && x.cells[c[0]]) || '').concat(st ? [x.status === 'Agreed' ? 'Agreed' : x.status === 'Open question' ? 'To be confirmed' : 'Draft'] : [])), widths: L.cols.map(c => c[2]).concat(st ? [0.9] : []) };
  }
  /** before and after of the rows, matched by the first column: [{ t: 'same'|'add'|'chg'|'del', row, was }] */
  function diffRows(oldRows, newRows) {
    const key = r => String((r && r.cells && Object.values(r.cells)[0]) || '').trim().toLowerCase(); const old = arr(oldRows), out = []; const seen = new Set();
    arr(newRows).forEach(n => { const o = old.find(x => !seen.has(x) && key(x) === key(n)); if (!o) { out.push({ t: 'add', row: n }); return; } seen.add(o); out.push({ t: JSON.stringify([o.cells, o.status]) === JSON.stringify([n.cells, n.status]) ? 'same' : 'chg', row: n, was: o }); });
    old.forEach(o => { if (!seen.has(o)) out.push({ t: 'del', row: o }); }); return out;
  }
  /** the areas of a project: modules in scope first (mods: [{ name, label }]), then the fixed ones, then the ones the team added (doc.custom) */
  const customOf = doc => arr(doc && doc.custom).filter(c => c && /^custom:[a-z0-9-]{1,40}$/.test(c.key));
  const areasFor = (mods, doc) => arr(mods).map(m => ({ key: 'module:' + m.name, group: 'Modules', label: m.label || m.name, module: m.name })).concat(FIXED, customOf(doc).map(c => ({ key: c.key, group: GROUPS.includes(c.group) ? c.group : 'Other areas', label: c.label, custom: true, type: c.type || 'other', modules: arr(c.modules), keywords: arr(c.keywords) })));
  const itemsOf = doc => (doc && doc.items && typeof doc.items === 'object' && !Array.isArray(doc.items) ? doc.items : {});
  const recOf = (doc, key) => itemsOf(doc)[key] || null;
  const textOf = (doc, key) => { const r = recOf(doc, key); return r && r.text ? String(r.text).trim() : ''; };
  const statusOf = (doc, key) => { const r = recOf(doc, key); return r && hasContent(doc, key) ? (STATUSES.includes(r.status) ? r.status : 'Draft') : 'Not written'; };

  /** the confirmed requirements of a module area, as read-only lines: { id, title, text } (never copied into the record) */
  function reqLines(reqs, key) {
    if (!/^module:/.test(key)) return []; const m = key.slice(7);
    return arr(reqs).filter(r => r && r.status === 'Confirmed' && arr(r.modules).includes(m)).map(r => ({ id: r.id, title: r.title || '', text: String(r.objective || r.title || '').trim() }));
  }

  /** a new document with the text (and the rows, when opts.rows is given) saved as a new version; the previous ones go to the history. opts: { by, at, why, status, rows, sources: [{ quote, source }] } */
  function save(doc, key, text, opts) {
    if (!KEY_RE.test(String(key))) throw new Error('Unknown solution area.'); const o = opts || {}; const t = clean(text); const items = Object.assign({}, itemsOf(doc)); const cur = items[key] || { text: '', status: 'Draft', sources: [], versions: [], rows: [] };
    const rows = o.rows === undefined ? arr(cur.rows) : cleanRows(o.rows, kindOfKey(doc, key)); const sameRows = JSON.stringify(rows) === JSON.stringify(arr(cur.rows));
    const status = STATUSES.includes(o.status) ? o.status : cur.status; if (t === (cur.text || '') && sameRows && status === cur.status && !arr(o.sources).length) return Object.assign({}, doc, { items });
    const had = cur.text || arr(cur.rows).length; const versions = (had && (cur.text !== t || !sameRows) ? [{ at: cur.updatedAt || '', by: cur.updatedBy || '', why: cur.why || '', text: cur.text || '', rows: arr(cur.rows) }].concat(arr(cur.versions)) : arr(cur.versions)).slice(0, MAX_VERSIONS);
    const src = arr(o.sources).map(s => ({ quote: clean(s && s.quote).slice(0, 500), source: clean(s && s.source).slice(0, 160), at: o.at || '' })).filter(s => s.quote || s.source);
    items[key] = { text: t, rows, status, sources: arr(cur.sources).concat(src).slice(-40), versions, updatedAt: o.at || '', updatedBy: o.by || '', why: clean(o.why).slice(0, 300) };
    return Object.assign({}, doc, { items });
  }
  /** restore an older version: it becomes the newest one (the current text is kept in the history) */
  function restore(doc, key, i, by, at) { const r = recOf(doc, key); const v = r && arr(r.versions)[i]; if (!v) throw new Error('That version does not exist.'); return save(doc, key, v.text, { rows: arr(v.rows), by, at, why: 'Restored the version of ' + (v.at || 'an earlier date').slice(0, 10) }); }
  /** accept a proposal (kind solution) of design_proposals: text becomes the new version, the quote is kept as a source; a customer-sourced one marks the area Changed by customer */
  function accept(doc, p, by, at) {
    if (!p || p.kind !== 'solution') throw new Error('Not a solution proposal.'); if (/^custom:/.test(p.module) && !customOf(doc).some(c => c.key === p.module)) doc = addArea(doc, { key: p.module, label: p.name || p.module, group: p.group }, by, at).doc;   // Claude proposed a new area from a file: it is registered when you accept
    const cur = recOf(doc, p.module) || {}; return save(doc, p.module, p.text || cur.text || '', { rows: p.rows === undefined ? undefined : arr(p.rows), by, at, why: p.why || 'Accepted a proposal', status: p.fromCustomer ? 'Changed by customer' : undefined, sources: [{ quote: p.quote, source: p.source }] });
  }

  const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
  /** add an area of your own: { label, type (see TYPES), modules: [module names], keywords: [words], key? (a proposal brings its own) }. Returns { doc, key } */
  function addArea(doc, a, by, at) {
    const label = clean(a && a.label).slice(0, 80); if (!label) throw new Error('Give the area a name.'); const ty = TYPES.find(x => x[0] === (a && a.type)); const have = new Set(customOf(doc).map(c => c.key));
    let key = a && /^custom:[a-z0-9-]{1,40}$/.test(a.key) ? a.key : 'custom:' + (slug(label) || 'area'); if (!(a && a.key)) { let i = 2; const b = key; while (have.has(key)) key = b + '-' + i++; } else if (have.has(key)) return { doc, key };
    const rec = { key, label, type: ty ? ty[0] : 'other', group: ty ? ty[2] : (GROUPS.includes(a && a.group) ? a.group : 'Other areas'), modules: arr(a && a.modules).map(x => clean(x).slice(0, 80)).filter(Boolean).slice(0, 12), keywords: arr(a && a.keywords).map(x => clean(x).slice(0, 40)).filter(Boolean).slice(0, 12), addedBy: by || '', addedAt: at || '' };
    return { doc: Object.assign({}, doc, { custom: customOf(doc).concat(rec) }), key };
  }
  const removeArea = (doc, key) => Object.assign({}, doc, { custom: customOf(doc).filter(c => c.key !== key) });
  const words = x => ' ' + String(x || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
  const wordIn = (text, w) => { const x = words(w).trim(); return x.length > 2 && [' ' + x + ' ', ' ' + x + 's ', ' ' + x + 'es '].some(p => words(text).includes(p)); };
  /** the in-scope modules an area is linked to: the ones picked, plus the ones named in its keywords, its name or its text (mods: [{ name, label }]) */
  function linkedModules(area, doc, mods) {
    if (!area || /^module:/.test(area.key)) return []; const text = textOf(doc, area.key), ws = [area.label].concat(arr(area.keywords));
    return arr(mods).filter(m => arr(area.modules).includes(m.name) || ws.some(w => wordIn(w, m.label) || wordIn(w, m.name)) || wordIn(text, m.label) || wordIn(text, m.name)).map(m => m.name);
  }
  /** BRD: for one module, the areas of other groups that are linked to it and have text: [{ key, label, group, paras }] */
  function relatedFor(doc, moduleName, mods) {
    return areasFor(mods, doc).filter(a => !/^module:/.test(a.key) && a.group !== 'Integrations' && hasContent(doc, a.key) && linkedModules(a, doc, mods).includes(moduleName)).map(a => ({ key: a.key, label: a.label, group: a.group, paras: paras(textOf(doc, a.key)), table: table(doc, a.key) }));
  }
  /** BRD: the labels of the integration areas (with text) that touch a module, so its section can point to them */
  const integrationsFor = (doc, moduleName, mods) => areasFor(mods, doc).filter(a => a.group === 'Integrations' && hasContent(doc, a.key) && linkedModules(a, doc, mods).includes(moduleName)).map(a => a.label);
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
  /** BRD: the areas not shown inside a module section (not linked to one, or an integration, which always has its own place): [{ key, label, group, paras }] in menu order */
  const otherAreas = (doc, mods) => areasFor(mods, doc).filter(a => !/^module:/.test(a.key) && (a.group === 'Integrations' || !linkedModules(a, doc, mods).length)).map(a => ({ key: a.key, label: a.label, group: a.group, paras: paras(textOf(doc, a.key)), table: table(doc, a.key) })).filter(a => a.paras.length || a.table).sort((x, y) => GROUPS.indexOf(x.group) - GROUPS.indexOf(y.group));

  /** Word export rows: [Module / area, Customer requirement, Solution] for every area that has a requirement or a solution */
  function wordRows(areas, doc, reqs) {
    return arr(areas).map(a => ({ label: a.label, req: reqLines(reqs, a.key).map(r => r.id + ' ' + (r.text || r.title)).join('\n'), sol: flatText(doc, a.key) })).filter(r => r.req || r.sol).map(r => [r.label, r.req || '—', r.sol || 'To be written']);
  }

  /** the solution proposals of design_proposals: open ones, optionally for one area */
  /** the design_proposals list with new solution proposals added (same rules as work/server/_dsapi.mjs mergeProposals: a decided identical one is skipped, an open one of the same area is replaced); returns { items, added } */
  function mergeProposals(items, incoming, now) {
    const old = arr(items); const key = p => ['solution', p.module, p.text, JSON.stringify(p.rows || [])].join('|'); const decided = new Set(old.filter(p => p && p.kind === 'solution' && p.status !== 'open').map(key)); const fresh = arr(incoming).filter(p => p && p.kind === 'solution' && p.module && !decided.has(key(p)));
    const areas = new Set(fresh.map(p => p.module)); let n = Math.max(0, ...old.map(p => parseInt(String(p && p.id).slice(3), 10) || 0)); const keep = old.filter(p => !(p && p.kind === 'solution' && p.status === 'open' && areas.has(p.module)));
    return { items: keep.concat(fresh.map(p => Object.assign({ id: 'dp_' + (++n), status: 'open', by: '', byAt: '', savedAt: now }, p))), added: fresh.length };
  }
  const proposalsFor = (props, key) => arr(props).filter(p => p && p.kind === 'solution' && p.status === 'open' && (!key || p.module === key));

  const api = { mergeProposals, LAYOUTS, ROW_STATUS, kindOfKey, layoutOf, cleanRows, rowFilled, hasContent, flatText, table, diffRows, integrationsFor, TYPES, INT_HINT, customOf, addArea, removeArea, linkedModules, relatedFor, STATUSES, GROUPS, FIXED, KEY_RE, areasFor, itemsOf, recOf, textOf, statusOf, reqLines, save, restore, accept, diff, paras, otherAreas, wordRows, proposalsFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBSolutionLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);

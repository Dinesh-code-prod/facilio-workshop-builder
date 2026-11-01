/* UAT test cases: the rules that do not need a page (pure code, also run by tests/uat.mjs).
   Statuses, the summary per module (every number is a count of saved test cases), the next test case ID, and the reading of an Excel/CSV tracker:
   suggested column mapping, canonical status words, duplicate detection and a row-by-row report. */
(function (root) {
  'use strict';
  const STATUS = ['Not Started', 'Ready for Testing', 'In Progress', 'Passed', 'Failed', 'Blocked', 'Deferred', 'Retesting', 'Approved'];
  const norm = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toLowerCase();
  // fields a tracker row can fill, with the header words that usually mean them (first match wins, each column is used once)
  const FIELDS = [
    ['tcid', 'Test case ID', [/test ?case ?(id|no|number)/, /^tc ?(id|no)?$/, /^test ?id$/, /^case ?(id|no)$/, /^id$/]],
    ['module', 'Module', [/^module/, /^area/, /^feature/, /^application/]],
    ['scenario', 'Scenario', [/scenario/, /^test (area|group|suite)/, /^process/, /^use ?case/]],
    ['title', 'Test case', [/test ?case ?(name|title|description)?$/, /^test ?(name|title|description)$/, /^title$/, /^description$/, /^summary$/]],
    ['pre', 'Preconditions', [/pre-?condition/, /pre-?requisite/, /^setup/]],
    ['steps', 'Steps', [/^test ?steps?$/, /^steps?$/, /procedure/, /^action/]],
    ['expected', 'Expected result', [/expected/]],
    ['actual', 'Actual result', [/actual/]],
    ['status', 'Status', [/execution status/, /^status$/, /^result$/, /pass ?\/ ?fail/]],
    ['tester', 'Tester', [/tester/, /tested by/, /executed by/, /assigned to/, /^owner$/]],
    ['date', 'Execution date', [/execution date/, /executed on/, /^date$/, /tested on/]],
    ['issue', 'Issue reference', [/issue|defect|bug|ticket/]],
    ['req', 'Requirement', [/requirement/, /^req\.? ?(id|ref|no)?$/, /brd/]],
    ['notes', 'Comments', [/comment|remark|note/]]
  ];
  function suggestMap(headers) {
    const map = {}; const used = new Set(); const H = headers.map(norm);
    FIELDS.forEach(([k, , res]) => { for (const re of res) { const i = H.findIndex((h, ix) => h && !used.has(ix) && re.test(h)); if (i >= 0) { map[k] = i; used.add(i); break; } } });
    return map;
  }
  // the header row: the first of the first 15 rows with at least 3 filled cells of which at least 2 look like the words above
  function findHeaderRow(rows) {
    for (let i = 0; i < Math.min(15, rows.length); i++) { const r = rows[i] || []; const filled = r.filter(c => norm(c)); if (filled.length < 3) continue; const m = suggestMap(r.map(c => String(c == null ? '' : c))); if (Object.keys(m).length >= 2) return i; }
    return -1;
  }
  const STATUS_WORDS = [[/^(pass|passed|ok|success|successful|accepted)$/, 'Passed'], [/^(fail|failed|failure|ng)$/, 'Failed'], [/^block/, 'Blocked'], [/^(not started|not tested|not executed|pending|todo|to do|new|open|)$/, 'Not Started'], [/^ready/, 'Ready for Testing'], [/^(in progress|ongoing|testing|wip)$/, 'In Progress'], [/^defer|^postpone/, 'Deferred'], [/^re-?test/, 'Retesting'], [/^(approved|signed off|sign-off|closed)$/, 'Approved']];
  function normStatus(v) { const t = norm(v); const hit = STATUS_WORDS.find(([re]) => re.test(t)); if (hit) return hit[1]; const exact = STATUS.find(s => norm(s) === t); return exact || null; }
  const keysOf = c => [].concat(norm(c.tcid) ? ['id:' + norm(c.tcid)] : [], ['mt:' + norm(c.module) + '|' + norm(c.title)]);   // the same ID, or the same title in the same module, is the same test case
  function nextId(modLabel, existing) {
    const code = (String(modLabel || 'GEN').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4) || 'GEN'); const re = new RegExp('^UAT-' + code + '-(\\d+)$'); let n = 0;
    existing.forEach(c => { const m = re.exec(String(c.tcid || '')); if (m) n = Math.max(n, Number(m[1])); }); return 'UAT-' + code + '-' + String(n + 1).padStart(3, '0');
  }
  // rows: array of arrays after the header; map: field -> column index; existing: saved cases; resolveModule: text -> module name or ''
  function readRows(rows, headers, map, existing, resolveModule) {
    const seen = new Set(existing.flatMap(keysOf)); const out = { ok: [], dups: [], errors: [], warnings: [] }; const mapped = new Set(Object.values(map));
    rows.forEach((r, ix) => {
      const g = k => (map[k] == null ? '' : String(r[map[k]] == null ? '' : (r[map[k]].text !== undefined ? r[map[k]].text : r[map[k]].result !== undefined ? r[map[k]].result : r[map[k]])).trim());
      if (!r.some(c => norm(c))) return; const rowNo = ix + 1;
      const c = { tcid: g('tcid'), module: g('module'), scenario: g('scenario'), title: g('title'), pre: g('pre'), steps: g('steps'), expected: g('expected'), actual: g('actual'), tester: g('tester'), date: g('date'), issueRef: g('issue'), req: g('req'), notes: g('notes') };
      if (!c.title && !c.scenario) { out.errors.push({ row: rowNo, msg: 'No test case or scenario text' }); return; } if (!c.title) c.title = c.scenario;
      const st = g('status'); const ns = normStatus(st); if (st && ns == null) { out.warnings.push({ row: rowNo, msg: 'Status "' + st.slice(0, 30) + '" is not a known status; imported as Not Started' }); } c.status = ns || 'Not Started';
      c.mod = (resolveModule && resolveModule(c.module)) || ''; if (c.module && !c.mod) out.warnings.push({ row: rowNo, msg: 'Module "' + c.module.slice(0, 40) + '" is not a module of this project; kept as written' });
      c.extra = {}; headers.forEach((h, i) => { if (!mapped.has(i) && norm(h) && norm(r[i])) c.extra[String(h).trim().slice(0, 60)] = String(r[i] && r[i].text !== undefined ? r[i].text : r[i]).trim().slice(0, 500); });
      const ks = keysOf(c); if (ks.some(k => seen.has(k))) { out.dups.push({ row: rowNo, msg: 'Already a test case (' + (c.tcid || c.title.slice(0, 40)) + ')' }); return; } ks.forEach(k => seen.add(k)); c.srcRow = rowNo; out.ok.push(c);
    });
    return out;
  }
  const GOOD = ['Passed', 'Approved'];
  function summarize(cases, moduleNames) {
    const by = {}; STATUS.forEach(s => { by[s] = 0; }); const per = {};
    (moduleNames || []).forEach(m => { per[m] = { total: 0, passed: 0, failed: 0, blocked: 0, notRun: 0, open: 0 }; });
    cases.forEach(c => { const s = STATUS.includes(c.status) ? c.status : 'Not Started'; by[s]++; const m = per[c.mod || c.module || '(no module)'] = per[c.mod || c.module || '(no module)'] || { total: 0, passed: 0, failed: 0, blocked: 0, notRun: 0, open: 0 };
      m.total++; if (GOOD.includes(s)) m.passed++; else if (s === 'Failed') m.failed++; else if (s === 'Blocked') m.blocked++; else if (s === 'Not Started' || s === 'Ready for Testing') m.notRun++; else m.open++; });
    const total = cases.length; const passed = GOOD.reduce((n, s) => n + by[s], 0);
    return { total, byStatus: by, passed, failed: by.Failed, blocked: by.Blocked, notRun: by['Not Started'] + by['Ready for Testing'], passRate: total ? Math.round(100 * passed / total) : null, perModule: per };
  }
  // ---------- UAT issues: the board is a view of the central task register (type Issue / Blocker, with a "uat" part), not a second list ----------
  const ISSUE_ST = ['New', 'Open', 'Assigned', 'In Progress', 'Fixed', 'Ready for Retesting', 'Retesting', 'Closed', 'Deferred'];
  const SEVERITY = ['Critical', 'Major', 'Minor', 'Trivial'];
  const TASK_OF = { New: 'To Do', Open: 'To Do', Assigned: 'To Do', 'In Progress': 'In Progress', Fixed: 'In Review', 'Ready for Retesting': 'In Review', Retesting: 'In Review', Closed: 'Done', Deferred: 'Awaiting Internal Input' };   // what each board column means in Tasks
  const FROM_TASK = { 'To Do': 'Open', 'In Progress': 'In Progress', 'In Review': 'Fixed', Done: 'Closed', Cancelled: 'Closed', Blocked: 'Open', 'Awaiting Customer': 'Open', 'Awaiting Internal Input': 'Deferred' };
  const isUatIssue = t => !!(t && (t.uat || (t.type === 'Issue / Blocker' && (t.links || []).some(l => l.kind === 'utc'))));
  const issueStatus = t => (t && t.uat && ISSUE_ST.includes(t.uat.status)) ? t.uat.status : (FROM_TASK[t && t.status] || 'Open');
  const FIXED = ['Fixed', 'Ready for Retesting', 'Closed'];
  function issueFilter(issues, f) { f = f || {}; const q = norm(f.q); return issues.filter(t => (!f.mod || t.module === f.mod) && (!f.pri || t.priority === f.pri) && (!f.own || t.owner === f.own) && (!q || norm(t.title + ' ' + (t.desc || '') + ' T-' + t.n).includes(q))); }
  // chart data: every figure is a count of saved test cases or issues
  function chartData(type, cases, issues, labelOf) {
    if (type === 'status') { const s = summarize(cases, []); return { title: 'Test cases by status', unit: 'test cases', rows: STATUS.filter(k => s.byStatus[k]).map(k => ({ label: k, value: s.byStatus[k] })) }; }
    if (type === 'issues') { const by = {}; ISSUE_ST.forEach(k => { by[k] = 0; }); issues.forEach(t => { by[issueStatus(t)]++; }); return { title: 'UAT issues by status', unit: 'issues', rows: ISSUE_ST.filter(k => by[k]).map(k => ({ label: k, value: by[k] })) }; }
    const s = summarize(cases, []); return { title: 'UAT progress by module', unit: 'test cases', stacked: true, rows: Object.entries(s.perModule).filter(([, m]) => m.total).map(([k, m]) => ({ label: labelOf ? labelOf(k) : k, parts: [['Passed', m.passed], ['Failed', m.failed], ['Blocked', m.blocked], ['Not run', m.notRun], ['In progress or retesting', m.open]], value: m.total })).sort((a, b) => b.value - a.value) };
  }
  const api = { STATUS, ISSUE_ST, SEVERITY, TASK_OF, isUatIssue, issueStatus, FIXED, issueFilter, chartData, FIELDS, suggestMap, findHeaderRow, normStatus, nextId, readRows, summarize, keysOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBUat = api;
})(typeof window !== 'undefined' ? window : globalThis);

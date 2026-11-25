/* A customer's tracker (any Excel or CSV layout: action lists, issue logs, UAT trackers) read as tasks. Pure code, no DOM (tests/trackerlogic.mjs).
   src/assistant.js reads the sheets in the browser, findHeaderRow and suggestMap match the columns by their names, toTasks turns the rows into task fields;
   the server (work/server/_actions.mjs action addtasks) checks owners, skips tasks already in the register, creates them and can undo it. */
(function (root) {
  'use strict';
  const norm = s => String(s == null ? '' : s).toLowerCase().replace(/[_\-./()#:]+/g, ' ').replace(/\s+/g, ' ').trim();
  // [field, label, header words]; the first header that matches wins, a header is used once; title first so "Issue description" is the title when there is no other
  const FIELDS = [
    ['title', 'Task', [/^(task|title|subject|summary|action|action item|activity|item|point|query|observation|issue|defect|bug|test case|scenario|requirement)( (name|title|summary|description|details))?$/, /^(issue|defect|bug|task|action|query|observation) (description|details)$/, /\b(task|title|subject|summary)\b/]],
    ['desc', 'Details', [/^(description|details|detail|steps|remarks?|comments?|notes?|explanation)$/, /\b(descr|detail|remark|comment|note|steps)/]],
    ['owner', 'Owner', [/^(owner|assignee|assigned to|responsible|action by|action owner|pic|poc|resource|done by|tester)$/, /\b(owner|assign|responsib|action by|resource)/]],
    ['due', 'Due date', [/^(due|due date|target|target date|deadline|eta|end date|planned end|closure date|by when|expected (date|closure))$/, /\b(due|target|deadline|eta)\b/]],
    ['status', 'Status', [/^(status|state|current status|result|execution status|open ?\/ ?closed)$/, /\bstatus\b/]],
    ['priority', 'Priority', [/^(priority|severity|criticality|impact|urgency)$/, /\b(priority|severity|critical)/]],
    ['module', 'Module', [/^(module|area|feature|screen|component|functional area|category|section|process)$/, /\b(module|feature|area)\b/]]
  ];
  function suggestMap(headers) {
    const H = (headers || []).map(norm), map = {}, used = new Set();
    FIELDS.forEach(([k, , res]) => { for (const re of res) { const i = H.findIndex((h, ix) => h && !used.has(ix) && re.test(h)); if (i >= 0) { map[k] = i; used.add(i); break; } } });
    if (map.title == null && map.desc != null) { map.title = map.desc; delete map.desc; }   // only a Description column: it is the task
    return map;
  }
  // the header row: the first of the first 20 rows with 2+ filled cells of which 2 match the words above and one is the task
  function findHeaderRow(rows) {
    for (let i = 0; i < Math.min(20, (rows || []).length); i++) { const r = rows[i] || []; if (r.filter(c => norm(c)).length < 2) continue; const m = suggestMap(r); if (m.title != null && Object.keys(m).length >= 2) return i; }
    return -1;
  }
  const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  const pad = n => String(n).padStart(2, '0'), ok = (y, m, d) => (y > 1990 && y < 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31 ? y + '-' + pad(m) + '-' + pad(d) : '');
  /** a date in any usual form to YYYY-MM-DD: 2026-12-05, 05/12/2026 (day first, as in Indian and UK trackers, unless the first number is over 12), 5-Dec-2026, Dec 5 2026, an Excel day number */
  function toDay(v) {
    if (v == null || v === '') return ''; if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10);
    const s = String(v).trim(); let m;
    if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s))) return ok(+m[1], +m[2], +m[3]);
    if ((m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(s))) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return +m[2] > 12 ? ok(y, +m[1], +m[2]) : ok(y, +m[2], +m[1]); }
    if ((m = /^(\d{1,2})[\s-]([a-z]{3})[a-z]*[\s-,]*(\d{2,4})$/i.exec(s))) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return ok(y, MON[m[2].toLowerCase()] || 0, +m[1]); }
    if ((m = /^(?:[a-z]{3},?\s+)?([a-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/i.exec(s))) return ok(+m[3], MON[m[1].toLowerCase()] || 0, +m[2]);
    if (/^\d{5}(\.\d+)?$/.test(s)) { const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(+s) * 864e5); return d.toISOString().slice(0, 10); }   // Excel's day number
    return '';
  }
  const STATUS = [[/^(done|closed?|complete[d]?|resolved|fixed|pass(ed)?|ok|delivered|implemented|yes)$/, 'Done'], [/^(cancel+ed|cancel|rejected|not required|not applicable|n ?a|dropped|duplicate|withdrawn|descoped)$/, 'Cancelled'],
    [/^(in ?progress|wip|ongoing|working|started|under development|in development|dev in progress)$/, 'In Progress'], [/^(blocked|on hold|hold|stuck|waiting)$/, 'Blocked'],
    [/(customer|client)/, 'Awaiting Customer'], [/^(in review|review|ready for (testing|retest|review)|retest|testing|verify|to verify|fixed ready)$/, 'In Review']];
  const statusOf = v => { const t = norm(v); const hit = STATUS.find(([re]) => re.test(t)); return hit ? hit[1] : 'To Do'; };   // open, new, pending, failed, empty: still to do
  const prioOf = v => { const t = norm(v); return /^(critical|blocker|showstopper|p0|s1|sev ?1|urgent)/.test(t) ? 'Critical' : /^(high|major|p1|s2|sev ?2|h)$|^high/.test(t) ? 'High' : /^(low|minor|trivial|cosmetic|p3|p4|s4|sev ?4|l)$|^low/.test(t) ? 'Low' : /^(medium|med|normal|moderate|p2|s3|sev ?3|m)$|^medium/.test(t) ? 'Medium' : ''; };
  const cell = (r, i) => (i == null ? '' : String(r[i] == null ? '' : r[i]).replace(/\s+/g, ' ').trim());
  /** rows: the sheet as arrays; hdr: the header row index; map: field -> column. Returns { tasks: [{ title, desc, owner, due, status, priority, module, row }], closed, empty }.
      Rows already closed in the tracker (done, cancelled) are counted, not imported, unless keepClosed. Extra columns go into the details, so nothing in a row is lost. */
  function toTasks(rows, hdr, map, opts) {
    opts = opts || {}; const head = rows[hdr] || [], used = new Set(Object.values(map)), out = { tasks: [], closed: 0, empty: 0 };
    rows.slice(hdr + 1).forEach((r, ix) => {
      r = r || []; const title = cell(r, map.title).slice(0, 300); if (!title) { if (r.some(c => String(c == null ? '' : c).trim())) out.empty++; return; }
      const status = map.status != null ? statusOf(cell(r, map.status)) : 'To Do'; if (!opts.keepClosed && (status === 'Done' || status === 'Cancelled')) { out.closed++; return; }
      const extra = head.map((h, i) => (used.has(i) || !cell(r, i) || !String(h || '').trim() ? '' : String(h).trim() + ': ' + cell(r, i))).filter(Boolean);
      out.tasks.push({ title, desc: [cell(r, map.desc)].concat(extra).filter(Boolean).join('\n').slice(0, 7000), owner: cell(r, map.owner).slice(0, 120), due: toDay(map.due == null ? '' : r[map.due]), status, priority: prioOf(cell(r, map.priority)), module: cell(r, map.module).slice(0, 120), row: hdr + 2 + ix });
    });
    out.tasks = out.tasks.slice(0, 500); return out;
  }
  const api = { FIELDS, suggestMap, findHeaderRow, toDay, statusOf, prioOf, toTasks, norm };
  root.FWBViews = root.FWBViews || {}; root.FWBViews.trackerLogic = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

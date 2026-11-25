/* Dashboard metrics: one definition per figure, so a number means the same on the staff, customer and Admin dashboards and in the reports.
   The definitions (meaning, calculation, source, date basis, who sees it, where it drills) are written up in docs/reference/DASHBOARD-METRICS.md.
   "today" is the person's own calendar day (V.today, local time). Overdue matches the server rule in work/server/_portfolio.mjs (min(due, ETA) < today). */
(function (root) {
  'use strict';
  const V = root.FWBViews;
  const TASK_CLOSED = ['Done', 'Cancelled'];
  const CLOSED = /^(done|closed|resolved|fixed|cancelled|complete|completed|signed|accepted)$/i;   // actions, RAID, change requests, hypercare: the same words everywhere
  const isClosed = x => CLOSED.test(String((x && x.status) || ''));
  const taskOpen = t => !!t && !TASK_CLOSED.includes(t.status);
  const taskDate = t => [t && t.due, t && t.eta].filter(Boolean).sort()[0] || '';   // the earlier of due and ETA
  const taskLate = (t, today) => taskOpen(t) && !!taskDate(t) && taskDate(t) < (today || V.today());
  const actionLate = (a, today) => !!a && !isClosed(a) && !!a.due && a.due < (today || V.today());
  const RUN = /^(not started|ready for testing|deferred|)$/i, PASS = /^(passed|approved)$/i;
  V.metrics = {
    isClosed, taskOpen, taskDate, taskLate, actionLate,
    /** overdue work: open tasks whose earlier date (due or ETA) has passed, and open actions past their due date */
    overdue: (tasks, actions, today) => ({ tasks: (tasks || []).filter(t => taskLate(t, today)), actions: (actions || []).filter(a => actionLate(a, today)) }),
    /** open risks and issues: RAID items not in a closed status */
    openRisks: raid => (raid || []).filter(x => !isClosed(x)),
    /** test pass rate: passed out of the cases that have been run (cases not yet run do not count as failures); null when nothing has run */
    passRate: tcs => { const all = tcs || [], run = all.filter(c => !RUN.test(String(c.status || ''))).length, passed = all.filter(c => PASS.test(String(c.status || ''))).length; return { passed, run, total: all.length, pct: run ? Math.round(100 * passed / run) : null }; }
  };
})(typeof window !== 'undefined' ? window : globalThis);

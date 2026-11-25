# Dashboard metrics (reference)

Every dashboard figure is defined once in `src/dashmetrics.js` (client) or `work/server/_portfolio.mjs` (server, Admin). "Today" is the person's own calendar day (`V.today()`, local time); the server works in UTC, so around midnight an Admin figure can lag a project figure by one day. Plan: `docs/plans/DASHBOARD-REBUILD-PLAN-2026-11-25.md`.

| Metric | Meaning | Calculation | Source records | Date basis | Status rules | Who sees it | Opens |
|---|---|---|---|---|---|---|---|
| Overdue (tasks) | Work that has passed its date | Open task whose earlier of due and ETA is before today | `task` items | min(due, ETA) | Open = not Done or Cancelled | Team | Tasks |
| Overdue (actions) | Promised actions past their date | Open action with due before today | `action` items | due | Closed = done, closed, resolved, fixed, cancelled, complete(d), signed, accepted | Team; the customer sees their own side | Governance › actions |
| Open risks and issues | Risk log still open | RAID items not in a closed status | `raid` items | none | Same closed words as actions | Team; customer only when "risks" is shared | Governance › RAID |
| Test pass rate | Quality of what has been tested | Passed ÷ cases run; empty when nothing has run | `utc` items | none | Passed = Passed or Approved; not run = Not started, Ready for testing, Deferred or blank | Team and customer | UAT |
| Test cases passed (progress) | How far testing has got | Passed ÷ all cases | `utc` items | none | as above | Team and customer | UAT |
| Plan done % | Progress against the plan | Duration-weighted share done (`planStats().actual`, `src/timeline.js`) | `plan_struct` rows | row start and end | Done rows count 100% | Team and customer | Plan |
| Schedule performance (SPI) | Ahead or behind plan | Plan done % ÷ planned % for today | `plan_struct` rows | today | none | Team and customer | Plan |
| Waiting on customers (Admin) | Projects held up by the customer | Projects whose server `custWaiting` > 0 | server assessment | none | Questions awaiting the customer, requested sign-offs, decisions proposed 7+ days, open "Customer Action Required" tasks | Admin | Admin › Customers |
| Project health (Admin) | One word per project | Server rules: manual status wins, else Blocked, Overdue, At risk, Insufficient data, On track | server assessment | today (UTC) | see `_portfolio.mjs` | Admin | the project |
| Admin period | Which projects the Admin dashboard counts | Projects whose last activity falls in the chosen period | `metrics.lastActivity` | last change on the project | Undated projects drop out while a period is set | Admin | — |

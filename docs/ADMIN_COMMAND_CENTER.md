# Admin Command Center (28 Oct 2026)

Admin › Dashboard now opens on a **Command center**: one page that says how the portfolio is doing, which projects need
attention, the evidence behind each warning, and a button that opens the record that needs fixing. Everything on it is
computed on the server from the stored records, by fixed rules written down below and shown in the app under
"How health is worked out".

Code: `work/server/_portfolio.mjs` (health rules, documentation readiness, workload; pure functions),
`work/server/api.mjs` (`command()`, `GET /api/admin/command`, `POST /api/admin/ai/briefing`, `GET /api/my/work`,
delivery status on `PATCH /api/projects/:id`), `src/command.js` (the page, the project drawer, the projects-home strip and
My work), `src/admin.js` (wiring), `src/theme.css` (styles).

## 1. Audit of the existing Admin Panel

| Area | What it showed | Verdict |
|---|---|---|
| Dashboard › Overview | KPI tiles, a health bar, stage distribution, weekly/monthly activity, storage by file type | Useful activity view, but its health was **misleading**: "Healthy / Needs attention / Stale / Live", where Stale meant only "no edit for a while" and Needs attention was a mix of a few counts. No reasons, no evidence, nothing about tasks, blockers, dates or the customer. |
| Dashboard › Delivery, Customers, Team & usage, Quality & records | stage funnel, sign-offs, customer engagement, people and usage, feedback and records | Useful, kept. They answer "what is happening", not "what is wrong". |
| Projects | every project with its insights | Useful; its filter chips used the old health words. |
| Users, Access, AI provider, Integrations, Activity | administration | Kept unchanged. |
| Missing | a portfolio view of blocked and late work, what the customer owes us, decisions waiting, sign-offs at risk, ownership gaps, documentation readiness, history | Added (below). |

## 2. What an administrator needs

Open the app and within a minute know: how many projects are in trouble and why; which ones need them today; what the
evidence is (which task, which question, which plan step); who owns it; what to do next; and a way to get to the record.
Then, less urgently: is the team overloaded, are documents ready for the next gate, and is it getting better or worse.

## 3. Widgets retained, modified, removed

| Widget | Change | Reason |
|---|---|---|
| Overview tab | kept, renamed **Activity overview**; its health bar and chips now use the new health | one health vocabulary in the whole console |
| Overview as the default tab | replaced by **Command center** | the first screen should answer "what needs attention" |
| Old health values (Healthy, Needs attention, Stale, Live) | **removed** everywhere (overview, projects list filters, project insights) | not explainable; Stale is now the evidence-backed "No activity for 14+ days" risk signal |
| Delivery, Customers, Team & usage, Quality & records, Projects, Users, Access, AI provider, Integrations, Activity | unchanged | still useful |

## 4. New widgets and insights

| Widget | What it shows | Clicks through to |
|---|---|---|
| Portfolio metrics (11 tiles) | projects, in progress, blocked, overdue, at risk, on track, insufficient data, waiting on customer, deadline in 14 days, on hold, completed | each tile filters the portfolio table |
| Health bar | active projects by health | each segment filters the table |
| Immediate attention | Critical and High signals, worst first, 8 shown (Show all): severity, **Confirmed issue** or **Potential risk**, project, since when, why it matters, recommended action, owner, the records | project drawer; each record button opens that task, action, RAID item, decision, CR, sign-off or plan |
| Project portfolio table | per project: plan step (of 12), health with its reasons, open tasks, overdue, waiting on customer, blockers, next milestone, target date, last activity; search, filters (health, plan step, customer), sortable columns | project drawer |
| Project drawer | health and every reason, key figures, all signals with records, documentation status, AI explanation of this project, delivery status (owners/admins) | records, project pages |
| Delivery intelligence | tabs: Risks and blockers; Customer and decisions; Documentation and quality (matrix: workshops, requirements, BRD, CRs, FTR, user guides, UAT, incomplete AI drafts). Filters by severity, project, owner | the page holding each document or record |
| Team and ownership | open work per owner (open, overdue, Critical/High, in review, projects), unassigned work per project, concentration of a project's critical work on one person | the project's Tasks |
| AI briefing | portfolio briefing with an optional focus; cites [P#] projects and [E#] evidence, labels Fact or Inference | — (read-only) |
| Trends | health over time (from snapshots), tasks created vs completed by week, customer question turnaround, recorded activity by week | — |
| How health is worked out | the rules and thresholds in plain words | — |
| Projects home (admins) | **Portfolio health** strip: blocked/overdue/at risk/on track and the top critical signals | Command center filtered, or the record |
| Projects home (everyone) | **My work**: tasks I own and customer questions I must answer, across my projects, overdue and blocked first | the task |

## 5. Data sources and calculations

All figures come from one server pass over the stored data (`loadAll()`): projects and members, the plan
(`plan`, `plan_struct`), portal controls (forced phase), BRD document and sign-offs, workshop planner, requirements, and items
of kinds task, action, raid, decision, cr, signoff, uat, hc, ai drafts and user guides, plus the audit log for activity.
Nothing is hard-coded and nothing is sampled.

| Metric | Calculation |
|---|---|
| Projects / archived | count of projects; archived ones are excluded from everything else |
| In progress, on hold, completed | the delivery status a person set (default Active) |
| Blocked / overdue / at risk / on track / insufficient | health of active projects (section 6) |
| Waiting on customer | customer questions in Awaiting Customer + open customer-side actions + tasks of type Customer Action Required, per active project |
| Deadline in 14 days | active projects whose next dated milestone, go-live or end date is within 14 days |
| Plan step | the Plan Timeline's 12 standard steps, from dated plan rows, or the phase forced on that page. No percentage is shown: plans do not record effort |
| Next milestone, target date | next dated plan row not done; target = go-live plan row, else the project end date (labelled which) |
| Open / overdue tasks | tasks not Done/Cancelled; overdue = earliest of due and ETA before today |
| Last activity | latest audit entry or record update |
| Workload | open tasks per owner across active projects; concentration = one person holds 60%+ of a project's open Critical/High work (3+ items) |
| Question turnaround | median days from creation to answer for customer questions answered in the last 90 days |

Dates are compared as calendar days (UTC). Tasks are counted once, by id; a task linked to an action is counted as the task.

## 6. Health rules and risk indicators

A rule-based status, not a score. The app does not compute a numeric health score: the records do not hold effort,
budget or completion percentages, so a number would be invented precision. Each project gets one status with its reasons:

1. **Delivery status set by a person** (On hold, Completed, Cancelled) is shown as set, with who set it and when. The rules never change it; its signals stay available in the project drawer, and the project leaves the attention lists.
2. **Blocked**: a blocker signal on Critical/High work, on work blocked for 14+ days, or with 3+ blocked items.
3. **Overdue**: a plan step recorded as not done after its end date, the end date passed without go-live acceptance, or 3+ overdue Critical/High tasks.
4. **At risk**: any other Critical or High signal, or two or more Medium signals.
5. **Insufficient data**: none of the above, and no dated plan, no tasks, no actions and no RAID items to judge by.
6. **On track**: none of the above; the reason says "No warning found in the plan, tasks, actions, RAID, decisions, change requests or sign-offs" (or lists the one minor signal).

| Signal (code) | Kind | Severity | Rule |
|---|---|---|---|
| Plan step late (`milestone_late`) | issue | High | plan row with a status other than Done after its end date; rows without a status say nothing |
| End date passed (`end_passed`) | issue | High | project end date before today, go-live acceptance not recorded |
| Go-live soon (`golive_soon`) | risk | High | go-live within 21 days with BRD or UAT sign-off outstanding (names which) |
| Overdue Critical/High tasks (`task_overdue_hp`) | issue | Critical if any is Critical, else High | earliest of due/ETA before today; blocked tasks excluded |
| Other overdue tasks (`task_overdue`) | issue | Medium | same, other priorities |
| Blockers (`blocker`) | issue | Critical on Critical/High or 14+ day blockers or 3+ items, else High | task Blocked or a blocker recorded; governance actions Blocked |
| Unassigned important work (`unassigned`) | issue | High | open Critical/High task without an owner |
| Questions waiting for us (`q_internal`) | issue | Medium, High after 14 days | customer question not yet answered by us for 7+ days |
| Questions waiting for the customer (`q_customer`) | issue | Medium | Awaiting Customer for 7+ days |
| Customer actions late (`customer_late`) | issue | High | customer-side action or Customer Action Required task past its date |
| Decisions pending (`decision_pending`) | issue | Medium | decision Proposed for 7+ days |
| Sign-off concern (`signoff_concern`) | issue | High | the customer recorded a concern on a sign-off |
| Change requests waiting (`cr_waiting`) | issue | Medium | CR awaiting assessment or approval for 14+ days |
| RAID issues / risks (`raid_issue`, `raid_risk`) | issue / risk | High | open high-impact RAID items |
| Hypercare (`hypercare`) | issue | Critical if any Critical, else High | open Critical/High hypercare issues |
| BRD sign-off late (`brd_late`) | issue | High | the BRD sign-off plan step date passed and no approval is recorded |
| Incomplete AI drafts (`doc_incomplete`) | issue | Medium | generated documents with sections that were not written |
| No activity (`idle`) | risk | Medium | nothing recorded for 14+ days |

Thresholds live in one place (`RULES` in `_portfolio.mjs`). Related facts are not double-counted: a blocked task feeds only the blocker signal even when it is past its date (the
table's overdue count still includes it), each signal groups its records, and the reasons list each signal once.
Confirmed issues (a fact in the records) are distinguished from potential risks (a condition that may become a problem).

## 7. Administrator and team-member experiences

- Admins (super, admin, sub-admin) land on the projects home with the **Portfolio health** strip above their projects, and the Admin console opens on the Command center.
- Team members see **My work** on the projects home and nothing about other projects. `GET /api/my/work` decides on the server which projects count (projects where they are a non-customer member).
- Customers see neither.
- The delivery status is set only by a project owner or an admin (not a sub-admin), with an optional note, and is written to the audit log.

## 8. AI insights

`POST /api/admin/ai/briefing` goes through the shared AI service (`assist` operation; DeepSeek by default, Claude when
configured and routed — see `docs/AI_ARCHITECTURE.md`). The prompt holds only the computed evidence: each project's health
and reasons as [P#], each signal with its records as [E#], and health history only when two or more daily snapshots exist.
The model is told to use only that evidence, cite it, label statements Fact or Inference, and not invent dates, people or
numbers. A per-project explanation uses the same route. The briefing is read-only: it never changes records, assigns work,
changes statuses or sends anything; the result shows the provider and model and can be copied.

## 9. Permissions and security

| Check | Result |
|---|---|
| `GET /api/admin/command`, `POST /api/admin/ai/briefing` | admin roles only (`requireAdmin('sub')`), 403 otherwise — tested |
| Delivery status | `PATCH /api/projects/:id` with `deliveryStatus` requires project owner (admins act through their owner access); editors and sub-admins get 403 — tested |
| My work | server-side member filter; a member sees only their own tasks — tested |
| UI | the strip and the status control are hidden for those without access, but the server enforces it regardless |
| AI | no keys or secrets in prompts or responses; briefing rate-limited with the other AI routes; audited (`admin-briefing`) |
| Data shown | names and emails of colleagues only; no customer secrets; CSP: no violations in the browser runs |

## 10. History and trends

Only stored history is used. The app had no history of health, so from this release the command center saves one
**daily snapshot** of each active project's health (collection `hsnap`, written on the first load of the day). The health
chart starts from that day and says so; nothing before it is reconstructed. Tasks created/completed per week come from task
timestamps (`createdAt`, `completedAt`), question turnaround from answered questions, activity from the audit log.

Gaps (not shown, because the data is not stored): overdue-task and blocker trends before snapshots began, blocker
resolution time (no "unblocked at" timestamp), CR backlog over time, UAT defect trends, milestone slippage (plan edits are
not versioned with dates). Minimum tracking to add: extend the daily snapshot with per-project counts (open, overdue,
blocked tasks; open CRs; open UAT defects; next milestone date) — a few hundred bytes per project per day.

## 11. Tests and actual results

| Suite | Covers | Result |
|---|---|---|
| `tests/portfolio.mjs` (new) | every health rule on projects in known states: on track, insufficient, blocked, long-standing blocker, late plan step, end date passed, overdue tasks, no double counting of blocked overdue work, customer questions both ways, medium signals, go-live soon, idle, manual status, unassigned and late customer work, BRD late, ordering and evidence, documentation readiness, workload, plan steps | 21/21 |
| `tests/work_adapter.mjs` | all routes on a mocked platform, incl. command center blocks, briefing access, delivery status rules | 39/39 |
| `tests/ui/command-check.mjs` (new) | in a browser: health from records, evidence and owner, insufficient data, no invented history, home strip and My work, metric filters, search, project drawer, setting On hold (saved, audited, wins over rules), evidence opens the task, AI briefing from evidence and read-only, member 403 on admin routes and status, member sees only own work, sub-admin reads but cannot set status, no page errors | 25/25 |
| `tests/ai_layer.mjs`, `tests/guide_intel.mjs` | unchanged areas | 10/10, 10/10 |
| UI regression: smoke, welcome, Tabs & Layouts, Tasks, exports | | 19/19, 14/14, 30/30, 40/40, 26/26 |
| Layout audit (`tests/ui/audit.mjs`, desktop and mobile, incl. admin screens) | | 385 screens, 0 findings |
| CSP watch on the command center and tasks runs | | no violations |
| Large portfolio (local preview, 150 projects × 20 tasks, 450 signals) | `/api/admin/command` 87–137 ms server-side; admin opens to a rendered table in ~0.45 s; a filter click ~0.27 s; response ~0.5 MB | measured |
| Empty portfolio | all metrics 0, empty states shown | measured |

Not verified: the AI briefing against the real DeepSeek or Claude models (local runs use a stand-in), and timings on the
real platform (the admin data load reads every project; the cache holds it for 15 s per server instance, and the Refresh
button reloads it).

## 12. Known limitations and next steps

- Health is rule-based; thresholds are fixed in code (`RULES`). Next: let admins tune them in Admin settings.
- The 15 s admin cache can show data up to 15 s old; Refresh reloads it.
- The response grows with the portfolio (~3 KB per project); beyond a few hundred projects, page the table and send signals on demand.
- Trends are only as long as the snapshots; see section 10 for the snapshot fields to add.
- Effort, budget and percent-complete are not recorded, so no completion percentage or numeric score is shown.

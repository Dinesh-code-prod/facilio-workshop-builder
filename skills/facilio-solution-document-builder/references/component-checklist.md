# Component Checklist — Go Through Every Item

Work through this list in order. For each component type: read the index the extractor wrote (or
`raw/<TYPE>.json` when there is no index), answer every question, and write down where the answer lands in the
document. Tick the type off in `COVERAGE.md` only when every record has been either used or consciously left out.

Rule for every type: **enabled vs disabled first**. Disabled flows, transitions, rules, buttons and notifications
are never described as available. Mention them only where it helps the reader (e.g. "An alternative flow
exists but is inactive").

---

## A. Modules and scope

### MODULE (`raw/MODULE.json`, `modules_in_use.json`)
- Which modules have evidence of use (menu tab, custom fields, custom state flow, rules, notifications,
  approvals, buttons, dashboards, reports)? The extractor lists the evidence.
- Which are custom modules? What business object does each represent (read its fields and forms)?
- Is the module a main process (gets its own section) or a supporting lookup (category list, mapping,
  master data — described briefly inside the module it supports)?
- Platform / system modules (agents, BMS points, AI prompt gallery, background activity, base mail
  message, etc.) with only seed setup → leave out with reason "platform module, no client process".
- Lands in: Introduction → Modules in Scope; one Heading 1 per main module; left-out list in the summary.

### APP, WEBTAB, WEBTAB_GROUP (`apps.json`, `webtabs.json`, `webtab_groups.json`)
- Which apps / portals are enabled (main app, technician mobile, tenant / occupant / vendor / client portals)?
- Which tabs are in each app's menu, under which group, in what order? `in_menu = false` → the tab exists but
  users cannot reach it from the menu. Say so in Limitations if it matters (e.g. a purchase tab outside the menu).
- Which modules are exposed in portals (a portal user can raise or view them)?
- Lands in: Introduction (applications in scope), each module's Use Case (who uses it, where), Limitations,
  Role Matrix – Module Access.

---

## B. Data model and forms

### FIELD (`fields.json`)
- For each main module: every custom field, plus the system fields that appear on the main-app form.
- Type (decoding table §3), required flag, lookup target module, picklist values, default value.
- Fields that drive logic (used in criteria, scripts, approvals, SLA) — mark these for the decision matrix.
- Lands in: Field List; Key Terms (for classification fields); Decision Matrix.

### FORM, FORM_SECTION, FORM_FIELDS (`forms.json`)
- Which forms exist per module and app (web main app, mobile, portal, transition forms, approval forms)?
- Which form is the default create form? Its sections become Field List sub-header rows, in form order.
- Required (mandatory) on the form → red field name in the Field List.
- Hidden fields with defaults → explain the automatic value in the description.
- Portal forms → note which fields a requester fills in.
- Transition / approval forms (forms attached to a status change) → list their fields in State Flow Details
  ("Conditions / Inputs").
- Lands in: Field List, State Flow Details, Provided Solution.

### FORM_RULE (`form_rules.json`)
- What each rule does in plain words: "When Scope is Single Asset, the Space/Asset and Site fields are shown
  and the category fields are hidden."
- Mandatory / read-only / set value / filter rules matter most for users. Group them by form.
- Execute-script actions → read the script and state the outcome.
- Lands in: Provided Solution (form behaviour), Field List descriptions.

### TICKET_STATUS (`statuses.json`)
- Display name for every internal status. Always use the display name, in quotes.
- Note statuses with no transitions in or out (dead statuses) → Limitations or `[To be confirmed]`.

### Master data (`masters.json`): TICKET_CATEGORY, TICKET_PRIORITY, TICKET_TYPE, SERVICE_REQUEST_PRIORITY,
SPACE_CATEGORY, ASSET_CATEGORY, PM_FREQUENCY, WORK_PERMIT_TYPE (+ checklists), TEAM, VENDOR, SERVICE_CATALOG_ITEM/GROUP,
INSPECTION_PRIORITY, ITEM_STATUS, TOOL_STATUS, UTILITY_TYPE, TAX and others
- List the real values (exclude obvious test data such as "test", "abc", "wdwdw"; list excluded items in the
  summary so the client can clean them up).
- Categories and priorities → Field List descriptions and Key Terms.
- Space categories with a common-area flag → classification logic (common area vs unit).
- Asset categories → count custom ones; name the main families.
- PM frequencies → Planned Maintenance section.
- Teams → User Roles & Responsibilities and assignment logic.
- Service catalog items → the request types users can raise.
- Work permit types → Work Permit section (default-only setup → leave out).

---

## C. Process logic

### STATE_FLOW (`stateflows.json`)
- How many flows per module? Which is the default (`default = true`)? Which are enabled?
- Entry criteria and execution order: which records go into which flow (e.g. planned vs reactive, by type,
  by category, by site). Write as "Records where ... follow the <name> flow."
- Initial status of each flow.
- Inactive flows → one sentence: "An alternative flow '<name>' exists but is inactive." Never describe its
  steps as live. If business logic (e.g. a decision rule) lives only in an inactive flow, flag it in
  Limitations and as `[To be confirmed]`.

### STATE_TRANSITION (`transitions.json`)
For EVERY enabled transition of every flow in scope, capture:
- Action name (button label), From status, To status (display names)
- Type (decoding table §2): user / automatic / scheduled / scheduled on date field, with the interval in words
- Performed By: roles, users (as roles), field-based permission (§7)
- Criteria: when the button is visible / when the automatic step fires (decode operators and IDs)
- Inputs: transition form fields, comment required, attachments, signature
- Field updates and scripts: what changes automatically (read scripts and called functions)
- Portal visibility, email-link (permalink) execution, confirmation message
- Lands in: State Flow Details table (one row per transition), Process Flow diagram, Provided Solution.

Checks: every status reachable? Any status with no exit? Two transitions with the same name from the same
status (criteria split them — explain the split). Automatic transitions that loop?

### APPROVAL_STATE_FLOW (`approvals.json`)
- Criteria (which records need approval), approvers (roles / users / field-based), all-must-approve vs any-one,
  approval form fields, status after approve, status after reject, field updates and scripts on each outcome.
- Several approval rules on one module → order them and show the routing as a table:
  `Condition | Approver(s) | On Approve | On Reject`.
- Disabled approval rules → leave out of the routing table; mention only if they explain a difference
  from the BRD.
- Lands in: Approval Routing Criteria table, State Flow Details, Decision Matrix, User Roles.

### WORKFLOW_RULE (`workflow_rules.json`)
- Module, event (decoding table §6), field-change trigger field, schedule, criteria.
- Actions: field updates, emails / notifications, record creation, status change, script.
- Read the FULL script and every FUNCTION it calls. Describe the real outcome ("creates a quotation linked to
  the work order and copies the line items"), not the mechanics.
- Rules that only keep data in sync (no user-visible effect) → still list them briefly in Workflows &
  Automations, or leave out with reason "internal data sync".
- Two rules updating the same field → check order and criteria; conflict → `[To be confirmed]`.
- Lands in: Workflows & Automations table (`Workflow | Trigger | Condition | What It Does`), Decision Matrix.

### FUNCTION (`functions.json`)
- Which rules, transitions, buttons and form rules call it? (search the scripts for the function name)
- What does it read, calculate, create or update? Which other modules does it touch? → cross-module chains.
- External calls (HTTP / connectors / ERP) → Integrations, with the system named in business terms.
- Unused functions → leave out with reason "not called by any active rule".

### CUSTOM_BUTTON (`buttons.json`)
- Enabled? Position (list / summary / more menu), criteria (when visible), roles, action (open form, update
  fields, run script, create record, redirect, connected app).
- Disabled buttons are NOT available. Do not describe them as features. If the BRD expects that feature, add
  a Limitations line and a `[To be confirmed]`.
- Lands in: Provided Solution, State Flow Details (if it changes status), Limitations.

### SLA_POLICY, SLA_ENTITY (`sla.json`)
- Which module, which records (criteria), targets per priority (response / resolution), start and stop
  statuses, pause statuses, business hours, escalation levels (time, who, what changes).
- Lands in: SLA & Notifications → SLA table; module sections that are SLA-driven.

### NOTIFICATION, EMAIL_TEMPLATE (`notifications.json`, `email_templates.json`)
- Module, event, criteria, channels (email / push / SMS / in-app), recipients (decode hints: assigned user,
  requester, approvers, roles, specific emails → name the role), schedule (reminders).
- Email template subject in plain words, key placeholders (what information the email carries).
- Disabled notifications → separate list "Configured but switched off".
- Lands in: SLA & Notifications → Notification table `Module | Notification | Trigger / Condition | Recipients`.

---

## D. Access and reporting

### ROLE, PERMISSION_SET, USER_SCOPING, TEAM (`roles.json`)
- Every role: app access, tab permissions (decode bits, decoding table §5), dashboard and analytics rights,
  privileged / admin flag.
- Which roles appear as approvers or performers in flows → User Roles & Responsibilities.
- Scoping (site / building restrictions) where present.
- Test or unused roles (no app, no permissions) → leave out with reason.
- Lands in: User Roles & Responsibilities, Role Matrix – Module Access, Role Matrix – Dashboards and Reports.

### DASHBOARD, DASHBOARD_FOLDER, DASHBOARD_WIDGET (`dashboards.json`)
- Name, folder, tabs, mobile visibility, shared with (roles / users / everyone), main widgets (KPIs shown).
- Lands in: Reports and Dashboards; Role Matrix – Dashboards and Reports.

### REPORT, REPORT_FOLDER (`reports.json`, `report_folders.json`)
- Reports per folder; hidden or default folders; test folders → exclude and list in summary.
- Lands in: Reports and Dashboards (reports-by-folder table).

---

## E. Extensions and integrations

### CONNECTED_APP, CONNECTED_APP_WIDGETS
- What each app / widget does for the user (print layout, PDF template, public form, QR code, custom screen),
  where it appears (record summary, list, settings), which module.
- Lands in: Provided Solution of the related module; Integrations.

### Scripts calling external systems (ERP, accounting, HR, IoT)
- Which records are sent or received, when, and what status changes depend on the external system
  (e.g. purchase order created in the ERP, goods receipt posted back).
- Lands in: the module section, an "Integrations" Heading 2 or closing section, Limitations (dependencies).

### GLOBAL_VARIABLE, NAMED_CRITERIA, RELATIONSHIP, TRIGGER, VIEW, PAGE_LAYOUT, APP_LAYOUT, HOME_PAGE
- Supporting detail. Read when a rule or script references them. Relationships explain linked records shown
  on a record page. Views and layouts are only mentioned when they change what a user sees.

---

## F. Declared but not exported
`COVERAGE.md` lists component types declared in `PackageConf.xml` with no XML file. These are usually empty or
system types. If one matters to the document (e.g. VIEW, RELATIONSHIP, PERMISSION_SET), confirm with the live
org via the Facilio MCP, or mark the dependent statement `[To be confirmed]`.

---

## G. Cross-cutting analysis (after all types are read)

1. **Classification logic**: find every field used in criteria of approvals, transitions, rules and SLAs.
   For each: how is the value set (user, form rule, workflow rule, script, lookup default)? What does each value
   change (approver, flow, charges, SLA, available actions)? → Decision Matrix table
   `Condition | Value | Effect | Set by`.
2. **Cross-module chains**: follow every "create record", lookup and script that creates or updates another
   module. Draw the end-to-end chain (e.g. request → work order → quotation → material request → issue →
   purchase request → purchase order → receipt → stock). Note who acts at each hand-off and which status
   triggers it. Gaps usually sit between modules.
3. **Live path**: where two flows, buttons or rules do the same job, state which one is live and which record
   is really created.
4. **Status impact**: when module A's status changes because of module B (e.g. work order moves when its
   quotation is approved), show it in both sections.
5. **Conflicts and dead ends**: conflicting rules, statuses with no exit, buttons with criteria that can never
   be true, notifications whose recipients are empty → Limitations or `[To be confirmed]`.
6. **BRD traceability** (when a BRD is available): see `user-inputs.md`.

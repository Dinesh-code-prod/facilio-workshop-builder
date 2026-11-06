# Stage 3 hierarchy: what must exist, in what order, to get the right BRD (6 Nov 2026)

User direction: find the exact hierarchy of stage 3 so the BRD comes out right and complete. This is the information architecture. Every BRD section must be produced from a node of this tree, filtered by scope, and every node must say where it came from and whether a person has confirmed it.

## The tree

```
PROJECT  (customer, contract, version, approvers)
│
├─ 1. SCOPE                                   source: contract (MSA) + sessions, confirmed by a person
│   ├─ Applications in scope                  Maintenance, FSM, Tenant portal, Vendor portal, ... (Facilio apps)
│   └─ Modules in scope                       System module | Custom module | Proposed module
│       (everything below hangs from a module; a module not in scope has no section anywhere)
│
├─ 2. SOLUTION PER MODULE                     one block per module in scope, always in this order
│   ├─ 2.1 Purpose and requirements           purpose, objective; REQ items (title, objective, rules, approvals, exceptions,
│   │                                         classification: standard | existing | change | custom | confirm; status Draft | Confirmed)
│   ├─ 2.2 Data
│   │   ├─ Fields                             system | custom | proposed; type, required, options, lookup, validation
│   │   ├─ Forms                              per form: sections > fields (required, hidden, default, span); form rules
│   │   └─ Related modules                    lookups in and out
│   ├─ 2.3 Process
│   │   └─ State flows                        per flow: states > transitions
│   │       └─ per transition                 who may do it (roles), criteria, validations, comment required, form shown,
│   │                                         what it does (field updates, notifications, workflow), approval, shown in portal
│   ├─ 2.4 Actions
│   │   ├─ Buttons and custom actions         per module: label, where, who, what it does, connected app it opens
│   │   ├─ Automations                        workflow rules, scheduled jobs
│   │   └─ Actions across modules             service request > work order > inventory (combined flows)
│   ├─ 2.5 Communication
│   │   └─ Notifications                      trigger, channel, recipients, template, status
│   ├─ 2.6 Time
│   │   └─ SLA                                policy, criteria, commitments, escalation
│   ├─ 2.7 Access
│   │   ├─ Roles and permissions on this module   per role: create, view, update, delete, other actions, tab access
│   │   └─ Portal access                      which portal sees it, which transitions are shown
│   ├─ 2.8 Extensions
│   │   ├─ Connected apps                     name, opens from, purpose, what it shows, users, built in Vibe
│   │   └─ Reports and dashboards             what is shown to whom
│   └─ 2.9 Open points                        open questions, assumptions, out of scope, risks
│
├─ 3. PROJECT-WIDE (built only from section 2, never from the whole package)
│   ├─ Roles and actors                       only roles that appear in a flow, a permission or a notification of a module in scope
│   ├─ End-to-end processes                   chains across modules (the combined flows)
│   ├─ Location hierarchy                     only when a location module (Site, Building, Floor, Space) is in scope
│   ├─ Portals                                only portals that reach a module in scope
│   ├─ Integrations and interfaces            only for modules in scope that an integration touches
│   ├─ Agents and operating model             only when agents are in scope
│   ├─ Customer-specific use cases            from the sessions, each linked to modules and requirements
│   └─ Data migration and go-live inputs      what the customer must provide
│
└─ 4. TRACE AND CONTROL
    ├─ Traceability                           requirement > module > field / transition / form > test (later UAT)
    ├─ Changes against the standard           what is new for this customer, in one list
    ├─ Open questions to confirm
    ├─ Validation and checks                  contract against sessions, sessions against BRD, BRD against contract
    └─ Review, version and approval           six-part checklist, version history, approvers
```

## Facts every node carries (without this the BRD cannot be trusted)
- **Origin:** standard (Facilio default) | changed (differs from standard) | new (customer specific).
- **Source:** the contract page or the session and quote it rests on.
- **Status:** proposed | applied | confirmed | dismissed, with who and when.
- **Owner:** the teammate responsible (so teammates can split BRD work and change anything).

## What each BRD section reads (and the scope rule)
| BRD section | Reads | Scope rule |
|---|---|---|
| Document control, project information | Project | n/a |
| Introduction, modules in scope | 1 Scope, project background and objectives | scope list only |
| User roles and responsibilities | 3 Roles and actors | only roles used by a module in scope (today: every role of the package) |
| Module sections | 2.1 to 2.9 per module | only modules in scope; standard behaviour in one paragraph, then only what is agreed or changed |
| End-to-end processes | 3 End-to-end, 2.4 across modules | chains whose modules are all in scope |
| Customer-specific use cases | 3 Use cases | linked to modules in scope |
| Portal and cross-module mapping | 2.7 Portal access | portals reaching a module in scope (today: every portal) |
| Integration scope | 3 Integrations | only touched modules |
| Operating model: agents | 3 Agents | only if agents are in scope |
| SLA and notifications | 2.5, 2.6 | modules in scope |
| Role matrix | 2.7 Roles and permissions | roles used by a module in scope (today: all roles) |
| Portfolio hierarchy and dependencies | 3 Location hierarchy | only when a location module is in scope (today: always) |
| Traceability, changes, questions | 4 | in scope only |
| Validation, configuration source (appendices) | 4 | off by default |

## What already exists in Studio and what is missing
- **Exists (workshop document):** modules and custom modules, field changes, form changes, state flows, cross-module actions, roles and permission changes, notifications, processes, requirements, questions, connected apps (as applied proposals), BRD edits.
- **Read-only from the package, no place for what was agreed:** buttons and custom actions, automations (workflow rules), SLA, form rules, reports and dashboards, integrations, portal access. These need agreed records (with origin, source, status) before the BRD can show agreed content instead of the package.
- **Scope:** modules matched from the contract, plus manual toggles; there is no explicit "confirmed by a person" step and no applications level.
- **Provenance:** requirements and proposals carry a quote and source; fields, forms, flows and notifications entered by hand do not.

## Order of work
1. Scope confirmed (1) and every BRD section filtered by it (table above). Smallest change, biggest visible fix.
2. Per-module completeness board (shows which of 2.1 to 2.9 exist for each module).
3. Agreed records for 2.4 buttons, 2.5 notifications, 2.6 SLA, 2.7 permissions: Claude proposes from the sessions, a person applies; origin, source and status on each.
4. New BRD module section: standard paragraph, then agreed or changed items only.
5. Project-wide sections built from section 2 only.
6. Traceability and validation from the same data; mockup reads the same tree.

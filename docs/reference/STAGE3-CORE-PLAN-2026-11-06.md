# Stage 3 core plan: scope, solution, BRD (6 Nov 2026, user direction)

The user's direction: the third tab is the core of the project. Only from here can the team show what the client accepted and what solution was given: forms, fields, notifications, roles and permissions, all perfectly kept. The BRD must be powered by that, in the Facilio way, and teammates must be able to change anything in it. The mockup comes after. The BRD still looks like the old format, and it shows many things outside the modules in scope.

## What is wrong today (found in the code, 6 Nov 2026)
1. The BRD generator (`src/brd.js`, 20 sections) was built to ANALYSE an organisation package: it reads the whole configuration (the reference org by default, or a customer package) and describes it. It is not driven by what this customer asked for.
2. Module scope is applied to the module sections, flows, SLA and notifications, but NOT to: Roles (every role of the package), Role matrix (every role against the scoped modules), Portfolio hierarchy (the whole hierarchy), Portals (every portal), Configuration source and Validation appendices. This is why "so many things appear" even with few modules in scope.
3. What the team agrees (confirmed requirements, applied flows, fields, forms, connected apps) is only a part of the document. Standard Facilio behaviour and the agreed change are mixed, so nobody can see what is NEW for this customer.
4. Notifications, roles and permissions, buttons and SLA are shown in the BRD from the package, but there is nowhere that records what was AGREED for this customer, so Claude cannot propose them and a person cannot confirm them.
5. The team cannot see where the project stands in the tab: nothing says which modules are complete and which are missing a flow, forms, notifications or roles.

## The model (one chain)
Scope (modules in scope, confirmed) → Solution per module (requirements, forms and fields, state flow, buttons and actions, notifications, roles and permissions, connected apps) → BRD generated ONLY from the solution of the modules in scope → team edits → review and approval → mockup from the same solution.

## The stages the tab should show (in this order)
- 3.1 Scope: the modules in scope, from the contract and the sessions, confirmed by a person. Everything else follows this list.
- 3.2 Solution, one module at a time, with a completeness check per module: requirements confirmed, forms and fields, state flow, notifications, roles and permissions, connected apps.
- 3.3 BRD draft: generated from 3.1 and 3.2. Each module section says what is standard and lists what is agreed or changed.
- 3.4 Review and approve (the six-part checklist already built).
- 3.5 Mockup (Meteor) from the same solution.

## Build order (each step: tests, one commit, deploy; nothing starts until the user agrees)
1. Scope-correct BRD (quick, small): roles, role matrix, portfolio, portals, integration and the appendices only show what the modules in scope use; the appendices are off by default and can be switched on. Test with a project that has two modules in scope.
2. Solution status board on the Mockup and BRD menu group: per module in scope, which parts exist and which are missing. This answers "what stage are we in".
3. Record what was agreed for notifications, roles and permissions, buttons and SLA: new proposal kinds (Claude proposes from the sessions, a person applies), stored in the same workshop document the existing Roles and Notifications tabs use, so the BRD tables read them.
4. BRD format: each module section = standard behaviour in one short paragraph + a table of what is agreed or changed (requirements, state flow changes, custom fields, forms, notifications, roles, connected apps). Unchanged standard items are not listed. Old record-capture tables are removed from the default view.
5. Editing: every block stays editable by clicking it (exists); add a visible Edit mode and a "regenerate but keep my edits" button with the existing stale-block warning.
6. Mockup reads the same solution (done for flows, fields, forms, connected apps; add notifications and roles).

## Open questions for the user
- Is the list of modules in scope the contract's modules only, or also what the sessions add? (Suggested: both, confirmed by a person in 3.1.)
- Should the BRD for a customer ever describe the full standard configuration (the old format)? (Suggested: no, only as an optional appendix.)
- Who may change the scope list? (Suggested: any editor; the owner approves the BRD.)

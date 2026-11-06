# Stage 3, Mockup and BRD: the plan (6 Nov 2026, user direction)

Rule for everything below: Claude PROPOSES, a person reviews and applies (same as stages 1 and 2). Nothing Claude writes becomes part of the BRD or the design until a person applies it.

## What the user asked for
- Third tab (Mockup and BRD) is built first. The fourth tab (UAT guide and FTR, with Comet) waits.
- Keep the tabs that already exist: System modules and form builder (forms and field lists), State flow builder, BRD draft. Claude fills forms, fields and flows first; a person steps in only where something has to change.
- The Process whiteboard belongs in Requirement sessions (stage 2): every flow is saved from there. If a module is in scope and its flow was not discussed, the default (standard) state flow is saved. If a session changed a flow, the changed flow is saved. A flow that crosses modules (for example service request, work order, inventory) is saved as a combined flow.
- Claude extracts and captures all of this exactly, because the mockup (Meteor) and the BRD are produced from it.

## Where the data already is (workshop document, S.ws)
modules (forms and fields), flows (state flows per module), crossLinks (combined flows), requirements, processes, brd. Existing screens: src/module.js, src/flowbuilder.js, src/whiteboard.js, src/brd.js and src/brdview.js.

## Build order (each step: tests, one commit, deploy)
1. DONE 6 Nov: Process whiteboard moved into Requirement sessions; System modules and forms, State flows and BRD draft are shown in the menu.
2. Design proposals document (team only, `design_proposals`): Claude saves proposals for flows, combined flows, forms and fields through an existing connector tool (new action on `session_questions`, no new tool: the cap is 40, we use 39). Each proposal says what it changes, why, and which transcript quote or contract page it rests on.
3. Review screen on the whiteboard and module tabs: open proposals with Apply and Dismiss; Apply merges into the workshop document and records who applied it. Default state flows are proposed for every in-scope module that has none.
4. Jobs (stage "design"): `capture_flows` (from findings, transcripts, kick-off scope), `fill_forms` (forms and field lists per module), `draft_brd` (BRD sections from applied requirements, flows and fields). Each carries the job rules of stages 1 and 2 (allowed documents, progress notes, questions).
5. Mockup tab: a spec built only from applied flows and forms, handed to Meteor (prototype from the CMMS Demo Kit); Comet comes with stage 4.
6. Review checklist before the BRD is approved (as in stage 1).

## Not decided yet / to check
- Meteor hand-off format (how the build spec reaches Meteor). Check Meteor's own page before building step 5.
- Which fields of a form Claude may fill without asking (all, or only those named in the contract or a session).
- Not tested anywhere: a real Claude run for any step above.

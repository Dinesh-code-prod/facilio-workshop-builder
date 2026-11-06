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
2. DONE 6 Nov (flows and cross-module flows only): Design proposals document (team only, `design_proposals`): Claude saves proposals for flows, combined flows, forms and fields through an existing connector tool (new action on `session_questions`, no new tool: the cap is 40, we use 39). Each proposal says what it changes, why, and which transcript quote or contract page it rests on.
3. DONE 6 Nov (flows only): Review screen on the whiteboard and module tabs: open proposals with Apply and Dismiss; Apply merges into the workshop document and records who applied it. Default state flows are proposed for every in-scope module that has none.
4. Jobs: `capture_flows` is DONE (stage requirements). `fill_forms` is DONE (custom fields and forms as proposals). Still to do: `draft_brd` (BRD sections from applied requirements, flows and fields). Each carries the job rules of stages 1 and 2 (allowed documents, progress notes, questions).
5. Mockup tab: a spec built only from applied flows and forms, handed to Meteor (prototype from the CMMS Demo Kit); Comet comes with stage 4.
6. Review checklist before the BRD is approved (as in stage 1).

## Not decided yet / to check
- Meteor hand-off format (how the build spec reaches Meteor). Check Meteor's own page before building step 5.
- Which fields of a form Claude may fill without asking (all, or only those named in the contract or a session).
- Not tested anywhere: a real Claude run for any step above.

## Added 6 Nov 2026 (user): form builder changes by Claude, custom buttons, connected apps (not built)
- The System modules and Form builder tab stays (internal only, never shown to customers). Claude should be able to change forms and fields there and the change must show in the BRD and the process diagram. Today Claude proposes custom fields and forms (done); custom buttons are not covered yet.
- Connected or custom apps: a customer may ask, for one flow, for a special view (for example a multi-technician view when someone clicks Assign, shown as a connected app). Capture each as a proposal (module, state or button that opens it, what the app shows, who uses it, why) that flows into the BRD and the mockup. Facilio builds connected apps in Vibe (vibe.facilio.com): check how an app is created and linked to a button before building the hand-off.
- To decide with the user first: what a connected-app proposal must contain, whether Claude only describes the app (BRD and mockup) or also prepares the Vibe build, and how the mockup (Meteor) shows it.

- DONE 6 Nov: connected apps are described, not built. Proposal kind connectedapp (module, name, trigger button/state/page/menu, triggerLabel, purpose, shows, users, notes), job capture_apps, button "Ask Claude for connected apps". Apply turns it into a Draft requirement (classification custom, title "Connected app: ...") that reaches the BRD once a person confirms it. Still to do: look at how Vibe creates and links a connected app (vibe.facilio.com needs a sign-in; not looked at), the Vibe build hand-off, and showing the app in the Meteor mockup.

- Vibe (Facilio Build, vibe.facilio.com, 6 Nov 2026, read while signed in): you describe an app in a prompt and Vibe builds it (there is also Open in Claude Code). Rules from its Guidelines page: apps are for the customer to use (not Facilio internal), custom for one customer need, one app per need (never one big app), a finished solution (never something the customer must build), nothing generic. DONE: the connected-app job follows these rules and each applied connected app has a button Copy the Vibe prompt (opens vibe.facilio.com/home). Not done: a real build in Vibe, linking the finished app to the button in Facilio, showing it in the Meteor mockup.

- DONE 6 Nov: Mockup tab (src/mockup.js). Meteor Create has three starts (Feature idea, Connected App, From a PRD); From a PRD takes a pasted spec of any length. The tab compiles the brief only from modules in scope, confirmed requirements, applied flows, custom fields, forms, flows across modules and applied connected apps; buttons Copy the brief, Open Meteor, Download. Nothing is sent to Meteor automatically. Not checked: a real prototype built in Meteor from a real brief.

- DONE 6 Nov: BRD review checklist (step 6). Six parts ticked by a person before approval; server enforces. Stage 3 build list is complete except what is marked not checked.

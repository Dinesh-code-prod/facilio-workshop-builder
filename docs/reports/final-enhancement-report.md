# Final enhancement and lifecycle audit (28 Oct 2026)

Branch `design-guide-lifecycle`, stacked on #22 (Admin Command Center) → #21 (AI layer and Tasks) → #20 (Tabs & Layouts and theme).
Everything below was run in this workspace against the local preview (in-memory platform mock, local stand-in for the model) unless stated.

## 1. Navigation: one parent for design and configuration

| Before (#20) | Now |
|---|---|
| 3. Requirements to BRD · 4. Configuration & Build | **3. Solution Design & Configuration**, with sub-headings |

- Requirements & Design: BRD Draft, System Modules & Form Builder, State Flow Builder, Process Whiteboard
- Configuration & Access: Configuration Inputs, Roles & Access Permissions, Dashboard Gallery, Data Onboarding, Configuration Analysis
- Validation & Traceability: Traceability & Quality, **Org Package Export** (new)

Later stages are renumbered (4. UAT & Go-Live, 5. Hypercare & Handover). Routes are unchanged (the menu only), and so are role-based visibility and
lifecycle status. Sub-headings are a per-tab setting: Tabs & Layouts › Edit tab › Sub-heading changes them; a tab dropped among the tabs of a
sub-heading joins it. Saved layouts with the old group names (main and #20) are migrated (`V.NAV_ALIAS`, layout version 3).
Tab cards now show edit / remove on hover as in Facilio's Tabs and Layout screen; a removed tab stays listed (greyed) with a + to bring it back.
Tests: `tests/ui/tabs-layouts-check.mjs` 35/35.

## 2. Process Whiteboard

Audit: selection, Shift-click and Shift-drag multi-select, dragging with connectors attached, group drill-in, Delete/Backspace, undo/redo (60
steps), zoom, pan, save and reopen already worked (`whiteboard-editing` 20/20, `whiteboard-miro-check` 15/15). Missing was the Miro hover control.
Added: a delete button on the corner of the hovered element (or the one selected element), constant size at any zoom. Hovering never deletes;
pressing it never starts a drag; it is undoable. Deleting 8 or more elements asks first. Imported State Flow states remain individually selectable
and deletable, and the State Flow itself is not changed. Test: `tests/ui/whiteboard-hover-delete.mjs` 27/27.

## 3. Documentation & Resources

| Section | Purpose (from the code) | Relationship |
|---|---|---|
| User Guide Builder | the customer's procedural guide: sections, screenshots, branding, checks, owner approval, Word/PDF, versions, update from configuration | **the drafting workspace and the final guide** |
| Customer User Guide | module-by-module discovery workbook customers read *before* sessions, with feedback | not the final guide; the page now says so and links to the builder |
| Video to Guide | turns a walkthrough (screenshots + supplied transcript) into draft steps | feeds the builder (set-up › walkthrough, or "From a walkthrough") |
| Configuration Analysis | rule-based analysis of the org package, saved as a digest the AI cites | a source for guide sections (Configuration Inputs source) |
| Notes & Links | links and notes (records `res`) | reference only |

### User Guide Builder, drafted like the BRD
Guided set-up (modules, readers, level of detail, sources, sections, optional walkthrough) → each section written on its own through the shared AI
service (`POST /ai/guide-section`, operation `document`; nothing saved by the server) → review and edit → quality checks → owner approval → export.
Progress steps are shown. Each section has a brief and Generate / Regenerate. A section a person has edited is never overwritten: the new AI text
comes back as a proposal (Add below / Replace, after an automatic version, / Discard). Each AI section records the sources and their state; when
they change the section is flagged "Sources changed" (and in Quality checks). "[Missing: …]" markers stay until resolved.
Not compared against an official Facilio guide template: none was supplied, so the section list is a configurable structure, not a claimed template.
Tests: server 40/40 (`work_adapter`, incl. the new route), browser `guide-draft-check` 17/17, exports 26/26.

### UAT guide preparation
The same workflow makes **UAT guides** (Build, UAT & Go-Live › UAT › Prepare UAT guide, or User Guide Builder › New UAT guide): scope, roles,
environment and test users, how to test, test scenarios (requirement or use case proven, preconditions, steps, expected result; actual result and
pass/fail left for the tester), recording defects, "Not in this UAT", sign-off, schedule. Sources: confirmed requirements, use cases, approved
change requests, UAT sessions and readiness. The UAT tab lists the guides. Tests: `uat-guide-check` 12/12; `lifecycle` (UAT sources) passes.

## 4. Organisation package export

### What the sample package proves (standalone_package_400000077_1792134301142.zip)
- Layout: `PackageConf.xml`, `components/<TYPE>.xml` (77 types, 19,283 records), empty `metafiles/`, `error-log.txt`.
- PackageConf: name, displayName, version 1.0, type 1, `<Components><Component Type="X">X.xml</Component>`, then `Feature_License_List` (org licences).
- Records: root `<Components>`, one element per record named after the type; attributes `Created_Version`, `Modified_Version`, `[Parent_Id]`,
  `Status="ADDED"`, `Type=<n>`, `Unique_Identifier`.
- `FIELD.Parent_Id` = module `Unique_Identifier` (6396 of 6396); transitions, statuses and flows likewise (a few belong to modules not in MODULE.xml).
- References by name: transition `FromStateName`/`ToStateName` = `TICKET_STATUS.status` of the module (173/173), `StateflowLinkName`, `moduleName`.
- User-made field names: `<display name lower-cased, other characters _>_<module>` (40/40). Transition link names: name, lower case, letters and digits.
- Same organisation as the bundled reference configuration (org 400000077).

### What is exported
New records only (`Status="ADDED"`): MODULE (new custom modules), FIELD (Single Line, Multi Line, Rich Text, Number, Decimal, Boolean, Date,
Date Time, Lookup, Picklist, Multi Picklist; children and order copied from sample fields of the same type), TICKET_STATUS (new states; open/closed
chosen by a person), STATE_FLOW (new flows), STATE_TRANSITION (buttons a user presses, with comment and portal flags). Each component carries its
source requirements and readiness: Ready (BRD signed off), Draft, Awaiting clarification (requirement not confirmed), Blocked (requirement rejected
or deferred), Not exportable yet, Error. Dependencies come along automatically. The ZIP is built, re-opened and checked (every file parses,
PackageConf lists exactly the files, Parent_Id and name references resolve, identifiers unique) before it is offered. The traceability report is
a separate download.

### Not exported (manual steps listed on the page and in the report)
Changes and removals of existing configuration (only ADDED is in the sample), form layouts (need the target org's form identifiers), roles and
permissions, transition conditions (text only in Delivery Studio; the sample uses structured criteria), actions, approvals, notifications, other
field types. `Feature_License_List` is left out (organisation licences).

### Needs confirming before a real import
Whether import accepts new `Unique_Identifier` numbers (the exporter uses numbers far above the sample's range and flags them); whether
`Feature_License_List` is required; the Org Builder skill's own input expectations (not available here). **The package passed structural
validation only; it was not imported into a Facilio organisation.**
Tests: `tests/orgpkg.mjs` 20/20 (generated records compared with records copied verbatim from the sample, in `tests/fixtures/orgpkg-sample`),
`tests/ui/orgpkg-check.mjs` 16/16.

## 5. Requirements-to-delivery lifecycle audit

### Workflow inventory (actual paths)
| Stage | Where | Stored as |
|---|---|---|
| Sessions, transcripts | Transcripts & Requirement Confirmation (`src/transcripts.js`, rule-based) | doc `transcripts`; accepted items become requirements |
| Requirements, questions | requirement register (`S.ws.requirements`, statuses Draft / Confirmed / Rejected / Deferred; `S.ws.questions`) | doc `workshop` |
| BRD (rule-based) | BRD Draft (`src/brd.js`): Confirmed requirements only; edits stored per block with the generated text they replaced | doc `brddoc`, approval via review/sign-off |
| BRD (AI) and other drafts | Deliverables & AI → `/ai/job` (part by part) or `/ai/run` → `aiContext()` | items `ai`, status draft until an owner approves |
| Change requests | Change Requests (`src/governance.js`) | items `cr`: Requested, Draft, Proposed, CR Converted, Waived Off, Delivered, Rejected |
| FTR | FTR Report (Excel, `src/ftr.js`); AI suggests scenario rows, a person ticks them | versioned workbook |
| User / UAT guides | User Guide Builder | items `ugd`, versions `ugv` |
| UAT | Build, UAT & Go-Live (sessions `uat`, readiness checklist), UAT plan via AI draft, UAT guide | items |
| Traceability | Traceability & Quality: requirement → use case → module → build → UAT session | derived |

### Traceability matrix (controlled fixtures; no customer records were available)
| Requirement | BRD | Change request | FTR | User / UAT guide | UAT | Result |
|---|---|---|---|---|---|---|
| REQ-001 Confirmed | in Functional Requirements (rule-based); AI BRD gets it under CONFIRMED | — | FTR AI draft now receives it | guide/UAT sections receive it as confirmed; UAT scenario cites it | UAT AI draft receives it as confirmed | Verified (fixtures) |
| REQ-002 Draft | not in the rule-based BRD; AI drafts get it only under NOT YET CONFIRMED | — | labelled not agreed | "Not in this UAT" source | labelled | **Defect fixed** (was sent unlabelled) |
| REQ-003 Rejected | absent | — | absent | absent | absent | **Defect fixed** (was sent to AI drafts) |
| Open question Q1 | "Open Questions & Items to Be Confirmed" | — | UNRESOLVED | UNRESOLVED | UNRESOLVED | Verified |
| CR approved (CR Converted) | AI BRD now receives it as APPROVED | impact list + review record | received | received (UAT) | received | **Gap fixed** |
| CR proposed / rejected | proposed labelled NOT APPROVED; rejected absent | | | | | **Defect fixed** (rejected reached FTR) |
| BRD manual edit + source change | edit kept, flagged stale | | | | | Verified |

### Findings
| ID | Workflow | Where | Finding | Severity | Status |
|---|---|---|---|---|---|
| L1 | AI drafts (BRD, UAT, guide, FTR …) | `work/server/api.mjs` `aiContext` | Draft and Rejected requirements were sent in the raw workshop document, only a JSON status telling them apart | High | Fixed: re-shaped per deliverable (`shapeDoc`); gaps and workshop intelligence keep raw data |
| L2 | FTR AI draft | `AI_TASKS.ftr` | received no requirements at all, and rejected change requests | High | Fixed: workshop document added; CRs filtered and labelled (`shapeRows`) |
| L3 | BRD / UAT AI drafts | `AI_TASKS` | approved change requests were not a source | Medium | Fixed |
| L4 | Change requests | `src/governance.js` `crDecideSave` | approving or declining from the review dialog **erased the title, description, area, effort and price** (the route replaces the record; a partial update was sent); no decision date | High | Fixed: whole record sent, `decidedAt` set; browser test |
| L5 | Change requests | server `decisionGuard` | the owner-only rule knew "Approved", which the page never writes; editors could record "CR Converted" | High | Fixed: real statuses; Converted/Waived Off → Delivered allowed; customer may decide a change offered to them |
| L6 | Change impact | — | nothing identified records affected by an agreed change | Medium | Added: Impact list per CR (requirements, use cases, UAT sessions, tasks, guides, BRD/FTR sections in that area) and an impact-review record; nothing is rewritten automatically |
| L7 | UAT | — | no structured UAT test cases with requirement IDs (UAT plan is an AI document; sessions are per module) | Medium | Open: UAT guide scenarios now cite requirement IDs; a structured test-case register would be the next step |
| L8 | FTR | `src/ftr.js` | FTR rows carry no requirement reference | Low | Open (FTR follows the customer's workbook columns) |
| L9 | Requirement change → documents | — | the rule-based BRD flags stale edits; guide sections flag changed sources; UAT/FTR documents do not | Medium | Partly fixed (guides); open for AI drafts and FTR |

### Readiness
| Workflow | Status |
|---|---|
| Sessions → requirements → rule-based BRD | Verified with limitations (fixtures, not customer data) |
| AI deliverable drafts (BRD, UAT, FTR, guide) | Defect identified and fixed; real DeepSeek output not verified here |
| Change requests | Defects identified and fixed; impact review added |
| FTR | Verified with limitations (no requirement IDs per row) |
| User guide / UAT guide | Verified with limitations (local model stand-in; no Facilio guide template supplied) |
| UAT test-case coverage per requirement | Not verified: no structured test cases exist |
| Org package | Structurally verified; not imported |

Tests: `tests/lifecycle.mjs` 30/30, `tests/ui/lifecycle-check.mjs` 14/14.

## 6. Tree intro
The quality guard that keeps the intro smooth only watched the first second, so the canopy growing with each stage dropped frames from about stage 6
(measured: ~34 fps with runs of 50 ms frames). It now tracks drawing cost and frame interval for the whole growth and steps quality down (never up)
when either stays over budget: ~51 fps in the same software-rendered run, only isolated slow frames. Label motion unchanged (`tree-slide`: 0 jumps,
0 blinks); welcome 14/14.

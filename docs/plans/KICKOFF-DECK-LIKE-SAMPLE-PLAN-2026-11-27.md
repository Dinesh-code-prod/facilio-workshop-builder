# Kick-off deck like the Al Mujama sample: plan (27 Nov 2026)

Reference: the Al Mujama × Facilio Project Kick-off deck (16 slides, 4 Nov 2026). It belongs to another customer: copy its structure, wording style and level of detail, never its names, dates or scope.

## 1. How a contract flows today

| Step | Who | What happens | Code |
|---|---|---|---|
| 1 Drop the MSA | Team member, Contract intake tab | The file is stored, its text kept page by page (`msa_text`), and a `pull_msa` job is queued | `src/kickoff.js`, `V.msaIngest` |
| 2 Read the contract | Claude, in the person's own session (Studio connector) | Reads every page of every contract document, writes one extraction with page, clause and exact quote per item, calls `msa_extraction_save` | job recipe `pull_msa` in `work/server/_jobs.mjs` |
| 3 Draft from it | Server | Checks every quote against the stored pages, then writes the planner (scope, contract fields), Know Your Contract, Scope, and the **kick-off pack** (plan + deck data) as a draft | `_msaapi.mjs` `fillExisting`, `_kickoffpack.mjs`, `_planfrommsa.mjs` |
| 4 Plan, workbook, sessions | Kick-off page, when it is opened | Timeline rows (`plan_struct`), the Excel plan workbook, and the requirement sessions (grouped by module from the workshops phase) are made from the pack | `src/kickoff.js` `syncStruct`, `syncWorkbook`, `syncSessions`; `kickofflogic.sessionPlan` |
| 5 Review | Team | Change requests (`kickoff_cr`) go to Claude as `apply_change`; "make it like a reference" goes as `make_from_reference` | `_jobs.mjs` |
| 6 Approve | Project owner | One Approve; an approved pack is never overwritten | `kickofflogic.approvalCheck` |

The deck itself is drawn by `src/kickoffhtml.js` (one self-contained HTML file, 16:9, arrows, print to PDF). Claude writes only the **data**; the layout is fixed in the Studio. Rule kept: nothing invented; a slide with no data is left out.

## 2. Sample against today, slide by slide

| Sample slide | Today | Gap |
|---|---|---|
| 1 Cover: title, one-line promise, 3 key dates | Same | — |
| 2 Welcome + agenda | Same | — |
| 3 What changes: 6 outcome cards (title + one line), coloured by stream | Numbered scope sentences | Outcome **title + line**, **stream** (e.g. platform / AI) |
| 4 Meet the team: Facilio names and roles; customer roles "to nominate"; meeting rhythm line | Slide exists but the pack has no team, so it is usually left out | Fill from the project's People; customer **role placeholders** (Sponsor, PM, Business SPOC, FM lead, Finance, IT) |
| 5 How we deliver: 4 phases, dates, 4 activities each, the named gate (T1 BRD sign-off) | Phase name + dates + "Ends with a sign-off" | Phase **activities** and **gate name** |
| 6 Scope at a glance: 3 groups (site, modules, AI) with items | — | **Scope groups** |
| 7 Scope in/out: per area, plus a "not in scope" list | Two plain lists side by side | In-scope **by area** |
| 8 Plan on one page: workstream Gantt, owner colour (Facilio / customer / joint), public holidays, gate markers | Phase Gantt, one colour | **Workstream owner**, **holidays**, gate markers |
| 9 Milestones: T0–T3 gates, each "Unlocks" and "Needs from you" | Dates and labels only | **Unlocks**, **Needs from you** per gate |
| 10 Dependencies: two tracks and the slip rule ("late by N days moves every later date by N") | — | **Tracks** + slip rule |
| 11 Spotlight on one workstream (AI agents: build window, what each does, inputs needed) | — | Optional **spotlight** slide, only when the contract has such a stream |
| 12 What we need: table Input / Your team / Due / Unlocks | Date + text | **Owner team** and **Unlocks** columns |
| 13 Governance: weekly / monthly / quarterly, escalation path both sides, change control | Cards of support text | **Cadence**, **escalation**, change-control line |
| 14 Risks: table Risk / Level / Effect on the plan / How we protect the date | "Risk 1: text" | **Level, effect, mitigation** |
| 15 Next ten working days: date / action / owner | Same | — |
| 16 Thank you | Same | — |

## 3. The changes (one piece of work)

1. **Pack data** (`_kickoffpack.mjs` + extraction rules `_msaextract.mjs`): new optional deck fields, all with an origin (contract, interpreted, assumed): `outcomes[{title,text,stream}]`, `scopeGroups[{name,items}]`, `scopeAreas[{area,text}]`, phase `activities` and `gate`, gate `unlocks` and `needs`, `tracks` and `slipRule`, `spotlight`, asks `team` and `unlocks`, `governance{cadence,escalation,changeControl}`, risks `level/effect/mitigation`, workstream `owner`, `holidays`. Old packs keep working (every field optional).
2. **Deck builder** (`src/kickoffhtml.js`): the new and richer slides above, each drawn only when its data exists; the team slide filled from the project's People at build time. Tests: `tests/kickoff_deck.mjs`, `tests/kickoff_pack.mjs`.
3. **Claude side, in step**: the `pull_msa`, `apply_change` and `make_from_reference` recipes ask for the new fields (from the contract, quoted, or marked assumed); the slide-to-field list in `apply_change`; `_skills.mjs`; connector tool docs; Team Guide and Claude setup text. Checks: `tests/claude_launch.mjs`, `tests/connector_skills.mjs`, `tests/ui/claude-handoff-check.mjs`.
4. **Sessions and plan without opening the page**: today the timeline, workbook and sessions are made only when someone opens the Kick-off page. Make the server write `plan_struct` and the drafted sessions in `fillExisting` too, so Claude's job alone produces the plan, the sessions and the deck.
5. **Look**: move the deck from the old blue (#1570EF) to the Facilio reference palette (#0024D6, Roboto, chart series colours), with one second accent for a second stream (the sample uses violet and orange).

Not in this piece: PowerPoint (.pptx) export of the deck (the HTML prints to PDF today).

## 4. Decisions

- Deck colours (built 27 Nov 2026): the Facilio palette of the project rules; streams are blue #0024D6, orange #FF6700, violet #7D63DC (the sample's violet and orange idea, on Facilio colours). The user can still ask for the sample's own colours.
- A .pptx download of the deck is not built; the HTML deck prints to PDF. Open question for the user.

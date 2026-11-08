# Solution design and BRD: how it fits together, and how another tool can plug in (8 Nov 2026)

Written after reading the code of stage 3. "Verified" means I read it in the repository; "Proposal" means it is not built.

## 1. What stage 3 holds (verified)
| Tab | Page id | What it produces | Where it is stored |
|---|---|---|---|
| Solution | `solution` | Per module and per area (apps, templates, KPIs, SLA, notifications, approvals, roles, other): an overview and a table of rows (topic, what Facilio does, who, requirement ids), with status and history | project document `solutions` (rules in `src/sollogic.js`) |
| System Modules & Form Builder | `modules`, `module` | Which modules are in scope (system, custom, settings and connected apps), priority, fields, form templates, buttons, relationships | workshop document (`S.ws`: `modules`, `customModules`, `formOps`, `fieldOps`) |
| State Flow Builder | `flow` | Per module: states and transitions, actors, conditions, approvals | `S.ws.flows` |
| Mockup | `mockup` | The prototype brief for Meteor, and the finished Meteor pages and videos returned by Claude | the brief is built in the browser (`src/mockup.js`, `V.mockupLogic.build`); returned pages in `mockup_pages` |
| Roles, Notifications, Configuration and org package, KPIs and SLA | `roles`, `notifications`, `cfginputs`, `slakpi` | Access, alerts, configuration inputs, KPI and SLA rows | workshop document and item kinds (`kpi`, `cmodx`, `cfgrel`, `capp`) |
| BRD Draft | `brd` | The document: confirmed requirements, use cases, modules, flows, fields, SLA, the Solution areas, sign-off | built in the browser (`src/brd.js`) from the same documents; BRD record in `brddoc` |

The contract sits in front of all of it: `msa_text` (every page of every contract document) is read by `src/contractmods.js` and the AI to say which modules are delivered, only mentioned, or excluded.

## 2. How the BRD draft and the mockup are powered today (verified)
- **BRD draft** (`src/brd.js`) reads the confirmed requirements, use cases, in-scope modules, state flows, fields, SLA rows and the fixed Solution areas, and writes the document in the order of the facilio-solution-document-builder section templates.
- **Mockup brief** (`src/mockup.js`) reads, per module, the confirmed requirements, flows, fields, forms and the agreed solution from the Solution tab, plus the other agreed areas, and writes one specification for Meteor. Today the brief is copied or downloaded; it is not written to the server. Meteor builds the clickable prototype; Claude can send the finished page back with the `send_mockup` job, and the page shows on the Mockup card.
- **Claude** reads the solution through the connector in one call: `get_document` section `solutions`, part `context:<area key>` (`work/server/_solctx.mjs`): the area's current solution and history, requirements, flows, fields and forms, notifications, access, SLA, KPIs, connected apps, open questions, the sessions, the contract scope and the neighbouring areas. The jobs `update_solution`, `compare_solution`, `draft_brd`, `capture_flows`, `fill_forms`, `capture_apps` and `send_mockup` follow fixed recipes in `work/server/_jobs.mjs` and save proposals, never approved content.

## 3. What was wrong or missing (verified, and fixed on 8 Nov)
1. A contract module was found but nothing switched it on until someone pressed a button, and a module Facilio does not list only became a Solution area, never a real custom module. Fixed: **Apply the contract** switches on every delivered module (system, settings and connected apps) and creates each delivered custom module through the same code as the New module drawer; it also runs by itself right after "Read the contract with the AI". It matters because the Claude buttons on the module page (capture the flows, fields and forms, draft the BRD, connected apps) work on modules that are in scope, so the scope must follow the contract first.
2. The Solution page was cramped (contract panel squeezed into a 260 px rail, tools stacked in one column). Fixed: full-width contract card, a wider module list with a search box, a calmer detail card, document drop and Ask Claude side by side.

## 4. The remaining gap for integration (verified)
The BRD builder and the mockup builder both run only in the browser, each re-reading the documents in its own way. There is no single, versioned, machine-readable statement of "the solution". So a second tool (a code generator, a Facilio configuration applier, a test generator, Comet or Meteor) cannot ask for it, and the BRD and the mockup can drift apart.

## 5. Proposal: one "solution package" that every consumer reads
One pure module (`work/server/_solpackage.mjs`, shared with the browser build) assembles a JSON document, schema version 1, from the stored documents. The BRD draft, the mockup brief and every outside tool read this one document.

```
{ schema: "facilio.solution/1", project: { id, name, customer }, generatedAt, sourceHash,
  scope: [ { module, kind: system|custom|support, inScope, priority, origin: contract|team|ai, contract: [ { doc, page, quote } ] } ],
  solutions: [ { area, status, overview, rows: [ { topic, solution, who, reqs } ], version, approvedBy } ],
  requirements: [ { id, text, status, modules, source } ],  useCases: [ ... ],
  flows: [ { module, states, transitions, actors, approvals } ],
  data: [ { module, fields: [ ... ], forms: [ ... ] } ],
  access: { roles }, notifications: [ ... ], kpis: [ ... ], sla: [ ... ], apps: [ ... ],
  outputs: { brd: { ref, status }, mockup: { specHash, pages: [ ... ], videos: [ ... ] } } }
```
- **Read:** the connector's existing `get_document` gets a new section `solution_package` (no new tool, the 40-tool cap stays) and one REST route `GET /api/projects/:id/solution-package` for a tool that is not Claude. Access rules are the existing ones; customers never reach it.
- **Write back:** a tool reports what it did through the existing transfer engine (`transfer_write` begin, store, submit): kind `implementation_report`, with the package `sourceHash` it worked from, so the Studio knows which version was built or tested. A person approves; nothing is marked done by the tool alone.
- **Power the outputs from it:** the BRD builder and `V.mockupLogic.build` take the package as input, so the BRD, the mockup brief and any external tool are generated from the same facts. The mockup video job records the `specHash` it was made from, so a stale video is visible.
- **Rules kept:** nothing is invented (every row keeps its origin); text from contracts, transcripts and customers is data, never instructions; a person approves; no secrets in the package.
- **Tests:** a fixture project in, an expected package out (`tests/solpackage.mjs`); a schema file `docs/reference/solution-package.schema.json`; a check that the BRD and the mockup built from the package match the ones built today.

## 6. Order to build it (steps 1 and 2 are built, 8 Nov 2026, not deployed until the next deploy row says so)
1. BUILT: package builder (`work/server/_solpackage.mjs`) with 8 checks (`tests/solpackage.mjs`).
2. BUILT: `get_document` section `solution_package` (no part gives the manifest with counts and the sourceHash; a part gives one list) and `GET /api/projects/:id/solution-package` (the whole document, delivery team only, read only). A JSON Schema file is still to write.
3. Move the BRD and mockup builders to read the package; compare outputs with today's.
4. Write-back kind `implementation_report` and a "built from version" badge on the BRD and Mockup tabs.
5. First external consumer (for example a Facilio configuration applier) in read-only dry-run mode.

## 7. Not verified
Nothing here was tried with a real Meteor, Comet, Claude or external tool. Steps 3 to 5 of section 6 are not built, and the new section was not called from a real Claude session.

# tests: checks that the app still works

* **`npm test`** runs the files in this folder. They test the rules and the server against a pretend copy of the platform. They take a few minutes and need no browser. The same run happens on GitHub for every push.
* **`ui/`** holds checks that open the app in a real browser (Edge on this PC: `PW_CHANNEL=msedge node tests/ui/<file>.mjs`). Start a preview first with `node tests/ui/devserver.mjs 4173`.
* **`fixtures/`** holds the small sample files the tests use (a pretend organisation package, a kick-off deck).

How to read a name: a test is named after the thing it checks (for example `wsr.mjs` checks the weekly status report, `qbank.mjs` the question bank).

| File | What it checks |
|---|---|
| [ai_layer.mjs](ai_layer.mjs) | The shared AI layer (work/server/_ai.mjs) on its own, with a fake platform: provider choice and capabilities, configuration |
| [brd_draft.mjs](brd_draft.mjs) | The BRD drafts itself from confirmed findings (src/brddraft.js, rule `drafts`): confirmed becomes a Confirmed requirement with the team answer as rules, once; unconfirmed takes it back to Draft;... |
| [brd_review.mjs](brd_review.mjs) | The BRD review checklist (src/brdreview.js): which parts are still not ticked, what is still open next to each part, and that the panel shows names and escapes text. |
| [brd_scope.mjs](brd_scope.mjs) | The BRD follows the modules in scope (src/brd.js): roles, role matrix, portals and the location hierarchy show only what touches a module in scope, and the appendices are off by default. |
| [cfg_gap.mjs](cfg_gap.mjs) | Configuration gap table (src/cfggap.js): one row per component kind, missing inputs found and never guessed, setInput leaves the old table alone |
| [chat_brief.mjs](chat_brief.mjs) | The chat brief: only the playbooks the message is about, all areas readable, scope not limited to one stage. |
| [claude_launch.mjs](claude_launch.mjs) | Open in Claude, shared rules (src/claudelogic.js): what may travel in a link, never a silently cut prompt, the short reference prompt, the common header. |
| [connector_skills.mjs](connector_skills.mjs) | Connector add-ons: the Facilio implementation skills tool, the "where are we" block of project_overview, the org id, the connector-seen note, and the hand-off start guidance. |
| [contractmods.mjs](contractmods.mjs) | Which modules the contract documents are about (src/contractmods.js): scope part, delivery wording, exclusions, passing mentions, generic words, several documents, evidence kept, and the untidy... |
| [customer_mail.mjs](customer_mail.mjs) | Customer emails (Project Settings): saving them, refusing shared domains and clashes, and the mailbox search that files what those customers already sent. |
| [demo_project.mjs](demo_project.mjs) | The shared demo project: set up once by an admin, read-only for everyone else, example data in every section including the project plan, and sample AI drafts. |
| [design_apply.mjs](design_apply.mjs) | What Apply builds from a proposal (src/design.js): a state flow in the shape the flow builder keeps, and the panel's text is escaped. |
| [design_logic.mjs](design_logic.mjs) | Design proposals (work/server/_dsapi.mjs): cleaning, merging, never overwriting a decided one, limits. |
| [drop_acts.mjs](drop_acts.mjs) | Every action that asks for a file (V.pickFile) must be on the drop list in src/shell.js, so a dropped file works on every import button. |
| [eml_parse.mjs](eml_parse.mjs) | Reading an .eml in the browser: sender, subject, date, plain text, quoted-printable, base64, HTML-only and attachments. |
| [feedback.mjs](feedback.mjs) | Team feedback: clean record, issue text, the daily sheet rows, the routes on a stand-in platform, and the GitHub fallback. |
| [ftr_html.mjs](ftr_html.mjs) | FTR checklist HTML (src/ftrhtml.js) and the check of the downloaded results (src/ftrresult.js): items come only from the data given, configuration checks and functional tests are kept apart |
| [golive.mjs](golive.mjs) | Go-live readiness (src/golive.js, rule `readiness`): read from recorded data; a gap is shown, never a refusal; green only when it is really done. |
| [guide_intel.mjs](guide_intel.mjs) | Tests the guide intelligence (src/guideintel.js) on real ZIP packages built from Facilio-style XML: parsing, relationship evidence |
| [guides_list.mjs](guides_list.mjs) | Training guides overview (src/guideslist.js, rule `summary`): counts what exists and says where each kind is made; nothing invented. |
| [jobs.mjs](jobs.mjs) | Job queue (roadmap E17): the pure rules of work/server/_jobs.mjs, then the routes under /api/projects/:id/jobs and the connector tool project_jobs, on the stand-in platform of |
| [jobs_all.mjs](jobs_all.mjs) | project_jobs action list with NO project: the waiting jobs of every project the person can open, in one call (the cheap idle check of the fast chat lane). |
| [kickoff_deck.mjs](kickoff_deck.mjs) | Digital kick-off deck (src/kickoffhtml.js): built only from the data it is given, empty slides are left out and named, text is escaped, the file asks for nothing from outside. |
| [kickoff_docs_route.mjs](kickoff_docs_route.mjs) |  |
| [kickoff_logic.mjs](kickoff_logic.mjs) | Kick-off page rules (src/kickofflogic.js): the pack as the page reads it, change requests, who may approve and when, the job rows. |
| [kickoff_pack.mjs](kickoff_pack.mjs) | Kick-off pack (roadmap E15 Stage 1): work/server/_kickoffpack.mjs builds the kick-off deck data and the drafted plan together from an approved MSA extraction. |
| [life.mjs](life.mjs) | Lifecycle tracker rules (src/lifelogic.js): nine stages, status from records and authorised decisions, missing information is never success. |
| [lifecycle.mjs](lifecycle.mjs) | Requirements-to-delivery lifecycle (server side): what each AI-drafted deliverable is given, using controlled fixtures. |
| [load_ai.mjs](load_ai.mjs) | Load check for the facilio.work server function: 100 projects, 100 people at once, AI drafts included. |
| [mail_api.mjs](mail_api.mjs) | Customer mail becomes tasks: the server side (_mailapi.mjs) with an in-memory database: save, dedupe, accept, resolved -> draft_reply job, reply states, customers refused, tools declared. |
| [mail_tasks.mjs](mail_tasks.mjs) | Customer mail becomes tasks: routing, scenarios, dedupe, done-when, reply state, and the engine rule for mail tasks. |
| [mockup_client.mjs](mockup_client.mjs) | The client mockup (src/mockuphtml.js): one self-contained HTML file; modules grouped like a Facilio organisation; sample records; state moves; the file is safe to open and share. |
| [mockup_push.mjs](mockup_push.mjs) | Claude brings a finished Meteor page into the Studio (work/server/_dsapi.mjs, tool mockup_save_page, action save_mockup of session_questions) |
| [mockup_spec.mjs](mockup_spec.mjs) | The prototype brief for Meteor (src/mockup.js): built only from applied or confirmed design, empty when nothing is applied, plain text, no invented parts. |
| [module_kind.mjs](module_kind.mjs) | Only System modules and Custom modules are Facilio modules (src/core.js): custom ones that only keep files or settings for a connected app (the PDF builder, document stores) are listed apart, and a... |
| [msa.mjs](msa.mjs) | MSA scope check rules (src/msalogic.js): the five kinds of finding, what each rests on, and that missing information is never read as "fine". |
| [msa_extract.mjs](msa_extract.mjs) | MSA extraction (roadmap E2 workspace 1, E11 step 2): the pure rules of work/server/_msaextract.mjs, then the connector tools msa_extraction_save and create_project_from_msa |
| [msa_project_route.mjs](msa_project_route.mjs) | Start project from MSA, the routes the Transfers page calls (work/server/_msaapi.mjs): GET /api/me/holding and |
| [msa_questions.mjs](msa_questions.mjs) | Questions from the contract (src/msaquestions.js): the rules that turn the MSA review into module-guide questions and the Learn & Prepare card, and the wiring. |
| [msa_resume.mjs](msa_resume.mjs) | create_project_from_msa after the review of 5 Nov 2026 (findings A and H): a claim before the project is made, a failure after it reports the project id and a retry RESUMES the fill |
| [msadocs.mjs](msadocs.mjs) | Several contract documents per project (work/server/_msadocs.mjs): the old single MSA reads as one document, adding and removing, verification, parts for Claude, the cross-document check and its... |
| [nav_exposed.mjs](nav_exposed.mjs) | The team menu shows only the tabs built in the Part E revamp (EXPOSED in src/shell.js). |
| [notify.mjs](notify.mjs) | Notifications (work/server/_notify.mjs): the pure rules, then the events on a stand-in platform: who is told, who is not (the person who caused it, customers), the preferences, the quiet hours, the... |
| [onboarding_html.mjs](onboarding_html.mjs) | Customer onboarding HTML (src/onbhtml.js) and the check of a returned package (src/onbreturn.js): the file is deterministic, asks for nothing from outside, escapes every project string |
| [onboarding_rules.mjs](onboarding_rules.mjs) | Data onboarding sheet rules (public/onboarding-tool/04-rules.js + 05-engine.js): run the real checker on small workbooks and see that good data passes and each kind of mistake is caught. |
| [onboarding_workbook.mjs](onboarding_workbook.mjs) | The customer's data workbook (src/onbhtml.js grids, Save workbook) and the studio's import check (src/onbreturn.js validateWorkbookHtml) |
| [orgpkg.mjs](orgpkg.mjs) | Organisation package export (src/orgpkg.js) against records copied verbatim from the sample Facilio package |
| [orgpkg_export.mjs](orgpkg_export.mjs) | Org package export: a sample project (new module, field, state flow, notifications) is exported, checked structurally, and read back with the same |
| [parse_node.js](parse_node.js) |  |
| [pkg_validate.mjs](pkg_validate.mjs) | Static package validation (src/pkgvalidate.js): the real sample fixture (tests/fixtures/orgpkg-sample, as used by tests/orgpkg.mjs) and a package built by |
| [plan_from_msa.mjs](plan_from_msa.mjs) | Project plan drafted from the contract (work/server/_planfrommsa.mjs): 90-day default, weekends skipped, commitments pinned, conflicts reported not hidden |
| [plan_html.mjs](plan_html.mjs) | Plan HTML export (src/planhtml.js): complete, self-contained, escaped, labelled by origin, nothing invented. |
| [portfolio.mjs](portfolio.mjs) | Health rules of the Admin Command Center (work/server/_portfolio.mjs) on projects in known states: each project's health |
| [portfolio_money.mjs](portfolio_money.mjs) | The admin finance view: money per project comes from the contract fee milestones and change-request prices, in the project's own currency. |
| [prepared_questions_tool.mjs](prepared_questions_tool.mjs) | Prepared questions as connector tools (roadmap E2 workspace 3, E14): get_prepared_questions and live_ask, called the way Claude calls them (POST /api/ with the x-work-mcp-tool header) |
| [qa_stress.mjs](qa_stress.mjs) | QA stress run for the facilio.work server function: 100 people, 100 projects, everyone adds notes, links and documents, large records, file parts, connector calls and a big hand-off answer. |
| [qbank.mjs](qbank.mjs) | The question bank rules (work/server/_qbank.mjs): cleaning, merging without duplicates, editing with history, moving, the Workshop room's view, the prompts and the parsers of a model's answer. |
| [qbank_api.mjs](qbank_api.mjs) | The two AI routes of the question bank (work/server/_qbankapi.mjs) with a stand-in AI and fake project documents: what is read, what is returned, who may call them. |
| [roadmap_stage.mjs](roadmap_stage.mjs) | The eight-stage roadmap in admin, portfolio and customer screens: each of the 12 plan steps belongs to one stage of the menu; the server and the browser copy of the mapping agree. |
| [rs_logic.mjs](rs_logic.mjs) | Requirement session transcripts and findings (work/server/_rsapi.mjs): cleaning, merging, replacing, limits. |
| [scale.mjs](scale.mjs) | Tests the facilio.work server function (work/server/api.mjs) against a mock of the platform's ctx (db limits, verified viewer, private files). |
| [session_html.mjs](session_html.mjs) | Requirement session plan HTML (src/sessionhtml.js): the structure of Facilio's workshop plan sheet, escaped, self-contained, nothing invented. |
| [session_questions.mjs](session_questions.mjs) | Questions-to-ask engine (work/server/_sessionquestions.mjs): each rule fires on crafted input and cites its sources, nothing is made up, ids are stable, liveAsk is careful. |
| [solctx.mjs](solctx.mjs) | The context pack of a Solution area (work/server/_solctx.mjs): Claude gets everything the project holds about the area in one read. |
| [sollogic.mjs](sollogic.mjs) | Solution tab rules (src/sollogic.js): areas, requirement lines, versions, restore, accepting a proposal, word diff, BRD text and Word rows |
| [solread.mjs](solread.mjs) | A dropped solution document read by the AI layer (work/server/_solread.mjs and the route in _qbankapi.mjs), stored as proposals (src/sollogic.js mergeProposals), and only real solution modules... |
| [solution_doc.mjs](solution_doc.mjs) | The Solution Document job (Handover page): Claude builds it from the dropped org package with the facilio-solution-document-builder skill. |
| [solution_status.mjs](solution_status.mjs) | Solution status (src/solution.js): what is recorded per module in scope, which parts are missing, an empty project says what to do, customers see nothing, text is escaped. |
| [src_syntax.mjs](src_syntax.mjs) | Every browser source file must parse: a stray quote once blanked the whole live app while the other tests still passed. |
| [task_engine.mjs](task_engine.mjs) | Task engine (docs/plans/TASKS-AUTOMATION-PLAN-2026-11-07.md): the pure rules in src/taskengine.js, then the server side that lets the owner answer a task (task_reply) and keeps the auto block. |
| [task_suggestions.mjs](task_suggestions.mjs) | Task tracking by Claude (roadmap E12 slice 2): the pure rules of work/server/_tasksuggest.mjs, then the connector tools task_evidence and save_task_suggestions and the routes |
| [task_watch.mjs](task_watch.mjs) | Task reminders (roadmap E12): the pure rules in work/server/_taskwatch.mjs, then the connector tools my_tasks and send_task_digest and the assignment DM |
| [tl_deps.mjs](tl_deps.mjs) | Plan timeline dependencies (src/tldepslogic.js): loops are refused, later tasks follow an earlier one that moved, conflicts and the critical path are found. |
| [transcript_import.mjs](transcript_import.mjs) | Import of an approved transcript transfer (src/transcriptimport.js, the button in src/transferslogic.js): who may import, the second import of the same version, bad content. |
| [transcript_parse.mjs](transcript_parse.mjs) | Transcript parser (src/transcriptparse.js): every format, odd input, the size and count caps, hostile input and stability. |
| [transfer.mjs](transfer.mjs) | Push and pull engine, the pure rules in work/server/_transfer.mjs (roadmap E4, design STEP1-PUSH-PULL-DESIGN.md). |
| [transfer_routes.mjs](transfer_routes.mjs) | Push and pull engine, storage and routes (work/server/_transferapi.mjs through work/server/api.mjs), on a stand-in platform like tests/task_watch.mjs. |
| [transfer_tools.mjs](transfer_tools.mjs) | Push and pull connector tools (transfer_*), called the way Claude calls them: POST /api/ with the x-work-mcp-tool header, on the stand-in platform of tests/transfer_routes.mjs. |
| [transfers_page.mjs](transfers_page.mjs) | Transfers page (src/transferslogic.js and src/transfers.js): the pure helpers, and the real page code run against a small stand-in for the browser |
| [uat.mjs](uat.mjs) | UAT test case rules (src/uatlogic.js): the column mapping for an Excel/CSV tracker, the status words, duplicates and the summary per module. |
| [uat_guide.mjs](uat_guide.mjs) | UAT guide (src/uatguide.js): built only from the approved modules and the saved test cases (the "utc" records of the UAT page). |
| [webframe.mjs](webframe.mjs) | Facilio tools in frames (roadmap E13): the allow-list rules (src/webframelogic.js), the page policy in src/template.html, and the menu in src/shell.js. |
| [work_adapter.mjs](work_adapter.mjs) | Tests the facilio.work server function (work/server/api.mjs) against a mock of the platform's ctx (db limits, verified viewer, private files). |
| [workchat.mjs](workchat.mjs) | The shared Claude conversation (src/workchat.js): messages with actions and reply boxes, tiles with state, escaping. |
| [workshop_logic.mjs](workshop_logic.mjs) | Workshop room logic (src/workshoplogic.js): the question list with the person's status and notes, the live merge (never certain, never changes a status) |
| [workshop_prep.mjs](workshop_prep.mjs) | Workshop preparation (src/workshopprep.js): one session proposal per module, nothing invented, a plain JSON object the Studio can edit and re-render |
| [wsr.mjs](wsr.mjs) | Status reports (src/wsrlogic.js): the weekly and monthly report built from the project records. |

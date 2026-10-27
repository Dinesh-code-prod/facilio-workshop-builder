# Implementation status — 20 Oct 2026

> History log. Earlier entries describe the first hosting set-up (password and guest sign-in, browser UI tests, test fixtures). Those parts were retired when the app moved to facilio.work; the files they mention are in the Git history. For the current set-up see README.md.

Everything below was run in this workspace against a local dev server (fresh database per run) unless stated. Nothing is marked tested unless a test ran and passed.

## Task status

| # | Task | Status | Evidence |
|---|---|---|---|
| 1 | Hosting | **Moved to facilio.work** (24 Oct 2026) | App lives at facilio-delivery-studio.facilio.work with a server-side backend (`work/server/api.mjs`), Microsoft sign-in and enforced roles. `npm test` covers the server function. |
| 2 | Colour update #19 | **Completed, tested** (approved) | Colours only, applied (the proposal document is in the Git history). Form Builder and State Flow Builder keep Facilio colours (scoped token block). Before/after in `tests/out/colour_before_*` / `colour_after_*`. |
| 3 | AI phase | **Implemented** | AI drafts run on the server through one review-and-approve path (see `docs/IMPLEMENTATION_ROADMAP.md`). The early preparation note is in the Git history. |
| 4a | MSA OCR | **Completed, tested** | `tests/msa_ui.mjs` (17 checks): mixed PDF (text / scanned / unreadable / text pages), fully scanned multi-page PDF, text layer still used for selectable pages, OCR engine failure, Word file. OCR is bundled tesseract.js (English) in `vendor/tesseract/`, runs in the browser; CSP gained `'wasm-unsafe-eval'` for it. |
| 4b | Source page / section references | **Completed, tested** | Items carry `page` (PDF only), `section` (numbered clause or heading), read method and OCR confidence; "View" shows the excerpt and the page image. Word/text files record no page. Same test file. |
| 4c | Regenerate schedule with diff | **Completed, tested** | `tests/schedulediff_ui.mjs` (20 checks): added / removed / modified / unchanged, dates, modules, dependencies, manual edits kept, conflicts flagged and unselected, confirmation before apply, approved (published) schedule untouched. Removed sessions are cancelled, not deleted. |
| 5 | BRD editor | **Tested, no defect found** | `tests/brd_edit_ui.mjs` (7 checks): edit saved, survives reload, regeneration after source change keeps the edit and marks it stale, revert restores the generated text. e2e BRD steps also pass. |
| 6 | Phase 7 source checks | **Completed, tested** | New *Source checks* tab in Checks & Validations (`src/sourcecheck.js`), 21 checks split into confirmed errors vs needs review, with links. `tests/sourcecheck_ui.mjs` (13 checks): clean, valid, incomplete, inconsistent, missing-source. |
| 7 | Module Brief sheets | **Completed, tested** | `V.onboardingSheetsFor(module)` in `src/onboarding.js`; unknown modules return `[]`. Tested in `tests/extras_ui.mjs` (22 checks). Modules with no onboarding sheet (e.g. Work Order) correctly show no line. |
| 8a | Dashboard PNG export | **Completed, tested** | Current tab drawn on a canvas at 2× with filters, logo and labels; two PNGs inspected visually. `tests/dashreport_ui.mjs` (44 checks). |
| 8b | PM / stage / BRD status filters | **Completed, tested — with stated limits** | Project manager = people whose role is a manager; matches who created the record, so it narrows requirements and activity only (other datasets show 0 and the page says so). Stage = the project plan's dated steps. BRD status = Included / Awaiting / Excluded, derived from the same rule the BRD uses. The stage filter was tested with a stubbed plan (no dated plan exists in the test project). |
| 8c | Logo isolation | **Completed, tested** | `tests/dashreport_logo_ui.mjs` (17 checks): two projects, own logos, replace one leaves the other, reload persistence, default none, BRD cover, Excel/PDF/PNG carry the logo, remove affects one project only. |
| 9 | Inventory Request → Create Quote | **Discrepancy reported, nothing invented** | The org package has Work Order → *Create Quote* (enabled, with criteria) and Work Order → *Raise Material Request*; **no Inventory Request → Create Quote button exists and none is disabled**. The requested "expected disabled" action stays listed as *Not found in configuration*; it is a table row only and cannot create a quote. Needs the team lead to confirm whether it is a future requirement. |
| 10 | Regression and report | see below | |

## Regression (final run)
See the "Final test run" section appended below.

## Files changed in this pass
`src/planner.js`, `src/schedulediff.js` (new), `src/sourcecheck.js` (new), `src/dashreport.js`, `src/onboarding.js`, `src/usecases.js`, `src/checks.js`, `src/timeline.js`, `src/flowbuilder.js`, `build.mjs`, `public/_headers`, `vendor/tesseract/*` (new, ~11 MB, loaded only when a scanned page is met), tests (`msa_ui`, `schedulediff_ui`, `sourcecheck_ui`, `brd_edit_ui`, `dashreport_logo_ui`, extended `dashreport_ui`, `extras_ui`), fixtures (`msa_mixed.pdf`, `msa_scanned.pdf`), `docs/`.

## Known limits / needs a human
- OCR is English only, accuracy depends on scan quality; items read below 70% confidence are forced to *Uncertain*. At most 60 pages are OCR'd per upload (others are reported as skipped).
- Schedule regeneration groups new modules by dependency tier (portfolio → people → assets → inventory → operations) and puts new sessions after the last dated session; it does not know customer availability. New foundational sessions are therefore dated after sessions that depend on them and the diff warns about that — the team should reorder.
- Excel workshop plan is not auto-regenerated by the diff; after applying, use the existing Export tab.
- Project manager / stage / BRD filters are limited as described in 8b.

## Final test run (this workspace, after the last code change)
| Suite | Result |
|---|---|
| Syntax check of every `src/*.js`, `server/*.mjs`, `build.mjs` (`node --check`; the repo has no linter) | clean |
| Production build `node build.mjs` | succeeds |
| `api_smoke` (fresh DB) | 81 / 81 |
| `e2e_full` | 64 / 64 |
| governance 14, onboarding 25, onboarding_tool 18, timeline 20, delivery 12, howto 21, templates 28, contract 21, usecases 20, extras 22, form_canvas 4, flow_edit 12 | all pass |
| dashreport 44, dashreport_logo 17, msa 17, schedulediff 20, sourcecheck 13, brd_edit 7 | all pass |
| office_open (server started with `OFFICE_OPEN_MODE=1`) | 13 / 13 |

Not tested: OCR on languages other than English, real customer MSAs (only synthetic fixtures `msa_mixed.pdf`, `msa_scanned.pdf`).


## Update 20 Oct (final)
- **Guide learning UI** now 11/11. The only failure was a console 403: customers requested the onboarding section while that portal tab was off. Customers now read the allowed-sections list first (`src/core.js`). Server permissions unchanged.
- **Office-open UI** 13/13 (test waited for the tool iframe too briefly; wait added).
- **Inventory Request → Create Quote**: no such button exists in the package. It is already listed in the State Flow Builder as a requested action ("expected disabled"), with *Capture as proposal*. Awaiting the team lead's confirmation; nothing invented.

## Update 20 Oct (UI refresh #20, requested by user)
- Colour direction changed from violet to **Facilio blue + pink** at the user's request, with depth: shadowed cards, KPI tiles with gradient and accent bar, gradient primary buttons, blue top bar, bolder headings. Bundled **Inter** font (`vendor/fonts`, SIL OFL).
- **Facilio web-tab icons** (from icons.facilio.com, the CDN behind icons.facilio.run) on every sidebar group and menu item, bundled in `src/ficons.js`.
- Excel Data Onboarding: **Open in new tab** button; New project button width fixed.
- Animation (icon-animator.facilio.run): not yet applied; needs the chosen animation exported.

## Update 20 Oct (Unified MSA, contract and workshop planning)
New sidebar entry **Contract & Workshop Planning** (`src/msaflow.js`), six steps over the existing data; the original Know Your Contract, Scope and Requirement Session Planner screens remain.
- **Upload & verify**: PDF/Word/text validated (empty, corrupt, encrypted, unsupported, no text → Failed, nothing filled in); page count, text/OCR/unreadable pages, warnings, page preview. States: Uploaded / Processed successfully / Needs review / Failed.
- **Contract**: parties, reference, signed/effective dates, term, renewal, termination, notice days, payment days, obligations and value read from the text, each with page and section; status Extracted / Verified / Uncertain / Missing; edit, verify, then *Apply to Know Your Contract* (confirmation lists anything it overwrites). Value is shown but never applied.
- **Scope**: items confirmed / rejected / flagged with page and section; contractual items kept apart from team-added assumptions; exclusions, deliverables, customer responsibilities and assumptions found in the MSA can be pushed to the Scope page with their MSA page.
- **Sessions**: *Propose sessions from confirmed scope* (marked Proposed, with the scope lines and page that justify them; never duplicates or overwrites); add, edit, reorder, merge, split, delete.
- **Schedule**: the workshop-plan template as an editable spreadsheet built from the sessions. Cell edits update the sessions (stable hidden Session ID column; invalid dates, times and durations rejected and restored), and session edits update the sheet without a reload; added rows add sessions, removed rows cancel them.
- **Finalise**: checklist, finalise/reopen; a later scope change shows a warning and does not touch the finalised schedule.
- Fix: workshop-plan dates were written as local midnight, so they showed one day early for users east of UTC (e.g. India). Now UTC.
- Tests: `tests/msaflow_ui.mjs` 46/46; msa 17/17, e2e 64/64, api 81/81.
- Limits: the attached prompt ended mid-section 8, so anything after “Avoid recursive update loops” was not seen. Contract extraction uses wording patterns; unusual wording is shown as Missing rather than guessed.

## Sidebar consolidation and navigation fixes (#21)
- **Project sidebar** is now exactly: Project Overview, Contract, Kick-off Deck, Project Plan, Plan Timeline, Customer User Guide, Data Onboarding, Dashboard Gallery. Dashboard Report and Delivery unchanged.
- **Contract** (`src/msaflow.js`) is the single parent for Know Your Contract, Scope, the Requirement Session Planner and the MSA workflow. Steps: 1 Upload MSA, 2 Review contract (Extracted details | Know Your Contract), 3 Review scope (Review MSA scope | MSA scope vs Facilio modules | Scope document), 4 Plan sessions (Proposals & order | Session list | Module distribution | Attendees | Schedule changes), 5 Review schedule (Live schedule | Excel preview & saved copy), 6 Finalise & export.
- Original screens are embedded, not copied (`V.contract.html()`, `V.scope.html()`, `V.plannerPane(tab)` from planner.js). Same data stores (`planner`, items `ctr*`, `scope`).
- Old routes (`contract`, `scope`, `planner`, `msaflow`, `#/p/<id>/planner`, links with `plTab`) are redirected by `go()` to the matching step and sub-tab for Facilio users. Customer views are unchanged.
- **Sidebar scroll**: root cause was the whole shell being rebuilt on each render, resetting `.sidebar` scrollTop; the position is now carried across renders. Groups toggle (the group with the active page stays open); parent of the active page is solid Facilio blue, the active page light blue.
- Tests: new `tests/sidebar_ui.mjs`; `tests/lib.mjs` nav falls back to `FWBViews.go` for routes no longer in the sidebar.

## Org package ZIP and state flow XML import (#22)
**Org package ZIP**
- Audit with a real org package (org 400000077, 78 component files, 19,283 records, 37 MB of XML): the existing parser already read modules, fields, forms, form rules, state flows, transitions, approvals, roles, apps/tabs, rules, notifications, buttons, SLAs, relationships, parties, email templates, dashboards, reports and functions. Counts matched the XML record for record (modules 498 = 462 in MODULE.xml + 36 system modules that forms reference but MODULE.xml omits, reported as gaps).
- **Gap found and fixed**: 42 component types (master data, categories, priorities, ticket types, PM frequencies, global variables, named criteria, work permit types, home pages, app layouts, view groups, readings, …) and the 1,900 module triggers were not read at all, and VIEW / PAGE_LAYOUT / DASHBOARD_WIDGET were not even counted per module. They are now read (`catalog`, `triggers`, `viewCounts`, `moduleSummary` in the baseline). Secret-looking values (keys, tokens, passwords) are replaced by `[hidden]`; e-mail addresses and phone numbers are still stripped before anything is saved.
- **Project setup from a package**: New project now has an optional "Facilio org package (.zip)". After the project is created the package is loaded into it. The same loader is used by Project Settings → Configuration source.
- **System vs custom modules**: system modules keep their names across orgs and are matched by name; custom modules are listed separately. Loading a package reports how many system modules matched, which custom modules are new or gone, and which workshop proposals refer to modules the package does not have (kept and flagged, never deleted).
- **Package contents** (Project Settings → Configuration source): every component type with record count, what it is used for and how it was read, master-data lists, triggers by module.
- A ZIP that is not an org package is refused with a clear message and leaves the configuration unchanged; a package with one broken XML file still loads and reports the broken file.
- Limits: PAGE_LAYOUT, VIEW and DASHBOARD_WIDGET are counted per module but their layout content is not interpreted. Script bodies are not interpreted. Custom proposals on a custom module that the new package lacks are reported, not remapped automatically.

**State flow XML import** (State Flow Builder → Import from XML)
- Accepts any mix of STATE_FLOW / STATE_TRANSITION / TICKET_STATUS XML files (identified by content, not file name) or a package ZIP. Shows the flows found, lets the user pick which to import and which project module to build them for, and lists problems (invalid XML, no flow records, transitions whose flow is missing, states with no status record).
- The flow is added as a **proposed** stateflow built exactly as the XML defines it: states and their positions, transitions, type, performers, conditions, validations, actions, portal flags, comment-required. Roles not found in the project become proposed roles. The project's own configuration is not changed.
- The imported flow is edited like any other; the change summary and the BRD are built from the workshop data, so they follow every edit (tested).
- Not supported: a "converted file" other than Facilio XML (for example a spreadsheet or JSON). Tell me the format if you need one.
- Tests: `tests/package_ui.mjs` (synthetic package built in code; no customer data committed).

## #23 Super admin and admin panel
- Super admins are real accounts whose email is in `SUPER_ADMIN_EMAILS` (default `dinesh.r@facilio.com`). They see and open every project (owner rights) and use the **Admin** panel: all projects (members, files, storage, customer access, open questions), archive/restore, project members, user accounts (disable/enable) and an activity log.
- Admin access now comes from the Microsoft sign-in on facilio.work and the super-admin list in `work/server/api.mjs`; the earlier setup-code sign-in was retired.
- Routes: `/api/admin/{setup,overview,users,users/:id,projects/:id,projects/:id/members,audit}`. Tests: `tests/admin_ui.mjs`, `tests/admin_open_ui.mjs`.

## #24 Facilio-style sign-in page and opening animation
- Sign-in page restyled (dark navy panel, wordmark, headline, skyline illustration, rounded white card). Sign-in methods are unchanged: guest access, email and password, create account, customer access. No Apple, Google or Microsoft buttons.
- Opening screen (`src/intro.js`): plays `public/brand/intro.mp4` (logo wipe), then tagline, loading line and drifting brand squares, then wipes up to the sign-in page. Once per browser session; skipped for reduced-motion and automated browsers (`?intro=1` forces it, `?nointro` disables it). Falls back to an animated still logo if the video cannot play.

## #25 UX polish, sign-out, AI-FM style animation
- Sidebar footer **Sign out** button (works in no-login mode too: shows the sign-in page, with "Continue to the office workspace" to go back).
- Journey Contract → Workshops → Requirements → BRD → UAT → Go-live shown in the opening screen and on the sign-in page.
- Sign-in scene: drifting colour orbs, pulsing network graph, AI typing line, twinkling skyline windows, animated form fields, shimmer button, floating glass cards on wide screens (1700px and up).
- Modern pass: navbar with wordmark, projects hero with greeting and search (over 3 projects), project cards with initials and hover lift, friendly empty state, boot loader, toast and drawer motion, focus rings.

## #26 Opening screen v2
- Video blended onto the stage (removes the faint box around the logo), module pills scrolling along the top and bottom, a rising skyline with twinkling windows in Facilio colours, a colour bar, rings and glow, and a pink / teal / navy curtain wipe into the sign-in page.

## #27 Admin console (dashboard, projects, users, access, activity)
- Roles: **Platform owner** (SUPER_ADMIN_EMAILS, default dinesh.r@facilio.com), **Admin** (sees and manages every project and account, cannot change access) and **Sub admin** (read-only: sees everything and can open projects to look). Grants are stored by email in `admin_grants` (migration `20261022120000_admin_grants.sql`); granting creates the account with a one-time temporary password, which the person changes from "Change my password".
- Dashboard: portfolio KPIs, delivery pipeline (Contract to Go-live), project health, new projects per month, platform activity per week, needs-attention list, recently active, files by type. Projects section: search, stage and health filters, CSV export, per-project insight drawer (stage, sessions, requirements, flows, actions, RAID, questions, BRD, team, files, activity).
- Tests: `tests/admin_ui.mjs` (55 checks incl. role enforcement) and `tests/admin_open_ui.mjs`.

## 28. Roadmap introduction after sign-in + richer projects home
- `src/roadmap.js`: full-screen 5-scene product story (about 22s) shown after authentication and before the home page, for team members and customer/guest access alike. Skip introduction, Continue to Workspace, progress segments, Esc/Enter keys, reduced-motion (static final scene), wide and narrow layouts. Straight SVG lines only; Facilio colours; no data is read, so nothing internal can leak.
- Hooks in `shell.js`: sign-in, sign-up, guest, guest key and customer access go through `gate()`. Customers then land on their project, team on the project list. A page refresh with a live session never replays it. In open mode it shows once per browser session.
- Persistence: "Don't show this introduction after sign-in" sets localStorage `fwb_roadmap_off`; replay is always available from the user menu and the "Watch the introduction" button on the home page.
- Automated browsers skip it unless the URL has `?roadmap=1`.
- Home page: stats strip, delivery-journey strip, navy-to-blue hero. Create Project and cards unchanged.
- Tests: `tests/roadmap_ui.mjs` (28), `tests/roadmap_customer_ui.mjs` (6).

## 29. Simplified access model
- Facilio team: with ALLOWED_EMAIL_DOMAINS set (live: facilio.com) sign-up needs only a company email + password, no code. Without the setting the team code is still required. Note: email addresses are not verified, so the domain check is a gate, not proof of identity.
- Guests/customers (one access type): name + project access code only; the project comes from the shared link, or from the code alone when exactly one project matches. They only get the customer pages; admin and project-list APIs stay refused.
- The team-code private-workspace guest tab is hidden in the UI (API route unchanged).
- Tests: tests/access_ui.mjs (12, run with ALLOWED_EMAIL_DOMAINS=facilio.com).

## 30. Private invite link for customers
- Project Settings → Members & customer access: "Create invite link" generates a random code and shows `…/#/c/<projectId>~<code>` once (the code part lives in the URL fragment, which is never sent to the server in a request). Customers open it and enter only their name; or paste the link into the login page's "Invite link or access code" field. Creating a new link replaces the old code. Manual code remains available under "Or set your own access code".
- Tests: tests/invite_link_ui.mjs (6).

## 31. Roadmap and intro illustrations
- Supplied illustrations are stored as small webp files in `public/brand/art/` (a1–a9; a8 and a9 are not used yet). Roadmap: an illustration panel beside the diagram changes per scene (float, halo, two floating labels), soft animated Facilio-colour backdrop, data pulses along the connecting lines, a one-time colour burst on the last scene. Intro: two illustrations fade in either side of the logo on wide screens. Hidden on phones; all motion off with reduced-motion.
- Licence: the stock illustrations were supplied by the project owner; confirm their licence covers use in a customer-facing app.

## 32. Speed: one request to open a project, indexes, smaller download
- `GET /api/projects/:id/open?sections=…&kinds=all` returns project, members, documents and records in one request (was ~18). The client falls back to the old requests if it fails. The reference configuration downloads in parallel and is warmed while the project list is shown.
- Migration `20261022150000_perf_indexes.sql` (project_members(user_id), projects(archived, updated_at), audit_log(at), app_sessions(expires_at)); expired sessions and old login-failure rows are purged now and then; the admin role lookup is memoised for 20 s per server instance (a revoke can take up to 20 s on another instance).
- Build minifies JS and CSS with esbuild (falls back to readable output; FWB_NO_MINIFY=1 to disable).

## 33. Opening screen: moving pieces restored
Top: two opposite-direction module chip rails, drifting clouds. Bottom: rising skyline with blinking windows, data packets on a lane, floating squares. Sign-in slide 5 (a9) replaced with the user's browser-design illustration. Reduced-motion disables all of it.

## 34. Show/hide password
src/pwtoggle.js adds an eye button to every password field (sign-up, sign-in, admin, drawers) via a MutationObserver; ids and default type=password unchanged. tests/pwtoggle_ui.mjs (8).

## 35. Opening screen v5 and Remove user
Opening screen redesigned as a product scene (top bar, two module rails, hero with live 6-step stepper, two floating sample cards, skyline of module cards with dashed arc, bottom bar with Get started and Skip; 8.2s). Admin: DELETE /api/admin/users/:id plus Remove button (sessions, memberships, admin grant removed; email freed; owner/self protected). tests/admin_remove_api.mjs (15).

## 36. Admin dashboards
Dashboard now has five views: Overview (existing), Delivery, Customers, Team & usage, Quality & records (GET /api/admin/insights plus client roll-ups: progress, end dates, idle days, customer roll-up, sign-ups, daily activity, heatmap, owner workload, question status and response time, record mix, completeness, storage growth). admin_ui now 61 checks.

## 37. Several BRDs per project (phase 1)
brddoc.list registers BRDs (main plus typed BRDs: core, service desk, ERP, agent-run). Each has name, type, module scope, external system and direction; per-BRD edits, status and exports under brddoc.docs[id] (main keeps the legacy top-level fields); logos shared. BRD tabs, New BRD / BRD settings drawer, delete. Integration BRDs add 'Integration scope & interface specification' (systems, modules exchanged, field mapping from mandatory fields, technical details to confirm); agent-run adds 'Operating model: agents & rules'. Export file names include the BRD name. tests/brd_multi_ui.mjs (17). Next: contract (MSA) as the source of truth for integrations, region and scope; several contracts / CR addenda; schedule by BRD and audience.

## 38. Contracts & Integrations register (multi-contract source of truth)
- New view `src/contracts.js` (Project menu, consultant only): original MSA plus later integration MSAs, approved CRs and other contracts, each with type, status (draft / approved / superseded), reference and date. Stored in `planner.contracts[]`; the original MSA is shown automatically and becomes a record when first worked on.
- Facts per contract: integrations (system, what it serves, direction), cloud region, other terms. `V.extractFacts` reads every page (rule based, no AI) and keeps page and section; extracted facts start as "To review". The team can add, edit, confirm, reject and restore facts; team facts are labelled "Added by team". Both count equally once confirmed. Superseded contracts are left out.
- BRDs: the form offers the systems named in the contracts; integration BRDs cite "Contract basis" and the cloud region. Each BRD remembers the facts it was built on; when confirmed facts change it shows a flag listing the changes, and "Review and issue an updated BRD" records a new version with a change note in the version history.
- Extra contract files upload under the existing `msa` file category (no server change). Test: `tests/contracts_ui.mjs` (17). Not yet deployed.
- Next (phase 3): tag workshop sessions by BRD and audience, audience-filtered view, agenda templates per BRD type, invite external vendor people by link.

## 39. Workshop schedule by BRD and audience
- `src/schedaud.js`: each session can be tied to a BRD and to audiences (Customer team, plus an "<System> team" for every external system named in a BRD or contract, plus custom). No audience = everyone.
- Agenda templates per BRD type (service desk, ERP, agent-run; core uses the existing module topic suggestions) fill topics, preparation and participants and tick the vendor audience.
- Team session list: BRD and audience tags and BRD / audience filters. Published schedule carries BRD and audience; the customer Workshop Schedule has a "Showing sessions for" picker (opens on `?aud=` if present). It is a view filter, not access control.
- No meeting links: meetings run in Microsoft Teams; Teams transcripts go through the existing Transcripts section into the requirement register.
- Test: `tests/schedaud_ui.mjs` (14). Not deployed.

## 40. Client version of the roadmap introduction
- `src/roadmap.js` picks client wording when the signed-in user is a customer: scenes ("Your project, all in one place" ... "Welcome to your project"), cards (Your contract, Scope, Workshops, Requirements, Project plan, Your guide), steps (Understand, Review, Confirm), art labels and the button "Continue to your project". Team and guest accounts keep the team story. Same animation and timing. Tests: `roadmap_customer_ui` (10), `roadmap_ui` (28).

## 41. Templates and configurable workspace (24 Oct 2026)
- Server: `/api/templates` (list, create, versions, publish / retire / reopen, delete drafts). Org templates are published only by an Admin; drafts are visible to the author and admins. AI runs accept a `templateId` and follow its structure.
- Client `src/templates.js`: Templates page (Administration) and Workspace & Layout page (rename, hide, drag or arrow reorder, move between groups, custom pages, presets, save as template). Layout is stored in the `workspace` document section; customers keep their own menu.
- Roadmap: `docs/IMPLEMENTATION_ROADMAP.md` now holds phase status and the assessed requirement for customer-specific configuration inputs (custom modules, module relationships, connected apps and tabs) as phase 5b, with reuse, priorities, dependencies and acceptance criteria. Not built yet.

## 42. Org-package analysis (phase 5, 24 Oct 2026)
- `src/pkganalysis.js`: Package Analysis page (Configuration group): counts, checks (custom module without purpose, tab, flow or role access; relationships and lookups to modules not in the package; buttons using unknown connected apps; enabled apps with no tabs), custom module details, relationships, apps and tabs, connected apps, CSV export of findings.
- A compact digest (about 10 KB) is saved in the `config_digest` document (on package load or with "Update AI context") and added as the first source of the existing AI tasks (gaps, uat, ftrrows, guide, config, handover) plus a new `pkg` task ("Analyse with AI"). No new AI workflow.
- AI reliability: the open model times out on large prompts, so the server uses a smaller prompt for it (and retries once with a shorter one); Claude via `anthropic_api_key` keeps the full size. Error text now shows the cause.
- Next: phase 5b registers (relationships, apps and tabs, custom module descriptions) as in docs/IMPLEMENTATION_ROADMAP.md.

## 43. Configuration Inputs (phase 5b, 24 Oct 2026)
- `src/cfginputs.js`: Configuration Inputs page (Configuration group) with Custom modules, Module relationships, Connected apps and tabs, and Checks. Custom modules come from the package, workshop proposals or manual entry and get a description block (purpose, usage, tabs, actions, statuses, workflow, roles, notes, files). Relationships and apps (with tabs) are structured records with free text and files. Import from the loaded package or a CSV / Excel table, always through a tick-to-import preview that skips duplicates and never overwrites.
- Server: record kinds `cmodx`, `cfgrel`, `capp`; file category `config_evidence`; the three kinds are the first sources of the existing AI tasks (gaps, guide, uat, ftr, ftrrows, config, handover, pkg) and of a new `training` outline task. No separate AI workflow.
- Tests: 10 server checks pass; verified live (describe a module, add a relationship, package previews 12 relationships and 17 apps, 38 checks); test records removed.

## 45. Motion Kit, FDS tokens and phase 7 (24 Oct)
- Motion Kit (docs/motionkit/animations.json; llms.txt/map.html/components.html read from fds-motion-kit.facilio.run): `src/motion.js` applies kit ids intro, list, drawer, modal. See docs/MOTION_AND_DESIGN.md.
- FDS: 13 values verified from the kit gallery (text, border, link/primary #1570EF) now drive the app's variables (end of styles.css); old brand blues #0a7aff / #0a5fe8 replaced by #1570EF. Other FDS aliases (backgrounds, spacing) have no published values yet.
- icons.facilio.run is an icon catalogue (static SVG at icons.facilio.com, 10 animated Lottie), not an animator.
- Phase 7 (partial): `src/traceability.js` — Traceability & Quality view (requirement → use case → module → build → UAT matrix with CSV export; completeness checks; lessons learned, kind `lesson`, also a source for the handover AI task). Verified live.
- Still open in phase 7: version comparison, org-level knowledge library (cross-project), AI context retention/superseded rules. Phase 8 (customer-facing read-only pages), isometric intro/roadmap artwork.

## 46. Project Roadmap (24 Oct)
`src/projroadmap.js`: Project Roadmap view with the 12 delivery stages as original isometric-style SVG tiles; each stage's status is derived only from recorded data (sessions, requirements, BRD review, build status, UAT, FTR workbook, guides, go-live checklist, hypercare, handover, closure) and the tile opens that stage's screen (keyboard accessible). Verified live; the animated introduction (roadmap.js) is unchanged and remains conceptual only.

## 47. Knowledge library (24 Oct)
Server `GET /api/knowledge` returns only lessons marked reusable from projects the signed-in person can already open; new tab "Knowledge library" in Traceability & Quality with search. Tested (server) and verified live; test lesson removed.

## 48. Phase 6 verified live (24 Oct)
User Guide Builder: created a guide, added a section, exported Word (10.8 KB) and PDF (19 KB), approval flow not exercised. Video to Guide: generated 3-second test video, loaded it, captured 2 frames, saved 2 screenshots + 2 transcript lines, AI draft returned grounded steps with the frame tags and listed missing information. All test records and uploaded frames were deleted.

## 49. Customer Introduction (24 Oct)
`src/custintro.js` (Administration): optional customer-safe introduction (welcome, objectives, modules in scope, 12-stage roadmap with recorded status, approved guide titles) with tick-to-include, live preview and export as one standalone HTML file. facilio.work only admits Facilio staff, so customers receive the exported file. Stored as project section `custintro`. Verified live (export 3.4 KB, no internal content).

## 50. Template version comparison (24 Oct)
Templates drawer: "compare with v(n-1)" shows a line diff of two versions (added/removed lines). Verified live with a temporary template (removed).

## 51. Final phase, part 1 (fonts, buttons, sidebar, isometric journey, colour restraint)
- Fonts: Roboto (vendored, latin variable) + token scale (`--fs-*`); 21 duplicate `.btn` rules removed; one canonical button block (primary/secondary/tertiary/destructive/icon; compact/standard/large; hover/focus/pressed/disabled/loading/success/error). FDS publishes no button dimensions, so `--btn-*` tokens are the app's own and configurable.
- Destructive actions: `src/guards.js` wraps seven delete handlers in a confirmation dialog. Static audit: 649 `data-act` actions, none without a handler. Per-button live exercising of every action was NOT done.
- Sidebar: NAV regrouped in lifecycle order (Kick-off, Workshops, Requirements, BRD, Configuration, UAT + Go-Live, FTR/KPI, Training, Hypercare, Handover + Closure). All items and routes kept; saved workspace layouts keyed by the old group names may need re-ordering in Workspace & Layout.
- Isometric journey (`src/journey.js`, original SVG+CSS, no library): platform assembles in layers, 12 modules appear, connectors draw, hover/focus detail, click opens authorised pages. Used on the login panel, the homepage, project overview (team: progress from project records) and customer home (progress only from the published plan). Mobile/tablet use a connected tile list. Reduced-motion supported. Intro overlay plays after the existing introduction (`V.isoIntro`).
- Colour: flat surfaces, neutral borders/shadows, brand blue/navy only; coloured glows and blur blobs removed via a final CSS layer. Provisional values are centralised in `:root` (`--brand`, `--brand-navy`, `--line`, `--shadow-*`).
- Not done: performance and security review, AI-context "superseded" rule, FTR import mapping/templates, remaining Motion Kit animations, six-step strip in the opening animation (`intro.js`), customer-account live test (no customer account available).


## 52. Final quality pass (24 Oct 2026)
- **Branding:** favicon now brand blue (was pink); description, Open Graph and theme-colour metadata added; package name/description, onboarding-tool bridge comments and CSS header say Delivery Studio. The facilio.work app was renamed from `requirement-workshop-builder` to `facilio-delivery-studio` (24 Oct 2026, new URL https://facilio-delivery-studio.facilio.work; the old URL no longer works). Kept on purpose: the repo name (needs your confirmation), historical notes in this file, and internal identifiers (`FWB`, storage keys).
- **Workspace depth layer** (end of `src/styles.css`, tokens `--ws-*`): tinted workspace, sidebar, tab bar, card headers, table heads, form panels, overlays headers and empty states; white kept for content surfaces. Phone: navbar no longer overflows; journey list tiles no longer clip.
- **Motion Kit:** popover, tab underline, checkbox/switch applied; the rest have no matching component (see docs/MOTION_AND_DESIGN.md).
- **Ecosystem + AI animation** (`src/ecosystem.js`): isometric platform kept as anchor, eight Facilio product-area panels (four on phones), connectors drawn from measured positions, rotating AI moments (input, assistant, draft output). Every moment maps to an AI task the app has; no figures shown. Used in the intro overlay (team or customer wording), the login panel and the customer invitation link screen (generic, nothing project-specific). The 12-stage strip sits above the stage.
- **Customer preview** (`src/custpreview.js`): owners can "Preview as customer". Customers and guests cannot sign in on facilio.work (server refuses), so this is a client-side simulation: customer menu, customer-released sections only, all writes blocked, exit returns to the staff view. Server-side authorization is unchanged and still treats the caller as staff.
- **Intro:** stacking guard (a second intro cannot open on top of the first); six-step strip relabelled to the lifecycle.
- **Not done / open:** live per-button exercise of every action; performance work beyond the loading states; a real customer sign-in (platform limit); invitation links cannot be validated before sign-in on this platform, so the invitation screen stays generic; section 7 of the latest brief (website URL / facilio.work rebranding) was cut off in the attachment and the slug has since been renamed.

## 53. Opening page, ecosystem animation, rename, write lock (build 39)
- App renamed to facilio-delivery-studio (https://facilio-delivery-studio.facilio.work).
- New opening page (src/intro.js, `.intro.v6`): branding, one-line intro, 12-stage lifecycle strip, isometric book + 8-module SaaS ecosystem + AI strip, Get started. Checked live at phone width: 8 panels, 0 overlaps, Get started closes it and reaches the welcome screen.
- Same ecosystem stage on login / invitation / roadmap intro (src/ecosystem.js).
- Per-record write lock on the server (withLock) plus concurrency test; rapid-click guard in the dispatcher.
- Customer preview (read-only) for consultants (src/custpreview.js).
- Not verified: real guest/customer sign-in (impossible on facilio.work), cross-instance write races, reduced-motion in a browser.

## 54. Builds 40-44 (cinema, Lottie, home, admin theme, Outlook, AI providers)
- Cinematic opening and post-login roadmap (src/cinema.js), original Lottie illustrations (tools/make-lottie.mjs, tools/make-scenes.mjs), isometric journey moved to the Project Roadmap page.
- Home redesigned (wider layout, projects first, Facilio-styled search); Admin themed in every tab; control consistency (fonts, backgrounds, heights).
- Get started now sweeps three brand panels, then the sign-in page assembles. Journey scene rebuilt: tilt-in cards, a spotlight walks card to card with a one-line description, connectors fill.
- Outlook (docs/OUTLOOK_FEASIBILITY.md): a native inbox is NOT available (no per-user Graph token on facilio.work). Built Compose in Outlook and Open Outlook (src/outlook.js) on the weekly digest and reports; existing mailto/.eml/copy kept; never sends.
- AI providers: DeepSeek stays default. Claude is optional, chosen per task in the Generate drawer or as the org default (Admin > AI & Outlook). Key is the owner-managed secret anthropic_api_key (apps cannot write secrets), never returned or logged; masked status, connection test, explicit fallback policy with a notice on the draft, usage from provider-reported tokens only (no cost estimate). 14/14 server checks pass, including key-leak and fallback cases.
- Not tested with real credentials: Claude calls (no key set), any Outlook inbox. Compose links were unit-tested for encoding, long bodies and bad addresses but not opened in a signed-in Outlook.

## 55. UI, AI and export audit (27 Oct 2026)
- Full report: `docs/UI_AI_EXPORT_AUDIT.md`. Browser checks live in `tests/ui/` (`npm run preview`, `test:ui`, `test:exports`, `test:smoke`).
- One button scale (40 / 36 / 32 / icon), one field height (38), one drawer/dialog structure; older conflicting rules removed from `styles.css`.
- Projects | Admin switch in the top bar; "Sign out" everywhere; project menu button below 860 px; keyboard access for every clickable row, card and tile.
- AI: default follows the key, fallback uses a DeepSeek-sized prompt, report drafts ask before replacing text, admin AI panel no longer sticks on Loading, template kind checked.
- Exports: the two Word exports are real .docx (were HTML saved as .doc); image types, sheet names, onboarding template loading, hidden ID column, unedited plan download, library loading fixed. 26/26 export content checks pass.

## 56. Road journey, Process Whiteboard, rate limits and security fixes (27 Oct 2026)
- Road journey ("See how Delivery Studio helps", team and customer sign-in): opening camera, six stages drawn from real features (workspace, workshops to signed BRD, configuration and state flows, AI drafts with approval, tickets and progress, go-live and handover), the relationship line (Delivery Studio organises the implementation; Facilio is the platform teams use every day), and the same liquid exit as the tree intro. Customer invitation links keep their address.
- Process Whiteboard (`src/whiteboard.js`, menu "Process & State Flows"): named boards per project, notes and shapes, connectors with labels, select / marquee / group / align / duplicate, grid and snap, undo/redo, fit/reset, autosave; "Add state flows" places editable copies of the project's real flows (originals unchanged); "Read a flow from an image" (Claude vision, validated on the server, review table with uncertain steps marked, optional reference image layer); PNG export of the board or selection; Miro link saved as a reference only (no sync).
- State Flow PNG export: whole diagram at 2x, size capped safely, named after module and flow.
- Rate limits on the server: per person, shared across instances, 429 with Retry-After (AI 40, flow image 15, AI key checks 15, uploads 200, tickets 60, Teams tickets 30, new projects/templates 30, mail sync 20, every change 2000 — per 10 minutes).
- Security fixes (SEC-01 to SEC-19, SEC-27): uploaded spreadsheet and Word colours validated, whiteboard records normalised, Content-Security-Policy, web/mail-only links on page and server, CSV formula cells, .eml headers, bounded ZIP reading, project records patched under a lock, mail tag routing tied to the sender, sub-admins read-only for templates, draft template versions private, Teams messages to members only, server-only ticket source fields, last owner kept, onboarding cache cleared on sign-out, xmldom 0.8.15. Open items needing a decision or platform access: sign-off/approval rules on the server (SEC-20), checking uploaded file content (SEC-21), platform headers/WAF/backups. The full audit reports are kept outside the repository and the build, as requested.
- Tests: `npm test` (27 server groups incl. authorization matrix, rate limits, flow image validation), `test:security` (17), `test:csp` (all libraries under the CSP), `test:whiteboard` (22), `test:welcome` (14), `test:ui` (344 screens), `test:exports` (26/26), `test:smoke` (19). Browser suites were run with `node --import ./tests/ui/csp-watch.mjs …`: 0 CSP violations.

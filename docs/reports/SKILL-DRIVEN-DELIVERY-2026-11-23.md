# Skill-driven delivery: what exists, what is missing, and how it works (23 Nov 2026)

Answers requirement 4 (Claude skills management, skill selection and button-driven workflows). Everything below was checked against the files, not taken from a guide. Code changed with this report: `tools/build-impl-skills.mjs`, `work/server/_skills.mjs` (rebuilt), `work/server/_jobs.mjs` (`skillPlan`, `brief().skills`), `work/server/api.mjs` (`get_impl_skills` by job kind), `work/work.json` (tool text), tests in `tests/chat_brief.mjs` and `tests/connector_skills.mjs`.

## 1. The skills repository (`D:\facilio-impl-ai-skills`)

Local clone of the platform team's Bitbucket repo, level with `origin/main` (last commit 6 Nov 2026), owned by the implementation platform team. It holds 21 canonical skills (a folder with `SKILL.md` and `manifest.json`), three adapter layers and a repo checker.

| Skill | Version | Purpose | Runs in | Needs |
|---|---|---|---|---|
| facilio-impl-toolbox | 2026.07.06 | Launcher: menu from `menu.json`, hands off to a skill | All | Clone or Kenny |
| facilio-xml-knowledge | 2026.05.21 | Library: how to read each org package XML type | Loaded by others | none |
| ftr-generator | 2026.07.12 | BRD (+ package) to FTR xlsx | Cowork, Code | BRD, package |
| ftr-executor | 2026.07.12 | Runs an FTR in the live org, writes verdicts | Cowork, Code | Claude in Chrome |
| uat-guide-generator | 2026.07.26 | Customer UAT guide or workflow manual (5 styles) | Cowork, Code | FTR or BRD, package |
| facilio-org-configuration-assistant | 2026.07.11 | Answers config questions from package, Org Docs KB | Cowork, Code | facilio-config-data |
| facilio-configuration-builder | 2026.09.24 | Writes org config behind three confirmation gates | Cowork, Code | Facilio MCP |
| facilio-connected-apps-builder | 2026.08.01 | Library: builds and deploys Connected App widgets | Via builder | Facilio MCP |
| facilio-dashboard-builder | 2026.07.07 | Library: analytics dashboards | Via builder | Facilio MCP |
| facilio-script-builder | 2026.07.07 | Library: WorkflowV2 scripts | Via builder | Facilio MCP |
| facilio-script-optimizer | 2026.07.10 | Read-only script opportunities report | Cowork, Code | package |
| facilio-rules-optimizer | 2026.07.10 | Read-only automation (rules, SLA) report | Cowork, Code | package |
| form-package-to-connected-app | 2026.07.05 | Facilio form to Connected App form | Cowork, Code | package |
| connected-app-code-reviewer | 2026.07.03 | Level-1 widget code review | Cowork, Code | code or MCP |
| connected-app-deep-review | 2026.07.03 | Level-2 review (hidden in the menu) | Cowork, Code | code or MCP |
| org-knowledgebase-builder | 2026.07.11 | Implementation documents to the support Org Docs KB on SharePoint | Cowork, Code | SharePoint |
| support-ticket-responder | 2026.07.17 | Classifies and answers support tickets from the org knowledge | Cowork, Code | KB, config data |
| onboarding-data-converter | 2026.06.01 | Customer data to Facilio import files | Claude Code | Python |
| spreadsheet-transformer | 2026.07.11 | Large Excel/CSV changes by local Python | Claude Code | Python |
| facilio-import-runner | 2026.07.26 | Runs the import in the live org (Data Loader) | Claude Code | MCP import connection |
| account-deep-dive | 2026.11.06 | Account or prospect report (sales / account side) | Cowork, Code | SQL Lab, Clari, Salesforce, PostHog |

Categories: **testing** (ftr-generator, ftr-executor, uat-guide-generator), **configuration** (configuration-builder and its three libraries, form-package-to-connected-app), **review and advisory** (org-configuration-assistant, rules and script optimizers, two code reviewers), **data onboarding** (converter, transformer, import runner), **handover and support** (org-knowledgebase-builder, support-ticket-responder), **launcher and library** (toolbox, xml-knowledge), **account** (account-deep-dive).

### Guide against reality (drift found)
- `README.md` and `AGENTS.md` do not describe **facilio-import-runner** or **support-ticket-responder**, though both are on the menu. Neither has its own adapter; they are reached only through the toolbox.
- The repo's own check fails (`check_repo.py --allow-known`: FRONTMATTER) on **facilio-dashboard-builder**: it counts 1029 characters. Parsed as YAML the description is 1020, under Claude's 1024 limit, so the checker over-counts folded text. Either fix the checker or shorten the text.
- `menu.json` still says version 2026.07.11 although account-deep-dive was added in November. The menu version therefore cannot signal changes, so the Studio catalog now keeps each skill's own manifest version.
- `deprecated/` holds older **ftr-generator** and **ftr-executor** folders with the same names as the live ones. Anyone who zips or copies by name can pick up the old one.
- The local clone has two untracked items at its root (`Claude outputs/`, `onboarding-data-converter.zip`).
- Studio's copy of the catalog (`work/server/_skills.mjs`) was missing account-deep-dive. Now rebuilt.

These are in the platform team's repository. They were reported here, not changed.

## 2. Personal and Studio skills

- **Studio skills** (`skills/` in this repo, served as ZIPs from `public/skills/`): facilio-solution-document-builder, guidebook-builder, video-to-user-guide, excel-analysis, demo-video, ui-mockup-video, video-editing, the remotion set, graphify, brag. The first three are delivery skills.
- **Claude's built-in file skills**: docx, xlsx, pptx, pdf (claude.ai and Desktop with file creation on).
- **This PC's personal skills** (`~/.claude/skills`): ftr-generator, ftr-executor and facilio-impl-toolbox are copies, byte-identical to the repo today. They will go stale after the next repo update; the toolbox route avoids that. Others useful for delivery are meeting-insights-analyzer, markitdown and excel-analysis, but they live on this PC only and are not distributed to the team.

## 3. How Claude finds skills (verified mechanics, not assumptions)

| Surface | Where skills come from | Does `D:\facilio-impl-ai-skills` load by itself? |
|---|---|---|
| Claude Desktop / claude.ai chat | Skills uploaded as ZIP (Customize > Skills) or shared by the organisation | **No.** A folder on disk is not discovered. |
| Claude Cowork | Same skill list, plus folders added to the task | Only through the toolbox, after you add the repo folder to the task. The toolbox then reads each `SKILL.md`. |
| Claude Code | `~/.claude/skills`, the project's `.claude/skills`, plugins | Only when that repo is the working folder (4 triggers in its `.claude/skills`), or through the toolbox. |

So a shared folder does not make skills available to anyone. Team distribution works today in two ways:
- **The platform repo:** each person clones it and installs only the toolbox, which reads the clone and keeps it fresh (`bootstrap/source_freshness.py`).
- **The Studio's own skills:** a ZIP upload per person.

A Claude Code plugin marketplace pointing at the repo would give one-command install and update for Claude Code users. It is not built.

## 4. Architecture: what does what

| Capability | Claude Desktop / Cowork / Code | MCP connector (`facilio-delivery-studio`) | Delivery Studio server |
|---|---|---|---|
| Run a skill | **Yes**, in the person's session | **No.** A connector exposes tools; it cannot run skills or call Claude. | **No.** It has no Claude; its own AI is a separate model. |
| Choose skills for a button | Follows the plan | **Yes, new:** a claimed job carries `skills.plan`; `get_impl_skills` answers by job kind | Holds the plan (`JOB_SKILLS`) |
| Start the work from a button | Picks it up: scheduled task `studio-job-queue` (every 3 min), or the optional watcher (instant, Claude Code) | `project_jobs` list, claim, progress, finish | Writes the job |
| Read project sources | Microsoft 365 connector (Outlook, OneDrive, SharePoint), Facilio MCP, local clone | Records, documents, transcripts, task packs | Stores them |
| Save the result | Calls `save_draft` / `transfer_write` | Stores as an unapproved draft | Keeps versions; a person approves |
| Copy to SharePoint | Not needed | — | `_sharepoint.mjs` mirrors every saved file into the project folder (built; the real tenant set-up is not done) |
| Long work, progress, resume | Reports progress at each step | `progress` renews the 30-minute lease; `needs_input` asks the person | A lapsed lease returns the job to waiting |

**The Generate BRD flow, as it works with this change:**
1. The person presses the button and the Studio writes a `draft_brd` job with the project and its org id.
2. That person's Claude claims it and receives the recipe, the allowed documents, the work standard and now `skills.plan`.
3. Claude reads the sources through the connector (contract, sessions, solution, minutes) and, where the recipe says so, from Microsoft 365.
4. It writes the BRD and opens each listed skill's `SKILL.md` at the step that skill serves.
5. It reports progress, then saves the BRD as a draft. The Studio versions the draft and mirrors it to SharePoint once that is set up.
6. A person approves it, and the job summary ends with "Skills used: ...".

Write once, into the Studio, and let the Studio mirror to SharePoint. This avoids two copies drifting. Each destination is checked on its own: the draft record in the Studio, and the SharePoint copy status in `_sharepoint.mjs`.

## 5. Button-to-skill map (37 job kinds; the source of truth is `JOB_SKILLS` in `tools/build-impl-skills.mjs`)

| Job (button) | Skills, in order (* = needed) |
|---|---|
| make_ftr (FTR report) | ftr-generator*, ftr-executor (only for a live run, needs Claude in Chrome), xlsx |
| build_solution_doc | facilio-solution-document-builder* (Studio skill) |
| make_guide | guidebook-builder, video-to-user-guide, uat-guide-generator, docx |
| change_guide | guidebook-builder, docx |
| make_handover | org-knowledgebase-builder, facilio-solution-document-builder, docx |
| fetch_hypercare | support-ticket-responder |
| solution_expert, update_solution, fetch_org_status | facilio-org-configuration-assistant (only when the org has a package) |
| pull_msa, check_msa, check_brd, pull_brd | pdf, docx |
| draft_brd | docx (no repository skill writes a BRD) |
| make_from_reference, apply_change | pptx, xlsx, docx |
| compare_solution, fetch_feedback, import_workshop_plan | xlsx (+ docx) |
| pull_clari, pull_transcript | docx |
| chat | the skills of the area the message is about (BRD, guide, kick-off, solution) |
| The other 15 (mail, flows, forms, findings, mockup and video imports, reports, workspace, backup) | none: the recipe is the whole workflow |

## 6. Your activity list against real skills

| Activity | Team skill that exists | What does the work today |
|---|---|---|
| MSA analysis, scope extraction | **None** | Studio recipes `pull_msa`, `check_msa` with `msa_extraction_save` |
| Requirements and traceability | **None** | Studio records and `get_requirements`; `ftr-generator` traces BRD to tests |
| BRD generation | **None** | Recipe `draft_brd` (+ docx); downstream ftr-generator, configuration-builder |
| Solution design | Partly: org-configuration-assistant (reads), solution-document-builder (as-built) | Recipes `solution_expert`, `update_solution` |
| Project plan, milestones | **None** | `make_from_reference` (+ xlsx), the plan pages |
| MOM | **None** in the team set | `get_mom_pack`, `save_minutes`; meeting-insights-analyzer exists on this PC only |
| Training documents | guidebook-builder, uat-guide-generator | `make_guide` |
| Training videos | video-to-user-guide | Comet for the video itself |
| UAT | uat-guide-generator, ftr-generator | UAT pages, `fetch_feedback` |
| FTR | ftr-generator, ftr-executor | `make_ftr` |
| Data onboarding | onboarding-data-converter, spreadsheet-transformer, facilio-import-runner (Claude Code only) | Onboarding page |
| Handover | org-knowledgebase-builder, solution-document-builder, support-ticket-responder | `make_handover` |

Main gap: the early-stage deliverables (MSA, BRD, MOM, plan, traceability) have no team skill. Their workflow lives only in the Studio's recipe text, which Claude sees only when it runs a Studio job.

## 7. What is next, and what needs a decision

1. **Done here:** per-job skill plans in every claimed job, `get_impl_skills` by job kind, per-skill versions, and a drift report each time the catalog is rebuilt (`node tools/build-impl-skills.mjs` prints new or updated skills, guide gaps and over-long descriptions).
2. **Decision:** turn the Studio's BRD, MSA, MOM and plan recipes into real skills (for example `facilio-brd-writer`, `facilio-msa-analyst`, `facilio-mom-writer`, `facilio-project-planner`), so the same method works outside the Studio. They could live in `skills/` here (ZIP per person) or go to the platform team's repo (their review and conventions).
3. **Decision:** ask the platform team to fix the drift in section 1 (two missing guide entries, the checker, `deprecated/` names).
4. **Set-up still pending:** the SharePoint tenant set-up (`docs/integrations/SHAREPOINT-2026-11-16.md`). Until then the Studio is the only destination.
5. **Optional:** a Claude Code plugin marketplace for one-command install of the team skills.
6. **Keep the catalog fresh:** after fetching the skills repo, run `node tools/build-impl-skills.mjs`, read what it prints, commit and deploy. Nothing installs or updates a skill automatically.

## 8. Not checked
- No real Claude session has claimed a job with the new `skills` field.
- The live app was not checked, and this change is not deployed.
- The Edge hand-off check (`tests/ui/claude-handoff-check.mjs`) was not run, since no page changed.
- `tests/claude_watch.mjs` could not run, because another session's live watcher held its port.

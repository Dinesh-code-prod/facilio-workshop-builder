# The Claude side of Delivery Studio: what is built (developer guide)

Written 5 Nov 2026 for the developer who takes over the Claude integration. The direction (roadmap E15 in [ROADMAP-REQUIREMENTS.md](../ROADMAP-REQUIREMENTS.md)): the Studio is the **visualization of the project** (stage tabs and layouts); Claude does the work and **pushes and pulls information through a gateway** that this repo provides. Nothing here calls the Anthropic API: Claude runs in each person's own Claude session (web, Desktop or Code) and reaches the Studio through the connector below.

## 1. How the pieces connect
```
person's Claude session  --(MCP, Entra sign-in)-->  https://mcp.facilio.work/facilio-delivery-studio
        |                                                      |  (platform turns work/work.json into this MCP server)
        | other connectors in the same session                 v
        |  Microsoft 365 (read only), Kenny code assist,    work/server/api.mjs  (one server function, runs as the signed-in person)
        |  Facilio connections MCP, Facilio Clari           |  project access, roles, limits enforced here
        v                                                    v
 reads files, org config, transcripts            ctx.db (records), ctx.files, ctx.teams (Otto DMs), ctx.llm (DeepSeek, no Claude)
```
- **The Studio server cannot read Microsoft 365, Meteor, Comet or Clari.** Claude reads them in the person's session and stores results in the Studio through the tools below. Details and limits of every connector: [reference/CONNECTORS-2026-11-04.md](CONNECTORS-2026-11-04.md).
- Every tool runs **as the signed-in person**: the same access rules as the web app (`projectAccess`), customers never reach team data, sub admins are read-only.
- **Hard platform limit: 40 MCP tools per app.** We are at exactly 40. Add a capability by folding it into an existing action tool, never by adding a tool.

## 2. Add the connector
Claude (web or Desktop): Settings, Connectors, Add custom connector, name `Facilio Delivery Studio`, address `https://mcp.facilio.work/facilio-delivery-studio`, sign in with a Facilio account. Claude Code: `claude mcp add --transport http facilio-delivery-studio https://mcp.facilio.work/facilio-delivery-studio`. After a deploy that changes the tool list, remove and re-add the connector (Claude caches tool lists). Fuller notes: [reference/claude-connector.md](claude-connector.md).

## 3. The 40 tools (from `work/work.json`; implementations in `work/server/api.mjs` and the `_*.mjs` modules)
| Group | Tools |
|---|---|
| Find and orient | `find_projects`, `portfolio_status`, `project_overview`, `connector_help` (tool groups and recipes), `get_impl_skills` |
| Read the project | `get_requirements`, `get_statements`, `get_open_questions`, `get_use_cases`, `list_record_kinds`, `get_records`, `get_document`, `search_project`, `recent_activity`, `project_changes`, `list_overdue`, `uat_summary`, `get_tickets` |
| Transcripts | `get_transcripts`, `get_transcript`, `search_transcripts`, `get_mom_pack`, `save_minutes` (confirm) |
| Prepare deliverables | `get_task_pack`, `get_review_pack`, `save_draft` (confirm; always an unapproved draft) |
| Hand-off (old buttons) | `get_handoff`, `submit_handoff_result` (used by the Open in Claude buttons, being removed stage by stage) |
| Push and pull engine | `transfer_read` (action list, get), `transfer_write` (begin, store, submit), `transfer_push` (push_begin, report, verify; confirm) |
| Contract to project | `msa_extraction_save`, `create_project_from_msa` (confirm) |
| Workshops | `session_questions` (action prepare, live) |
| Tasks | `my_tasks`, `send_task_digest` (confirm; Teams DM), `task_tracking` (action evidence, save suggestions) |
| Teams and tickets (Otto) | `list_projects`, `suggest_ticket`, `create_ticket` (confirm); tickets move to the Support Desk (E13) |

`confirm` = the platform shows the tool as destructive and Otto asks for a Confirm click.

## 4. Flows that exist
**Push and pull engine (the base of the gateway).** One **transfer** record per thing moved: direction (pull, generate, push), kind (msa, transcript, org_modules, brd, ...), source, destination, scope, status, immutable versions, evidence, audit log. Statuses: Not Retrieved, Retrieving, Retrieved, Draft Generated, Awaiting Review, Approved, Pushed, Synchronized, Failed, Requires Attention. **Claude cannot approve**: a project owner approves in the Transfers page. Pushed and Synchronized need evidence (a one-time nonce from `push_begin`, a receipt, a destination reference, the read-back sha-256) and are labelled "reported by Claude" because the Studio cannot see the destination. Duplicates return the same record; a changed source makes a new version; version 1 is never rewritten. Design: [reference/STEP1-PUSH-PULL-DESIGN.md](STEP1-PUSH-PULL-DESIGN.md). Code: `work/server/_transfer.mjs` (rules), `_transferapi.mjs` (routes `/api/projects/:id/transfers`, tools), page `src/transfers.js`.

**MSA to project.** Claude lists and reads the MSA with the Microsoft 365 connector, extracts it, calls `msa_extraction_save` (the "holding" space before a project exists); a person approves; `create_project_from_msa` creates the project and fills the contract and scope records. Code: `work/server/_msaextract.mjs`, `_msaapi.mjs`. Stage 1 is being rebuilt around this (E15, half done, see HANDOFF.md).

**Prepared questions and live matching.** `session_questions` builds workshop questions from the project's records (every question cites its source) and matches live transcript lines to them (never certain: possible or likely). Rules: `work/server/_sessionquestions.mjs`; page `src/workshop.js`.

**Task tracking and reminders.** `task_tracking` gives Claude the open tasks plus evidence and stores UNAPPROVED suggestions that a person accepts; `send_task_digest` and an assignment message send Teams DMs through Otto (needs the platform secret `teams_notify = on`). Code: `_tasksuggest.mjs`, `_tasksapi.mjs`, `_taskwatch.mjs`.

**Status reports (WSR and monthly).** Page `statusrep` (`src/wsr.js`, rules `src/wsrlogic.js`, tests `tests/wsr.mjs`): a report is a `rep` record (type WSR or Monthly) with the finished HTML in `html`. Build from the Studio is instant and uses the live records; Ask Claude writes a job `make_wsr` or `make_monthly` (recipes in `work/server/_jobs.mjs`), Claude checks the stages and the plan through the read tools and saves the HTML with `save_draft` (task wsr or monthly); a person previews it in a sandboxed frame and records it. No new tool.

**Generated customer HTML (no server).** Self-contained files with no external requests: kick-off deck, data onboarding page (`src/onbhtml.js`, return file checked by `src/onbreturn.js`), FTR checklist, UAT guide, workshop preparation, project plan (in progress).

## 5. Rules the integration must keep
Nothing is invented (every item carries an origin: contract, interpreted or assumed); a spoken statement never becomes an approved requirement; a person approves official records, pushes and anything customer-facing; never show success before the connected system confirms; no secrets in code, logs or answers; text from outside is marked `untrusted`; records are capped (128 KB per value, bigger ones are gzipped and split); a call may run 25 s.

## 6. The gateway for your tool (what to build next)
The base exists: the 40 tools above and the transfer routes. What a separate Claude-integrated tool needs to attach is **not decided**: either it connects as an MCP client to the connector (simplest, same access rules), or the Studio exposes a small authenticated HTTP surface over the transfer and record routes. Authentication is the platform's Microsoft sign-in (Entra); a service identity for a non-interactive tool is **not available today** (open question for the platform team). Keep it small: push (store a version), pull (read a record or transfer), status; approval stays human.

## 7. Not built, not verified, known issues
- No real Claude session, real MSA or real Microsoft 365 call has been tested against the live app. Teams DMs and Otto were never tried for real.
- The binary file path (presigned upload from Claude Code) and the folder mirror are designs only.
- Open issues from three independent reviews are listed in [reports/review-2026-11-05.md](../reports/review-2026-11-05.md); the server ones (partial project creation on retry, push evidence, storage growth, tool allow-list) matter most for this integration.
- The Stage 1 rebuild, the Mockup and BRD stage (org module import, in an unmerged branch) and later stages are in the roadmap E15.

## 8. Run the tests
`npm test` (41 suites, no network). The Claude-specific ones: `tests/transfer*.mjs`, `msa_extract.mjs`, `msa_project_route.mjs`, `prepared_questions_tool.mjs`, `task_suggestions.mjs`, `task_watch.mjs`, `connector_skills.mjs`, `claude_launch.mjs`. They run the real handler on a stand-in platform; the stand-in is in `tests/task_watch.mjs`. Deploy: [operations/DEPLOY.md](../operations/DEPLOY.md).

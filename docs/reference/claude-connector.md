# Claude connector

Lets a team member's own Claude read the projects they can open and prepare deliverables from them. It replaces the old Claude Desktop extension (`.mcpb`), which was removed on 2 November 2026.

- **Address:** `https://mcp.facilio.work/facilio-delivery-studio` (the app's MCP server on facilio.work).
- **Code:** tool list in `work/work.json`; implementation in `work/server/api.mjs`, section "Claude connector"; page side in `src/claudehand.js` and `src/projectguide.js`; Project Settings > Claude connection and Keeping the project.
- **Cost:** no API key and no per-use charge from Anthropic; the work counts against each person's own Claude plan. Hosting is the internal facilio.work platform.

## Adding it
1. Claude (web or desktop): Settings > Connectors > Add custom connector. Name `Facilio Delivery Studio`, address above, sign in with a Facilio account. On a Team or Enterprise plan an owner of the Claude organisation must allow custom connectors (or add this one for everyone).
2. Claude Code: `claude mcp add --transport http facilio-delivery-studio https://mcp.facilio.work/facilio-delivery-studio`, then `/mcp` and sign in.
3. Both the browser and the desktop app must be signed in to the same Claude account, or Claude shows "Account mismatch".

## Tools
| Group | Tools |
|---|---|
| Help | `connector_help` (what it can do, recipes for UAT, guides, issue tracking, status reports, gap checks) |
| Find | `find_projects`, `project_overview` (with progress, org id and org folder), `portfolio_status` (all your projects, counts), `get_impl_skills` (the Facilio implementation skills) |
| Read | `get_requirements`, `get_statements`, `get_open_questions`, `get_use_cases`, `get_tickets`, `list_record_kinds`, `get_records`, `get_document`, `search_project`, `recent_activity`, `list_overdue`, `project_changes` (since a date), `search_transcripts`, `uat_summary`. `get_records` returns the newest first and takes `open`, `overdue` and `offset`. |
| Prepare | `get_task_pack` (brd, uat, guide, ftr, gaps, workshop, golive, hypercare, handover, wsr, monthly, config, pkg, training, closure), `get_review_pack` |
| Write | `save_draft` (always an unapproved draft in Deliverables and AI) |
| Hand-off | `get_handoff`, `submit_handoff_result` (used by the Open in Claude buttons) |
| Teams | `list_projects`, `suggest_ticket`, `create_ticket` |
| Tasks and reminders (4 Nov 2026, roadmap E12) | `my_tasks` (your own pending tasks across projects), `send_task_digest` (a Teams direct message with pending tasks to you, or with `to: team` and a project to each member who has some; asks for confirmation; one per person per day; sends nothing while the secret `teams_notify` is not `on`, and counts only messages Teams accepted). Saving a task with a new owner also sends that person one direct message (same secret). Rules: `work/server/_taskwatch.mjs`, test: `tests/task_watch.mjs`. Not checked: a real Otto or Teams delivery. |

## Rules
- Every tool runs as the signed-in person through the app's own routes (project access, roles, limits); nothing is read that the person could not open in the app.
- Reads are compact and capped; use `detail: "full"` on one record when needed.
- Writes: `save_draft` makes an unapproved draft and a hand-off answer is shown as a preview that the person confirms. `save_minutes` makes a meeting-minutes record marked as needing review (a second save for the same transcript is refused). `create_ticket` (Teams) makes a real ticket after the person confirms in Claude. Text written by customers or other outsiders is marked `untrusted` in the answers that carry it.
- Pictures cannot go through the connector; the page offers Copy the image.
- Rate limit: 600 connector calls per person per 10 minutes.

## Open in Claude
With "I added the connector" ticked (Project Settings > Claude connection, or in the Open in Claude panel), the page stores one hand-off package on the server (task, context, files as text) and opens Claude with one short line that names the hand-off id. Claude calls `get_handoff`, does the task and calls `submit_handoff_result`; the page picks the answer up and shows a preview. Without the connector the page copies the full prompt (or puts it in the link when it fits) and the person pastes Claude's reply back.

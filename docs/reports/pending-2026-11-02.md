# Pending tasks and tests: BRD Draft, Process Whiteboard, Open in Claude

Branch `claude/vigilant-euclid-d9dc5f` (2 November 2026). Three commits, none pushed or deployed. For discussion later.

## Done on this branch (needs your check in the live app)
| Area | What changed | Commit |
|---|---|---|
| BRD Draft | Delete any BRD (confirm dialog), import Word/PDF/text/Markdown or a blank BRD, Word-style editing (bold/italic/underline, Enter for a new paragraph, add heading, bullets, table), shorter toolbar with a More menu, sign-off banner with one issue per line and "Fix this" links | `a60a479` |
| Whiteboard | Describe with AI: better prompt, relevant flows sent in full, one retry with a shorter request, result drawn in State Flow Builder look. Align and distribute work on whole flows, skip locked items, say when nothing can be done | `ddcb357` |
| Open in Claude | Clear "prompt copied, press Ctrl+V" message; extension package built with LF line endings; `handoff_mcp` test passes on Windows | `15f2c99` |

## Open questions for you
1. **Open in Claude with the extension.** Which step fails: Claude shows no Facilio tools, "hand-off expired", or Claude's answer never appears on the page? Is the "I installed the Claude extension" box ticked? Not reproduced here, so not fixed.
2. **Describe with AI says "The AI service could not be reached".** I could not read the live server logs. Please try the Al Moallam description again after deploy; if it still fails, note the time so the logs can be checked.
3. **Long prompts are not put in the Claude link** (limit about 6,500 characters encoded; Whiteboard prompts are about 10,000). They are copied instead. Do you want a higher limit (needs testing on real Claude Desktop and the web), or is copy and paste fine?
4. **Deleting the Main BRD.** It is generated from project data, so deleting it clears its edits and the tab is removed only when other BRDs exist. The last BRD left is cleared, never removed. Is that what you want?

## Not verified yet
- Word and PDF exports opened in real Word / a PDF viewer (checked only that the XML has the new text and bold; PDF export of new content not run).
- Import of PDF, Markdown and text files (only a Word file was tested). PDF tables and headings come in as plain paragraphs; scanned PDFs have no text.
- BRD banner "Fix this" links (not visible in my screenshot).
- Describe with AI against the real DeepSeek model (tested with a stubbed answer and a prompt-size test only).
- Open in Claude with the extension in real Claude Desktop (signed S3 hand-off link in production).
- Phone width of the new BRD toolbar.

## Ideas not built
- BRD: bold/italic inside headings, list items and table cells (today paragraphs only); delete table rows or columns; numbered lists; move a block up or down.
- Describe with AI: let the AI also name the actors (swimlanes) and suggest which module each step belongs to.
- Show in the Open in Claude panel whether the extension is really installed instead of a tick box.

## Tests added or changed
| Test | Run with | Covers |
|---|---|---|
| `tests/ui/brd-word-check.mjs` | `PW_CHANNEL=msedge node tests/ui/brd-word-check.mjs http://localhost:<port>` | Short toolbar, add blocks and bold, survive reload, Word export, Word import, edit imported text, blank BRD, delete (including Main and last) |
| `tests/ui/wb-align-check.mjs` | same pattern | All eight Align options, whole flows, locked/too few items message, AI-built flow uses state pills |
| `tests/ui/claude-handoff-check.mjs` | same pattern | Open in Claude panel buttons, copy, pasted reply comes back |
| `tests/work_adapter.mjs` (new case) | `node tests/work_adapter.mjs` | Many flows: relevant flow sent in full, prompt stays short, typo and abbreviation rules in the prompt |
| `tests/handoff_mcp.mjs` | `node tests/handoff_mcp.mjs` | Now ignores line endings |

Notes: Playwright's own browser is not installed on this machine; use `PW_CHANNEL=msedge`. Start the preview with `node build.mjs` then `node tests/ui/devserver.mjs <port>`. `npm test` passes as of the last run.

## Before deploying
Review the three commits, merge, run `npm test`, then `/deploy`. Each commit added a "What's new" entry (2.8.2 and 2.8.3 are new; the hand-off commit added none).

## Claude connector (built after deploy 116, not deployed)
What it is: 10 new tools on the existing app connector (`work/work.json`, code in `work/server/api.mjs`, section 'Claude connector'): `find_projects`, `project_overview`, `get_requirements`, `get_open_questions`, `get_use_cases`, `get_task_pack`, `get_review_pack`, `save_draft`, `get_handoff`, `submit_handoff_result`. Each runs as the signed-in person through the app's own routes. The page has a "I added the connector" box (`src/claudehand.js`) that sends a short prompt with only the hand-off id.

Still to do or decide:
- Deploy, then remove and re-add the connector in Claude once so the new tools show.
- **Pictures** cannot travel through the connector, so image tasks (Import from image) still use the clipboard or the old extension. The extension can only be retired when that is solved (needs a tool that returns images, or uploading the picture to the app and a `get_attachment` tool).
- Confirm that the facilio.work platform allows the new tools without a new review, and how Claude shows the `confirm` prompt for `save_draft`.
- Write tools not built yet: add a requirement or question, create a task, add to the whiteboard, update BRD text. Each should land as a draft.
- Test in a real Claude (web and desktop) with the connector added; only the server and the page were tested here.
- Test: `node tests/work_adapter.mjs` (new case) and `tests/ui/claude-handoff-check.mjs`.

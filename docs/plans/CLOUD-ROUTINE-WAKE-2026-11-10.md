# Wake Claude from the Studio with a cloud routine (idea, parked 10 Nov 2026)

**Status: parked by the user ("not now"). Nothing is built. Do not start unless asked.**

## The problem
The "Delivery Studio job queue" task runs in the user's Claude Desktop every 3 minutes and uses plan usage even when nothing is waiting. The Studio website cannot start a Desktop task (Desktop scheduled tasks only run while the app is open and the computer is awake; they have no API or webhook trigger).

## What is already built instead (live)
- A chat message sent while the queue is paused opens the Activate Claude link from the same click (`helperOpen`, src/assistant.js), so the task wakes without a second press.
- The usage line above the chat refreshes by itself (the queue task reports on each 3-minute run; the chat re-reads every minute).
- A shorter idle pause (pause after 2 empty runs, about 5 minutes, instead of 10 runs, about 30 minutes) is written up in `docs/operations/STUDIO-JOB-QUEUE-PROMPT-2026-11-07.md` for the owner to paste into step 11 of the task. Not applied yet.

## The idea: a cloud routine with an API trigger
- Anthropic's Claude Code routines run in Anthropic's cloud. A routine can have an API trigger: `POST https://api.anthropic.com/v1/claude_code/routines/{routine_id}/fire` with `Authorization: Bearer <routine token>`, an `anthropic-version` header and an optional body `{"text": "..."}` (up to 65,536 characters, wrapped in a `<routine-fire-payload>` block that the saved prompt must refer to). The answer is the new session id and URL; it does not wait for the run.
- The Studio server (work/server/api.mjs, when a chat or other job is written) would fire the routine. The routine runs the same queue prompt, reads the waiting jobs and writes results through the same facilio work connector, then ends. No polling and no idle runs.
- Docs: https://platform.claude.com/docs/en/api/claude-code/routines-fire , https://code.claude.com/docs/en/web-scheduled-tasks , https://code.claude.com/docs/en/desktop-scheduled-tasks

## Limits to design for
- 30 fires per routine per hour and 100 per account per hour (shared with Run now). No idempotency key: a retry starts a duplicate session. So: hold fires back (about 2 minutes between them) and never retry blindly.
- Every fire is a new session that loads the whole prompt and tool lists, and it draws plan usage. Cheaper than polling only if few messages are sent a day; dearer if many short messages each start a session. Measure before moving everything (watch the weekly limit for a week).
- The token is created once at claude.ai/code/routines (the routine's edit dialog, Trigger, API, Generate token), shown once, revoked by Delete or Regenerate. It must live in the Studio server's secrets, set by the owner; Claude never sees or handles it.
- A cloud session has the account's claude.ai connectors but no Desktop-only tools: the usage report (`get_usage`) and jobs that write to folders on the person's computer (setup_workspace, backup_project) must stay on the Desktop task. Some actions in a routine can still stop to ask permission with nobody to answer; not tested.

## If it is ever built
1. Owner creates the routine (prompt = the queue prompt plus a line to read `<routine-fire-payload>`) and the token; sets the token as a server secret.
2. Server: a fire function with a debounce and a daily counter, called when a job is written; failures fall back to the Activate Claude link.
3. Trial with two simple job kinds only (chat questions, check_brd). Keep the Desktop task for file jobs and usage. Compare the weekly limit before and after.
4. Update the Team Guide and Claude setup pages and docs/operations/DEPLOYS.md.

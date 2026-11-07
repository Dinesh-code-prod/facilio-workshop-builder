# Delivery Studio job queue: what to change in the scheduled task (7 Nov 2026)

The scheduled task `studio-job-queue` (file `C:\Users\Dell\.claude\scheduled-tasks\studio-job-queue\SKILL.md`) only looks at the stages "intake" and "requirements". Assistant chat messages, Find mail and most other jobs belong to the stage "other" (and brd, configuration, uat, hypercare), so they stay "Queued" for ever. Change four places in that file:

1. In the tools line, add `task_tracking, save_draft and the other tools a job's instructions name` after `transfer_write`.
2. In STAGES, replace `Built today: "intake" and "requirements"; leave jobs of other stages waiting.` with: `Every stage is built now, including jobs whose stage is "other" (chat messages from the assistant box, customer mail, guides). A "chat" job may work on ANY area of the project: its brief carries playbooks; follow the one that matches.`
3. In step 1, replace `for stage "intake" and again for stage "requirements". Collect jobs whose status is waiting.` with: `WITHOUT a stage filter (all stages in one list). Collect jobs whose status is waiting.`
4. In step 2, replace the order sentence with: `Do jobs in this order per project: chat first (a person is waiting for the answer), then setup_workspace, pull_msa, apply_change, fetch_mail, pull_clari, extract_findings, check_brd, check_msa, then every other kind (update_solution, compare_solution, make_guide, change_guide, draft_brd, capture_flows, fill_forms, capture_apps, draft_reply, check_sent, fetch_feedback, fetch_hypercare, send_mockup and so on). At most 3 jobs per run.` And in step 7 add at the start: `chat and every kind not named above: claim the job and follow the instructions the claim returns exactly.`

## Making it quicker (same file)
5. In step 4, say: `For a "chat" job skip the project folder and the CLAUDE.md log line: claim it at once and answer; they cost minutes and nobody needs them for a chat.`
6. Do chat jobs first and finish them before any long job in the same run (already in change 4).
7. The Studio side is already lighter: the chat brief carries only the playbooks the message is about, and "Auto" mode in the assistant answers plain questions at once (no queue) and sends only requests to change or make something to Claude.
8. The wait before Claude starts is the schedule (up to 5 minutes). If that is too slow, change the task schedule to every 2 minutes (cron `*/2 * * * *`); each run costs one short Claude session when nothing is waiting.

9. Sizes: a chat job now has a size (small or heavy) in its request. Do small chat jobs first (they are quick), then heavy ones; for heavy ones post your plan with progress first, as the job instructions say.

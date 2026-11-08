# Tasks, mail and Otto: what is built and what is next (8 Nov 2026)

From the user's messages of 8 Nov 2026. "Done" means deployed (see `docs/operations/DEPLOYS.md`, rows 279 to 284); "Next" is not built yet.

## Done
- **Teams and bell notices say what they are about.** Teams title is `CATEGORY · Project` (TASK, BRD, UAT, GO-LIVE, SIGN-OFF, STAGE, CLAUDE, JOB, MAIL, TICKET, APPROVAL, SOLUTION, DESIGN, CONTRACT, REQUIREMENTS). First line is what happened, then the text, then facts (project, about, due, priority). Text is cut at a word with an ellipsis and a Claude reply is reduced to its first sentence without the greeting (`lead()` in `work/server/_notify.mjs`).
- **Who is told when a task is added.** With an owner: only the owner, as a Teams DM (not when you assign it to yourself), at most 3 a day from the assignment path. With no owner: the whole project team, once (`task_new`), bell plus Teams within the 5-a-day cap. Customers are never told.
- **Overdue.** The daily digest (`send_task_digest`, run by Otto) DMs each owner their pending and overdue tasks; for a person on several projects it now has one block per project with the project name. The in-app `task_due` notice is made by the sweep when the owner opens the app. Nothing yet sends an overdue DM on its own at the due date (see Next).
- **Send to my Teams.** The task drawer has a button that sends that one task to your own DM only (`POST /api/projects/:id/tasks/:task/to-my-teams`). Used for the dummy task T-5 in Al Moallam.
- **Mail is fetched once.** `mail_list` returns `searchSince` (the day before the newest stored mail or the last finished search) and `knownMessageIds`; the fetch recipe tells Claude to search only newer mail, skip stored ids and finish with "nothing new" without opening mail. A finished search moves the date.
- **Mute mail.** Per project (`mlcfg`): by hand with the Mute mail button on the mail panel, and automatically when the Project handover stage is closed. A muted project requests no search and saves no mail.
- **Tasks page tabs:** Overview (KPI tiles, suggestions, mail) and Board and list (full height).

## Next (in this order)
1. **Tasks page like Jira.** Two tabs, Tasks and Mail. Tasks: a board with columns by status and cards (id, title, owner avatar, priority, due, labels), drag to move, quick create, and the list view with the same filters; KPI numbers as a slim strip.
2. **Mail tab in the Outlook layout.** Folder-style list on the left (sender, subject, first line, date, unread dot, chips for task/accepted), reading pane on the right, attachments under the message. The mail record needs an `attachments` list (name, size, type, link to the Outlook item); the connector recipe must save it. Files are not copied into the Studio; a video or large file opens in Outlook.
3. **Daily brief per stage.** One Otto DM per person per day: what is due today, what is overdue, what the current stage needs this week. Sent from a daily Otto job; needs the owner to switch it on.
4. **Overdue DM on the day.** A daily server pass that DMs the owner of every task that became overdue yesterday, once.
5. **Project group.** Otto cannot create a Teams group chat. It can post to a Teams channel that someone links to the app (message Otto in the channel: `link <app>`); channel posts start only once the app is approved (review is pending), and the channel is chosen by name (`channel: "name"`). Plan: make one channel per project named after it, link it, then send the daily project insight there.

## Token use of an idle day (estimate, not measured)
The Studio itself costs no Claude tokens: Teams notices, digests and notifications are server code. What uses the user's Claude plan is the queue runner (a scheduled task that starts a short session about every 5 minutes while the Claude app is open) and the real jobs it picks up (mail search, drafts). On 8 Nov 2026 about 22 of these idle sessions ran between 08:01 and 12:21 UTC, each about 23 messages ending "No waiting jobs". Two levers: poll every 15 or 30 minutes, and keep the polling prompt to one tool call. A mail search costs far more than a poll; searching only newer mail and skipping known ids keeps it small.

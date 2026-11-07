# Mail through Power Automate, notifications, and the stage cycle (feasibility and design, 7 Nov 2026)

User asks (7 Nov 2026): (1) can Power Automate bring incoming mail into Delivery Studio, (2) how should notifications work (pop-ups in the browser, and Otto in Teams, at the right moments), (3) how is the time cycle defined, so another admin can see which stage a project is in, and what marks a stage complete (Claude, or a person). Nothing below was tried against real Power Automate, Teams or Outlook; what was checked is the platform contract (`platform_docs`) and our own code.

## 1. Power Automate: mail into the Studio
**Verdict: feasible, with two conditions.**

How it would work: a cloud flow with the trigger *When a new email arrives (V3)* (a shared mailbox or a person's inbox, filtered by sender domain or a subject tag) calls an **HTTP** action that POSTs JSON to a facilio.work **webhook** of this app (`https://hooks.facilio.work/h/<id>`, declared in `work/work.json`). The body: `messageId`, `conversationId`, `from`, `to`, `subject`, `receivedDateTime`, `bodyPreview` (or text body, cut to 8 KB), `hasAttachments`, `webLink`. The Studio stores it as a **pending Mail inbox record** (the same records the mail-to-tasks feature uses), so a person accepts it into a task and Claude drafts the reply. A repeated delivery of the same `messageId` is ignored (`dedupe_header`).

Conditions:
1. **Signature check.** The platform verifies the webhook before our code runs. The strategies that work while the app is *pending review* are the HMAC ones; Power Automate has no HMAC function, so it cannot sign. `plaintext_token` and `basic_auth` (a secret in a header or query parameter, which Power Automate can send) **work only once the app is approved**. So: wait for approval, or put a small signer (Azure Function / Logic App) between the flow and the Studio.
2. **Licence.** The HTTP action is a **Premium** connector in Power Automate. Ask IT whether the owner of the flow has a Premium licence.

Matching mail to a project (the flow cannot know): (a) a project tag in the subject, for example `[P-1234]`; (b) the sender's address against the customer contacts of each project; (c) the `conversationId` of a mail already accepted. Anything unmatched lands in an **Unassigned** list for a person to route.

Other uses of the same hook: a Power Automate flow with a **Recurrence** trigger (every 15 minutes) calling a `tick` hook is the **scheduler this platform does not have**: it can run the due-task sweep and the Otto messages (section 2) without anyone opening the Studio.

Limits and risks, stated plainly: mail text is customer-written and untrusted (stored as data, never followed); no attachments are forwarded (names only); the flow can see only the mailbox it is connected to; forwarding customer mail into the app needs your IT and legal agreement; if the flow breaks, mail stops arriving silently (the Studio shows the time of the last mail received). Without Power Automate the same Mail inbox is already fed by a person's own Claude (`fetch_mail` job) or by dropping `.eml` files.

## 2. Notifications
What exists: the bell (`src/bell.js`: rules computed in the browser, read marks kept in the browser), Teams digest and assignment messages (`ctx.teams.send`, off until the secret `teams_notify = on`), and Otto replies. `src/notifications.js` is a different thing (notification rules written into the customer's org package).

Platform facts: the page can receive **live pushes** over the app WebSocket while it is open (`ctx.broadcast`); the **browser Notification API** shows a system pop-up while a Studio tab is open (the person must allow it); **Teams** reaches a person when the Studio is closed (people who can open the app, 30 sends a minute, mutable by the person; during review only owner and collaborators); there is **no scheduler** and no push to a closed browser.

Design: one server function `notify(event, project, who, payload)` decides the channels for each person from the event type and the person's preferences, writes an in-app record, broadcasts to open pages, and sends the Teams message where allowed. Each person chooses, per event type, **In-app / Browser pop-up / Teams**, plus quiet hours and a daily digest; defaults are conservative. One message per event per person per day for repeating events; muted people are skipped.

| Event | Who | Default channels |
|---|---|---|
| Task assigned to you | the owner | In-app, Teams |
| Task due tomorrow or overdue | the owner (and the lead when 2 days late) | In-app, Teams digest |
| Stage ready to close / closed | project lead and owners | In-app, Teams |
| Customer answered a question or signed off | owner of the question | In-app, browser, Teams |
| A Claude proposal is waiting (solution, tasks, mail) | the person who asked | In-app, browser |
| A job finished or needs input | the person who asked | In-app, browser |
| Mail arrived and matched a project | project team | In-app (Teams digest) |
| Approval requested (BRD, transfer) | the approver | In-app, Teams |

Triggers are **event-driven** (on the server write that causes them), plus a **sweep** when a team member opens the Studio, plus the optional Power Automate `tick` hook for time-based ones.

## 3. The time cycle (project stages)
The cycle is the eight-stage roadmap of the menu (1 Project introduction, 2 Requirement sessions, 3 Mockup & BRD, 4 UAT & FTR, 5 Training guides, 7 Hypercare, 8 Project handover). Each stage holds a short list of **criteria**; each criterion is a fact the Studio already holds (a count or a status), checked by code, never by calendar or percentage. The stage status is one of: **Not started, In progress, Ready to close, Closed, Not applicable**.

Who marks a stage complete: **the criteria are checked automatically; closing is always a person's click** (a project lead, owner or admin; their name, date and a note are recorded, and a stage closed while criteria are still open says so). **Claude never closes a stage.** Claude (and the task engine) can say *Ready to close*: when every criterion is met an automatic task "Close stage N" appears for the project lead and a notification is sent. An admin looking at a project sees: the current stage, which criteria are met and which are not, the stage owner, the last activity, blockers, and the history of closed stages (who, when).

## Build order
1. Stage cycle (pure rules, tests, the card on the project dashboard, Close and Not applicable actions, the Ready task, Admin project detail).
2. Notification centre (server `notify`, in-app list with read state, live toast over the WebSocket, browser pop-up with permission, preferences).
3. Otto/Teams triggers on the events above (reusing the digest and the owner-only reply).
4. Mail hook (`work.json` webhook, handler into the Mail inbox, unassigned list, last-received time) and the step-by-step Power Automate guide, tested with the platform's `send_test_webhook`.
Real Power Automate, real Teams delivery and the browser pop-up permission cannot be tested from here.

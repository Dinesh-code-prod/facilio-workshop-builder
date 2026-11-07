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

## 4. Support Desk tickets into the task engine (explored 7 Nov 2026)
**Decision (user, 7 Nov 2026): not pursued.** The Support Desk is the support team's own tool and does not carry the customers' mail to the delivery team. The way to bring customer mail in is **Microsoft 365 through each person's own Claude** (the `fetch_mail` job saves mail into the Mail inbox on the Tasks page; no Power Automate, no licence, no IT approval), and the arrival of that mail now notifies the team. The Power Automate hook (section 1) stays documented as an option for later; the ticket rule and the ticket hook below are **not built**. What follows is kept as the record of what was found.
What was looked at: the Support Desk page https://support-desk.facilio.run/#/homepage and its Tickets list, in the user's own signed-in browser pane, reading page text and the list of requests only (no ticket content was copied).

What it is: a **Facilio Run** app (not facilio.work). It has **no ticket API of its own**: its server side only serves `/api/me` and a small `/api/db/access` list for who may open it. The page signs the person in with **Microsoft (MSAL)** and reads everything **straight from Microsoft Graph in the browser**:
- the tickets are items of a **SharePoint list** on `facilio958.sharepoint.com` (`/sites/<site>/lists/<list>/items`, 200 at a time), with fields **Title, TicketNumber, Status, Priority, CustomerName, CustomerEmail, ReceivedOn, DueDate, AssignedToLookupId, Mail URL, Group, Sentiment, RootCause, ETA** and escalation fields;
- the customer accounts come from a file `customer-accounts.json` in that site's drive; people and photos from `/users`;
- the mails behind the tickets are read from the shared mailbox **help@facilio.com** (`/users/help@facilio.com/mailFolders/inbox`, `/messages`).
The dashboard on the page shows (all time): about 1.8k tickets, 63 open, 38 pending, 44 awaiting customer, 83 overdue, 6 unassigned; per person and per customer tables.

What this means for fetching tickets into Delivery Studio:
1. **Not possible from the Studio page itself**: the sign-in belongs to the Support Desk's own Entra app registration (its redirect addresses); the Studio has no Graph token and cannot reuse it.
2. **Not possible from the Studio server today**: the only Microsoft credential the app has is `graph_mail` (the support mailbox, Mail.Read). Reading the SharePoint list needs a credential with **Sites.Read.All** or **Sites.Selected** on that one list (a request to IT; the owner then grants it to the app in secrets.facilio.work). With that, a server function could read the list on demand, but there is still no scheduler to do it.
3. **Possible with Power Automate (recommended, same mechanism as mail)**: a flow with the trigger *When an item is created or modified* on the Support Desk list (a standard SharePoint connector) calls the same Studio webhook (HTTP action: Premium) with `TicketNumber, Title, Status, Priority, CustomerName, CustomerEmail, DueDate, AssignedTo (email), ReceivedOn, Mail URL`. The Studio keeps one record per ticket (updated on every change, closed tickets kept for history).
4. **Possible by hand today**: a person's own Claude with the Microsoft 365 connector can search the help@ mailbox and the SharePoint files, and propose tasks through the Mail inbox. It cannot read SharePoint **list items** with the tools of that connector (not verified).
5. Ask the Support Desk's owner whether he will publish a read API (a Facilio Run function, or the same list through a service account); then the Studio could call it with a work token.

How tickets become tasks (task engine rule `ticket`): a ticket belongs to a project when the **CustomerName or the e-mail domain of CustomerEmail** matches the project's customer (an Unmatched list for a person to route). Each **open** ticket of a matched customer becomes an automatic task "Ticket #1727: <title>" with the owner (AssignedTo, when that person is a project member), the due date (DueDate), the priority, and a link back to the Support Desk; it **resolves itself when the ticket's Status is Closed or Resolved**; a ticket that is overdue or unassigned raises a notification (section 2). The task engine never changes the ticket; the Support Desk stays the place where tickets are worked.
Not verified: the SharePoint list's real column names (read from the request, not from SharePoint), anything about the flow, and whether IT will approve the Graph permission or the Premium licence.

## Build order and what is built (7 Nov 2026)
1. **Stage cycle: built** (deploy 250): the lifecycle tracker follows the eight stages, a stage is Ready to close from its records, only a person closes it, the Close stage task.
2. **Notification centre: built**: `work/server/_notify.mjs` (in-app list, per-person preferences, quiet hours, content-free live push, Teams only when on and 5 a day at most) and `src/notifyclient.js` (the bell's "For you", toast, pop-up with permission, settings drawer). Tests: `tests/notify.mjs`.
3. **Events wired**: task assigned, customer sign-off or concern, stage closed, stage ready (sent from the browser once a day per stage), Claude's task suggestions, a job finished, customer mail saved by Claude. **Not wired yet**: task due or overdue (the Teams digest and the Done buttons exist; an in-app sweep when someone opens the Studio is not built), approval requested, Solution proposals, the Support Desk.
4. **Mail: through Microsoft 365** (user's decision); **Power Automate hook, Support Desk tickets and the ticket rule: not built** (kept as options above).
Not testable from here: real Teams delivery, the live push over the platform WebSocket, the browser permission prompt, real Power Automate.

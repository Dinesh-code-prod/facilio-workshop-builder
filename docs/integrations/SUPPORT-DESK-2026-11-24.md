# Support Desk and Delivery Studio: how they can work together (24 Nov 2026)

The user asked (24 Nov 2026): can https://support-desk.facilio.work be shown inside Delivery Studio, and can its ticket information be pulled in, alongside our current mail setup? This replaces the Support Desk part of CONNECTORS-2026-11-04.md (written when Support Desk was on facilio.run).

## What Support Desk is (checked 24 Nov 2026)

| | Finding | How it was checked |
|---|---|---|
| App | Approved facilio.work app `support-desk`, owner Karthikeyan B, visibility "facilio", 56 people on its own access list (admin / support / viewer). Moved from support-desk.facilio.run. | `get_app` |
| Data | All ticket data lives in SharePoint, site `facilio958.sharepoint.com/sites/SupportTickets`: list `HelpDeskTickets` (tickets), `Customers` (customer accounts), `DeskViews`, `UserPrefs`, and `customer-accounts.json` in the site's documents. Its own app database holds only the access list. | network calls of the live page, signed in as the user |
| Mail | The shared support mailbox **help@facilio.com**; each ticket's thread is read by its Outlook conversation id. | network calls |
| Sign-in | The page calls SharePoint and Graph itself with each person's own Microsoft login (MSAL, Entra app `1ed506bb-…`). The server has no Microsoft access. | network calls, submission text |
| Ticket fields | `TicketNumber, Title, Status, ReceivedOn, FirstReplyAt, LastReplyAt, LastReplyFrom, LastReplyBy, ResolvedTime, ClosePressedAt, AssignedToId, CustomerEmail, conversationId, ThreadId, MergedInto, Deleted, Junk` | `$select` of the page's queries |
| Customer link | A ticket has no project or org id: only `CustomerEmail`. The customer is found from the sender's address (the `Customers` list and `customer-accounts.json`; their exact fields were not read). | as above |
| Addresses | `#/homepage`, `#/tickets?view=…`, one ticket `#/tickets/<number>`. No address for one customer's tickets was found. | clicking in the live page |
| Connector / API | No MCP tools, no webhook, no public API. Server functions `db`, `llm`, `proxy` only. | `get_app` |
| Inside a frame | Works: no frame-blocking headers, and the whole desk loads signed in inside a frame on the same site (facilio.work). On facilio.run (4 Nov) this was not possible. | header check and a test frame in the live page |

## What Delivery Studio has today

- **Facilio tools page** (`src/webframe.js`, `src/webframelogic.js`, menu Support & Tickets > Support Desk): still points at the OLD address support-desk.facilio.run with `framed: false` (a card with "Open in a new tab"). The page policy (`src/template.html` frame-src) lists only the old host.
- **Mail**: project mail reaches the Studio two ways: the person's own Claude searches their Outlook (job `fetch_mail`, stored PENDING for a person to accept) and the delivery mailbox sync through the `graph_mail` credential (built, needs configuration). Neither reads help@facilio.com.
- **Tickets page**: the Studio's own tickets (client feedback, questions, project mail). These are implementation-phase items, not support tickets.

## Options

| | What the team gets | What it needs | Effort | Risk |
|---|---|---|---|---|
| **A. Show Support Desk inside the Studio** | The real desk in a Studio tab, signed in, one click from any project; a ticket number in the Studio opens that ticket (`#/tickets/<n>`). | Nothing from anyone: change one allow-list entry and the page policy. | Small (an hour with tests) | Low. Each person still needs access on Support Desk's own list. |
| **B. Pull ticket facts into each project (server)** | On Hypercare / Handover and the project Home: open, overdue (no first reply, past the SLA), waiting on the customer, the latest 10 tickets with links; Otto nudges for a new or overdue ticket of the project. | Read access for Delivery Studio's server to the SupportTickets site: an Entra app with Graph **Sites.Selected**, given **read** on that one site by a SharePoint admin, with Karthikeyan's agreement; plus, per project, which customer (email domains) it is. | Medium (2 to 3 days) | Medium: a new grant on customer data; needs the owners' OK. Only ticket number, title, status, dates and assignee would be stored, never mail text. |
| C. Pull through each person's Claude | Same facts, fetched by a Studio job through the person's Microsoft 365 connector and saved as a snapshot. | No new grant, but the Microsoft 365 connector reads files and mail; reading a SharePoint **list** through it is not confirmed. | Medium | Unverified; only as fresh as the last Claude run. |
| D. Support Desk shares a summary itself | Support Desk adds (1) an embed view for one customer, `#/tickets?customer=<domain>&embed=1`, and/or (2) MCP tools such as `tickets_for_customer`, so Otto and every person's Claude can ask it. | Work by the Support Desk team. | Small for them | Low; uses each person's own access. |

## Recommendation

1. **Now: A.** Point the Support Desk tab at support-desk.facilio.work, show it inside the Studio (verified to render), add it to the project's Hypercare and Handover pages, and turn any ticket number into an "Open in Support Desk" link.
2. **Next: D(2) with the Support Desk owner.** Ask Karthikeyan for MCP tools on Support Desk (tickets for a customer by email domain, one ticket's status). That gives Otto and Claude live ticket facts with each person's own access and no new permission on SharePoint. A customer filter in the address (D(1)) would let the Studio open the desk already filtered to the project's customer.
3. **If a per-project ticket panel and Otto ticket nudges are wanted without depending on Claude: B**, after the SharePoint admin and Karthikeyan agree to a read-only Sites.Selected grant for the SupportTickets site.

Mail stays as it is: implementation-phase mail stays in the Studio (Claude's `fetch_mail` and the delivery mailbox); support mail stays in help@facilio.com and Support Desk. After go-live the Studio points customers' support questions to Support Desk instead of keeping a second ticket list.

## Not checked

- The `Customers` list fields and `customer-accounts.json` layout (customer data; not read).
- Whether a person who is NOT on Support Desk's access list sees an access-request page inside the frame (expected, not tried).
- Phones, and browsers that block third-party storage in frames (both sites are facilio.work, so the frame is same-site; tested in one browser only).

# Tickets, support mailbox and guide update: audit and status

Based on the current GitHub main (builds 75–79) merged with this work.

## How tickets arrive (nobody creates them by hand)

| Source | How | Status |
|---|---|---|
| Client feedback, questions, UAT findings, change requests | Read from the project's feedback records. Copied once into Tickets when the Tickets page opens (`POST /api/projects/:id/tickets/sync-client`). Each ticket links back to its source. | Built and tested |
| Questions arising in Delivery Studio | Transcript statements marked "needs clarification" become tickets the same way. | Built and tested |
| Items clients raise themselves (RAID, actions, change requests, hypercare) | Same sync, for items created on the client side. Customer login is not enabled yet, so none exist today. | Built; untested with real client data |
| E-mail | Support mailbox sync through Microsoft Graph (`POST /api/mail/sync`). Replies with `[TKT-n]` in the subject join that ticket. Other mail follows the routing rules. Unmatched mail waits in the mailbox inbox for an admin to route or dismiss. | Built and tested against a mocked Graph. **Needs configuration**, not verified against a real mailbox |

"Open Outlook" in Tickets opens Outlook; "Reply and open Outlook" opens a draft addressed to the requester. The Create ticket button is removed.

## Configuration needed for the mailbox (owner action)

1. Entra app registration with Graph `Mail.Read` (and `Mail.Read.Shared` for a shared mailbox), admin consent granted.
2. OAuth2 credential named `graph_mail` at secrets.facilio.work, granted to the app.
3. Optional plain secret `support_mailbox` with the shared mailbox address.
4. Press **Support mailbox → Sync now** in Tickets (admins only). There is no scheduler on facilio.work, so sync is manual.

Teams notices (new, assigned, status, priority) send through Otto when the plain secret `teams_notify` is `on`. Tested with a mock only, not live.

## Checklist

| Area | State |
|---|---|
| Tickets workspace: list, conversation, details, views, filters, search, lifecycle, reopen, links, internal notes | Complete, browser-tested |
| Client feedback and Delivery Studio questions in Tickets | Complete |
| Mailbox sync, routing rules, unrouted inbox, error and status reporting | Built, **needs configuration** |
| Teams notices | Built, unverified live |
| Teams actions (assign or change status from Teams) | Not built |
| Project Resources and Links | Complete |
| Guide update from a configuration ZIP (parse, relationships, baseline diff, conflicts, versions, validation) | Complete, tested on synthetic packages |
| Guide update tested on a real org configuration ZIP | Not done |
| DeepSeek / Claude provider choice, per-user API key | Not built (needs a decision on key storage) |
| AI opportunity audit report, skills audit | Not written |

## Tests

`npm test`: 20 server checks (tickets, sync, mailbox, Teams mock, resources, security) and 10 guide-intelligence checks. UI checked in a browser against the local dev server. Screenshots are in `docs/screenshots`.

# AI providers, Notes & Links, Teams ticket creation, navigation

Status as of 27 Oct 2026, on top of GitHub main (builds 75–79). Companion to `docs/integrations/tickets-and-mailbox.md`.

## 1. What already existed and was reused

| Area | Found in the repo | Action |
|---|---|---|
| AI service layer | `callDeepseek`, `callClaude`, `callModel`, fallback policy, per-provider usage counters, 17 AI tasks (BRD, gaps, UAT, FTR, guide, config docs, WSR, hypercare, handover, package analysis, video guide steps and more), per-task provider choice, admin AI screen | Kept. Extended, not rebuilt |
| Claude key | Owner-set secret `anthropic_api_key`, status and test routes | Extended with in-app save/replace/remove (below) |
| Tickets | Full workspace, lifecycle, categories, priorities, project links, internal notes, e-mail ingest, Teams notices | Reused as the only ticket store. Teams creates tickets through the same sanitiser, numbering, notices and audit |
| Links | "Resources & Links" page (kind `res`) with URL validation, types, search | Kept and merged into **Notes & Links** |
| Notes | A separate `note` kind exists for governance pages; no project notes page | New kind `pnote` |
| Microsoft | Outlook compose/open only, Teams notices via `ctx.teams.send`, mailbox sync (new, needs configuration) | Reused |
| Permissions | owner / member / viewer, admin roles super / admin / sub, enforced server-side | Reused for every new route |
| Storage | `ctx.db` items with versions, size limits, audit | Reused |

## 2. Navigation (applied)

Existing routes and direct links are unchanged. Only the sidebar grouping moved.

- **Projects & delivery**: Project (Dashboard Report, Overview, Roadmap); Discover and define (1 Kick-off, 2 Workshops, 3 Requirements, 4 BRD & Approvals); Build and validate (5 Configuration, 6 UAT & Go-Live, 7 FTR & KPI); Launch and support (10 Hypercare, 11/12 Handover & Closure)
- **Documentation & Resources**: User Guide Builder, Configuration Analysis (was Package Analysis), Video to Guide, Customer User Guide, Notes & Links
- **Support & Tickets**: Tickets (with the mailbox panel and Teams creation behind it)
- **AI & Automation**: Deliverables & AI
- **Integrations & admin**: Administration (portal, introduction, templates, layout, settings). In the admin console: **AI provider** and **Integrations** (Teams, mailbox, Outlook) sections

Customer navigation is unchanged. Saved per-project layouts that moved items by group name may show a group under its old name.

## 3. AI provider settings

Implemented and tested (23 server checks):
- DeepSeek stays the default. Claude is used only when picked for a task or set as default; if Claude fails, the admin setting decides between an error and a labelled DeepSeek fallback.
- Admin can save, replace and remove a Claude key in the app. The key must look like `sk-ant-…`, is checked against Anthropic (`GET /v1/models`, no tokens spent) before saving, and is stored encrypted (AES-256-GCM). The encryption key is the plain secret `ai_master_key`, which only the owner can add. Without it the screen explains this and points to the owner-set `anthropic_api_key` instead.
- The key is never returned, logged or placed in browser storage. The test proves a wrong master key cannot read it.
- Clear messages for rejected key, rate limit, unreachable Anthropic, missing model (`claude-sonnet-5-5` availability is reported).
- The screen states that API usage is billed separately and a Claude subscription includes no API credits, and that Claude Code sign-ins are never used.
- Usage shows requests, errors and tokens as reported by each provider. Cost is not estimated because no price list is configured.

Remaining setup: the owner adds `ai_master_key` (or `anthropic_api_key`). **Not tested with a real Anthropic key**: only mocked responses. Adding a provider means one function with the same `(messages, maxTokens)` signature plus an entry in `PROVIDERS`.

One key serves the whole app (per-person keys are not built, because the platform has no per-user secret store).

## 4. Notes & Links

Implemented and browser-tested: Notes tab (title, category, tags, text; search; category filter; created and updated information; edit; delete with confirmation; read-only view for viewers) and Links tab (name, URL, type, category, description; URL must be http(s); opens in a new tab with `noopener`). Both are stored per project in the app database and survive reload. Recordings are links to where they are hosted. Server rejects blank titles and records the creator, which cannot be rewritten on edit. Notes are plain text, not rich text.

## 5. Microsoft Teams ticket creation

**Chosen: Otto (the facilio.work Teams bot) calling three app tools.** Otto already exists for this platform, so there is no new app registration, hosting or tenant upload.

Flow: a person tells Otto "create a Delivery Studio ticket from this message" and pastes or forwards the text. Otto calls `suggest_ticket` (type, priority, subject, matching projects; nothing is created), shows the result, then calls `create_ticket`, which is confirm-gated: Teams shows the fields and the person clicks Confirm. The ticket is created as that person, so project permissions apply. Reply gives the ticket ID and a link. The same message ID or link never creates a second ticket.

Types map onto existing categories: customer issue → Client request, question → Question, bug → Defect, internal feedback and other → Other (with an `origin` of external or internal). Teams link must be a teams.microsoft.com or teams.live.com URL, and is stored with the ticket along with the reporter. Only the message text the person approved and the link are kept.

Not met: a right-click "Create ticket" action on a message, and pre-filling from the message automatically. Otto works from text the person gives it. That needs option 2.

### Options compared

| | Power Automate | Teams message extension | Otto tools (chosen) |
|---|---|---|---|
| Experience | "For a selected message" trigger, form, flow calls the ticket API | Right-click action with a form | Chat with Otto, confirm card |
| Message link and text | Yes (`linkToMessage`) | Yes | Link only if the person supplies it |
| Calling Delivery Studio | Needs an HTTP call. The flow runs as the flow owner's connection; the app only accepts signed-in Facilio users, so a service endpoint would be needed | Own hosted service and bot registration | Native, runs as the person |
| Licensing | Teams, Outlook and SharePoint connectors are included with Microsoft 365. A plain HTTP action is generally a premium connector (Power Automate Premium, about $15 per user per month list). I could not confirm HTTP classification on an official page, so treat as unconfirmed | No per-user licence found; needs Azure Bot registration and hosting (cost not researched) | None beyond existing facilio.work |
| Admin work | Flow must be shared, Power Automate Actions app enabled in Teams; not supported in GCC/DoD clouds | Tenant admin approves a custom Teams app | None known; Otto must be available to the person in Teams |
| Effort | Low to build, fragile to maintain (personal connections break when owners leave; throttling 100 calls per minute per connection) | Highest: hosting, auth, manifest | Lowest |

Prices are US list prices from third-party summaries (checked 11 Sep 2026 by that site), not from Microsoft directly; Microsoft's own pages were not reachable. **Confirmed:** nothing from an official Microsoft source. **Estimates:** the $15 figure. **Depends on your licences:** whether Power Automate Premium is already assigned.

Sources: [Power Automate trigger reference](https://manueltgomes.com/reference/power-automate-trigger-reference/power-automate-teams-for-a-selected-message-v2-trigger), [Power Platform licensing guide](https://www.powerplatformtips.com/licensing-guides/power-platform-licensing.html).

### Status
Tools are built and tested with mocks (suggestion, permission refusal, creation, duplicate return, bad link, unknown project). **Not tested in a real Teams tenant.** It is not known whether Otto passes a Teams message link automatically, nor how it shows the confirm card for these fields. Until someone has done it in Teams, treat it as unverified.

## 6. Claude skills audit

Skills in this development environment (not in the repo; the repo has no `.claude` folder or CLAUDE.md): frontend-design, video-to-user-guide, guidebook-builder, ftr-generator, ftr-executor, facilio-org-configuration-assistant, facilio-org-configuration-queries, facilio-solution-document-builder, facilio-connected-apps-builder, facilio-script, the facilio-vibe set, browser skills, data analysis skills, pdf/docx/pptx/xlsx.

| Kind | Examples | Use in Delivery Studio |
|---|---|---|
| Local development helpers | frontend-design, browser skills | Used while building. Do not run in the deployed app |
| Reusable instructions or templates | video-to-user-guide, guidebook-builder, ftr-generator, config-assistant | Their steps and wording can seed the app's AI task prompts (`AI_TASKS`). Several already match existing tasks (guide, FTR, config docs, video guide) |
| API-supported | None as such | The Anthropic API runs prompts; it does not run Claude Code skills |
| Needs separate setup | Anything using MCP servers, local files, the org-config repository | Not available inside the app |

## 7. AI opportunity audit

| Opportunity | State | Approach | Priority |
|---|---|---|---|
| BRD, gaps, UAT, FTR, guide, config docs, WSR, hypercare, handover, closure, package analysis, video steps | Existing, provider choice per task | Keep | Done |
| Ticket classification and priority | Rule-based suggestion in Teams tools only | Add an optional AI pass over the existing categories, always user-reviewed | Medium |
| Ticket summary and draft reply | Proposed | Use the thread, draft only, never auto-send | Medium |
| Guide update wording | Rule-based wording from the relationship map | Optional AI polish of the proposed text, with manual edits preserved | Medium |
| Project summary | Partly in reports | Reuse hypercare/WSR tasks | Low |

Deterministic code stays first. No generic chatbot was added.

## 8. Tests

`npm test`: 23 server checks plus 10 guide checks, all passing. They cover Teams tools, Notes, Claude key handling, tickets, sync, mailbox, security. Browser checks (local dev server): Notes create, search, filter-empty state, reload persistence, link URL validation, sidebar grouping, admin AI and Integrations screens. Screenshots in `docs/screenshots/`.

## 9. Not done or not verified

- Teams in a real tenant; Claude with a real key; mailbox with a real Microsoft account
- Per-user Claude keys; AI ticket classification; Teams message right-click action
- Responsive and keyboard checks of the new screens beyond a desktop pass
- GPU smoothness of animations (unverified, headless software rendering)

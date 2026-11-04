# Connector discovery, 4 Nov 2026 (Part E step 0)

What each system and connector **really** offers, from calls and pages seen on 4 Nov 2026 in one Claude Code session and its browser pane. Only read-only actions were called. Nothing was written, created or deployed, nothing was signed in by Claude, and no secret was printed. Where something was not tried it says **not tested**; where it comes from a document or a page rather than a call it says **from docs**.

Companion: [AUDIT-2026-11-04.md](AUDIT-2026-11-04.md).

## 0. How the pieces fit (the important picture)

- A **connector is a capability of a person's Claude session**, signed in as that person. It is not a capability of the Delivery Studio server. Claude reads or writes through a connector with that person's own access, and hands results to Delivery Studio through the Delivery Studio connector. The Delivery Studio server itself only has the platform's own credentials (the mailbox credential `graph_mail`, currently blocked).
- Connectors seen in this account: Facilio Work Apps (`mcp.facilio.work`), Facilio Run (`mcp.facilio.run`), Facilio MCP - Azure AE (`mcp.facilio.co.ae`), Facilio Azure AE Tools (`ae-2.mcp.facilio.tools`), Facilio Kenny Code Assist (`code.facilio.bot`), Facilio Clari (`mcp-sam.facilio.in`, **installed but disabled in this session**), M365 (`microsoft365.mcp.claude.com`), Claude Docs, Figma (disabled), visualize. The Delivery Studio connector (`mcp.facilio.work/facilio-delivery-studio`) and the Meteor and Comet connectors are **not** installed in this session.

## 1. Summary table

| System | What it is | Reach today | Needs login | Verdict for Part E |
|---|---|---|---|---|
| Microsoft 365 (Claude's M365 connector) | SharePoint, OneDrive, Outlook, Teams, calendar, meeting transcripts, **read only** | search and read verified for SharePoint; transcripts and drive listing **not tested** | Microsoft sign-in inside Claude (already connected here) | Core for MSA pull. Cannot write back. |
| Delivery Studio connector | The app's own 31-tool connector | **not called** (not installed in this session); tool list read from `work/work.json` | Facilio account on facilio.work | Needs new tools for create project, push and pull |
| Kenny Code Assist | Mirror of Facilio source repos plus saved org configuration | verified: org_config, code_search; repo_list not re-run | already connected | Reliable read source for configuration and code; a snapshot, not live |
| Facilio connections MCP (Azure AE) | Actions on a Facilio org: modules, fields, connected apps, import, analytics, users | verified: list-modules, list-connected-apps | already connected (one org) | Best source for real modules and fields; also has write actions, so guard them |
| Meteor | Prototype builder over the CMMS Demo Kit | page read (signed in by platform sign-on, not by Claude) | Facilio sign-on | **Not a module catalogue**; use for mockups only |
| Comet | Product video and walkthrough studio | page read | Facilio sign-on | **Not a UAT guide tool** |
| Clari | Call recording and transcripts | login page only; connector off | Clari login | Possible, unconfirmed: needs the connector turned on |
| facilio.run | Internal site directory and hosting | page read | Facilio sign-on | A hosting platform, **not** a connected-apps or MCP catalogue |

## 2. Microsoft 365 (M365 connector, Claude's own)

**Tools (15), all read-only:** `get_me`, `get_granted_scopes`, `search_people`, `sharepoint_search`, `sharepoint_folder_search`, `read_resource`, `outlook_email_search`, `outlook_calendar_search`, `outlook_find_available_time`, `find_meeting_availability`, `chat_message_search`, `teams_list_teams`, `teams_list_channels`, `teams_list_channel_messages`, `teams_list_chats`.

**Granted scopes (called today, `get_granted_scopes`):** Calendars.Read, Calendars.Read.Shared, Channel.ReadBasic.All, ChannelMessage.Read.All, Chat.Read, Chat.ReadBasic, ChatMember.Read, ChatMessage.Read, Files.Read, Files.Read.All, Mail.Read, Mail.Read.Shared, Mail.ReadBasic, MailboxFolder.Read, MailboxItem.Read, OnlineMeetingAiInsight.Read.All, OnlineMeetingArtifact.Read.All, OnlineMeetingRecording.Read.All, OnlineMeetings.Read, OnlineMeetingTranscript.Read.All, People.Read, Sites.Read.All, Team.ReadBasic.All, User.Read, User.ReadBasic.All. **No write scope of any kind**: Claude cannot save a file, post a message or change anything in Microsoft 365 through this connector.

**Verified today.**
- `sharepoint_search` with the words "Master Services Agreement MSA" returned 5 of **711** matches (50 per page maximum, paged by `nextOffset`). Each hit has a file URI, drive id, name, web URL, last-modified date and a short text snippet (`isPartialContent: true`, `downloadUrl: null`). Hits came from other people's OneDrive folders and shared folders, so the search reaches whatever the signed-in person is allowed to open across the tenant. Many hits are customer contracts: a pick-list in the product must be chosen by the person, and nothing should be stored until they pick.
- The search is by content, file name and metadata, with filters for file type, author, folder and date.

**From the tool description, not tested.**
- `read_resource` reads a file by URI (`file:///{driveId}/{itemId}`), converts PDF and Office files through Microsoft's PDF conversion, pages them (up to about 200,000 characters per call) and lists folders (200 entries per page). Web links (`https://`) are **not** accepted; use the URI from the search.
- Teams meeting transcripts: read through `meeting-transcript:///events/...` using the `meetingTranscriptUrl` field of a calendar event; a recurring series can be scoped by start and end. This gives an alternative to Clari for meetings held in Teams. **Not tested**: no meeting was read.
- OneDrive: `drive:///users/me` lists the signed-in person's drive.

**Limits.** Read only; images and attachments depend on the file type (not tested for images inside PDFs); it runs as the person, so what Claude sees depends on that person's access; anything beyond the granted scopes (for example sending mail) is impossible. The Delivery Studio server cannot use this connector; only a Claude session can.

**Verdict.** Good enough to list, pick, fetch and read an MSA and its attachments. The extraction result must be saved into Delivery Studio by Claude through the Delivery Studio connector.

## 3. Delivery Studio connector (`https://mcp.facilio.work/facilio-delivery-studio`)

**Not called today** (it is not one of this session's connectors). From `work/work.json` and `docs/reference/claude-connector.md`: 31 tools. Read: `find_projects`, `project_overview`, `portfolio_status`, `get_requirements`, `get_statements`, `get_open_questions`, `get_use_cases`, `get_tickets`, `list_record_kinds`, `get_records`, `get_document`, `search_project`, `recent_activity`, `list_overdue`, `project_changes`, `search_transcripts`, `get_transcripts`, `get_transcript`, `uat_summary`, `get_impl_skills`. Prepare: `get_task_pack`, `get_review_pack`, `get_mom_pack`. Write: `save_draft` (unapproved draft), `save_minutes` (flagged for review), `create_ticket` (real ticket after confirmation). Hand-off: `get_handoff`, `submit_handoff_result`. Help: `connector_help`. Teams: `list_projects`, `suggest_ticket`.

App status seen today through the Facilio Work Apps connector (`list_apps`): `facilio-delivery-studio`, owner dinesh.r@facilio.com, review status **pending**, visibility facilio, last deploy 4 Nov 2026 11:38 UTC, one server function `api`.

**Gaps against Part E.** No tool to create a project, to store an MSA extraction with source references, to push or pull a document or configuration, to record a transfer status, or to read a data-onboarding return. Writes are limited to drafts. Pictures cannot go through it. Rate limit: 600 calls per person per 10 minutes. The tests (`connector_skills`, `claude_launch`) cover the tool lists and the prompts, not a real Claude session. **Not tested today:** a real Claude run against the live app.

## 4. Kenny Code Assist (`https://code.facilio.bot`)

**Tools (7):** `repo_list`, `code_search`, `code_read`, `code_log`, `code_diff`, `code_knowledge`, `org_config`.
**Verified today.**
- `org_config` with no arguments: regions `us` (61 orgs), `au` (17), `uk` (30), `ae` (40), synced 4 Nov 2026 06:50 UTC. Further levels (org list, features, one feature's XML) are documented in the tool description and were used in the earlier session; not repeated today.
- `code_search` ran across about 150 mirrored repositories, among them `facilio-mcp`, `facilio-connections-mcp`, `facilio-stateflow-builder`, `facilio-forms`, `facilio-dynamic-forms`, `facilio-impl-ai-skills`, `facilio-claude-skills` (the saved org packages in `facilio-config-data` are read through `org_config`, not `code_search`). A narrow search in `facilio-mcp` showed that region is passed as a query parameter on the MCP server; it did not show a list of regional addresses.
- `repo_list` was **not re-run** (large output, shown in the earlier session).

**Limits.** A mirror from Bitbucket (each repo has a last-synced time and a first-synced date, behaviour before that is invisible). Saved org configuration is a snapshot of exported packages: the tool says silence in a package is not proof that something is not configured, because some feature types are excluded from export. Read only. Not live runtime state.

**Verdict.** Safe and useful for configuration source discovery, FTR approach A (compare saved XML with the BRD) and for fact-checking against code. The user's name for it, "Kenny code assist", matches the connector name "Facilio Kenny Code Assist" (C9 asked to confirm this).

## 5. Facilio connections MCP ("Facilio MCP - Azure AE", `https://mcp.facilio.co.ae`)

**Tools (12):** `FACILIO_SEARCH_ACTIONS`, `FACILIO_GET_ACTION_SCHEMAS`, `FACILIO_MULTI_EXECUTE_ACTION`, `FACILIO_MANAGE_CONNECTIONS`, `FACILIO_WAIT_FOR_CONNECTIONS`, `facilio-cmms_asset-overview`, `facilio-cmms_module-records`, `facilio-cmms_work-orders`, `facilio-cmms_raise-work-order`, `facilio-analytics-dashboards_query-results`, `list_facilio_widgets`, `render_facilio_widget`. The action catalogue behind it is large (the tool says 5,000+ actions across 1,000+ apps).

**Connections active for this account:** facilio-analytics-dashboards, facilio-cmms, facilio-connected-apps, facilio-customization, facilio-import, facilio-platform, facilio-ref-comp, facilio-user-management, facilio-vendors. **Not active:** gmail, ibm-maximo, salesforce (the earlier session also found SharePoint and Google Drive not connected here).

**Verified today (read-only calls).**
- `facilio-customization.list-modules` (custom only, 5 shown): returned module id, API name, display name and `isCustom` (for example names beginning `custom_`). Options: `custom`, `search`, `page`, `pageSize`, `count`.
- `facilio-connected-apps.list-connected-apps`: returned 4 connected apps with id, name, type, hosting type, active flag and sandbox and production URLs.
- Searches found these related actions (not called): `facilio-customization.list-relationships`, `facilio-import.get-module-fields`, `facilio-import.list-importable-modules`, `facilio-platform.list-roles`, `facilio-connected-apps.get-connected-app-file-tree`, `list-connected-app-files`, `list-connected-app-deployments`, `facilio-analytics-dashboards.run-foql-query` (read-only SQL-like query, 2,000 rows per query).

**What it can do beyond reading (do not call without confirmation).** Create modules (`create-module`), build forms, raise work orders, import spreadsheets (`create-import`, `upload-import-file`, `commit-import`; Excel only, a CSV is rejected), deploy connected apps to sandbox and production, manage users and roles, delete dashboards. A push into a customer's org through this connector is possible in principle; Part E must treat it as a consequential action with explicit confirmation.

**Which org and region.** The connection answers for one org tied to the signed-in account; the org and its region were **not identified** in this audit (connected-app URLs show both `us` and `ae` stacks, so no assumption is made). The connector's own address is the Azure AE one; the addresses for other regions were **not found**. C9's "regional MCP address per org" is therefore still open: ask Facilio platform for the regional list, or find it in the `facilio-connections-mcp` repo.

**Verdict.** The practical source of real modules and fields (list-modules, module metadata, `get-module-fields`) and of live configuration for FTR approach B. It is also the only route that could change a live org, so keep it read-only in the lifecycle until the user approves otherwise.

## 6. Facilio Work Apps and Facilio Run connectors (platform hosting)

- **Facilio Work Apps** (`mcp.facilio.work`, 30 tools): manage apps on facilio.work (create, deploy, logs, history, people, visibility, review, database and file reads). `list_apps` (read-only) showed the apps this account can see: `comet`, `meteor`, `facilio-delivery-studio`, `proxy`, `license`, `agent-logs`, `agent-pulse`, with owners, review status and the functions each exposes. Comet and Meteor are approved, owned by shrivathsan@facilio.com, visible to all of Facilio, and this account has the **viewer** role on them.
- **Facilio Run** (`mcp.facilio.run`, 18 tools): same kind of platform tools for facilio.run sites (create, deploy, read file, SQL Lab). Not called.

## 7. Meteor (`https://meteor.facilio.work/#/library`)

- **Login.** The page opened already signed in as the user's Facilio account (platform single sign-on in the browser pane). Claude did not sign in or enter anything.
- **What it is** (page "How Meteor works"): a place where people build **Facilio prototypes with Claude from the "CMMS Demo Kit"**, keep them in a private library, get them reviewed, share by link, download as images or HTML, send to Comet (video or walkthrough), or hand to a Connected App builder (a build spec). It has a Create page (feature idea, Connected App, or From a PRD), My library (empty for this user), Projects, Explore (5 published concepts), Guide and What's new.
- **Connector (from the guide, not installed here):** `https://mcp.facilio.work/meteor`, named "Facilio Meteor"; Claude Code command `claude mcp add --transport http meteor https://mcp.facilio.work/meteor`. Tool names mentioned in the guide: `get_playbook`, `review_brief`, `ask_meteor_help`, `my_help`, `get_flow_hints`, a compare tool. The full tool list was **not read** because the connector is not installed in this session.
- **What it is not.** The pages show **no catalogue or library of Facilio modules or fields**. The "module" and "app" choices on Create say where a prototype lives, not a list to pull from. Screens come from the CMMS Demo Kit and, for missing ones, from Facilio source code through Kenny. So "retrieve modules from Meteor, exclude PDF templates" (E2.4) has no matching feature. The simplest supported alternative is section 5 (org modules and fields) and section 4 (saved org configuration), with Meteor used to **produce the visual prototype** and a link back into the project.
- **Data rule:** Meteor refuses real customer or employee data; only fictional sample data. Delivery Studio must not push project or customer data into Meteor.
- **Not checked:** whether the Meteor connector can export a module or field list; how a prototype could be linked to a Studio project; any API outside the connector.

## 8. Comet (`https://comet.facilio.work/`)

- **Login.** Opened signed in through platform sign-on, as with Meteor; no credentials entered.
- **What it is:** Facilio's studio for **product videos and guided walkthroughs** made with Claude from the live product UI (CMMS Demo Kit and "Motion Lab"). Home offers New video, New walkthrough, Library, Reviews, Music, About, Guide. The About page lists the "crew" (instruction files Claude reads: fact-checker through Kenny, screenwriter, director, camera crew, reviewer, voice) and a nine-stage order. Walkthroughs are click-through demos on real screens.
- **What it is not.** No UAT guide, test case or FTR feature was seen. E2.6's idea of feeding a UAT guide into Comet does not match what Comet does. A Comet video or walkthrough could be an **extra training or demo deliverable**, nothing more was verified.
- **Not checked:** the Guide page (`#/guide`) made the browser pane stop responding twice and was not read; the Comet connector name and tools (the Meteor guide implies a Comet connector exists and that the demo kit is downloaded through it); any API.

## 9. Clari (`https://copilot.clari.com/myCalls`)

- **Public or login.** The address redirects to `https://copilot.clari.com/login` (page title "Salesloft CI", an email-only sign-in). Nothing is public. Claude did not sign in.
- **Connector.** `Facilio Clari`, `https://mcp-sam.facilio.in`, **is installed for this account but disabled in this session**. Claude asked to enable it and the permission check denied the request, so its tools were not listed and **no transcript access was tested**. This needs the user to turn it on (or allow the action).
- **Public documentation (from docs, third-party pages, not Facilio's account):** Clari Copilot has a REST API, base `https://rest-api.copilot.clari.com`, authenticated with an API key and password pair created by an admin under Workspace Settings > Integrations > Copilot API (one pair per organisation; regenerating it breaks existing integrations), `GET /calls` for call metadata (paged) and `GET /call-details?id=...` for a call with transcript turns, speaker ids and start and end times; about 10 requests per second. The official reference at api-doc.copilot.clari.com was **not opened**.
- **Verdict.** Supported transcript access is plausible (list, details, speakers, timestamps). Recordings and other metadata, and whether Facilio's own connector exposes them, are **unconfirmed**. Alternative already available: Teams meeting transcripts through the M365 connector (section 2).

## 10. facilio.run (`https://facilio.run/`)

- **Login.** Opened signed in through platform sign-on. The page is "Facilio Run, internal site directory".
- **What it is:** a directory of internal sites hosted on the Facilio platform (names such as support-desk, si-health, customers, run-index, with owners, deploy counts and sizes). It is the same hosting family as facilio.work.
- **What it is not.** It is **not** a catalogue of "connected applications and MCP tools for project retrieval, document generation or result submission" as E3 assumed. Connected Apps in the Facilio product are listed by the connections MCP (section 5); the Facilio Run connector (section 6) manages these hosted sites.
- **How to use it (user, 4 Nov 2026):** link to the useful sites from Delivery Studio so people can open them; no integration is needed. The same applies to Meteor and Comet.
- **Not checked:** each site's contents; whether any site already offers an MSA, UAT or onboarding capability (`fife-brd-workshops` exists, purpose unknown); search inside the directory.

## 11. Other things Part E asked to verify

| Item | Result |
|---|---|
| Claude subscription authentication | Connectors above run as the signed-in person; no Anthropic API key is involved in any of them. Delivery Studio itself uses DeepSeek unless the Claude fallback key is configured. **Not tested:** a real Claude app session against the live Delivery Studio. |
| MCP tool calls | Worked for M365, Kenny, Facilio connections, Facilio Work Apps. |
| OneDrive file retrieval | Search verified; file read **not tested** (no customer file was opened). |
| Image and attachment handling | Delivery Studio connector: pictures do not go through. M365: not tested. Meteor: screenshots attach in Claude Code, not through the connector. |
| Local file access | Not tested from Claude Desktop; Claude Code in this session reads local files. |
| Result submission | Delivery Studio connector accepts drafts and hand-off answers only. |
| Connected application permissions | Connections MCP shows what is active; write actions exist and must be confirmed. |
| Skills | The session lists the Facilio skills (`facilio-impl-toolbox`, `facilio-org-configuration-queries`, `facilio-connection-builder`, `facilio-solution-document-builder` and others, plus `get_impl_skills` in the Delivery Studio connector). None was used for this audit. |

## 12. What needs a person to act

1. Turn on the **Facilio Clari** connector for the session (or approve it) so its tools and a transcript call can be tested.
2. Decide whether Delivery Studio should add a **Meteor** and **Comet** connector to the Claude setup page, or only link to the websites.
3. Confirm which **org and region** the Facilio connections connector answers for, and where the other regions' addresses are (C9).
4. Confirm that SharePoint search across other people's folders is acceptable for the MSA pick-list, and how long a pulled MSA may be kept.

## 13. What facilio.work itself already gives us (read from the platform contract, `platform_docs`, 4 Nov 2026)

Checked because the user shared MCP server templates and docs (remote-mcp-oauth-template, streamable-mcp-server-template, MCP-STARTER-KIT, the MCP TypeScript SDK, the MCP build-server guide, Claude's custom-connector article and the API MCP connector page).

**The templates are not needed.** On facilio.work every app can declare tools in `work.json` and the platform serves them as its own MCP server at `https://mcp.facilio.work/<app>`, with Entra sign-in; tools run as the signed-in person (`ctx.viewer`), so the app's own role checks apply. Delivery Studio already works this way (31 tools). Hosting a separate MCP server elsewhere would mean new hosting and our own OAuth, which the roadmap rules out.
- remote-mcp-oauth-template: MIT, Node/Express, own OAuth 2.1 with dynamic registration, in-memory state, 2 commits: a reference for the OAuth shape only, not for deployment.
- streamable-mcp-server-template: MIT, TypeScript on Bun or Cloudflare Workers, 148 stars, active (last commit 5 Oct 2026): the better reference if a standalone server were ever needed.
- MCP-STARTER-KIT: the link returned 404; not reviewed.
- TypeScript SDK: v2 packages `@modelcontextprotocol/server` and `/client`; v1 `@modelcontextprotocol/sdk` still receives fixes. Not used by us (the platform builds the server).
- Claude custom connectors (from the help article): on Team plans only owners can add them; the server must be reachable from Anthropic's cloud. The API-side MCP connector is a different feature that needs an Anthropic API key, so it is **out** under the no-API-key rule. Not stated in the pages read: result size limits, timeouts, Claude Code support (our own docs already use `claude mcp add --transport http` for Claude Code; not re-tested).

**What the platform offers that Part E can use** (from the contract; none of it called today except `list_apps`):
| Capability | Use for Part E | Limit |
|---|---|---|
| Tools in `work.json`, with `"confirm": true` for writes | New push, pull and project tools. Writes show as destructive in Claude and ask for a Confirm click in Teams through Otto: the "explicit confirmation" of E4 | A changed tool list needs the connector removed and re-added in Claude |
| Several server functions per app (`server/<name>.js`) | Put the push and pull engine in its own function instead of growing the 349 KB `api.mjs` | 5 MB for all of `server/`; no npm install, bundle into one file |
| `ctx.db` | Transfer records, statuses, audit | 128 KB per value (already handled by gzip and splitting) |
| `ctx.files`: `put` (up to 4 MB), `uploadUrl` (presigned PUT), `url` (signed download, 1 min to 1 h) | **Binary files without the browser:** a connector tool can return a presigned upload URL and Claude Code can PUT the file to it; a tool can return a signed download URL for the folder mirror. Untested; needs a shell (Claude Code), not Claude web | the URL is the permission, return it only to allowed viewers |
| `ctx.fetch` with the **owner's** stored credential (OAuth2 incl. device-code), `ctx.fetchJob` (about 5 minutes) | A server-side Microsoft Graph file read is possible only with a credential the owner stores and grants, and then **everything is read as the owner**, not as the viewer: a privacy risk for the MSA pick-list, so the Claude-driven route stays the default | 18 s per call, 3 MB body |
| Work tokens (`workToken: true`) | Call Facilio services **as the viewer**, if the target service accepts the app id; could be the proper way to read a customer org server-side | Needs the service owners to allow our app; only facilio.* hosts; not available in `fetchJob` |
| `ctx.sql` (read-only SQL Lab per cloud) and `ctx.search` (read-only OpenSearch per region, product records) | Candidate for FTR approach B (read what is really in an org). Not verified that configuration tables are reachable | 10 queries/min, 1,000 rows; 20 searches/min; viewer is logged |
| `ctx.teams.send`, Otto | Notify the team when a pull or push needs review or failed | 30 sends/min per app; people can mute |
| `ctx.broadcast` and WebSocket | Live status of a transfer | budgets per minute and per day |
| `ctx.llm` | Existing AI route (DeepSeek and other open models on Bedrock, no key) | about 20 requests/min per viewer; **no Claude on the server**, so Claude work stays in the person's own session |

**Platform limits that matter.** 25 s per call (29 s round trip), response up to 5.5 MB, 512 MB memory; a person can own or collaborate on at most 3 unpublished apps (Delivery Studio is still "pending"); only approved apps are open to everyone; approvers, not tools, approve. facilio.run is for prototypes and needs no review; Delivery Studio belongs on facilio.work because it holds customer data and credentials.

**Not tested:** a presigned upload from Claude Code; work tokens against a Facilio service; SQL Lab or OpenSearch for configuration data; a Graph credential; whether tool results can carry large payloads to Claude.

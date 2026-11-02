# 5. Backend schema

The server is one function, `work/server/api.mjs`, in front of the platform database (`ctx.db`) and file store (`ctx.files`). This document lists what is stored, where, and which routes read and write it. Source of truth for any detail is the code; this is the map.

## Storage layout (ctx.db collections)
| Collection | Holds | Written by |
|---|---|---|
| `projects` | One record per project: `id`, `name`, `customer`, `description`, `startDate`, `endDate`, `type` (`cmms` or `agents`), `customerAccessEnabled`, `archived`, `createdBy`, `createdAt`, `updatedAt`, `members[]` (`id`, `email`, `name`, `role`) | project routes |
| `usr` | People who signed in (identity from the platform) | sign-in |
| `grant` | Admin grants (admin or sub admin) given by the platform owner | admin routes |
| `doc.<pid>` and `dp.<pid>` | Document sections of a project: head (version, parts) and the data parts | `PUT /docs/:section` |
| `it.<pid>.<kind>` and `ip.<pid>.<kind>` | Records of one kind: head (meta) and data parts | `PUT /items/:kind/:item` |
| `fl.<pid>` | File records (name, size, chunks) for uploads | file routes |
| `au.<pid>`, `au.sys` | Activity trail per project and for the system | every write |
| `gr.<pid>` | Customer user-guide answers | guide routes |
| `fb.<pid>` | Customer feedback and questions | feedback routes |
| `ml.<pid>`, `inbox`, `mlconv`, `mailseen` | Support mailbox: mail filed to a project, unrouted inbox, conversation links, messages already read | mail routes |
| `tpl`, `tpv`, `tpp` | Templates (head, versions, publish state) | template routes |
| `ho` | Open in Claude hand-off rows (project, user, package file id, expiry, result) | `POST /handoff`, connector |
| `ai`, `aj`, `ajp` | AI configuration and use counts; part-by-part AI jobs and their parts | AI routes |
| `cfg` | Settings (mail rules, AI providers, owner) | admin routes |
| `ulay` | Per-person menu layout (Tabs and Layouts) | `PUT /me/layout` |
| `rl` | Rate-limit counters | `limit()` |
| `dm`, `hsnap` | Admin dashboard snapshots | admin routes |

Values over about 100 KB are gzipped and split into parts to stay under the platform's 128 KB limit (`save`, `unpack`).

### Record meta (`it.<pid>.<kind>` head)
`{ v, cb, cs, ub, us, ca, ua }`: version, created by and side (`facilio` or `customer`), updated by and side, created and updated times. Writers pass the version they read; a conflict is returned, not overwritten.

## Document sections (`doc.<pid>`)
| Section | Content |
|---|---|
| `workshop` | The main project document: project details, modules, custom modules, field and form operations, state flows, roles, notifications, processes, requirements, questions, BRD settings and version history, activity log |
| `transcripts` | Uploaded transcripts and the statements (candidates) taken from them, with review history |
| `planner` | Requirement sessions and MSA scope |
| `brddoc` | BRD list, per-BRD edits, inserted blocks, hidden blocks, status and exports, logos |
| `reviews` | Module review decisions |
| `plan_struct` | The project plan structure |
| `notifications`, `agentscope`, `people` | Notification settings, agent scope, customer-side people and stakeholders |
| `config_digest`, `config` | The customer configuration (digest and source details) |
| `guide_published` | The published customer user guide |

## Record kinds (`it.<pid>.<kind>`)
| Area | Kinds |
|---|---|
| Delivery control | `action`, `decision`, `raid` (risks, assumptions, issues, dependencies), `signoff`, `cr` (change requests), `minutes`, `rep` (status reports), `kpi`, `task`, `cal`, `lcstage` |
| Requirements | `usecase`, `discrepancy`, `brdrev`, `scope`, `modbrief`, `fieldreq`, `mfind` (MSA scope findings) |
| Configuration | `cmodx` (custom modules), `cfgrel` (relationships), `capp` (connected apps), `digest`, `cflow` (combined flows), `wb` (whiteboards) |
| Contract | `ctrcore`, `ctrfees`, `ctrlegal`, `ctrrates`, `ctrwatch`, `agreement`, `owner` |
| Onboarding | `onb`, `onbsub`, `onbfile`, `onbws` |
| UAT and go-live | `build`, `uat`, `utc` (test cases), `utr` (results shared with the customer), `checklist` |
| Hypercare and closure | `hc`, `hcrep`, `ho`, `close`, `lesson` |
| Guides | `ugd`, `ugv`, `ugu`, `vid` |
| Support | `tkt` (tickets), `res` (resources), `pnote`, `note`, `interest`, `news` |
| AI | `ai` (drafts in Deliverables and AI) |

`utc`, `mfind`, `lcstage` and `cal` are team-only: customers cannot list or change them.

## Routes
Prefix `/api`. Every route checks identity first; project routes check the member's role (read, edit, owner). Counts are of route definitions in `work/server/api.mjs` (about 117).

| Area | Routes |
|---|---|
| Projects | `GET/POST /projects`, `GET/PATCH/DELETE /projects/:id`, `GET /projects/:id/open` (project, members, documents and kinds in one request), `POST/DELETE /projects/:id/members`, `PUT /projects/:id/customer-access`, `GET /projects/:id/audit`, `GET /projects/:id/search` |
| Documents | `GET /projects/:id/docs`, `GET/PUT /projects/:id/docs/:section` |
| Records | `GET /projects/:id/items?kinds=`, `PUT/DELETE /projects/:id/items/:kind/:item` |
| Files | `POST /projects/:id/files`, `PUT /projects/:id/files/:fid/chunks/:n`, `POST .../complete`, `GET/PATCH/DELETE /projects/:id/files/:fid` |
| AI | `POST /projects/:id/ai/run`, `/pack`, `/review-pack`, `/import`, `/job`, `/job/:job/part`, `/job/:job/finish`, `/flow-image`, `/flow-text`, `/guide-section`, `/kickoff`, `/:item/decision`; `GET /ai/status` |
| Open in Claude | `POST /projects/:id/handoff`, `GET/DELETE /projects/:id/handoff/:hid` |
| Tickets and mail | `GET /tickets`, `POST /projects/:id/tickets/ingest`, `/sync-client`, `/:item/message`; `GET /mail/inbox`, `POST /mail/sync`, `PUT /mail/rules`, `/mail/settings`, `GET/POST /projects/:id/mail...` |
| Tasks | `POST /projects/:id/tasks/classify`, `/extract`, `/:item/assist`, `/:item/checklist` |
| Customer | `GET/POST /projects/:id/feedback`, `GET/PUT /projects/:id/guide-responses`, `GET /projects/:id/discover` |
| Templates | `GET/POST /templates`, `GET /templates/:id`, `POST /templates/:id/versions`, `/status`, `DELETE /templates/:id` |
| Me | `GET/PUT /me/layout`, `GET /my/work`, `GET /knowledge`, `GET /health` |
| Admin | `/api/admin/...` (overview, projects, users, access grant and revoke, AI provider, activity) |
| Connector | `POST /api/` with header `x-work-mcp-tool` (the tools in `work/work.json`) |

## Connector tools
`list_projects`, `suggest_ticket`, `create_ticket` (Teams); `connector_help`, `find_projects`, `project_overview`, `get_requirements`, `get_statements`, `get_open_questions`, `get_use_cases`, `list_record_kinds`, `get_records`, `get_tickets`, `get_document`, `search_project`, `recent_activity`, `get_task_pack`, `get_review_pack`, `save_draft`, `get_handoff`, `submit_handoff_result`. They call the routes above as the signed-in person.

## Permissions
| Action | Read | Edit | Owner | Admin |
|---|---|---|---|---|
| Open project, read documents and records | viewer and up | | | admin and sub admin |
| Change documents and records, AI, hand-off | | editor and up | | admin |
| Approve a BRD, manage members | | | project owner | admin |
| Grant admin access, handover | | | | platform owner only |

## Limits per person (10 minutes)
`conn` 600, `write` 2000, `upload` 200, `ai-part` 240, `ai` 40, `handoff` 60, `ticket` 60, `teams` 30, `create` 30, `mail` 20, `ai-image` 15, `ai-admin` 15.

## Audit
Every write adds an entry to `au.<pid>` (who, what, when). Credentials and prompts are never logged; AI use is counted, not recorded.

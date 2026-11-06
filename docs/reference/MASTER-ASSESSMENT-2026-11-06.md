# Master transformation: assessment and plan (6 Nov 2026)

Answers the ten deliverables of the 6 Nov master specification. Nothing was built or changed. Grounded in [AUDIT-2026-11-04](AUDIT-2026-11-04.md), [CONNECTORS-2026-11-04](CONNECTORS-2026-11-04.md), [CLAUDE-ECOSYSTEM-FEASIBILITY-2026-11-06](CLAUDE-ECOSYSTEM-FEASIBILITY-2026-11-06.md) and `HANDOFF.md`. Items not tested are marked **NOT TESTED**.

## 0. Where the specification conflicts with what is possible (decide these first)

| # | Specification says | Fact | Closest compliant design |
|---|---|---|---|
| C1 | A central agent runs Claude for everyone; a Studio button sends a task to it; no one switches to Claude | Running Claude on the server for staff needs an API key (or Anthropic's written approval). Connectors (Microsoft 365, Facilio MCP, Kenny) belong to **a person's own Claude session**, not to the Studio server | **Job queue.** A Studio button writes a *job* (for example "pull MSA for Mansions"). Claude, in the person's own session, reads the queue through the Studio connector, does the work with its own connectors, and saves the result as a transfer. The page then shows the result. The website cannot start Claude by itself |
| C2 | No installs on laptops | The person needs Claude Desktop (or claude.ai) with the Studio connector added once by an owner | One connector, no skills or Node.js to install |
| C3 | Studio hosts "Claude Chat" and a "Code workspace" | Needs the API; coding agent needs separate hosting | Not built. Chat and coding stay in each person's Claude; the Studio shows projects, outputs, queue, status |
| C4 | Conversations appear as native Claude Desktop projects | No documented API to create or sync them | Conversation record in the Studio plus connector tools (see feasibility §4) |
| C5 | 7-item navigation | Roadmap E15 has 8 stage groups | The 7 items replace E15's list (mapping in §4). Needs your yes |
| C6 | Comet makes the UAT guide and video guide | Comet is a product-video and walkthrough studio, no UAT guide feature seen | Guides come from Claude with skills; Comet only for optional videos. **Check with its owner** |
| C7 | Mockups of the customer's organisation in Meteor | Meteor accepts only fictional data, never real customer data | Meteor mockups use sample data built from module names and fields, no customer records. **Check with its owner** |
| C8 | Watch Outlook continuously | The Microsoft 365 connector is read-only and has no event feed | Power Automate (or Graph webhook) captures mail into the Studio; Claude analyses it when a session picks it up (§6) |
| C9 | Recording analysis by Claude | Video understanding in Claude Desktop is **UNVERIFIED**. Teams transcripts are available through the Microsoft 365 connector | Use the Teams transcript of the recording; frame extraction only if proven |
| C10 | PostgreSQL | facilio.work gives a key-value store and file store, not a SQL database | Keep `ctx.db` and the item/document model |

## 1. Existing application assessment (Deliverable 1)

One plain-JavaScript page app (about 128 files, esbuild) and one server function (`work/server/api.mjs` plus `_*.mjs` helpers) on facilio.work. Data: item kinds and documents in the platform store. A 40-tool connector. A push/pull **transfer engine** (statuses, versions, approval, audit) already exists, as do MSA extraction, plan-from-contract rules, question rules, transcript parse/import, task suggestions and task reminders.

| Class | Existing parts |
|---|---|
| **Reuse** | Transfer engine (`_transfer*.mjs`), `msa_extraction_save` / `create_project_from_msa`, plan rules (`_planfrommsa.mjs`), kick-off deck HTML builder, timeline/Gantt/calendar, whiteboard and state-flow builder, transcript parse/import, workshop room, BRD editor and import, org package export/validate/gap table, FTR HTML/Excel, UAT guide HTML, tasks with suggestions and Teams reminders, audit log, demo project, `get_impl_skills` |
| **Redesign** (new layout, same logic) | Navigation, project creation, project overview, Solution Configuration areas, hypercare, Help |
| **Integrate** | Microsoft 365 (through Claude), Facilio connections MCP, Kenny org config, Meteor, Comet, Power Automate |
| **Replace** | "Open in Claude" hand-off engine (`claudelogic.js`, `claudehand.js`, `/handoff` routes) by the job queue; the many menu groups by the 7 items |
| **Hide, keep** | Notifications, rules, views, roles, KPIs, SLA (the `EXPOSED` menu list in `src/shell.js` already supports hiding without deleting) |
| **Deprecate later** | Show Facilio marketing group, duplicate hubs, old mail sync (blocked by a Microsoft 403) |

Known weak spots: about 36 open review findings ([review-2026-11-05](../reports/review-2026-11-05.md)); Playwright suites not run; no real Claude session test of the connector yet.

## 2. Architecture (Deliverable 2)

```
 Person (browser)                    Person's own Claude (Desktop / claude.ai / Code)
 Delivery Studio UI  <-- reads --+     |  Microsoft 365 (read)   Facilio MCP   Kenny   Meteor  Comet  Clari/Teams transcripts
 (facilio.work)                  |     |        ^ own sign-ins, own access
   | job queue, records,         |     v        |
   | approvals, audit    <-- Studio connector (MCP, one for everyone) -->  Skills text (get_impl_skills, from GitHub)
   v
 Studio server function (facilio.work): auth, projects, transfers, jobs, tasks, audit, document store
 Optional, separate hosting (not facilio.work): Power Automate/Graph webhook receiver; Vexa call bot
 GitHub: delivery-studio-skills (SKILL.md), Facilio config repos (read via Kenny)
```

Rule: the Studio server never holds a person's Claude or Microsoft sign-in. Claude does reads and generation; the Studio stores, shows, versions and asks for approval.

## 3. Feasibility matrix (Deliverable 3)

| Requirement | Result |
|---|---|
| Create project, org ids, sandbox/production | Fully possible (own code) |
| Pull MSA from My Drive | Possible with limits: Claude searches and reads through the Microsoft 365 connector in the person's session; the button posts a job; person confirms uncertain matches in Claude or in the Studio queue. Manual upload: fully possible |
| MSA analysis, contacts from Outlook | Possible with limits (read-only; contacts shown for review) |
| Kick-off HTML, plan HTML/Excel, "Inspect with Claude" | Possible: generation is built; "Inspect" becomes a change-request job Claude applies, then person saves or discards |
| Whiteboard as authoritative BRD input | Fully possible (stored flows passed to BRD rules; approval before regeneration) |
| Transcripts from Teams | Possible with limits (**NOT TESTED**); Clari connector off; Vexa needs hosting |
| Requirement intelligence, questions list | Possible (rules exist; Claude does the reading) |
| Multiple BRDs, Pull My BRD, import/export | Possible; PDF/DOCX export is custom work |
| Mockups | Possible with limits (C7); connector tools not read yet |
| Org package export | Generated design package possible; **verified import-ready package needs the internal tool** (keep the generator modular) |
| UAT guide, FTR, org package import and compare | Possible (FTR/UAT builders and package parser exist) |
| Recording analysis | **Not confirmed** (C9) |
| UAT feedback / hypercare from Outlook to tasks | Possible with limits: pull on demand now, event capture needs Power Automate |
| Fetch Org Status via Facilio MCP | Possible: read actions exist; the connector also has write actions, so keep it read-only and mark unverifiable items "Needs Manual Verification" |
| Sandbox to Production promotion | Possible as a **reviewed checklist**; the deploy itself needs the internal mechanism and explicit approval |
| Solution document | Possible (HTML now; PDF/DOCX custom) |
| Central agent, embedded chat/code, native Desktop sync | **Not supported without the API** (C1, C3, C4) |

## 4. Proposed navigation (Deliverable 4)

| Main item | Working areas (no sub-tabs) | Replaces (E15 group) |
|---|---|---|
| Project Overview | Kick-off, Project Plan, Requirement Sessions | 1 Kick-off, 2 Requirement sessions |
| Solution Configuration | BRD, Mockups, Manual Intervention | 3 Mockup & BRD |
| Solution Export | Export Org Package, generated vs verified status | part of 3 |
| UAT Guide & FTR | User guide, FTR report, import implemented package | 4, 5 |
| UAT Feedback & Tasks | Feedback inbox, Kanban, Fetch Org Status | 4 |
| Hypercare | Same task board filtered, Fetch Org Status | 7 |
| Solution Document | Generate, preview, export | 8 |
| Separate: Project Settings, Claude Setup, Skill Setup, Help, Activity feed, Queue (jobs waiting for Claude) | | Settings, Help |

## 5. Data model (Deliverable 5)

All of it uses the existing item and document store; new kinds are marked (new).
- **Project**: id, customer, type, owner, stage, status, members.
- **Organisation** (new, many per project): orgId, environment, region, name, last verified, credential reference (never the secret).
- **Document**: kind (msa, brd, mockup, ftr, guide, solution, package), versions, source, approval status; stored as transfers with sha, so history and approval exist.
- **Requirement / decision / question / action**: existing items; each keeps source (document, transcript line, email).
- **Task**: one engine; field `area` = uat | hypercare | project; keeps `sourceRef`, evidence, status history. (Hypercare reuses this.)
- **Config snapshot** (new): org, section, time, read-only result of Facilio MCP; evidence for status changes.
- **Milestone**: rows of `plan_struct` with planned/actual dates.
- **Conversation** (new): project, topic, messages, sources.
- **Job** (new): project, kind, parameters, status (waiting, claimed, done, needs input), requested by, result transfer id.
- **Audit**: existing `au.<project>`; every transfer, approval and job writes to it.

## 6. Integration plan (Deliverable 6)

| System | How | Permission | Notes |
|---|---|---|---|
| Microsoft 365 | Claude's connector, read-only | person's own scopes (Files, Mail, Sites, transcripts already granted) | cannot write or send; no events |
| Outlook events | **Power Automate** flow (mail arrives, post to a Studio endpoint) or Graph subscription | a service credential approved by Microsoft admins | most reliable; MCP polling only works while someone's Claude runs. **NOT TESTED**; whether a facilio.work function accepts a signed webhook is **unverified** |
| Facilio MCP | Claude's connector | person's access to the org | read first; write actions need explicit approval |
| Kenny | Claude's connector | already connected | saved org config is a snapshot; absence is not proof |
| Meteor / Comet | Claude connectors (`mcp.facilio.work/meteor`; Comet connector unverified) | Facilio sign-on | see C6, C7 |
| Vexa | separate host | n/a | needs container and speech-to-text ([VEXA-REVIEW](VEXA-REVIEW-2026-11-04.md)); Teams transcripts avoid it |
| GitHub skills | Studio server reads `delivery-studio-skills`, serves via `get_impl_skills` | read token held as a platform secret | instructions only; scripts do not run |

## 7. Code structure (Deliverable 7)

Keep the repository. Add: `work/server/_jobs.mjs` (queue), `_orgs.mjs` (organisations), `_snapshots.mjs`, `_conversations.mjs`; new views `projectcreate`, `overview` (three areas), `configuration` (three areas), `export`, `uatftr`, `feedback`, `hypercare`, `solution`; keep logic in pure `*logic.js` files with tests. Fold new connector actions into existing tools (the app is at the 40-tool cap). Skills live in a separate GitHub repo `delivery-studio-skills/`.

## 8. Phases (Deliverable 8; effort is a rough estimate in working days for one developer plus Claude, not a commitment)

| Phase | Content | Days | Depends on | Acceptance |
|---|---|---|---|---|
| 1 | Job queue, organisations, new navigation shell, project creation | 6 | none | create a project with org id; queue visible; old pages still reachable |
| 2 | MSA pull/upload, analysis, contacts, kick-off + plan HTML (Stage 1 in progress) | 6 | 1 | MSA to approved extraction to project, kick-off and plan HTML exported |
| 3 | Requirement sessions: whiteboard, transcripts, question list | 6 | 2 | saved flows reach the BRD input; transcript attached to a workshop |
| 4 | BRDs (multiple), import, manual intervention, mockup connector | 8 | 3, C7 answer | two BRDs generated from one project; imported BRD versioned |
| 5 | Org package export (modular), compare, FTR, UAT guide | 8 | 4 | package marked "generated, not verified"; FTR HTML + Excel |
| 6 | Feedback to tasks, Kanban, Fetch Org Status | 7 | 5 | each task has source and evidence; unverifiable marked manual |
| 7 | Hypercare, Power Automate capture | 5 | 6, webhook decision | email becomes a task without duplicates |
| 8 | Solution document, Help rewrite, security and audit pass, sandbox to production checklist | 8 | 7 | document from actual snapshot; permissions tested with two projects |

## 9. Cost and authentication (Deliverable 9)

- **Covered by existing subscriptions:** every Claude action in a person's own session (Microsoft 365, Facilio MCP, Kenny, skills text, extraction, generation). Usage counts against that person's plan limits; heavy jobs may hit them.
- **Needs API billing or Anthropic approval:** any server-side or automatic Claude run (embedded chat/code, unattended sweeps, scheduled analysis).
- **Infrastructure costs that remain:** Power Automate licences (check plan), a small host for webhooks if facilio.work cannot receive them, Vexa hosting and speech-to-text if used, GitHub. No prices were checked.
- Open question for Anthropic sales: may we host Claude for our own staff, each on their own seat? (feasibility §1)

## 10. First milestone (Deliverable 10)

"Project to approved kick-off": create project with org id, job "pull MSA", Claude reads it from OneDrive in the person's session, extraction approved in the Studio, project created, kick-off HTML and plan HTML shown and exported. This is Stage 1, already half built, and it proves the job queue, the connector round trip and the approval step with no API.

## 11. Risks and not checked

Connector round trip with a real Claude session; Microsoft 365 file read and transcripts; Power Automate to facilio.work; Meteor/Comet connector tools; video analysis; legal confirmation from Anthropic; the 36 open review findings; cost figures.

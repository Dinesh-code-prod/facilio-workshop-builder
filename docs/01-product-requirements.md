# 1. Product requirements (PRD)

Facilio Delivery Studio is the implementation team's workspace for running a customer project from contract to hand-over. This document says what the product is for, who uses it, and what it must do. How it is built is in [02-technical-requirements.md](02-technical-requirements.md).

## Purpose
Facilio consultants run many customer implementations. What the customer agreed lives in workshops, transcripts, spreadsheets and chats, and is easy to lose between the workshop and the BRD. Delivery Studio keeps it in one place and traces each requirement through the BRD, configuration, guides and UAT. That shortens the time to go-live and reduces misses at hand-over.

## Users
| User | What they need |
|---|---|
| Implementation consultant | Capture workshops, confirm requirements, design modules and flows, write the BRD, prepare UAT and guides |
| Project manager | Plan, status reports, risks and issues, change requests, sign-offs |
| Solution architect | Module, state flow, role and notification design; check configuration against requirements |
| Delivery lead / platform owner | See all projects, manage access, review readiness |
| Customer stakeholder | Prepare for sessions, review and sign off, run UAT (customer sign-in is not enabled yet) |
| The team's own Claude | Read project facts and prepare drafts through the connector (see [reference/claude-connector.md](integrations/claude-connector.md)) |

## Scope: what the product does
Grouped as the team menu shows it (`src/shell.js`).

| Stage | Capability |
|---|---|
| **Project** | Dashboard and Project Overview (where are we?); Tasks, Governance and RAID, Change Requests, Deliverables and AI, Status Reports, Traceability and Quality (run the project) |
| **1. Kick-off and Planning** | Contract (MSA, scope, requirement session planner), kick-off deck, customer project plan |
| **2. Workshops and Requirements** | Facilio Screens (demo library); Requirements and Use Cases (transcripts, statement review, requirements register, open questions, use cases); Checks and Validations (readiness, MSA scope check) |
| **3. Solution Design and Configuration** | System modules and form builder, state flow builder, process whiteboard, roles and access, notifications, data onboarding, agent setup, configuration hub, BRD draft |
| **4. UAT and Go-Live** | Build, UAT and go-live, agent testing, FTR report (Excel), KPI workbooks |
| **5. Training and Guides** | Guides and video studio, user guide builder, video to guide, notes and links |
| **6. Hypercare, Handover and Closure** | Hypercare issues and reports, hand-over and closure |
| **Support and Tickets** | Inbox (support mailbox), tickets from clients, e-mail and Teams |
| **Customer View** | Introduction, learn and prepare, product tour, module guides, user guide, dashboard gallery, portal |
| **Help and Settings** | Team guide, what's new; project settings (details, keeping the project, members, configuration source, exports, Claude connection, audit); templates; tabs and layouts |
| **Admin** | Command centre for the platform owner: projects, users, access, AI provider, activity |

## Core requirements
1. **Requirements traceability.** Only requirements marked Confirmed reach the BRD. Each statement taken from a transcript is accepted, merged, clarified or rejected by a person, with history.
2. **BRD generation.** A BRD is built from confirmed requirements, modules in scope, flows and roles; it can be edited like a document, imported, deleted, and exported to Word and PDF.
3. **Configuration awareness.** The team loads the customer's configuration export; the product compares it with requirements and shows gaps.
4. **AI help with a person in control.** AI drafts (BRD, UAT, guides, reports, flow from a description) are always unapproved until a person confirms them. Nothing is saved as final by AI.
5. **Open in Claude and the connector.** The team's own Claude can read project facts and send drafts back, using their own Claude plan, with no API key.
6. **Access control.** Only Facilio (`@facilio.com`) accounts sign in. Access is per project (owner, editor, viewer) and checked on the server.
7. **Readiness.** One checks area lists blocking issues, warnings and BRD readiness across the project.
8. **Exports.** BRD to Word and PDF; FTR and KPI workbooks to Excel; project data as JSON.

## Out of scope today
- Customer and guest sign-in (a design exists but is not enabled).
- Live connection to a customer's Facilio organisation (configuration comes from uploaded exports).
- Sending pictures through the connector (use copy and paste).
- Scheduled mailbox sync (the platform has no scheduler; sync is a button).

## Constraints
- Runs on **facilio.work** (Facilio's reviewed internal-app platform). The app review is pending, so only the owner and collaborators can open it.
- The extracted site must stay under 50 MB (about 42 MB today); one server function with a 25 second limit.
- Facilio colours only (navy #1D1A5E, blue #1570EF, pink #E5197F, sky #8DB8FF); no violet or purple, no glow, no heavy gradients. See [04-ui-ux-design.md](04-ui-ux-design.md).
- Everything a customer or the team sees must look neat and uncrowded and use plain words.

## Success measures
- A consultant can go from a workshop transcript to a signed-off BRD without leaving the app.
- Every BRD requirement can be traced to what the customer said and to the configuration.
- A team member can get a UAT plan, guide or status report from their own Claude in one conversation.
- No blocking validation issue at sign-off.

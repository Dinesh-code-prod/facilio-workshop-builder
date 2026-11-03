# Menu restructure: what is there, what repeats, and a proposed hierarchy (3 Nov 2026)

Status: **Stage 1 (menu only) done on 3 Nov 2026** (new groups Reports & quality, Configuration & org package, Show Facilio; Contract terms next to Contract; Project Settings tabs regrouped). **Stage 2 (page merges) not started.** The crawl below is the menu BEFORE Stage 1. Source: a crawl of the local preview with `tests/ui/nav-inventory.mjs` (55 pages, every tab and mini-tab opened, 0 page errors). The full crawl is at the end of this file.

## What is repeated or in the wrong place

| # | Topic | Where it sits today | Problem |
|---|---|---|---|
| 1 | Contracts | Contract (1. Kick-off) · Contracts & Integrations (More tools) · MSA scope check (tab inside Checks & Validations) | One subject, three places |
| 2 | Reports | Overview > Reports (8 mini-tabs) · Status Reports page · Governance > Weekly digest · Hypercare > Status reports · Existing Reports | Four "report" homes |
| 3 | Configuration checks | Configuration Hub > Checks (6) · Configuration Analysis > Checks (18) · Checks & Validations > Source checks | Same job, three lists |
| 4 | Org package | Configuration Hub · Configuration Analysis · Org Package Export · Project Settings > Configuration source · Project Settings > JSON exports (org package card) | Load, look, check and export are split across two menus |
| 5 | Showing Facilio to a customer | Facilio Screens (2. Workshops) · Product Tour (Customer View) · Product Tour tab (Guides & Video Studio) · Dashboard Gallery · Discover more · Explore Facilio (More tools, the team's side of Discover more) | Six places, one purpose |
| 6 | Requirements status | Requirements register + Open questions (inside Transcripts) · Traceability > Coverage · Checks > Scope coverage / Readiness | Two of these are first-class work but hidden as mini-tabs |
| 7 | Customer access | Project Settings > Members & customer access · Customer View > Customer Portal (its rules: what the customer may see or do) | Same settings, two menus |
| 8 | Not a stage item | Notes & Links sits under Training & Guides but holds general project notes and links | Wrong group |
| 9 | Menu label vs page | "Requirements & Use Cases" opens a page titled "Transcripts & Requirement Confirmation" | Name does not match |
| 10 | Overview | Dashboard and Overview both answer "where are we"; Overview has 5 tabs, one (Reports) has 8 mini-tabs | Too much behind one tab |

Mini-tabs that deserve to come up a level: **Overview > Reports** (8), **Transcripts > Requirements register**, **Transcripts > Open questions**, **Checks > MSA scope check** (belongs to Contract), **Governance > Weekly digest** (belongs to Reports).

## Proposed hierarchy (left panel, top to bottom)

1. **Project** (where are we, run it): Dashboard · Overview (Overview, Lifecycle, Roadmap, Plan vs actual) · Tasks · Governance & RAID (Sign-offs, RAID, Decisions, Actions, Minutes, Module owners) · Change Requests · Notes & Links (moved here)
2. **Reports & quality**: Status reports (WSR, Monthly, Weekly digest) · Project reports (the 8 Overview mini-tabs, now tabs) · Traceability & Quality · Readiness checks
3. **1. Kick-off & Planning**: Bring your project in · **Contract** (Agreement, Scope check, Terms & integrations) · Kick-off deck · Project plan
4. **2. Workshops & Requirements**: Transcripts (Transcripts, Review queue, History) · Requirements (Register, Open questions, Use cases, Session to BRD)
5. **3. Solution Design & Configuration**: Modules & forms · State flows · Process whiteboard · Roles & access · Notifications · Data onboarding · Agent setup (agent projects) · BRD draft
6. **Configuration & org package** (new group): Configuration Hub · Analysis (one Checks list) · Export · Load / source
7. **4. UAT & Go-Live**: Delivery · FTR · KPI · Agent testing
8. **5. Training & Guides**: Guides & Video Studio · User Guide Builder · Video to Guide
9. **6. Hypercare, Handover & Closure** · **Support & Tickets** (Inbox, Tickets)
10. **Show Facilio** (new group): Facilio Screens · Product Tour · Dashboard Gallery · Discover more · Explore entries
11. **Customer View** (what the customer sees): Introduction · Learn & Prepare · Module guides · Connecting your systems · Customer User Guide · Portal preview
12. **Help**: Claude setup · Team Guide · What's new · Privacy & data
13. **Settings**: **Project Settings** with tabs Project details · People & access (members, customer access, portal rules) · Org package & exports (source, JSON exports) · Keeping the project · History (audit trail) · Templates · Tabs & Layouts

## How to do it safely (two stages)

- **Stage 1, menu only:** move pages between groups, rename labels, add the two new groups, reorder Project Settings tabs. Every old link keeps working because page names do not change. Low risk.
- **Stage 2, page merges:** Contract hub (3 pages into 1), Reports hub, promote Requirements register and Open questions to their own tabs, one Checks list. Needs page-level changes and tests per merge.

Not covered by the crawl: the customer-only menu, the Admin area, agent-project pages (hidden for a CMMS project), and tabs that only appear with data.

---
## Full crawl

## Projects & delivery > Project
- [Where are we?] Dashboard  (projdash)  -> "Project dashboard"
- [Where are we?] Project Overview  (overview)  -> "Nav Inventory"
    tabs: Overview | Delivery lifecycle | Roadmap | Plan vs actual | Reports
    in "Reports": mini-tabs Overview | Workshops & Timeline | Requirements & Use Cases | Questions & Decisions | Configuration & Readiness | BRD & Sign-Off | Analytics & Pivots | Existing Reports
- [Run the project] Tasks  (tasks)  -> "Tasks"
- [Run the project] Governance & RAID  (governance)  -> "Governance & RAID"
    tabs: Sign-offs | RAID log | Decisions | Actions | Meeting minutes | Module owners | Weekly digest
    in "RAID log": mini-tabs All 0 | Risk 0 | Assumption 0 | Issue 0 | Dependency 0
- [Run the project] Change Requests  (changes)  -> "Change Requests"
    cards: Value by status | Slippage by module
- [Run the project] Deliverables & AI  (aiwork)  -> "Deliverables & AI"
    cards: Deliverables | Analysis helpers | Review queue
- [Run the project] Status Reports (WSR / Monthly)  (reports)  -> "Status Reports"
    cards: Tracking
- [Run the project] Traceability & Quality  (trace)  -> "Traceability & Quality"
    tabs: Coverage | Gaps to fix | Lessons learned

## Discover and define > 1. Kick-off & Planning
- Bring your project in  (transition)  -> "Bring your project in"
- Contract  (msaflow)  -> "Contract"
    cards: Master Services Agreement | How the MSA flows through
- Kick-off Deck  (kickoff)  -> "Kick-off Deck"
    cards: Facilio team | Inventory Co team | Governance | Agreements and call findings
- Project Plan  (plan)  -> "Project Plan"

## Discover and define > 2. Workshops & Requirements
- [Run the sessions] Facilio Screens  (demokit)  -> "Facilio screens"
    cards: Facilio sign-in (CMMS, Vibe)
- [Capture and confirm] Requirements & Use Cases  (transcripts)  -> "Transcripts & Requirement Confirmation"
    tabs: Transcripts & requirements | Use cases   //   Transcripts | Review queue | Requirements register | Open questions | Review history | Session → BRD
    in "Transcripts & requirements": mini-tabs Transcripts | Review queue | Requirements register | Open questions | Review history | Session → BRD
    in "Use cases": mini-tabs Use cases | Discrepancies | Traceability
- [Check before design] Checks & Validations2  (checks)  -> "Checks & Validations"
    tabs: Validations & readiness | MSA scope check1   //   Readiness | Validation2 | Module status | Scope coverage | Source checks | Change history
    in "Validations & readiness": mini-tabs Readiness | Validation2 | Module status | Scope coverage | Source checks | Change history

## Design and build > 3. Solution Design & Configuration
- [Build the solution] System Modules & Form Builder  (modules)  -> "Modules"
    tabs: System485 | Custom13   //   In use | In scope | All   //   Any priority | High | Medium | Low
    in "System485": mini-tabs In use | In scope | All // Any priority | High | Medium | Low
    in "Custom13": mini-tabs In use | In scope | All // Any priority | High | Medium | Low
- [Build the solution] State Flow Builder  (flow)  -> "Stateflow"
    tabs: Stateflows | States | All modules
    in "All modules": mini-tabs In scope | Modules in use | All
- [Build the solution] Process Whiteboard  (whiteboard)  -> "Process Whiteboard"
- [Set up access, alerts and data] Roles & Access Permissions  (roles)  -> "Roles & Permissions"
    tabs: Roles36 | Actors by category | Transition responsibility | Portal workflows | Access matrix | Permission checks   //   All | Internal | Vendor Portal | Tenant Portal | Client Portal | Occupant Portal | Employee Portal
    in "Roles36": mini-tabs All | Internal | Vendor Portal | Tenant Portal | Client Portal | Occupant Portal | Employee Portal
- [Set up access, alerts and data] Notifications  (notifications)  -> "Notifications"
- [Set up access, alerts and data] Data Onboarding  (onboarding)  -> "Data Onboarding"
    cards: What we need from you
- [Agents] Agent Setup  (agents)  -> "Agent Setup"
    cards: What Facilio's agents are | Agents | Agent delivery path
- [Record all configuration] Configuration Hub  (cfginputs)  -> "Configuration Hub"
    tabs: Overview | Modules | Module relationships | Connected apps and tabs | Checks (6)
- [Write the BRD] BRD Draft  (brd)  -> "Document Control"
    cards: Version History | Review and Approval | Project Background | Business Objective | Purpose of this Document | Modules in Scope | Portfolio Hierarchy | Module Dependencies

## Design and build > 4. UAT & Go-Live
- Build, UAT & Go-Live  (delivery)  -> "Delivery"
    cards: Modules built and tested
- FTR Report (Excel)  (ftr)  -> "FTR Report"
- KPI Workbooks  (kpi)  -> "KPI Workbooks"
    cards: KPI definitions

## Launch and support > 5. Training & Guides
- Guides & Video Studio  (vstudio)  -> "Guides & Video Studio"
    tabs: Create | Product Tour | Story ideas and tips
- User Guide Builder  (guidebuilder)  -> "User Guide Builder"
    cards: What the drafts read
- Video to Guide  (vidguide)  -> "Video to Guide"
    cards: 1. Choose the recording | 2. Add the transcript | 3. Save and draft the steps | Saved walkthroughs (0)
- Notes & Links  (resources)  -> "Notes & Links"
    tabs: Notes (0) | Links & resources (0)

## Launch and support > 6. Hypercare, Handover & Closure
- Hypercare  (hypercare)  -> "Hypercare"
    cards: Hypercare period and contacts | Issues | Status reports
- Handover & Closure  (handover)  -> "Handover & Closure"
    cards: Handover checklist | Configuration register for support | Acceptance and closure | Packs and closure report

## Launch and support > Support & Tickets
- Inbox  (inbox)  -> "Inbox"
- Tickets  (tickets)  -> "Tickets"
    cards: No ticket selected

## Share with the customer > Customer View
- Customer Introduction  (custintro)  -> "Customer Introduction"
    cards: Preview
- Learn & Prepare  (prepare)  -> "Learn & Prepare"
    cards: What Facilio is | How the project runs | How to prepare | What to bring | Words you will hear
- Product Tour  (seefacilio)  -> "Product Tour"
    cards: See Facilio in about 4 minutes | Every screen, to open at full size | A request becomes a work order, moves through its steps and is closed with a record of everything that happened. | Every piece of equipment with its location, status, warranty and maintenance history in one place. | Quote the work, get it approved, then invoice it, with the document ready to print or send. | Dispatch the right technician to the right appointment from a board or a map. | Reports in folders, pivots and a data explorer to answer questions about your portfolio. | Setup is where your team configures Facilio: users, connected apps and customisation.
- Module guides  (learnlib)  -> "Module guides"
    tabs: AHU breakdown reported by a tenant | Overdue lift fault escalated to the vendor   //   Core details 0/7 | Location & asset 0/4 | People, SLA & escalation 0/7 | Execution, cost & closure 0/7   //   Use | Rename | Not needed   //   Use | Rename | Not needed   //   Use | Rename | Not needed   //   Use | Rename | Not needed   //   Use | Rename | Not needed   //   Use | Rename | Not needed   //   Use | Rename | Not needed   //   All | To answer | For the workshop | Answered
    in "AHU breakdown reported by a tenant": mini-tabs Core details 0/7 | Location & asset 0/4 | People, SLA & escalation 0/7 | Execution, cost & closure 0/7 // Use | Rename | Not needed // Use | Rename | Not needed // Use | Rename | Not needed // Use | Rename | Not needed // Use | Rename | Not needed // Use | Rename | Not needed // Use | Rename | Not needed // All | To answer | For the workshop | Answered
    in "Overdue lift fault escalated to the vendor": mini-tabs Core details 0/7 | Location & asset 0/4 | People, SLA & escalation 0/7 | Execution, cost & closure 0/7 // Use | Rename | Not needed // Use | Rename | Not needed // Use | Rename | Not needed // Use | Rename | Not needed // Use | Rename | Not needed // Use | Rename | Not needed // Use | Rename | Not needed // All | To answer | For the workshop | Answered
- Connecting Your Systems  (integguide)  -> "Connecting your systems"
    cards: Why integrate | How Facilio connects | Examples of what it looks like | What to expect | What we will ask you
- Customer User Guide  (guide)  -> "Customer User Guide"
    tabs: Guide | Questions & feedback | Customer answers | Modules & order
    in "Questions & feedback": mini-tabs Unanswered 0 | Open 0 | Follow-up 0 | Answered 0 | Resolved 0 | All 0
- Dashboard Gallery  (dashboards)  -> "Dashboard Gallery"
    cards: Categories
- Discover more  (explore)  -> "Discover more with Facilio"
    cards: More ways Facilio can help Inventory Co | CMMS | Mobile | Atom | FM Assistant | Help desk | Vibe | Something caught your eye?
- Customer Portal  (portal)  -> "Customer Portal"
    cards: Customer menu | Sensitive content | What the customer may do | Modules hidden from the customer | Governance cadence | Preview as the customer

## Integrations & admin > Help
- Claude setup  (claudesetup)  -> "Claude setup"
    tabs: 1. Connect Claude | 2. Facilio skills | 3. How it works
- Team Guide  (teamhelp)  -> "Team Guide"
    cards: Your first hour | Set up your Claude: connector, skills and plugins | Kick-off & Planning | Workshops & Requirements | Solution Design & Configuration | UAT & Go-Live | Training & Guides | Hypercare, Handover & Closure
- What's new  (whatsnew)  -> "What's new"
    cards: What's new in Delivery Studio
- Privacy & data  (privacy)  -> "Privacy and data"
    cards: Data requests (platform owner) | Your data | What is stored and who can see it | AI and your own Claude | Cookies and storage | How long data is kept | Terms of use

## Integrations & admin > Settings
- Project Settings & Exports  (settings)  -> "Project Settings & Exports"
    tabs: Project details | Keeping the project | Members & customer access | Configuration source | JSON exports | Audit trail
- Templates  (templates)  -> "Templates"
- Tabs & Layouts  (workspace)  -> "Tabs & Layouts"

## Integrations & admin > More tools
- Contracts & Integrations  (contracts)  -> "Contracts & Integrations"
    cards: What the contracts say (confirmed)
- Configuration Analysis  (pkgan)  -> "Package Analysis"
    cards: Checks (18) | Custom modules (13) | Module relationships (11) | Apps and tabs | Connected apps (4) and buttons that use them
- Org Package Export  (orgpkg)  -> "Org Package Export"
    cards: Before you hand this to the Org Builder agent | Components (0) | Manual implementation steps (0) | Warnings and what still needs confirming
- Explore Facilio  (showcase)  -> "Explore Facilio"
    tabs: Entries · 0 | Requests

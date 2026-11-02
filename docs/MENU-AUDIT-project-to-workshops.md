# Menu audit: Project to Workshops & Requirements

Checked on 2 November 2026 against the team menu in `src/shell.js` and each page's own tabs. What changed is in the last section; the rest is advice for later.

## What each page does today
| Menu item | Page tabs | Purpose | Overlaps with |
|---|---|---|---|
| **Project** | | | |
| Dashboard | Overview, Delivery, Risk, People, Customers, Reports | Numbers across the project (phase dashboards are being built by another session) | Project Overview (counts, reports) |
| Project Overview | Overview, Delivery lifecycle, Roadmap, Plan vs actual, Reports | Where are we? | Dashboard |
| Team Guide | | Help for the team | What's new (both are "help") |
| Tasks | | Project task register | |
| What's new | | Release notes | Team Guide |
| **Project control** (own group) | | Governance & RAID, Change Requests, Deliverables & AI, Status Reports, Traceability & Quality | Traceability also appears in Use Cases and Transcripts |
| **1. Kick-off & Planning** | | | |
| Contract | contract, scope, planner (Requirement Session Planner) | The signed MSA, scope and the session plan | The session plan is about running workshops (group 2) |
| Kick-off Deck | | The kick-off presentation | |
| Project Plan | | Customer's plan from Excel | Project Overview > Plan vs actual |
| **2. Workshops & Requirements** (before) | | | |
| Facilio Screens | | Demo screens to show in sessions | (also a button on the Transcripts page) |
| Transcripts & Requirement Confirmation | Transcripts, Review queue, Requirements register, Open questions, History, Session → BRD | Capture what was said and confirm requirements | Use Cases (same material, one step later) |
| Use Cases | Use cases, Discrepancies, Traceability | Group confirmed requirements into scenarios | Transcripts, Traceability & Quality |
| Checks & Validations | Readiness, Validation, Module status, Scope coverage, Source checks, History and changes | One list of blocking/warning/info issues for the whole project and BRD readiness | MSA Scope Check (scope coverage) |
| MSA Scope Check | | What the customer asked for against the signed MSA | Checks & Validations > Scope coverage |

## What was changed (done in this branch)
Group 2 now has three pages in working order, with small headings in the menu:

1. **Run the sessions**: Facilio Screens
2. **Capture and confirm**: **Requirements & Use Cases** (tabs: Transcripts & requirements, Use cases)
3. **Check before design**: **Checks & Validations** (tabs: Validations & readiness, MSA scope check)

Each tab shows the existing page unchanged, so no data or feature was removed. Old links, bookmarks and buttons (`#/usecases`, `#/msafind`, "Open Use Cases") still work and land in the right tab. The menu number badges for Checks & Validations now add the MSA findings to the blocking checks. Code: `src/workshubs.js`, menu in `src/shell.js`, test `tests/ui/workshops-hubs-check.mjs`.

## Not changed yet (decide with me)
1. **Dashboard and Project Overview** both answer "where are we?". Another session owns the dashboards, so I left them. Suggestion: one "Project" page with the dashboards as its tabs, or keep Dashboard for numbers and Overview for the plan and lifecycle, and say so in the page titles.
2. **Team Guide and What's new**: move both under a small "Help" group at the bottom of the menu, so "Project" has only Dashboard, Overview and Tasks.
3. **Project control** could sit under **Project** as sub-headings instead of a second group.
4. **Requirement Session Planner** lives inside Contract but is about running workshops. Suggest moving it to "Run the sessions", next to Facilio Screens.
5. **Traceability appears three times**: Use Cases > Traceability, Transcripts > Session → BRD, and Traceability & Quality. Suggest keeping one (Traceability & Quality) and linking to it.
6. **Inside Checks & Validations**, Scope coverage and MSA scope check say related things; Source checks and Validation also overlap. Suggest merging Scope coverage into the MSA scope check tab, and Validation plus Source checks into one list.
7. **History** exists in Transcripts (decisions on statements) and in Checks (changes to configuration). They are different records, but the name is the same; rename to "Review history" and "Change history".
8. Customer menu is not touched.

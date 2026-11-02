# 6. Implementation plan

Where the product stands, how it is delivered, and what is next. Earlier phase notes are kept in [reports/implementation-roadmap-oct-2026.md](reports/implementation-roadmap-oct-2026.md) and [reports/implementation-status.md](reports/implementation-status.md).

## Delivery method
- One repository, GitHub `main` is the source of truth. Work is committed with tests and pushed to `main` and `feat/simpler-studio`.
- Every change: `node build.mjs`, `npm test`, a browser check for what changed, a "What's new" entry (`src/whatsnew.js`).
- Deploy through the facilio.work connector (`/deploy`); each deploy is one line in [operations/DEPLOYS.md](operations/DEPLOYS.md). Two Claude accounts share the repository; `/sync` at the start and `/handoff` at the end carry the state ([../CLAUDE.md](../CLAUDE.md), [../HANDOFF.md](../HANDOFF.md)).

## Status (2 November 2026, deploy 120 and later)
| Area | State |
|---|---|
| Project control, kick-off, contract and MSA scope, session planner | Done |
| Transcripts, statement review, requirements register, use cases, discrepancies | Done |
| Checks and Validations with MSA scope check; Requirements and Use Cases hub | Done (two hubs replace five pages) |
| Modules and form builder, state flows, process whiteboard (Describe with AI, Align), roles, notifications, data onboarding, agents, configuration hub | Done |
| BRD Draft: editor, import, delete, Word and PDF export, clearer sign-off notice | Done |
| UAT, go-live, FTR and KPI workbooks, hypercare, hand-over, closure | Done |
| Guides, user guide builder, video to guide | Done |
| Tickets, support mailbox, Teams tickets | Built; mailbox and Teams notices configured on 2 November, not yet tested against real mail |
| AI layer (DeepSeek, optional Claude, image reader) | Done; live "AI service could not be reached" cause not yet found |
| Claude connector (read the whole project, hand-off, save drafts) | Built and deployed; not yet tried by a team with their organisation account |
| Project Settings: Keeping the project, Claude connection | Done |
| Customer sign-in | Not enabled (needs platform approval and an invitation flow) |
| App review on facilio.work | Pending |

## Next steps, in order
1. **Review and approval.** Submit the app for review once the owner is ready; this repository's docs 01 to 06 are the review pack.
2. **Verify live.** Press Sync now in Tickets with the mailbox; run the connector from the organisation Claude account (ask the Claude organisation owner to allow custom connectors or add the connector once for everyone).
3. **Find the AI error.** Read the live logs for "AI service could not be reached" in Describe with AI; the prompt, retry and relevance ranking are already improved.
4. **Connector write tools.** Add a requirement or question, create a task, add whiteboard steps, each saved as a draft a person confirms.
5. **Pictures.** A tool that returns an image, or upload to the app plus a `get_attachment` tool, so Import from image works without copy and paste.
6. **Menu tidy-up still open.** Merge Dashboard and Project Overview; move the session planner next to Facilio Screens; one Traceability view instead of three; merge overlapping tabs inside Checks and Validations. Details in [reports/menu-audit.md](reports/menu-audit.md).
7. **Customer sign-in.** Finish the invitation flow on its branch, then ask the platform to allow outside sign-ins for this app.
8. **Test coverage.** Add the browser checks in `tests/ui/` that are not yet in a script to a documented run list.

## Risks
| Risk | Mitigation |
|---|---|
| Site grows past 50 MB | Check `du -sm dist` on every deploy; large libraries are in `vendor/` |
| Personal Claude accounts used with customer data | Use test projects; ask the Claude organisation owner to enable the connector for the company account |
| AI answers wrong or invented | Drafts are unapproved, cite sources, and are parsed to fixed shapes |
| One server function time limit (25 s) | Part-by-part jobs, per-call budgets, one retry with a shorter request |
| Two Claude accounts on one folder | `/sync` first, `/handoff` last; never two sessions on the same folder |

## Test plan
| Level | Command |
|---|---|
| Server and logic (mock platform) | `npm test` (work adapter, AI layer, portfolio, guide intelligence, org package, UAT, MSA, life cycle, Claude launch) |
| Browser checks | `node tests/ui/<name>.mjs http://localhost:<port>` after `node build.mjs` and `node tests/ui/devserver.mjs <port>` (BRD editing, whiteboard align, workshops hubs, Claude hand-off, settings, project guide, intro on small windows and more) |
| Load and scale | `npm run test:load`, `npm run test:scale`, `npm run test:qa` (100 people: notes, links, 3 MB documents, uploads, connector, large answers) |
| Final check | The findings and what passed: [reports/qa-2026-11-02.md](reports/qa-2026-11-02.md). Run browser checks in Edge with `node --import ./tests/ui/use-edge.mjs tests/ui/<check>.mjs <url>` |
| Exports | `npm run test:exports` |
| Security | `npm run test:security`, `npm run test:csp` |

## Definition of done
Built without errors, `npm test` passes, the change is checked in a browser on a project with data and an empty one, no console errors, plain words, Facilio colours only, a What's new line, pushed to `main`, deployed and logged.

# Documentation

Read these six in order to understand Delivery Studio, check it and approve it.

| # | Document | Answers |
|---|---|---|
| 1 | [Product requirements](01-product-requirements.md) | What it is for, who uses it, what it must do, what is out of scope |
| 2 | [Technical requirements](02-technical-requirements.md) | Architecture, hosting, AI layer, connector, security, limits, build and test |
| 3 | [App flow](03-app-flow.md) | The delivery journey and the key flows, with diagrams |
| 4 | [UI and UX design](04-ui-ux-design.md) | Principles, colours, depth, layout, components, accessibility |
| 5 | [Backend schema](05-backend-schema.md) | What is stored where, record kinds, routes, permissions, limits |
| 6 | [Implementation plan](06-implementation-plan.md) | Delivery method, status, next steps, risks, test plan |

## The live to-do list
[ROADMAP-REQUIREMENTS.md](ROADMAP-REQUIREMENTS.md) is the one document that says what is built, what is pending and what to build next, in order. It is edited every working day.

## The folders (where each kind of document goes)
| Folder | Put here | Example |
|---|---|---|
| [plans/](plans/README.md) | A plan written before building a feature | [SOLUTION-TAB-PLAN-2026-11-07.md](plans/SOLUTION-TAB-PLAN-2026-11-07.md) |
| [design/](design/README.md) | How the app looks and moves: style library, page progress, animation kit | [UI-COSS-LIBRARY.md](design/UI-COSS-LIBRARY.md) |
| [integrations/](integrations/README.md) | How the Studio works with Claude, Outlook, Teams and the Facilio products | [claude-connector.md](integrations/claude-connector.md) |
| [reports/](reports/README.md) | An audit, review or status report, with its date in the name | [qa-2026-11-02.md](reports/qa-2026-11-02.md) |
| [reference/](reference/README.md) | A longer note on how one part works | [privacy-and-retention.md](reference/privacy-and-retention.md) |
| [operations/](operations/README.md) | Running the app: deploying, the deploy log, background-job prompts | [DEPLOY.md](operations/DEPLOY.md) |

**Naming:** a plan, audit or report carries its date at the end of the name (`NAME-YYYY-MM-DD.md`). A document that stays true over time has a plain name.

**Where is the code?** See [../README.md](../README.md) for the folder map, [../src/README.md](../src/README.md) for the screens and [../work/README.md](../work/README.md) for the server.

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

## The rest
| Folder | Holds |
|---|---|
| [operations/](operations/) | How to deploy ([DEPLOY.md](operations/DEPLOY.md)) and the log of every deploy ([DEPLOYS.md](operations/DEPLOYS.md)) |
| [reference/](reference/) | Deeper notes on one area: the Claude connector, AI opportunities, privacy and retention, AI architecture, admin command centre, tickets and mailbox, Outlook, Teams, design and motion |
| [reports/](reports/) | Audits and status reports with dates (latest: [qa-2026-11-02.md](reports/qa-2026-11-02.md)): implementation status, audits, menu audit, master-prompt compliance, pending items |
| `motionkit/`, `screenshots/` | The Facilio Motion Kit data and screenshots used in notes |

The repository root has the code (`src/`, `work/`, `tests/`, `tools/`, `data/`, `public/`, `vendor/`, `skills/`), `README.md`, `CLAUDE.md` and `HANDOFF.md` (what the Claude sessions need to start work), `build.mjs` and `package.json`.

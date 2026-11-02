# Facilio Delivery Studio

The implementation team's workspace for running a customer project from contract to hand-over: workshops and requirements, use cases, solution design, the BRD with sign-off, UAT, guides, hypercare and closure, with AI drafts that a person always confirms.

Hosted on **facilio.work** (Facilio's reviewed internal-app platform): https://facilio-delivery-studio.facilio.work. Sign-in is the Facilio Microsoft account.

## Read this first
The six documents in [docs/](docs/README.md), in order:
1. [Product requirements](docs/01-product-requirements.md)
2. [Technical requirements](docs/02-technical-requirements.md)
3. [App flow](docs/03-app-flow.md)
4. [UI and UX design](docs/04-ui-ux-design.md)
5. [Backend schema](docs/05-backend-schema.md)
6. [Implementation plan](docs/06-implementation-plan.md)

## Repository map
| Path | What it is |
|---|---|
| `src/` | The front end: plain JavaScript views and CSS, bundled by `build.mjs`. `src/animation/` holds every opening and scroll animation (tree intro, road intro, sign-in story, Discover more effects) |
| `work/server/api.mjs` | The one server function (`_ai.mjs` AI providers, `_portfolio.mjs` admin health); `work/work.json` lists the connector tools; `work/src/workapi.js` is the page-to-server link |
| `data/` | Sanitised reference configuration written into the build |
| `public/` | Static files copied into the site (brand, demo screens, skills ZIPs) |
| `vendor/` | Third-party libraries (PDF, Word, PowerPoint, Excel, fonts) |
| `skills/` | Claude skills for guides and videos, served as ZIPs |
| `tests/` | `npm test` (server and logic) and `tests/ui/` (browser checks) |
| `tools/` | Scripts that build assets and reference data |
| `docs/` | The six documents, plus `operations/`, `reference/`, `reports/` |

## Build, test, deploy
```bash
npm install
node build.mjs                      # writes dist/ (empties it first)
node tests/ui/devserver.mjs 4173    # preview at http://localhost:4173/?nointro
npm test                            # server and logic tests against a mock of the platform
```
Deploying and the deploy log: [docs/operations/DEPLOY.md](docs/operations/DEPLOY.md), [docs/operations/DEPLOYS.md](docs/operations/DEPLOYS.md). The extracted site must stay under 50 MB.

## For people and Claude sessions working here
[CLAUDE.md](CLAUDE.md) (rules and how the project works) and [HANDOFF.md](HANDOFF.md) (state left by the last session).

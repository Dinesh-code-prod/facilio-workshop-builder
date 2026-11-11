# .github: what GitHub runs by itself

| File | What it does |
|---|---|
| [workflows/test.yml](workflows/test.yml) | On every push, GitHub installs the project, runs `npm test` and builds the site. A red cross next to a commit means one of those failed. |

Nothing here deploys the app. Deploying is done by a person through the facilio.work connector, see [docs/operations/DEPLOY.md](../docs/operations/DEPLOY.md).

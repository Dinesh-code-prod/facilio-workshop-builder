# Facilio Run and Delivery Studio: integration plan (27 Nov 2026)

The user asked (27 Nov 2026): "connect facilio.run as well integrate with ours delivery studio". In answer to the follow-up question they chose all four parts: Claude uses both connectors, Publish from the Studio, Useful sites inside the Studio, and a live directory in the Studio. They also asked what facilio.run could do for teammates. **Status (27 Nov 2026): built on feat/facilio-reference-ds after the user's go-ahead ("Yes, build it"); not deployed. The two planned Studio tools became two actions of the existing `project_jobs` tool, `run_directory` and `run_link` (help: connector_help topic `facilio_run`). The platform allows 40 tools, the connector already has 40, and the tool list must stay under 36,000 characters.**

## 1. What facilio.run is (checked 27 Nov 2026)

- Facilio's internal instant hosting. Anyone at Facilio can put a static site at `https://<name>.facilio.run`. Every site sits behind Azure AD sign-on, so every visitor is a Facilio employee. No review is needed (facilio.work apps need one).
- **Open by design:** any employee can open any site, and anyone can deploy over or delete any site. The deployer is recorded but is not an owner. Only a few platform sites are protected.
- Each site gets a backend on the same site: identity (`/api/me`), a key/value store, file uploads, live updates, a credential proxy, read-only SQL Lab and an LLM proxy.
- **Deploying is done only through the Facilio Run Claude connector** (there is no CLI). Its tools are `deploy_site`, `get_upload_url` + `deploy_zip`, `list_sites`, `get_site`, `read_site_file`, `rename_site`, `delete_site`, `whoami` and `sqllab_*`. Its address is `https://mcp.facilio.run/mcp` (shown on facilio.run itself, checked 27 Nov). **It is not added on this PC.**
- The directory at facilio.run lists 464 sites. Its list comes from `GET facilio.run/api/registry/sites`, which only works when you are signed in. It sends no CORS headers, so a page on facilio.work cannot read it. The Studio server cannot read it either, because it has no facilio.run sign-on.
- Sources: https://facilio.run/llms.txt, https://docs.facilio.run/, and `docs/integrations/CONNECTORS-2026-11-04.md` sections 6 and 10.

## 2. What it can do for the delivery team

| Use | How | Note |
|---|---|---|
| Find the right internal tool | A short, chosen list of delivery sites in the Studio, plus the full directory | See section 3B |
| Share a project page with Facilio people who cannot open the Studio | Claude publishes a read-only snapshot (for example the Report pack) as a facilio.run page | The Studio is still awaiting review, so only its owner and collaborators can open it. facilio.run needs no review. **Every Facilio employee can see it, and anyone can overwrite it**, so publish team-facing content only, and only after a confirm |
| Check a customer org's real data during UAT or migration | The `sqllab_*` tools of the Facilio Run connector (read-only, the viewer is logged) | Claude does this in the person's own session, and only on request |
| Quick one-off helpers (a checklist page, a demo script) | Claude builds them with `deploy_site` | Product prototypes stay in Meteor |

Some sites already do work the Studio also does. **project-planner** has plans and a Gantt. **kickoff-workspace** turns an MSA into a kick-off deck. **requirement-doc-builder**, **fife-brd-workshops**, **msa-review**, **planforge** and **implementation-dashboard** overlap too. **The user must decide whether to link them or leave them out.** This plan leaves them out of the list by default.

## 3. What gets built

**A. Claude uses both connectors**
- Claude setup page and Team Guide (`src/claudesetup.js`, `src/teamhelp.js`, `src/claudehand.js`): add a second connector card, "Facilio Run", with its address, what it is for and how to add it. Each person adds it once and signs in themselves.
- Skills text (`work/server/_skills.mjs`): explain when to use which connector. Studio data comes through the Delivery Studio connector. Publishing and SQL Lab go through Facilio Run. No customer-facing or sensitive content goes to facilio.run without the person's confirm.

**B. Useful sites inside the Studio** (Help > Facilio tools, `src/webframelogic.js`)
- Add one "Facilio Run" tab that shows a grouped list of links:
  - Implementation toolkit: impl-ai-hub, packaging-docs, pm-v3-guide, pm-v3-import-guide, org-kb-builder, dashcopy-doctor, integration-checklist.
  - Knowledge: knowflow, unique-use-case, fsm-builds, solution-studio, helpdesk-guide, facilio-services, code-shelf, trainimaterials.
  - Directory: run-index (a live, searchable index) and facilio.run.
- Each link opens in a new tab, as the current Facilio Run entry already does (`framed: false`). Facilio Run sign-on does not work inside a frame on facilio.work.
- No data is sent to these sites.

**C. Live directory in the Studio** (Claude refreshes it)
- The Studio cannot read facilio.run's list itself (see section 1), so Claude refreshes it. The person clicks **Refresh with Claude**. Claude calls the Facilio Run connector's `list_sites`, then the Studio connector's `project_jobs` action `run_directory`, which stores the names, addresses, descriptions and dates.
- The tab then shows that list with search and a "last refreshed" date.
- `run_directory` is team only, size-capped and tested. `project_jobs` has no Claude-side confirm, which is acceptable here because it only stores a list.

**D. Publish from the Studio**
- A **Publish to facilio.run** button on the Report pack (proposed first page). It opens Claude with a short prompt:
  1. Read the pack through the Delivery Studio connector.
  2. Make one static page in the Facilio document look.
  3. Show the person a warning that every Facilio employee can see it and anyone can overwrite it, and wait for their OK.
  4. Deploy it with `deploy_site` to `ds-<project>-report`.
  5. Call `project_jobs` with action `run_link`, which records the address and date on the project.
- The project then shows "Published to facilio.run: <link>, <date>".
- Customer users never see the button.
- Action `link` accepts only `https://*.facilio.run` addresses.

## 4. Checklist

- [x] The user approved the plan ("Yes, build it", 27 Nov 2026). Overlapping sites are left out and the Report pack is the first page to publish (the plan's defaults; the user did not change them).
- [ ] The user adds the Facilio Run connector (`https://mcp.facilio.run/mcp`) and signs in. Claude never signs in for them.
- [x] A: Claude setup (Start here, Optional: the Facilio Run connector), Team Guide (setup row and jobs row), and the connector's tool group and recipe in api.mjs. `_skills.mjs` is generated from the skills repository and was not edited.
- [x] B: Facilio Run tab with 16 chosen sites in 3 groups (`src/webframelogic.js`, `src/webframe.js`)
- [x] C: `project_jobs` action `run_directory`, `GET /api/run/directory`, the searchable list with Refresh with Claude (`tests/run_integration.mjs`)
- [x] D: `project_jobs` action `run_link`, `GET /api/projects/:id/runlinks`, Report pack > Publish to facilio.run with the published link line (`tests/run_integration.mjs`)
- [x] `npm test`, `tests/run_integration.mjs`, `tests/claude_launch.mjs`, `tests/connector_skills.mjs`, `tests/webframe.mjs`; the Facilio Run tab and the directory list checked in the local app
- [ ] A real Claude run with both connectors (refresh, then publish one test page). It needs the user's Facilio Run connector and was not done.
- [x] HANDOFF.md: what was checked and what was not

## 5. Not checked yet

- A real Claude run with both connectors, and whether `deploy_site` asks for a confirm in Claude.
- `tests/ui/claude-handoff-check.mjs` passed 9/9. `tests/ui/master-ds-check.mjs` was not run: the only local server belongs to another session.
- Whether facilio.work's server could read the directory with a work token. The plan does not rely on it.
- The connector tool list changed (new `project_jobs` actions), so each person must remove the Delivery Studio connector in Claude and add it again.
- Not deployed. The work is on `feat/facilio-reference-ds` with the design work.

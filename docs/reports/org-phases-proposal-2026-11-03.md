# One org, more than one project: a proposal (3 Nov 2026)

Status: **proposal only, nothing built.** Raised by the owner on 3 Nov: a customer org goes live, then comes back with new scope (AI agents, new integrations, more sites) that needs its own kick-off, workshops, requirements and state flows.

## What already exists
- Org id and (now) org package folder are stored per project (Project details).
- Change Requests handle scope added inside a running project.
- A new project can be created with the same customer and org id; nothing ties the two together.
- Agent projects (type "agents") already exist as a separate project type.

## Three ways to handle it

| Way | When | Cost |
|---|---|---|
| **1. Change request** | A small addition inside the signed scope's spirit (one more module, one report) | Exists today |
| **2. Linked phase project** (recommended) | New scope that needs its own kick-off, workshops, BRD and state flows (new sites, AI agents, new integrations) | Small: two fields and one list |
| **3. Phases inside one project** | Only if teams prove they need one shared BRD and one plan across phases | Large: requirements, flows, plan, UAT and sign-offs would all need a phase dimension |

## Recommended build for way 2
1. **Two fields in Project details:** `phaseOf` (the earlier project's id) and `phase` (a short label, for example "Phase 2" or "B2"). Same customer and org id are filled in automatically.
2. **"Start a new phase from this project"** button (in Keeping the project): creates the new project with the same customer, org id, org package folder, team and contacts. The person ticks what else to copy (requirements marked Confirmed as read-only reference, roles, modules in use). Nothing is copied silently.
3. **"This org" card in Project details:** lists every project with the same org id that the person can open (name, phase, type, status), with links. Needs one small server route that filters by project access.
4. **Home page:** projects of one org grouped under the org name when there is more than one.
5. **Connector:** `find_projects` and `project_overview` return `phase`, `phaseOf` and the org's other projects, so Claude can read the earlier phase before helping with the new one.
6. **Fallback the owner described:** a team can always create a plain new project and set the same org id and a phase label by hand. The "This org" card finds it by org id, so no project is ever orphaned.

## Open questions for the owner
- Should a phase project see the earlier project's documents (read-only), or only the copied items?
- Is a closed project allowed to be reopened as a phase, or always a new project?
- Who may start a phase: any team member of the earlier project, or only its owner?

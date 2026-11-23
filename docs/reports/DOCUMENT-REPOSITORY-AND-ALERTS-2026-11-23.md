# Project document repository and missed-step alerts (23 Nov 2026)

Two requests: (1) one central document repository per project, made automatically, that Claude and the team share; (2) alerts that make sure nobody misses a required step. This note covers what was checked, what was chosen, what was built and what is left.

## 1. Document repository

### What was checked
| Question | Finding | How it was checked |
|---|---|---|
| Can Claude's Microsoft 365 connector create folders and upload or update files? | **No, not today.** The connector has the tools (create folder, upload, update, move, rename, copy, delete), but Microsoft grants it **read-only** permissions for this account: `Files.Read`, `Files.Read.All`, `Sites.Read.All` (plus read-only mail, calendar, Teams and meetings). Writes would be refused. | `get_granted_scopes` on the connector, 23 Nov 2026 |
| Can it browse, search and read SharePoint and OneDrive documents? | Yes. A folder search returned folders and files from a SharePoint library; `read_resource` reads files and folder listings. | `sharepoint_folder_search`, 23 Nov 2026 |
| Does Outlook give document storage? | No. Mail folders hold mail, not a document library. Not used. | Connector tool list |
| Does a "Facilio Onboarding" folder exist? | No folder with that name was found. | `sharepoint_folder_search "Facilio Onboarding"` |
| Can Delivery Studio itself write to SharePoint? | Yes, already built (deploy 482) but **switched off**: it needs a Microsoft app with Graph `Sites.Selected` (full control on one site), the credential `graph_files` and the secret `sharepoint_site`. No paid service, no API billing. | `work/server/_sharepoint.mjs`, `docs/integrations/SHAREPOINT-2026-11-16.md` |
| Version history and permissions | SharePoint keeps every version of a file (library versioning). Delivery Studio shares each project folder with the project members (owners and editors edit, viewers read). | Same |
| Local D: drive | Claude Code already reads and writes local files. Claude Desktop needs its Filesystem extension (free) to reach `D:\`. A separate local tree would be a second repository that drifts from the shared one. | Tool list of this session |

### Recommendation (one source of truth)
1. **SharePoint is the shared repository.** One site, root folder `Facilio Onboarding`, one folder per project with the eight standard folders. Delivery Studio's server creates it **when the project is created**. It does not depend on Claude or a scheduled task.
2. **Delivery Studio keeps the structured records** (requirements, tasks, decisions, UAT) and pushes every document it holds into the right folder. Big files that do not fit Delivery Studio's limits go straight into the SharePoint folder.
3. **Claude reads with the Microsoft 365 connector and saves through Delivery Studio.** Claude finds what is where with `get_document` section `project_index`, reads files with `read_resource`, and saves new documents with `save_draft` or `project_jobs file_put_begin`. Delivery Studio then files them in the right folder. The connector's read-only permissions are enough, so it does not need write access. An IT admin *can* grant it `Files.ReadWrite.All` later, but that adds a second writer, so it is not recommended for now.
4. **A local working copy is a OneDrive sync of the same library**, not a separate `D:\Facilio Onboarding` tree. In SharePoint, "Sync" (or "Add shortcut to My files") puts the library on the PC, and the OneDrive client keeps both sides the same. To have it on D:, move the OneDrive folder there in OneDrive settings. Not set up or tested here.

### What was built
- `Facilio Onboarding / <project name> / 01_Project Governance, 02_Requirements & Design, 03_Project Tracking & Reporting, 04_Testing & UAT, 05_Data Onboarding, 06_Training & Enablement, 07_Handover, 08_Archive`, made when the project is created. Older projects get it on their first copy or on Update access in Project Settings.
- **No duplicates.** A folder of the same name made by hand is adopted. A second project with the same name gets `<name> (<id end>)`.
- **Files are sorted by type into the eight folders.** A document saved again is the next version of the same file; evidence with the same name is kept as separate files.
- **`PROJECT_INDEX.md` in each project folder.** It holds the project name and id, the Facilio Organization ID, folder links, every copied document with its link, task counts, missed steps, decisions and recent updates. It is rewritten after each copy, and SharePoint keeps the earlier versions.
- **Claude can read the repository.** The connector's `get_document` has a new section, `project_index`, that returns the folder, the folders, every document with its SharePoint link, and the index text.
- Tests: `tests/sharepoint.mjs`, run against a stand-in Microsoft Graph.

### To switch it on (IT admin and app owner, once, no cost)
Follow `docs/integrations/SHAREPOINT-2026-11-16.md`, "Set-up":
1. Pick a site.
2. Register an Entra app with `Sites.Selected`.
3. Give the app full control on that one site.
4. Add the credential `graph_files` and the secret `sharepoint_site`.

**Not done yet:** a real-tenant test, including that folder sharing works with full control. Also:
- Files people add to SharePoint by hand are not listed in the index and do not come back into Delivery Studio. Claude still reads them through the connector.
- Deleting a file in Delivery Studio leaves the SharePoint copy in place.

## 2. Missed-step alerts

### What already existed (kept)
- A per-person notification list (collection `nt`), shown in the bell, with unread state on the server.
- A live push over the app WebSocket plus a 60-second check while the page is visible.
- An optional browser pop-up, and Teams messages through Otto (at most 5 a day per person, quiet hours respected).
- A daily sweep that runs when any team member opens the Studio, for every member of that person's projects. The platform has no scheduler.
- Task due reminders and lifecycle nudges for project owners.
- Role checks: only team members are told, never customers.

### What was built
- **Missed steps.** Any task, action, risk or issue, change request or ticket with a due date that has passed and is not finished. These are exactly the records the project's workflow gave a due date, so nothing is invented.
  - Each one becomes one alert to the person responsible. The owner is matched by e-mail, full name or the part of the e-mail before @.
  - Work whose owner is not on the team (a customer or nobody) goes to the project owners.
  - The same unchanged item is never told twice.
  - A reminder comes back every 2 days while the item stays open. Teams is sent only the first time.
- **Lifecycle.** Unread, then Acknowledged (opened, still to do), then Completed (the item is done), with Overdue shown from the due date.
  - Opening or reading an alert does not complete the work.
  - Saving the item as done, giving it a new date or giving it to someone else marks the alert Completed at once.
  - An item that becomes overdue again brings its alert back.
- **Blinking bell.** While actionable alerts are unread and the bell has not been opened since they came, a soft Facilio-blue ring pulses from the bell and the bell icon swings briefly.
  - Nothing else on the page moves.
  - Opening the bell, reading the alerts or finishing the work stops it.
  - With reduced motion, the ring stays steady instead.
- **Pop-up.**
  - Each missed step pops on its own with its title, project, owner, due date and what to do, plus an Open button that goes straight to the item.
  - On the first load with many alerts, one summary pop-up appears instead.
- **Direct navigation.**
  - A task opens its own task page.
  - An action or risk opens Governance on the right tab, scrolls to the row and marks it for 4 seconds.
  - Opening from another project and from the Teams button is built but was not checked in the browser.
  - Fixed on the way: rows in the second table of a page (for example "Due from Facilio" on Governance › Actions) stayed invisible because their entrance animation never started.
- **Project owners** see their team's missed steps under "Your team" in the bell.
- **Claude.** The connector tool `list_overdue` now returns:
  - the project's missed steps, each with the person responsible, days late, what to do and a link that opens the item;
  - counts per owner;
  - the Facilio Org ID.

  With `notify: true` it creates the alerts in Delivery Studio. The connector is at the platform's 40-tool limit, so this extends an existing tool rather than adding one. Delivery Studio creates alerts on its own; Claude only reads them or triggers the same check.
- Tests: `tests/notify.mjs` (3 new checks).
- Checked in the browser: the blink, the pop-up, the deep links from the bell to a Governance action row and to a task page, and a done task turning Completed.

### Limits
- **No scheduler.** The check runs when a team member opens the Studio (once a day per person) or when Claude calls `list_overdue` with `notify`. People who do not open the Studio hear through Teams, once Teams notices are on.
- **Not covered as missed steps:**
  - missing documents;
  - onboarding data;
  - UAT cases without a due date.

  These stay with the owners' lifecycle nudges and the Delivery assistant. They have no owner and due date to alert on.
- **Not deployed, and not tested on the live app.**

# Microsoft 365 document storage and large files: audit and plan (25 Nov 2026)

Request: make SharePoint (or OneDrive) the store for big project files (recordings, training videos, archives, anything over the app's limits), with Delivery Studio as the place people find, upload and open them, and Claude able to work with the references. This note is Phase 1 (what exists, checked in code and on the live app) and Phase 2 (the storage decision), plus the build plan for Phases 3 to 9. **Built the same day (section 6), tested against a stand-in Microsoft only.**

## 1. What exists today

### 1a. Two Microsoft paths, and only one can write
| Path | Who it acts as | Microsoft permissions | Can write? | Code |
|---|---|---|---|---|
| **Delivery Studio → SharePoint** (server) | The app itself (Entra app, client credentials) | Graph `Sites.Selected`, full control on one site | Yes, once set up | `work/server/_sharepoint.mjs`, `src/sharepoint.js`, test `tests/sharepoint.mjs` |
| **Claude's Microsoft 365 connector** | The signed-in person | `Files.Read`, `Files.Read.All`, `Sites.Read.All` plus read-only mail, calendar, Teams and meetings (checked today with `get_granted_scopes`) | **No.** The connector has upload, folder, move, rename and delete tools, but Microsoft refuses writes with these permissions. Its upload tool is also capped at 1 MB with no chunked upload. | Outside this repo |

**Live state, checked today:** the server path has never run. The live app's database has no `cfg/sharepoint` record, which it writes on the first Microsoft call. The IT set-up in `docs/integrations/SHAREPOINT-2026-11-16.md` (Entra app, credential `graph_files`, secret `sharepoint_site`) is still not done. **Every Microsoft operation below has been tested only against a stand-in Graph, never a real tenant.**

### 1b. Microsoft operations, one by one (server path)
| Operation | Status | Notes |
|---|---|---|
| Folder creation | Built | `child()`: POST children with `conflictBehavior: fail`; on 409 it GETs the folder that is already there, so a retry never makes a duplicate |
| Nested folders | Built | `Facilio Onboarding / <project> / 01_… 08_…` |
| File listing | **No** | Nothing lists what is in SharePoint. The app lists only its own records. |
| File upload | Built, copy only | The file is first uploaded into the app's own storage, then the server copies it on |
| Large-file upload | Partly | Graph upload session, but the bytes go browser → app storage → server function → SharePoint |
| Resumable session | Partly | Sessions are created, but the upload URL is **kept in the database** (`fl.*.spJob.url`). An expired session (404/410) restarts from zero. It never asks Microsoft for `nextExpectedRanges`. |
| Chunked transfer | Built | 10 MiB pieces (32 × 320 KiB), one per function call |
| Upload recovery | Partly | Retried every 10 minutes while the project is open, from the start of the file |
| Metadata retrieval | Partly | Only `id` and `webUrl` from the last piece's answer; nothing is read back later |
| Sharing links | **No** | The folder is shared with members by `invite` (`requireSignIn`, no e-mail). No `createLink`. |
| Permission management | Built | Member add or remove updates the folder. Only permissions the app gave are ever removed. |
| Rename / move / update / delete | **No** | Deleting in the app leaves the SharePoint copy. Changes made in SharePoint are not seen. |
| Download / preview | **No** | Only "Open in SharePoint" (the `webUrl`) |

### 1c. Delivery Studio's own file limits (code, not guesses)
| Limit | Value | Where |
|---|---|---|
| One file in app storage | 100 MB (some types less: MSA 30 MB, evidence 20 MB, screenshot 8 MB) | `MAX_FILE`, `FILE_RULES` in `work/server/api.mjs` |
| Upload part | 16 MB, each part PUT straight to app storage through a presigned link. The bytes do not pass through the function. | `CHUNK`, `/files/:fid/chunks/:n/url` |
| Per project | 1 GB in total, at most 6 unfinished uploads per person | `FILE_SPACE`, `MAX_OPEN` |
| SharePoint copy piece | 10 MiB per function call. **This is the "10 MB" limit.** | `SEG` in `_sharepoint.mjs` |
| Server function (platform) | 25 s per call, 5.5 MB response, 4 MB for `ctx.files.put`, 3 MB binary body for `ctx.fetch`, about 18 s for `ctx.fetch` | facilio.work platform docs |
| Claude saving a file | 16 MB (`project_jobs file_put_begin`, presigned PUT) | `work/server/_jobsapi.mjs` |
| File types | Allow-listed per category. **No video, audio or 7z/rar.** | `FILE_RULES` |

**So today a 500 MB recording or a 3 GB archive cannot reach the project at all**, in either Delivery Studio or SharePoint.

### 1d. Folder structure (kept exactly as it is)
`Facilio Onboarding / <Project name> /` then `01_Project Governance`, `02_Requirements & Design`, `03_Project Tracking & Reporting`, `04_Testing & UAT`, `05_Data Onboarding`, `06_Training & Enablement`, `07_Handover`, `08_Archive`, plus `PROJECT_INDEX.md`.
- The folders are made when the project is created (`api.mjs`, line 353, with an 8 s cap so creation never waits on Microsoft) and again on Update access.
- A folder with the same name that no project owns yet is adopted, not duplicated.
- The project record keeps `driveId`, the folder id, the eight subfolder ids, the URL and the granted permission ids (collection `spp`).

### 1e. Claude connector (MCP)
- 40 tools, which is the platform limit. New document operations must therefore extend existing tools.
- `get_document` section `project_index` returns the folder, the eight folders and every copied file with its link, for the team only.
- `project_overview` returns `sharepointFolder`.
- `project_jobs file_put_begin/done` lets Claude save a file of up to 16 MB, which then follows the copy path.

### 1f. Page side
- No Documents page. SharePoint shows only in Project Settings > Team: the folder, the files waiting, Copy now and Update access. After a person's own save, the assistant says "Saved to SharePoint".
- The page's Content-Security-Policy already allows `connect-src https:`, so a browser upload to `*.sharepoint.com` is not blocked by our own policy. Whether the platform adds a stricter header is still to be checked.

## 2. Storage decision
**A SharePoint site document library, not a person's OneDrive.**
- It belongs to the organisation. When someone leaves, their OneDrive is deleted, and the project files would go with it.
- Its permissions can be set per project folder.
- It has version history and its own quota, and it is the same library the existing code already targets.

**No new connector and no new Microsoft login.** The plan reuses:
- the existing server credential `graph_files` and the secret `sharepoint_site`, for writing;
- Claude's existing Microsoft 365 connector, read-only, for reading.

Giving the connector write access would add a second writer with each person's own rights, so it stays read-only.

## 3. Plan for Phases 3 to 9
**Large upload, direct to SharePoint (the core change)**
1. The page sends the name, size, type and target folder.
2. The server checks:
   - the person edits this project and is not a customer;
   - the folder is one of 01 to 07 or a subfolder inside them;
   - a size cap that an admin sets, with no "unlimited" setting;
   - blocked types (executables).
3. The server creates the Graph upload session with `conflictBehavior: rename` and returns its upload URL **to that browser only**. The URL is never stored in the database and never logged.
4. The browser PUTs 10 MiB pieces in order, without an Authorization header, and shows progress. A network drop asks Microsoft for `nextExpectedRanges` and carries on from there. A reload of the same tab resumes from sessionStorage. A 404 means the session expired, so the upload starts again. Cancel sends DELETE to the session.
5. After the last piece the server reads the item back from Graph and checks its size and parent folder before saving the reference.

The bytes never go through a Delivery Studio function or into app storage. The size ceiling is whatever Microsoft and the tenant quota allow (Graph does not publish a number on that page).
**To prove in the first real test:** that SharePoint upload URLs accept a browser PUT (CORS). Microsoft's page does not say either way. If they do not, the fallback is the existing relay, which is capped by app storage (100 MB per file), so multi-GB files would need the OneDrive client or the SharePoint web upload.

**References, not copies (Phase 5).** A new collection holds one record per file:
- project id, provider "sharepoint", site id, drive id, parent folder id and name, item id, name, extension, MIME type, size, `webUrl`;
- upload status, uploaded by, created and modified times, eTag and last check.

The key is the Microsoft item id, so a rename or move inside SharePoint keeps the record. A Refresh pass (or opening the page) lists the eight folders and does three things:
- updates names and paths;
- marks deleted files as missing;
- adds files people put there by hand. This closes today's gap.

Graph `delta` works only on the drive root in SharePoint, so the pass lists folders instead (bounded per call).

**Documents & Files page (Phase 6).** One page inside each project, for the team only:
- the eight folders as a left list and files in a table: name, size, uploaded by, date;
- search and a type filter, and an Upload button with a progress tray (retry, resume, cancel);
- per file: Open in Microsoft 365, Download (a short-lived Graph download link handed out only after the access check), Copy link (the file's own `webUrl`, which works only for people who already have access) and Details;
- move or rename only within 01 to 07.

It follows the calm-pass rules: one status line, no extra buttons.

**Sharing (Phase 7).**
- Unchanged: the folder is shared with project members (owners and editors write, viewers read).
- Customers never get SharePoint access, and the page and routes refuse them.
- **No anonymous links, and no new links by default.** "Copy link" copies `webUrl`. An optional "organisation link" would use `createLink` scope `organization`, and only if your sharing policy wants it.
- Delete, move and permission changes are written to the project audit log.

**Claude (Phase 8)**, by extending existing tools:
- `get_document` gets a section `documents` with folders, files and metadata, search by name or type, missing required documents per stage, the latest BRD or FTR, likely duplicates (same name or size) and the full inventory.
- `project_jobs` gets an action that saves an approved deliverable of up to 16 MB into the right folder.

Claude never loads videos or archives into a chat; it gets metadata and links, and transcripts come through the existing transcript tools. The skills text, Team Guide and Claude setup pages are updated in the same piece of work.

**Tests (Phase 9).** The stand-in Graph in `tests/sharepoint.mjs` is extended to cover:
- session pieces, a 416 or 404 on resume, rename on a duplicate name;
- a folder retry with no duplicates;
- a moved, renamed or deleted file on Refresh;
- a customer or viewer refused, and a 403 from Microsoft.

The 20 to 50 MB, video, multi-GB and expired-link cases **can only be run on the real tenant after the set-up**.

## 4. What IT must do first (nothing works live without it)
1. Pick or create the SharePoint site.
2. Register an Entra app with Graph application permission `Sites.Selected`, with admin consent.
3. Grant that app **full control** on the site. Write is enough to upload, but full control is needed to share folders with members.
4. Add the OAuth2 credential `graph_files` and the plain secret `sharepoint_site` at secrets.facilio.work, granted to facilio-delivery-studio.
5. Confirm the tenant's sharing policy (internal only) and the site's storage quota for videos.

These steps are written out in `docs/integrations/SHAREPOINT-2026-11-16.md`.

## 5. Build order
1. Server: upload session, verify, reference records, list and Refresh, download link; stand-in Graph tests.
2. Page: Documents & Files with the upload tray.
3. Claude: the connector section and action, skills text, guides; the Claude hand-off tests.
4. Deploy. After the IT set-up, the real-tenant test (including the browser CORS check) and real numbers for 20 MB, 500 MB and 2 GB.

## 6. What was built (25 Nov 2026, not deployed)
| Phase | Built | Where |
|---|---|---|
| 3 Folders | Unchanged (already built): the eight folders when a project is created, adopted not duplicated, ids kept in `spp`. The Documents page makes the folder for an older project the first time an editor opens it. | `_sharepoint.mjs` `projectFolder` |
| 4 Large files | Server checks (team member who edits, not a customer, folder 01 to 07, no programs, 10 GB cap), opens a Microsoft upload session (`conflictBehavior: rename`) and returns its link to that browser only. The browser sends 10 MiB pieces in order with no Authorization header, asks Microsoft for `nextExpectedRanges` after a drop, 416 or 5xx (up to 6 tries with growing waits), and resumes after a reload when the person picks the same file again (link kept in sessionStorage of that tab). Cancel deletes the session. The server reads the finished file back and keeps it only when size and folder match. Two uploads run at a time. | `POST /api/projects/:id/spfiles/uploads`, `.../uploads/:uid/finish`, `DELETE .../uploads/:uid`; `sendToSession` in `src/documents.js` |
| 5 References | Collection `spd.<project>`, key = Microsoft item id: name, ext, kind, MIME type, size, link, folder, path, parent id, added by, created, modified, modified by, eTag, status, missing, source. No bytes in the Studio. Refresh lists the eight folders three levels deep (about 15 s per call; a partial pass marks nothing missing): renamed and moved files keep their record, files added by hand appear, a deleted file shows "Deleted in SharePoint", one moved elsewhere "Moved out of the project folder". PROJECT_INDEX.md lists these files too. | `refresh`, `docRecord` |
| 6 Page | Notes & Links > **Documents & Files**: folder list with counts, search, type filter, Refresh, Upload with a progress tray (Retry, Resume, Cancel), Open, and a details drawer with Download (a short-lived Microsoft link), Copy link, Rename, Move and Delete (to the SharePoint recycle bin). Viewers read only; customers do not see it. One column under 1100 px. | `src/documents.js`, "Documents & Files" block at the end of `src/ui.css` |
| 7 Sharing | Unchanged member sharing of the folder. No new sharing links: Copy link copies the file's own address, which opens only for people with access. Rename, move, delete and uploads go in the project audit (`doc-uploaded`, `doc-renamed`, `doc-moved`, `doc-deleted`). | |
| 8 Claude | `get_document` section `documents`: files with links, plus the inventory (required documents not found, latest BRD and FTR, likely duplicates, recordings, files gone); part `refresh`, `kind:Video`, `folder:…` or words. `project_jobs file_put_begin` with `folder` saves an approved deliverable (up to 16 MB, any type but programs) straight into a folder; `file_put_done` with `itemId`. The page has "Ask Claude for an inventory". No new tool (40-tool limit). | `api.mjs` `get_document`, `_jobsapi.mjs`, `work/work.json`, `_tooldocs.mjs`, Team Guide, Claude setup |

**Tested:** `tests/sharepoint.mjs`, 18 checks, 8 of them new, against the stand-in Microsoft:
- a 25 MB upload in three pieces;
- a dropped connection resumed without sending anything twice;
- an expired session, a cancel, and a size mismatch refused;
- programs, 08_Archive, the size cap, viewers and strangers refused;
- the same name twice kept as two files;
- Refresh after changes made by hand in SharePoint;
- rename, move with a name clash, download and delete, and the audit;
- the Claude section and saving through `project_jobs`;
- nothing happening without the set-up.

`npm test`, `claude_launch`, `connector_skills` and `claude-handoff-check` (9/9) all pass. In the browser (local dev server, with the server's answers and Microsoft's upload address stood in):
- the page, its folders, search, details drawer and narrow layout;
- a full upload: four pieces in order, no Authorization header, finish called, tray shows Done;
- the viewer view and Ask Claude.

**Not tested, needs the real tenant:**
- whether SharePoint upload links accept a browser PUT (CORS);
- 20–50 MB, 500 MB and multi-GB uploads;
- session expiry times;
- download links;
- folder sharing with full control;
- a real Refresh on a big folder (paging with `@odata.nextLink` is coded but not tested).

The live app sends no platform CSP header (checked on 23 Nov), so only Microsoft's own CORS answer can block the browser upload.

## 7. Read-only Microsoft keys and the backup (25 Nov 2026)
facilio.work enforces read-only on every Microsoft credential ("Microsoft credentials are always read-only", secrets.facilio.work). So with `graph_files` the Studio can list and download from SharePoint but cannot create folders, upload, rename, delete or share: the write parts of sections 3 and 6 need the platform team to allow one write-enabled Microsoft credential, limited by IT to one site (`Sites.Selected`). Not asked for now (user, 25 Nov 2026).

Instead, so nobody is stuck if the Studio is down: **a project backup ZIP** (`work/server/_backup.mjs`, Project Settings > People & access > Backup to your computer, `project_jobs` action `backup`) that each person's Claude saves daily in `D:Delivery Studio backups` (Windows) or `~/Delivery Studio backups` (Mac), keeping 7 days. It holds README.html, the records as CSV for Excel, the document sections as HTML, the project files up to 40 MB and the full data as JSON. It sits on that person's computer only; a OneDrive app folder (on D:) can make it a cloud copy later without any Microsoft write permission. The SharePoint version of the backup is on branch `wip/sharepoint-backup`.

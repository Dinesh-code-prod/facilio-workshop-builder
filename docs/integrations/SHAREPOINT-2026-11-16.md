# SharePoint project folders: set-up and how it works (16 Nov 2026)

Every project file in Delivery Studio (uploads, exports a team member downloads, and files Claude saves) is copied to one SharePoint library, one folder per project, sorted into subfolders. The project's members get access to their project's folder. Code: `work/server/_sharepoint.mjs` (server), `src/sharepoint.js` (page), test `tests/sharepoint.mjs` (stand-in Microsoft Graph).

**Status: built and tested against a stand-in Microsoft Graph only. Nothing is copied until the set-up below is done, and it has not run against a real tenant.**

## Set-up (once, IT admin and the app owner)
1. Create a SharePoint site, for example `https://<tenant>.sharepoint.com/sites/DeliveryStudio`. Its default document library holds the project folders.
2. Register an app in Entra ID (single tenant). Microsoft Graph **application** permission **Sites.Selected** only. Grant admin consent.
3. Give that app **full control on that one site** (Sites.Selected grants nothing by itself):
   `POST https://graph.microsoft.com/v1.0/sites/{site-id}/permissions` with `{"roles":["fullcontrol"],"grantedToIdentities":[{"application":{"id":"<app client id>","displayName":"Delivery Studio"}}]}` (run by an admin with Sites.FullControl.All, for example in Graph Explorer).
   Full control is needed because the app shares each project folder with that project's members; "write" can upload but not share. **To confirm in the first real test.**
4. At secrets.facilio.work, as the app owner: an OAuth2 client-credentials credential named **`graph_files`** (that app's client id and secret, token URL `https://login.microsoftonline.com/<tenant>/oauth2/v2.0/token`, scope `https://graph.microsoft.com/.default`, allowed host `graph.microsoft.com`), granted to facilio-delivery-studio.
5. A plain secret **`sharepoint_site`** with the site address from step 1, granted to the app.
6. Open any project, Project Settings > Team > SharePoint folder: it should say how many files are waiting. Press Copy now, then Open folder.

## How it works
- **Folder:** `<Customer> – <Project name> (<last 6 of the project id>)`, created with the first file. Subfolders: 01 Contracts and kick-off, 02 Workshops and transcripts, 03 BRD, 04 Solution document, 05 Guides and training, 06 Configuration, 07 UAT and FTR, 08 Plans and onboarding, 09 Handover, 10 Tickets and tasks, 11 Dashboards and reports, Exports, Other. An export goes by the page it came from.
- **Access:** owners and editors of the project can edit, viewers can read. Sharing sends no email. Adding or removing a member updates the folder; Project Settings has Update access to try again. Only permissions the app gave are ever removed. Customers are not given access (they are not Facilio accounts; outside sharing is a tenant decision).
- **One file per document:** an export (BRD, solution document, any page export) saved again under the same name is the next version of the last one, in the app and in SharePoint (SharePoint keeps the version history). The same content is not saved again. An approved document's file name has no "DRAFT", so it is a separate file that later drafts never overwrite. The app keeps the last 3 earlier versions; SharePoint keeps all of them.
- **Evidence and attachments** with the same name are separate files (SharePoint adds a number), never overwritten.
- **Copying:** the page copies one 10 MB piece per request (the platform gives a function 25 seconds), so size does not matter. The app's own copy stays the master: if SharePoint is down, nothing is lost and the copy is tried again (every 10 minutes while a project is open, or Copy now).
- **Links:** after a person's own save the assistant shows "Saved to SharePoint" with Open in SharePoint. The connector's `project_overview` returns `sharepointFolder`. The upload link Microsoft gives stays on the server.
- **Not done:** files deleted in Delivery Studio stay in SharePoint; files added to SharePoint by hand do not come back into Delivery Studio; data that lives only in the app (requirements, minutes, tasks) is copied only when someone exports it.

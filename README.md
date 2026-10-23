# Facilio Requirement Workshop Builder

A multi-project workspace for Facilio implementation consultants. For each customer it covers:
- Running requirement workshops against a Facilio-style configuration: the Form Builder, State Flow Builder and Roles & Permissions.
- Planning sessions.
- Publishing a customer user guide.
- Capturing and confirming requirements from transcripts.
- Validating the result.
- Producing the BRD in Word and PDF.

The app is a static front end plus one Netlify Function API. Data lives in Netlify Database (Postgres) and Netlify Blobs (private files). Every request is authorised on the server.

---

## 1. Sections

| Sidebar | What it does |
|---|---|
| **Project Overview** | Status cards, a link to every section with its state, upcoming sessions, people, recent activity. |
| **Kick-off Deck** | Upload the original .pptx or PDF. It is rendered in the browser and **not restyled**: .pptx uses `@aiden0z/pptx-renderer`, PDF uses pdf.js. Thumbnails, previous/next (also ← →), zoom, full screen, replace (older versions kept), download original. |
| **Project Plan** | Imports the customer's .xlsx/.xlsm plan and renders every sheet as in Excel: widths, heights, merges, fonts, theme colours and tints, borders, alignment and wrapping, number and date formats, hidden rows and columns, frozen panes, images. Gantt bars drawn with formula-based conditional formatting are evaluated. Sheet tabs, zoom, full screen, download original, versions, notes per sheet. Read-only by default; optional cell edits are stored separately and can be downloaded as a copy. Independent of the Session Planner. |
| **Requirement Session Planner** | MSA upload (.pdf/.docx/.txt) with scope extraction matched to Facilio modules; uncertain items are flagged. Scope comparison (MSA ↔ module scope ↔ sessions). Sessions with number, title, date, start/end, duration (2 h default, configurable), modules, topics, participants, preparation, status, notes. Drag-and-drop module distribution with a guard for unassigned in-scope modules. Attendees matrix. Excel export filled into the standard workshop-plan template, with an in-app preview. "Publish schedule" shares it with customers. |
| **Customer User Guide** | Workbook-style tabs, one per in-scope module, each with 12 content points generated from the configuration and editable per point. Read-only stateflow diagrams (existing vs proposed). Feedback form per module saved to the project. Central Questions & feedback view with statuses (open / answered / resolved / follow-up), responses and session links. Publish to customer. |
| **Dashboard Gallery** | PDF references in categories you can add, rename and delete. Thumbnails, viewer with page navigation, replace, remove, download. |
| **System Modules & Form Builder** | System/Custom module list with priority and scope. Per module: Templates (form list → three-pane builder: palette of existing and new field types, sections, 12-column widths, drag-and-drop ordering, field properties, form rules, Preview that resembles a Facilio form, existing / unsaved / saved states), Fields (New Custom Field drawer with field-type picker), Buttons and cross-module actions, Related, Automation, Requirements and business intent, Review. |
| **State Flow Builder** | Stateflow list (Stateflows / States / All modules). The canvas follows facilio-setup's StateFlowBuilder: 135×30 state boxes, default state #60a9a6, **straight** connectors with a start dot and arrowhead, pills coloured by type (user #6071db, condition #45bec4, time #4eb871), 8 anchors, drag to connect. Toolbar: Add Transition, Auto-Align, Undo, Redo, Fit, Zoom, PNG export. Sidebar: available states (drag or click), + Add State. State editor: Open / Closed / Skipped, locked, pause timer, pause SLA. Transition editor: name, from/to, button priority, other-app visibility, permalinks, and the Before / During / After tabs (performers, conditions, schedule; field updates, create record, comment, approval with reject path, confirmations, validations; email / SMS / push / field update / script / status / trigger actions). Below the canvas: transition table, Process Guide, changes vs source (side-by-side diagrams), cross-module actions. |
| **Roles & Access Permissions** | Roles list in the Facilio style, plus a permission editor with per-module switches and Read/Update/Delete groups with All / Team / Own scopes. Permissions are decoded with the verified `NewPermissionUtil` bits; proposals are highlighted and stored separately. Also: actors by category, transition responsibility (quick assignment), portal workflows (process maps with swimlanes and handoffs), access matrix, and permission checks for missing and conflicting access. |
| **Transcripts & Requirement Confirmation** | Upload .vtt/.srt/.txt/.docx/.json transcripts per session and modules. Rule-based analysis runs in the browser (no AI service). It sorts statements into new / change / covered / contradiction / missing / unconfirmed / cross-module / question / customization, and into request / explanation / tentative / confirmed. Review queue: accept → requirement, edit, merge, clarify → open question, reject with reason. Review history. Requirements register. **Only `Confirmed` requirements go into the BRD.** |
| **Checks & Validations** | One validation list (blocking / warning / info) drawn from configuration, permissions, scope, sessions, reviews, transcripts, requirements and customer questions. Module status (Not started → Completed) with confirmation records (date, reviewer, status, decision, notes, outstanding). A module confirmed "Reviewed — no changes" is not flagged. Scope coverage, change summary, activity log, BRD readiness. |
| **BRD Draft** | Word-like page view built from one block model. Headings, paragraphs, lists and table cells can be edited in place; edits are saved and persisted and never overwrite generated text. Edits whose source has since changed are flagged. Blocks can be hidden, and paragraphs inserted after them. Two logo slots (Facilio, Customer) keep their aspect ratio. A sample BRD (.docx) sets the format (fonts, heading colours/sizes, table header fill, page setup, header/footer, Heading 1 order). Status: Draft / In review / Approved. **DOCX and PDF are exported from the same blocks**; each export is also saved privately to the project. |
| **Project Settings & Exports** | Project details, people, members (owner / editor / viewer), customer access code and link, configuration source, JSON exports A–E (schema version 2.0), server audit trail. |

### Guest access (for teammates without an account)
On the sign-in page, **Guest access** asks only for a name and the team code (the same value as `SIGNUP_INVITE_CODE`). The teammate gets a private workspace and a one-time **guest key** to come back later; the key is stored hashed and cannot be recovered. From the menu under their initials, they can turn the guest workspace into a full account (email + password) at any time, keeping their projects. Guests sign up through the same throttled, code-protected endpoint as normal accounts.

### Customer stakeholders
A customer signs in with the project ID and access code. They see only:
- Welcome
- Kick-off Deck
- Workshop Schedule (published)
- User Guide (published)
- Dashboard Gallery

They can send questions. They cannot read configuration analysis, transcripts, internal notes, reviews or the BRD; the server enforces this for both data and files.

### Configuration source
Each project starts on the **bundled reference configuration**: a sanitised Facilio org package preprocessed at build time with `scripts/build-reference.mjs`, with personal data removed. The Org ZIP is not part of the normal workflow. In *Project Settings → Configuration source*, an editor can optionally load a customer's own package for that project. It is parsed in the browser and only the derived, sanitised configuration is stored privately. The configuration is always read-only; every change is stored as a workshop proposal on top of it.

---

## 2. Architecture and security

```
dist/ (static)  ──►  /api/*  Netlify Function (netlify/functions/api.mjs → server/api.mjs)
                          ├── Netlify Database (Postgres): users, sessions, projects, members, versioned JSON documents, file metadata, feedback, audit
                          └── Netlify Blobs store "fwb-project-files": private file chunks (never public URLs)
```

- **Accounts**
  - Consultants sign up with an **invitation code** (`SIGNUP_INVITE_CODE`). Sign-up can optionally be limited to company domains (`ALLOWED_EMAIL_DOMAINS`).
  - Passwords are hashed with scrypt.
  - Sessions are random tokens stored hashed on the server, in an HttpOnly, Secure, SameSite=Strict cookie. Consultants get 7 days with a 12-hour idle limit; customers get 24 hours.
  - Login is throttled: 8 failures per 15 minutes.
- **Authorisation**
  - Every API call checks project membership and role (owner / editor / viewer / customer).
  - Customers are limited to a fixed allow-list of document sections and file categories.
  - Projects are isolated from each other.
- **CSRF**: state-changing requests need the `x-fwb-csrf` header and a same-origin `Origin`.
- **Files**
  - Uploaded in 3 MB chunks (within the 6 MB function payload limit).
  - Type and size are checked per category.
  - Files are versioned (`replaces`) and soft-deleted.
  - They are only downloadable through authorised API calls.
- **Concurrency**: each section (`workshop`, `planner`, `transcripts`, `brddoc`, …) is a versioned document. A stale write gets HTTP 409 and the user is asked to reload that section.
- **No secrets in the front end.**
  - Content-Security-Policy: `script-src 'self'` (no inline scripts), `frame-ancestors 'none'`, `noindex`.
  - All libraries are vendored under `vendor/`; there are no third-party CDNs.
  - No customer data is sent to external AI or conversion services.
- **Rate limit**: 600 requests per minute per IP on `/api/*`.

---

## 3. Deploying to Netlify

**Requirements**:
- A Netlify team on a plan that supports **Netlify Database** (credit-based plans).
- Netlify Blobs, which is available on all plans.

1. Put this folder in a Git repository and create a Netlify site from it. Drag-and-drop deploys do not build functions with dependencies, so use Git.
   - Build command: `node build.mjs`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`

   These are already set in `netlify.toml`.
2. Enable **Netlify Database** for the site. The migration in `netlify/database/migrations/` is applied on deploy.
3. Set environment variables (Site configuration → Environment variables), scoped to *Functions*:

   | Variable | Required | Purpose |
   |---|---|---|
   | `OFFICE_OPEN_MODE` | No (temporary) | Set to `1` for the internal office demo: no sign-in, one shared account, every project visible, sign-in/account/project-access screens and the Roles & Access Permissions view hidden. **Anyone who can reach the URL can read and change every project.** Remove the variable (or set it to anything else) to restore normal sign-in; nothing is deleted. |
   | `SIGNUP_INVITE_CODE` | Yes, to allow sign-ups | Long random code given to consultants. Without it, sign-up is disabled. |
   | `ALLOWED_EMAIL_DOMAINS` | Recommended | Comma-separated list, e.g. `facilio.com`. |
   | `FWB_DEV` | **Never in production** | Local development only. It enables the `dev-invite` code. |

4. Deploy, open the site, and create the first consultant account with the invitation code.
5. Optional: keep Netlify site protection (password/SSO) enabled as an extra layer.

**Post-deployment verification checklist** (do this before using real customer data):

- [ ] `GET /api/health` returns `{"ok":true,"signupEnabled":true}`.
- [ ] Sign-up with a wrong invitation code is rejected; sign-up with a domain outside `ALLOWED_EMAIL_DOMAINS` is rejected.
- [ ] Response headers on `/` include the CSP, `X-Frame-Options: DENY` and `X-Robots-Tag: noindex`.
- [ ] Session cookie `fwb_sid` is `HttpOnly; Secure; SameSite=Strict`.
- [ ] A second consultant who is not a member gets 404 for the first consultant's project and does not see it in their list.
- [ ] Upload a file, sign out, and confirm `/api/projects/<id>/files/<fid>/chunks/0` returns 401.
- [ ] Customer access: the customer sees only the five customer sections. `/api/projects/<id>/docs/workshop` returns 403 for the customer.
- [ ] Two consultants editing the same section: the second save shows the conflict prompt instead of overwriting.
- [ ] Export BRD .docx and .pdf; open the .docx in Word and update the table of contents.

The site is not considered securely deployed until this checklist has been completed on the live site.

---

## 4. Local development and tests

```bash
npm install
node build.mjs
node scripts/devserver.mjs 8899        # local Postgres (Netlify DB dev engine) + local file store + dist/
node tests/api_smoke.mjs               # API: auth, isolation, CSRF, versions/conflicts, chunked files, customer scope, throttling
node tests/e2e_full.mjs                # browser end-to-end (Playwright) with fixtures in tests/fixtures/
node scripts/build-reference.mjs <extracted-org-package-dir>   # rebuild the bundled reference configuration
```

**QA results on 16 Oct 2026** (local stack, Chromium):
- API smoke test: 40/40 passed.
- Browser end-to-end: 64/64 passed. It covered:
  - sign-up and project creation;
  - kick-off deck (PPTX render, slide navigation, PDF replacement with versions);
  - Project Plan (sheet render, dates, merged cells, Gantt from conditional formatting, uncached formula evaluation, hidden column, second sheet, separate cell edits);
  - Planner (MSA extraction with uncertain items, sessions, drag distribution, Excel export, publish);
  - Form Builder (new field, unsaved → saved, preview, custom field);
  - State Flow Builder (straight lines, Facilio pill colours, role assignment, After action, add state, undo, PNG export, process guide);
  - Roles (permission change, checks, portal swimlane);
  - Transcripts (analysis, classification, accept/confirm, reject, clarify, history);
  - User guide (12 points, feedback, publish, response);
  - Dashboard gallery (thumbnail, page navigation);
  - Checks;
  - BRD (logos with aspect ratio, sample BRD analysis, edit persisted after reload, DOCX and PDF export);
  - JSON exports A–E;
  - audit trail;
  - customer access (restricted navigation, schedule, guide question, deck; internal data and transcript files blocked);
  - cross-project isolation;
  - no console errors.
- The exported DOCX passes OOXML schema validation and converts to PDF in LibreOffice.

**Still to be tested with real inputs**, which have not been provided yet:
- the customer's actual project plan workbook;
- the real kick-off deck;
- the MSA;
- the sample BRD;
- real transcripts.

Test files that look like them are in `tests/fixtures/`.

---

## 5. Known limitations

- **PPTX rendering**: rendering happens in the browser. Some charts (category labels), SmartArt, embedded video, unusual fonts and some complex tables can differ from PowerPoint. The original is always downloadable, and uploading a PDF export gives exact fidelity. Legacy `.ppt` is stored but not rendered.
- **Project Plan**:
  - `.xls` (Excel 97–2003) files are stored and downloadable but not rendered; save them as .xlsx.
  - Charts, shapes, text boxes and SmartArt drawn on sheets are not rendered.
  - Data bars, colour scales and icon sets are not rendered.
  - Formula conditional formats are evaluated with a built-in subset of Excel functions.
  - Rotated text is shown vertically.
  - Very large sheets are shown up to 3,000 rows × 250 columns.
  - The viewer lists exactly what was not rendered for each sheet.
- **PDF export**: uses the Roboto font, because Calibri cannot be embedded. Layout and content match the DOCX, but page breaks can differ.
- **DOCX table of contents**: Word fills in the page numbers after Update Field.
- **Transcript analysis**: it is rule-based, not AI, so every item is reviewed by a consultant before it becomes a requirement.
- **MSA extraction**: it works on text. Scanned PDFs need OCR first.
- **Permission decoding**: only bits verified in the Facilio source are labelled; anything else is flagged "to be confirmed". Permission2 actions (e.g. Execute Work Order) are not part of the stored value.
- **Cross-module actions**: those requested in the brief that are not in the reference configuration show "Not found in configuration": Child Work Order, BDM Request, Override Payment Process, and Inventory Request → Quote. They can be captured as proposals. These were found in the configuration: WO → Quote, WO → Inventory Request, WO → Work Permit, Finding → Corrective WO, PR → PO.
- **Undo/redo** in the State Flow Builder lasts for the browser session only. Saved changes persist.

## 6. Third-party libraries (vendored)

- docx 9.7.1 (MIT)
- JSZip 3.10.1 (MIT)
- ExcelJS 4.4.0 (MIT)
- pdf.js 4.10.38 (Apache-2.0)
- pdfmake 0.2.15 (MIT, with the Roboto font under Apache-2.0)
- mammoth 1.9.0 (BSD-2-Clause)
- @aiden0z/pptx-renderer 1.3.0 (Apache-2.0)

## Hosting on Netlify with your own private Postgres (Neon, Supabase, …)
The site and functions stay on Netlify; the data lives in a Postgres you own.
1. Create the database (Neon free tier works). Copy the **pooled** connection string (`…?sslmode=require`).
2. Create the tables once: `FWB_DB_URL='<connection string>' node scripts/migrate.mjs` (safe to re-run; run it again after pulling new migrations).
3. In Netlify → Site configuration → Environment variables (scope: all, including Functions/Runtime) add `FWB_DB_URL` = the connection string, and `FWB_FILE_STORE` = `db` (uploaded MSAs, Excel files etc. then live in the same database instead of Netlify Blobs).
4. Trigger a deploy. With `FWB_DB_URL` set, the app no longer uses Netlify Database.
Existing data in Netlify Database/Blobs is not copied automatically; export it first if you need it.

## Org package and state flow import
- **Load a customer's org package**: when creating a project (optional field), or later in Project Settings → Configuration source. The ZIP is read in the browser; contact details are removed and secret-looking values are hidden before the derived configuration is saved.
- **Import a state flow from XML**: State Flow Builder → pick the module → *Import from XML*. Upload `STATE_FLOW.xml`, `STATE_TRANSITION.xml` and `TICKET_STATUS.xml` (or a package ZIP). The flow appears as a proposed stateflow; edits flow into the BRD.

## Super admin
Set `ADMIN_SETUP_CODE` (a secret you choose) and optionally `SUPER_ADMIN_EMAILS` (default `dinesh.r@facilio.com`) in the site environment. Open **Admin** (or **Administrator sign-in** on the login page), enter the setup code once and pick a password. The same code resets a forgotten admin password.

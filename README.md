# Facilio Delivery Studio

Multi-project workshop workspace for Facilio implementation consultants: Form Builder, State Flow Builder, roles, sessions, user guide, transcripts, validation and BRD, from contract to go-live.

Hosted on **facilio.work** (Facilio's reviewed internal-app platform): https://facilio-delivery-studio.facilio.work

## How it works
- **Front end:** plain JavaScript in `src/`, bundled by `build.mjs` (esbuild) into `dist/`. No inline scripts.
- **Backend:** one server function, `work/server/api.mjs`, served at `/api/fn/api/...`. It handles every route (projects, documents, items, files, admin). Identity comes from the platform (Microsoft sign-in, `ctx.viewer`), data is stored in the app database (`ctx.db`), file bytes in the private file store (`ctx.files`).
- **Page connector:** `work/src/workapi.js` sends the app's `/api/*` calls to that function and moves file parts through one-time upload/download links.
- **Reference configuration:** `data/reference-data.mjs` (sanitised baseline) is written to `reference.dat` and `reference-meta.json` at build time.

## Roles (enforced on the server)
- **Platform owner:** `dinesh.r@facilio.com` (set in `SUPER_ADMINS` in `work/server/api.mjs`). Sees and manages every project and all admin screens.
- **Admin / Sub admin:** granted by the platform owner under Admin, Access. Admin manages projects and users; Sub admin is read-only.
- **Project members:** owner, editor or viewer on each project. Only Facilio (`@facilio.com`) addresses can be added.
- Customer and guest sign-in are not available in this version.

## Build, test, deploy
```
npm install
npm test          # server function against a mock of the platform (identity, db limits, files, admin rules)
npm run build     # writes dist/ (static files + server/ + work.json)
```
Deploy `dist/` to the app with the facilio.work tools: `get_upload_url`, upload the zip, then `deploy_app_zip` (mode replace). After the app is approved, every deploy goes live at once.

## Storage layout (ctx.db collections)
`projects` · `usr` (people) · `grant` (admin grants) · `doc.<pid>` and `dp.<pid>` (documents and their parts) · `it.<pid>.<kind>` and `ip.<pid>.<kind>` (records) · `fl.<pid>` (files) · `au.<pid>` and `au.sys` (activity) · `gr.<pid>` (guide answers) · `fb.<pid>` (customer questions). Records over about 100 KB are gzipped and split into parts to stay under the 128 KB limit.

## History
The first version ran on Netlify Functions with Postgres and Blobs, then briefly on Facilio Run. Both were retired; the old code remains in the Git history.

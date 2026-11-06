# Fluent 2 page pass, 7 Nov 2026

Goal: every page is a clean Fluent 2 page (title, intro, command bar, sections with cards of one idea, data grid, empty state), with the old per-page skins deleted.
Shared patterns live in `src/fluent.css` (`fl-page`, `fl-page-h`, `fl-sub`, `fl-grid`, `fl-stats`/`fl-stat`, `fl-cmd-bar`, `fl-empty`, `fl-dg`).
Tools: `tests/ui/contrast-snippet.js` (paste in the browser pane, needs 4.5:1 or 3:1 for large text), `node scripts/css-prune.mjs "<regex>" files...` (deletes whole rules whose selectors all match; `--dry` lists them), `node tests/ui/css-legacy-audit.mjs`.
Kept on purpose (user, 7 Nov 2026): the night-city banner on Customer projects, the login scene, intro and Discover more.

Legacy audit total (gradients / large radii / shadows): start 193 / 251 / 606.

| Page | State | Checked |
|---|---|---|
| Projects home and list | done | tiles and list view at about 1366 and 800 wide; contrast 0 failures (skip link fixed); `npm test` passes; audit 170 / 242 / 546. Banner kept; stat tiles, search/sort bar, view switch, project cards and the list (now a data grid) are Fluent; clay/glass/pastel rules and the white-circle icon on primary buttons deleted |
| Project dashboard | not done | |
| Tasks (list, board) | not done | |
| Stage 1: MSA intake, Kick-off, Plan | not done | |
| Stage 2: Workshop plan, Transcripts, Whiteboard, Checks | not done | |
| Stage 3: Solution status, Modules, Flow, Mockup, Roles, Notifications, Configuration, KPIs and SLA matrix, BRD | not done | |
| Stage 4: Delivery, FTR, KPI, Go-live readiness | not done | |
| Stage 5: Training guides, builders, Hypercare, Handover | not done | |
| Project group: Transfers, Governance, Changes, AI work, Reports, Resources | not done | |
| Customer view: Learn and Prepare, Module guides, Guide, Dashboards | not done | |
| Help: Claude setup, Team guide, Facilio tools, Privacy | not done | |
| Settings, Templates, Admin | not done | |

Not checked: a real phone width below 800 px, keyboard-only walk-through of the new list.

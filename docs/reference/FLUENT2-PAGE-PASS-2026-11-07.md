# Fluent 2 page pass, 7 Nov 2026

Goal: every page is a clean Fluent 2 page (title, intro, command bar, sections with cards of one idea, data grid, empty state), with the old per-page skins deleted.
Shared patterns live in `src/fluent.css` (`fl-page`, `fl-page-h`, `fl-sub`, `fl-grid`, `fl-stats`/`fl-stat`, `fl-cmd-bar`, `fl-empty`, `fl-dg`).
Tools: `tests/ui/contrast-snippet.js` (paste in the browser pane, needs 4.5:1 or 3:1 for large text), `node scripts/css-prune.mjs "<regex>" files...` (deletes whole rules whose selectors all match; `--dry` lists them), `node tests/ui/css-legacy-audit.mjs`.
Kept on purpose (user, 7 Nov 2026): the night-city banner on Customer projects, the login scene, intro and Discover more.

Legacy audit total (gradients / large radii / shadows): start 193 / 251 / 606.

| Page | State | Checked |
|---|---|---|
| Projects home and list | done | tiles and list view at about 1366 and 800 wide; contrast 0 failures (skip link fixed); `npm test` passes; audit 170 / 242 / 546. Banner kept; stat tiles, search/sort bar, view switch, project cards and the list (now a data grid) are Fluent; clay/glass/pastel rules and the white-circle icon on primary buttons deleted |
| Project dashboard | done | team and customer dashboards rebuilt from `fsec`/`fcard`/`fstat` (Subtitle sections, stat cards, row lists, sign-off rows) in `src/dashboards.js`; old `bn-` tile rules deleted; contrast 158 texts, 0 failures at 1366; list rows no longer fall back to the lavender default button; npm test passes. Customer login and 800 px width not yet looked at |
| Tasks (list, board) | done | number cards, sheet tabs (underline tab list), filter bar, board lanes and cards restyled; old pt-sheets/pt-kpis/pt-qfbar and kb-col/kb-card/kb-seg rules deleted; contrast list 215 texts, only the board "+ Create task" link failed, fixed; npm test passes. The grid itself was already a data grid; header buttons still a plain row (not yet a command bar); 800 px not looked at |
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

## Requested by the user, 7 Nov 2026 (not started)
- **Dashboard gallery replica** for demos: a gallery of sample dashboards (service request, reactive work order, planned work order, inventory requests, quotation, inspection, and the other in-scope modules), like the Facilio dashboard gallery, so a demo can be shown without a customer's data. The user will send the reference material (a patch of the gallery). Needs its own session once the material arrives.
- **Standing rule for the page pass:** on every page and sub page look from top to bottom at number cards, search and filter areas, buttons and boxes; where information is dropped into one rectangle, split it into sections and cards of one idea (Microsoft way).

## Colour, controls and headings pass (7 Nov 2026, all 45 project pages)
Method: a browser crawl opened every sidebar page of the demo project and listed every visible text, fill and border colour that is violet, lavender or magenta tinted, plus the style of every field, button and heading.
- **Colours:** 608 tinted values in 23 CSS files were mapped to the Fluent palette by `scripts/fluent-colors.mjs` (lavender greys to neutral greys, pale violets to soft brand blue, magenta text to the danger red, dark violet ink to #242424, tinted shadows to neutral black). The login scene, intro and Discover more files are skipped. Crawl result: tinted colours on screen went from 44 colour/page combinations to the grey-violet token `--ds-ink-3` (fixed) and a few in files kept as designed.
- **Readable text:** the same crawl checked 4.5:1 on all 45 pages: 7 failures found (white on white selected step, red on pink marker, blue on pale, white on green/amber icons, navy-on-navy heading) and fixed; second crawl: 0 left after the last two fixes.
- **Controls:** buttons are 32 px (small 24), icon buttons are rounded squares, inputs and selects 32 px, on every page; before they were 36/32 px, circles and 38 px.
- **Headings:** h1 28, h2 20, h3 16, h4 14, all semibold, ink #242424, no uppercase; before there were three h2 sizes, black and navy h1/h4 and uppercase h3.
- **Tabs:** one Fluent tab list (flat, underline on the selected tab) replaces five stacked old tab skins (34 rules deleted).
- Not done: layout of each page (cards of one idea) beyond Projects home, dashboard and Tasks; the dark "Your drafts" band on Contract intake and the admin `dtab` pills; 31 gradient elements (guide thumbnails, plan timeline grid) remain.

## Colour with meaning, motion, admin and customer (7 Nov 2026, second pass)
- **Source of the values:** Fluent's own token source (`microsoft/fluentui`, `packages/tokens`), read directly: durations 50/100/150/200/250/300/400/500 ms, curves decelerateMid (0,0,0,1), decelerateMin (.33,0,.1,1), easyEase (.33,0,.67,1); selected tab = 2 px brand underline; skeleton wave #e6e6e6 to #fafafa in 3 s; spinner 1.5 s linear; brand fills for selected state, shared colours sparingly, status colours only for status.
- **Section accents** (`data-sec` on `<main>`, set in `src/shell.js`): project blue, discover teal, design and build deep blue, launch green, customer-facing pink, admin and integrations grey. Used for the page header tint and edge, section heading bar, selected tab, selected sidebar item, big numbers.
- **Shared Claude work panel** (`ki-` classes, used by Contract intake, Transcripts and others): navy banner and red label removed; white card, accent edge, status tiles with a check, footer toolbar. `.tw` tables are full width, header grey.
- **Checks and validations:** filters are a tab list, actions a command bar, one short note, findings a clean list (verified in the empty state only; the demo project has no findings).
- **Audit:** `tests/ui/checks.js` run in the browser pane over 45 project pages, 8 Admin sections and 6 dashboard tabs, and 17 customer-preview pages. Findings: small buttons at 24 px (now 28 px), brd page "Ask Claude" overlapping a heading and one unlabeled icon button (not fixed), admin selected item black pill and 40 px title (fixed), customer home heading and date chip contrast (fixed). Customer preview and admin: no tinted colours left.

# The UI library of Delivery Studio: coss ui

Source read on 7 Nov 2026: https://coss.com/ui (open source, built on Base UI, repository `cosscom/ui`, `packages/ui/src/components/*.tsx` and `styles/globals.css`). Fluent 2 and the old clay layers are not the look any more. This file is the dictionary; the code is `src/ui.css` (the last style layer). Light theme only. It extends `UI-COSS-SPEC-2026-11-07.md`.

## Where it applies
Every page inside a project (`.main[data-sec]`), the sidebar, the Admin console and the shared pop-ups. **Not** the Projects home banner, the sign-in page and its scene art, the intro, and Discover more: those stay as designed.

## Tokens (from coss `globals.css`, mapped to `--cs-*`)
| coss | Value here | Use |
|---|---|---|
| foreground / primary | neutral-800 `#262626` | text, main buttons |
| muted, secondary, accent | black at 4 percent | soft fills, hover |
| border / input | black at 8 / 10 percent | hairlines |
| info / success / warning / destructive | blue-500, emerald-500, amber-500, red-500 (`--cs-info`, `--cs-success`, `--cs-warning`, `--cs-destructive`, each with an `-ink` text colour) | status only |
| radius | 10 px (controls), 16 px (cards), 20 px (pop-ups) | `--cs-r-ctl`, `--cs-r-card`, `--cs-r-pop` |
| ring | accent at 60 percent, 2 px | focus |

Facilio blue `#1570EF` is the accent; navy `#1D1A5E` and pink `#E5197F` are brand accents. Each sidebar group sets `--cs-accent` (project blue, discover teal, design and build deep blue, launch green, customer pink, admin grey); headers, card headers, table headers, active tabs and empty-state tiles take their tint from it, so no inside page is plain white.

## Components (coss name: our class)
- **Button**: `.btn` (secondary/outline), `.btn.primary` (default, near-black with an inner top highlight), `.btn.danger` (destructive-outline), `.btn.danger.primary` (destructive), `.btn.ghost`, `.btn.link`, `.btn.sm`, `.btn.icon`. Press scales to .97; a busy button (`aria-busy="true"`, set by `V.busy`) shows a spinner and ignores clicks; disabled shows not-allowed.
- **Badge / tag**: `.tag`, `.sd-chip`: status colours at 8 percent fill with the `-ink` text.
- **Alert**: `.notice` (info), `.notice.warn`, `.notice.err`: tinted fill, border at 30 percent, 12 px corners.
- **Card / Frame**: `.card`, `.cs-card`, `.sd-w` (white, hairline, small shadow, 16 px corner, tinted header). Clickable cards lift 1 px.
- **Tabs / Segmented control**: `.tabs .tab` (grey track, raised selected tab, accent ink when active).
- **Table**: `.tbl` with a tinted quiet header and a tinted hover row.
- **Empty**: `V.ui.empty` panel with an accent tile. **Skeleton**: `.ui-loading` (coss shimmer, 2 s linear). **Spinner**: the busy ring above.
- **Dialog / Sheet (drawer) / Toast / Menu**: dialog pops (180 ms), drawer slides from the right (240 ms), toast rises then pops, an error toast shakes, menus rise. All off when the person asks for reduced motion.
- **Progress / Meter / Donut / Gauge**: `src/sdcharts.js` (`V.sdc`), the same tokens.

Not used yet (no page needs them): Accordion, Autocomplete, Calendar, Command, Slider, OTP, Number field, Preview card, Composer. Add them here first if one is needed.

## Page order (the same on every inside page)
1. Breadcrumb (where am I). 2. Page header with the title and one sentence. 3. The summary row (status, KPIs, or the one thing to do). 4. The working area in cards, each card one idea. 5. Secondary detail last (history, help). Headings balance their lines, spacing is a 16 px rhythm, at most one primary button per card, and empty and error states say what is missing and what to do.

## Sidebar hierarchy (the default at first open)
Sections: Projects and delivery, Discover and define, Design and build, Launch and support, Share with the customer, Integrations and admin. Stage groups are numbered and coloured (1 blue, 2 teal, 3 pink, 4 amber, 5 green, 7 sky, 8 slate), following the 8-stage roadmap. Every page has an icon (the Facilio tab icon when one exists, else a line icon from `ITEM_ICO` in `src/shell.js`). At first open only Project and the stage the plan is in are unfolded; a person's own folding is remembered and the group holding the current page is always open. Tabs & Layouts can still rename, reorder and re-icon groups per project on top of this default.

## Rules for new work
Use these classes and tokens; no new gradients, glows or custom shadows; no violet or purple; no dark mode; status colours only for status. Check the page at 1440 and 760 px and with reduced motion before shipping.

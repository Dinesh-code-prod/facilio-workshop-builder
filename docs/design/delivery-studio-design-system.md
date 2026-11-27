# Delivery Studio design system (Facilio reference-led, 27 Nov 2026)

**Status:** pilot on branch `feat/facilio-reference-ds`, waiting for the user's sign-off. Once signed off, this replaces the look rules of `docs/design/master-design-system/` (24 Nov). That older spec keeps its page compositions: Contract intake as the model page, the review-table rule, the Calendar and Stateflow add-ons.

**Source of the values:** `docs/reports/facilio-reference-ui-audit.md`. Every token below names the Facilio product token it comes from. Values marked *DS* are Delivery Studio's own choices, each with its reason.

**One system, one file:**
- The tokens and the component rules live in `src/masterds.css`, the last style layer.
- `build.mjs` turns its `:not(#DS)` into a 100-id chain, so it wins over the older layers.
- Nothing else defines look tokens. The older layers (`styles.css`, `ui.css`, `projfx.css` …) are legacy and are being emptied as described in `docs/plans/delivery-studio-ui-migration-plan.md`.

## 1. Principles

1. **It looks like a Facilio product.** Roboto, Facilio blue `#0024D6`, slate ink `#283648`, warm grey hairlines, 4 px rhythm, flat surfaces.
2. **One accent.** Blue marks the main action, links, "you are here", progress and focus. Green, amber and red mark real status only, and always come with words.
3. **Dense, readable data.** 40 px table rows, 14 px text. The build's readability lift (`src/typescale.mjs`) keeps small text at least 1 px larger than the source, on the user's 23 Nov rule.
4. **Same page templates everywhere.** List, Record (detail), Form, Dashboard and Review table.
5. **One look for staff, customer and Admin.** Permissions change menus, actions and data, not styling.
6. **Keep these as designed:** the sign-in page, the intro animation, Discover more, the Excel onboarding tool, the BRD and Excel previews, and print.

## 2. Tokens (`src/masterds.css`, `html body:not(#DS) { … }`)

| DS token | Value | Facilio token | Use |
|---|---|---|---|
| `--ds-page` | `#FFFFFF` | background-canvas | page and cards |
| `--ds-canvas` | `#FAFAFA` | midground-subtle | table header, hover, tab bar |
| `--ds-subtle` | `#F5F5F5` | midground-medium | quiet fills, segmented track |
| `--ds-muted-fill` | `#EAE9E9` | midground-dark | open top-bar tab, pressed |
| `--ds-selected` | `#F3F7FF` | background-selection | selected row, open menu item |
| `--ds-border` | `#EAE9E9` | border-neutral-base-subtler | card and row hairlines |
| `--ds-border-strong` | `#DBDBDB` | border-neutral-base-subtle | input, secondary button, tab bar |
| `--ds-ink` | `#283648` | text-main | text |
| `--ds-text2` | `#384A62` | text-description | secondary text |
| `--ds-muted` | `#607796` | text-caption | captions, counts, placeholder |
| `--ds-icon` | `#607796` | icon-neutral-grey-01-dark | menu and tool icons |
| `--ds-blue` | `#0024D6` | primary-default | main action, link, focus |
| `--ds-blue-h` | `#2E65FF` | primary-hovered | hover |
| `--ds-deep` | `#001DAE` | primary-pressed | pressed, open tab text |
| `--ds-ok` | `#0F6F06` | green-60 (*DS*: text AA; Facilio's `#29A01E` is 3.2:1) | success text and dots |
| `--ds-warn` | `#8D7500` | yellow-60 (*DS*: text AA) | warning text |
| `--ds-bad` | `#B61919` | text-semantic-red | error, overdue |
| `--ds-ok-bg` / `--ds-ok-bd` | `#F1FFF0` / `#CBF3C7` | semantic-green subtle / light | status pill |
| `--ds-warn-bg` / `--ds-warn-bd` | `#FFFAE0` / `#FFED94` | accent-yellow subtler / subtle | status pill |
| `--ds-bad-bg` / `--ds-bad-bd` | `#FFF2F2` / `#F7CCCC` | semantic-red subtler / subtle | status pill |
| `--ds-info-bg` / `--ds-info-bd` | `#F3F7FF` / `#DBE9FF` | accent-blue subtle / light | status pill |
| `--ds-r-badge` | 4 px | pill radius | badges, chips, tags |
| `--ds-r-ctl` | 8 px | input radius | inputs, icon buttons |
| `--ds-r-btn` | 8 px | button radius | buttons |
| `--ds-r-card` | 12 px | section card | cards |
| `--ds-r-panel` | 12 px | | panels, dialogs |
| `--ds-sh` | `none` | (flat surfaces) | cards |
| `--ds-sh-low` | elevation-low-02 | | small floating controls |
| `--ds-sh-float` | elevation-med | | menus, popovers |
| `--ds-sh-high` | elevation-high | | dialogs, drawers |
| `--ds-head`, `--ds-body` | `Roboto, system-ui, sans-serif` | product font | all text; `vendor/fonts/roboto-latin-wght.woff2`, already bundled |

**Spacing:** 4 px base: 4, 8, 12, 16, 20, 24, 32, 40. Sections use 16, 24, 32 or 40. Cards are padded 16 px.

**Type ramp (source size, then shown size after the readability lift):**

| Role | Facilio token | Source size | Shown size |
|---|---|---|---|
| Page title | heading-smb-20 | 500 20/26 | 20 |
| Section title | heading-med-16 | 500 16/24 | 16 |
| Body, table cell, tab | body-reg-14 | 14/21 | 15 |
| Label, caption, pill | caption-12 | 12/18 | 13 |

Nothing important is set below 12 px.

**Breakpoints:** 1920, 1366, 1100 and 768. Below 1100 the stage tabs wrap under the top bar and tables scroll sideways inside their card, never the page.

**Motion:** 120–160 ms ease-out for hover and colour changes, no movement on data. `prefers-reduced-motion` is respected (existing `src/a11y.css`).

## 3. Components

| Component | Rule |
|---|---|
| **App shell** | White 56 px top bar with one hairline. Compact layout: a 56 px rail of 32 px grey icon tiles. Expanded layout: a white menu. The open entry is `--ds-selected` with `--ds-blue` icon and text (see §9 for the violet option). |
| **Page header** | Stage line 12 px `--ds-muted`, title 20 / 500, one 14 px line. On the right: one solid button plus the page's other actions. No banner, no gradient (except the projects home banner, which the user kept). |
| **Breadcrumbs / Back** | 14 px text links in `--ds-text2`; "← Back" is a quiet link, not a button. |
| **Section header** | 16 / 500 inside the card, with a hairline under it when the card has a header row. |
| **Buttons** | 32 px, 8 px corners, 14 / 500. *Primary:* solid `--ds-blue`, white text. *Secondary:* white with a `--ds-border-strong` hairline. *Tertiary* (`.ghost`): text only. *Destructive* (`.danger`): white with red text and a red-tinted hairline. *Icon:* 32 × 32, no border. One primary per page header. |
| **Inputs, selects, text areas, date, lookup** | 40 px (36 px in toolbars), 8 px corners, `--ds-border-strong`, white, placeholder `--ds-muted`. Focus: `--ds-blue` border plus a 3 px `--ds-selected` ring. Label 12 / 500 above the field; required `*` in `--ds-bad`. |
| **Checkbox, radio** | Native, `accent-color: --ds-blue`. |
| **Validation, helper text** | 12 px under the field: helper in `--ds-muted`, error in `--ds-bad` with the field border red. |
| **Tables** | Header `--ds-canvas` 14 / 500 `--ds-ink`; rows at least 40 px; cells padded 8 × 12 px; `--ds-border` hairlines; `--ds-canvas` hover. The primary column is a `--ds-blue` link. The table sits in one 12 px card and scrolls sideways inside it. |
| **Review table** | `.rv-table` with `V.countStrip`, `.rv-toolbar` and `V.rvSt` (rule of 24 Nov kept): the same geometry as Tables. |
| **Filters, search** | Selects and a search field in one toolbar row above the table. The result count is 12 px `--ds-muted` ("12 of 40"). |
| **Tabs** | A text row on a hairline, 14 px. Open tab: `--ds-blue` 14 / 500 with a 2 px underline. Hover: text `--ds-ink`. |
| **Mini-tabs, view switch** | A segmented control on `--ds-subtle`; the chosen segment is white with a hairline and `--ds-ink` text. |
| **Status** | A pill: 12 px neutral ink, 2 × 6 px padding, 4 px corners, a tinted background plus a light border from the status pair (ok, warn, bad, info, neutral). In dense tables, `V.rvSt`: a dot and a word. Never colour alone. |
| **Priority** | The same pill. "High" uses the warn pair, "Critical" the bad pair. |
| **KPI tile** | A white 12 px card with a hairline: label 12 / 500 `--ds-muted`, value 24 / 600 `--ds-ink`, one 12 px line. A 3 px coloured left edge only when the figure carries a status. |
| **Cards** | White, 12 px corners, one `--ds-border` hairline, no shadow, 16 px padding. No card inside a card: inner groups use a hairline or `--ds-canvas`. |
| **Empty** | A 48–64 px icon, a 16 / 600 title, a 13 px `--ds-muted` line, and at most one secondary button. |
| **Loading** | Skeleton rows in `--ds-subtle` (existing `src/uistate.css`). Buttons get `.loading` (V.busy) and stay in place, dimmed. |
| **Error** | A `--ds-bad-bg` note with a `--ds-bad-bd` border, a text that says what failed, and a Retry. |
| **Dialog** | White with 12 px corners and `--ds-sh-high` over a `rgba(25,36,50,.7)` blanket. Title 16 / 500; footer with Cancel (secondary) and the action (primary) on the right. |
| **Drawer** | The same surface from the right; sticky header and footer; the body scrolls. |
| **Toast** | `--ds-ink` background with white text, 8 px corners, `--ds-sh-float`; the status is in the words. |
| **Activity timeline** | A 12 px `--ds-muted` time, 14 px text, a 2 px `--ds-border` line, 8 px dots. |
| **File upload, documents** | A dashed `--ds-border-strong` drop zone; a progress bar in `--ds-blue`; Retry, Resume and Cancel as tertiary buttons. |
| **Stateflow** | The record header shows the current state as a pill. The next transitions are the header's buttons (the one main path is primary). The builder canvas keeps its dotted background. The Test flow button keeps the violet accent (the user's 24 Nov rule). |

## 4. Page templates

- **List.** Header (title, one line, `New <record>` primary). Toolbar row: view or filter selects, search, count, icon tools on the right. Then one table card.
- **Record.** Back link, ID in `--ds-muted`, title plus status pill, the next state as primary, a ⋯ menu. Then tabs, a main column (2/3) of section cards with field grids (label 12 px over value 14 px), and a side column (1/3) of small widgets.
- **Form.** Section navigation on the left (for long forms), fields in a 2-column grid, Cancel and Save in a sticky footer on the right.
- **Dashboard.** Header with a period control; a "What this shows" note (optional, once); a KPI row (4 tiles at 1366 px, 2 under 1100 px); chart cards; a table under its chart.
- **Review table.** Count strip, toolbar, `.rv-table`, one solid button (24 Nov rule).
- **Setup (settings).** As the org's Setup, in today's Facilio colours: a 240 px left panel (#FAFAFA, hairline, 8 px) with a search and collapsible categories, the open page in the selection blue with a 2 px blue edge; on the right the page header and the page's sections as a tab row.
- **Search palette.** As the org's search: 656 px, 100 px from the top, 8 px corners, the high elevation, no backdrop; a 40 px #F5F5F5 field without a border; 42 px rows with a 24 px #F3F7FF icon tile and a chevron; key hints in the footer.
- **Documents.** As the org's Docs page: a #FAFAFA filter band (Folder, Type, Added by, search, Table / Grid), one card with the count at its top, names as blue links with a file icon, the folder as a small grey chip.
- **Top bar.** Module tabs that do not fit go into a ⋯ menu (182 px); the project is a switcher button at the right like Facilio's site switcher; the right end keeps search, Guide me, the bell and the avatar (Preview as customer is in the account menu in the Icons format).
- **Back.** One quiet 32 px text button (arrow and words, #384A62, a grey hover); a record page shows only the Back in its header.

## 5. Accessibility

- **Contrast:** text pairs pass WCAG AA (`--ds-ink` on white 11.6:1, `--ds-muted` on white 4.6:1, white on `--ds-blue` 9.4:1).
- **Focus:** every control has a visible focus ring (2 px `--ds-blue` outline, 2 px offset).
- **Meaning:** status uses words as well as colour.
- **Targets:** hit areas are at least 32 × 32 px; row actions are text buttons.
- **Keyboard:** reachable in DOM order; dialogs trap focus and close on Esc (existing `V.dialog`).

## 6. Responsive rules

- **No sideways page scroll** at 1100 px or wider (checked by `tests/ui/master-ds-check.mjs`). Tables scroll sideways inside their card.
- **Two columns:** KPI rows and field grids drop to two columns under 1100 px and to one under 768 px.

## 7. Contribution rule (new UI)

- **Use the shared parts:** new pages use the templates in §4 and the helpers that exist: `V.countStrip`, `V.rvSt`, `.rv-table`, `.btn` variants, `.tabs`, `.seg`, `.card`, `V.toast`, `V.drawer`, `V.dialog`.
- **Look rules go only in `src/masterds.css`,** as tokens. No new colours, radii or fonts in page CSS. A new page stylesheet may set layout (grid, gaps, widths) only.
- **Run the checks** before a UI change is done: `tests/ui/master-ds-check.mjs`, `tests/ui/button-colour-audit.mjs` and `tests/ui/clutter-audit.mjs`.

## 8. Not copied from the reference

- The tenant's logo, name, data and set-up.
- The embedded dashboards' Inter and indigo (tenant-built pages).
- The violet rail tile (see §9).

## 9. Decisions (user, 27 Nov 2026)

1. **Menu format: Icons or Text** (user, 27 Nov 2026), per person and per view, in Tabs & Layouts and the account menu; **Icons is the default**.
   - **Icons:** the Facilio icon rail, 56 px wide, with 32 px icon squares, 44 px per item and no names (aria-label plus the hover flyout). The open module is a **violet `#3C229D` square with a white icon**, Facilio's selection colour. The open section's pages are module tabs **in the top bar**, after the workspace switch. The project chip and the icon buttons sit at the right end, where Facilio has its site switcher, bell and profile.
   - **Text:** a white side menu with every stage and page written out; the open page sits on a grey square.
2. **Module tabs.** A stage's pages are Facilio module tabs: a flat strip, 14 px text, with the open tab on a grey `#EAE9E9` square with 4 px corners.
3. **Titles:** the page title and card titles are 16 px / 500, as measured on a native Facilio dashboard and record. KPI figures are 32 / 500 with 12 / 400 grey labels; widget titles are 14 / 500.
4. **Font:** Roboto everywhere. The sign-in page keeps its own font, at its 24 Nov design.
5. **Colours everywhere:** animations, dashboards and widgets included. Every hard-coded colour in `src` was moved onto the Facilio palette ramps by one rule (hue family kept, closest lightness). The full mapping is in `docs/reports/facilio-palette-map-2026-11-27.txt`. Exported Word, Excel and HTML documents keep the Facilio document palette their tests require.
6. **Source of truth:** Meteor's CMMS Demo Kit (`get_playbook(path="kit.zip")`), the captured Facilio product CSS. It confirms primary `#0024D6`, Roboto, the 56 px header, the icon rail and the list, form and record layouts.
7. **Chart series,** as seen in the org: `#0074D1`, `#49B83F`, `#34C0CE`, then the Facilio widget accents violet `#7D63DC`, orange `#FF6700`, pink `#ED2780`, yellow `#E2BC00` and purple `#A160B7`. Grid lines are `#E0E6F1`.
8. **From the signed-in org** (`docs/reports/facilio-org-ui-study-2026-11-27.md`):
   - **Corners:** cards, dialogs and form cards are 8 px; dashboard widgets and KPIs are 12 px.
   - **Page header:** a `#FAFAFA` panel with a hairline.
   - **Table headers:** labels 12/400.
   - **KPI cards:** a 6 px top bar, `#0074D1` or the status colour.
   - **Forms:** labels 12/400; the required mark `#DE3500`; focus is a blue border with no ring.
   - **Top bar:** translucent white with a 16 px blur.
   - **Rail:** 60 px wide, `#F5F5F5` hover.
   - **Menus:** 4 px corners, a 0.5 px `#EAE9E9` ring and the medium elevation.

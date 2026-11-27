# Facilio reference UI audit (27 Nov 2026)

What the live Facilio product looks like and how it behaves, measured in the browser, as the base for the Delivery Studio design system (`docs/design/delivery-studio-design-system.md`).

**Reference:** the Facilio product demo tenant on `vibe.facilio.co.uk` (Executive Leadership route). It opened without a sign-in. The tenant belongs to a customer, so its name, logo, data and set-up are **not** copied anywhere in this repo. Only the Facilio product conventions are used.

**Method:** the built-in browser at 1440 × 900 and 768 × 1024. Values come from `getComputedStyle` on real elements and from the CSS custom properties the product ships (`--color-*`, `--colors-*`, `--text-*`, `--elevation-*`, `--spacing-*`). These are measured values, not guesses. Where something is my interpretation, it is marked **Interpretation**.

**Read-only:** nothing was created, edited, approved or submitted. The New Work Order form was opened and then closed with Cancel. The record state button (Close) was not pressed.

## 1. Pages inspected

| # | Area | Route | Kind |
|---|---|---|---|
| 1 | Executive Leadership | `#/executive-leadership` | Dashboard (embedded page) |
| 2 | Portfolio | `#/portfolio` | Module landing: banner, counters, segmented tabs, list |
| 3 | Site record | `#/portfolio/2001` | Detail page with a tree panel, tabs, field grid, widgets |
| 4 | Smart building | `#/smart-building` | Operational dashboard (floor plan, strategies) |
| 5 | Faults (command centre) | `#/commandcentre` | List with severity, status and SLA pills |
| 6 | Work orders | `#/work-orders` | List with a view selector, filter, list/calendar switch |
| 7 | Work order record | `#/work-orders/1691` | Detail page with a stateflow action, 9 tabs, widgets, empty states |
| 8 | New work order | `#/work-orders/new` | Full-page form with section navigation and a sticky footer |
| 9 | Assets | `#/assets` | List |
| 10 | Quotes | `#/quotes` | List |
| 11 | Reports (Discover) | `#/ops-vision` | Report gallery cards |
| 12 | Responsive | Work orders at 768 px | Tablet layout |

**Not reached:**
- The filter, view selector, calendar switch and bell gave no visible response when clicked in this demo. Their popovers are unverified.
- The app switcher (grid icon) opened the Portfolio module, not a menu.
- Setup, the profile and notifications were not opened (Setup is configuration, out of read-only scope).
- Validation messages were not triggered, because that needs a submit.
- Keyboard focus rings were not observable: focus set by script showed no style change. Re-check with real keyboard input.

## 2. Two layers in the reference

1. **The Facilio product shell and native modules** (Portfolio, Work orders, Assets, Quotes, Faults, forms, details). These use the Facilio design system: Roboto, primary blue `#0024D6`, neutral ink `#283648`, warm grey borders `#EAE9E9` / `#DBDBDB`, and a 4 px spacing scale. **This layer is the reference for Delivery Studio.**
2. **Embedded dashboard pages** (iframes such as `dashboards/executive_leadership.html`). They use Inter, indigo `#12439E`, a page background of `#F5F6F8`, 13 px card corners and a 1–2 px shadow. They are tenant-built pages and do not use the product tokens. **Interpretation:** treat them as examples of dashboard *composition* (a "What this shows" note, KPI row, chart, table), not as a token source.

## 3. Conventions observed

### 3.1 Layout and page structure
- **Observed:**
  - A top bar 56 px high, white: logo, a divider, the tenant logo, then the module's own tabs in the bar, a site picker, the bell and the avatar on the right.
  - An icon rail 56 px wide on the left.
  - The content sits to the right of the rail on white, with no page-level grey canvas.
- **Detail pages:** an optional tree panel on the left (250 px card), then the content in a main column (about 2/3) and a widget column (about 1/3).
- **Forms:** a full-page panel with section navigation on the left (195 px) and fields in a 2-column grid, with Cancel and Save in a sticky footer on the right.
- **Delivery Studio:** the same three templates (list, detail, form), plus a dashboard template.

### 3.2 Sidebar and navigation
- **Observed:**
  - A rail of 32 × 32 icon tiles in one grey (`#283648` icons).
  - The open module tile is filled violet `#3C229D` (token `--colors-background-accent-violet-selection`) with a white icon and 4 px corners.
  - Module pages appear as tabs in the top bar (for example Work Orders, Planned Maintenance, PPM Planner, Service Requests, Job Plans). The open one sits on grey `#EAE9E9` with 4 px corners and 8 × 12 px padding.
  - At the bottom of the rail: the AI mark, the app grid and Setup.
- **Delivery Studio:** this is the Compact layout already in the app (rail plus stage tabs). Expanded stays as a personal choice.
- **Open decision:** the violet "you are here" tile against the current rule of blue only (see the design-system doc, section 9).

### 3.3 Header and toolbar
- **List pages:**
  - The title is 14 px / 500 with a 12–13 px description under it.
  - Under that: a view selector ("Open ▾" / "System Views – All Sites ▾", 32 px, 4 px corners, `#DBDBDB` border) and a filter icon button.
  - On the right: a list/calendar switch and one solid primary "New <record>".
  - Under that: "1–44 of 44 Records" (12 px, `#607796`) and icon tools (columns, export, settings).
- **Detail pages:**
  - "← Back" (14 px), the record ID (14 px / 500, `#607796`), the title, then a status pill.
  - On the right: one solid primary button, which is the next state transition ("Close"), plus a kebab menu (24 px).
  - Tabs under the header.

### 3.4 Typography
- **Product font:** Roboto. Type tokens:

| Token | Value |
|---|---|
| `heading-smb-41` | 600 41/53 |
| `heading-med-32` | 500 32/40 |
| `heading-smb-20` | 500 20/26 |
| `heading-med-16` | 500 16/24 |
| `heading-med-14` | 500 14/21 |
| `body-reg-16` | 400 16/24 |
| `body-reg-14` | 400 14/21 |
| `caption-med-12` | 500 12/18 |
| `caption-reg-12` | 400 12/18 |
| `caption-reg-10` | 400 10/15 |

- **In use:**
  - Table cells 14 px; table headers 14 px / 500.
  - Section titles 16 px / 500; field labels 12 px; field values 14–16 px.
  - Pills 12 px; the empty-state title 16 / 600 and its text 13 / 19.5.
  - Dashboard page titles 19 px / 700.
- **Delivery Studio:** Roboto, with the type ramp above. The app's readability lift (`src/typescale.mjs`, +1 px under 15 px) stays.

### 3.5 Colour
Neutral and accent ramps run from 05 to 90, for example blue 05 `#F3F7FF` to 90 `#00125E`. The semantic tokens used most:

| Role | Token | Value |
|---|---|---|
| Text main | `--colors-text-main` | `#283648` |
| Text description | `--colors-text-description` | `#384A62` |
| Text caption | `--colors-text-caption` | `#607796` |
| Primary | `--colors-background-primary-default` | `#0024D6` |
| Primary hover | `…-primary-hovered` | `#2E65FF` |
| Primary pressed | `…-primary-pressed` | `#001DAE` |
| Selection | `--colors-background-selection` | `#F3F7FF` |
| Canvas, container | `--colors-background-canvas` | `#FFFFFF` |
| Midground subtle, medium, dark | | `#FAFAFA` / `#F5F5F5` / `#EAE9E9` |
| Border subtler, subtle | `--colors-border-neutral-base-*` | `#EAE9E9` / `#DBDBDB` |
| Red text | `--colors-text-semantic-red` | `#B61919` |
| Green text | | `#29A01E` |
| Orange text | | `#D85903` |
| Red, green, yellow tints | `*-subtle` | `#FFF2F2` / `#F1FFF0` / `#FFFAE0` |

- **Links:** `#0024D6`, 14 px.
- **Required asterisk:** `#D92D20`.
- **Note:** green `#29A01E` on white is about 3.2:1. Delivery Studio uses green-60 `#0F6F06` for green text, to meet AA.

### 3.6 Spacing and density
- **Spacing tokens:** a 4 px base (`--numerical-nl-01` … `-10` = 4 … 40 px). Containers use 2 / 4 / 8 / 12 / 16 px, sections 16 / 24 / 32 / 40 px.
- **Tables:** rows 40 px, cells padded 8 × 12 px.
- **Buttons:** 32 px high, padded 8 px. Inputs are 40 px high in forms and 30 px in table filter rows.
- **Cards:** padded 16 × 18 px.
- **Interpretation:** dense, but clear.

### 3.7 Borders, surfaces, elevation
- **Corners and borders:**
  - Cards and sections: 12 px corners with a 1 px `#EAE9E9` border and no shadow.
  - Widgets and counters: 8 px corners.
  - Buttons and inputs: 8 px. Pills, chips and view selectors: 4 px.
  - The tab bar: grey `#FAFAFA` with corners rounded at the bottom only (`0 0 10px 10px`).
- **Elevation tokens:**
  - `low-01`: `0 1px 1px rgba(5,16,30,.25), 0 0 1px rgba(5,16,30,.32)`
  - `low-02`: `0 2px 4px rgba(5,16,30,.10), 0 1px 2px rgba(5,16,30,.25)`
  - `med`: `0 8px 8px rgba(5,16,30,.08), 0 0 2px rgba(5,16,30,.05)`
  - `high`: `0 16px 16px rgba(5,16,30,.14), 0 2px 4px rgba(5,16,30,.14)`
- **Usage:** surfaces stay flat; shadows only on floating layers.

### 3.8 Buttons and action hierarchy
- **Primary:** `#0024D6` with `#EDF5FF` text, 14 / 500, 8 px corners, 32 px high.
- **Secondary:** transparent with a 1 px `#DBDBDB` border and `#283648` text.
- **Icon button:** 32 × 32, 8 px corners, no border. A small icon button is 24 × 24.
- **Text link button:** 12 / 500, `#0024D6` ("View Details").
- **Pattern:** one solid button per page header. On a record, that button is the next stateflow transition.

### 3.9 Forms and fields
- **Labels:** 12 px above the field; a red `*` marks required fields.
- **Fields:**
  - Input: 40 px high, 8 px corners, a 1 px `#DBDBDB` border, white, placeholder `#607796`.
  - Select: the same, with a chevron.
  - Date: a calendar icon on the left of the field.
  - Lookup: a type selector on the left ("Asset ▾") and a picker icon button on the right.
  - Text area: about 56 px high, resizable.
- **Grouping:**
  - Section navigation on the left; the open section is grey `#F5F5F5` with 12 px corners.
  - A "General Information" group chip: 13 px, a 1 px `#DBDBDB` border, 4 px corners.

### 3.10 Tables and data
- **Header:** `#FAFAFA`, 14 / 500, with a 1 px `#EAE9E9` line under it. Under the header sits an inline filter row (Search, Select …), one field per column.
- **Rows:** 40 px, cells padded 8 × 12 px, a 1 px `#EAE9E9` line under each row, and a `#FAFAFA` hover (`tbody tr:hover td`).
- **Cells:** the primary column is a blue link. A checkbox column comes first, an ID column second.
- **Long text** is cut short with an ellipsis ("Chiller CH-01 high condenser pres…").

### 3.11 Cards and KPI
- **Native counters (Portfolio):** an 8 px card with a 1 px `#EAE9E9` border, a 16 px label, then an icon and the number.
- **Detail widgets:** a titled card ("Site Insights", "Cost") with stat tiles on `#FAFAFA`.
- **Dashboard KPI tiles (embedded pages):**
  - A 12 px / 500 caption label and a 24 px / 700 value.
  - A 12 px secondary line, a 3–4 px coloured left edge, and a "Details ›" link at the top right.
- **Interpretation:** the left edge only carries meaning (variance red/green, at risk amber).

### 3.12 Charts
Embedded dashboards use clustered bar charts with a three-tone blue (budget, actual, committed), a legend at the top right, light grid lines, an "Export CSV ↓" link above, and a matching table under the chart.

### 3.13 Filters and search
- **Lists:** a column filter row inside the table header (a search field per text column, a select per choice column). The view selector chooses a saved view, and a funnel icon opens the advanced filter (unverified, see §1).
- **Dashboards:** a period stepper (‹ Last 12 Months ›) and a site picker in the top bar.

### 3.14 Tabs and sub-navigation
- **Record tabs:** 14 px text, the open tab blue `#0024D6` at 14 / 500. They sit on a grey `#FAFAFA` bar with a 1 px `#DBDBDB` line underneath.
- **Segmented tabs on a landing page:** Site / Building; the open one on grey.
- **Sub-tabs inside widgets:** "Open (4) / Closed (0) / All (4)".

### 3.15 Status and priority
- **Status pill:** 12 / 400 text in neutral ink, 2 × 4 px padding, 4 px corners, 20 px high. A tinted background with a matching light border carries the colour:
  - Red (Critical, Breached): `#FFF2F2` / `#F7CCCC`
  - Yellow (Major, In progress, At risk): `#FFFAE0` / `#FFED94`
  - Green (On track): `#F1FFF0` / `#CBF3C7`
  - Blue (New): `#F0F6FF` / `#CCE2FF`
  - Neutral outline (Scheduled): no fill, a `#283648` border
- **List status:** a coloured dot plus a word inside a light pill (Open, In Progress, On Hold).
- **Priority:** a solid tint without a border ("MEDIUM", 12 / 600, `#8D7500` on `#FFED94`, 2 px corners).
- **Interpretation:** the words always carry the meaning; colour only supports them.

### 3.16 Modals and drawers
- **Forms:** the create form opens as a full-page panel inside the content area, not as a small modal.
- **Blanket:** `#192432` at 70 % (`--colors-background-blanket`).
- **Not seen in action:** a confirmation dialog or a drawer.

### 3.17 Notifications and feedback
- **Bell:** in the top bar (its panel was not seen).
- **Notes on a page:** a "Sample data" outline tag (11 px, `#607796`, a `#D8E3F1` border). On dashboards, a blue info note ("Riverside … forecast to land over budget") on `#E7EDF7` with 9 px corners.

### 3.18 Responsive
- **At 768 px:** the rail stays, and the module tabs drop to a second row under the top bar. The table scrolls sideways inside its card; the page itself never scrolls sideways (`scrollWidth = 768`).
- **At about 780 px wide (the pane's own size):** the dashboard reflowed the KPI tiles to two columns.

### 3.19 Accessibility and keyboard
- **Checked:** ARIA labels exist on Profile, Setup and the search fields. Many rail items are `div`s with click handlers.
- **Not checked:** keyboard reach (needs a manual pass).
- **Delivery Studio:** keep its existing focus ring (2 px blue outline), its button elements and its tests (`tests/ui/a11y`-style checks).

### 3.20 Empty, loading, error, disabled
- **Empty state:** an illustration of about 64 px, a 16 / 600 title ("No Before Images Yet"), a 13 / 19.5 `#607796` line, and one small secondary button.
- **Empty widget:** "Operating Hours is not associated", with an "Assign Operating Hours" button.
- **Loading:** not observed (the demo loads instantly). **Error:** not observed. **Disabled:** not observed.

## 4. Limits

- **Read-only exploration:** forms were not submitted and validation messages were not seen. Setup was not opened.
- **Unverified popovers:** the filter, view selector, calendar switch and bell gave no visible reaction.
- **Not observed:** loading and error states, drawers, confirmation dialogs.
- **Dashboard styles:** these are tenant-built pages, used for composition only.
- **Screenshots:** none were committed, because they carry the tenant's name and logo. Re-run the steps in §1 to see the pages.

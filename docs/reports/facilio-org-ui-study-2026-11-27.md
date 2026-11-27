# Facilio org UI study (27 Nov 2026)

Read-only study of a signed-in Facilio org at 1440 x 900, measured with getComputedStyle. Patterns only; no record data. Values are CSS px. "Known" means it was already in the Delivery Studio rules and is not repeated unless it differs.

Status: complete. Areas not reached are listed at the end.

## Differences from the rules we already had (short list)

1. Record summary cards, dialogs and form cards use **radius 8**, not 12. Radius 12 is used only on dashboard widget, KPI and filter cards.
2. List table headers have **labels at 12/400**, not 14/500. They are 33 high without the column-search row and 65 high with it.
3. **All status pills are blue** (#F3F7FF fill, #DBE9FF border, 8px #0024D6 dot) whatever the state. This org has no per-status colours.
4. The **KPI top edge is a 6px #0074D1 bar** (radius 4 4 0 0), not the primary blue.
5. Page headers are **one #FAFAFA panel** with a hairline and radius 8. On a record page the tabs continue the same panel.
6. Rail flyout, popovers and menus: radius 4, a 0.5px #EAE9E9 ring, and the low elevation shadow.
7. The tooltip is dark: #384A62, radius 2, text 12/400 #EDF5FF.
8. The top bar is translucent white with a 16px backdrop blur. Module tabs are 4px-radius pills, and the open one is #EAE9E9 at 14/500.
9. Forms are **full pages**: a 720 card between glass header and footer bars. Labels are 12/400, the required "*" is #DE3500, and focus is a blue border with no ring.
10. Setup still uses the **older look**: system font, #0A7AFF blue, 3px radius, upper-case buttons. It should not be copied.

## 1. Shell

| Element | Measured |
|---|---|
| Top bar | 56 high, full width, background rgba(255,255,255,.5) with `backdrop-filter: blur(16px)`, no border or shadow |
| Logo | 96 x 32 at x16 |
| Module tabs (top bar) | the open rail module's pages; each tab 32 high, padding 8 x 12, radius 4; open tab background #EAE9E9 and text 14/500; other tabs transparent 14/400; tabs sit 2px apart starting x132 |
| Site switcher | 32 high, max 212 wide, background #FAFAFA, radius 8, padding 8, icon + "All Sites" 14/500 + chevron |
| Site menu | 240-wide popover; search field 32 high, radius 8, 1px #DBDBDB; options 41 high, padding 12, radius 4; selected option #F3F7FF |
| Top-right icons | 16px icons in 32 x 32 ghost buttons (radius 8), gap 12; order: search, announcements (megaphone), notifications (bell, 18px), avatar |
| Count badges | red #B61919, text 10/500 #EDF5FF; on announcements a 14 x 14 circle, on bell a 4px-radius tag (19 x 16), placed top-right of the icon |
| Avatar | 32 circle, background #FFED94, initials 12/500 #283648 |
| Content area | starts x60, y64 (8 above, 24 below); page gutter 12 left/right inside |
| Icon rail | 60 wide, no background or border (sits on white), padding 8 12 24 |
| Rail items | 32 x 32 tiles, radius 4, 16px icons, 44px pitch; idle white tile + icon #283648; hover #F5F5F5; open module #3C229D tile with icon #FCFEFF |
| Rail overflow "..." | last item; opens a 218-wide popover beside the rail: rows 44 high, padding 12, radius 4, icon + 14/400 label |
| Rail bottom | a 36 x 36 item with 20px coloured folder icon (opens another app in a new window), then the Setup gear (32 tile) |
| Rail hover flyout | 160-wide card at x54 aligned to the item's top; white, radius 4, elevation `0 8px 8px rgba(5,16,30,.08), 0 0 2px rgba(5,16,30,.05)`; header 34 high, padding 8 x 12, bottom hairline #EAE9E9, module name 14/700; page links 41 high, padding 12, 14/400 |
| Popover recipe (all menus) | white, radius 4, ring `0 0 0 .5px #EAE9E9` + the elevation above |
| Tooltip | background #384A62, radius 2, padding 4 x 8, text 12/400 #EDF5FF, shadow `0 2px 8px rgba(0,0,0,.15)`, appears below the control |

**Global search** (search icon): a command palette, not a page. 656 wide, centred, 135 from the top, white, radius 8, padding 8, shadow `0 0 2px rgba(5,16,30,.05), 0 8px 8px rgba(5,16,30,.03), 0 16px 40px rgba(5,16,30,.12)` (the high elevation); no dimmed backdrop. Field 40 high, background #F5F5F5, radius 8, no border, placeholder "Search anything", 14px. Result rows 42 high, padding 8, radius 8: a 24 x 24 icon tile (#F3F7FF, radius 8) + "Module – Page" 14/400 #384A62 + chevron; the first row shows a "tab to search inside" key hint. Footer 34 high: key hints 12/400 #384A62 (navigate, tab, enter, esc) and "clear recent" 12/400 #607796.

**Announcements** (megaphone): 280-wide popover; header 50 high, padding 16, bottom hairline #DBDBDB, title 14/500; items: title 14/500, one-line description 12/400 #607796.

**Notifications** (bell): 400-wide, up to 602-high popover. Header "Notifications" 14/500. Unread rows background #F3F7FF, padding 12 x 16, about 94 high: 32px circle icon (#FAFAFA, radius 40), module 12/400 #607796, time-ago 12/400 #607796 right, title 14/500 #283648, body 12/400 #384A62, unread dot 8px #0024D6. Footer 51 high with top hairline #DBDBDB and a centred "Show All" text button 14/500 #0024D6. Opening the panel cleared the bell count (read state changes on open).

**Profile menu** (avatar): 322-wide popover. Header 128 high with a decorative line-art background image under a white 40% wash; 56px avatar (initials 20/500), name 16/500, email 14/400 #607796. Rows About / Blog / Help 41 high, padding 12, icon + 14/400. "Download our apps on" row with store icons. Logout is a full-width secondary button (32 high, radius 8, #DBDBDB border, 14/500).

## 2. Dashboards

Dashboards render in a same-origin iframe inside the content area.

| Element | Measured |
|---|---|
| Header panel | 60 high, x12, full width minus gutters, background #FAFAFA, 1px #EAE9E9, radius 8 |
| Breadcrumb | "Folders >" 12/400 #283648 above the title |
| Title | 16/500 (known) + visibility chip "Everyone can see": 20 high, padding 2 x 4, radius 4, #F5F5F5, 1px #DBDBDB, 12/400 |
| Period switcher | three ghost buttons in a row: prev (32 x 32), "This month" (14/500, padding 8), next (32 x 32); no group border |
| Edit layout | secondary button 32 high, icon + text, 1px #DBDBDB; then a 28px "..." |
| Section bands | known (16/500 on #FAFAFA, 40, radius 4), with a collapse chevron left of the name |
| Filter widgets | card 108 high, radius 12, padding 12 x 16, hairline; label row: 20 x 20 violet tile #5E3ED3 radius 4 with white icon + field name 14/400 #384A62; below, a 40-high select (radius 8, #DBDBDB) plus a calendar/picker icon |
| KPI cards | card radius 12, hairline, 108 high, 314 wide (4 per row, gap ~18); top edge a 6px bar #0074D1 with radius 4 4 0 0 inside the card; padding 12; label 12/400 #607796, value 32/500 #283648, optional sub-line 12/400 #607796 |
| Chart widgets | card radius 12, padding 16, hairline; title 14/500; three 16px header icons top right, 32 apart: expand, a second view icon, "..." |
| Widget "..." menu | 170-wide popover, padding 4; items 41 high, padding 12, radius 4, icon + 14/400 ("Go to report") |
| Expand | opens a modal (1280 x 616, white, radius 8, low elevation) over a blanket rgba(25,36,50,.7) that also covers the shell; header 51 high, padding 12 x 24, bottom hairline, title 16/500, X right; toolbar with a Chart / Table segmented switch and a "Visualization" ghost button |
| Segmented switch | wrapper 32 high, #FAFAFA, 1px #DBDBDB, radius 8, padding 4; active segment white, radius 4, shadow `0 2px 4px rgba(5,16,30,.1), 0 1px 2px rgba(5,16,30,.25)`; labels 12/500 with icon |
| Charts | canvas-based; legend hidden on the pies, labels outside with leader lines; doughnut radius 40-70%; tooltip white, radius 8, text 14 #666; axis labels 12 (10 on small charts) #607796; axis line #EAE9E9; split lines #E0E6F1 (dashed on the line chart); line width 2 with hollow-circle points |
| Series colours seen | #0074D1, #49B83F, #34C0CE (in that order) |
| Floating pills | bottom-left "Dashboards" pill (#384A62, radius 4, padding 8 x 12, text #EDF5FF, small shadow) opens the dashboard list; bottom-right dark pill (#283648, radius 8, 32 high) jumps to sections |
| Dashboard list | slides in as a 280-wide left panel inside the page (not a modal): #FAFAFA, hairline, padding 12 x 16; header "Dashboards" 14/500 with collapse icon; search 40 high (#FAFAFA, #DBDBDB, radius 8); group labels 10/500 uppercase #607796; items 14/400 #384A62, 36px pitch, rows padding 2 x 4 radius 4, hover #FAFAFA; folders have a chevron |

Not reached: the period picker popover (the click did not open anything visible in time).

## 3. Lists (Work Orders, Assets, Service Requests)

Lists render in the top document (no iframe).

| Element | Measured |
|---|---|
| Module header | one #FAFAFA panel, 1px #EAE9E9, radius 8, 100 high, padding 8 x 12: title 16/500, description 14/400 #384A62, then a row with the view selector and a funnel icon; the primary "New <record>" button sits bottom right of the panel |
| View selector | 32 high, 1px #DBDBDB, radius 4, view name 14/500 + chevron |
| View menu | 280-wide popover: header "Views" 14/500 with a folder-add icon (row 40, padding 4 x 12); search 40 high (focus = 1px #0024D6 border, no ring); folder rows 14/500 with folder icon and chevron; views indented 32, rows 41 high, padding 12, radius 4, 14/400; current view #F3F7FF and 14/500 |
| Filter | the funnel opens "Advance Filter": a 1296 x 764 modal, radius 8, low elevation, blanket rgba(25,36,50,.7). Left pane: field picker with search, a white-to-#F3F7FF vertical gradient, group label 10/500 uppercase; right pane "Configured Fields" 16/500; footer Reset Filter (secondary) + Apply Filter (primary) |
| Record count | "1-33 of 33 Records" 12/400 #607796, top left above the table; "No records" when empty |
| Toolbar (right) | four 16px icon buttons (32 ghost): Compact view, Column settings, Export, Column Search (toggles an inline search row under the headers) |
| Column settings | 320-wide popover: title 14/500, search, group labels FROZEN / FLEXIBLE 10/500 uppercase #607796, rows with 16px checkboxes (checked fill #001DAE) and drag handles, footer Cancel + Save |
| Table header | #FAFAFA, bottom hairline; column label 12/400 #283648 (not 14/500); 33 high without the search row, 65 with it; a 24px column-menu icon on hover |
| Inline column search | white 32-high cells, no border: "Search" text fields with a search icon (placeholder #607796) or "Select ..." dropdowns; lookup columns add a picker icon |
| Rows | 40 high, cell padding 8 x 12, bottom hairline #EAE9E9; text 14/400; primary column and lookups are links #0024D6 without underline |
| Row hover | no fill; 1px inset lines top and bottom #A8AAAA; a dark tab (#384A62, 32 x 39, radius 8 0 0 8) appears at the right edge and expands on hover into a 159-wide action strip (#FAFAFA inner panel) with 32px icon buttons (edit, delete, comments) |
| Status pill | known shape; every status seen used the same blue: #F3F7FF fill, #DBE9FF border, 8px #0024D6 dot, text 12/400 #283648. No per-status colours in this org |
| Bulk bar | selecting a row shows a floating bar at the bottom centre: 567 x 50, rgba(255,255,255,.4) with 1px #EAE9E9, radius 4, low elevation; a 40-wide blue count block (#0024D6, white number), "Items Selected" 14/400, then secondary buttons (Print, Close, Delete, Export, More Actions; Delete is not red) and an X |
| Empty state | 160 x 115 illustration, title 16/500 #384A62, line 14/400 #607796, centred in the table area |
| Loading | grey skeleton bars for the header and rows; spinners elsewhere |
| Master-detail | opening an asset keeps a 280-wide list panel on the left (#FAFAFA, hairline, radius 8): "All Assets" header, 40-high search, rows 41 high padding 12 14/400, hover/selected #F5F5F5 radius 4; pager at the bottom (24px prev/next, current page 25 x 24 #F3F7FF with 1px #0024D6, radius 2) |
| Pagination (full lists) | not seen: every list fitted on one page |

## 4. Record summary (Work Order, Asset)

| Element | Measured |
|---|---|
| Header | #FAFAFA panel radius 8 8 0 0, 78 high, hairline: "← Back" 14/400; ID 14/500 #607796; title 16/500 + status pill |
| Actions | top right: secondary buttons (a split button = text button + 32 chevron button), then one primary, then a kebab; asset showed one secondary + one primary |
| Kebab menu | 142-wide popover, padding 8, items as 32-high ghost buttons 14/500 (Edit, Print, Download, ...) |
| Tabs | same #FAFAFA band continuing the header (41 high, radius 0 0 8 8); tabs 32 high, padding 8 x 12; open tab #0024D6 14/500 with a 2px blue underline; others 14/400 #283648 |
| Cards | white, 1px #EAE9E9, radius 8 (not 12); header 40 high with title 14/500 at 12 padding |
| Field grid | 4 columns (~217 wide each) in the main card; label 12/500 #283648, value 14/400; a "Primary Details" group chip (20 high, #F5F5F5, #DBDBDB, radius 4, 12/400); "View More" text button 14/500 #0024D6 with an expand icon centred at the card foot |
| Layout | main column ~1013 wide + right column 327 wide, gap 16 |
| Side widgets | Responsibility (illustrated empty state), Location details (links), Time details (timer, then grey #FAFAFA radius-8 boxes with label 12/500 #607796 and value) |
| Comments / Attachments | a card with inner tabs (14/500 blue when open); empty state illustration + title 16/500 #384A62 + line 14/400 #607796 + secondary "Add Comment" button with icon |
| History tab | one card "History"; vertical timeline: 2px #EAE9E9 connector, small outlined node per event, 32px avatar circle (violet #7D63DC, initials 12/500 white), event text 14/400 #607796 with field names bold, time 10/500 #607796 |

## 5. Forms

| Element | Measured |
|---|---|
| Edit Work Order | full page (route /edit), not a modal. A light decorative pattern banner (#F3F7FF tints) fills the top; a 784-wide glass header bar (rgba(255,255,255,.4), 1px #DBDBDB, radius 8, padding 12 x 32, icon + module name 16/500); the form is one 720-wide white card (radius 8, hairline) centred; a matching 784-wide glass footer bar pinned at the bottom with Cancel (secondary) + Submit (primary) on the right |
| Section heading | 14/500 (e.g. the module name) |
| Labels | 12/400 #283648 above the field; required marker "*" #DE3500 before the label |
| Fields | 40 high, radius 8, 1px #DBDBDB, text 14/400, padding 4 x 12; focus = 1px #0024D6 border, no ring; disabled = #FAFAFA fill; placeholder #607796; two fields per row where short |
| Textarea | 100 high, padding 8 x 12 |
| Dropdown | 320-wide popover, padding 12 0; options 24 high with 4 gap, 14/400, selected #F3F7FF radius 4 |
| Lookup field | field + a 32 square picker icon at the right; module-type select joined to the left for polymorphic lookups |
| Lookup picker | 1296 x 764 modal: left 260 nav (search views, view list), right a selectable table (radio per row) with filter chips (20 high, #F5F5F5, #DBDBDB, radius 4, 12px), "Selected Item" line 14/400 #607796 with chips, "Save Selection" primary bottom right, X top right |
| Attachments | "Drag & drop here" dropzone |
| Form assistant | a 44px round blue button (#0024D6, 1px #5989FF border) bottom right of forms, titled "A New form experience is available" (not opened: it may switch the user's form preference) |
| New Asset | a small pre-step dialog first: 520 wide, top-aligned at the top of the content (not vertically centred), radius 8, low elevation, blanket rgba(25,36,50,.7); header 51 high padding 12 x 24 with bottom hairline, title 16/500; field label 14/400; footer 57 high padding 12 x 24 with top hairline, Cancel + Confirm right |

New Service Request uses the same full-page form (route /new): a 720 card and the glass header and footer bars.

Not reached: a date picker. None of the forms opened had a date field.

## 6. Dialogs, drawers, popovers

Dialog sizes seen: small 520, large 1280 x 616 (widget expand), full 1296 x 764 (filter, lookup). All radius 8 with the low elevation and the blanket rgba(25,36,50,.7). Drawers: the dashboard list and the master list panel slide in inside the page rather than over it. There is no side drawer for forms. Confirmation dialogs were not opened because each one needs a destructive action first.

Escape did not close the dashboard expand modal; only the X closed it. Escape did close popovers and the command palette.

## 7. Setup

The Setup gear opens /setup/maintenance/home in a **new browser window**. Setup is a separate app with an older visual language that does not match the main product.

| Element | Measured |
|---|---|
| Font | system ui-sans-serif stack (not Roboto) |
| Header | 50 high, white with a decorative pattern image; logo + "Setup" 16/500 #324056 left, app name 16/500 centred, 32px avatar (violet) right |
| Setup home | page background #F7F8F9; full-width search 52 high, radius 3; category cards 333 x 350 in 3 columns, white, radius 8, shadow `0 2px 4px rgba(232,232,232,.5)`, padding 20 x 48; card title 16/700 #324056 with icon; links 14/400 #606266 (blue underline on hover); a "BETA" tag 10/500 white on blue |
| Left navigation | 288 wide, #FAFCFF; collapsible groups with chevrons; items 41 high, padding 10 15 10 40, 14/400 #313131; active item #F3F5FB, 14/500, a 2.4px #0A7AFF left bar, radius 3 |
| Page header | title 18/500 #4F4F4F; description 12/400 #808080 |
| Tabs | 14/500 for the open tab, 14/400 for the others, #324056, 2px #0A7AFF underline |
| Primary button | #0A7AFF, 40 high, radius 3, 12/500 upper-case, padding 12 x 20 |
| Table | header #F7F9FC, 11/700 #333, 48 high; rows 64-71 high, 13/400 #324056, bottom border #EBEEF5; avatar circles with initials; on/off switches 40 x 20 blue; "Invite Accepted" tag in green text on white with a green border, radius 4 |
| Pager | "1 - 16 of 16" with prev/next arrows, top right of the table |

Pages seen: Setup home, Users, Modules. Stateflows were not opened.

## 8. AI / assistant entry points

The shell has no AI or chat assistant: there is no rail item, top-bar icon or command for one. The only related entry is the 44px round "form assistant" button on forms, titled "A New form experience is available". It was not clicked because it may switch the user's form preference. Dashboards carry an internal `ai-widget-reload-slot` wrapper on widgets, but nothing visible.

## 9. Responsive (Work Order list)

| Width | Behaviour |
|---|---|
| 1440 | as measured above |
| 1100 | same layout: the 60 rail, top bar items and header panel stay; the "New" button stays at the panel's right; the table scrolls sideways inside its own wrapper (no page-level horizontal scroll) |
| 768 | still the desktop layout: the rail, module tabs and site switcher stay, and the description stays on one line; the table wrapper is 682 wide and scrolls sideways. There is no collapsed menu or card list |

## Not reached

- Dashboard period picker popover (the click did not open anything visible).
- Date picker (no date field on the forms opened).
- Confirmation dialogs (they need a destructive action).
- Stateflow setup page.
- The folder icon at the bottom of the rail and the Setup gear both open new windows, which the browser pane blocked. Setup was reached by opening its address in the same tab.
- The form assistant button (not clicked, see section 8).
- Full-list pagination (every list fitted on one page; only the master-list pager was seen).
- Opening the notifications panel cleared the bell count, so the read state changed on open. No other data changed: every form and dialog was left with Cancel, X or Escape. The Service Request column-search toggle was turned on to show the empty state, then turned off again.

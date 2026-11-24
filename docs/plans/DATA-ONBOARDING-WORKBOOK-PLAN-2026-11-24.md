# Data Onboarding workbook: audit and enhancement plan (24 Nov 2026)

The Excel Data Onboarding tool is `public/onboarding-tool/` (shown in a frame on the Data onboarding page, `src/onboarding.js`). It is improved in place, not replaced.

## What already works (kept as is)
- 16 template tables on 15 sheets (`07-part.js` SPEC, `04-rules.js` RULES), the guide panel (`08-part.js`, `09-part.js`), walkthroughs.
- A grid with row virtualisation, undo/redo (200), copy/paste with Excel, fill handle, Ctrl+Enter multi-fill, sort, value filter, find and replace, column resize and auto-fit, sticky headers, row numbers, formula bar, cell formats.
- The checker (`05-engine.js`): mandatory fields, types, dates, lists with exact case and the nearest suggestion, duplicates and near-duplicates, spacing and placeholders, the site > building > floor > space chain, cross-sheet rules. Cell, sheet and workbook level display, Apply fix, Excel issues report, re-check on every edit.
- Excel import (SheetJS; sheets and columns matched by alias, unknown columns kept as custom fields) and export (ExcelJS: template layout, dropdown validations, frozen headers).
- Save to the project through `bridge.js` and `FWBOnbSave` (record `onbws`).

## Gaps found
1. No custom sheets. An imported sheet that matches no template sheet is dropped (an Info line only).
2. The header asterisk comes from the template text, not the rule: User Name, Role, Email Id, Job Plan Name, Category, store room and site columns are required but show no asterisk.
3. Name: enforced on every template sheet that has a Name column. Sheets keyed by something else (Job Plan tasks, PM Assets, Inventory, Tools) keep their own key. Custom sheets had no rule at all.
4. Large data: the checker reads at most 20,000 rows a sheet; every edit rebuilds the whole workbook and re-checks it; work is kept in localStorage (about 5 MB) and the project copy is capped at 2 MB, with a silent retry every 15 s when it is over.
5. No way to bring a customer-filled onboarding HTML file into the tool (only the Studio's own check reads it).
6. The theme follows the computer's dark setting; no import progress or loading feedback.
7. The downloaded workbook has no Instructions sheet.
8. Rule differences against the onboarding skill (`D:\facilio-impl-ai-skills\onboarding-data-converter`), see below.

## Built in this round
- Custom sheets: add, rename, duplicate, delete (with confirmation); per column name, description, type (text, number, integer, date, email, phone, yes/no, list), mandatory, dropdown values; the Facilio module the sheet maps to. A custom sheet always starts with a mandatory Name column that cannot be removed. Custom sheets are checked by the same engine (they become rule entities at start-up) and go into the downloaded workbook with headers, descriptions and dropdowns.
- Import: a sheet that matches no template or custom sheet is offered as a new custom sheet (or skipped) instead of being dropped. A customer-filled onboarding HTML file can be imported too.
- Asterisks follow the rules. Light theme by default. An import and check progress overlay.
- Check for errors: one button; a summary of records checked, valid records, records with errors, warnings and duplicates, per sheet, then the existing report with filters, jump to cell and download.
- Instructions sheet in the downloaded workbook.
- Large data: see "Large data" below.

## Large data
- Work is stored in the browser's IndexedDB when it is too large for localStorage.
- The checker reads up to 100,000 rows a sheet.
- Above 5,000 rows, checks no longer run on every edit; Check for errors runs them on demand with a progress bar.
- The project copy (2 MB) is skipped with a clear message when the work is larger, instead of retrying for ever; the browser copy and the downloaded workbook carry it.
- Limits stated, not promised away: the browser memory of the person's computer, Excel's own 1,048,576 rows a sheet, the 2 MB project copy.

## Rule differences with the skill (for a decision, not changed silently)
Verified in the skill text; the app's rules come from the Facilio Implementation Studio template and were left as they are except where noted.
- Site Type list: the app spells "Commerical"; fixed to "Commercial" (the old spelling is still accepted). The skill's generic template uses a different list (Office/Retail/Wellness/Production/Warehouse): not changed.
- Yes/No columns: the importer needs true/false (skill VR 17); the intake workbook keeps Yes/No, converted when the import files are made.
- Not changed, needs a decision: Site Full Address mandatory in the skill, optional here; No. of Buildings and No of Floors mandatory here, silent in the skill; Space Floor optional in the skill; Tenant Site, Tenant Type and phone mandatory in the skill; asset duplicate names with different serial numbers are informational in the skill; inventory Bin column.

## Also built (user, 24 Nov 2026: "make use of all module fields … custom fields in the module and entire custom module with basic system fields")
- A custom sheet can start from a Facilio module's fields: the 16 template tables and the 12 extra modules in `public/onboarding/templates.json` (Tenant Unit, Client, Client Contact, Client Portfolio, Storeroom, Item Type, Item, Tool Type, Tool, Contract, SLA Priority, Compliance). A custom module starts with Name (mandatory), Description and Site; the org's package has the final field list, so check it there.
- Custom fields on any sheet have a type, a mandatory flag and dropdown values, or link to Site, Building, Asset, Vendor, Tenant or User; they are checked like template columns (`rules.custom` in `05-engine.js`).

## Measured (local, 24 Nov 2026, Edge, 100,001 asset rows)
- Before: an import stopped at 19,999 rows without saying so (the checker read 20,000 rows a sheet); a full check took 5.7 s and every edit froze the page for about 4.8 s.
- After: all 100,001 rows imported in 8.9 s with no main-thread block over 0.35 s (read and check in `check-worker.js`); Check for errors in 2.7 s, longest block 0.15 s; an edit causes no long task; the work is kept in IndexedDB and restored on reload. The missing Name and the duplicate in the 100,001 rows were found.
- Limits: the checker reads 200,000 rows a sheet and says so when a sheet is longer; the project copy stays at 2 MB (a larger workspace stays in the browser and the downloaded workbook); Excel's own limit is 1,048,576 rows a sheet; the browser's memory sets the real ceiling on a weak laptop.

/* Per-sheet mini guides. Prose is third-person; numbered steps use imperative voice. */
var GUIDE = {
  order: ["site", "building", "floor", "space", "asset", "cat", "user", "role", "vendor", "vendorContact", "jobPlan", "task", "pm", "inventory", "tools", "tenant", "tenantContact"],
  optional: ["inventory", "tools", "tenant", "tenantContact"],
  tabs: {
    site: { label: "Site", step: 1,
      purpose: "Each row is one site: a campus, property or location that Facilio manages. Every other sheet links back to a site by its exact name.",
      before: [],
      steps: ["Enter one row per site.", "Give each site a unique name. Other sheets must reuse this name with the same capitals and spaces.", "Enter the number of buildings at the site. It must match the rows on the Building sheet.", "Add latitude and longitude as plain numbers, without the ° sign, if the site should appear on a map."],
      watch: ["Site names are matched exactly, including capitals.", "Coordinates such as 24.49003 are numbers; 24.49003° is rejected."] },
    building: { label: "Building", step: 2,
      purpose: "Each row is one building inside a site.",
      before: ["site"],
      steps: ["Enter the building name.", "Pick its site from the dropdown. The list shows the sites entered on the Site sheet.", "Enter the number of floors. It must match the rows on the Floors sheet for this building."],
      watch: ["Two buildings on the same site cannot share a name.", "A site that is not on the Site sheet cannot be used."] },
    floor: { label: "Floors", step: 3,
      purpose: "Each row is one floor inside a building. The floor level orders the floors: 0 is the ground floor, negative numbers are basements.",
      before: ["site", "building"],
      steps: ["Enter the floor name.", "Pick the site, then the building. The building list only shows buildings on the chosen site.", "Enter the floor level as a whole number."],
      watch: ["Use the same floor name everywhere it is referenced, including spacing.", "Two floors in one building cannot share a level."] },
    space: { label: "Spaces", step: 4,
      purpose: "Each row is one room or area on a floor, such as a lobby, plant room or apartment.",
      before: ["site", "building", "floor"],
      steps: ["Enter the space name.", "Pick the site, building and floor in that order.", "Enter the area as a number, without units."],
      watch: ["A space must sit on a floor listed on the Floors sheet for the same building."] },
    asset: { label: "Asset", step: 5,
      purpose: "Each row is one maintainable piece of equipment. PM schedules point to assets by their Asset Code.",
      before: ["site", "building", "floor", "space", "cat"],
      steps: ["Enter a unique asset name and a unique asset code.", "Pick the asset category from the dropdown.", "Pick the site, then the building, floor and space where the asset is located, as far as known.", "Enter installation and retire dates with the date picker."],
      watch: ["Asset names and codes must be unique.", "The retire date must be after the installation date.", "The category must come from the Asset Categories sheet."] },
    cat: { label: "Asset Categories", step: 6,
      purpose: "The list of asset categories available in the Asset sheet's dropdown. It starts with Facilio's standard categories.",
      before: [],
      steps: ["Review the list.", "Add any category the assets need that is missing.", "Remove categories that will not be used, if preferred."],
      watch: ["Assets can only use categories from this list, spelled exactly."] },
    user: { label: "Users", step: 7,
      purpose: "People who will sign in to Facilio. Each user is given a role and, optionally, the sites they can access.",
      before: ["role", "site"],
      steps: ["Enter the user's name and work email.", "Pick a role from the Roles sheet, or enter a standard Facilio role such as Admin.", "Pick the accessible sites. Leave it empty for access to all sites."],
      watch: ["Each user needs a different email address.", "Separate several sites with commas only."] },
    role: { label: "Roles", step: 8,
      purpose: "Roles define what users can do in each Facilio module.",
      before: [],
      steps: ["Enter the role name.", "For each module, pick the permissions the role should have. Several can be chosen."],
      watch: ["Permissions must be picked from the options shown for each module."] },
    vendor: { label: "Vendor", step: 9,
      purpose: "Companies that carry out maintenance work. PM schedules and work orders can be assigned to a vendor.",
      before: [],
      steps: ["Enter the vendor name.", "Enter the primary contact's name and email.", "Add the address and website if available."],
      watch: ["Vendor names must be unique.", "Emails must be complete, such as name@company.com."] },
    vendorContact: { label: "Vendor Contact", step: 10,
      purpose: "People at each vendor. One contact per vendor can be marked as primary.",
      before: ["vendor"],
      steps: ["Enter the contact's name and email.", "Pick the vendor they belong to.", "Mark Yes for the vendor's primary contact."],
      watch: ["Only one primary contact per vendor."] },
    jobPlan: { label: "Job Plans", step: 11,
      purpose: "Job plans are checklists used by PM schedules. This sheet lists each job plan and what it applies to.",
      before: [],
      steps: ["Enter one row per job plan with a unique name.", "Pick the category the plan applies to, such as Asset Category."],
      watch: ["Use the same job plan name on the Job Plan Tasks sheet and in PM Assets."] },
    task: { label: "Job Plan Tasks", step: 12,
      purpose: "The checklist steps inside each job plan, one row per step.",
      before: ["jobPlan"],
      steps: ["Pick the job plan the step belongs to.", "Write the checklist step.", "Pick the input type: Radio for a choice, Reading for a measurement, Text or Number for free entry.", "For Radio, list the options (for example Yes/No/Not Applicable). For Reading, enter the reading name. Leave Input empty for Text and Number."],
      watch: ["Radio and Reading steps need an Input.", "Text and Number steps must leave Input empty."] },
    pm: { label: "PM Assets", step: 13,
      purpose: "Planned maintenance schedules. Each row schedules one job plan on one asset at a set frequency.",
      before: ["asset", "task", "vendor", "user"],
      steps: ["Pick the asset by its Asset Code.", "Choose the start date, frequency and how often it runs (Run Every).", "Enter the time the work order should be created, for example 19:00. Several times can be separated by commas.", "Pick the job plan, and optionally the user, vendor and vendor contact."],
      watch: ["Asset Details needs the Asset Code, not the asset name.", "A quarterly job plan should not run monthly.", "The vendor contact must belong to the chosen vendor."] },
    inventory: { label: "Inventory", step: 14, optional: true,
      purpose: "Spare parts and consumables held in store rooms.",
      before: ["site", "building"],
      steps: ["Pick the site and building of the store room.", "Enter the store room, the person managing it and their email.", "Enter each item with its quantities and prices as numbers."],
      watch: ["Quantities and prices must be plain numbers, without units."] },
    tools: { label: "Tools", step: 15, optional: true,
      purpose: "Tools held in store rooms.",
      before: ["site", "building"],
      steps: ["Pick the site and building of the store room.", "Enter each tool type with its quantities."],
      watch: ["Quantities must be plain numbers, such as 1 rather than 1 set."] },
    tenant: { label: "Tenants", step: 16, optional: true,
      purpose: "Individuals or companies that occupy units.",
      before: [],
      steps: ["Enter the tenant name.", "Enter the primary contact's name and email."],
      watch: ["Tenant names must be unique."] },
    tenantContact: { label: "Tenant Contact", step: 17, optional: true,
      purpose: "People at each tenant. One contact per tenant can be primary.",
      before: ["tenant"],
      steps: ["Enter the contact's name and email.", "Pick the tenant.", "Mark Yes for the primary contact."],
      watch: ["Only one primary contact per tenant."] }
  },
  walkthrough: [
    { title: "Facilio onboarding workspace", body: "This workspace collects the data Facilio needs to set up an account: sites, buildings, assets, users, vendors and maintenance plans. It works like a spreadsheet, checks the data while it is typed, and produces the Facilio onboarding workbook.", art: "grid" },
    { title: "Each tab is a template sheet", body: "The tabs at the bottom are the sheets of the Facilio onboarding template, in the same order, with the same headings and row numbers. The grey row under each heading repeats the template's own guidance for that column.", art: "tabs" },
    { title: "Fill the sheets from left to right", body: "Later sheets pick values from earlier ones: buildings belong to sites, assets sit on floors and spaces, and PM schedules point to assets and job plans. Filling from left to right keeps every dropdown populated.", art: "flow" },
    { title: "Dropdowns and pasting", body: "Cells marked ▾ offer a list, and linked lists only show what earlier sheets contain. Rows can also be copied from Excel or Google Sheets and pasted into the first cell of a data row.", art: "paste" },
    { title: "Names must match exactly", body: "Facilio links records by name, character for character. A building entered as 'ApeX Apartments' must be referenced as 'ApeX Apartments' everywhere, not 'apex Apartments'. Picking from the dropdowns avoids these mismatches.", art: "match" },
    { title: "Checks run while typing", body: "A red corner marks a value that would stop the import; an amber corner marks something to review. Selecting the cell shows what is wrong and how to fix it. Each sheet also has a guided tour under Walkthrough.", art: "marks" },
    { title: "Import sheets fill themselves", body: "The last three tabs, Job Plan Import, Trigger Schedule Import and PPM V3 Import, are Facilio's import files. They build themselves from PM Assets, Job Plan and Asset as data is entered, and are checked against Facilio's import rules. They are read-only: Go to source jumps to the value to change.", art: "auto" },
    { title: "Download and send", body: "Data is saved in this browser only. Download the workbook regularly and send the final file to the Facilio onboarding contact. An existing filled workbook can also be imported here to check and correct it.", art: "send" }
  ]
};

/* Guides keyed by the template's own sheet names */
GUIDE.optionalSheets = ["Inventory", "Tenants", "Tenant Contact"];
(function () {
  var t = GUIDE.tabs, S = {};
  function from(k, extra) { var g = t[k]; return Object.assign({ label: g.label, purpose: g.purpose, steps: g.steps.slice(), watch: g.watch.slice(), before: [] }, extra || {}); }
  S["Overview"] = { purpose: "The template overview. It lists each Facilio module covered by this workbook and the information each one needs.", before: [],
    steps: ["Read the module list.", "Open each sheet from the tabs below, left to right.", "Use the guide panel on each sheet for what to fill."],
    watch: ["This sheet is for reference only; nothing needs to be entered here."] };
  S["Site"] = from("site"); S["Building"] = from("building", { before: ["Site"] }); S["Floors"] = from("floor", { before: ["Site", "Building"] });
  S["Spaces"] = from("space", { before: ["Site", "Building", "Floors"] });
  S["Asset"] = from("asset", { before: ["Site", "Building", "Floors", "Spaces", "Asset Category Master"] });
  S["Roles & Users"] = { purpose: "Two tables on one sheet. The top table lists the people who will sign in to Facilio. The Role table further down defines what each role can do in each module.", before: ["Site"],
    steps: ["In the top table, enter each user's name, role and work email.", "Pick the sites each user can access. Leave it empty for access to all sites.", "In the Role table, enter each role name.", "For each module, pick the role's permissions. Several can be chosen."],
    watch: t.user.watch.concat(t.role.watch).concat(["Delete the template's example rows that start with 'eg,' or 'ex.,'."]) };
  S["Vendor"] = from("vendor"); S["Vendor Contact"] = from("vendorContact", { before: ["Vendor"] });
  S["Job Plan"] = { purpose: "Two tables on one sheet. The top table lists each job plan and what it applies to; column D lists the allowed Scope Category values. The lower table holds the checklist tasks of each job plan, one row per step.", before: [],
    steps: ["In the top table, enter one row per job plan with a unique name.", "Pick its category from the Scope Category list.", "In the task table, pick the job plan each step belongs to and write the step.", "Pick the input type: Radio for a choice, Reading for a measurement, Text or Number for free entry.", "For Radio, list the options (for example Yes/No/Not Applicable). For Reading, enter the reading name. Leave Input empty for Text and Number."],
    watch: t.task.watch.concat(t.jobPlan.watch) };
  S["PM Assets"] = from("pm", { before: ["Asset", "Job Plan", "Vendor", "Roles & Users"] });
  S["Inventory"] = { purpose: "Two tables on one sheet: ITEMS for spare parts and consumables, and TOOLS further down for tools held in store rooms.", before: ["Site", "Building"],
    steps: ["Pick the site and building of each store room.", "Enter the store room, the person managing it and their email.", "In ITEMS, enter each item with its category, unit, prices and quantities.", "In TOOLS, enter each tool type with its quantities."],
    watch: t.inventory.watch.concat(t.tools.watch) };
  S["Tenants"] = from("tenant"); S["Tenant Contact"] = from("tenantContact", { before: ["Tenants"] });
  S["Asset Category Master"] = from("cat");
  S["Job Plan Import"] = { purpose: "Facilio's Job Plan import, built automatically from the Job Plan sheet. One row per checklist task.", before: ["Job Plan"], steps: ["Fill the Job Plan sheet: the job plans at the top and their tasks below.", "This sheet updates itself; nothing is typed here.", "Fix any issue at its source with Go to source."], watch: ["Task Scope and Section scope are always Selected Resources.", "Radio tasks need their options in the Input column of the Job Plan sheet."] };
  S["Trigger Schedule Import"] = { purpose: "Facilio's PPM V3 Trigger Schedule import, built from the frequency, start date, Run Every and time on PM Assets. One row per distinct schedule.", before: ["PM Assets"], steps: ["Fill Frequency, Execution Start Date, Run Every and Execution Time on PM Assets.", "The day of the start date sets the day of each cycle; for quarterly and half-yearly schedules its month sets the cycle.", "Schedules that come out the same are shared by several PMs."], watch: ["Quarterly and half-yearly Month Value is the first month of the cycle.", "Annual schedules put the month in Values and the day in Yearly Day Value."] };
  S["PPM V3 Import"] = { purpose: "Facilio's PPM V3 import, built from PM Assets and the Asset sheet. One row per PM Assets row, linked to its job plan and trigger schedule.", before: ["Asset", "Job Plan", "PM Assets"], steps: ["Fill PM Assets with the asset code, job plan and schedule.", "Site, building, floor and space come from the asset's row on the Asset sheet.", "Values the template doesn't collect (Created By, Priority…) come from the import settings below."], watch: ["Each PPM's Trigger Schedule and Custom Frequency must match the Trigger Schedule Import sheet.", "Every job plan used here must exist on Job Plan Import."] };
  GUIDE.sheets = S;
})();

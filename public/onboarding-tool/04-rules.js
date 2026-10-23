/* ===================================================================
   RULES: what gets checked. Edit and republish; the link stays the same.
   Built from the Facilio onboarding template (Site → PM Assets fixed;
   Inventory, Tenants, Tenant Contact optional per client scope).
   =================================================================== */
var RULES = {
  version: "1.3 (strict spacing and capitals, as the Facilio data loader)",
  ignoreSheets: ["Overview", "Cycles", "Asset Category Master", "Job Plan Import", "Trigger Schedule Import", "PPM V3 Import"],
  lists: {
    siteType: ["Commerical", "Offices", "Residential", "Hospital", "Universities", "Others"],
    frequency: ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "HALF_YEARLY", "ANNUALLY"],
    inputType: ["Radio", "Reading", "Text", "Number"],
    scopeCategory: ["Asset Category", "Space Category", "Spaces", "Assets", "Buildings", "Floors"],
    yesNo: ["Yes", "No"],
    skipCycle: ["second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"]
  },
  /* lists read from a sheet in the customer's workbook (authoritative) */
  sheetLists: {
    assetCategory: { sheet: ["Asset Category Master"], label: "Asset Category Master sheet" }
  },
  permissions: {
    portfolio: ["Create", "Read", "Update", "Delete"],
    workOrder: ["Create", "View", "Update", "Update Task", "Close Work Order", "Delete", "Export"],
    pm: ["Create", "Read", "Update", "Delete", "Export"],
    crud: ["Create", "Read", "Update", "Delete"],
    dashboard: ["Create", "Edit", "View"],
    report: ["View", "Create/Edit", "Create", "Edit"]
  },
  entities: [
    { key: "site", label: "Site", sheet: ["Site", "Sites"], core: true, minRows: 1,
      columns: {
        name:      { h: ["Site Name"], req: true },
        area:      { h: ["Total Built Area"], type: "number", min: 0 },
        type:      { h: ["Site Type"], list: "siteType" },
        buildings: { h: ["No. Of Buildings", "No of Buildings", "Number of Buildings"], req: true, type: "integer", min: 0 },
        managedBy: { h: ["Site Managed By"] },
        address:   { h: ["Address"], long: true },
        lat:       { h: ["Latitude"], type: "lat" },
        lng:       { h: ["Longitude"], type: "lng" }
      },
      unique: [{ cols: ["name"], sev: "Critical" }], near: [{ col: "name", scope: [] }] },

    { key: "building", label: "Building", sheet: ["Building", "Buildings"], core: true,
      columns: {
        name:      { h: ["Building Name"], req: true },
        site:      { h: ["Site", "Site Name"], req: true },
        sqft:      { h: ["Total Square Footage"], type: "number", min: 0 },
        occupancy: { h: ["Occupancy"], type: "integer", min: 0 },
        floors:    { h: ["No of Floors", "No. Of Floors", "Number of Floors"], req: true, type: "integer", min: 0 },
        engineer:  { h: ["Engineer"] }
      },
      location: { site: "site" },
      unique: [{ cols: ["site", "name"], sev: "Critical" }], near: [{ col: "name", scope: ["site"] }] },

    { key: "floor", label: "Floors", sheet: ["Floors", "Floor"], core: true,
      columns: {
        name:     { h: ["Floor Name"], req: true },
        site:     { h: ["Site", "Site Name"], req: true },
        building: { h: ["Building", "Building Name"], req: true },
        level:    { h: ["Floor Level"], req: true, type: "integer", allowNegative: true }
      },
      location: { site: "site", building: "building" },
      unique: [{ cols: ["site", "building", "name"], sev: "Critical" }, { cols: ["site", "building", "level"], sev: "Warning", msg: "Two floors in this building have the same floor level" }],
      near: [{ col: "name", scope: ["site", "building"] }] },

    { key: "space", label: "Spaces", sheet: ["Spaces", "Space"], core: true,
      columns: {
        name:     { h: ["Space Name"], req: true },
        site:     { h: ["Site", "Site Name"], req: true },
        building: { h: ["Building", "Building Name"], req: true },
        floor:    { h: ["Floor", "Floor Name"], req: true },
        area:     { h: ["Area"], type: "number", min: 0 }
      },
      location: { site: "site", building: "building", floor: "floor" },
      unique: [{ cols: ["site", "building", "floor", "name"], sev: "Critical" }],
      near: [{ col: "name", scope: ["site", "building", "floor"] }] },

    { key: "asset", label: "Asset", sheet: ["Asset", "Assets"], core: true,
      columns: {
        name:        { h: ["Asset Name"], req: true },
        code:        { h: ["Asset Code"] },
        description: { h: ["Asset Description"], long: true },
        category:    { h: ["Asset Category"], req: true, sheetList: "assetCategory" },
        department:  { h: ["Asset Department"] },
        space:       { h: ["Space"] },
        floor:       { h: ["Floor"] },
        building:    { h: ["Building"] },
        site:        { h: ["Site"], req: true },
        installDate: { h: ["Instalation Date", "Installation Date"], type: "date" },
        retireDate:  { h: ["Retire Date"], type: "date" },
        unitPrice:   { h: ["Unit Price"], type: "number", min: 0 },
        manufacturer:{ h: ["Manufacturer"] },
        brand:       { h: ["Brand"] },
        model:       { h: ["Model"] },
        supplier:    { h: ["Supplier Name"] }
      },
      location: { site: "site", building: "building", floor: "floor", space: "space" },
      unique: [{ cols: ["name"], sev: "Critical", msg: "Asset names must be unique" }, { cols: ["code"], sev: "Critical", msg: "Asset codes must be unique" }],
      near: [{ col: "code", scope: [] }] },

    { key: "user", label: "Users", sheet: ["Roles & Users", "Roles and Users", "Users"], core: true,
      columns: {
        name:  { h: ["User Name"], req: true },
        role:  { h: ["Role"], req: true },
        email: { h: ["Email Id", "Email"], req: true, type: "email" },
        sites: { h: ["Accessible Sites"], multi: true }
      },
      unique: [{ cols: ["email"], sev: "Critical", msg: "Each user needs a different email" }, { cols: ["name"], sev: "Warning", msg: "Two users have the same name" }] },

    { key: "role", label: "Roles", sheet: ["Roles & Users", "Roles and Users", "Roles"], core: true,
      columns: {
        name:      { h: ["Role"], req: true },
        portfolio: { h: ["Portfolio Module"], perm: "portfolio" },
        workOrder: { h: ["Work Order Module"], perm: "workOrder" },
        pm:        { h: ["Planned Maintenance"], perm: "pm" },
        asset:     { h: ["Asset Management"], perm: "crud" },
        tenant:    { h: ["Tenant Module"], perm: "crud" },
        vendor:    { h: ["Vendor Module"], perm: "crud" },
        dashboard: { h: ["Dashboard"], perm: "dashboard" },
        report:    { h: ["Report"], perm: "report" }
      },
      unique: [{ cols: ["name"], sev: "Critical" }] },

    { key: "vendor", label: "Vendor", sheet: ["Vendor", "Vendors"], core: true,
      columns: {
        name:         { h: ["Name", "Vendor Name"], req: true },
        description:  { h: ["Description"], long: true },
        website:      { h: ["Website"] },
        contactName:  { h: ["Primary Contact Name"], req: true },
        contactEmail: { h: ["Primary Contact Email"], req: true, type: "email" },
        contactPhone: { h: ["Primary Contact Phone"], type: "phone" },
        street:       { h: ["Street"] },
        city:         { h: ["City/District", "City"] },
        state:        { h: ["State/Province/Country", "State"] },
        zip:          { h: ["Zipcode", "Zip Code"] }
      },
      unique: [{ cols: ["name"], sev: "Critical" }], near: [{ col: "name", scope: [] }] },

    { key: "vendorContact", label: "Vendor Contact", sheet: ["Vendor Contact", "Vendor Contacts"], core: true,
      columns: {
        name:    { h: ["Name"], req: true },
        email:   { h: ["Email"], req: true, type: "email" },
        phone:   { h: ["Phone"], type: "phone" },
        vendor:  { h: ["Vendor"], req: true, ref: "vendor.name" },
        primary: { h: ["Is Primary Contact?", "Is Primary Contact"], type: "bool" }
      },
      unique: [{ cols: ["email"], sev: "Warning", msg: "Two vendor contacts share this email" }] },

    { key: "jobPlan", label: "Job Plans", sheet: ["Job Plan", "Job Plans"], core: true,
      columns: {
        name:     { h: ["Name"], req: true },
        category: { h: ["Category"], req: true, list: "scopeCategory" }
      },
      unique: [{ cols: ["name"], sev: "Critical", msg: "Job plan names must be unique" }] },

    { key: "task", label: "Job Plan tasks", sheet: ["Job Plan", "Job Plans"], core: true,
      columns: {
        plan:      { h: ["Job Plan Name /Unique Job Plan ID", "Job Plan Name", "Job Plan ID"], req: true },
        checklist: { h: ["Checklist"], req: true, long: true },
        inputType: { h: ["Input Type"], req: true, list: "inputType" },
        input:     { h: ["Input"] }
      } },

    { key: "pm", label: "PM Assets", sheet: ["PM Assets", "PM Asset", "PPM", "PPM Assets"], core: true,
      activeIgnore: ["vendor", "runEvery", "vendorContact", "assignedTo"],
      columns: {
        asset:         { h: ["Asset Details"], req: true },
        startDate:     { h: ["Execution Start Date"], req: true, type: "date" },
        frequency:     { h: ["Frequency"], req: true, list: "frequency" },
        runEvery:      { h: ["Run Every"], req: true, type: "integer", min: 1, max: 60 },
        execTime:      { h: ["Excecution Time", "Execution Time"], req: true, type: "time" },
        skip:          { h: ["Skip Every"], multi: true, list: "skipCycle" },
        jobPlan:       { h: ["Job Plan"], req: true, ref: "task.plan" },
        assignedTo:    { h: ["Assigned To", "Assigned To User"], ref: "user.name" },
        vendor:        { h: ["Vendor"], ref: "vendor.name" },
        vendorContact: { h: ["Vendo Contact", "Vendor Contact"] }
      },
      unique: [{ cols: ["asset", "jobPlan", "frequency"], sev: "Warning", msg: "The same asset, job plan and frequency appear twice; this would create duplicate PMs" }] },

    { key: "inventory", label: "Inventory", sheet: ["Inventory", "Items"], core: false,
      activeIgnore: ["qty", "minQty"],
      columns: {
        site:         { h: ["Location - Site", "Location Site"], req: true },
        code:         { h: ["Location-Code", "Location Code"] },
        building:     { h: ["Location - Building", "Location Building"] },
        storeRoom:    { h: ["Store Room Name"], req: true },
        managedBy:    { h: ["Store Room - Managed By", "Store Room Managed By"] },
        managedEmail: { h: ["Managed by - Mail id", "Managed by Mail id"], type: "email" },
        item:         { h: ["Item"], req: true },
        itemCategory: { h: ["Item Category"] },
        uom:          { h: ["Unit of Measure"] },
        buyPrice:     { h: ["Buying Price"], type: "number", min: 0 },
        sellPrice:    { h: ["Selling Price"], type: "number", min: 0 },
        qty:          { h: ["Current Quantity"], type: "number", min: 0 },
        minQty:       { h: ["Minimum Quantity"], type: "number", min: 0 }
      },
      location: { site: "site", building: "building" },
      unique: [{ cols: ["storeRoom", "item"], sev: "Warning", msg: "This item is listed twice for the same store room" }] },

    { key: "tools", label: "Tools", sheet: ["Inventory", "Tools"], core: false,
      activeIgnore: ["qty", "minQty"],
      columns: {
        site:         { h: ["Location - Site", "Location Site"], req: true },
        code:         { h: ["Location-Code", "Location Code"] },
        building:     { h: ["Location - Building", "Location Building"] },
        storeRoom:    { h: ["Store Room Name"], req: true },
        managedBy:    { h: ["Store Room - Managed By", "Store Room Managed By"] },
        managedEmail: { h: ["Managed by - Mail id", "Managed by Mail id"], type: "email" },
        toolType:     { h: ["Tool Type"], req: true },
        uom:          { h: ["Unit of Measure"] },
        buyPrice:     { h: ["Buying Price"], type: "number", min: 0 },
        sellPrice:    { h: ["Selling Price"], type: "number", min: 0 },
        qty:          { h: ["Current Quantity"], type: "number", min: 0 },
        minQty:       { h: ["Minimum Quantity"], type: "number", min: 0 }
      },
      location: { site: "site", building: "building" },
      unique: [{ cols: ["storeRoom", "toolType"], sev: "Warning", msg: "This tool is listed twice for the same store room" }] },

    { key: "tenant", label: "Tenants", sheet: ["Tenants", "Tenant"], core: false,
      columns: {
        name:         { h: ["Name", "Tenant Name"], req: true },
        description:  { h: ["Description"], long: true },
        website:      { h: ["Website"] },
        contactName:  { h: ["Primary Contact Name"], req: true },
        contactEmail: { h: ["Primary Contact Email"], req: true, type: "email" },
        contactPhone: { h: ["Primary Contact Phone"], type: "phone" },
        street:       { h: ["Street"] },
        city:         { h: ["City/District", "City"] },
        state:        { h: ["State/Province/Country", "State"] },
        zip:          { h: ["Zipcode", "Zip Code"] }
      },
      unique: [{ cols: ["name"], sev: "Critical" }] },

    { key: "tenantContact", label: "Tenant Contact", sheet: ["Tenant Contact", "Tenant Contacts"], core: false,
      columns: {
        name:    { h: ["Name"], req: true },
        email:   { h: ["Email"], type: "email" },
        phone:   { h: ["Phone"], type: "phone" },
        tenant:  { h: ["Tenant"], req: true, ref: "tenant.name" },
        primary: { h: ["Is Primary Contact?", "Is Primary Contact"], type: "bool" }
      } }
  ]
};

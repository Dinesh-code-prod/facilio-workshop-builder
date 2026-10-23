/* What each column holds, with a realistic example. Format rules are added automatically from RULES. */
var COLDOC = {
  site: {
    name: ["The site's name as it should appear in Facilio. Every other sheet refers to the site by this exact name.", "ABC Site"],
    area: ["Total built-up area of the whole site.", "125000"],
    type: ["The kind of property the site is.", "Residential"],
    buildings: ["How many buildings the site has. It must equal the number of rows for this site on the Building sheet.", "2"],
    managedBy: ["The person responsible for the site.", "John Mathew"],
    address: ["The site's full postal address.", "Yas Island, Abu Dhabi, UAE"],
    lat: ["Latitude, used to pin the site on a map.", "24.49003"],
    lng: ["Longitude, used to pin the site on a map.", "54.60750"]
  },
  building: {
    name: ["The building's name. Two buildings on the same site cannot share a name.", "Tower A"],
    site: ["The site the building belongs to.", "ABC Site"],
    sqft: ["Total floor area of the building.", "45000"],
    occupancy: ["Number of occupants currently in the building.", "350"],
    floors: ["How many floors the building has. It must equal the number of rows for this building on the Floors sheet.", "3"],
    engineer: ["The engineer responsible for the building.", "Ravi Kumar"]
  },
  floor: {
    name: ["The floor's name. Two floors in the same building cannot share a name.", "Ground Floor"],
    site: ["The site of the building.", "ABC Site"],
    building: ["The building the floor is in.", "Tower A"],
    level: ["The floor's position: 0 for the ground floor, 1, 2 and so on above it, and -1, -2 for basements.", "0"]
  },
  space: {
    name: ["The name of the room or area.", "Main Lobby"],
    site: ["The site of the space.", "ABC Site"],
    building: ["The building of the space.", "Tower A"],
    floor: ["The floor the space is on.", "Ground Floor"],
    area: ["Floor area of the space.", "220"]
  },
  asset: {
    name: ["The equipment's name. Each asset name must be unique.", "AHU 01 - Tower A"],
    code: ["A unique code for the asset. PM Assets refers to assets by this code.", "ABC-TA-AHU-01"],
    description: ["A short description of the asset.", "Air handling unit serving the lobby"],
    category: ["The type of equipment.", "AHU"],
    department: ["The team or service that maintains the asset.", "MEP"],
    space: ["The space where the asset is installed, if known.", "Plant Room"],
    floor: ["The floor where the asset is installed, if known.", "Ground Floor"],
    building: ["The building where the asset is installed, if known.", "Tower A"],
    site: ["The site where the asset is installed.", "ABC Site"],
    installDate: ["The date the asset was installed.", "15/03/2022"],
    retireDate: ["The planned decommissioning date. It must be after the installation date.", "15/03/2037"],
    unitPrice: ["The purchase price of one unit.", "18500"],
    manufacturer: ["The company that made the asset.", "Carrier"],
    brand: ["The brand name.", "Carrier"],
    model: ["The model name or number.", "39HQ"],
    supplier: ["The company that supplied the asset.", "Al Futtaim Engineering"]
  },
  user: {
    name: ["The person's full name.", "Priya Nair"],
    role: ["A role from the Role table on this sheet, or a standard Facilio role such as Admin.", "Maintenance User"],
    email: ["The work email the person signs in with. Each user needs a different email.", "priya.nair@company.com"],
    sites: ["The sites the user can access. An empty cell gives access to all sites.", "ABC Site, PQR Site"]
  },
  role: {
    name: ["The role's name. Users on this sheet refer to it.", "Maintenance User"],
    portfolio: ["What the role can do with sites, buildings, floors and spaces.", "Read, Update"],
    workOrder: ["What the role can do with work orders.", "Create, View, Update, Close Work Order"],
    pm: ["What the role can do with planned maintenance.", "Create, Read, Update"],
    asset: ["What the role can do with assets.", "Create, Read, Update"],
    tenant: ["What the role can do with tenants.", "Read"],
    vendor: ["What the role can do with vendors.", "Read"],
    dashboard: ["Dashboard access.", "View"],
    report: ["Report access.", "View"]
  },
  vendor: {
    name: ["The vendor's company name. Each vendor name must be unique.", "Cool Air Services LLC"],
    description: ["What the vendor does.", "HVAC maintenance contractor"],
    website: ["The vendor's website.", "https://coolair.example"],
    contactName: ["The vendor's main contact person.", "Ahmed Khan"],
    contactEmail: ["The main contact's email address.", "ahmed@coolair.example"],
    contactPhone: ["The main contact's phone number.", "+971 50 123 4567"],
    street: ["Street address.", "Street 12, Mussafah"],
    city: ["City or district.", "Abu Dhabi"],
    state: ["State, province or country.", "UAE"],
    zip: ["Postal code.", "00000"]
  },
  vendorContact: {
    name: ["The contact person's name.", "Ahmed Khan"],
    email: ["The contact's email address.", "ahmed@coolair.example"],
    phone: ["The contact's phone number.", "+971 50 123 4567"],
    vendor: ["The vendor the person works for.", "Cool Air Services LLC"],
    primary: ["Yes for the vendor's main contact, No for others. Only one contact per vendor can be Yes.", "Yes"]
  },
  jobPlan: {
    name: ["The job plan's name. Tasks and PM Assets rows use this exact name.", "AHU - Monthly JP"],
    category: ["What the job plan applies to, from the Scope Category list in column D.", "Asset Category"]
  },
  task: {
    plan: ["The job plan this checklist step belongs to.", "AHU - Monthly JP"],
    checklist: ["The instruction the technician follows.", "Clean the filters and check them for damage."],
    inputType: ["How the technician answers the step.", "Radio"],
    input: ["For Radio, the answer options. For Reading, the reading's name. Empty for Text and Number.", "Yes/No/Not Applicable"]
  },
  pm: {
    asset: ["The Asset Code of the asset to maintain, from the Asset sheet.", "ABC-TA-AHU-01"],
    startDate: ["The date the first work order is due.", "01/11/2026"],
    frequency: ["How often the maintenance repeats.", "MONTHLY"],
    runEvery: ["Repeat every N periods. With MONTHLY, 1 means every month and 3 means every third month.", "1"],
    execTime: ["The time of day the work order is created.", "19:00"],
    skip: ["Cycles to skip, if any.", "second"],
    jobPlan: ["The job plan holding the checklist for this maintenance.", "AHU - Monthly JP"],
    assignedTo: ["The user responsible for the work, from Roles & Users.", "Priya Nair"],
    vendor: ["The vendor doing the work, if outsourced.", "Cool Air Services LLC"],
    vendorContact: ["The contact at that vendor.", "Ahmed Khan"]
  },
  inventory: {
    site: ["The site of the store room.", "ABC Site"],
    code: ["A short code for the store location.", "ABC-ST1"],
    building: ["The building of the store room.", "Tower A"],
    storeRoom: ["The store room's name.", "Main Store"],
    managedBy: ["The person managing the store room.", "Joseph Paul"],
    managedEmail: ["That person's email address.", "joseph.paul@company.com"],
    item: ["The item's name.", "Air Filter 24x24"],
    itemCategory: ["The item's category.", "Filters"],
    uom: ["The unit the item is counted in.", "Each"],
    buyPrice: ["Purchase price of one unit.", "45"],
    sellPrice: ["Selling price of one unit.", "60"],
    qty: ["Quantity in stock now.", "120"],
    minQty: ["The stock level that triggers a reorder.", "20"]
  },
  tools: {
    site: ["The site of the store room.", "ABC Site"],
    code: ["A short code for the store location.", "ABC-ST1"],
    building: ["The building of the store room.", "Tower A"],
    storeRoom: ["The store room's name.", "Main Store"],
    managedBy: ["The person managing the store room.", "Joseph Paul"],
    managedEmail: ["That person's email address.", "joseph.paul@company.com"],
    toolType: ["The tool's name or type.", "Cordless Drill 18V"],
    uom: ["The unit the tool is counted in.", "Each"],
    buyPrice: ["Purchase price of one unit.", "350"],
    sellPrice: ["Selling price of one unit.", "0"],
    qty: ["Quantity in stock now.", "4"],
    minQty: ["The stock level that triggers a reorder.", "1"]
  },
  tenant: {
    name: ["The tenant's name. Each tenant name must be unique.", "Bright Retail LLC"],
    description: ["A short description of the tenant.", "Retail unit, ground floor"],
    website: ["The tenant's website.", "https://brightretail.example"],
    contactName: ["The tenant's main contact person.", "Sara Ali"],
    contactEmail: ["The main contact's email address.", "sara@brightretail.example"],
    contactPhone: ["The main contact's phone number.", "+971 55 765 4321"],
    street: ["Street address.", "Unit G-04, Yas Mall"],
    city: ["City or district.", "Abu Dhabi"],
    state: ["State, province or country.", "UAE"],
    zip: ["Postal code.", "00000"]
  },
  tenantContact: {
    name: ["The contact person's name.", "Sara Ali"],
    email: ["The contact's email address.", "sara@brightretail.example"],
    phone: ["The contact's phone number.", "+971 55 765 4321"],
    tenant: ["The tenant the person belongs to.", "Bright Retail LLC"],
    primary: ["Yes for the tenant's main contact, No for others. Only one contact per tenant can be Yes.", "Yes"]
  },
  cat: { _: ["One asset category per row. The Asset sheet's Asset Category column offers this list.", "Chiller"] }
};

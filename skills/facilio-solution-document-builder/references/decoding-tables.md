# Decoding Tables

Use these to turn raw package values into plain business language. Values marked "verified" were checked
against the Facilio platform source code (via Kenny Code Assist). If a value is not listed here, look it up
with Kenny (`code_search` for the enum) before writing it into the document. Never guess.

## 1. Criteria operators (verified)
Criteria appear as `<Pattern>` + `<Condition>` blocks (field, operator ID, value). The extractor writes them as
`pattern :: 1: field op value; 2: ...`. Pattern `(1 and 2) or 3` gives the AND/OR logic.

| ID | Meaning | ID | Meaning |
|---|---|---|---|
| 1 | is empty | 2 | is not empty |
| 3 | is (text) | 4 | isn't (text) |
| 5 | contains | 6 | doesn't contain |
| 7 | starts with | 8 | ends with |
| 9 | = | 10 | != |
| 11 | < | 12 | <= |
| 13 | > | 14 | >= |
| 15 | is (boolean: true / false) | 16 / 17 | is / isn't |
| 18 | is before | 19 | is after |
| 20 | between | 21 | not between |
| 22 | today | 35 | lookup (sub-criteria) |
| 36 | is (picklist / lookup ID) | 37 | isn't (picklist / lookup ID) |
| 38 | building is | 52 / 53 | value is / value isn't |
| 54 | is (enum / system picklist) | 55 | isn't (enum / system picklist) |
| 72 | till now | 73 | upcoming |
| 74 / 75 | = / != (current user, role, etc.) | 87 | role is |
| 88 | related | 92 | not related |
| 93 / 94 | is / isn't | 105 | contains |
| 106 | before N days | 107 | after N days |
| 109 | contains relation | | |

Picklist and lookup values are IDs. Resolve them: status IDs → TICKET_STATUS display names, picklist IDs →
the field's `Enum_Values` / options in fields.json, lookup IDs → the record name in the related module (ask
or mark `[To be confirmed]` when the record is not in the package).

## 2. State transition types (verified)
| Type | Meaning | How to write it |
|---|---|---|
| 1 | Normal / user action | A button the user clicks. "Performed By" = the roles / users / field-based permission |
| 2 | Scheduled | Runs after a fixed interval. Read `Interval` (seconds) → convert to hours/days |
| 3 | Automatic (condition) | Runs by itself when its criteria match. Write "Automatic, when ..." |
| 4 | Scheduled on a date field | Runs N seconds before/after a date field (`Date_Field_Name`) value. E.g. interval 259200 after "Actual Work End" = 3 days after work end |

Interval conversions: 3600 = 1 hour, 86400 = 1 day, 259200 = 3 days, 604800 = 7 days.

## 3. Field types (verified, FieldType enum)
| ID | Write as | ID | Write as |
|---|---|---|---|
| 1 | Single Line Text | 14 | Multi Picklist |
| 2 | Number | 16 | Line Items |
| 3 | Decimal | 17 | Rich Text |
| 4 | Boolean (Yes/No) | 18 | Multi Line Text |
| 5 | Date | 19 | Picklist (system) |
| 6 | Date Time | 20 | URL |
| 7 | Lookup (name the related module) | 21 | Currency |
| 8 | Picklist (list the values) | 22 | Multi Currency |
| 9 | File / Attachment | 23 | Inspection Trigger |
| 10 | Counter | 24 | Auto Number |
| 11 | Identifier | 25 | Lookup (setup data) |
| 12 | Picklist (system) | 26 | Sharing |
| 13 | Multi Lookup | 27 | Lookup (extended) |

`Is_Default = true` → System field; otherwise Custom. Custom field API names usually end in `_1`, `_2` or
start with `custom`. Never print API names in the document.

## 4. Form rule actions (verified, FormActionType enum)
| ID | Action | ID | Action |
|---|---|---|---|
| 1 | Show field | 7 | Allow create (lookup) |
| 2 | Hide field | 8 | Execute script |
| 3 | Enable field | 9 | Show section |
| 4 | Disable field (read-only) | 10 | Hide section |
| 5 | Set value | 11 | Set mandatory |
| 6 | Apply filter (limit lookup choices) | 12 | Remove mandatory |

Trigger types: FORM_ON_LOAD (when the form opens), FIELD_UPDATE (when a trigger field changes), FORM_SUBMIT
(on save). Execute type: CREATE, EDIT, CREATE_AND_EDIT.

## 5. Role permissions (verified, NewPermissionFactory)
Permission values in ROLE XML are bit sums. Decode each value by subtracting the largest bit that fits.

**Module_Permission (most modules)**: Create 1, Import 2, Read 4, Update 8, Delete 16, Export 32.
Example: 61 = 32+16+8+4+1 = Create, Read, Update, Delete, Export (no Import). 4 = Read only.

**Workorder_Permission (work orders)**: Create 1; Read Team 2 / Read Own 4 / Read All 8 (choose one);
Update Team 16 / Update Own 32 / Update All 64 (choose one); Change Ownership 128; Close Work Order 256;
Add/Update/Delete Task 512; Delete Team 1024 / Delete Own 2048 / Delete All 4096; Import 8192; Export 16384.

**Inventory_Permission**: Create 1; Read Own 2 / Read All 4; Update Own 8 / Update All 16; Delete Own 32 /
Delete All 64; Import 128; Export 256.

**Dashboard_Permission**: Create 1, View 2, Edit 4, Delete 8, Share 16.

**Analytics_Permission (reports / analytics tabs)**: Save As Report 1, View 2.

**Other small enums**: Approval tab: Can Approve 1. Planner/Calendar tabs: Calendar 1, Planner 2.
Some setup-type tabs: View 1, Create/Edit 2, Export 4. Some tabs: Create 1, Read 2, Update 4, Delete 8.
If a tab's type is unclear, check its TabType in webtabs.json and confirm the enum with Kenny.

Write the matrix with words or ticks (C / R / U / D / E / I), never raw numbers. Roles with
`Is_Privileged_Role` / super admin have full access; say so instead of listing every tab.

## 6. Workflow rule and notification events (Activity_Type)
| Value | Write as |
|---|---|
| CREATE | When a record is created |
| EDIT | When a record is updated |
| CREATE_OR_EDIT | When a record is created or updated |
| FIELD_CHANGE | When a specific field changes (name the field from the rule) |
| STATE_TRANSITION / STATE_FLOW | When the record moves between statuses |
| SCHEDULED / DATE_FIELD | On a schedule, or N days before/after a date field |
| APPROVAL / APPROVED / REJECTED | When an approval is requested or decided |
| DELETE | When a record is deleted |
| SLA / CUSTOM | SLA-driven or custom trigger (read the rule) |
If a value is not in this list, read the rule's XML and describe the trigger as configured.

## 7. Approver / "Performed By" lists (ApproverList / SharingContext)
The extractor writes them as `ROLE:<name>`, `USER:<email>`, `FIELD:<field>`, `TEAM:<name>`, `APPROVER_FIELD`.
- ROLE → the role display name.
- USER → the person's role or job title, not the email address (ask if unknown; never print emails).
- FIELD → "the user selected in the <Field display name> field" (field-based permission, e.g. the assigned
  technician or the requester).
- Empty list → anyone with update access to the module can perform it.

## 8. Other values
- Status values in XML are `ADDED` / `UPDATED` plus an enabled flag `true` / `false`. Enabled = false means the
  item is switched off. Never describe it as live.
- Custom module names end in `__c` / `__C` or start with `custom_`.
- `ShowIn<Vendor|Tenant|Client|Occupant>Portal = true` → the action is also available in that portal.
- `ShouldExecuteFromPermalink = true` → the action can be done from the email link without logging in.
- `Comment_Required = true` → the user must enter a comment.
- `FormName` on a transition → the user fills a form with the listed fields before the status changes.

# Document Templates

Two scaffolds: User Guide (UG) and Admin Guide (AG).

Use these as the assembly structure. Every section marked **[Always]** must appear. Sections marked **[If applicable]** are included only when the feature has relevant content for that section.

---

## Template 1 — User Guide (UG)

```markdown
# [Feature Name] — User Guide
**Module:** [Module name, e.g. Work Orders / Assets / Reporting]
**Availability:** [Web and Mobile / Web only / Mobile only]
**Version:** 1.0
**Last Updated:** [Date]

---

## Overview

[2–4 sentences. What the feature does, where it produces output, and which user action triggers it. Third-person. No adjectives. No benefit framing.]

---

## Who It's For

| Role | When They Use This Feature |
|---|---|
| [Role 1] | [The specific situation or task that brings this role to the feature] |
| [Role 2] | [Specific situation] |
| [Role 3 — if applicable] | [Specific situation] |

---

## Where to Find It

**Navigation:** [Module → Section → Page, e.g. **Work Orders → Summary Page → Work Order Photos widget**]
**Platform:** [Web and Mobile / Web only / Mobile only]

[One additional sentence if the entry point is not obvious — e.g., "The trigger appears only when the work order is in Active status."]

---

## Before You Start

[What must be true before the user can interact with this feature. State configuration prerequisites, required permissions, and module dependencies. Be specific.]

If no prerequisites: "No prerequisite setup is required. The feature is available to [roles] by default once [condition]."

If feature-level permission is required: "Text Assistance must be enabled for the user's account by an administrator. When not enabled, the feature is not visible anywhere in the platform."

---

## How to Use It

[One-sentence context: what state the user is in when they start this workflow.]

1. [Step — imperative, one action. Include the exact UI element name in bold where relevant. E.g., "Open the Work Order and navigate to the **Summary** page."]
2. [Step]
3. [Step]
4. [Step — include what the system does, not just what the user does. E.g., "Click **Generate**. The system processes the request and renders the output within the widget."]
5. [Final step — what confirms the workflow is complete. E.g., "Click **Save** to commit the record. The updated text replaces the original in the field."]

[If there are branching paths — e.g., "If the AI flags discrepancies, see Step 6. Otherwise, proceed to Save."]

[If the feature has multiple independent actions on a toolbar, document each as its own numbered sub-workflow rather than a single linear flow.]

---

## Real-World Example

**Context:** [Who — role and facility type. What situation triggered the task. E.g., "A Field Technician at a commercial office building completes an HVAC repair and needs to log closure notes."]

**Action:** [What the user does in this scenario, in narrative form. Reference the steps from the workflow. Keep it grounded — name a specific asset type, work order state, or condition.]

**Outcome:** [What the system produces. What the user or another role sees as a result. What record or state changes.]

---

## Limitations & Considerations

[Hard system constraints first — what the feature technically cannot do:]
- [Specific constraint. E.g., "Supports JPEG and PNG formats only. Other image formats are not processed."]
- [Specific constraint. E.g., "The AI score is not recalculated if images are replaced after the initial analysis."]
- The feature cannot [specific behavior users might expect but which is not supported].
- [If there is a volume limit, state it explicitly. E.g., "Processing is limited to 50 records per query."]

[User awareness points after — edge cases, things to know — not bugs:]
- [Awareness point. E.g., "The feature is not visible to users whose access has not been enabled by an administrator."]
- [Awareness point. E.g., "AI output reflects the text present in the field at the time the action is triggered. Changes made after triggering are not included."]

Rules:
- Never use "issue", "problem", or "error" in this section
- Every bullet is a direct factual statement about system behavior
- Do not soften constraints with "may" or "might" unless the behavior genuinely varies

---

## Dependencies & Integrations [If applicable]

[Which other modules or external systems must be active for this feature to work. E.g., "Photo Validator requires the 'before' and 'after' photo fields to be configured as mandatory in the Work Order template by an Admin. Without this configuration, the widget does not appear."]

---

## Audit & Traceability [If applicable]

[What the system logs when the user takes action through this feature. Where that log appears. What data is captured — user, timestamp, action taken, record affected.]

---
**Document Status:** Draft | Version 1.0 | [Date]
**Last Updated:** [Date]
```

---

## Template 2 — Admin Guide (AG)

```markdown
# [Feature Name] — Admin Guide
**Module:** [Module name]
**Availability:** [Web and Mobile / Web only / Mobile only]
**Version:** 1.0
**Last Updated:** [Date]

---

## Overview

[2–4 sentences. What this feature exposes for administrator configuration. What the admin controls (access, templates, fields, behavior). Third-person. No benefit framing.]

---

## Where to Configure

| Configuration Area | Navigation Path |
|---|---|
| [Area 1 — e.g., Templates] | **Setup → Customization → Modules → [Module] → Templates** |
| [Area 2 — e.g., Role Permissions] | **Setup → Users & Access → Roles** |
| [Area 3 — if applicable] | **[Full path]** |

---

## Configuration Options

### [Sub-section 1 — e.g., Templates]

[What the admin configures in this area. Name each configurable element. Use exact field/option names.]

Administrators can:
- [Action — e.g., "Create multiple templates per module"]
- [Action — e.g., "Define fields, page layout, summary configuration, and related lists per template"]
- [Action — e.g., "Enable or disable individual templates"]

[If there are field-level options, list them specifically — e.g., "Each template supports the following configurations: Fields (mandatory or optional), Page Layout (section order), Summary Configuration (visible fields on the summary card), Related Lists (linked records displayed below the summary)."]

### [Sub-section 2 — e.g., Field Configuration]

[What the admin controls at the field level.]

- [Configurable item — e.g., "Mandatory vs. optional designation per field"]
- [Configurable item — e.g., "Custom field creation (text, number, dropdown, date)"]
- [Configurable item — e.g., "Field visibility per template"]

### [Sub-section 3 — e.g., Role Permissions]

[What the admin controls at the role/permission level.]

- [Permission — e.g., "Creation access per role (who can create new records using this feature)"]
- [Permission — e.g., "Edit access post-creation (who can modify records after they are saved)"]
- [Permission — e.g., "Template availability per role (which roles see which templates)"]

### [Sub-section 4 — additional if needed]

---

## Access & Permissions

| Role | Access Level | Restrictions |
|---|---|---|
| [Admin] | Full configuration | Can create, edit, delete templates and manage all field settings |
| [Manager / Supervisor role] | [Level] | [What they cannot do] |
| [End User role] | [Level] | [What they cannot do] |

**Permissions are managed via:** **[Navigation path — e.g., Setup → Users & Access → Roles]**

[If permissions are site-scoped or team-scoped rather than platform-wide, note it here.]

---

## Default Behavior

[What the system does when the feature is active with default or minimal configuration. State the starting condition — what default status is applied, what template is selected, what the record state is on creation.]

- [Default behavior item — e.g., "Assets are created using the template selected during creation."]
- [Default behavior item — e.g., "Default asset status is applied as configured in the template."]
- [Default behavior item — e.g., "The record becomes immediately available for operational use."]

---

## Common Misconfigurations

- **[Misconfiguration name]:** [What causes it and what to check. E.g., "Too many active templates: If more than [N] templates are enabled, users may select the wrong one at creation time. Disable unused templates to reduce decision overhead."]
- **[Misconfiguration name]:** [Cause and resolution. E.g., "Missing mandatory fields: If key fields are not set as mandatory, records may be saved with incomplete data, causing downstream reporting failures. Audit mandatory field settings after any template change."]
- **[Misconfiguration name]:** [Cause and resolution. E.g., "Incorrect role permissions: If creation permissions are not assigned to the relevant role, users receive an error when attempting to create a record. Verify role settings under Setup → Users & Access → Roles."]

---

## Limitations & Considerations

[Hard constraints relevant to admins:]
- [Specific constraint. E.g., "Deleting a template does not delete records already created with that template. Existing records retain the template structure at the time of creation."]
- [Constraint — e.g., "Field type cannot be changed after records have been created using that field. A new field must be created."]
- The configuration cannot [specific behavior admins might expect but which is not supported].

[Admin awareness points:]
- [Awareness point. E.g., "Disabling a feature removes it from view for all users immediately, without a confirmation prompt."]

Rules:
- Never use "issue", "problem", or "error" in this section
- Hard constraints listed first, awareness points after
- Every bullet is a factual statement

---

## Dependencies & Integrations [If applicable]

[What other modules, data structures, or platform configurations must be in place before this feature can be configured. E.g., "Location hierarchy (Site / Building / Floor / Space) must be configured before assets can be assigned a location during creation."]

---

## Audit & Traceability [If applicable]

[What admin configuration actions are logged. Where those logs appear. What data is captured — admin user, timestamp, change made, previous value.]

---
**Document Status:** Draft | Version 1.0 | [Date]
**Last Updated:** [Date]
```

---

## Notes on Template Use

**On roles:** Always ask the user for role names as they appear in the platform — never invent or assume job titles. The UG roles table and AG permissions table should use the same role names.

**On navigation paths:** Format all paths as bold with arrows: **Setup → Customization → Modules → Asset → Templates**. If a path is unconfirmed, mark it `[Navigation path — to be confirmed]`.

**On linked content:** If UG and AG reference each other (e.g., "For configuration prerequisites, see the Admin Guide"), use the other document's title exactly: "For setup instructions, refer to the *[Feature Name] — Admin Guide*."

**On section length:** Every section should contain only what it needs. A two-bullet Limitations section is fine if there are only two real limitations. Do not pad sections to look comprehensive.

**On Limitations & Considerations:** This single section replaces the former "Common Issues" and "Limitations & Known Constraints" pattern. The section title is always "Limitations & Considerations" — never "Common Issues", never "Known Issues", never "Limitations & Known Constraints".

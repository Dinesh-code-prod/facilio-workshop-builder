# Question Bank — Guidebook Builder

Use these questions when source content is thin on a specific section, or when a topic needs deeper clarification before a section can be written. Do not ask all of these — select only the questions that address actual gaps in the available content.

**Before using this bank:** Check `references/facilio-product-patterns.md` first. Questions about confirmed Facilio platform patterns (permission model, AI icon naming, actions vs modes, Photo Validator structure, Form Assistant field highlighting) do not need to be re-asked.

---

## Table of Contents
1. [Feature Identity](#feature-identity)
2. [User Workflow](#user-workflow)
3. [Admin Configuration](#admin-configuration)
4. [Roles & Permissions](#roles-and-permissions)
5. [Limitations & Constraints](#limitations)
6. [Ambiguous Behavior — Flag Before Writing](#ambiguous-behavior)
7. [Real-World Example Grounding](#real-world-example)

---

## 1. Feature Identity {#feature-identity}

Use when the feature name, module location, or scope is unclear:

- "What is the exact name of this feature as it appears in the platform UI?"
- "Which module does it belong to — and what is the navigation path a user would take to reach it?"
- "Is this feature available on Web, Mobile, or both? Are there differences between the two versions?"
- "Is this feature currently live for all users, or is it in early access / behind a feature flag?"
- "Does this feature produce a new record type, update an existing one, or only surface information?"

---

## 2. User Workflow {#user-workflow}

Use when the step-by-step workflow is absent or incomplete:

- "Walk me through exactly what a user does from the moment they open the platform to when the task is complete using this feature."
- "What is the specific trigger — which button, icon, or menu item does the user click to start the workflow?"
- "Where exactly is that trigger located? Which page, widget, or header?"
- "Is there a confirmation step — does the user need to review or approve before the system commits a change?"
- "What does the system show the user after the workflow completes? What visual confirmation or record is produced?"
- "Are there different paths through the workflow? For example, does anything change based on the user's role or the state of the record?"
- "Can the user undo or reverse the action after completing the workflow?"
- "What happens if the user starts the workflow but exits before completing it?"

**For AI toolbar features specifically:**
- "Are these options independent actions (each one executes on its own immediately when clicked), or do they change a mode or state that affects subsequent behavior?"
- "What is the exact left-to-right order and label of each option in the toolbar?"
- "Does any option open a dropdown, panel, or sub-menu? If so, what are the exact choices?"

**UI Label note:** Always use "AI icon" or "AI button" in the document — never "A icon". If the user or source uses "A icon" casually in answers, convert it to "AI icon" when writing.

---

## 3. Admin Configuration {#admin-configuration}

Use when admin setup context is absent or vague:

- "Does this feature require any admin setup before end users can access it? If yes, what must be configured?"
- "What is the exact navigation path to configure this feature? (e.g., Setup → Customization → ...)"
- "Which admin role does the configuration — a general Admin, a Module Owner, or a Super User?"
- "What specific fields, rules, or templates must the admin define before the feature behaves correctly?"
- "What happens if the feature is not configured — does it not appear to users, show an error, or work with a default state?"
- "Are there template-level configurations (e.g., per work order type, per asset category)?"
- "Can configuration be scoped per site, per team, or is it platform-wide?"
- "Are there any configuration steps that, if missed, create silent failures — the feature appears to work but produces incorrect output?"

---

## 4. Roles & Permissions {#roles-and-permissions}

Use when role-level access is not specified:

- "Which roles can access this feature? Are there any roles that cannot see it at all?"
- "Are there actions within the feature that are restricted to specific roles? For example, can one role view but not act, while another can both view and act?"
- "Is access configured per role, per site, or per individual user?"
- "Can an admin grant or restrict access to this feature independently of the overall role configuration, or is it part of a bundle?"
- "Are there actions in this feature that only the Admin role (not even a Manager) can perform?"
- "If a user does not have the right permission and tries to access the feature, what do they see?"

**Note on Facilio's permission model:** For AI features, access is feature-level — the entire feature is invisible when not enabled. Do not ask "what does the button show when permission is not granted" — when the feature is off, nothing appears.

---

## 5. Limitations & Constraints {#limitations}

Use when the limitations section is thin, vague, or missing:

- "What is the most common support question users ask about this feature?"
- "Is there anything users frequently expect this feature to do that it actually cannot do?"
- "Are there any volume or count limits — maximum number of records, files, templates, widgets, queries?"
- "Are there format restrictions — specific file types accepted, character limits, date range constraints?"
- "Are there record states where this feature does not work or behaves differently? For example, does it only work on open records, or also on closed ones?"
- "Is there anything that breaks silently — where the feature appears to work but produces an incorrect or incomplete result?"
- "Are there known performance differences at scale — large record sets, high user volume, many active templates?"
- "Is there a manual fallback if this feature is unavailable or produces an unexpected result?"

---

## 6. Ambiguous Behavior — Flag Before Writing {#ambiguous-behavior}

These are not general questions — they are flags to raise when specific content from the source is unclear. Only ask the relevant one(s).

**When the source says "users can do X" without specifying which users:**
> "Which roles specifically can [X]? Is this available to all users or a subset?"

**When the source describes a workflow outcome but not the steps:**
> "The source describes [outcome] but not the steps to get there. What does the user actually navigate through to trigger this?"

**When a UI element is referenced without a name:**
> "The source references [a button / panel / widget] without naming it. What is the exact label as it appears in the UI?"

**When a limit or threshold is mentioned but not quantified:**
> "The source mentions [a file size limit / a record count limit / a time constraint] but doesn't state the value. What is the actual number?"

**When two names are used for the same thing:**
> "The source uses both '[Name A]' and '[Name B]' for the same feature/element. Which is the correct platform name?"

**When AI actions are described ambiguously as modes or menu items:**
> "Are these independent actions that each execute on their own, or do they switch the feature into a different mode? For example, does clicking Rephrase immediately rewrite the text, or does it open a mode where the user then needs to take another action?"

**When a feature is described as "coming soon" or "in development":**
> "This feature appears to be in development or not yet fully released. Should the guidebook document current behavior, planned behavior, or both? Should there be a visible 'Preview' or 'In Development' label?"

**When a configuration step is implied but not confirmed:**
> "The source implies [admin action / setup step] but doesn't confirm it. Is this actually a required configuration step, and if so, where is it done?"

**When default behavior is not stated:**
> "What happens when a new user or a newly configured environment first encounters this feature — is there a system default, or does it require explicit setup first?"

---

## 7. Real-World Example Grounding {#real-world-example}

Use when the user has provided a generic scenario that needs more specificity:

- "Can you ground this example in a specific facility type — an office building, a hospital, a retail site? Even a hypothetical name helps."
- "Which exact role is doing this task — a Field Technician, a Facility Manager, an Admin?"
- "What situation triggered the task? What happened before this person opened the platform?"
- "What asset, work order type, or record is involved?"
- "What does 'done' look like for this person — what record, status, or confirmation signals completion?"
- "Is there a downstream effect — does another role receive a notification, see a score, or take action based on the result?"

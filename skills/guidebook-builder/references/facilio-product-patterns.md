# Facilio Product Patterns — Confirmed Reference

This file documents product behaviors confirmed during guidebook authoring sessions. Do not re-ask questions whose answers are recorded here. Apply these patterns directly when writing any Facilio feature guidebook.

---

## Platform-Wide Patterns

### Permission Model
- AI feature access is controlled at the feature level by an administrator
- When a feature is not enabled, it is **completely invisible** — no button, no icon, no panel, no menu entry appears anywhere in the platform
- There is no partial-access state: the feature is either fully visible (enabled) or fully absent (not enabled)
- Do not write "The [button] does not appear if permission is not granted" — write "The feature is not visible to users whose access has not been enabled by an administrator"
- There are no sub-feature permissions within an AI feature — permission applies to the whole feature

### AI Icon Naming
- The element that triggers an AI feature is always called the **AI icon** or **AI button**
- Never write "A icon" — this is informal shorthand used in conversation, not a platform label
- When source material or user answers use "A icon" casually, always convert to "AI icon" in the document

### Navigation Format
- All navigation paths: bold with arrow notation — **Module → Section → Page**
- Example: **Work Orders → Summary Page → Work Order Photos widget**
- Example: **Setup → Functions**
- Example: **Home → Dashboard → Dashfolders → [Dashfolder name]**

### Side Panels
- AI features typically open a right-side panel for chat input, configuration, or output display
- The panel is triggered by clicking the AI icon; it does not open automatically

### Preview-First Logic
- AI-generated output is presented for review before any permanent record change is made
- The user must take an explicit action (Save, Apply, Confirm) to commit changes to the record
- Exception: features that explicitly state output is applied immediately (confirm per feature)

---

## Feature-Specific Confirmed Patterns

### Text Assistance

**Trigger:** A floating AI bar appears at the top-right corner of any editable large text field — description fields, comment boxes, text editors. It is not a dropdown menu. It is a persistent bar visible whenever the user is in an editable text field.

**Action model:** Independent actions — not modes. Each action executes immediately on its own:
- Clicking **Rephrase** rewrites the text in place immediately
- Selecting **Tone** and choosing Friendly or Professional applies the tone change immediately
- Selecting **Text Length** and choosing Short, Long, or Char count applies the change immediately
- Clicking **Translate** opens language selection; the user selects a target language and triggers translation
- Clicking **Custom Instructions** opens an input for the user to enter a specific rewrite instruction

**Left-to-right bar order (confirmed):** Custom Instructions | Rephrase | Tone | Text Length | Translate

**Tone options (confirmed):** Friendly, Professional — these are the only two options

**Text Length options (confirmed):** Short, Long, Char count
- Char count: no default value — the user enters the desired character count

**Translate behavior:**
- Language detection: automatic, based on the text currently in the field; no minimum character threshold required
- The user selects the target language from a dropdown after clicking Translate
- Clicking the Translate button again after selection executes the translation

**Undo:** There is no undo. Once an action is applied, the text in the field reflects the AI output. The user can manually overwrite it.

**Context:** The AI bar has no awareness of the broader record context — it only processes the text currently in the field

---

### Co-Pilot

**Two distinct modes — Global and Contextual:**

| Mode | Trigger | Scope |
|---|---|---|
| Global | Star icon at the bottom of the left navigation panel | System-wide — can query and act across modules |
| Contextual | AI icon in the page header (web) / AI star icon (mobile) | Scoped to the active record only |

**Secondary workflows:**
- **Prompt Templates:** Pre-built queries accessible within the Co-Pilot panel; users select a template to populate the prompt input
- **Voice Input:** Supported in both Global and Contextual modes — the user speaks a prompt and Co-Pilot transcribes and processes it

**Volume limits (confirmed):**
- Maximum 50 records per Co-Pilot query result
- File attachments: up to 10 MB per file

**Platform:** Web and Mobile; Co-Pilot behavior is the same across both, with the exception of the trigger icon label (AI icon on web, AI star icon on mobile)

---

### Photo Validator

**Two distinct validation types — not one feature with two views:**

| Type | Where it appears | What it validates |
|---|---|---|
| Widget-level | Work Order Summary page → Work Order Photos widget | All photos attached to the work order overall |
| Task-level | Individual task rows within the work order | Before/after photos per task (mandatory) |

**Switching between validation types:** A filter control at the top-right of the Work Order Photos widget header switches between the two views

**AI score behavior:**
- The AI generates a completion score based on comparing photos against the work order description
- The score is assistive — it appears within the existing approval workflow, it does not replace or override it
- Supervisors and approvers can review the AI score and reasoning, and override the result at any point
- The score is not recalculated if photos are replaced after the initial analysis

**Score trigger:** Both a "before" photo and an "after" photo must be present for the AI analysis to run. If only one is present, no score is generated.

---

### Form Assistant

**Two input paths — user can use either:**
1. **PDF upload** — the user uploads a PDF form; the AI extracts field values from the document
2. **Chat text description** — the user types or describes the information; the AI maps it to form fields

**Field highlighting (confirmed color logic):**
- **Green highlight** = AI has high confidence in the field value; the field is confirmed
- **Red highlight** = AI is uncertain; the field value is speculative and requires user review and correction before submitting

**Scope:**
- All form types in the platform are supported — there is no restriction on form type
- No file size limit currently for PDF uploads

**Review step:** The user reviews all highlighted fields before final submission. Green fields can be accepted as-is; red fields must be reviewed and corrected by the user.

---

### Ops Vision

**Navigation:** Left panel → Observation icon (dedicated module icon in the left navigation panel)

**Two workflow paths:**
1. **Start from Scratch** — user defines a Scope Variable and selects data sources manually
2. **Use a Template** — user selects a pre-built template; the configuration is pre-populated

**Published state is permanent and irreversible:**
- Once an observation is published, it cannot be unpublished, edited, or deleted
- This is a hard system constraint, not a confirmation-step behavior
- The document must state this prominently — it is the most critical limitation for this feature

**Scope Variable:** Defines what the observation monitors (e.g., a specific asset, space, or system); must be set before data sources are added when working from scratch

---

### Dashboard Builder

**Navigation:** **Home → Dashboard → Dashfolders → [Dashfolder name] → Create with AI**

**Orchestration Layer:**
- After the user enters a natural language prompt, the system presents an Orchestration Layer — a review screen showing the proposed widget list before any dashboard is generated
- Each row in the Orchestration Layer represents one widget with an intent description
- The user can edit any row (click the edit icon on that row) to rewrite the widget intent before generating
- This is a deliberate review/refinement buffer — not a preview of the final dashboard

**Post-generation editing:**
- After the dashboard is generated, users can edit individual widgets by clicking the **AI icon** on the widget header
- This opens a context chip in the left panel chat where the user can describe changes in natural language

**No pre-generation preview:** The user sees the Orchestration Layer (widget list), not a visual preview of the final dashboard, before generation

**GUI dependency:** Dashboard Builder is a web-only workflow; the full layout and chart configuration is not available on mobile

---

### Script Assistant

**Navigation:** **Setup → Functions**

**Trigger:** The **AI icon** in the function editor header opens a right-side panel chat window

**Language scope:** Script Assistant generates code in Facilio's internal scripting language only — it does not generate generic JavaScript, Python, or other general-purpose languages

**Deployment model (intentional):**
- Script Assistant generates code and displays it in the chat panel
- The user manually copies the generated code and pastes it into the function editor
- This manual copy-paste step is by design — it ensures developer review and oversight before any script is deployed
- Do not frame the copy-paste requirement as a limitation or gap

**Platform:** Web only (Setup module is not accessible on mobile)

---

## Naming Reference — Confirmed Feature Names

| Feature name in platform | Do not write |
|---|---|
| Text Assistance | Text Assistant, AI Text Tool |
| Co-Pilot | Copilot, Co Pilot, AI Assistant |
| Photo Validator | PhotoValidator (as one word in prose), AI Photo Tool |
| Form Assistant | AI Form Filler, Form AI |
| Ops Vision | OpsVision (as one word in prose is acceptable), AI Observations |
| Dashboard Builder | AI Dashboard, Dashboard AI |
| Script Assistant | AI Script Tool, Code Assistant |

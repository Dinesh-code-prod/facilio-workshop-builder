# Tone & Style Guide — Guidebook Builder

This guide governs every word in both the User Guide and Admin Guide. Apply these rules across all sections.

The key difference from PRD-style docs: **numbered workflow steps allow imperative voice**. This is the industry standard for instructional documentation. All other text — overviews, descriptions, behavior notes, limitations — remains third-person.

---

## Pillar 1 — Third-Person, Except Workflow Steps

**In all prose (overviews, descriptions, behavior notes, limitations):**
The document describes the platform and its users as observable subjects. It does not speak to the reader.

Banned words in prose: I, we, you, your, our, my, us

| ❌ Wrong | ✅ Correct |
|---|---|
| "You can access the feature from the left panel." | "The feature is accessible from the left panel." |
| "Our AI analyzes the uploaded photos automatically." | "The system analyzes uploaded photos automatically." |
| "We've designed this to help facility managers..." | "The feature supports facility managers in..." |
| "You'll see the result in the Summary widget." | "The result appears in the Summary widget." |

**In numbered workflow steps only — imperative is allowed:**
Workflow steps follow the instructional documentation standard. Use direct, one-action-per-step commands.

| ✅ Correct in workflow steps |
|---|
| "Open the Work Order via the mobile app or web browser." |
| "Click the **AI icon** at the top header." |
| "Select a language from the dropdown." |
| "Click **Save** to commit the record." |

The imperative exception applies only to sections titled "How to Use It" and "Getting Started" / "Operational Workflow". All surrounding explanatory text (e.g., notes below a step) stays third-person.

---

## Pillar 2 — Functional and Direct

The document answers *what* a feature does and *how* to trigger it. It does not evaluate its quality or describe its impact on user experience.

**Banned word categories:**

| Category | Words to avoid |
|---|---|
| Explicit bans | seamlessly, instantly, empowers, frictionless, robust, powerful |
| Marketing qualifiers | intelligent, smart, advanced, cutting-edge, innovative |
| Vague intensifiers | drastically, significantly, easily, quickly, better, faster |
| Editorial descriptors | simple, intuitive, effortless, streamlined, modern |
| Superlatives | best, most powerful, leading, superior |

| ❌ Wrong | ✅ Correct |
|---|---|
| "The tool seamlessly integrates with your existing workflow." | "The tool runs within the existing upload workflow without additional steps." |
| "Instantly validates task completion." | "Generates a completion score after the photos are uploaded." |
| "Empowers users to create dashboards." | "Users create dashboards by entering a natural language prompt." |
| "Significantly reduces manual effort." | "Reduces the time required for [specific task] from [X] to [Y]." |
| "An intelligent data-entry tool." | "A data-entry tool that extracts information from uploaded documents." |

**Active voice for process descriptions. Passive only when the system is the implicit actor.**

| ❌ Passive (unclear actor) | ✅ Active |
|---|---|
| "Records can be updated by the Co-Pilot." | "Co-Pilot updates records after the user approves the action." |
| "Photos are analyzed after upload." | "The system analyzes photos after upload." *(acceptable — system is implicit actor)* |

---

## Pillar 3 — Authoritative and Precise

Use platform-specific terminology exactly as it appears in the platform. Do not paraphrase module names, field names, button labels, or feature names.

**Glossary rule:** Any platform-specific term used for the first time must be defined in parentheses on first use, then used consistently thereafter.

> *Example: "The Contextual Co-Pilot (an in-platform AI assistant scoped to the active record) generates..."*

**Numbers and specifics:**
- Use exact values when known: "processes up to 50 records" not "processes large volumes"
- Use ranges only when the value is genuinely context-dependent: "response time varies between 2–8 seconds depending on record count"
- If a specific value is unknown, mark it `[To be confirmed]` — never approximate or omit

**UI element reference rules:**
- Navigation paths: use bold + arrow notation — **Setup → Customization → Modules → Asset**
- Button labels: use bold — **Generate Insights**, **Save**, **Create with AI**
- Field names: use bold — **Scope Variable**, **Insight Prompt**
- Roles: capitalize as they appear in the platform — Facility Manager, Field Technician, Admin

**AI element naming rule (critical):**
- Always write **AI icon** or **AI button** — never "A icon", never just "the icon"
- This applies even when the source material or the user uses "A icon" casually in conversation
- Example: "Click the **AI icon** in the function editor header" ✅ — not "Click the A icon" ❌

**Naming consistency:**
- Once a feature is named, use that exact name for the entire document
- If the platform uses "Co-Pilot" (hyphenated), never write "Co Pilot" or "Copilot"
- If a term appears in two forms in source material, flag it as `[To be confirmed — two names found: X and Y]`

---

## Pillar 4 — Transparent and Grounded

Every document — User Guide and Admin Guide — must end with a **Limitations & Considerations** section. This is not optional. A reader who finds honest limitations documented will trust the capabilities more.

**Section structure:**
1. Hard system constraints first — what the feature technically cannot do
2. User awareness points second — edge cases, things to know, behaviors that may surprise

**Never use the words "issue", "problem", or "error" in this section.** Every bullet is a factual statement about how the system behaves.

**Limitations format — be direct:**

| ❌ Evasive | ✅ Direct |
|---|---|
| "May not support all file types in some configurations." | "Supports JPEG and PNG only. Other formats are not processed." |
| "Large datasets might experience slower load times." | "Dashboards with more than 50,000 rows may exceed the 30-second render threshold." |
| "Subject to standard platform attachment policies." | "File uploads are limited to 10 MB." |
| "Common issue: AI bar not visible." | "The feature is not visible to users whose access has not been enabled by an administrator." |

**Do not soften with "may", "might", "in some cases" unless the limitation genuinely varies. Be direct.**

In the Admin Guide, limitations refer to what the configuration system cannot do or what will break if misconfigured. In the User Guide, limitations refer to what the feature cannot do from a user's perspective.

---

## Sentence Structure

- Prefer sentences under 25 words. Split longer sentences.
- Lead with the subject (what is acting), follow with the verb (what it does).
- Avoid nested clauses. One idea per sentence.
- Use parallel structure in all lists: all items start with the same grammatical form.

## What "Good" Looks Like

**Feature overview — bad:**
> "Our intelligent Photo Validator seamlessly compares before and after photos, empowering facility managers to effortlessly validate task completion without wasting time reviewing every image manually."

**Feature overview — good:**
> "Photo Validator compares before-and-after task photos against a work order's text description and generates a completion score. The score and supporting analysis appear on the Work Order Summary page. Supervisors can review the AI's reasoning and override the result at any point."

The second version describes observable, verifiable behaviors. It names the UI location. It specifies who acts and what they see. It makes no claims about ease or quality.

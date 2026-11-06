---
name: guidebook-builder
description: >
  Feature Guidebook Builder — builds two paired, structured markdown documentation files
  (User Guide + Admin Guide) for any product feature. Use this skill whenever the user
  wants to document a product feature for end users or admins, write a user guide or admin
  guide, build a how-to or step-by-step doc, convert a Notion page or input description
  into structured guidebook format, or produce feature documentation from scratch.
  Trigger phrases include "write a guide for", "document this feature", "make a user
  guide", "build an admin guide", "convert this notion page into docs", "create a
  guidebook", "write how-to docs for", "document how X works", or any request to produce
  structured end-user or admin documentation for a product feature. Always invoke this
  skill before starting any feature documentation — even if the user just says "write
  this up" in a product context.
---

# Guidebook Builder

## Purpose

Produces two paired markdown documents for any product feature:

- **User Guide (UG)** — task-facing. How a user finds and uses the feature, step by step.
- **Admin Guide (AG)** — configuration-facing. How an admin sets the feature up, controls access, and manages its behavior.

Both documents inherit Facilio's tone standards. Read `references/tone-guide.md` before writing any section.

---

## Tone — Quick Summary

Full rules in `references/tone-guide.md`. Four non-negotiable rules:

1. **Third-person in all prose** — no "you", "we", "your", "our" in descriptions, overviews, or behavior notes
2. **Imperative voice is allowed in numbered workflow steps only** — "Open the Work Order", "Click the AI icon" — this is the accepted standard for instructional docs. Everywhere else stays third-person.
3. **No marketing language** — banned: seamlessly, instantly, eliminates, empowers, intelligent, frictionless, streamlines, drastically, powerful, robust, simple, intuitive
4. **Every document ends with a Limitations & Considerations section** — no exceptions, no padding with vague non-answers

---

## Step 0 — Source Intake

The user will typically provide one of:

**A — Notion link:**
1. Fetch the page using available browser tools
2. Check for sub-pages (linked sections, feature breakdowns) and fetch those too
3. Extract all content and map it to the two-doc structure (Step 1)
4. Present a brief summary of what was found and what needs clarification before proceeding

**B — Raw description or brief:**
> "Give me the feature name, which module it belongs to, how a user triggers and uses it, and how an admin configures it. Fill in what you know — I'll ask about the gaps."

---

## Step 1 — Content Mapping

After intake, sort extracted content into three buckets before writing:

| Bucket | Goes into | What belongs here |
|---|---|---|
| User-facing | UG only | Step-by-step workflows, what the user sees/clicks, role scenarios, real-world context |
| Admin-facing | AG only | Setup navigation paths, field config, template management, role permissions, default states |
| Shared | Both docs | Feature name, module, availability, overview paragraph, limitations, dependencies, audit trail |

Present the mapping to the user before writing:
> "Here's how I've split the content — [brief summary per bucket]. Does anything need to move?"

---

## Step 2 — Clarification Gate

Flag ambiguous content before writing. Do not guess — ask. Collect all questions into a single block and wait for answers before starting the document.

Situations that require a clarification question:

- **Role ambiguity** — "The source says 'users can do X' without specifying which roles. Which roles specifically have this access?"
- **Missing workflow steps** — "The source describes the outcome but not the path. What does the user actually click or navigate through to get there?"
- **Unnamed UI elements** — "The source references a button/panel/page without naming it. What is the exact label?"
- **Vague or unspecified limits** — "The source mentions a constraint but doesn't quantify it (e.g. 'file size limit'). What is the actual value?"
- **Assumed admin config** — "There's no setup path documented. Does this feature require admin configuration before end users can access it?"
- **Contradictory information** — "The source mentions [X] in one place and [Y] in another. Which is correct?"
- **In-development features** — "The source indicates this feature is not yet released. Should it still be documented, and should the doc reflect current behavior or planned behavior?"
- **Actions vs modes** — If the source describes something as a "mode" or "menu selection", confirm: "Are these independent actions (each triggers its own result immediately) or menu options that change a mode/state?" Do not document as modes unless confirmed.
- **AI toolbar layout** — If the feature includes an AI toolbar or floating bar, confirm the exact left-to-right order and names of all actions before writing the workflow.

If a detail remains unresolved, mark it `[To be confirmed]` inline — never fill in with an assumption.

---

## Step 3 — Document Assembly

Use section scaffolds from `references/templates.md`. Use the question bank in `references/question-bank.md` when content on a specific section is thin. Refer to `references/facilio-product-patterns.md` for confirmed Facilio platform patterns — do not re-ask questions that have already been confirmed there.

### User Guide — Section Inclusion Rules

| Section | Include when |
|---|---|
| Header | Always |
| Overview | Always |
| Who It's For | Always |
| Where to Find It | Always |
| Before You Start | Always — even if the answer is "No prerequisites" |
| How to Use It | Always |
| Real-World Example | Always |
| Limitations & Considerations | Always — hard system constraints first, user awareness points second |
| Dependencies & Integrations | Only when feature relies on another module or external system |
| Audit & Traceability | Only when feature produces a user-visible log or history |

### Admin Guide — Section Inclusion Rules

| Section | Include when |
|---|---|
| Header | Always |
| Overview (admin-focused) | Always |
| Where to Configure | Always — include all relevant navigation paths as a table |
| Configuration Options | Always — one subsection per configuration area |
| Access & Permissions | Always — use the structured table |
| Default Behavior | Always |
| Common Misconfigurations | Always — minimum 3 bullets |
| Limitations & Considerations | Always |
| Dependencies & Integrations | Only when relevant |
| Audit & Traceability | Only when admin actions are logged |

---

## Output Format

Output two separate markdown documents. Always in this order: User Guide first, Admin Guide second.

Separate them with:
```
---
---
```

**File naming when saving to disk:**
- `[Feature Name] — UG.md`
- `[Feature Name] — AG.md`

**Formatting rules:**
- `##` for sections, `###` for subsections
- Numbered lists for sequential workflow steps only
- Bullet points for capabilities, constraints, and misconfiguration notes
- Tables for: roles (UG), permissions (AG), navigation paths (AG)
- Bold for exact UI labels, button names, field names, and navigation paths
- No emojis, no filler phrases, no section padding

End each document with:
```
---
**Document Status:** Draft | Version 1.0 | [Date]
**Last Updated:** [Date]
```

---

## Pre-Delivery Check

Before outputting, verify both documents pass the following:

- [ ] No "you", "your", "we", "our" outside numbered workflow steps
- [ ] No banned words: seamlessly, instantly, eliminates, empowers, intelligent, frictionless, streamlines, drastically, powerful, robust, simple, intuitive
- [ ] All UI labels and nav paths are exact (sourced from input or marked `[To be confirmed]`)
- [ ] Every role is named specifically — no "users" or "authorities" as a catch-all
- [ ] Limitations & Considerations section: hard constraints listed first, awareness points second, no "issue/problem/error" language anywhere
- [ ] No `[Assumed]` tags — only `[To be confirmed]` where information was missing
- [ ] UG: workflow steps are numbered and imperative
- [ ] AG: navigation paths use the `Setup → Module → Section` format, bolded
- [ ] AI toolbar actions are listed as independent actions — not modes, not menu selections
- [ ] AI element labels say "AI icon" or "AI button" — never "A icon"

---

## Facilio Platform Conventions

These patterns are confirmed across Facilio AI features. Do not re-ask about these — apply them directly.

**Permission model:**
- AI feature access is controlled at the feature level by an admin
- When a feature is not enabled, it is completely invisible to the user — no button, no icon, no panel appears anywhere
- Never write "The [button] does not appear unless..." — write "The feature is not visible unless enabled by an administrator"

**AI trigger labels:**
- Always use "AI icon" or "AI button" — never "A icon", never just "the icon"
- When the user or source uses "A icon" casually, always convert to "AI icon" in the document

**Actions vs modes:**
- Facilio AI toolbars present independent actions — each action executes immediately on its own
- Do not describe AI toolbar options as "modes", "menu selections", or steps in a single workflow
- Correct framing: "Click **Rephrase**. The system rewrites the text in place." (not "Select Rephrase from the toolbar menu")

**Navigation format:**
- All navigation paths use bold with arrow notation: **Module → Section → Page**
- Example: **Work Orders → Summary Page → Work Order Photos widget**

**Side panels:**
- AI features typically open a right-side panel for input, chat, or output
- State this explicitly in the Where to Find It or workflow steps

**Preview-First logic:**
- AI output is shown as a preview before any permanent record change
- The user must take an explicit action (Save, Apply, Confirm) to commit changes
- Never imply the AI action is irreversible unless confirmed by the user

**Floating AI bar (Text Assistance pattern):**
- The AI bar appears floating at the top-right corner of any editable large text field (description fields, comment boxes, text editors)
- It is not a dropdown menu — it is a persistent bar with independent action buttons
- Left-to-right order confirmed: **Custom Instructions | Rephrase | Tone | Text Length | Translate**

---

## Reference Files

- `references/tone-guide.md` — Full tone rules with before/after examples. Read before writing.
- `references/templates.md` — Section scaffolds for both UG and AG. Use as assembly guide.
- `references/question-bank.md` — Extended questions by section type. Use when source content is thin.
- `references/facilio-product-patterns.md` — Confirmed Facilio product patterns by feature. Do not re-ask questions answered here.

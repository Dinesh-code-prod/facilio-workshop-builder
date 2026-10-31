---
name: video-to-user-guide
description: Analyze software walkthrough videos, screenshots, and Tamil-English speech to create accurate step-by-step English user guides.
---

# Video to User Guide

## Objective
Convert software walkthrough recordings into accurate, professional user documentation.

## Workflow
1. Review the supplied transcript chronologically, using timestamps.
2. Interpret mixed Tamil-English speech in context.
3. Inspect the extracted screenshots in chronological order.
4. Match spoken explanations to visible application actions.
5. Identify menus, buttons, form fields, dropdowns, dialogs, navigation, and confirmation messages.
6. Explain each action, its purpose, and its expected result.
7. Use numbered instructions and reference the relevant screenshots.
8. Never invent interface elements or undocumented steps.
9. Flag unclear speech, missing screenshots, and uncertain interpretations.
10. Write the complete user guide in professional English.

## Output structure
- Guide title
- Purpose
- Prerequisites and access
- Step-by-step procedure
- Field descriptions
- Expected results
- Common errors and troubleshooting
- Items requiring verification

## Evidence
Use transcript timestamps and screenshot filenames where available.
Distinguish directly observed behavior from assumptions.
Do not claim a task succeeded unless the supplied evidence confirms it.

## Deliverables
Create a Markdown guide first.
If document-generation capabilities are available, also create a formatted DOCX with relevant screenshots.

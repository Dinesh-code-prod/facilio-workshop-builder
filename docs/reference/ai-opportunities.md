# Where AI helps, and where it still could

Reviewed on 2 November 2026 from the team, admin and customer points of view. How the AI layer works (providers, limits, checks) is in [ai-architecture.md](ai-architecture.md). Every AI output in the app is a draft or a preview; a person confirms it.

## Three ways a person gets the same help
| Way | Used for | Needs |
|---|---|---|
| DeepSeek (platform AI, on the server) | One-click drafts and extraction | Nothing; counted per person |
| Open in Claude | The person's own Claude does the work (long documents, pictures, better writing) | Copy and paste, or the connector box ticked |
| The connector | The person asks Claude about the project in their own words and Claude reads and drafts | Connector added in Claude |

## Already covered
Deliverable drafts (BRD, gaps, UAT, FTR, guides, training, config, go-live, hypercare, handover, closure, status and monthly reports), kick-off deck reading, flow from a picture, flow from a description, tasks from a transcript, task assistant and checklist, task type suggestions, FTR scenarios, video to guide, admin AI briefing, customer-guide drafting, and (new) **minutes of meeting from a transcript**.

## Added in this review: Minutes of meeting (MOM)
Transcripts page > **Create MOM** on any transcript (Teams and Zoom save `.vtt`, `.docx` or `.txt`; an audio file must be transcribed first, the app does not turn sound into text).
- **DeepSeek:** reads the transcript in parts of about 9,000 characters, merges them, and shows a preview.
- **Open in Claude / Add from Claude:** the whole transcript goes to the person's own Claude with the same prompt; the reply is checked the same way.
- **Connector:** `get_transcripts`, `get_transcript`, `get_mom_pack`, `save_minutes`.
- **Checks:** an owner is kept only if named in the transcript; a due date only as YYYY-MM-DD; attendees without a name are dropped. The preview opens the existing Meeting minutes form, so decisions, actions and risks become register records only when the person saves.
- The text of every uploaded transcript is now kept (team only, record kind `trtext`) so minutes and the connector can read it later. Older transcripts get their text stored the first time someone presses Analyse or Create MOM.

## Still open, in order of value
| # | Idea | Who | Where | Input | Output | Effort |
|---|---|---|---|---|---|---|
| 1 | Requirement writer: turn a statement into a clear, testable requirement with acceptance criteria | Consultant | Requirements register, statement review | The statement, its transcript lines, the module | Title, objective, acceptance criteria as a draft | Small (reuses the extract route) |
| 2 | AI statement suggestions instead of rule-based ones | Consultant | Transcripts > Analyse | Transcript parts | Candidates with category and module, same review queue | Medium |
| 3 | Reply drafts for tickets and e-mail | Support | Tickets thread | The thread, project records | A reply to edit; nothing sent | Small |
| 4 | Change request impact | PM, architect | Change Requests | The change, requirements, flows, UAT, BRD | Affected modules, BRD sections, test cases | Medium |
| 5 | Use cases from confirmed requirements | Consultant | Use Cases | Confirmed requirements | Scenario and steps drafts | Small |
| 6 | Ask this project (question box) | Everyone | Project Overview and Admin | Search results and counts | Short answer with sources | Medium |
| 7 | Explain this health score, suggest next actions | Admin | Admin command centre | The signals already computed | Plain explanation and 3 next steps | Small |
| 8 | Risk suggestions from status and transcripts | PM | Governance & RAID | Open items, transcript risks | Risks to confirm | Small |
| 9 | Customer guide questions | Customer | Customer view | Published guide | Answer with the guide section | Needs customer sign-in first |

Rules for any new AI feature: use the existing routes and `generateJSON` checks, show a preview, never save unapproved text as final, count it against the per-person limits, and add it to the connector and Open in Claude when it makes sense.

# Requirement sessions: function and route map (21 Nov 2026)

What every module around requirement sessions does, from the session plan to the prepared questions, the Workshop room, transcripts, findings and the job queue. Line numbers are from branch `feat/copilot-link` (from `origin/main` at deploy 503) before the change of the same day, except where marked. Facts only. Where something was not traced, it says so.

## 1. Planner sessions and the Workshop plan view
| File:line | Function / action | What it does | Inputs -> outputs |
|---|---|---|---|
| src/kickoff.js:298 | `syncSessions()` | Builds `planner.sessions` from the kick-off pack when nobody has made a session by hand | `kickoff_pack` -> `L().sessionPlan(raw)` (src/kickofflogic.js:92) -> `planner.sessions` (`fromPack`) |
| src/kickoff.js:303 / 304 | `sessData`, `V.planSessionData` | Gathers the data for the plan view and its exports | `planner`, `kickoff_pack` -> `{ sessions, planNotes, notes, fmt… }` |
| src/kickoff.js:307 | `V.planSessions.html` | Draws the tool bar, Claude's drafts, the guide and the session plan | `sessData()` -> HTML through `FWBSessionHtml.body` |
| src/kickoff.js:305 / 306 | `ACT.koSessView`, `ACT.koSessDl` | Opens or downloads the plan as HTML | `sessData` -> `FWBSessionHtml.build` |
| src/requirements.js:31 | `V.rsplan` | The Workshop plan page (team only) | mount: `V.wsplan.mount()`, `studioJobs.load` |
| src/wsplan.js:20 / 26 / 30 | `bar`, `draftsCard`, `V.wsplan` | Session count and buttons; up to 3 Claude drafts (`ai` items, task `workshop`) | `planner`, `ai` items -> HTML |
| src/wsplan.js:32 / 41 | `ACT.wpXlsx`, `ACT.wpPdf` | Exports to Excel; opens a print-to-PDF tab | `SH().rows(d)` -> file |
| src/wsplan.js:42 | `ACT.wpImport` | Uploads a plan file and queues job `import_workshop_plan` | file -> `plan_source` file and a job |
| src/wsplan.js:48 | `ACT.wpApply` | Adds Claude's draft plan to the plan, or replaces the plan with it | draft -> `planner.sessions`, `appliedDrafts` |
| src/wsplanlogic.js:10 / 19 | `parseDraft`, `apply` | Reads and cleans the draft's JSON; merges or replaces the sessions | text -> `{ sessions, planNotes }`; -> `{ sessions, added }` |
| src/sessionhtml.js:17 / 23 / 29 / 38 | `norm`, `rows`, `body`, `build` | Session, agenda and notes rows, then the HTML page | plan data -> rows / HTML |
| src/planner.js:18 | `V.planner` | Requirement Session Planner view | `planner` document |
| src/planner.js:176 / 179 / 196 / 205 | `newSession`, `sessionDrawer`, `saveSession`, `delSession` | Add, edit and delete a session by hand | form -> `planner.sessions` |
| src/planner.js:35 | `uncovered`, `V.uncoveredModules` | In-scope modules that no session covers | modules, sessions -> names |
| src/workshopprep.js:20 / 62 | `buildWorkshopPrep`, `workshopPrepHtml` | One session proposal per module, then a customer HTML page | scope and requirements -> `prep`; used only by src/msaflow.js:322-337 |

## 2. Workshop room and Live assistant
| File:line | Function / action | What it does | Inputs -> outputs |
|---|---|---|---|
| src/workshop.js:15 | `doc()` | Reads the notes of document `workshop_room` | -> `notesOf(d)` |
| src/workshop.js:18 | `prepared()` | Rules questions plus the kept question-bank questions | `V.prepqInput()`, `rs_questions` -> `FWBQBank.toPrep` |
| src/workshop.js:130 | `V.workshop.html` | The room: roadmap, brief, question list and focus card, after-session card, tools | page state -> HTML |
| src/workshop.js:151 / 152 | `wsStatus`, `wsAccept` | Sets a question's status; marks it answered with the live quote | -> `workshop_room` (`setNote`) |
| src/workshop.js:154 | `wsMake` (quick capture) | Turns an answer into a draft requirement, decision, action or open question | `draftRecord` -> `S.ws.requirements` / `questions`, or records through `I.put` |
| src/workshop.js:165 | `wsSolution` | Answered questions become one proposal per module | -> `design_proposals` |
| src/workshop.js:120 | `afterCard` | After-session report | `rs_findings` and questions -> `afterReport` |
| src/workshop.js:213 | `wsPip` | Floating question window (Document Picture-in-Picture) | -> `save()` |
| src/workshop.js:236 | `wsSaveTranscript` | Saves the live box text as a transcript | -> `V.trSave` (the old `transcripts` document) |
| src/workshop.js:248 | `runLive` | Parses the live text, runs `liveAsk`, marks "likely" questions answered | live text -> `u.res`, `workshop_room` |
| src/workshop.js:259 / 264 | `wsLoadFile`, `wsClaude` | Loads a file into the live box; opens Claude with a prompt (transfer_write, session_questions prepare and live) | file / page -> live box / Claude prompt |
| src/workshoplive.js:25 | `wlMic` | Browser speech recognition appends to the live box; a rules check runs every 12 s or more | microphone -> `u.live` |
| src/workshoplive.js:36-42 | `run`, `wlAnalyse`, `wlSummary` | AI read of the call | POST `/qbank/analyse` -> `w.ai`, `w.sum` |
| src/workshoplive.js:44 / 45 / 46 / 52 / 60 | `wlMark`, `wlMarkAll`, `wlAddQ`, `wlMake`, `wlSaveSum` | Marks questions answered, adds follow-ups (as kept), makes drafts, saves the summary | -> `workshop_room`, `rs_questions` |
| src/workshoplogic.js:29 / 41 / 52 / 78 / 106 / 120 | `questionList`, `mergeLive`, `setNote`, `draftRecord`, `forSession`, `afterReport` | Pure rules behind the room | data -> data |

## 3. Prepared questions and the question bank
| File:line | Function / route | What it does | Inputs -> outputs |
|---|---|---|---|
| work/server/_sessionquestions.mjs:29 | `prepareQuestions` | Rule-based questions per module (scope, conflict, open question, requirement gap, dependency, onboarding data, no session), each with priority must / should / could, reason and sources | `{ modules, exclusions, sessions, statements }` -> `{ byModule, gaps }` |
| work/server/_sessionquestions.mjs:81 | `agendaText` | Plain-text agenda | prepared -> text |
| work/server/_sessionquestions.mjs:90 | `liveAsk` | Word-overlap matching on the question's topic words: likely is 3 or more shared words and 60% or more; possible is 2 or more and 40% or more; questions and short remarks answer nothing | prepared, chunks -> `{ answered, stillOpen, nextSuggested }` |
| work/server/_questionsapi.mjs:16 | `questionInput` | The server copy of the browser's rules input | `planner`, `workshop`, `transcripts` (`.candidates`) -> rules input |
| work/server/_questionsapi.mjs:37 / 44 | `get_prepared_questions`, `live_ask` | Connector tools (team only, nothing saved); live uses the last 500 chunks. From 21 Nov 2026 each still-open row carries its `priority`, must-ask first | -> questions / hints |
| src/sessionquestionsview.js:10 / 19 / 23 / 30 / 31 | `input`, `V.prepqInput`, `V.prepq`, `sqCopy`, `sqClaude` | Prepare questions tab | `planner`, `S.ws`, `F.doc('transcripts')` -> list, agenda, Claude prompt |
| work/server/_qbank.mjs:11 | `CATEGORIES` | The 10 categories: module, usecase, workflow, integration, data, technical, roles, reporting, sla, scope | — |
| work/server/_qbank.mjs:35 / 59 / 64 / 79 | `merge`, `fromRules`, `fromIntegrations`, `toPrep` | Bank merge (duplicates by wording skipped; `ai` and `live` arrive as `suggested`), rules to bank, questions per integration, kept bank to prepared form | — |
| work/server/_qbank.mjs:109-145 | `modulePrompt`, `connectedPrompt`, `generalPrompt`, `parseAny`, `questionPrompt`, `parseQuestions`, `callPrompt`, `parseCall` | Prompts for the model and the parsers that clean its answers | — |
| work/server/_qbankapi.mjs:26 | POST `/api/projects/:id/qbank/generate` | AI questions from the documents | `msa_text`, `kickoff_pack`, `workshop`, `rs_transcripts` -> questions (called from src/qbank.js:75) |
| work/server/_qbankapi.mjs:37 | POST `/api/projects/:id/qbank/analyse` | AI analysis of a call | transcript, bank -> `parseCall` |
| work/server/_dsapi.mjs:84 | `rs_save_questions` | Claude adds questions as `suggested` (edit access, team only, 120 per call) | -> `rs_questions` (`QB.merge`, as `ai`) |

## 4. Transcripts and findings
| File:line | Function | What it does | Inputs -> outputs |
|---|---|---|---|
| work/server/_rsapi.mjs:1-3 | documents | `rs_transcripts { items }`, `rs_findings { items }`, team only | — |
| work/server/_rsapi.mjs:16 / 23 / 32 | `cleanFinding`, `mergeFindings`, `upsertTranscript` | Cleans a finding; replaces a transcript's open findings and keeps the decided ones; upserts a transcript by source and ref | — |
| work/server/_rsapi.mjs:52 | `rs_save_transcript` | Stores the transcript text through `PUT /api/projects/:id/docs/rs_transcripts` (no route of its own) | -> `rs_transcripts`, id `tr_N` |
| work/server/_rsapi.mjs:58 | `rs_save_findings` | Stores findings as `open` (transcriptId `tr_N`, `brd` or `msa`) | -> `rs_findings` |
| src/requirements.js:62 (34, 57) | `V.rstrans` (`chat()`, `list()`) | Transcripts page: chat panel and table | `rs_transcripts`, jobs |
| src/requirements.js:67 / 68 / 69 / 73 | `rsPullTeams`, `rsPull`, `rsReadMine`, `rsFind` | Queue `pull_transcript`; queue `pull_clari`; cancel the pull and queue `extract_findings`; queue `extract_findings` | -> POST `/jobs` |
| src/requirements.js:76 / 85 / 91 / 93 | `addTranscript`, `rsAddFile`, `rsPasteSave`, `rsRemoveT` | Add or remove a transcript by hand in `rs_transcripts`; queues `extract_findings` when `autoChain` is on (line 82) | file / paste -> `rs_transcripts` |
| src/requirements.js:102 | `V.rschecks` | Checks & validations | `rs_findings` |
| src/requirements.js:133 / 134 | `rsCheckBrd`, `rsCheckMsa` | Queue `check_brd`, `check_msa` | -> jobs |
| src/requirements.js:159 | `V.autoAgree` | Confirms open findings of kind promise, ask, usecase and decision | -> `rs_findings`, `brdDraft.sync` |
| src/requirements.js:172-195 | `rsToBrd`, `rsAsk`, `rsAskSave`, `rsBulk`, `rsDecide` | A person confirms, dismisses or reopens; the BRD draft is synced | -> `rs_findings` |
| src/transcripts.js:14 / 50 (61) | `T()`, `trSave` (`V.trSave`) | Upload into the OLD `transcripts` document, the file store and a `trtext` record | file -> `transcripts.items` |
| src/transcripts.js:93 | `analyse` | Only sets status `stored`: the statements pipeline is retired | — |
| src/transcripts.js:140-155 | `candAccept`, `candReject*`, `candClarify*`, `candMerge*` | The old review queue (statements) | `transcripts.candidates` |
| src/transcriptimport.js:15 / 21 / 35 | `check`, `build`, `V.trImportTransfer` | Imports an approved transfer of kind `transcript` | -> OLD `transcripts` document |
| src/transfers.js:67 | `ACT.xfImport` | Calls `V.trImportTransfer` | approved transfer version |
| src/transcriptparse.js:84 / 25 | `parseTranscriptInfo`, `fmtAt` | Reads WebVTT, SRT, Teams blocks, "Speaker:" lines, JSON and plain text into chunks | text -> `{ chunks, format, truncated }` |

## 5. Job queue and the connector
| File:line | Item | Fact |
|---|---|---|
| work/server/_jobs.mjs:20 | `pull_clari` recipe | Before 21 Nov 2026: Clari connector only; with no Clari tool, finish `failed` at once and "do not search anywhere else". Now: see "Change of 21 Nov 2026" below |
| work/server/_jobs.mjs:37 | `pull_transcript` recipe | Teams meeting transcripts (.vtt or .docx in OneDrive or SharePoint) through the Microsoft 365 connector; then save_transcript (source teams) and save_findings |
| work/server/_jobs.mjs:23 | `extract_findings` recipe | Reads `rs_transcripts`, saves findings, compares with `rs_questions`, adds `not_discussed` for untouched contract modules |
| work/server/_jobs.mjs:55 | `STAGE_OF` | pull_clari `['rs_transcripts','rs_findings','planner']`; extract_findings `['rs_transcripts','rs_findings']`; pull_transcript `['planner','transcripts']`; all stage `requirements` |
| work/server/_jobs.mjs:116 | `brief()` | What a claim returns: fixed recipe, `allowedDocs`, scope text, work standard, untrusted-data rule, blocked and finish rules |
| work/server/_jobsapi.mjs:54-57 | GET / POST `/api/projects/:id/jobs`, POST `/:jid/cancel`, `/:jid/answer` | Queue routes; `create` (line 38) removes duplicates by key |
| work/server/_jobsapi.mjs:62 / 68 | GET `/api/projects/:id/helper`, GET `/api/jobs/usage` | Claude heartbeat and plan usage |
| work/server/_jobsapi.mjs:92 / 121 | `jobs_claim` -> `brief`; `jobs_finish` | Auto-chain at line 128: when `extract_findings`, `pull_clari` or `pull_transcript` finishes `done` and `autoChain` is on, it queues `capture_flows`, `fill_forms` and `draft_brd`. It does not queue `extract_findings` |
| work/server/_helper.mjs:9 / 14 | `PERSONAL`, `canTake` | pull_msa, pull_clari, pull_brd, pull_transcript, fetch_feedback, fetch_hypercare, fetch_mail, check_sent and fetch_org_status can only be claimed by the requester's own Claude (it reads that person's own Microsoft 365 or Clari) |
| work/server/api.mjs:2388 | `ACTION_TOOLS.session_questions` | prepare -> `get_prepared_questions`; live -> `live_ask`; save_transcript -> `rs_save_transcript`; save_findings -> `rs_save_findings`; save_design -> `design_save_proposals`; save_mockup -> `mockup_save_page`; save_questions -> `rs_save_questions` |
| work/work.json:1232 | tool schema `session_questions` | Enum of the 7 actions; `action` and `project` required |

## End-to-end flow
1. **Plan.** The approved kick-off pack fills `planner.sessions` (src/kickoff.js:298). People can also add sessions by hand (src/planner.js:176) or import a plan file (src/wsplan.js:42 -> job `import_workshop_plan` -> `wpApply`, line 48). The plan shows in `V.rsplan` (src/requirements.js:31).
2. **Prepare questions.** `prepareQuestions` runs over `V.prepqInput` (src/sessionquestionsview.js:10). Bank questions come from `/qbank/generate` (work/server/_qbankapi.mjs:26), the rules, integrations and job `field_questions` -> `rs_save_questions` (work/server/_dsapi.mjs:84).
3. **Workshop room.** `V.workshop` (src/workshop.js:130) shows the rules questions plus the kept bank questions (`toPrep`, line 18). Notes and statuses go to `workshop_room`.
4. **Live.** The microphone or a paste fills the live box. `runLive` -> `liveAsk` (src/workshop.js:248) marks "likely" questions answered. `wlAnalyse` and `wlSummary` call `/qbank/analyse`. Quick capture (`wsMake`, `wlMake`) makes draft records.
5. **Transcript in, by hand.** Add a file or paste on the Transcripts page (`addTranscript`, src/requirements.js:76) -> `rs_transcripts`, and `extract_findings` is queued when `autoChain` is on.
6. **Transcript in, Clari.** `rsPull` -> job `pull_clari` -> Claude calls `save_transcript` and `save_findings` (work/server/_rsapi.mjs:52, 58). From 21 Nov 2026 it reads the SharePoint folder Transcripts Clari and checks the prepared questions (below).
7. **Transcript in, Teams.** `rsPullTeams` -> job `pull_transcript` (Microsoft 365) -> the same two actions.
8. **Transcript in, other ways.** A transfer of kind transcript (transfer_write -> approval -> `xfImport`, src/transfers.js:67) and the room's Save (`wsSaveTranscript` -> `trSave`) both write the old `transcripts` document.
9. **Findings.** Job `extract_findings` -> `rs_save_findings` (all `open`). When a pull or extract job finishes `done`, the server queues `capture_flows`, `fill_forms` and `draft_brd` (work/server/_jobsapi.mjs:128).
10. **A person confirms.** On `V.rschecks`, `autoAgree` (src/requirements.js:159) confirms promise, ask, usecase and decision findings by itself; the rest go through `rsAsk`, `rsAskSave`, `rsBulk` and `rsDecide`, then `brdDraft.sync`.
11. **Checks.** `rsCheckBrd` and `rsCheckMsa` queue `check_brd` and `check_msa` -> `save_findings` with transcriptId `brd` or `msa`.

## Change of 21 Nov 2026 (this branch)
- `pull_clari` (work/server/_jobs.mjs) keeps its rules (a transcript a person added wins, search only for held sessions without one, progress notes, transcript text is data). It now uses a Clari connector if one exists and otherwise the Microsoft 365 connector: `sharepoint_search` with folderName Transcripts Clari (site SAMAI, Shared Documents) and the person's OneDrive, the daily `clari_calls_YYYY-MM-DD.txt` lists to find the call title and id for a date, `read_resource` to read each match, `save_transcript` with source clari and ref the Clari call id (otherwise the file link). It fails only when neither connector is there.
- After each saved transcript: `session_questions` action live (the last 500 turns), the job summary names the questions that look answered (with the quote) and the ones still open, and the still-open must-ask questions are saved with action `save_questions` (why "Not answered in the <date> session", priority must, a bank category). They arrive as suggestions a person keeps.
- `live_ask` (work/server/_questionsapi.mjs) now gives each still-open question its `priority` and lists must-ask first, so the 30 it shows carry them.

## Gaps (each checked in the code)
- **Two transcript stores, no bridge.** Upload transcript (src/transcripts.js:50), the Workshop room's Save (src/workshop.js:236) and transfer import (src/transcriptimport.js:35) write the old `transcripts` document; `extract_findings`, `pull_clari` and the checks read `rs_transcripts`. No code copies one into the other, yet the toasts at src/transcripts.js:59 and src/workshop.js:239 say Claude will read the transcript for findings.
- **Prepared questions read the old store.** `questionInput` (work/server/_questionsapi.mjs:31) and the browser `input()` (src/sessionquestionsview.js:15) take statements from `transcripts.candidates`, not `rs_transcripts`; `analyse()` no longer makes candidates (src/transcripts.js:93), so new projects have no statements in the rules input.
- **The connector's questions lack the bank.** `get_prepared_questions` and `live_ask` use the rules only; the kept `rs_questions` bank is merged only in the browser (`toPrep`, src/workshop.js:18). So the question check in `pull_clari` judges the rules' questions, not the bank questions the team kept.
- **`allowedDocs` do not match the recipes.** `pull_transcript` allows `['planner','transcripts']` but its recipe reads `rs_transcripts`; `extract_findings` does not list `rs_questions`, which its recipe reads. `get_document` does not enforce `allowedDocs`; it is an instruction in the brief only.
- **No server-side chain to `extract_findings`.** `rs_save_transcript` queues nothing; only the browser's `addTranscript` (src/requirements.js:82) does. The pull recipes do the findings step themselves.
- **`autoAgree` does no contract check.** It confirms every open promise, ask, usecase and decision by kind alone (src/requirements.js:157-161).
- **Code inside a comment in `syncSessions`.** At src/kickoff.js:301, `d.sessionNotes = r.notes; d.sessionPlanNotes = r.planNotes; F.changed(...)` sit after a `//` comment on the same line, so they never run: the session notes from the pack are not stored by this function.
- **Dead code in `rsBulk`.** src/requirements.js:187-190 cannot be reached (`askForm(...); return;` at line 186).
- **`workshopprep.js` is not used by the session pages,** only by src/msaflow.js.
- **Not checked:** any real Claude run of `pull_clari` against the SAMAI site; whether the Microsoft 365 connector's `read_resource` returns the text of a .docx transcript with speakers and times.

## Earlier review
`docs/reports/VEXA-REVIEW-2026-11-04.md` (Vexa as the base of a call bot): no malware, "copy with changes" at best; it costs hosting and cannot run on facilio.work, Teams and Clari transcripts already cost nothing extra, so nothing of Vexa was copied and where it would run is left to the user.

Not traced: `sessionList` and `visible` in src/workshop.js, `brdDraft.sync`, the body of `design_save_proposals`, the body of `sessionPlan` (src/kickofflogic.js:92).

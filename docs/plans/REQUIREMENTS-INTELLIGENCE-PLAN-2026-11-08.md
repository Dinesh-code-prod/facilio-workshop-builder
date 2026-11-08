# AI Requirements Intelligence: plan (8 Nov 2026)

Brief: a saved, AI-prepared question bank per project (Questions tab) shared with the Workshop room, where a live assistant tracks the call. No new paid service, no meeting bot, no new backend.

## What already exists (read from the code)
- `work/server/_sessionquestions.mjs` (one copy, also in the browser): rules that work out questions from scope, requirements, open questions and MSA exclusions (`prepareQuestions`), and `liveAsk` (which questions a piece of transcript seems to answer, by words). Not saved, no AI, no categories.
- `src/workshop.js` Workshop room: questions per module with status (to ask, asked, answered, skipped) and a note, saved in the project document `workshop_room`; quick capture makes DRAFT requirement, decision, action or open question; a pasted or loaded transcript is matched with `liveAsk`.
- AI layer `work/server/_ai.mjs` (platform model or the owner's Claude key, one provider-neutral call, usage counted) and `aiJSON` in `api.mjs`. Documents: `msa_text` (pages), `kickoff_pack`, `workshop` (requirements), `rs_transcripts` (imported client documents).

## What is built
1. **Question bank**: project document `rs_questions` (team only, readable by Claude through `get_document`): `{ items: [{ id, text, category, module, why, ref, priority, expected, notes, source, history }], summaries: [] }`. Answer status and the client response stay in `workshop_room` notes (status, note, evidence), so there is ONE status per question for both pages. Pure rules in `work/server/_qbank.mjs`.
2. **Questions tab** (`rsquestions`, Requirement sessions): "Analyse the documents" (AI layer, reads MSA, scope, requirements, client documents; ten categories; every question carries category, module, justification, MSA clause or document reference, priority, expected response), "Add the rules-based ones", add, edit, delete, reorder, categorise, filter. Nothing is applied without a person keeping it: generated questions arrive as Suggested and are kept or dropped.
3. **Shared bank**: the Workshop room reads the bank (merged into its groups), so live matching, statuses and quick capture work on the same questions.
4. **Live assistant** (Workshop room): microphone capture with the browser's speech recognition (free; in Chrome and Edge the audio is processed by the browser vendor's service, so it is optional and says so), or paste and load as before. "Analyse the call" (AI layer) returns a summary, decisions, assumptions, dependencies, actions, clarifications, suggested follow-ups and which prepared questions were answered, with quotes; the consultant chooses what to keep. The assistant never speaks or interrupts.
5. **After the meeting**: "Summarise the meeting" stores a summary (history kept), proposes status and client-response updates, unresolved questions and new questions, and lists answered questions that are not yet in a requirement, each with a button that makes a DRAFT requirement.

## Limits, said plainly
- Speech to text: no open-source engine is shipped. The usable ones (whisper models) are 40 to 150 MB and the site must stay under 50 MB (about 44 MB now), and the browser build allows no outside scripts. The browser's own recognition is the zero-cost route; it hears the microphone only (put the call on speaker, or paste the transcript), has no speaker names and works in Chrome and Edge. A self-hosted transcription endpoint is the next step if the team wants audio to stay inside.
- The AI layer answers within 25 s: document analysis runs in three parallel calls of one question group each.
- No joining of Teams, Zoom or Meet. Matching of answers is by words and by the model's reading; a person decides.
- Out of scope: new connector tools (the connector is at its cap), audio storage (audio is never saved), automatic interruption.

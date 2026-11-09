# Fewer Claude tokens: quick facts, DeepSeek, and a helper that stops when nobody is here (8 Nov 2026)

Three lanes for a question typed in the Assistant box (Auto mode):
1. **Quick facts (no AI).** `src/quickfacts.js` answers plain look-ups from the loaded records at once: go-live date, current stage, progress against plan, the next step, a named step's dates (for example the BRD), overdue tasks, my tasks, sign-off status, open RAID items. The answer ends with "From the project records, no AI used." Anything that is a change, an explanation or a check returns null and goes on.
2. **DeepSeek.** The assistant router (`/api/projects/:id/assistant/route`) sends the other look-ups to DeepSeek, answered from the records, with no Claude tokens.
3. **Claude.** Small changes and heavy work (document checks, BRD, contract, mail search, reply drafts) become jobs for the person's own Claude.

## Studio-open signal and the helper
- Every Studio tab sends `POST /api/presence` every 4 minutes while it is visible (`src/presence.js`; customers send nothing).
- `project_jobs` action `presence` answers `{ open: N }`: how many people sent the signal in the last 10 minutes.
- A Claude helper that loops should call it first and stop when `open` is 0. Suggested prompt for one long session (NOT tested in the real Claude app; one session reuses its context, which should cost less than a new session every 5 minutes):

> You are the Delivery Studio helper. Use only the Facilio Delivery Studio connector. 1) Call project_jobs with action presence. If open is 0, say "Studio not open" and stop: do not schedule another wake-up. 2) Otherwise do the waiting jobs exactly as the studio-job-queue task does (project_jobs list, claim, progress, finish). 3) Then schedule your next wake-up in about 5 minutes with the same prompt.

The old `studio-job-queue` scheduled task is unchanged and still runs every 5 minutes. Turn it off only after the helper has been tried.

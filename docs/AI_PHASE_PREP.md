# AI phase — preparation only (no AI feature is implemented; no external service is called)

## Where the AI phase is described
- `TL_Implementation_Studio_Handoff.md` §6.1 "AI (decision for Dinesh)" and the feature table in §2 (rows marked **AI**).
- The README promises: *"No customer data is sent to external AI or conversion services"* (README lines 78 and 181; transcript analysis is rule-based).
- Earlier instruction in force: add no AI calls until the owner decides.

## Planned AI features (from the handoff) and what already exists without AI
| Planned AI feature | Without AI today |
|---|---|
| Contract facts, legal terms, flags, people, "ask your contract" with page cites | MSA scope extraction (rule-based, now with OCR and page/section references), Know Your Contract (manual entry, deterministic watch-outs) |
| Module packs (about / who uses / in-out scope) | Module brief (manual), learning guide content |
| Onboarding notes per sheet | Onboarding plan from module scope |
| Kick-off pack, kick-off minutes → decisions/actions/risks | Agreements and call findings (manual), minutes (manual) |
| Live workshop assist, trainer brief | Transcript analysis (rule-based, after the session) |
| Plan insights, go-live readiness read, digest polish, nudges | Plan stats, go-live readiness verdict (deterministic), weekly digest (deterministic) |
| OCR of scanned pages | **Done without AI:** bundled tesseract.js, in the browser |

## Dependencies
- A server-side route (`POST /api/projects/:id/ai/<task>`), provider API key in Netlify env vars (never in the browser), Facilio-only access, audit logging.
- Customer / legal approval to send contract text to a provider; a data-handling statement; redaction of money and personal data.
- CSP `connect-src` stays `'self'` because calls go through our function; function timeout limits (Netlify) for long contracts → chunking.
- Cost controls: per-project quotas, model tiering (quick / default / complex), caching of results in `project_docs`.

## Risks
Confidentiality of contract text; wrong or invented facts (needs "cite the page or say unknown" and human review before anything reaches the BRD); cost; vendor outage (every feature must keep its no-AI path); changing the README's no-AI promise.

## Options
1. **Stay rule-based** (current). Lowest risk; the non-AI parity items above are mostly delivered.
2. **Opt-in, per project, server-side AI for a short list** — contract Q&A with page citations, minutes extraction, go-live checklist draft — behind a project setting that is off by default, with an audit log and a visible "AI-drafted, unreviewed" tag.
3. **Full Studio parity.** Largest scope and risk; not recommended before option 2 proves its value.

## Recommendation
Option 2, starting with *minutes extraction* and *contract Q&A with citations* (both reviewable, both reuse the new page references), only after you confirm (a) the provider, (b) that customer/legal accept sending contract text, and (c) a monthly cost cap. Until then nothing in the app calls an AI service.

# Step 1 design: the push and pull engine (4 Nov 2026)

Design only, nothing built. Produced by an architect review of the real code (api.mjs line numbers from 4 Nov 2026 will drift). Source requirements: roadmap E4 and E11. Platform facts: [CONNECTORS-2026-11-04.md](CONNECTORS-2026-11-04.md) section 13.

## Where it lives
- `src/` is not copied to the server, so the pure logic lives in `work/server/` like `_portfolio.mjs` (test: `tests/portfolio.mjs`), not like `src/msalogic.js`. `build.mjs` copies `work/server/*` to `dist/server`; `api.mjs` already imports `_ai.mjs`, `_portfolio.mjs`, `_skills.mjs` and now `_taskwatch.mjs`.
- Recommended: **one module imported by `api.mjs`**, not a second platform function (a second function would need its own request state and copies of `me()`, `projectAccess()` and the dispatcher). `_transfer.mjs` exports `installTransfer(deps)`; `api.mjs` calls it before `dispatch` and merges the new tools into `CONNECTOR`. Tools arrive through the existing `POST /api/` with `x-work-mcp-tool`.

## Data model
Do not use the generic items store (its PUT lets a page write any `status`). Use own collections that are not in `KINDS`, so customers can never list them:
- `xf.<pid>`: one head record per transfer, under 60 KB. Key = `x-` + first 32 hex of sha256 of the idempotency key, so a duplicate check is one `dbGet`.
- `xfd.<pid>` / `xfdp.<pid>`: one payload per version, key `<id>.<n>`, saved with the existing `save()` (gzip and split past 100,000 bytes). Versions are immutable; version 1 is the original source and is never rewritten or deleted. Binary bytes go to `ctx.files` and the version stores the file id.
- Head fields: `id, dir (pull|generate|push), kind (msa, transcript, org_config, brd, ...), source{system,ref,label,etag}, dest{system,ref,label}, scope, by, createdAt, updatedAt, status, ver, approvedVer/By/At, versions[{n,at,by,sha,size,store,fileId,validation}] (max 30), error{code,msg,at}, log[{at,by,from,to,note}] (max 40), pushes[{ver,destRef,destEtag,receipt,at,by}], pushIntent{ver,dest,nonce,exp}, failedFrom`.
- `audit()` is best effort, so the in-record `log` is the authoritative trail and `audit()` mirrors it.

## Status machine (the ten statuses of E4)
Roles come from `projectAccess`. Customers are refused. Claude has **no approve tool**, so it can never approve its own work.
| From | To | Who |
|---|---|---|
| Not Retrieved | Retrieving | editor |
| Retrieving | Retrieved, Failed, Requires Attention | editor (Claude as that person) |
| Retrieved | Draft Generated, Awaiting Review, Requires Attention | editor |
| Draft Generated | Awaiting Review, Requires Attention | editor |
| Awaiting Review | **Approved**, Draft Generated (changes requested), Requires Attention | approve and request changes: owner only |
| Approved | Pushed, Draft Generated (an edit reopens), Requires Attention | Pushed: editor with a valid push nonce and evidence |
| Pushed | Synchronized, Failed, Requires Attention | Synchronized only if the read-back sha equals the approved sha |
| Failed | the status in `failedFrom` | editor |
| Requires Attention | any earlier status | owner, with a note |
| Synchronized | Requires Attention, Retrieving (a new pull makes a new version) | editor |

## Pure module first: `work/server/_transfer.mjs` + `tests/transfer.mjs`
Exports: `STATUSES, DIRS, canonKey, decideStore(existing, incoming)` (create | duplicate | newVersion | conflict), `newRecord, addVersion, transition(rec, to, {role,by,now,note,evidence,nonce,sha})`, `allowedNext, pushGuard, view(rec, role)` (adds `next[]` so the page never copies the rules), `summarise`.

## Routes and tools (later slices)
Routes under `/api/projects/:id/transfers`: list, get (`?ver=`), begin (idempotent), add version, transition. No DELETE.
Tools: `transfer_list`, `transfer_get`, `transfer_begin`, `transfer_store` (content or file id, source etag, validation, baseVersion), `transfer_file_url` (presigned upload, 16 MB per chunk, then `/files/:fid/complete`), `transfer_submit`, and three tools with `confirm: true`: `transfer_push_begin` (records a push intent with a nonce valid 15 minutes, so the person confirms **before** Claude touches the destination), `transfer_report` (needs the nonce and a receipt; moves to Pushed or Failed), `transfer_verify` (read-back sha; moves to Synchronized). `confirm: true` is a client-side prompt; the nonce is the server-side guard.

## Duplicate and overwrite rules
- Idempotency key: `dir|kind|source.system|source.ref|dest.system|dest.ref|scope` (the project is implicit in the collection).
- Same key and same sha: return the existing record, no write. Same key and new sha: version n+1; the approved version stays readable and an Approved or Pushed record goes to Requires Attention.
- A push needs `ver == approvedVer`, a matching nonce and the destination etag Claude read just before. Anything else goes to Requires Attention. Never delete, never silently replace.
- Concurrency: `withLock('xf.<pid>.<id>')` plus `baseVersion` returning 409.
- Folder mirror: Claude Code gets files through `transfer_get` (signed URL) into `<project>/<kind>/<id>-v<n>.<ext>`. A local edit returns only as a NEW pull version carrying `baseSha`; if `baseSha` is not the current head the record goes to Requires Attention. Studio is never overwritten by the folder.

## First visible slice
`src/transfers.js`: one view at `#/p/<id>/transfers` (no menu change, the UI revamp comes last): a table (what, source to destination, status chip, version, who, when, error) and a drawer (versions, validation, log). Buttons only when `rec.next` allows them (Approve, Request changes, Resolve, Retry). One Open in Claude entry through `claudehand.js`.

## Build order, each slice with its test
1. `_transfer.mjs` + `tests/transfer.mjs` (every from, to and role; no Pushed without evidence; no Synchronized unless the sha matches; owner-only approval; record under 60 KB at 30 versions). Add to the `npm test` chain.
2. Storage and routes + `tests/transfer_routes.mjs` (customer 403, viewer and sub admin refused, duplicate returns the same id, version 1 intact after version 2, 5 parallel begins give 1 record, a payload over 100 KB splits). Add the `xf.*` collections to the project delete list, not the clone list.
3. Connector tools and `work.json`, plus `CONNECTOR_HELP`, `_skills.mjs`, `claude-connector.md` and the test tool counts (CLAUDE.md rule). Test the nonce and confirm flow.
4. Binary path: `transfer_file_url` + complete, with a mocked upload URL.
5. Page `src/transfers.js` with fixture render tests.
6. Folder-mirror conflict rule (`baseSha`), pure first.

## Risks and not verified
- No conditional write on the platform, so two server instances could still race; the lock covers one instance only.
- Not verified: a presigned PUT from Claude Code, the size of a tool result that carries a payload, and that the platform accepts `_`-prefixed helper files beyond what `_ai.mjs` already proves.
- The Studio cannot see Microsoft 365, so Pushed and Synchronized are Claude-reported; label the evidence as such and never show them from a mock.

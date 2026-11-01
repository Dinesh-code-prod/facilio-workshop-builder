---
description: End of a session, or tokens running low. Save everything so the other Claude account can carry on
---

Write down exactly where we are, so the other Claude account (or a later session) can continue without asking me anything.

1. `git status --short`. If code changed, run `npm test`.
2. Commit finished work with a message that says what and why, and push it: `git push origin main`, then `git push origin main:feat/simpler-studio`. If something is half-done, commit it to a branch `wip/<short-name>` and push that branch instead, so the only copy is never an uncommitted file. Say so in HANDOFF.md.
3. Rewrite `HANDOFF.md` (replace stale content, keep it under 60 lines): the date and time, what was done this session, what is in progress (files, what remains, which branch), the next steps in order, anything I must verify myself, and any decision or preference I gave.
4. Commit and push `HANDOFF.md`.
5. Tell me the commit hash and a one-line summary, and say whether the live app is behind the code.

Never discard changes, and never put secrets or tokens in any file.

---
description: Start of a session. Compare this folder with GitHub, show what the other Claude account left, read HANDOFF.md
---

Bring me up to date before any work starts. Keep the output short.

1. `git fetch origin`, then `git status -sb` and `git log --oneline -8 origin/main`.
2. Ahead or behind: `git rev-list --left-right --count origin/main...HEAD`. If the folder is behind and clean, run `git pull --ff-only`. If there are uncommitted changes and it is also behind, do not pull; tell me and ask.
3. List what the other session left: uncommitted files (`git status --short`), commits not pushed (`git log --oneline origin/main..HEAD`), and any `wip/*` branches on GitHub (`git branch -r | grep wip`).
4. Read `HANDOFF.md` and `docs/operations/DEPLOYS.md`. Tell me: what was last done, what is pending, and whether the live app is behind the code (the last deployed commit against HEAD).
5. Check the local preview (`curl -s -o /dev/null -w "%{http_code}" http://localhost:4173/`). If it is down, say how to start it (see CLAUDE.md).
6. End with three lines: where things stand, anything that needs my decision, and the suggested next step.

This command only reads. Never reset, discard, delete or overwrite anything.

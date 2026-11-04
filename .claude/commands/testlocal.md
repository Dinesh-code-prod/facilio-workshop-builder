---
description: Build Delivery Studio and run it on localhost:4173 (restart it if it is already running) so the latest code can be tried
---

Run Delivery Studio locally from this folder. Do the steps one at a time and keep the answer short.

1. Check what is on port 4173: `netstat -ano | grep ":4173 .*LISTENING"`. If something is listening, it is the old preview: stop that process only (`taskkill //PID <pid> //F`), because the preview loads `work/server/api.mjs` once at start and would miss server changes.
2. Build: `node build.mjs`. If it fails, show the error and stop (a failed build leaves `dist/` empty).
3. Start the preview in the background: `node tests/ui/devserver.mjs 4173` (use the Bash tool with `run_in_background`). Data is kept in `tests/ui/.devdata.json` between runs.
4. Check it answers: `curl -s -o /dev/null -w "%{http_code}" http://localhost:4173/` must print 200.
5. Tell me: "Local is running: http://localhost:4173/?nointro" (add `?intro=1` to see the opening animation), the build file name printed by step 2, and anything that failed.

Do not push, deploy or change code in this command.

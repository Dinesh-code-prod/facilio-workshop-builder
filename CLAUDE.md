# Facilio Delivery Studio: notes for any Claude session

This project is worked on from two Claude accounts (personal and office), from the same folder (`D:\facilio\facilio-workshop-builder`) and from claude.ai/code. Nothing lives only in one account's chat: the repository on GitHub, `HANDOFF.md` and `docs/operations/DEPLOYS.md` carry the state between sessions.

## Starting a session
Run `/sync` first. It compares this folder with GitHub (`origin/main`), lists any uncommitted or unpushed work left by the other account, reads `HANDOFF.md`, and shows whether the live app is behind the code. Never discard another session's changes (no `git reset --hard`, no checkout of files) without asking.

## What to build next
Open `docs/ROADMAP-REQUIREMENTS.md`: Part A is the pending and not-checked list, Part B the master requirement in build order. Take one item at a time, tick it when done, and log the deploy number there.

## While working
- Finish a change, run `npm test`, commit, and push to `main` and `feat/simpler-studio` (`git push origin main`, then `git push origin main:feat/simpler-studio`). If the user said to wait until they have tested, commit locally and write "not pushed yet" in `HANDOFF.md`.
- Do not run two sessions on the same folder at the same time.
- **Keep the Claude integration in step.** Whenever a feature is added or changed, update the Claude side in the same piece of work: the connector tools (`work/work.json`, the tool object in `work/server/api.mjs`), the hand-off prompts (`src/claudelogic.js`, `src/claudehand.js`), the Open in Claude buttons on that page, the AI tasks, the skills text (`work/server/_skills.mjs`) and the Team Guide and Claude setup pages. A new page or record type needs a way for Claude to read it through the connector and a button that opens Claude with the short connector prompt. Run `node tests/claude_launch.mjs`, `tests/connector_skills.mjs` and `tests/ui/claude-handoff-check.mjs` afterwards. Never claim a real Claude app result without testing it there.
- Git has no identity on this machine. Commit with `git -c user.name="Dinesh R" -c user.email="dinesh.r@facilio.com" commit ...` and end commit messages with the Co-Authored-By trailer the session gives.

## Ending a session, or when tokens are running low
Run `/handoff`. It commits and pushes finished work, puts half-done work on a `wip/<name>` branch (never leave the only copy uncommitted), and rewrites `HANDOFF.md`. If tokens may run out suddenly, run it early; it is cheap.

## How the project works
- Plain JavaScript single-page app: `src/*.js` is bundled by `build.mjs` (esbuild) into `dist/`. Views register in `FWBViews`, actions in `ACT.<name>` (wired with `data-act` and `data-change`).
- Server function: `work/server/api.mjs` (plus `_ai.mjs` for AI, `_portfolio.mjs` for admin health). `work/work.json` lists the tools Otto (the Teams bot) can call.
- CSS: styles are layered in the order listed in `build.mjs`; later layers win. Overrides use `body ...:not(#_):not(#__)` with `!important`. `depthlayer.css` is the last layer.
- Preview locally: `node build.mjs`, then `node tests/ui/devserver.mjs 4173` and open http://localhost:4173/?nointro (`?intro=1` forces the opening animation). Local data is in `tests/ui/.devdata.json` (not committed).
- Tests: `npm test`. Also `npm run test:load` (100 projects, 100 people, AI limits) and `npm run test:scale`.
- CI: `.github/workflows/test.yml` runs `npm test` and the build on every push.
- Deploy: `/deploy`, or see `docs/operations/DEPLOY.md`. The site must stay under 50 MB extracted (about 41 MB now).

## Look and feel (the user's rules)
- **Fluent 2 is the core of the UI** (user, 7 Nov 2026; https://fluent2.microsoft.design/). The dictionary is `docs/reference/FLUENT2-SPEC-2026-11-07.md` and the code is `src/fluent.css` (the last style layer; it retunes the `--th-*` tokens). New UI uses Fluent type (Segoe UI, Body 1 14/20, semibold headings, sentence case), radius 4/8/12, shadows 4/8/16/28/64, neutral greys, 32 px controls, focus as a thicker stroke, motion 100 to 200 ms. Do not add new gradients, clay edges or custom shadows; use the `--fl-*` tokens.
- Facilio navy #1D1A5E, blue #1570EF, pink #E5197F and sky #8DB8FF are brand accents only (blue = primary action, links, focus; navy = strong text; pink rare). No violet or purple, no neon or glow.
- Old decoration is being removed file by file (`node tests/ui/css-legacy-audit.mjs` shows what is left). Never bring back the clay and depth layers.
- Everything the customer and the team see must look neat and uncrowded. Keep answers short and in plain words; say what was not checked.

## Things that go wrong here
- On Windows the Bash tool can mangle backslashes and newlines inside heredocs that contain quotes. Write scripts with the Write tool and run them with node.
- `node build.mjs` empties `dist/` first, so a build that fails leaves `dist/` empty; fix and rebuild.
- Never read `.credentials.json` or print secrets. Never sign in for the user, and never enter their credentials.
- facilio.work is deployed only through its connector. The app's review is pending, so only the owner and collaborators can open the live app.

# Two guide films: Claude setup, and the Team Guide in one film split by tab (26 Nov 2026)

The user, 26 Nov 2026: the first films only repeated what the setup page already says. Read the repository docs and the code, then make two films:

1. **Claude setup**: the whole setup, exactly as Delivery Studio shows it.
2. **Team Guide**: one film of 5 to 6 minutes. It covers how a person creates a project, what every sidebar tab does and how it helps, and the Otto messages in Teams. It is split into short films, one per sidebar group.

This replaces the Tour pilot. It extends `TEAM-GUIDE-FILMS-PLAN-2026-11-25.md`, which still holds the engine, the capture tool and the size rules.

## Sources (read 26 Nov 2026)

- **Claude setup:**
  - `src/claudesetup.js` (tabs Start here, 1. Connect Claude, 2. Waiting jobs, 3. Facilio skills, 4. How it works; the 10 checklist pieces; the troubleshooting list);
  - `src/claudewatch.js` (the setup message and what Claude checks);
  - `src/implskills.js`, `src/teamhelp.js`;
  - `docs/integrations/claude-connector.md`, `CLAUDE-INTEGRATION.md`, `CONNECTORS-2026-11-04.md`.
- **The menu:** the live sidebar of the demo project (`V.navBase()`, 53 pages in 19 groups, six parts) and `src/shell.js` (NAV, New project). The page text comes from `src/teamhelp.js`, `src/introhub.js` and each page's header. `docs/01` and `docs/03` describe an older menu and were not used for it.
- **Otto:** `work/server/_notify.mjs` (EVENTS), `_taskwatch.mjs`, `_missed.mjs`, `_nudges.mjs`, `_msgfmt.mjs`, `work/work.json`.

### Where the sources disagree: the films follow the setup page as it is today
- **Job queue frequency:** every 30 minutes on the setup page and in the setup message. `teamhelp.js` still said 3 minutes, plus a "Delivery Studio chat" task every minute. **Fixed in teamhelp.js** to match: the watcher every 15 minutes, the job queue every 30 minutes.
- **Where the skills live:** the repositories are on Bitbucket; GitHub Desktop is only the client. **Fixed in teamhelp.js**, which said "live in GitHub".
- **Checklist size:** 10 pieces, not nine. The old film said nine.

## Film 1: Claude setup (`claude-setup`, 3:00)

Real Studio screens: the Claude setup tabs, with a setup report from Claude filled into the demo data so the checklist shows Ready and Missing rows. The Claude app side is drawn plainly: the Code tab, a pasted message, Claude's questions. It is not a copy of any vendor's screen.

| Time | Scene | Shows | Says (in short) |
|---|---|---|---|
| 0:00 | Why Claude | BRD draft waiting for review | Claude reads and drafts; you review and approve; Claude cannot approve anything |
| 0:14 | Where | Help > Claude setup, Start here | One page, five tabs; start at Start here |
| 0:22 | 1. Install these first | Start here, step 1 | Windows: Claude app, Python 3 (tick "Add python.exe to PATH"), Node.js LTS, Git. Mac: Claude app, `xcode-select --install` (Python and Git), Node.js |
| 0:44 | 2. Ask for access | step 2 | Your lead adds you to the project, and gives your Bitbucket account read access to facilio-impl-ai-skills |
| 0:54 | 3. Paste the setup message | Copy the setup message; the Claude app, Code tab, new chat | One message sets up everything; Claude asks before installing anything and never asks for passwords |
| 1:20 | What Claude checks | the 8 checks in order; the Add custom connector card | Connector "Facilio Delivery Studio" at https://mcp.facilio.work/facilio-delivery-studio (sign in with Facilio); Microsoft 365 connector; the Facilio skills; the watcher (every 15 min) and the job queue (every 30 min) |
| 1:48 | 4. Check your list | the 10-piece checklist | Missing pieces are red with what to do; fix, paste again, until all 10 are ready |
| 2:08 | Waiting jobs | tab 2 | Buttons only write a job; the watcher answers in seconds, the queue every 30 min; first aid: "Do the waiting Delivery Studio jobs" |
| 2:22 | Facilio skills | tab 3 | The toolbox: FTR, UAT guide, configuration; fetch the repos the days you work |
| 2:34 | Every day | the connector line, Open in Claude, the Assistant, Transfers | How to check it worked (connector_help); where Claude's work comes back; Transfers to approve what Claude read |
| 2:48 | Stuck? | tab 4, troubleshooting | No Add custom connector, project not found, a job that waits: the page lists the fix; else ask your lead |

## Film 2: Team Guide (`team-guide`, 5:30, 19 chapters)

Each chapter is also a film of its own (`tg-<chapter>`, 10 to 30 s), drawn from the same code and screens. The master film is the chapters back to back.

Every page step works the same way:
1. The real page, with an amber ring on its entry in the sidebar.
2. A zoom into the page.
3. A blue ring on its main action.

The stage's pages are listed beside the screen, with the current one highlighted. The caption says what the page does and why it helps.

| # | Chapter (sub-film) | Pages shown | Time |
|---|---|---|---|
| 0 | Welcome (`tg-welcome`) | projects home | 0:00 |
| 1 | Create a project (`tg-create`) | New project drawer: name, customer, currency, CMMS or AI agents, the MSA or the OneDrive folder, people; what Claude does next; or start from a contract in Transfers > Holding; the demo project | 0:12 |
| 2 | Home (`tg-home`) | Dashboard, Project cycle | 0:36 |
| 3 | 1. Project introduction (`tg-intro`) | Contract intake; Kick-off, plan and schedule | 0:52 |
| 4 | 2. Requirement sessions (`tg-sessions`) | Data onboarding, Workshop room, Transcripts | 1:12 |
| 5 | 2. Process & checks (`tg-checks`) | Process whiteboard, Checks & validations | 1:32 |
| 6 | 2. Module design (`tg-design`) | State flow builder, Forms & templates, Roles & access, Notifications | 1:44 |
| 7 | 3. Solution design (`tg-solution`) | Solution, Mockup (Meteor), KPIs & SLA | 2:02 |
| 8 | 3. BRD & sign-off (`tg-brd`) | BRD Draft, Governance & RAID, Change Requests | 2:18 |
| 9 | 4. UAT & FTR (`tg-uat`) | FTR Report, Build & test tracker, KPI Workbooks | 2:38 |
| 10 | 5. Training guides (`tg-training`) | Guides & Videos | 2:54 |
| 11 | Tasks & mail (`tg-tasks`) | Tasks, Customer mail, Support Desk, Transfers, Go-live & hypercare | 3:04 |
| 12 | 8. Project handover (`tg-handover`) | Handover & Closure, Solution document | 3:32 |
| 13 | Reports and notes (`tg-reports`) | Status report, Traceability & quality, Notes & Links, Documents & Files | 3:44 |
| 14 | Share with the customer (`tg-customer`) | Preview as customer, Customer View, Show Facilio, Customer portal (off until switched on in Tabs & Layouts) | 3:58 |
| 15 | Help, Claude and settings (`tg-help`) | Team Guide, Claude setup, Project Settings, Tabs & Layouts | 4:16 |
| 16 | Otto in Teams (`tg-otto`) | the morning list; New task for you (Done, Move, My tasks); Late; Milestone due in 2 days; asking Otto | 4:32 |
| 17 | The Assistant (`tg-assistant`) | Ask about the project; hand work to Claude; drafts wait for you | 5:00 |
| 18 | Your first day (`tg-firstday`) | demo project, set up Claude, the film for your stage | 5:14 |

Otto's messages are drawn as message cards in the house look; there is no Teams screenshot. They follow `_msgfmt.mjs`: a title, a bold heading, short sections, one "What to do" line and buttons. Teams messages are on only when the app owner switches them on, and the film says so.

## Where they show

- **Team Guide, top:** the Team Guide film ("Watch first"). It replaces the Tour.
- **Team Guide, Set up Claude section, and Claude setup > Start here:** the Claude setup film.
- **Each Team Guide stage section:** that stage's chapter film or films. Stage 1 also keeps the two deep dives, Contract intake and Plan re-planning.
- **The Videos section:** the two main films large; every chapter as a small poster.

## Size

The screens are shared: one pool `public/films/team-guide/` at JPEG quality 32. The chapters reuse the pilots' screens (contract-intake, plan-replan) and the Tour's, so the Tour film's code goes but its screens are moved into the pool. The less-used pages (Support Desk, Facilio tools, Templates, the customer portal pages) are named in the stage list but get no screen of their own. Target: about 1.2 MB new, `dist/` under the 48 MB warning.

## Build steps

1. Capture: `tools/film-shots/team-guide.mjs` (one shot per page, made from the live menu) and `tools/film-shots/claude-setup.mjs`, on a copy of the local data.
2. Kit:
   - `slice(master, id, title, t0, t1)` registers a chapter as its own film;
   - `screens()` accepts `dir/name` to reuse another film's screens;
   - the player loads a chapter from its master's file (the 6th field of `V.FILMS`).
3. Films: `public/films/team-guide.js` (data-driven: chapters, pages and captions) and a new `public/films/claude-setup.js`.
4. Team Guide: posters as above; fix the drifted job-queue and Bitbucket text.
5. VideoHub: both films in their folders, then `hub_live`, and stop for the user's notes. No render.
6. `npm test` (`tests/film_player.mjs` checks every film and chapter), commit, push to PR #41.

## How it was built (26 Nov 2026, after the user's review while it was being made)

- **Show, don't tell** (user: "go through the exact location, show mouse animation there, show me where they have to click and what it does"). Both films are screen recordings drawn as code (kit: `recording()`):
  - the real Studio screen fills the frame;
  - the mouse moves to the exact sidebar entry or button and clicks;
  - the screen that the click opens fades in;
  - a few words sit beside the mouse.

  Each group's pages were captured with the sidebar at the same place, so the next tab is clicked where it really is.
- **The Team Guide is video-first** (user: "instead of paragraphs, video ... in hierarchical order as per each and every tab"):
  - the page shows the Team Guide film and the Claude setup film on top;
  - then the project's own menu (part > group > tab), each tab with its clip (`tg-<page id>`, 5 to 12 s);
  - then Create a project, Contract intake and Plan re-planning, the customer preview, the Assistant and Otto, where they belong;
  - the written guide is kept, folded under "The written guide".
- **Otto** (user: "create UI like this same and match with project used in guide"): Otto's Teams chat is drawn in its own layout (your message, Otto's answer with bold labels and lists, the tools line, the message box). It uses the demo project's real data: its 14 tasks, the 3 overdue ones, go-live 22 Jan 2027. The user's own screenshots were used only as the model, so no real customer data is in the film.
- **Lengths:** the Team Guide film is 5:58 with 18 chapters and 45 clips; Claude setup is 2:22 with 8 clips. The Tour pilot is gone.
- **Size:** screens are WebP (quality 30, about 30 KB each). Team Guide 1.5 MB, Claude setup 0.4 MB, the two pilots reused; `dist/` is 47.5 MB.

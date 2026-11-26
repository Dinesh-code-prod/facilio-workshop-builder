# Team Guide films: a short film for every part of Delivery Studio (25 Nov 2026)

The user asked for guide films for every part of the Studio, the whole tour included. Each film is built from the real Delivery Studio screens, so what people see in the film is what they see in the app. Each film explains why every step matters, in Facilio terms, and keeps its written guide alongside. Films play **on the page itself**: a poster in a Facilio gradient; one click plays it in place (user, 25 Nov 2026: "let the video be staying in the same page ... click and instantly the video gets played"). Nothing pops up over the page. This extends `CLAUDE-SETUP-VIDEO-PLAN-2026-11-25.md` from one film to all of them.

## How a film is made (the engine, already shipped with Claude setup)

A film is code, not a video file. `public/films/<id>.js` draws second *t* of the film on a 1280x720 canvas as a pure function of *t*, over a few real Studio screens (`public/films/<id>/*.jpg`). The shared kit `public/films/kit.js` holds what every film uses:

- the house colours and easing;
- `screens(id, files)`: `load(base, srcs)` for the screens, `shot` (a screen in a window frame, zoomed toward a box), `walk` (zoom to each step's box in turn and ring it);
- `ring`, `cursor`, `callout`, `title`, `tick`, `windowBox`;
- `register({...})`: the frame around every scene (the Facilio mark, chapter dots, a caption band that grows to two lines for a long caption).

`src/filmplayer.js` is the player: `V.filmCard(id)` draws the poster, and a click turns the poster into the player in place. The player has play/pause, scrub, chapters (the film's scenes), full screen, keyboard, Download (one offline HTML file) and Save as video (WebM recorded by the browser). One film plays at a time. `V.FILMS` lists every film with its title, one line, length and gradient tone.

Ring colours mean the same thing in every film: **blue** = press this, **amber** = look at this, **green** = done or checked, **red** = a problem to settle.

## The catalogue (16 films)

| # | Film (id) | What it shows, and why | Real screens to capture | Watch poster sits in | Length |
|---|---|---|---|---|---|
| 1 | **Tour** (`tour`) **pilot, built** | Projects home, a project's Home (phase, three numbers, Do next), the menu in delivery order, Claude drafts and you approve, the Assistant, the customer preview, the Team Guide and Guide me | projects, home, stage, brd, assistant, guide, customer | Team Guide, top ("Watch first"); Videos | 1:40 |
| 2 | **Contract intake** (`contract-intake`) **pilot, built** | Add every contract document, verify, Analyse contracts, where the documents disagree (quoted), questions for the sessions, a later contract opens a change request | empty, docs, analysed, disagree, asked | Team Guide stage 1; Videos | 1:20 |
| 3 | **Kick-off, plan and schedule**: plan re-planning (`plan-replan`) **pilot, built** | The plan timeline; edit dates in the grid; dependent tasks follow; "Why?" on every change; Undo; the reason log; baseline and slip; Export | plan, grid, why, log, export | Team Guide stage 1; Videos | 1:26 |
| 3b | Kick-off deck (`kickoff`) | Build the kick-off deck from the contract, present it, record attendance, import a reference | kickoff deck, present mode, attendance | Team Guide stage 1 | ~1:00 |
| 4 | **Requirement sessions** (`sessions`) | Workshop plan, the Workshop room on a live call (questions one by one, Must), transcripts and what was promised and asked | workshop plan, room, transcripts | stage 2 | ~1:20 |
| 5 | **Process & checks** (`checks`) | Process whiteboard with the customer, Checks & validations: confirm several together with a solution note | whiteboard, checks list | stage 2 | ~1:00 |
| 6 | **Module design** (`modules`) | System modules and the Form Builder, the State Flow Builder, roles and notifications | modules, form builder, flow builder, roles | stage 2 | ~1:20 |
| 7 | **Solution & BRD** (`brd`) | Solution cards per module, Ask Claude to change one, the BRD drafted from confirmed requirements, review parts, approval, Word export | solution, brd, review parts, export | stage 3 | ~1:30 |
| 8 | **Governance & change requests** (`governance`) | Sign-offs, RAID, minutes; anything outside the signed scope is a change request, never a silent change | governance, RAID, change requests | Run the project | ~1:10 |
| 9 | **UAT & FTR** (`uat`) | UAT board, draft test cases from the BRD, walkthroughs, issues, the FTR report drafted like the BRD | UAT board, test cases, FTR | stage 4 | ~1:30 |
| 10 | **Training guides** (`guides`) | Ask Claude for a user guide, UAT guide or training guide; the guide builder; video to guide | guides list, builder, video to guide | stage 5 | ~1:10 |
| 11 | **Tasks, mail & support** (`tasks`) | One task register (list or board), Auto tasks, customer mail turned into tasks and reply drafts, tickets | tasks board, mail inbox, tickets | Run the project | ~1:10 |
| 12 | **Go-live, hypercare & handover** (`golive`) | Go-live verdict and checklist, hypercare issues, handover and closure, the solution document | golive, hypercare, handover | stages 6 to 8 | ~1:20 |
| 13 | **Reports** (`reports`) | Dashboard, weekly status report and monthly report from live records, export | dashboard, WSR, monthly | Run the project | ~1:00 |
| 14 | **Claude & connections** (`claude-setup` built; `claude-work` next) | Set up Claude (built). Next: Open in Claude, Ask Claude, waiting jobs, Transfers (approve what Claude read), the Assistant | claude setup, transfers, assistant | Set up Claude; Videos | 1:50 + ~1:10 |
| 15 | **Customer view** (`customer`) | Preview as customer, the customer menu, Learn & Prepare, module guides with contract questions, the portal | customer preview pages | Working with the customer | ~1:00 |
| 16 | **Admin** (`admin`) | People and roles, Tabs & Layouts, the portfolio health view, connectors | admin pages | Admin help; Videos | ~1:10 |

## Size budget

The app must stay under 50 MB extracted (facilio.work's cap, measured like `du -sm dist`); it was about 46 MB with the films engine. `node build.mjs` now prints the size of `dist/`, warns above 48 MB and fails above 50 MB.

- Film code: 5 to 10 KB a film. The kit is 9 KB, shared.
- Screens: JPEG 1280x720 at quality 38 to 50 is 45 to 75 KB each (WebP was tried: only 20 to 25% smaller, not worth a second format).
- The pilots came out heavier than the first guess of 150 to 250 KB: see "Status" for the measured sizes.
- **Rule for the other 12:** at most 4 screens each at quality 38 (about 200 to 250 KB). Reuse a screen another film already ships where it shows the same page. That keeps all 16 films near 3.5 MB, so `dist/` stays under the 48 MB warning. If a film needs more, drop a screen elsewhere first.

## Pipeline, per film

1. **Storyboard** (in the film file's header comment, or a few lines in the PR): scenes, what each one points at, and why it matters in Facilio terms. Captions say what to press *and why* in one or two short lines.
2. **Capture**: write `tools/film-shots/<id>.mjs` (the shot list: page, any demo data to set up, where to scroll, the boxes to point at). Then run it on a **copy** of the local data, because shots may add a contract or move a date:
   ```
   node build.mjs
   cp tests/ui/.devdata.json <scratch>/devdata.json
   node tests/ui/devserver.mjs 4391 <scratch>/devdata.json
   PW_CHANNEL=msedge node tools/film-capture.mjs <id> http://localhost:4391
   ```
   Screens land in `public/films/<id>/` and the boxes in `tools/film-shots/<id>.pos.json`. A shot list that changes data (a date) is not repeatable on the same copy: start from a fresh copy.
3. **Code**: `public/films/<id>.js` on the kit (copy a pilot). Add the film to `V.FILMS` in `src/filmplayer.js` and put its poster where it belongs in the Team Guide (`STAGE_FILMS` in `src/teamhelp.js`, or a `V.filmCard(id)` on the page itself).
4. **VideoHub notes**: copy the kit, the film and its screens to `D:\VideoHub\films\<id>` (a `film.js` wrapper like the pilots'), call `hub_live`, and let the user leave notes on the frames. Fix the notes in the code only; no render to check a fix.
5. **Ship**: `npm test`, the build (size line), commit, PR. Render a video only when the user asks.

## Where the films show

- **On the page itself**, as a poster in a deep Facilio gradient (blue for tours, violet for Claude, teal and pink for stages). A click plays the film in place; Close brings the poster back.
- **Team Guide**: "Watch first: a tour of Delivery Studio" at the top; Claude setup in the Set up Claude section; each stage's films inside that stage (stage 1 has Contract intake and Plan re-planning); a **Videos** section (with its own chip) lists every film, two to a row.
- **Claude setup > Start here** keeps its film, now on the page as well.
- Next, per page: a page's own film as a poster in that page's "More" help fold, so it is one click from where the work happens.

## Status

- Done 25 Nov 2026: plan, the shared kit, the capture tool, the build size guard, films play inline, 3 pilots (Tour, Contract intake, Plan re-planning), Watch posters and the Videos section in the Team Guide. Pilots are open in VideoHub for the user's notes; nothing rendered.
- Measured (code and screens): Tour 357 KB (7 screens), Contract intake 315 KB (5), Plan re-planning 302 KB (5), Claude setup 213 KB (3), kit 9 KB: about 1.2 MB in all. `dist/` is 46.0 MB with them.
- Next: the user's notes on the pilots, then films 3b to 16 in the table's order, one PR each or two at a time.

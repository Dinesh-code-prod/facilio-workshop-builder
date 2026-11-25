# Claude setup video: plan (25 Nov 2026)

The ask (user, 25 Nov 2026):
- One short video on the Claude setup page that people click to watch and can download, instead of reading every step.
- Small: KB, not MB.
- If it works, the Team Guide gets the same treatment later.

## The size budget decides the approach

- The built app is now **46 MB** of the **50 MB** limit (`dist/`, 25 Nov 2026), so about **4 MB** is left for everything to come.
- An MP4 is too heavy to bundle. A clear 90 to 120 second screen walkthrough at 720p is about 1.5 to 3 MB as MP4 even at a low bitrate, so a few of them would use up the budget.

**Recommended: a film written as code, played by the Studio itself.**
- VideoHub films are code: `film.js` draws every frame on a canvas as a function of time (the "pure function of t" rule in VideoHub's project contract).
- The same `film.js` can run inside Delivery Studio. The browser draws the video live, so there is no video file at all.

| Piece | Size |
|---|---|
| The film code (scenes, captions, drawn screens) | about 30 to 60 KB |
| Optional voice-over, 100 s, Opus mono at 24 kbps | about 300 KB |
| The player (play/pause, scrub, chapters, captions), shared by every later video | about 6 KB |
| **Claude setup video in total** | **about 40 KB without voice, about 350 KB with voice** |

What people get:
- **Watch:** a "Watch the 2-minute setup" card at the top of Claude setup opens the player. Chapters match the four step cards (Install, Ask for access, Paste the setup message, Check your list), so someone can jump straight to step 3.
- **Download:** one self-contained HTML file (the film, the player and the voice inside, about 40 to 350 KB) that plays offline in any browser. It is not an MP4.
- **MP4 for sharing (optional):** VideoHub can still render one (`hub_render`). It would live outside the app bundle, in the file store or on SharePoint, so it does not count against the 50 MB. Where it lives is one of the decisions below.

## The film (first draft of the storyboard, about 100 seconds, slow pace)

| # | Scene | Seconds | What is on screen |
|---|---|---|---|
| 1 | Why | 10 | Claude reads the project and drafts; you review and approve. The Studio, drawn simply, with a draft arriving. |
| 2 | Install | 20 | Four tiles light up one by one: Claude app, Python (tick "Add to PATH" is shown), Node.js, Git; a Mac/Windows switch. |
| 3 | Access | 10 | Your lead adds you to the project and the Facilio skills; a tick. |
| 4 | Paste the message | 25 | Claude setup > Copy the setup message; the Claude app, Code tab, new chat, paste; Claude asks before installing. |
| 5 | Your checklist | 20 | The checklist rows turn from "Not checked" to "Ready" one after another; one "Missing" shows what to do. |
| 6 | You are set | 15 | The Assistant answers in seconds; Open in Claude on any page; where to look if something fails. |

Notes on the film:
- **Look:** the house look (white, Facilio blue, calm), with large captions drawn on the canvas.
- **Screens:** drawn as simplified screens, not screenshots, so the film stays tiny and does not date when the UI moves.
- **Claude app:** shown as a plain labelled window.
- **Voice:** your preferred slow pace and Maxim's voice (as in the launch film).

## Steps

1. **Storyboard sign-off (you).** Change the table above as you like.
2. **Build the film in VideoHub.**
   - A new film from the `new-film` template in the VideoHub films folder.
   - `hub_live` opens it in VideoHub's live preview.
   - You leave notes on the frames and press Send to your agent; I fix them in code, with no render.
3. **Player in the Studio.**
   - `src/filmplayer.js` with one CSS block: canvas, play/pause, scrub bar, chapters, captions, keyboard, reduced-motion.
   - It plays any VideoHub film that keeps the contract (`renderOut(t)`, `READY`, `VH_SCENES`).
   - The film code ships as `public/films/claude-setup.js`, and the voice as `.opus` if used.
4. **Claude setup page.** A "Watch the 2-minute setup" card above the four steps, plus Download (HTML).
5. **Size guard.** `build.mjs` warns above 48 MB and stops above 50 MB, so a later video can never push the app over the limit unnoticed.
6. **Checks.**
   - A test that the player builds and the film code keeps the contract.
   - A browser check that it plays, seeks to each chapter and downloads.
   - The size report.
7. **Then the Team Guide.** One film per guide section, reusing the same player (about 40 to 60 KB each). Six to eight of them fit easily.

## Your decisions before building

- Voice-over, or captions only (captions only keeps it near 40 KB)?
- Is the offline HTML download enough, or do you also want an MP4 (stored outside the app: SharePoint, or the Studio file store)?
- Any change to the storyboard.

## Not in this plan

- Recording real screens (too heavy, and dated by the next UI change).
- Videos for customers.
- Deploying.

# Meteor, Comet and Delivery Studio: how they connect today and what to make stronger (25 Nov 2026)

Written for a non-technical reader. "Seen" means read in the code or in the live Meteor and Comet libraries (read only, nothing changed). "Proposal" means not built.

## 1. The three tools in one line each
| Tool | What it is for | What it makes |
|---|---|---|
| Delivery Studio | Running a customer project: requirements, solution, BRD, UAT, training | Documents, tasks, the mock-up brief, guides |
| Meteor (meteor.facilio.work) | Clickable Facilio prototypes built with Claude from the CMMS Demo Kit | A prototype page (one `index.html` with sample data), versions, a quick walkthrough |
| Comet (comet.facilio.work) | Product videos, guided walkthroughs and storyboards | A video (plays by itself, voice, music) or a walkthrough (viewer clicks through steps) |

## 2. How they are connected today (seen)
The three tools never talk to each other directly. **Claude is the courier**: each tool has its own Claude connector, and Claude reads from one and writes into the other, always started by a person.

| Step | From → to | How | Format |
|---|---|---|---|
| 1. Brief | Studio → Meteor | By hand: Mockup tab, **Copy the brief**, **Open Meteor**, choose **From a PRD**, paste | Plain text brief, one per flow or module, built from the confirmed requirements, flows and solution; fictional sample data only |
| 2. Prototype | Meteor | Meteor and Claude build it; a system check passes it | A page (`index.html`), versions, a link `meteor.facilio.work/#/p/<owner>/<slug>/v<n>` |
| 3. Page back | Meteor → Studio | Button **Ask Claude to bring the Meteor pages** queues a `send_mockup` job; Claude finds the prototype by name, takes a one-hour file link and calls `save_mockup`; or a person drops the `index.html` on the card | The page is copied into the project as a file (type `mockup_html`, up to 25 MB) and shows on the Mockup card and in the client mock-up |
| 4. Video | Meteor → Comet | Not from the Studio. In Claude: Meteor `send_to_comet`, then Comet `request_video` | A request in Comet, built from the Meteor version link |
| 5. Video back | Comet → Studio | `send_video` job (Claude uses Comet `my_work` and saves the link) or a person pastes the link (Training > Videos) | **Only the link** is kept (must be `https://comet.facilio.work`); it plays inside the Studio in a panel |
| 6. Guides | Meteor → Studio | Training > Guides: tick Meteor mock-ups; Claude reads them (read only) and writes a guide | An unapproved draft guide in the Studio (BRD-style document, Word/PDF/HTML export); a person approves |

Also: Help > Facilio tools opens Meteor and Comet inside the Studio (a frame), so people do not leave the Studio.

## 3. What is in the libraries today (seen, 25 Nov)
- **Meteor:** one project "Al Moallam" (kind demo) with one prototype "for Al Moallam" (portfolio list, then a site summary, then its work orders), version 1, check passed.
- **Comet:** no finished creation. One request "Product Tour And Demo" (walkthrough) has been **waiting for Claude since 29 Oct**.

## 4. How a person uses it (the user's view)
| Who | Why | What they do today |
|---|---|---|
| Implementation consultant | Show the customer what the solution will look like before BRD sign-off | Copies the brief, pastes it in Meteor, waits, comes back, asks Claude to bring the page |
| Project manager | Show the customer one place with every screen | Opens the client mock-up in the Studio |
| Trainer / UAT lead | A how-to video or walkthrough per process or test scenario for go-live and UAT | Goes to Comet, asks for a video, comes back, pastes the link |
| Customer | Understand and try the new process | Opens the mock-up pages and video links the team shares |

Where it hurts: five places to click across three sites, copy and paste, a job that only runs when Claude's watcher is on, and three connectors the person must have added to Claude. Nothing tells the person which step they are on.

## 5. Weak points found (seen in code)
1. **The brief goes by copy and paste.** Meteor has a `start_prototype` tool that takes the brief directly and can put it in the customer's Meteor project. The Studio does not use it.
2. **Cards and prototypes are matched by name.** The Studio card does not remember which Meteor prototype (slug and version) it came from, so Claude guesses, and the Studio cannot tell when Meteor has a newer version.
3. **No project link.** Meteor and Comet both have "projects" (one per customer), but the Studio project does not store which Meteor or Comet project is its own.
4. **No "make a video" button.** Meteor to Comet (`send_to_comet` + `request_video`) is possible in Claude but not started from the Studio, and Comet requests can sit unbuilt (one has waited four weeks).
5. **Comet review is not shown.** Comet knows whether a curator approved the latest version; the Studio shows any link, approved or not.
6. **Stale results are invisible.** If the requirements change after the mock-up was made, nothing says the page or video is out of date (the planned "made from version" badge is not built).
7. **Everything depends on Claude being set up.** Without the Meteor and Comet connectors in the person's Claude, the jobs fall back to "paste the link".

## 6. What to make stronger, in order (proposal)
| # | Change | What the person sees | Size |
|---|---|---|---|
| 1 | Link the Studio project to its Meteor and Comet project once (Claude finds or creates it; stored on the project) | "Meteor project: Al Moallam" on the Mockup and Training tabs | Small |
| 2 | **Send to Meteor** button on each card: a job that calls `start_prototype` with the brief, in the linked project, and stores slug and version on the card | One click instead of copy, open, choose, paste | Small to medium |
| 3 | Store slug + version with every page and video; `send_mockup` uses them instead of guessing | "Meteor v2 available, bring it" on the card | Small |
| 4 | **Make a video** button on a card or test scenario: `send_to_comet` → `request_video` with purpose Training or Customer demo | The request appears in Comet already briefed from the prototype | Small |
| 5 | A status strip per card: Brief ready → In Meteor → Page here → Video asked → Video ready → Approved | Always know the next step | Medium |
| 6 | Show Comet's approval and the "made from" date; mark stale when requirements changed after | "Out of date: 3 requirements changed" | Medium |
| 7 | Claude setup page checks the Meteor and Comet connectors and links to add them | No silent fallback to pasting links | Small |

Rules kept in every step: Meteor and Comet get fictional sample data only, never real customer data; a person approves; Claude never publishes or shares anything in Meteor or Comet by itself.

Built on 25 Nov 2026: items 1, 2 and 3 (see docs/integrations/MOCKUP-VIDEO-RETURN-2026-11-07.md, update of 25 Nov). Item 3 shows a newer version only after Claude has looked at Meteor (the Studio cannot ask Meteor itself).

## 7. Not checked
No real job was run end to end in this check (the Studio connector was not signed in in this session). The Meteor prototype was not opened, and whether it is already on a Studio Mockup card was not checked.

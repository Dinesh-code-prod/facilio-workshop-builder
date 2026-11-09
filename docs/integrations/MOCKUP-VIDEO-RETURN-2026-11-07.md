# Meteor pages and Comet videos back into the Studio (7 Nov 2026)

Meteor (mockups) and Comet (training and walkthrough videos) are other sites, so the Studio cannot read their libraries. The result comes back in one of three ways, always as a person-approved step:

| What | Made in | Comes back by | Stored in the Studio | Shown |
|---|---|---|---|---|
| Prototype page (index.html) | Meteor, My library | Claude job `send_mockup` (Meteor tools my_prototypes, get_prototype) calls `session_questions` `save_mockup` with `pageUrl`; or a person adds the exported file on the card | project file (category `mockup_html`) and `mockup_pages.items[card].file` | on the card, in Preview client mockup here, inside the client mockup file |
| Video or walkthrough | Comet, My work or Comets | Claude job `send_video` (new): a Comet tool if there is one, otherwise it asks the person for the share link (`needs_input`) and calls `save_mockup` with `videoUrl`; or a person pastes the link on the card (Save video) | only the link, `mockup_pages.items[card].video` (https://comet.facilio.work only); a video file is far too large for a project | on the card (frame), in the client mockup (Watch link), counted on Training guides |
| Training guide text, UAT guide, video script | Training guides, Ask Claude | jobs `make_guide`, `change_guide`, saved as unapproved drafts | Deliverables and AI drafts | after a person approves |

The button "Ask Claude to bring the Meteor pages and Comet videos" (Mockup tab) queues one `send_mockup` and one `send_video` job for every card that lacks them. Connector stays at 39 tools: `videoUrl` is one more field of `session_questions` `save_mockup`.

Open question for the user: does Comet have a Claude connector like Meteor? Until one is added to the Claude session, the video link is pasted once (by the person or when Claude asks).

Panel: Open Meteor here and Open Comet here now fill the content area beside the menu and under the top bar (no gap, the menu stays usable); Full screen covers everything.

Not checked: a real Meteor or Comet run, a real Claude run.

## Update 9 Nov 2026: Training page, Meteor mock-ups as guide sources, Comet links open inside the Studio
- **What Meteor holds (read with the Meteor tools my_prototypes, project, get_prototype):** projects (a folder per customer or demo, with context), and in each project prototypes with title, kind, app, module, idea, description, the screens used (`kit.screens`), version and check status, a link, and a `walkthrough` flag. Claude reads these; the Studio never calls Meteor itself.
- **Meteor into a guide:** on Training > Guides the person ticks Meteor mock-ups (the cards of the Mockup tab) and/or "Also read my Meteor project for this customer". The ticked names ride in the job note as `[Use Meteor: ...]`; the `make_guide` recipe tells Claude to read only, turn each prototype's screens and flow into guide steps (or a video shot list) and link the prototype. The button "Ask Claude to bring the Meteor pages" still brings the finished pages to the Mockup cards.
- **Comet:** there is no Comet connector in Claude, so a person pastes the link of a finished video or guide (Training > Videos > Add a video or guide, kind Video or Guide). Saved links now have **Open here** (the side panel, `wfDock` with `data-url`, allow-listed hosts only) next to New tab. Claude reads these links when it writes a guide.
- **Training page:** two tabs, Guides and Videos; a Meteor and Comet panel says what each brings; Make a guide is three numbered steps.
Not checked: a real Meteor read by Claude, a real Comet link opening in the panel (needs sign-in there).

## Update 9 Nov 2026 (later): the Comet connector exists
Comet has a Claude connector (tools seen: `my_work` lists a person's creations with their latest version and link and the requests waiting for Claude; `get_creation` gives every version and a link; `request_video` asks for a new video, walkthrough or story, optionally from a Meteor version link; `get_brief`, `send_to_claude`, `comets`, `project` and more). It has to be added to the person's Claude and appears in a new session. The `send_video` job now tells Claude to use `my_work` and `get_creation` to find the finished video and save its link with `save_mockup`. Seen on the first read: no finished creation yet, one walkthrough request waiting ("Product Tour And Demo", asked 29 Oct). Not built: a Studio button that asks Claude to make a new video with Meteor `send_to_comet` and Comet `request_video`.

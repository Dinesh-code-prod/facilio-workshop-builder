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

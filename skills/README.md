# Claude skills for user guides and videos

Small add-ons for the team's own Claude (Claude Desktop or claude.ai). Delivery Studio names them in the prompts it prepares for guides and videos and says to carry on without them if they are not installed. Each folder is one skill; a ZIP of each is served by the app from `public/skills/`.

| Skill | What it does |
|---|---|
| facilio-solution-document-builder | Builds the client-ready Solution Document (Word) of a Facilio org from its package ZIP, checking that every configured item is covered. Made by Dinesh R. Needs Graphviz, LibreOffice and poppler on the computer |
| guidebook-builder | Writes a paired User Guide and Admin Guide for any product feature in a fixed structure and tone (it carries Facilio product patterns, a question bank, templates and a tone guide) |
| video-to-user-guide | Turns a recorded walkthrough (and what was said) into accurate step-by-step guide text |
| demo-video | Plans and builds a product demo video |
| ui-mockup-video | Builds an animated product screen from screenshots and renders it |
| video-editing | Cuts footage and assembles clips |
| remotion-create / -captions / -multimedia / -render | Build, caption and export a video with Remotion |
| graphify | Turns a folder of code or documents into a knowledge graph, so questions about how a project fits together are answered from the graph first |
| excel-analysis | Reads and analyses spreadsheets: pivot tables, charts and summaries |
| brag | Turns a project website into a short, shareable launch video (see the note below) |

Install: Claude Desktop, Customize, Skills, upload the ZIP. In Claude Code, copy the folder into `~/.claude/skills`.
These skills come from the open skill libraries the team already uses (see each `SKILL.md`). To refresh the ZIPs after editing a skill, zip each folder into `public/skills/<name>.zip`.

Note on `brag`: the folder here has the skill and its scripts but not the music and sound-effect library (about 17 MB of licensed audio). The video still builds; add the audio pack from the original install (`~/.agents/skills/brag/assets`) if you want music.
In Claude Code, a skill folder copied into this repo's `.claude/skills/` (or `~/.claude/skills`) is picked up automatically by everyone working in the repo.

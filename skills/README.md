# Claude skills for user guides and videos

Small add-ons for the team's own Claude (Claude Desktop or claude.ai). Delivery Studio names them in the prompts it prepares for guides and videos and says to carry on without them if they are not installed. Each folder is one skill; a ZIP of each is served by the app from `public/skills/`.

| Skill | What it does |
|---|---|
| video-to-user-guide | Turns a recorded walkthrough (and what was said) into accurate step-by-step guide text |
| demo-video | Plans and builds a product demo video |
| ui-mockup-video | Builds an animated product screen from screenshots and renders it |
| video-editing | Cuts footage and assembles clips |
| remotion-create / -captions / -multimedia / -render | Build, caption and export a video with Remotion |

Install: Claude Desktop, Customize, Skills, upload the ZIP. In Claude Code, copy the folder into `~/.claude/skills`.
These skills come from the open skill libraries the team already uses (see each `SKILL.md`). To refresh the ZIPs after editing a skill, zip each folder into `public/skills/<name>.zip`.

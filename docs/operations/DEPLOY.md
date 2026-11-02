# Deploying Delivery Studio to facilio.work

GitHub holds the code. facilio.work only changes when the built site is uploaded through its connector (https://mcp.facilio.work/mcp). There is no CLI and no GitHub link, so every deploy goes through a Claude session that has the `facilio work` connector turned on and signed in with a Facilio (Microsoft) account. Any Claude account type works, because the sign-in that matters is the Facilio one.

## The routine (about five minutes)

1. Change code, run `npm test`, and push to `main` on GitHub.
2. Open a Claude Code session (the desktop app, or claude.ai/code) on this repository. For claude.ai/code, attach `Dinesh-code-prod/facilio-workshop-builder` with "Add repository".
3. Check that the `facilio work` connector is on (the + button, then Connectors).
4. Type `/deploy`. It pulls the latest code, builds, checks the size, uploads and deploys, and asks before anything that goes live for everyone.
5. Open https://facilio-delivery-studio.facilio.work, press Ctrl+F5, and look.

## Things to know

- **Size cap:** the extracted site must be under 50 MB (it is about 41 MB). Biggest parts: `vendor/` (about 21 MB, PDF, Word, PowerPoint and text-from-image libraries) and `demokit/` (about 13 MB, mostly the 102 Facilio screens as WebP). Check with `du -sm dist` after `node build.mjs`.
- **Replace mode** makes the zip the whole app. The database and uploaded files are separate and are not touched.
- **Review status:** while the app is `pending`, only the owner and collaborators can open it, so a deploy is a safe test. Once it is `approved`, a deploy goes live for everyone at once.
- **Owner and collaborators only** can deploy (the owner is dinesh.r@facilio.com).
- **Upload link** lasts 10 minutes. If it expires, ask for a new one.
- **If the connector shows "needs authentication"**, sign in again: claude.ai, Settings, Connectors, `facilio work`, Connect, with the Facilio Microsoft account (a private window helps if the browser picks the wrong account).
- **Rolling back:** check out the earlier commit and deploy it the same way.

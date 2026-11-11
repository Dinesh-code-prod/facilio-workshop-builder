# .claude: shortcuts for Claude sessions

This project is worked on with Claude Code. The files here are shortcuts a person types in a Claude session; they do not run in the app. The rules every session follows are in [CLAUDE.md](../CLAUDE.md) at the top of the repository.

| File | Type this | What it does |
|---|---|---|
| [commands/sync.md](commands/sync.md) | `/sync` | Start of a session: compares this folder with GitHub, shows what the last session left, reads HANDOFF.md. |
| [commands/testlocal.md](commands/testlocal.md) | `/testlocal` | Builds the site and opens it on this computer to try a change. |
| [commands/deploy.md](commands/deploy.md) | `/deploy` | Builds the site and publishes it to facilio.work, then logs the deploy. |
| [commands/handoff.md](commands/handoff.md) | `/handoff` | End of a session: commits and pushes finished work and rewrites HANDOFF.md. |
| [launch.json](launch.json) | (none) | Tells the Claude app how to start the local preview. |

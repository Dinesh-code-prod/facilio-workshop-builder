---
description: Build Delivery Studio from this repository and deploy it to facilio.work with the facilio work connector
---

Deploy the current code of this repository to the facilio.work app `facilio-delivery-studio`. Use the `facilio work` connector tools. Work one step at a time and show me the output of each.

1. Get the latest code: `git fetch --depth=1 origin main && git reset --hard origin/main`, then show `git log --oneline -1`.
2. Build: `npm install`, then `node build.mjs`. This creates the `dist` folder.
3. Check the size: `du -sm dist`. facilio.work refuses a site over 50 MB when extracted. If it is 50 or more, stop and tell me what is big (`du -sm dist/* | sort -n | tail`); do not trim anything yourself.
4. Zip the contents of `dist` (not the folder itself), so `index.html`, `work.json` and `server/` are at the top of the zip:
   `python3 -c "import zipfile,os; z=zipfile.ZipFile('/tmp/fds.zip','w',zipfile.ZIP_DEFLATED); [z.write(os.path.join(d,f), os.path.relpath(os.path.join(d,f),'dist')) for d,_,fs in os.walk('dist') for f in fs]; z.close()"`
5. Run `whoami` and `get_app` for `facilio-delivery-studio`. Show who I am, whether I am the owner or a collaborator, the review status (pending or approved) and the current file count.
6. If I am not the owner or a collaborator, stop and say so. Otherwise run `get_upload_url`, upload `/tmp/fds.zip` (the link lasts 10 minutes; ask for a fresh one if it expires), and run `deploy_app_zip` in replace mode. Replace mode drops anything deployed that is not in the zip.
7. If the review status is `approved`, a deploy goes live for everyone at once: ask me to confirm before running `deploy_app_zip`, even if I said to go ahead earlier. If it is `pending`, only the owner and collaborators can open the app, so go ahead.
8. Show the result and any load errors, and the address to check: https://facilio-delivery-studio.facilio.work (press Ctrl+F5).

Never delete or rename the app, change who can open it, or submit it for review.

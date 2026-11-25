# Profile photos: own upload and the Teams photo

What people see: the account menu (initials, top right) has **Upload a photo**, **Use my Teams photo** and **Remove photo**. The photo shows wherever initials showed: the top bar, the account menu, task cards and the task list Owner column, Admin > Users, the project Home team list, Settings history and resource "added by" lines. No photo, or one that fails to load, shows the initials. Admins also have **Use Teams photos for everyone without one** in Admin > Users.

How it works (code: `work/server/_photos.mjs`, `V.face` in `src/shell.js`):
- The page crops the picture square and shrinks it to 256 px, then sends it as a JPEG. The server takes PNG, JPEG or WebP only, checks the first bytes match the type, and refuses anything over 512 KB.
- Bytes are kept in private files. One record, `cfg/photos`, maps email to file id, type and version. `/api/auth/me` returns `user.photos` (email to version) so the page only asks for photos that exist.
- `GET /api/people/<email>/photo` returns the image to signed-in Facilio people only. The address carries the version, so the browser may cache it for a day.

## The Teams photo: what it needs

The app reads the photo with Microsoft Graph `GET /users/{email}/photos/240x240/$value`, through the existing `graph_mail` credential (the Entra app used for the delivery mailbox). It works only once that Entra app has:

1. Microsoft Graph **application** permission **ProfilePhoto.Read.All** (or User.Read.All), with **admin consent** granted by a tenant admin.
2. The `graph_mail` credential at secrets.facilio.work granted to this app (already the case if mailbox sync works).

Until then, Use my Teams photo says Microsoft refused (403) and names the missing permission; an upload still works. Someone with no Teams photo is told so; nothing is faked. `ctx.people` (the platform directory) gives names only, not photos.

Not checked against the real Microsoft tenant: locally the preview stands in for Graph with `FAKE_GRAPH=1`.

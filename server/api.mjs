import crypto from 'node:crypto';
// API router for the Requirement Workshop Builder. Every project route enforces project-level authorisation server-side.
import { q, q1, env, fileStore } from './infra.mjs';
import * as A from './auth.mjs';
import * as PORTAL from './portal.mjs';

const CHUNK = 3 * 1024 * 1024; // raw bytes per chunk (base64 stays under the 6 MB function payload limit)
const MAX_FILE = 100 * 1024 * 1024;
const FILE_RULES = {
  kickoff: { ext: ['pptx', 'ppt', 'pdf'], max: MAX_FILE },
  msa: { ext: ['pdf', 'docx', 'txt'], max: 30e6 },
  dashboard: { ext: ['pdf'], max: 60e6 },
  transcript: { ext: ['vtt', 'srt', 'txt', 'docx', 'json'], max: 20e6 },
  plan: { ext: ['xlsx', 'xlsm', 'xls'], max: 40e6 },
  schedule: { ext: ['xlsx'], max: 40e6 },
  logo_facilio: { ext: ['png', 'jpg', 'jpeg'], max: 4e6 },
  logo_customer: { ext: ['png', 'jpg', 'jpeg'], max: 4e6 },
  brd_template: { ext: ['docx'], max: 30e6 },
  config_package: { ext: ['gz', 'json', 'zip'], max: MAX_FILE },
  screenshot: { ext: ['png', 'jpg', 'jpeg'], max: 8e6 },
  brd_export: { ext: ['docx', 'pdf'], max: MAX_FILE },
  onboarding_workbook: { ext: ['xlsx'], max: 40e6 },
  onboarding_files: { ext: ['xlsx', 'xls', 'csv', 'pdf', 'docx', 'zip'], max: 60e6 },
  signoff_evidence: { ext: ['pdf', 'png', 'jpg', 'jpeg', 'msg', 'eml', 'docx'], max: 20e6 },
  brd_signed: { ext: ['docx', 'pdf', 'json'], max: MAX_FILE }
};
const DOC_SECTIONS = /^[a-z][a-z0-9_]{1,40}$/;

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const json = (data, status, headers) => new Response(JSON.stringify(data), { status: status || 200, headers: Object.assign({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, headers || {}) });
async function body(req) { try { return await req.json(); } catch (e) { throw new HttpError(400, 'Invalid JSON body'); } }
const str = (v, max, name, required) => { if (v === undefined || v === null) v = ''; if (typeof v !== 'string') throw new HttpError(400, name + ' must be text'); v = v.trim(); if (required && !v) throw new HttpError(400, name + ' is required'); if (v.length > max) throw new HttpError(400, name + ' is too long'); return v; };
const audit = (projectId, actor, action, detail) => q(`INSERT INTO audit_log(project_id, actor, action, detail) VALUES ($1,$2,$3,$4)`, [projectId, actor, action, detail ? String(detail).slice(0, 500) : null]).catch(() => {});
const isSecure = req => new URL(req.url).protocol === 'https:';

function csrf(req) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return;
  if (req.headers.get('x-fwb-csrf') !== '1') throw new HttpError(403, 'Missing request header');
  const origin = req.headers.get('origin');
  if (origin) { const host = req.headers.get('x-forwarded-host') || new URL(req.url).host; if (new URL(origin).host !== host) throw new HttpError(403, 'Cross-origin request refused'); }
}

// Office open mode (temporary internal demo): OFFICE_OPEN_MODE=1 lets anyone who can reach the site use it as one shared
// consultant account, with every project visible. Off unless the deployment sets the variable. Accounts, sessions and roles stay as they are.
const OPEN_MODE = () => String(process.env.OFFICE_OPEN_MODE || (typeof Netlify !== 'undefined' && Netlify.env ? Netlify.env.get('OFFICE_OPEN_MODE') : '') || '') === '1';
const OFFICE_ID = 'u_office_shared'; let officeReady = false;
async function officeSession() {
  if (!officeReady) { await q(`INSERT INTO app_users(id, email, name, pw_hash) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`, [OFFICE_ID, 'office.shared@guest.local', 'Office team', 'disabled-login:' + crypto.randomBytes(16).toString('hex')]); officeReady = true; }
  return { kind: 'consultant', userId: OFFICE_ID, email: 'office.shared@guest.local', name: 'Office team', projectId: null, open: true };
}
// Super admins (Facilio platform owners): see and manage every project and user. Identified by a real signed-in account whose email is in
// SUPER_ADMIN_EMAILS (comma separated). Defaults to the platform owner so the admin panel works on a fresh deployment.
const superAdmins = () => String(env('SUPER_ADMIN_EMAILS', 'dinesh.r@facilio.com') || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
const isSuperAdmin = s => !!(s && s.kind === 'consultant' && !s.open && s.email && superAdmins().includes(String(s.email).toLowerCase()));
// 'super' (platform owner, from SUPER_ADMIN_EMAILS) | 'admin' (manage everything except access) | 'sub' (read-only) | null
async function adminRole(s) {
  if (!s || s.kind !== 'consultant' || s.open || !s.email || isGuest(s.email)) return null;
  if (isSuperAdmin(s)) return 'super';
  const em = String(s.email).toLowerCase(); const hit = ROLE_CACHE.get(em); if (hit && Date.now() - hit.at < 20000) return hit.role; // 20 s memo: saves a query on every request
  try { const g = await q1(`SELECT role FROM admin_grants WHERE email = $1`, [em]); const role = g ? (g.role === 'admin' ? 'admin' : 'sub') : null; ROLE_CACHE.set(em, { role, at: Date.now() }); return role; } catch (e) { return null; }
}
const ROLE_CACHE = new Map();
const RANK = { sub: 1, admin: 2, super: 3 };
async function requireAdmin(req, min) {
  const s = await A.sessionFrom(req); if (!s) throw new HttpError(401, 'Sign in required');
  const role = await adminRole(s); if (!role) throw new HttpError(403, 'Admin access is required');
  if (RANK[role] < RANK[min || 'sub']) throw new HttpError(403, min === 'super' ? 'Only the platform owner can do this' : 'Your admin role is read-only');
  s.adminRole = role; return s;
}
async function requireSession(req) { let s = await A.sessionFrom(req); if (!s && OPEN_MODE()) s = await officeSession(); if (!s) throw new HttpError(401, 'Sign in required'); return s; }
async function projectAccess(s, projectId, need) {
  // need: 'read' | 'edit' | 'owner' | 'customer-ok'
  const p = await q1(`SELECT * FROM projects WHERE id = $1 AND archived = false`, [projectId]);
  if (!p) throw new HttpError(404, 'Project not found');
  if (s.kind === 'customer') {
    if (s.projectId !== projectId || need !== 'customer-ok' || !p.customer_access_enabled) throw new HttpError(403, 'Not permitted for customer access');
    return { project: p, role: 'customer' };
  }
  if (OPEN_MODE()) return { project: p, role: 'owner' };
  const ar = await adminRole(s);
  if (ar === 'super' || ar === 'admin') return { project: p, role: 'owner' };
  if (ar === 'sub') { if (need === 'edit' || need === 'owner') throw new HttpError(403, 'Sub admins have read-only access'); return { project: p, role: 'viewer' }; }
  const m = await q1(`SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`, [projectId, s.userId]);
  if (!m) throw new HttpError(404, 'Project not found'); // do not reveal other consultants' projects
  if (need === 'edit' && m.role === 'viewer') throw new HttpError(403, 'Read-only access to this project');
  if (need === 'owner' && m.role !== 'owner') throw new HttpError(403, 'Only the project owner can do this');
  return { project: p, role: m.role };
}
const projectOut = (p, role) => ({ id: p.id, name: p.name, customer: p.customer, description: p.description, startDate: p.start_date, endDate: p.end_date, customerAccessEnabled: p.customer_access_enabled, createdAt: p.created_at, updatedAt: p.updated_at, role });
const fileOut = f => ({ id: f.id, category: f.category, name: f.name, mime: f.mime, size: Number(f.size), chunks: f.chunks, status: f.status, meta: f.meta, replaces: f.replaces, supersededBy: f.superseded_by, createdBy: f.created_by, createdAt: f.created_at });

// ---------------- routes ----------------
const routes = [];
const route = (method, pattern, fn) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[A-Za-z0-9_-]+)') + '$'), fn });

route('GET', '/api/health', async () => json({ ok: true, openMode: OPEN_MODE(), signupEnabled: !!A.inviteCode() || A.allowedDomains().length > 0, time: new Date().toISOString() }));

route('POST', '/api/auth/signup', async (req) => {
  const b = await body(req);
  // With ALLOWED_EMAIL_DOMAINS set (e.g. facilio.com) the company email domain is the gate and no code is needed; otherwise the team code is required.
  const code = A.inviteCode(); const domOnly = A.allowedDomains().length > 0;
  if (!domOnly) { if (!code) throw new HttpError(403, 'Sign-up is disabled. Ask the administrator to set SIGNUP_INVITE_CODE.'); if (!A.safeEqual(b.inviteCode, code)) { await A.recordFailure('signup'); throw new HttpError(403, 'Invalid team code'); } }
  else if (await A.tooManyFailures('signup')) throw new HttpError(429, 'Too many attempts. Try again in 15 minutes.');
  const email = str(b.email, 200, 'Email', true).toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, 'Enter a valid email address');
  if (superAdmins().includes(email) || await q1(`SELECT 1 FROM admin_grants WHERE email = $1`, [email]).catch(() => null)) throw new HttpError(403, 'This email is reserved. The administrator creates it from the Admin panel.');
  const dom = A.allowedDomains(); if (dom.length && !dom.includes(email.split('@')[1])) throw new HttpError(403, 'This email domain is not allowed');
  const name = str(b.name, 120, 'Name', true); const pw = typeof b.password === 'string' ? b.password : '';
  if (pw.length < 10) throw new HttpError(400, 'Password must be at least 10 characters');
  if (await q1(`SELECT 1 FROM app_users WHERE email = $1`, [email])) throw new HttpError(409, 'An account with this email already exists');
  const id = A.newId('u'); await q(`INSERT INTO app_users(id, email, name, pw_hash) VALUES ($1,$2,$3,$4)`, [id, email, name, await A.hashSecret(pw)]);
  const s = await A.createSession({ kind: 'consultant', userId: id });
  await audit(null, id, 'signup', email);
  return json({ user: { id, email, name, kind: 'consultant' } }, 201, { 'set-cookie': A.cookieHeader(s.token, s.maxAge, isSecure(req)) });
});
// Guest access: a teammate enters their name and the team invitation code and gets a private workspace without an email/password.
// They receive a one-time guest key (shown once, stored hashed) to sign back in, and can convert to a full account later.
const GUEST_DOMAIN = '@guest.local'; const isGuest = email => String(email || '').endsWith(GUEST_DOMAIN);
route('POST', '/api/auth/guest', async (req) => {
  const b = await body(req); const code = A.inviteCode(); if (!code) throw new HttpError(403, 'Guest access is disabled. Ask the administrator to set SIGNUP_INVITE_CODE.');
  if (await A.tooManyFailures('guest')) throw new HttpError(429, 'Too many failed attempts. Try again in 15 minutes.');
  if (!A.safeEqual(b.inviteCode, code)) { await A.recordFailure('guest'); throw new HttpError(403, 'Invalid team code'); }
  const name = str(b.name, 120, 'Your name', true); const id = A.newId('u'); const secret = crypto.randomBytes(18).toString('base64url'); const key = id + '.' + secret;
  await q(`INSERT INTO app_users(id, email, name, pw_hash) VALUES ($1,$2,$3,$4)`, [id, 'guest.' + id.toLowerCase().replace(/[^a-z0-9]/g, '') + GUEST_DOMAIN, name, await A.hashSecret(secret)]);
  const s = await A.createSession({ kind: 'consultant', userId: id }); await audit(null, id, 'guest-created', name);
  return json({ user: { id, email: null, name, kind: 'consultant', guest: true }, guestKey: key }, 201, { 'set-cookie': A.cookieHeader(s.token, s.maxAge, isSecure(req)) });
});
route('POST', '/api/auth/guest-login', async (req) => {
  const b = await body(req); const key = String(b.key || '').trim(); const i = key.lastIndexOf('.'); const id = key.slice(0, i), secret = key.slice(i + 1);
  if (await A.tooManyFailures('guest-login')) throw new HttpError(429, 'Too many failed attempts. Try again in 15 minutes.');
  const u = i > 0 ? await q1(`SELECT * FROM app_users WHERE id = $1`, [id]) : null;
  const ok = u && isGuest(u.email) && !u.disabled && await A.verifySecret(secret, u.pw_hash);
  if (!ok) { await A.recordFailure('guest-login'); throw new HttpError(401, 'Guest key not recognised'); }
  const s = await A.createSession({ kind: 'consultant', userId: u.id });
  return json({ user: { id: u.id, email: null, name: u.name, kind: 'consultant', guest: true } }, 200, { 'set-cookie': A.cookieHeader(s.token, s.maxAge, isSecure(req)) });
});
route('POST', '/api/auth/upgrade', async (req) => {
  const s = await requireSession(req); if (s.kind !== 'consultant' || !isGuest(s.email)) throw new HttpError(400, 'Only guest workspaces can be converted');
  const b = await body(req); const email = str(b.email, 200, 'Email', true).toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, 'Enter a valid email address');
  if (superAdmins().includes(email)) throw new HttpError(403, 'This email is reserved for the administrator.'); const dom = A.allowedDomains(); if (dom.length && !dom.includes(email.split('@')[1])) throw new HttpError(403, 'This email domain is not allowed');
  const pw = typeof b.password === 'string' ? b.password : ''; if (pw.length < 10) throw new HttpError(400, 'Password must be at least 10 characters');
  if (await q1(`SELECT 1 FROM app_users WHERE email = $1`, [email])) throw new HttpError(409, 'An account with this email already exists');
  await q(`UPDATE app_users SET email = $2, pw_hash = $3 WHERE id = $1`, [s.userId, email, await A.hashSecret(pw)]); await audit(null, s.userId, 'guest-upgraded', email);
  return json({ user: { id: s.userId, email, name: s.name, kind: 'consultant', guest: false } });
});
route('POST', '/api/auth/login', async (req) => {
  const b = await body(req); const email = str(b.email, 200, 'Email', true).toLowerCase();
  if (await A.tooManyFailures('login:' + email)) throw new HttpError(429, 'Too many failed attempts. Try again in 15 minutes.');
  const u = await q1(`SELECT * FROM app_users WHERE email = $1`, [email]);
  const ok = u && !u.disabled && await A.verifySecret(b.password, u.pw_hash);
  if (!ok) { await A.recordFailure('login:' + email); throw new HttpError(401, 'Incorrect email or password'); }
  await A.clearFailures('login:' + email);
  const s = await A.createSession({ kind: 'consultant', userId: u.id });
  return json({ user: { id: u.id, email: u.email, name: u.name, kind: 'consultant' } }, 200, { 'set-cookie': A.cookieHeader(s.token, s.maxAge, isSecure(req)) });
});
route('POST', '/api/auth/customer', async (req) => {
  const b = await body(req); const name = str(b.name, 120, 'Your name', true);
  // The project comes from the shared link; if the person only has the access code, find the one project it opens (never guess between two).
  let projectId = typeof b.projectId === 'string' ? b.projectId.trim().slice(0, 60) : ''; const subject = 'customer:' + (projectId || 'code');
  if (await A.tooManyFailures(subject)) throw new HttpError(429, 'Too many failed attempts. Try again in 15 minutes.');
  let p = null;
  if (projectId) { p = await q1(`SELECT * FROM projects WHERE id = $1 AND archived = false`, [projectId]); if (!(p && p.customer_access_enabled && await A.verifySecret(b.accessCode, p.customer_access_hash))) p = null; }
  else if (typeof b.accessCode === 'string' && b.accessCode.length >= 8) { const hits = []; for (const c of await q(`SELECT * FROM projects WHERE archived = false AND customer_access_enabled = true`, [])) if (c.customer_access_hash && await A.verifySecret(b.accessCode, c.customer_access_hash)) hits.push(c); if (hits.length === 1) { p = hits[0]; projectId = p.id; } }
  if (!p) { await A.recordFailure(subject); throw new HttpError(401, 'That access code was not recognised. Check it, or open the link your team sent you.'); }
  const s = await A.createSession({ kind: 'customer', projectId, displayName: name });
  await audit(projectId, 'customer:' + name, 'customer-login', null);
  return json({ user: { name, kind: 'customer', projectId } }, 200, { 'set-cookie': A.cookieHeader(s.token, s.maxAge, isSecure(req)) });
});
route('POST', '/api/auth/logout', async (req) => { await A.destroySession(req); return json({ ok: true }, 200, { 'set-cookie': A.clearCookie(isSecure(req)) }); });
route('GET', '/api/auth/me', async (req) => { let s = await A.sessionFrom(req); if (!s && OPEN_MODE()) s = await officeSession(); return json({ openMode: OPEN_MODE(), user: s ? { id: s.userId, email: isGuest(s.email) ? null : s.email, name: s.name, kind: s.kind, projectId: s.projectId, guest: isGuest(s.email), superAdmin: isSuperAdmin(s), adminRole: await adminRole(s) } : null, signupEnabled: !!A.inviteCode() || A.allowedDomains().length > 0, signupNeedsCode: A.allowedDomains().length === 0, domains: A.allowedDomains() }); });

// reference configuration (bundled, sanitised Facilio org configuration used as the baseline)
route('GET', '/api/reference', async (req) => {
  await requireSession(req);
  const { REFERENCE_GZ_B64, REFERENCE_META } = await import('./reference-data.mjs');
  return new Response(Buffer.from(REFERENCE_GZ_B64, 'base64'), { headers: { 'content-type': 'application/octet-stream', 'x-fwb-encoding': 'gzip', 'x-fwb-reference': JSON.stringify(REFERENCE_META), 'cache-control': 'private, max-age=3600' } });
});

// projects
route('GET', '/api/projects', async (req) => {
  const s = await requireSession(req);
  if (s.kind === 'customer') { const p = await q1(`SELECT * FROM projects WHERE id = $1`, [s.projectId]); return json({ projects: p ? [projectOut(p, 'customer')] : [] }); }
  const ar = OPEN_MODE() ? 'admin' : await adminRole(s);
  if (ar) { const all = await q(`SELECT p.* FROM projects p WHERE p.archived = false ORDER BY p.updated_at DESC`); const rl = ar === 'sub' ? 'viewer' : 'owner'; return json({ projects: all.map(r => projectOut(r, rl)) }); }
  const rows = await q(`SELECT p.*, m.role FROM projects p JOIN project_members m ON m.project_id = p.id WHERE m.user_id = $1 AND p.archived = false ORDER BY p.updated_at DESC`, [s.userId]);
  return json({ projects: rows.map(r => projectOut(r, r.role)) });
});
route('POST', '/api/projects', async (req) => {
  const s = await requireSession(req); if (s.kind !== 'consultant') throw new HttpError(403, 'Only consultants can create projects');
  const b = await body(req);
  const id = A.newId('p'); const name = str(b.name, 160, 'Project name', true); const customer = str(b.customer, 160, 'Customer name', true);
  const d = v => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  await q(`INSERT INTO projects(id, name, customer, description, start_date, end_date, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [id, name, customer, str(b.description, 4000, 'Description'), d(b.startDate), d(b.endDate), s.userId]);
  await q(`INSERT INTO project_members(project_id, user_id, role) VALUES ($1,$2,'owner')`, [id, s.userId]);
  const team = Array.isArray(b.team) ? b.team.slice(0, 50) : []; const stakeholders = Array.isArray(b.stakeholders) ? b.stakeholders.slice(0, 100) : [];
  await q(`INSERT INTO project_docs(project_id, section, data, updated_by) VALUES ($1,'people',$2,$3)`, [id, JSON.stringify({ team, stakeholders }), s.userId]);
  if (b.accessCode) { const code = str(b.accessCode, 200, 'Access code'); if (code.length < 8) throw new HttpError(400, 'Customer access code must be at least 8 characters'); await q(`UPDATE projects SET customer_access_hash = $2, customer_access_enabled = true WHERE id = $1`, [id, await A.hashSecret(code)]); }
  await audit(id, s.userId, 'project-created', name);
  const p = await q1(`SELECT * FROM projects WHERE id = $1`, [id]); return json({ project: projectOut(p, 'owner') }, 201);
});
route('GET', '/api/projects/:id', async (req, P) => {
  const s = await requireSession(req); const { project, role } = await projectAccess(s, P.id, s.kind === 'customer' ? 'customer-ok' : 'read');
  if (role === 'customer') return json({ project: { id: project.id, name: project.name, customer: project.customer, role } });
  const members = await q(`SELECT u.id, u.email, u.name, m.role FROM project_members m JOIN app_users u ON u.id = m.user_id WHERE m.project_id = $1 ORDER BY m.added_at`, [P.id]);
  return json({ project: projectOut(project, role), members });
});
route('PATCH', '/api/projects/:id', async (req, P) => {
  const s = await requireSession(req); await projectAccess(s, P.id, 'edit'); const b = await body(req);
  const d = v => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  await q(`UPDATE projects SET name = COALESCE($2, name), customer = COALESCE($3, customer), description = COALESCE($4, description), start_date = CASE WHEN $7 THEN $5::date ELSE start_date END, end_date = CASE WHEN $8 THEN $6::date ELSE end_date END, updated_at = now() WHERE id = $1`,
    [P.id, b.name !== undefined ? str(b.name, 160, 'Project name', true) : null, b.customer !== undefined ? str(b.customer, 160, 'Customer', true) : null, b.description !== undefined ? str(b.description, 4000, 'Description') : null, d(b.startDate), d(b.endDate), b.startDate !== undefined, b.endDate !== undefined]);
  await audit(P.id, s.userId, 'project-updated', null);
  return json({ project: projectOut(await q1(`SELECT * FROM projects WHERE id = $1`, [P.id]), (await projectAccess(s, P.id, 'read')).role) });
});
route('DELETE', '/api/projects/:id', async (req, P) => { const s = await requireSession(req); await projectAccess(s, P.id, 'owner'); await q(`UPDATE projects SET archived = true, updated_at = now() WHERE id = $1`, [P.id]); await q(`DELETE FROM app_sessions WHERE project_id = $1`, [P.id]); await audit(P.id, s.userId, 'project-archived', null); return json({ ok: true }); });
route('POST', '/api/projects/:id/members', async (req, P) => {
  const s = await requireSession(req); await projectAccess(s, P.id, 'owner'); const b = await body(req);
  const email = str(b.email, 200, 'Email', true).toLowerCase(); const role = ['owner', 'editor', 'viewer'].includes(b.role) ? b.role : 'editor';
  const u = await q1(`SELECT id, email, name FROM app_users WHERE email = $1 AND disabled = false`, [email]); if (!u) throw new HttpError(404, 'No consultant account with this email. They must sign up first.');
  await q(`INSERT INTO project_members(project_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role`, [P.id, u.id, role]);
  await audit(P.id, s.userId, 'member-added', email + ' as ' + role); return json({ member: Object.assign(u, { role }) }, 201);
});
route('DELETE', '/api/projects/:id/members/:uid', async (req, P) => {
  const s = await requireSession(req); await projectAccess(s, P.id, 'owner');
  const owners = await q(`SELECT user_id FROM project_members WHERE project_id = $1 AND role = 'owner'`, [P.id]);
  if (owners.length === 1 && owners[0].user_id === P.uid) throw new HttpError(400, 'A project needs at least one owner');
  await q(`DELETE FROM project_members WHERE project_id = $1 AND user_id = $2`, [P.id, P.uid]); await audit(P.id, s.userId, 'member-removed', P.uid); return json({ ok: true });
});
route('PUT', '/api/projects/:id/customer-access', async (req, P) => {
  const s = await requireSession(req); await projectAccess(s, P.id, 'edit'); const b = await body(req);
  if (b.enabled && b.accessCode) { const code = str(b.accessCode, 200, 'Access code'); if (code.length < 8) throw new HttpError(400, 'Access code must be at least 8 characters'); await q(`UPDATE projects SET customer_access_hash = $2, customer_access_enabled = true WHERE id = $1`, [P.id, await A.hashSecret(code)]); }
  else if (b.enabled) { const p = await q1(`SELECT customer_access_hash FROM projects WHERE id = $1`, [P.id]); if (!p.customer_access_hash) throw new HttpError(400, 'Set an access code first'); await q(`UPDATE projects SET customer_access_enabled = true WHERE id = $1`, [P.id]); }
  else { await q(`UPDATE projects SET customer_access_enabled = false WHERE id = $1`, [P.id]); await q(`DELETE FROM app_sessions WHERE project_id = $1 AND kind = 'customer'`, [P.id]); }
  await audit(P.id, s.userId, 'customer-access', b.enabled ? 'enabled' : 'disabled'); return json({ ok: true, enabled: !!b.enabled });
});
route('GET', '/api/projects/:id/audit', async (req, P) => { const s = await requireSession(req); await projectAccess(s, P.id, 'read'); return json({ entries: await q(`SELECT actor, action, detail, at FROM audit_log WHERE project_id = $1 ORDER BY at DESC LIMIT 200`, [P.id]) }); });

// documents (versioned JSON sections)
const customerDocOk = (ctl, section) => Object.prototype.hasOwnProperty.call(PORTAL.CUSTOMER_DOC_SECTIONS, section) && (PORTAL.CUSTOMER_DOC_SECTIONS[section] === null || ctl.tabs[PORTAL.CUSTOMER_DOC_SECTIONS[section]] !== false);
const customerFileOk = (ctl, cat) => Object.prototype.hasOwnProperty.call(PORTAL.CUSTOMER_FILE_READ, cat) && ctl.tabs[PORTAL.CUSTOMER_FILE_READ[cat]] !== false;
route('GET', '/api/projects/:id/docs', async (req, P) => {
  const s = await requireSession(req); const { role } = await projectAccess(s, P.id, s.kind === 'customer' ? 'customer-ok' : 'read');
  const rows = await q(`SELECT section, version, updated_at, updated_by FROM project_docs WHERE project_id = $1`, [P.id]); const ctl = role === 'customer' ? await PORTAL.controls(P.id) : null;
  return json({ sections: rows.filter(r => role !== 'customer' || customerDocOk(ctl, r.section)) });
});
route('GET', '/api/projects/:id/docs/:section', async (req, P) => {
  const s = await requireSession(req); const { role } = await projectAccess(s, P.id, s.kind === 'customer' ? 'customer-ok' : 'read');
  if (!DOC_SECTIONS.test(P.section) || (role === 'customer' && !customerDocOk(await PORTAL.controls(P.id), P.section))) throw new HttpError(403, 'Not permitted');
  const r = await q1(`SELECT data, version, updated_at, updated_by FROM project_docs WHERE project_id = $1 AND section = $2`, [P.id, P.section]);
  return json(r ? { data: r.data, version: r.version, updatedAt: r.updated_at, updatedBy: r.updated_by } : { data: null, version: 0 });
});
route('PUT', '/api/projects/:id/docs/:section', async (req, P) => {
  const s = await requireSession(req); await projectAccess(s, P.id, 'edit'); if (!DOC_SECTIONS.test(P.section)) throw new HttpError(400, 'Invalid section');
  const b = await body(req); if (b.data === undefined) throw new HttpError(400, 'data is required');
  const base = Number.isInteger(b.baseVersion) ? b.baseVersion : -1; const text = JSON.stringify(b.data); if (text.length > 5_000_000) throw new HttpError(413, 'Section too large');
  let r;
  if (base === 0) r = await q1(`INSERT INTO project_docs(project_id, section, data, updated_by) VALUES ($1,$2,$3,$4) ON CONFLICT (project_id, section) DO NOTHING RETURNING version`, [P.id, P.section, text, s.userId]);
  else r = await q1(`UPDATE project_docs SET data = $3, version = version + 1, updated_by = $4, updated_at = now() WHERE project_id = $1 AND section = $2 AND ($5::int < 0 OR version = $5) RETURNING version`, [P.id, P.section, text, s.userId, base]);
  if (!r) { const cur = await q1(`SELECT version, updated_by, updated_at FROM project_docs WHERE project_id = $1 AND section = $2`, [P.id, P.section]); return json({ error: 'Conflict: this section was changed by someone else.', current: cur }, 409); }
  await q(`UPDATE projects SET updated_at = now() WHERE id = $1`, [P.id]);
  return json({ version: r.version });
});

// files (private, chunked)
route('GET', '/api/projects/:id/files', async (req, P) => {
  const s = await requireSession(req); const { role } = await projectAccess(s, P.id, s.kind === 'customer' ? 'customer-ok' : 'read');
  const cat = new URL(req.url).searchParams.get('category'); const all = new URL(req.url).searchParams.get('versions') === '1';
  const rows = await q(`SELECT * FROM project_files WHERE project_id = $1 AND deleted_at IS NULL AND status = 'ready' AND ($2::text IS NULL OR category = $2) ${all ? '' : 'AND superseded_by IS NULL'} ORDER BY created_at DESC`, [P.id, cat]);
  const ctl = role === 'customer' ? await PORTAL.controls(P.id) : null;
  return json({ files: rows.filter(f => role !== 'customer' || customerFileOk(ctl, f.category)).map(fileOut) });
});
async function uploadAccess(s, projectId, category) {
  if (s.kind !== 'customer') return projectAccess(s, projectId, 'edit');
  const a = await projectAccess(s, projectId, 'customer-ok'); const need = PORTAL.CUSTOMER_FILE_UPLOAD[category]; const ctl = await PORTAL.controls(projectId);
  if (!need || ctl.tabs[need] === false || ctl.allow[need] === false) throw new HttpError(403, 'Not permitted for customer access'); return a;
}
const uploaderId = s => (s.kind === 'customer' ? 'cust:' + s.name : s.userId);
route('POST', '/api/projects/:id/files', async (req, P) => {
  const s = await requireSession(req); const b = await body(req); await uploadAccess(s, P.id, b.category);
  const rule = FILE_RULES[b.category]; if (!rule) throw new HttpError(400, 'Unknown file category');
  const name = str(b.name, 255, 'File name', true); const ext = (name.split('.').pop() || '').toLowerCase();
  if (!rule.ext.includes(ext)) throw new HttpError(415, 'Unsupported file type .' + ext + ' — allowed: ' + rule.ext.join(', '));
  const size = Number(b.size); if (!(size > 0) || size > rule.max) throw new HttpError(413, 'File is empty or too large (max ' + Math.round(rule.max / 1e6) + ' MB)');
  const chunks = Math.ceil(size / CHUNK); const id = A.newId('f');
  if (b.replaces) { const old = await q1(`SELECT id, category, created_by FROM project_files WHERE id = $1 AND project_id = $2`, [b.replaces, P.id]); if (!old || (s.kind === 'customer' && (old.category !== b.category || old.created_by !== uploaderId(s)))) throw new HttpError(404, 'File to replace not found'); }
  const meta = b.meta && typeof b.meta === 'object' ? b.meta : {}; if (JSON.stringify(meta).length > 20000) throw new HttpError(400, 'Metadata too large');
  await q(`INSERT INTO project_files(id, project_id, category, name, mime, size, chunks, meta, replaces, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [id, P.id, b.category, name, str(b.mime, 120, 'Type') || 'application/octet-stream', size, chunks, JSON.stringify(meta), b.replaces || null, uploaderId(s)]);
  return json({ id, chunkSize: CHUNK, chunks }, 201);
});
route('PUT', '/api/projects/:id/files/:fid/chunks/:n', async (req, P) => {
  const s = await requireSession(req);
  const f = await q1(`SELECT * FROM project_files WHERE id = $1 AND project_id = $2 AND status = 'uploading'`, [P.fid, P.id]); if (!f) throw new HttpError(404, 'Upload not found');
  await uploadAccess(s, P.id, f.category); if (s.kind === 'customer' && f.created_by !== uploaderId(s)) throw new HttpError(404, 'Upload not found');
  const n = Number(P.n); if (!Number.isInteger(n) || n < 0 || n >= f.chunks) throw new HttpError(400, 'Invalid chunk');
  const buf = await req.arrayBuffer(); const expected = n === f.chunks - 1 ? Number(f.size) - CHUNK * (f.chunks - 1) : CHUNK;
  if (buf.byteLength !== expected) throw new HttpError(400, 'Chunk size mismatch');
  await (await fileStore()).set(`${P.id}/${P.fid}/${n}`, buf); return json({ ok: true });
});
route('POST', '/api/projects/:id/files/:fid/complete', async (req, P) => {
  const s = await requireSession(req);
  const f = await q1(`SELECT * FROM project_files WHERE id = $1 AND project_id = $2`, [P.fid, P.id]); if (!f) throw new HttpError(404, 'Upload not found');
  await uploadAccess(s, P.id, f.category); if (s.kind === 'customer' && f.created_by !== uploaderId(s)) throw new HttpError(404, 'Upload not found');
  const st = await fileStore(); for (let i = 0; i < f.chunks; i++) { if (!(await st.get(`${P.id}/${P.fid}/${i}`))) throw new HttpError(400, 'Chunk ' + i + ' missing'); }
  await q(`UPDATE project_files SET status = 'ready' WHERE id = $1`, [P.fid]);
  if (f.replaces) await q(`UPDATE project_files SET superseded_by = $1 WHERE id = $2 AND project_id = $3`, [P.fid, f.replaces, P.id]);
  await audit(P.id, s.kind === 'customer' ? 'customer:' + s.name : s.userId, 'file-uploaded', f.category + ': ' + f.name);
  return json({ file: fileOut(await q1(`SELECT * FROM project_files WHERE id = $1`, [P.fid])) });
});
async function fileForRead(s, P) {
  const { role } = await projectAccess(s, P.id, s.kind === 'customer' ? 'customer-ok' : 'read');
  const f = await q1(`SELECT * FROM project_files WHERE id = $1 AND project_id = $2 AND deleted_at IS NULL AND status = 'ready'`, [P.fid, P.id]);
  if (!f || (role === 'customer' && !customerFileOk(await PORTAL.controls(P.id), f.category))) throw new HttpError(404, 'File not found');
  return f;
}
route('GET', '/api/projects/:id/files/:fid', async (req, P) => { const s = await requireSession(req); return json({ file: fileOut(await fileForRead(s, P)), chunkSize: CHUNK }); });
route('GET', '/api/projects/:id/files/:fid/chunks/:n', async (req, P) => {
  const s = await requireSession(req); const f = await fileForRead(s, P); const n = Number(P.n);
  if (!Number.isInteger(n) || n < 0 || n >= f.chunks) throw new HttpError(400, 'Invalid chunk');
  const b = await (await fileStore()).get(`${P.id}/${P.fid}/${n}`); if (!b) throw new HttpError(404, 'File data missing');
  return new Response(b, { headers: { 'content-type': 'application/octet-stream', 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' } });
});
route('PATCH', '/api/projects/:id/files/:fid', async (req, P) => {
  const s = await requireSession(req); await projectAccess(s, P.id, 'edit'); const b = await body(req);
  const f = await q1(`SELECT * FROM project_files WHERE id = $1 AND project_id = $2 AND deleted_at IS NULL`, [P.fid, P.id]); if (!f) throw new HttpError(404, 'File not found');
  const meta = Object.assign({}, f.meta, b.meta && typeof b.meta === 'object' ? b.meta : {}); if (JSON.stringify(meta).length > 20000) throw new HttpError(400, 'Metadata too large');
  await q(`UPDATE project_files SET meta = $2 WHERE id = $1`, [P.fid, JSON.stringify(meta)]); return json({ file: fileOut(await q1(`SELECT * FROM project_files WHERE id = $1`, [P.fid])) });
});
route('DELETE', '/api/projects/:id/files/:fid', async (req, P) => {
  const s = await requireSession(req); await projectAccess(s, P.id, 'edit');
  const f = await q1(`SELECT * FROM project_files WHERE id = $1 AND project_id = $2 AND deleted_at IS NULL`, [P.fid, P.id]); if (!f) throw new HttpError(404, 'File not found');
  await q(`UPDATE project_files SET deleted_at = now() WHERE id = $1`, [P.fid]);
  if (f.replaces) await q(`UPDATE project_files SET superseded_by = NULL WHERE id = $1 AND superseded_by = $2`, [f.replaces, P.fid]);
  await audit(P.id, s.userId, 'file-removed', f.category + ': ' + f.name); return json({ ok: true });
});

// module learning responses (Customer User Guide): one value per key, last writer wins
const GR_KEY = /^[a-z]{2,8}:[afbxw]:[A-Za-z0-9_-]{1,64}$/;
route('GET', '/api/projects/:id/guide-responses', async (req, P) => {
  const s = await requireSession(req); await projectAccess(s, P.id, s.kind === 'customer' ? 'customer-ok' : 'read');
  const rows = await q(`SELECT key, value, author_name, author_kind, updated_at FROM guide_responses WHERE project_id = $1 ORDER BY key LIMIT 5000`, [P.id]);
  return json({ responses: rows.map(r => ({ key: r.key, value: r.value, authorName: r.author_name, authorKind: r.author_kind, updatedAt: r.updated_at })) });
});
route('PUT', '/api/projects/:id/guide-responses', async (req, P) => {
  const s = await requireSession(req); await projectAccess(s, P.id, s.kind === 'customer' ? 'customer-ok' : 'edit'); const b = await body(req);
  if (s.kind === 'customer' && !(await PORTAL.controls(P.id)).allow.answers) throw new HttpError(403, 'Answers are locked for this project');
  const key = String(b.key || ''); if (!GR_KEY.test(key)) throw new HttpError(400, 'Invalid response key');
  const name = s.kind === 'customer' ? s.name : (s.name || 'Implementation team');
  if (b.value === null || b.value === undefined || b.value === '' || (Array.isArray(b.value) && !b.value.length)) { await q(`DELETE FROM guide_responses WHERE project_id = $1 AND key = $2`, [P.id, key]); return json({ ok: true, deleted: true }); }
  const text = JSON.stringify(b.value); if (text.length > 20000) throw new HttpError(413, 'Answer too long');
  const n = await q1(`SELECT count(*)::int AS n FROM guide_responses WHERE project_id = $1`, [P.id]); if (n && n.n >= 5000) throw new HttpError(413, 'Too many answers stored for this project');
  const r = await q1(`INSERT INTO guide_responses(project_id, key, value, author_name, author_kind) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (project_id, key) DO UPDATE SET value = EXCLUDED.value, author_name = EXCLUDED.author_name, author_kind = EXCLUDED.author_kind, updated_at = now() RETURNING updated_at`, [P.id, key, text, name, s.kind]);
  return json({ ok: true, authorName: name, authorKind: s.kind, updatedAt: r.updated_at });
});

// customer feedback / questions
route('GET', '/api/projects/:id/feedback', async (req, P) => {
  const s = await requireSession(req); const { role } = await projectAccess(s, P.id, s.kind === 'customer' ? 'customer-ok' : 'read');
  const rows = await q(`SELECT * FROM feedback WHERE project_id = $1 ${role === 'customer' ? "AND author_kind = 'customer'" : ''} ORDER BY created_at DESC LIMIT 1000`, [P.id]);
  return json({ items: rows.map(r => ({ id: r.id, module: r.module, topic: r.topic, kind: r.kind, priority: r.priority, body: r.body, authorName: r.author_name, authorKind: r.author_kind, sessionRef: r.session_ref, status: r.status, response: r.response, createdAt: r.created_at, updatedAt: r.updated_at })) });
});
route('POST', '/api/projects/:id/feedback', async (req, P) => {
  const s = await requireSession(req); await projectAccess(s, P.id, s.kind === 'customer' ? 'customer-ok' : 'edit'); const b = await body(req);
  if (s.kind === 'customer' && !(await PORTAL.controls(P.id)).allow.discuss) throw new HttpError(403, 'Questions are closed for this project');
  const id = A.newId('fb'); const kind = ['question', 'concern', 'feedback', 'change'].includes(b.kind) ? b.kind : 'question'; const pr = ['low', 'normal', 'high'].includes(b.priority) ? b.priority : 'normal';
  await q(`INSERT INTO feedback(id, project_id, module, topic, kind, priority, body, author_name, author_kind, session_ref) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [id, P.id, str(b.module, 120, 'Module'), str(b.topic, 200, 'Topic'), kind, pr, str(b.body, 5000, 'Question or feedback', true), s.kind === 'customer' ? s.name : (str(b.authorName, 120, 'Name') || s.name), s.kind, str(b.sessionRef, 80, 'Session')]);
  await audit(P.id, s.kind === 'customer' ? 'customer:' + s.name : s.userId, 'feedback-added', b.module || ''); return json({ id }, 201);
});
route('PATCH', '/api/projects/:id/feedback/:fid', async (req, P) => {
  const s = await requireSession(req); await projectAccess(s, P.id, 'edit'); const b = await body(req);
  const status = ['open', 'answered', 'resolved', 'follow-up'].includes(b.status) ? b.status : null;
  const r = await q1(`UPDATE feedback SET status = COALESCE($3, status), response = COALESCE($4, response), session_ref = COALESCE($5, session_ref), updated_at = now() WHERE id = $1 AND project_id = $2 RETURNING id`, [P.fid, P.id, status, b.response !== undefined ? str(b.response, 5000, 'Response') : null, b.sessionRef !== undefined ? str(b.sessionRef, 80, 'Session') : null]);
  if (!r) throw new HttpError(404, 'Item not found'); return json({ ok: true });
});

// shared items (actions, RAID, sign-offs, change requests, onboarding, …): one row per record, rules per kind
const itemOut = r => ({ kind: r.kind, id: r.id, data: r.data, version: r.version, createdBy: r.created_by, createdSide: r.created_side, updatedBy: r.updated_by, updatedSide: r.updated_side, createdAt: r.created_at, updatedAt: r.updated_at });
route('GET', '/api/projects/:id/items', async (req, P) => {
  const s = await requireSession(req); const { role } = await projectAccess(s, P.id, s.kind === 'customer' ? 'customer-ok' : 'read');
  const kinds = String(new URL(req.url).searchParams.get('kinds') || '').split(',').filter(k => PORTAL.KIND_RE.test(k) && PORTAL.KINDS[k]);
  if (!kinds.length) throw new HttpError(400, 'Name the kinds to load');
  return json({ items: await itemsFor(role, P.id, kinds) });
});
async function itemsFor(role, projectId, kinds, ctl0) {
  let rows = await q(`SELECT * FROM project_items WHERE project_id = $1 AND kind = ANY($2) ORDER BY created_at LIMIT 20000`, [projectId, kinds]);
  if (role === 'customer') { const ctl = ctl0 || await PORTAL.controls(projectId); rows = rows.filter(r => { const K = PORTAL.KINDS[r.kind]; if (K.internal || (K.tab && ctl.tabs[K.tab] === false)) return false; if (r.data && r.data.mod && ctl.hiddenModules.includes(r.data.mod)) return false; return !K.read || K.read(r.data, ctl); }); }
  return rows.map(itemOut);
}
// One request that opens a project: project + members + the requested document sections + item records, with a single session and permission check.
route('GET', '/api/projects/:id/open', async (req, P) => {
  const s = await requireSession(req); const { project, role } = await projectAccess(s, P.id, s.kind === 'customer' ? 'customer-ok' : 'read');
  const u = new URL(req.url); const secs = String(u.searchParams.get('sections') || '').split(',').filter(k => k && DOC_SECTIONS.test(k)).slice(0, 40);
  const kq = String(u.searchParams.get('kinds') || ''); const kinds = (kq === 'all' ? Object.keys(PORTAL.KINDS) : kq.split(',')).filter(k => PORTAL.KIND_RE.test(k) && PORTAL.KINDS[k]);
  const customer = role === 'customer'; const ctl = customer ? await PORTAL.controls(P.id) : null;
  const [members, docRows, items] = await Promise.all([
    customer ? Promise.resolve(null) : q(`SELECT u.id, u.email, u.name, m.role FROM project_members m JOIN app_users u ON u.id = m.user_id WHERE m.project_id = $1 ORDER BY m.added_at`, [P.id]),
    secs.length ? q(`SELECT section, data, version, updated_at, updated_by FROM project_docs WHERE project_id = $1 AND section = ANY($2)`, [P.id, secs]) : Promise.resolve([]),
    kinds.length ? itemsFor(role, P.id, kinds, ctl) : Promise.resolve([])
  ]);
  const docs = {}; const found = new Set(docRows.map(r => r.section));
  for (const k of secs) { if (customer && !customerDocOk(ctl, k)) continue; if (!found.has(k)) docs[k] = { data: null, version: 0 }; }
  for (const r of docRows) { if (customer && !customerDocOk(ctl, r.section)) continue; docs[r.section] = { data: r.data, version: r.version }; }
  return json({ project: customer ? { id: project.id, name: project.name, customer: project.customer, role } : projectOut(project, role), members: members || [], docs, items, kinds });
});
route('PUT', '/api/projects/:id/items/:kind/:item', async (req, P) => {
  const s = await requireSession(req); const K = PORTAL.KINDS[P.kind]; if (!K || !PORTAL.ITEM_ID_RE.test(P.item)) throw new HttpError(400, 'Unknown item type');
  const { role } = await projectAccess(s, P.id, s.kind === 'customer' ? 'customer-ok' : 'edit'); const b = await body(req);
  if (!b.data || typeof b.data !== 'object' || Array.isArray(b.data)) throw new HttpError(400, 'data is required');
  const cur = await q1(`SELECT * FROM project_items WHERE project_id = $1 AND kind = $2 AND id = $3`, [P.id, P.kind, P.item]);
  if (Number.isInteger(b.baseVersion) && (cur ? cur.version : 0) !== b.baseVersion) return json({ error: 'Conflict: this record was changed by someone else.', current: cur ? itemOut(cur) : null }, 409);
  let data = b.data;
  if (role === 'customer') {
    const ctl = await PORTAL.controls(P.id); if (K.internal || !K.write || (K.tab && ctl.tabs[K.tab] === false)) throw new HttpError(403, 'Not permitted for customer access');
    if (cur && K.read && !K.read(cur.data, ctl)) throw new HttpError(404, 'Not found');
    try { data = K.write({ old: cur ? cur.data : null, next: b.data, ctl, s }); } catch (e) { throw new HttpError(e.status || 400, e.message); }
  }
  if (P.kind === 'cr' && !cur) { const mx = await q1(`SELECT COALESCE(MAX((data->>'n')::int), 0) AS n FROM project_items WHERE project_id = $1 AND kind = 'cr' AND (data->>'n') ~ '^[0-9]+$'`, [P.id]); data = Object.assign({}, data, { n: mx.n + 1 }); }
  else if (P.kind === 'cr' && cur) data = Object.assign({}, data, { n: cur.data.n });
  const prevHist = (cur && cur.data && Array.isArray(cur.data.hist)) ? cur.data.hist : [];
  const changed = Object.keys(data).filter(k => k !== 'hist' && JSON.stringify(data[k]) !== JSON.stringify(cur && cur.data ? cur.data[k] : undefined));
  data = Object.assign({}, data, { hist: prevHist.concat(changed.length || !cur ? [{ at: new Date().toISOString(), who: s.name || 'Implementation team', side: PORTAL.SIDE(s), event: cur ? 'Updated ' + changed.slice(0, 6).join(', ') + (data.status && changed.includes('status') ? ' → ' + data.status : '') : 'Created' }] : []).slice(-40) });
  const text = JSON.stringify(data); if (text.length > (P.kind === 'onbws' ? 2000000 : 60000)) throw new HttpError(413, 'Record too large');
  if (!cur) { const n = await q1(`SELECT count(*)::int AS n FROM project_items WHERE project_id = $1`, [P.id]); if (n.n >= 20000) throw new HttpError(413, 'Too many records in this project'); }
  const who = s.kind === 'customer' ? 'customer:' + s.name : s.userId; const side = PORTAL.SIDE(s);
  const r = await q1(`INSERT INTO project_items(project_id, kind, id, data, created_by, created_side, updated_by, updated_side) VALUES ($1,$2,$3,$4,$5,$6,$5,$6)
    ON CONFLICT (project_id, kind, id) DO UPDATE SET data = EXCLUDED.data, version = project_items.version + 1, updated_by = EXCLUDED.updated_by, updated_side = EXCLUDED.updated_side, updated_at = now() RETURNING *`, [P.id, P.kind, P.item, text, who, side]);
  if (['signoff', 'cr', 'raid', 'onb', 'onbsub', 'decision', 'brdrev'].includes(P.kind)) await audit(P.id, who, P.kind + (cur ? '-updated' : '-created'), P.item + (data.status ? ' ' + data.status : ''));
  return json({ item: itemOut(r) });
});
route('DELETE', '/api/projects/:id/items/:kind/:item', async (req, P) => {
  const s = await requireSession(req); if (!PORTAL.KINDS[P.kind]) throw new HttpError(400, 'Unknown item type'); await projectAccess(s, P.id, 'edit');
  const r = await q1(`DELETE FROM project_items WHERE project_id = $1 AND kind = $2 AND id = $3 RETURNING id`, [P.id, P.kind, P.item]); if (!r) throw new HttpError(404, 'Not found');
  await audit(P.id, s.userId, P.kind + '-deleted', P.item); return json({ ok: true });
});

// ---------------- super admin ----------------
// One-time setup / recovery of the super admin account. Needs ADMIN_SETUP_CODE (set by whoever controls the deployment) so nobody else can claim the email.
route('POST', '/api/admin/setup', async (req) => {
  const b = await body(req); const code = env('ADMIN_SETUP_CODE', '');
  if (!code) throw new HttpError(403, 'Admin setup is disabled: the site has no ADMIN_SETUP_CODE yet. Add it under Site configuration, Environment variables, then deploy with Clear cache and deploy site.');
  if (await A.tooManyFailures('admin-setup')) throw new HttpError(429, 'Too many failed attempts. Try again in 15 minutes.');
  if (!A.safeEqual(b.setupCode, code)) { await A.recordFailure('admin-setup'); throw new HttpError(403, 'Setup code not recognised'); }
  const email = str(b.email, 200, 'Email', true).toLowerCase(); if (!superAdmins().includes(email)) throw new HttpError(403, 'This email is not a configured super admin');
  const pw = typeof b.password === 'string' ? b.password : ''; if (pw.length < 10) throw new HttpError(400, 'Password must be at least 10 characters');
  const hash = await A.hashSecret(pw); const ex = await q1(`SELECT id FROM app_users WHERE email = $1`, [email]); let id;
  if (ex) { id = ex.id; await q(`UPDATE app_users SET pw_hash = $2, disabled = false WHERE id = $1`, [id, hash]); await q(`DELETE FROM app_sessions WHERE user_id = $1`, [id]); await audit(null, id, 'admin_password_reset', email); }
  else { id = A.newId('u'); await q(`INSERT INTO app_users(id, email, name, pw_hash) VALUES ($1,$2,$3,$4)`, [id, email, str(b.name, 120, 'Name') || 'Super admin', hash]); await audit(null, id, 'admin_created', email); }
  const s = await A.createSession({ kind: 'consultant', userId: id });
  return json({ ok: true, created: !ex }, 200, { 'set-cookie': A.cookieHeader(s.token, s.maxAge, isSecure(req)) });
});
const stageOf = x => x.signed.golive ? 6 : (x.signed.uat || x.uat > 0) ? 5 : (x.signed.brd || x.brdStatus === 'approved' || x.brdExports > 0) ? 4 : x.reqs > 0 ? 3 : x.sessions.total > 0 ? 2 : x.scope > 0 ? 1 : 0;
const daysAgo = d => Math.floor((Date.now() - new Date(d).getTime()) / 864e5);
route('GET', '/api/admin/overview', async (req) => {
  const me = await requireAdmin(req, 'sub'); const today = new Date().toISOString().slice(0, 10);
  const rows = await q(`SELECT p.*,
      (SELECT count(*)::int FROM project_members m WHERE m.project_id = p.id) AS members,
      (SELECT string_agg(u.email, ', ') FROM project_members m JOIN app_users u ON u.id = m.user_id WHERE m.project_id = p.id AND m.role = 'owner') AS owners,
      (SELECT count(*)::int FROM project_files f WHERE f.project_id = p.id AND f.deleted_at IS NULL) AS files,
      (SELECT COALESCE(sum(f.size),0)::bigint FROM project_files f WHERE f.project_id = p.id AND f.deleted_at IS NULL) AS bytes,
      (SELECT count(*)::int FROM feedback f WHERE f.project_id = p.id AND f.status = 'open') AS open_feedback,
      GREATEST(p.updated_at, COALESCE((SELECT max(d.updated_at) FROM project_docs d WHERE d.project_id = p.id), p.updated_at), COALESCE((SELECT max(i.updated_at) FROM project_items i WHERE i.project_id = p.id), p.updated_at)) AS last_activity,
      (SELECT CASE WHEN jsonb_typeof(d.data->'scope') = 'array' THEN jsonb_array_length(d.data->'scope') ELSE 0 END FROM project_docs d WHERE d.project_id = p.id AND d.section = 'planner') AS scope_n,
      (SELECT CASE WHEN jsonb_typeof(d.data->'sessions') = 'array' THEN d.data->'sessions' ELSE '[]'::jsonb END FROM project_docs d WHERE d.project_id = p.id AND d.section = 'planner') AS sessions,
      (SELECT CASE WHEN jsonb_typeof(d.data->'requirements') = 'array' THEN jsonb_array_length(d.data->'requirements') ELSE 0 END FROM project_docs d WHERE d.project_id = p.id AND d.section = 'workshop') AS req_n,
      (SELECT CASE WHEN jsonb_typeof(d.data->'flows') = 'object' THEN (SELECT count(*)::int FROM jsonb_object_keys(d.data->'flows')) ELSE 0 END FROM project_docs d WHERE d.project_id = p.id AND d.section = 'workshop') AS flow_n,
      (SELECT d.data->>'status' FROM project_docs d WHERE d.project_id = p.id AND d.section = 'brddoc') AS brd_status,
      (SELECT CASE WHEN jsonb_typeof(d.data->'exports') = 'array' THEN jsonb_array_length(d.data->'exports') ELSE 0 END FROM project_docs d WHERE d.project_id = p.id AND d.section = 'brddoc') AS brd_exports
    FROM projects p ORDER BY p.archived, p.updated_at DESC`);
  const items = await q(`SELECT project_id, kind, COALESCE(data->>'status','') AS st, count(*)::int AS n,
      count(*) FILTER (WHERE COALESCE(data->>'due','') <> '' AND data->>'due' < $1 AND COALESCE(data->>'status','') <> 'Done')::int AS overdue
    FROM project_items GROUP BY project_id, kind, COALESCE(data->>'status','')`, [today]);
  const by = {}; items.forEach(r => { (by[r.project_id] = by[r.project_id] || []).push(r); });
  const projects = rows.map(p => {
    const it = by[p.id] || []; const sum = (f) => it.filter(f).reduce((a, r) => a + r.n, 0);
    const sess = Array.isArray(p.sessions) ? p.sessions : []; const live = sess.filter(x => x && x.status !== 'cancelled');
    const x = { scope: p.scope_n || 0, reqs: p.req_n || 0, brdStatus: p.brd_status || '', brdExports: p.brd_exports || 0,
      uat: sum(r => r.kind === 'uat'), signed: {}, sessions: { total: live.length, upcoming: live.filter(y => (y.date || '') >= today).length, done: live.filter(y => y.date && y.date < today).length } };
    const stage = stageOf(x);
    const openActions = sum(r => r.kind === 'action' && r.st !== 'Done'), overdue = it.filter(r => r.kind === 'action').reduce((a, r) => a + r.overdue, 0), blocked = sum(r => r.kind === 'action' && r.st === 'Blocked');
    const raidOpen = sum(r => r.kind === 'raid' && !/closed|resolved|done|mitigated/i.test(r.st)); const idle = daysAgo(p.last_activity);
    const reasons = []; if (overdue) reasons.push(overdue + ' overdue action' + (overdue > 1 ? 's' : '')); if (blocked) reasons.push(blocked + ' blocked'); if (p.open_feedback >= 3) reasons.push(p.open_feedback + ' open customer questions'); if (idle > 14) reasons.push('No activity for ' + idle + ' days');
    const health = p.archived ? 'archived' : stage === 6 ? 'live' : idle > 14 ? 'stale' : (overdue || blocked || p.open_feedback >= 3) ? 'attention' : 'healthy';
    return { id: p.id, name: p.name, customer: p.customer, description: p.description, archived: p.archived, customerAccessEnabled: p.customer_access_enabled, startDate: p.start_date, endDate: p.end_date, createdAt: p.created_at, updatedAt: p.updated_at, lastActivity: p.last_activity,
      members: p.members, owners: p.owners || '', files: p.files, bytes: Number(p.bytes), openFeedback: p.open_feedback, modulesInScope: x.scope, sessions: x.sessions, requirements: x.reqs, flows: p.flow_n || 0, brdStatus: x.brdStatus || 'draft', brdExports: x.brdExports,
      stage, health, reasons, openActions, overdue, blocked, raidOpen, uat: x.uat };
  });
  // signed sign-offs per kind: read separately because the id (brd / uat / golive) is what identifies the step
  const so = await q(`SELECT project_id, id FROM project_items WHERE kind = 'signoff' AND data->>'status' = 'signed'`);
  const pm = Object.fromEntries(projects.map(p => [p.id, p])); so.forEach(r => { const p = pm[r.project_id]; if (!p) return; p.signed = p.signed || {}; p.signed[r.id] = true; });
  projects.forEach(p => { const sg = p.signed || {}; p.stage = Math.max(p.stage, sg.golive ? 6 : sg.uat ? 5 : sg.brd ? 4 : 0); if (sg.golive && !p.archived) p.health = 'live'; p.signed = sg; });
  const act = projects.filter(p => !p.archived);
  const wk = await q(`SELECT to_char(date_trunc('week', at), 'YYYY-MM-DD') AS w, count(*)::int AS n FROM audit_log WHERE at > now() - interval '8 weeks' GROUP BY 1`);
  const wkMap = Object.fromEntries(wk.map(r => [r.w, r.n])); const weekly = [];
  for (let k = 7; k >= 0; k--) { const d = new Date(); d.setUTCDate(d.getUTCDate() - k * 7); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); const key = d.toISOString().slice(0, 10); weekly.push({ week: key, n: wkMap[key] || 0 }); }
  const monthly = []; for (let k = 5; k >= 0; k--) { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - k); const key = d.toISOString().slice(0, 7); monthly.push({ month: key, n: projects.filter(p => String(p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt).slice(0, 7) === key).length }); }
  const cats = await q(`SELECT category, count(*)::int AS n, COALESCE(sum(size),0)::bigint AS bytes FROM project_files WHERE deleted_at IS NULL GROUP BY category ORDER BY 3 DESC`);
  const acc = await q1(`SELECT count(*) FILTER (WHERE email NOT LIKE '%@guest.local')::int AS people, count(*) FILTER (WHERE email LIKE '%@guest.local' AND id <> $1)::int AS guests FROM app_users`, [OFFICE_ID]);
  const act7 = await q1(`SELECT count(DISTINCT user_id)::int AS n FROM app_sessions WHERE last_seen > now() - interval '7 days' AND kind = 'consultant' AND user_id <> $1`, [OFFICE_ID]);
  const sum = f => act.reduce((a, p) => a + f(p), 0);
  const stages = [0, 1, 2, 3, 4, 5, 6].map(n => act.filter(p => p.stage === n).length);
  const health = { healthy: 0, attention: 0, stale: 0, live: 0 }; act.forEach(p => { health[p.health] = (health[p.health] || 0) + 1; });
  return json({ me: { role: me.adminRole, email: me.email, name: me.name }, superAdmins: superAdmins(), projects,
    kpis: { active: act.length, archived: projects.length - act.length, customers: new Set(act.map(p => p.customer.trim().toLowerCase())).size, people: acc.people, guests: acc.guests, activePeople7d: act7.n, files: sum(p => p.files), bytes: sum(p => p.bytes), sessions: sum(p => p.sessions.total), upcoming: sum(p => p.sessions.upcoming), requirements: sum(p => p.requirements), flows: sum(p => p.flows), openActions: sum(p => p.openActions), overdue: sum(p => p.overdue), openQuestions: sum(p => p.openFeedback), raidOpen: sum(p => p.raidOpen), customerAccess: act.filter(p => p.customerAccessEnabled).length, brdApproved: act.filter(p => p.brdStatus === 'approved').length, live: act.filter(p => p.stage === 6).length },
    stages, health, weekly, monthly, files: cats.map(c => ({ category: c.category, n: c.n, bytes: Number(c.bytes) })),
    attention: act.filter(p => p.reasons.length).sort((a, b) => b.reasons.length - a.reasons.length || b.overdue - a.overdue).slice(0, 8).map(p => ({ id: p.id, name: p.name, customer: p.customer, reasons: p.reasons })),
    recent: act.slice().sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity)).slice(0, 6).map(p => ({ id: p.id, name: p.name, customer: p.customer, lastActivity: p.lastActivity, stage: p.stage })) });
});
// Deeper platform insights for the admin dashboards (usage, sign-ups, activity patterns, customer questions, record mix, storage growth).
route('GET', '/api/admin/insights', async (req) => {
  await requireAdmin(req, 'sub');
  const mondays = (n) => { const out = []; for (let k = n - 1; k >= 0; k--) { const d = new Date(); d.setUTCDate(d.getUTCDate() - k * 7); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); out.push(d.toISOString().slice(0, 10)); } return out; };
  const days = (n) => { const out = []; for (let k = n - 1; k >= 0; k--) { const d = new Date(); d.setUTCDate(d.getUTCDate() - k); out.push(d.toISOString().slice(0, 10)); } return out; };
  const months = (n) => { const out = []; for (let k = n - 1; k >= 0; k--) { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - k); out.push(d.toISOString().slice(0, 7)); } return out; };
  const su = await q(`SELECT to_char(date_trunc('week', created_at), 'YYYY-MM-DD') AS w, count(*) FILTER (WHERE email NOT LIKE '%@guest.local')::int AS staff, count(*) FILTER (WHERE email LIKE '%@guest.local')::int AS guests FROM app_users WHERE id <> $1 AND created_at > now() - interval '12 weeks' GROUP BY 1`, [OFFICE_ID]);
  const sm = Object.fromEntries(su.map(r => [r.w, r]));
  const da = await q(`SELECT to_char(last_seen, 'YYYY-MM-DD') AS d, count(DISTINCT user_id) FILTER (WHERE kind = 'consultant' AND user_id <> $1)::int AS staff, count(*) FILTER (WHERE kind = 'customer')::int AS customers FROM app_sessions WHERE last_seen > now() - interval '14 days' GROUP BY 1`, [OFFICE_ID]);
  const dm = Object.fromEntries(da.map(r => [r.d, r]));
  const heat = await q(`SELECT extract(dow FROM at)::int AS d, extract(hour FROM at)::int AS h, count(*)::int AS n FROM audit_log WHERE at > now() - interval '60 days' GROUP BY 1, 2`);
  const actions = await q(`SELECT action, count(*)::int AS n FROM audit_log WHERE at > now() - interval '30 days' GROUP BY 1 ORDER BY 2 DESC LIMIT 10`);
  const actors = await q(`SELECT COALESCE(u.name, a.actor, 'System') AS who, count(*)::int AS n FROM audit_log a LEFT JOIN app_users u ON u.id = a.actor WHERE a.at > now() - interval '30 days' GROUP BY 1 ORDER BY 2 DESC LIMIT 8`);
  const fbk = await q(`SELECT kind, priority, status, count(*)::int AS n FROM feedback GROUP BY 1, 2, 3`);
  const fbw = await q(`SELECT to_char(date_trunc('week', created_at), 'YYYY-MM-DD') AS w, count(*)::int AS n FROM feedback WHERE created_at > now() - interval '8 weeks' GROUP BY 1`);
  const fbr = await q1(`SELECT COALESCE(avg(extract(epoch FROM (updated_at - created_at)) / 3600), 0)::float AS hrs, count(*)::int AS n FROM feedback WHERE status <> 'open'`);
  const items = await q(`SELECT kind, COALESCE(data->>'status', '') AS st, count(*)::int AS n FROM project_items GROUP BY 1, 2`);
  const fs = await q(`SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS m, count(*)::int AS n, COALESCE(sum(size), 0)::bigint AS bytes FROM project_files WHERE deleted_at IS NULL AND created_at > now() - interval '6 months' GROUP BY 1`);
  const fm = Object.fromEntries(fs.map(r => [r.m, r])); const fwm = Object.fromEntries(fbw.map(r => [r.w, r.n]));
  return json({
    signups: mondays(12).map(w => ({ week: w, staff: (sm[w] || {}).staff || 0, guests: (sm[w] || {}).guests || 0 })),
    daily: days(14).map(d => ({ day: d, staff: (dm[d] || {}).staff || 0, customers: (dm[d] || {}).customers || 0 })),
    heat, actions, actors,
    feedback: { byKind: fbk, weekly: mondays(8).map(w => ({ week: w, n: fwm[w] || 0 })), avgHours: Math.round((fbr.hrs || 0) * 10) / 10, answered: fbr.n },
    items, storage: months(6).map(m => ({ month: m, n: (fm[m] || {}).n || 0, bytes: Number((fm[m] || {}).bytes || 0) })),
  });
});
route('GET', '/api/admin/projects/:id/detail', async (req, P) => {
  await requireAdmin(req, 'sub');
  const members = await q(`SELECT u.id, u.email, u.name, m.role, m.added_at FROM project_members m JOIN app_users u ON u.id = m.user_id WHERE m.project_id = $1 ORDER BY m.added_at`, [P.id]);
  const files = await q(`SELECT category, count(*)::int AS n, COALESCE(sum(size),0)::bigint AS bytes FROM project_files WHERE project_id = $1 AND deleted_at IS NULL GROUP BY category ORDER BY 3 DESC`, [P.id]);
  const kinds = await q(`SELECT kind, count(*)::int AS n FROM project_items WHERE project_id = $1 GROUP BY kind ORDER BY 2 DESC`, [P.id]);
  const log = await q(`SELECT a.action, a.detail, a.at, COALESCE(u.email, a.actor) AS who FROM audit_log a LEFT JOIN app_users u ON u.id = a.actor WHERE a.project_id = $1 ORDER BY a.id DESC LIMIT 12`, [P.id]);
  return json({ members: members.map(r => ({ id: r.id, email: r.email, name: r.name, role: r.role, addedAt: r.added_at })), files: files.map(f => ({ category: f.category, n: f.n, bytes: Number(f.bytes) })), kinds, log: log.map(l => ({ action: l.action, detail: l.detail || '', at: l.at, who: l.who || '' })) });
});
route('GET', '/api/admin/users', async (req) => {
  await requireAdmin(req, 'sub');
  const rows = await q(`SELECT u.id, u.email, u.name, u.disabled, u.created_at, (SELECT count(*)::int FROM project_members m WHERE m.user_id = u.id) AS projects,
      (SELECT max(last_seen) FROM app_sessions s WHERE s.user_id = u.id) AS last_seen FROM app_users u WHERE u.id <> $1 ORDER BY u.created_at DESC`, [OFFICE_ID]);
  const grants = await q(`SELECT email, role FROM admin_grants`).catch(() => []); const gm = Object.fromEntries(grants.map(g => [g.email, g.role]));
  return json({ users: rows.map(u => { const em = String(u.email).toLowerCase(); return { id: u.id, email: u.email, name: u.name, guest: isGuest(u.email), disabled: u.disabled, createdAt: u.created_at, projects: u.projects, lastSeen: u.last_seen, role: superAdmins().includes(em) ? 'super' : gm[em] || null }; }) });
});
route('PATCH', '/api/admin/users/:id', async (req, P) => {
  const s = await requireAdmin(req, 'admin'); const b = await body(req);
  const u = await q1(`SELECT * FROM app_users WHERE id = $1`, [P.id]); if (!u) throw new HttpError(404, 'User not found');
  const em = String(u.email).toLowerCase(); const g = await q1(`SELECT role FROM admin_grants WHERE email = $1`, [em]).catch(() => null);
  if (u.id === s.userId || superAdmins().includes(em)) throw new HttpError(400, 'This account cannot be disabled here');
  if (g && s.adminRole !== 'super') throw new HttpError(403, 'Only the platform owner can disable another admin');
  await q(`UPDATE app_users SET disabled = $2 WHERE id = $1`, [u.id, !!b.disabled]); if (b.disabled) await q(`DELETE FROM app_sessions WHERE user_id = $1`, [u.id]);
  await audit(null, s.userId, b.disabled ? 'admin_disable_user' : 'admin_enable_user', u.email);
  return json({ ok: true });
});
// Remove an account completely (staff or guest): signs them out everywhere, frees the email so they can sign up again, drops their project memberships and any admin grant.
// Projects they created stay (so customers and teammates keep the work); only the "created by" link is cleared. Platform owners and your own account cannot be removed.
route('DELETE', '/api/admin/users/:id', async (req, P) => {
  const s = await requireAdmin(req, 'admin');
  const u = await q1(`SELECT * FROM app_users WHERE id = $1`, [P.id]); if (!u) throw new HttpError(404, 'User not found');
  const em = String(u.email).toLowerCase(); const g = await q1(`SELECT role FROM admin_grants WHERE email = $1`, [em]).catch(() => null);
  if (u.id === s.userId || superAdmins().includes(em) || u.id === OFFICE_ID) throw new HttpError(400, 'This account cannot be removed here');
  if (g && s.adminRole !== 'super') throw new HttpError(403, 'Only the platform owner can remove another admin');
  await q(`DELETE FROM app_sessions WHERE user_id = $1`, [u.id]);
  await q(`DELETE FROM project_members WHERE user_id = $1`, [u.id]);
  await q(`UPDATE projects SET created_by = NULL WHERE created_by = $1`, [u.id]);
  if (g) { await q(`DELETE FROM admin_grants WHERE email = $1`, [em]).catch(() => { }); ROLE_CACHE.clear(); }
  await q(`DELETE FROM app_users WHERE id = $1`, [u.id]);
  await audit(null, s.userId, 'admin_remove_user', u.email);
  return json({ ok: true });
});
route('PATCH', '/api/admin/projects/:id', async (req, P) => {
  const s = await requireAdmin(req, 'admin'); const b = await body(req);
  const p = await q1(`SELECT * FROM projects WHERE id = $1`, [P.id]); if (!p) throw new HttpError(404, 'Project not found');
  if (b.archived !== undefined) { await q(`UPDATE projects SET archived = $2, updated_at = now() WHERE id = $1`, [p.id, !!b.archived]); await audit(p.id, s.userId, b.archived ? 'admin_archive_project' : 'admin_restore_project', p.name); }
  if (b.customerAccessEnabled === false) { await q(`UPDATE projects SET customer_access_enabled = false WHERE id = $1`, [p.id]); await audit(p.id, s.userId, 'admin_customer_access_off', p.name); }
  return json({ ok: true });
});
route('GET', '/api/admin/projects/:id/members', async (req, P) => {
  await requireAdmin(req, 'sub');
  const rows = await q(`SELECT u.id, u.email, u.name, m.role, m.added_at FROM project_members m JOIN app_users u ON u.id = m.user_id WHERE m.project_id = $1 ORDER BY m.added_at`, [P.id]);
  return json({ members: rows.map(r => ({ id: r.id, email: r.email, name: r.name, role: r.role, addedAt: r.added_at })) });
});
route('POST', '/api/admin/projects/:id/members', async (req, P) => {
  const s = await requireAdmin(req, 'admin'); const b = await body(req);
  const p = await q1(`SELECT id, name FROM projects WHERE id = $1`, [P.id]); if (!p) throw new HttpError(404, 'Project not found');
  const email = str(b.email, 200, 'Email', true).toLowerCase(); const role = ['owner', 'editor', 'viewer'].includes(b.role) ? b.role : 'editor';
  const u = await q1(`SELECT id FROM app_users WHERE email = $1`, [email]); if (!u) throw new HttpError(404, 'No account with that email yet. The person must create an account first.');
  await q(`INSERT INTO project_members(project_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role`, [p.id, u.id, role]);
  await audit(p.id, s.userId, 'admin_set_member', email + ' as ' + role); return json({ ok: true });
});
route('DELETE', '/api/admin/projects/:id/members/:uid', async (req, P) => {
  const s = await requireAdmin(req, 'admin');
  const owners = (await q1(`SELECT count(*)::int AS n FROM project_members WHERE project_id = $1 AND role = 'owner'`, [P.id])).n;
  const m = await q1(`SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`, [P.id, P.uid]); if (!m) throw new HttpError(404, 'Member not found');
  if (m.role === 'owner' && owners <= 1) throw new HttpError(400, 'A project needs at least one owner. Add another owner first.');
  await q(`DELETE FROM project_members WHERE project_id = $1 AND user_id = $2`, [P.id, P.uid]); await audit(P.id, s.userId, 'admin_remove_member', P.uid); return json({ ok: true });
});
route('GET', '/api/admin/audit', async (req) => {
  await requireAdmin(req, 'sub');
  const rows = await q(`SELECT a.id, a.project_id, a.actor, a.action, a.detail, a.at, p.name AS project, u.email AS actor_email FROM audit_log a LEFT JOIN projects p ON p.id = a.project_id LEFT JOIN app_users u ON u.id = a.actor ORDER BY a.id DESC LIMIT 200`);
  return json({ entries: rows.map(r => ({ id: r.id, projectId: r.project_id, project: r.project || '', actor: r.actor_email || r.actor || '', action: r.action, detail: r.detail || '', at: r.at })) });
});
// ---- access: who may use the admin panel (platform owner only) ----
const newTemp = () => crypto.randomBytes(12).toString('base64url');
const isEmail = e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
route('GET', '/api/admin/access', async (req) => {
  await requireAdmin(req, 'super');
  const grants = await q(`SELECT g.email, g.role, g.granted_by, g.created_at, u.name, u.disabled, (SELECT max(last_seen) FROM app_sessions s WHERE s.user_id = u.id) AS last_seen FROM admin_grants g LEFT JOIN app_users u ON u.email = g.email ORDER BY g.created_at DESC`);
  const owners = await q(`SELECT u.email, u.name, (SELECT max(last_seen) FROM app_sessions s WHERE s.user_id = u.id) AS last_seen FROM app_users u WHERE u.email = ANY($1)`, [superAdmins()]);
  return json({ owners: superAdmins().map(e => { const o = owners.find(x => x.email === e); return { email: e, name: o ? o.name : '', hasAccount: !!o, lastSeen: o ? o.last_seen : null }; }),
    grants: grants.map(g => ({ email: g.email, role: g.role, name: g.name || '', hasAccount: g.name !== null, disabled: !!g.disabled, grantedBy: g.granted_by || '', createdAt: g.created_at, lastSeen: g.last_seen })) });
});
route('POST', '/api/admin/access', async (req) => {
  const s = await requireAdmin(req, 'super'); const b = await body(req);
  const email = str(b.email, 200, 'Email', true).toLowerCase(); if (!isEmail(email)) throw new HttpError(400, 'Enter a valid email address');
  const role = b.role === 'admin' ? 'admin' : b.role === 'sub' ? 'sub' : null; if (!role) throw new HttpError(400, 'Choose Admin or Sub admin');
  if (superAdmins().includes(email)) throw new HttpError(400, 'That email is already a platform owner');
  const dom = A.allowedDomains(); if (dom.length && !dom.includes(email.split('@')[1])) throw new HttpError(403, 'This email domain is not allowed');
  const ex = await q1(`SELECT id FROM app_users WHERE email = $1`, [email]); let temp = null;
  if (!ex) { temp = newTemp(); const id = A.newId('u'); await q(`INSERT INTO app_users(id, email, name, pw_hash) VALUES ($1,$2,$3,$4)`, [id, email, str(b.name, 120, 'Name') || email.split('@')[0], await A.hashSecret(temp)]); }
  ROLE_CACHE.clear(); await q(`INSERT INTO admin_grants(email, role, granted_by) VALUES ($1,$2,$3) ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role`, [email, role, s.email]);
  await audit(null, s.userId, 'admin_grant_' + role, email);
  return json({ ok: true, created: !!temp, tempPassword: temp });
});
route('POST', '/api/admin/access/reset', async (req) => {
  const s = await requireAdmin(req, 'super'); const b = await body(req); const email = str(b.email, 200, 'Email', true).toLowerCase();
  const g = await q1(`SELECT role FROM admin_grants WHERE email = $1`, [email]); if (!g) throw new HttpError(404, 'That person does not have admin access');
  const u = await q1(`SELECT id FROM app_users WHERE email = $1`, [email]); if (!u) throw new HttpError(404, 'No account for that email');
  const temp = newTemp(); await q(`UPDATE app_users SET pw_hash = $2, disabled = false WHERE id = $1`, [u.id, await A.hashSecret(temp)]); await q(`DELETE FROM app_sessions WHERE user_id = $1`, [u.id]);
  await audit(null, s.userId, 'admin_reset_password', email); return json({ ok: true, tempPassword: temp });
});
route('POST', '/api/admin/access/revoke', async (req) => {
  const s = await requireAdmin(req, 'super'); const b = await body(req); const email = str(b.email, 200, 'Email', true).toLowerCase();
  await q(`DELETE FROM admin_grants WHERE email = $1`, [email]); ROLE_CACHE.clear(); await audit(null, s.userId, 'admin_revoke', email); return json({ ok: true });
});
// a signed-in person changes their own password
route('POST', '/api/auth/password', async (req) => {
  const s = await requireSession(req); if (s.kind !== 'consultant' || s.open || isGuest(s.email)) throw new HttpError(400, 'Only full accounts have a password');
  const b = await body(req); const u = await q1(`SELECT pw_hash FROM app_users WHERE id = $1`, [s.userId]);
  if (!(await A.verifySecret(typeof b.current === 'string' ? b.current : '', u && u.pw_hash))) throw new HttpError(403, 'Current password is not correct');
  const next = typeof b.next === 'string' ? b.next : ''; if (next.length < 10) throw new HttpError(400, 'New password must be at least 10 characters');
  await q(`UPDATE app_users SET pw_hash = $2 WHERE id = $1`, [s.userId, await A.hashSecret(next)]); await q(`DELETE FROM app_sessions WHERE user_id = $1 AND token_hash <> $2`, [s.userId, s.tokenHash]);
  await audit(null, s.userId, 'password_changed', ''); return json({ ok: true });
});

export async function handle(req) {
  try {
    const url = new URL(req.url); const path = url.pathname.replace(/\/+$/, '');
    csrf(req);
    for (const r of routes) { if (r.method !== req.method) continue; const m = path.match(r.re); if (m) return await r.fn(req, m.groups || {}); }
    if (routes.some(r => path.match(r.re))) return json({ error: 'Method not allowed' }, 405);
    return json({ error: 'Not found' }, 404);
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error('API error', e);
    return json({ error: 'Server error' }, 500);
  }
}

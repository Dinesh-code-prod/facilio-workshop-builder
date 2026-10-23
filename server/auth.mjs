// Authentication: scrypt password hashing, server-side sessions in HttpOnly cookies, login throttling.
import crypto from 'node:crypto';
import { q, q1, env } from './infra.mjs';

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
export const COOKIE = 'fwb_sid';
const CONSULTANT_IDLE_H = 12, CONSULTANT_MAX_D = 7, CUSTOMER_MAX_H = 24;

export function newId(prefix) { return (prefix ? prefix + '_' : '') + crypto.randomBytes(12).toString('base64url'); }
function scrypt(pw, salt) { return new Promise((res, rej) => crypto.scrypt(pw, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: 64 * 1024 * 1024 }, (e, k) => e ? rej(e) : res(k))); }
export async function hashSecret(pw) { const salt = crypto.randomBytes(16); const k = await scrypt(pw, salt); return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), k.toString('base64')].join('$'); }
export async function verifySecret(pw, stored) {
  if (!stored || typeof pw !== 'string') return false;
  const [alg, , , , s, h] = stored.split('$'); if (alg !== 'scrypt') return false;
  const k = await scrypt(pw, Buffer.from(s, 'base64')); const want = Buffer.from(h, 'base64');
  return want.length === k.length && crypto.timingSafeEqual(want, k);
}
export function safeEqual(a, b) { const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || '')); return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y); }
const sha = t => crypto.createHash('sha256').update(t).digest('hex');

export async function tooManyFailures(subject) {
  const r = await q1(`SELECT count(*)::int AS n FROM auth_failures WHERE subject = $1 AND at > now() - interval '15 minutes'`, [subject]);
  return r && r.n >= 8;
}
export async function recordFailure(subject) { await q(`INSERT INTO auth_failures(subject) VALUES ($1)`, [subject]); }
export async function clearFailures(subject) { await q(`DELETE FROM auth_failures WHERE subject = $1`, [subject]); }

export async function createSession({kind, userId, projectId, displayName }) {
  if (Math.random() < 0.05) { q(`DELETE FROM app_sessions WHERE expires_at < now() - interval '1 day'`).catch(() => { }); q(`DELETE FROM auth_failures WHERE at < now() - interval '2 days'`).catch(() => { }); } // keep the tables small 
  const token = crypto.randomBytes(32).toString('base64url');
  const hours = kind === 'customer' ? CUSTOMER_MAX_H : CONSULTANT_MAX_D * 24;
  await q(`INSERT INTO app_sessions(token_hash, kind, user_id, project_id, display_name, expires_at) VALUES ($1,$2,$3,$4,$5, now() + ($6 || ' hours')::interval)`,
    [sha(token), kind, userId || null, projectId || null, displayName || null, String(hours)]);
  return { token, maxAge: hours * 3600 };
}
export function cookieHeader(token, maxAge, secure) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}
export function clearCookie(secure) { return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`; }
export function readCookie(req) {
  const c = req.headers.get('cookie') || ''; const m = c.split(/;\s*/).find(x => x.startsWith(COOKIE + '='));
  return m ? m.slice(COOKIE.length + 1) : null;
}
export async function sessionFrom(req) {
  const token = readCookie(req); if (!token || token.length < 20) return null;
  const s = await q1(`SELECT s.*, u.email, u.name AS user_name, u.disabled FROM app_sessions s LEFT JOIN app_users u ON u.id = s.user_id WHERE s.token_hash = $1`, [sha(token)]);
  if (!s) return null;
  const now = Date.now();
  const idleLimit = s.kind === 'consultant' ? CONSULTANT_IDLE_H * 3600e3 : CUSTOMER_MAX_H * 3600e3;
  if (new Date(s.expires_at).getTime() < now || now - new Date(s.last_seen).getTime() > idleLimit || s.disabled) { await q(`DELETE FROM app_sessions WHERE token_hash = $1`, [sha(token)]); return null; }
  if (now - new Date(s.last_seen).getTime() > 5 * 60e3) await q(`UPDATE app_sessions SET last_seen = now() WHERE token_hash = $1`, [sha(token)]);
  return { kind: s.kind, userId: s.user_id, email: s.email, name: s.kind === 'consultant' ? s.user_name : s.display_name, projectId: s.project_id, tokenHash: sha(token) };
}
export async function destroySession(req) { const t = readCookie(req); if (t) await q(`DELETE FROM app_sessions WHERE token_hash = $1`, [sha(t)]); }
export function inviteCode() { return env('SIGNUP_INVITE_CODE', env('FWB_DEV') === '1' ? 'dev-invite' : ''); }
export function allowedDomains() { return (env('ALLOWED_EMAIL_DOMAINS', '') || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean); }

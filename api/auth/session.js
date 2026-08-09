import crypto from 'crypto';
import { query } from '../db.js';

export function parseCookies(request) {
  const header = request.headers.cookie || '';
  return header.split(';').reduce((cookies, part) => {
    const [name, ...rest] = part.trim().split('=');
    cookies[name] = rest.join('=');
    return cookies;
  }, {});
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId, tokenHash, expiresAt) {
  await query(
    'INSERT INTO sessions (user_id, token_hash, expires_at, created_at, last_used_at) VALUES ($1, $2, $3, now(), now())',
    [userId, tokenHash, expiresAt]
  );
}

export async function getAuthenticatedUser(request) {
  const cookies = parseCookies(request);
  const token = cookies.session_token;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const sessionResult = await query(
    'SELECT s.user_id FROM sessions s WHERE s.token_hash = $1 AND s.expires_at > now() AND s.revoked_at IS NULL',
    [tokenHash]
  );

  if (sessionResult.rowCount === 0) {
    return null;
  }

  const userId = sessionResult.rows[0].user_id;
  const userResult = await query('SELECT id, username, full_name, email, phone, status FROM users WHERE id = $1', [userId]);
  const user = userResult.rows[0];
  if (!user) return null;

  const rolesResult = await query(
    'SELECT r.name, r.level FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = $1',
    [userId]
  );

  const roles = rolesResult.rows;
  const effectiveLevel = roles.reduce((max, role) => Math.max(max, role.level), 0);

  return { ...user, roles, effectiveLevel };
}

export async function revokeSession(request) {
  const cookies = parseCookies(request);
  const token = cookies.session_token;
  if (!token) return;

  const tokenHash = hashToken(token);
  await query('UPDATE sessions SET revoked_at = now() WHERE token_hash = $1', [tokenHash]);
}

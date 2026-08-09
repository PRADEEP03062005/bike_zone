import argon2 from 'argon2';
import { query } from '../db.js';
import { serialize } from 'cookie';
import { v4 as uuidv4 } from 'uuid';
import { hashToken } from './session.js';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function sendJSON(response, status, body) {
  response.status(status).setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(body));
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return sendJSON(response, 405, { error: 'Method not allowed' });
  }

  const body = await new Promise((resolve) => {
    let data = '';
    request.on('data', (chunk) => {
      data += chunk;
    });
    request.on('end', () => resolve(JSON.parse(data || '{}')));
  });

  const { username, password } = body;
  if (!username || !password) {
    return sendJSON(response, 400, { error: 'Username and password are required' });
  }

  const userResult = await query(
    'SELECT id, username, password_hash, status FROM users WHERE username = $1',
    [username]
  );

  const user = userResult.rows[0];
  if (!user) {
    return sendJSON(response, 401, { error: 'Invalid username or password' });
  }

  if (user.status !== 'ACTIVE') {
    return sendJSON(response, 403, { error: 'Account is not active' });
  }

  const validPassword = await argon2.verify(user.password_hash, password);
  if (!validPassword) {
    return sendJSON(response, 401, { error: 'Invalid username or password' });
  }

  const sessionToken = uuidv4();
  const sessionTokenHash = hashToken(sessionToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();

  await query(
    'INSERT INTO sessions (user_id, token_hash, expires_at, created_at, last_used_at) VALUES ($1, $2, $3, now(), now())',
    [user.id, sessionTokenHash, expiresAt]
  );

  await query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);

  const rolesResult = await query(
    'SELECT r.name, r.level FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = $1',
    [user.id]
  );

  response.setHeader('Set-Cookie', serialize('session_token', sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  }));

  return sendJSON(response, 200, { user: { id: user.id, username: user.username, full_name: user.full_name, roles: rolesResult.rows } });
}


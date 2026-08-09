import { serialize } from 'cookie';
import { query } from '../db.js';
import { parseCookies, hashToken } from './session.js';

function sendJSON(response, status, body) {
  response.status(status).setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(body));
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return sendJSON(response, 405, { error: 'Method not allowed' });
  }

  const cookies = parseCookies(request);
  const token = cookies.session_token;
  if (token) {
    const tokenHash = hashToken(token);
    await query('UPDATE sessions SET revoked_at = now() WHERE token_hash = $1', [tokenHash]);
  }

  response.setHeader('Set-Cookie', serialize('session_token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 0,
  }));

  return sendJSON(response, 200, { message: 'Logged out successfully' });
}

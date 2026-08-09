import argon2 from 'argon2';
import { query } from '../db.js';
import { parseJSON } from '../utils.js';

function sendJSON(response, status, body) {
  response.status(status).setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(body));
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return sendJSON(response, 405, { error: 'Method not allowed' });
  }

  const body = await parseJSON(request);
  const { username, password, full_name, email, phone } = body;
  if (!username || !password || !full_name) {
    return sendJSON(response, 400, { error: 'Username, password, and full name are required' });
  }

  try {
    const existingRequest = await query('SELECT id FROM registration_requests WHERE username = $1', [username]);
    if (existingRequest.rowCount > 0) {
      return sendJSON(response, 409, { error: 'Username is already requested' });
    }

    const existingUser = await query('SELECT id FROM users WHERE username = $1', [username]);
    if (existingUser.rowCount > 0) {
      return sendJSON(response, 409, { error: 'Username is already registered' });
    }

    const passwordHash = await argon2.hash(password);
    await query(
      'INSERT INTO registration_requests (username, password_hash, full_name, email, phone, status, requested_at) VALUES ($1, $2, $3, $4, $5, $6, now())',
      [username, passwordHash, full_name, email || null, phone || null, 'PENDING']
    );

    return sendJSON(response, 201, { message: 'Registration request submitted' });
  } catch (error) {
    if (error?.code === '23505' || /duplicate key|unique constraint/i.test(error?.message || '')) {
      return sendJSON(response, 409, { error: 'This username is already in use' });
    }

    console.error('Registration failed:', error);
    return sendJSON(response, 500, { error: 'Registration failed' });
  }
}

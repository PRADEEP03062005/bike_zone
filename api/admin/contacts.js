import { query } from '../db.js';
import { sendJSON, parseJSON } from '../utils.js';
import { getAuthenticatedUser } from '../auth/session.js';

export default async function handler(request, response) {
  const currentUser = await getAuthenticatedUser(request);
  if (!currentUser || !currentUser.roles?.some((role) => role.name === 'ADMIN')) {
    return sendJSON(response, 403, { error: 'Admin access required' });
  }

  await query(`
    CREATE TABLE IF NOT EXISTS contact_numbers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  if (request.method === 'GET') {
    const contactsResult = await query(
      'SELECT id, name, phone, status, created_at FROM contact_numbers ORDER BY created_at DESC'
    );
    return sendJSON(response, 200, { contacts: contactsResult.rows });
  }

  if (request.method === 'POST') {
    const body = await parseJSON(request);
    const name = (body.name || '').toString().trim();
    const phone = (body.phone || '').toString().trim();

    if (!name || !phone) {
      return sendJSON(response, 400, { error: 'Name and phone are required' });
    }

    const insertResult = await query(
      'INSERT INTO contact_numbers (name, phone, status, created_at, updated_at) VALUES ($1, $2, $3, now(), now()) RETURNING id, name, phone, status, created_at',
      [name, phone, 'ACTIVE']
    );

    return sendJSON(response, 201, { contact: insertResult.rows[0] });
  }

  return sendJSON(response, 405, { error: 'Method not allowed' });
}

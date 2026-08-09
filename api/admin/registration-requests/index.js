import { query } from '../../db.js';
import { sendJSON, parseJSON } from '../../utils.js';
import { getAuthenticatedUser } from '../../auth/session.js';

export default async function handler(request, response) {
  if (request.method === 'GET') {
    const requests = await query(
      'SELECT id, username, full_name, email, phone, status, requested_at, rejection_reason FROM registration_requests ORDER BY requested_at DESC'
    );

    return sendJSON(response, 200, { requests: requests.rows });
  }

  if (request.method !== 'POST') {
    return sendJSON(response, 405, { error: 'Method not allowed' });
  }

  const body = await parseJSON(request);
  const { action, requestId, rejectionReason } = body;

  if (!requestId || !action) {
    return sendJSON(response, 400, { error: 'requestId and action are required' });
  }

  const currentUser = await getAuthenticatedUser(request);
  if (!currentUser || !currentUser.roles?.some((role) => role.name === 'ADMIN')) {
    return sendJSON(response, 403, { error: 'Admin access required' });
  }

  const requestResult = await query('SELECT * FROM registration_requests WHERE id = $1', [requestId]);
  const requestRow = requestResult.rows[0];
  if (!requestRow) {
    return sendJSON(response, 404, { error: 'Registration request not found' });
  }

  if (action === 'approve') {
    const existingUserResult = await query('SELECT id FROM users WHERE username = $1', [requestRow.username]);
    let userId;

    if (existingUserResult.rows.length > 0) {
      userId = existingUserResult.rows[0].id;
      await query(
        'UPDATE users SET password_hash = $1, full_name = $2, email = $3, phone = $4, status = $5, updated_at = now() WHERE id = $6',
        [requestRow.password_hash, requestRow.full_name, requestRow.email, requestRow.phone, 'ACTIVE', userId]
      );
    } else {
      const insertUserResult = await query(
        'INSERT INTO users (username, password_hash, full_name, email, phone, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, now(), now()) RETURNING id',
        [requestRow.username, requestRow.password_hash, requestRow.full_name, requestRow.email, requestRow.phone, 'ACTIVE']
      );
      userId = insertUserResult.rows[0].id;
    }

    const adminRoleResult = await query('SELECT id FROM roles WHERE name = $1', ['ADMIN']);
    const roleId = adminRoleResult.rows[0].id;
    await query(
      'INSERT INTO user_roles (user_id, role_id, assigned_by, assigned_at) VALUES ($1, $2, $3, now()) ON CONFLICT DO NOTHING',
      [userId, roleId, currentUser.id]
    );

    await query(
      'UPDATE registration_requests SET status = $1, reviewed_by = $2, reviewed_at = now(), rejection_reason = NULL WHERE id = $3',
      ['APPROVED', currentUser.id, requestId]
    );

    await query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6, now())',
      [currentUser.id, 'USER_APPROVED', 'USER', userId, 'Approved registration request and assigned admin role', JSON.stringify({ username: requestRow.username })]
    );

    return sendJSON(response, 200, { ok: true, userId });
  }

  if (action === 'reject') {
    await query(
      'UPDATE registration_requests SET status = $1, reviewed_by = $2, reviewed_at = now(), rejection_reason = $3 WHERE id = $4',
      ['REJECTED', currentUser.id, rejectionReason || 'No reason provided', requestId]
    );

    return sendJSON(response, 200, { ok: true });
  }

  return sendJSON(response, 400, { error: 'Unsupported action' });
}

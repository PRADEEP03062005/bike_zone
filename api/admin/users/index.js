import { query } from '../../db.js';
import { parseJSON, sendJSON } from '../../utils.js';
import { getAuthenticatedUser } from '../../auth/session.js';

export default async function handler(request, response) {
  const currentUser = await getAuthenticatedUser(request);
  if (!currentUser || !currentUser.roles?.some((role) => role.name === 'ADMIN')) {
    return sendJSON(response, 403, { error: 'Admin access required' });
  }

  if (request.method === 'GET') {
    const [usersResult, rolesResult] = await Promise.all([
      query('SELECT id, username, full_name, email, phone, status, created_at FROM users ORDER BY created_at DESC'),
      query('SELECT id, name, level FROM roles ORDER BY level ASC')
    ]);

    const users = await Promise.all(usersResult.rows.map(async (user) => {
      const roleResult = await query(
        'SELECT r.id, r.name, r.level FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = $1 ORDER BY r.level ASC',
        [user.id]
      );
      return { ...user, roles: roleResult.rows };
    }));

    return sendJSON(response, 200, { users, roles: rolesResult.rows });
  }

  if (request.method === 'POST') {
    const body = await parseJSON(request);
    const { userId, roleId, action } = body;
    if (!userId || !roleId || !action) {
      return sendJSON(response, 400, { error: 'userId, roleId, and action are required' });
    }

    if (action === 'assign') {
      await query(
        'INSERT INTO user_roles (user_id, role_id, assigned_by, assigned_at) VALUES ($1, $2, $3, now()) ON CONFLICT DO NOTHING',
        [userId, roleId, currentUser.id]
      );
    } else if (action === 'remove') {
      await query('DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2', [userId, roleId]);
    } else {
      return sendJSON(response, 400, { error: 'Unsupported action' });
    }

    await query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6, now())',
      [currentUser.id, action === 'assign' ? 'ROLE_ASSIGNED' : 'ROLE_REMOVED', 'USER_ROLE', userId, `${action === 'assign' ? 'Assigned' : 'Removed'} role`, JSON.stringify({ roleId })]
    );

    return sendJSON(response, 200, { ok: true });
  }

  return sendJSON(response, 405, { error: 'Method not allowed' });
}

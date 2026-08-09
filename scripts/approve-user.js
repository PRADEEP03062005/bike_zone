import { query } from '../api/db.js';

const username = 'pradeepkopparthi';
const passwordHash = '$argon2id$v=19$m=65536,t=3,p=4$LA8HLMN0xl1+aGIiJKQG0w$Vqp0xijJlzssIBrx9y8CPtFFEkdRLqZQrb3meq/+G/4';
const fullName = 'BHASKARA NAGA PRADEEP KOPPARTHI';
const email = 'pradeepkopparthi2005@gmail.com';
const phone = '09059510887';

async function run() {
  const requestResult = await query('SELECT id FROM registration_requests WHERE username = $1', [username]);
  if (requestResult.rows.length === 0) {
    console.log('Registration request not found');
    process.exit(1);
  }

  const requestId = requestResult.rows[0].id;
  const existingUserResult = await query('SELECT id FROM users WHERE username = $1', [username]);

  let userId;
  if (existingUserResult.rows.length > 0) {
    userId = existingUserResult.rows[0].id;
    await query(
      'UPDATE users SET password_hash = $1, full_name = $2, email = $3, phone = $4, status = $5, updated_at = now() WHERE id = $6',
      [passwordHash, fullName, email, phone, 'ACTIVE', userId]
    );
  } else {
    const insertUserResult = await query(
      'INSERT INTO users (username, password_hash, full_name, email, phone, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, now(), now()) RETURNING id',
      [username, passwordHash, fullName, email, phone, 'ACTIVE']
    );
    userId = insertUserResult.rows[0].id;
  }

  const adminRoleResult = await query('SELECT id FROM roles WHERE name = $1', ['ADMIN']);
  const roleId = adminRoleResult.rows[0].id;

  await query(
    'INSERT INTO user_roles (user_id, role_id, assigned_by, assigned_at) VALUES ($1, $2, $1, now()) ON CONFLICT DO NOTHING',
    [userId, roleId]
  );

  await query(
    'UPDATE registration_requests SET status = $1, reviewed_by = $2, reviewed_at = now() WHERE id = $3',
    ['APPROVED', userId, requestId]
  );

  await query(
    'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6, now())',
    [userId, 'USER_APPROVED', 'USER', userId, 'Approved registration request and assigned admin role', JSON.stringify({ username })]
  );

  console.log(JSON.stringify({ username, userId, roleId, requestId }));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

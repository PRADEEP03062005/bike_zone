import argon2 from 'argon2';
import { createPool } from '@neondatabase/serverless';
import readline from 'readline';

const pool = createPool(process.env.DATABASE_URL || '');

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => {
    rl.close();
    resolve(answer.trim());
  }));
}

async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

async function run() {
  const username = await prompt('Admin username: ');
  const fullName = await prompt('Full name: ');
  const email = await prompt('Email: ');
  const password = await prompt('Password: ');

  const passwordHash = await argon2.hash(password);

  const userResult = await query(
    'INSERT INTO users (username, password_hash, full_name, email, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, now(), now()) RETURNING id',
    [username, passwordHash, fullName, email || null, 'ACTIVE']
  );

  const userId = userResult.rows[0].id;
  const adminRole = await query('SELECT id FROM roles WHERE name = $1', ['ADMIN']);
  const adminRoleId = adminRole.rows[0].id;

  await query(
    'INSERT INTO user_roles (user_id, role_id, assigned_by, assigned_at) VALUES ($1, $2, $3, now()) ON CONFLICT DO NOTHING',
    [userId, adminRoleId, userId]
  );

  console.log('Created admin user with id:', userId);
  process.exit(0);
}

run().catch((error) => {
  console.error('Error creating admin:', error);
  process.exit(1);
});

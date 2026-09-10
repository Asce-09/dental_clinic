/**
 * Creates (or promotes) an admin user.
 * Usage:
 *   npm run create-admin -- --email=you@clinic.com --password=SomethingStrong123 --first=Jane --last=Doe
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool } = require('../config/db');

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    args[key] = value;
  });
  return args;
}

async function main() {
  const { email, password, first, last, phone } = parseArgs();

  if (!email || !password || !first || !last) {
    console.error(
      'Missing required args. Example:\n' +
        '  npm run create-admin -- --email=you@clinic.com --password=SomethingStrong123 --first=Jane --last=Doe'
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const [[adminRole]] = await pool.query("SELECT id FROM roles WHERE name = 'admin' LIMIT 1");
  if (!adminRole) {
    console.error('No "admin" role found. Did you import dental_clinic_database.sql?');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);

  if (existing.length) {
    await pool.query(
      'UPDATE users SET role_id = ?, password_hash = ?, status = "active" WHERE email = ?',
      [adminRole.id, passwordHash, email]
    );
    console.log(`Updated existing user "${email}" to admin with a new password.`);
  } else {
    await pool.query(
      `INSERT INTO users (role_id, first_name, last_name, email, phone, password_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [adminRole.id, first, last, email, phone || null, passwordHash]
    );
    console.log(`Created admin user "${email}".`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

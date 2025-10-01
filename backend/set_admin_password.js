// One-off script to reset admin password (development only)
// Usage: node backend\set_admin_password.js

require('dotenv').config();
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@iot-monitor.com';
const NEW_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'iot_monitor'
});

async function main() {
  try {
    const hash = bcrypt.hashSync(NEW_PASSWORD, 10);
    console.log(`Setting password for ${ADMIN_EMAIL} to '${NEW_PASSWORD}' (bcrypt hashed)...`);

    const [result] = await db.promise().execute(
      'UPDATE usuarios SET password = ? WHERE email = ?',
      [hash, ADMIN_EMAIL]
    );

    if (result.affectedRows && result.affectedRows > 0) {
      console.log(`✅ Password updated for ${ADMIN_EMAIL} (affectedRows=${result.affectedRows}).`);
    } else {
      console.log(`⚠️ No rows updated. Is there a user with email ${ADMIN_EMAIL} ?`);
    }
  } catch (e) {
    console.error('❌ Error updating password:', e && e.stack ? e.stack : e);
    process.exit(1);
  } finally {
    db.end();
  }
}

main();

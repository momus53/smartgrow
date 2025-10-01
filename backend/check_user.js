const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'iot_monitor'
});

db.connect(err => {
  if (err) return console.error('DB connect error:', err);
  const email = 'admin@iot-monitor.com';
  db.query('SELECT id, username, email, password, rol, activo FROM usuarios WHERE email = ? LIMIT 1', [email], (err, rows) => {
    if (err) { console.error('Query error:', err); process.exit(1); }
    if (!rows || !rows.length) { console.log('No user found for', email); process.exit(0); }
    const u = rows[0];
    console.log('User:', { id: u.id, username: u.username, email: u.email, password_hash: u.password, rol: u.rol, activo: !!u.activo });
    process.exit(0);
  });
});
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_prod';

module.exports = function (db) {
  const router = express.Router();

  const signToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

  function autenticarToken(req, res, next) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token no proporcionado' });
    const parts = authHeader.split(' ');
    const token = parts.length === 2 ? parts[1] : parts[0];

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return res.status(401).json({ error: 'Token inválido o expirado' });
      const q = 'SELECT id, activa, fecha_expiracion FROM sesiones WHERE token = ? LIMIT 1';
      db.query(q, [token], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error verificando sesión' });
        if (!rows || !rows.length) return res.status(401).json({ error: 'Sesión no encontrada' });
        const s = rows[0];
        if (!s.activa) return res.status(401).json({ error: 'Sesión invalidada' });
        if (s.fecha_expiracion && new Date(s.fecha_expiracion) < new Date()) return res.status(401).json({ error: 'Sesión expirada' });
        req.user = decoded;
        req.session = s;
        next();
      });
    });
  }

  // DEV DEBUG: store last login attempt (sanitized) for troubleshooting
  let lastLoginAttempt = null;

  // dev-only debug endpoint attached to this router so it has access to lastLoginAttempt
  if (process.env.NODE_ENV !== 'production') {
    router.get('/_debug/last_login', (req, res) => {
      try {
        return res.json({ lastLoginAttempt: lastLoginAttempt || null });
      } catch (e) {
        return res.status(500).json({ error: 'No se pudo obtener intento' });
      }
    });
  }

  // dev-only: check password against DB hash
  if (process.env.NODE_ENV !== 'production') {
    router.post('/_debug/check_password', (req, res) => {
      const { username, email, password } = req.body || {};
      if ((!username && !email) || !password) return res.status(400).json({ error: 'username/email y password requeridos' });
      const where = email ? 'email = ?' : 'username = ?';
      const param = email || username;
      const q = `SELECT id, username, email, password FROM usuarios WHERE ${where} LIMIT 1`;
      db.query(q, [param], (err, rows) => {
        if (err) {
          console.error('[auth] DB error on debug check_password:', err);
          return res.status(500).json({ error: 'Error DB' });
        }
        if (!rows || !rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
        const u = rows[0];
        let ok = false;
        try {
          ok = require('bcryptjs').compareSync(password, u.password);
        } catch (e) {
          console.error('[auth] bcrypt compare error in debug endpoint:', e && e.stack ? e.stack : e);
          return res.status(500).json({ error: 'Error interno' });
        }
        return res.json({ match: ok, user: { id: u.id, username: u.username, email: u.email } });
      });
    });
  }


  // register
  router.post('/register', (req, res) => {
    const { username, email, password, nombre_completo } = req.body || {};
    if (!username || !email || !password) return res.status(400).json({ error: 'username, email y password son requeridos' });
    const q = 'SELECT id FROM usuarios WHERE username = ? OR email = ? LIMIT 1';
    db.query(q, [username, email], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Error del servidor' });
      if (rows && rows.length) return res.status(409).json({ error: 'Username o email ya registrado' });
      const hash = bcrypt.hashSync(password, 10);
      const ins = `INSERT INTO usuarios (username, email, password, nombre_completo, rol, activo) VALUES (?, ?, ?, ?, 'usuario', TRUE)`;
      db.query(ins, [username, email, hash, nombre_completo || null], (err, result) => {
        if (err) return res.status(500).json({ error: 'Error creando usuario' });
        const userId = result.insertId;
        const token = signToken({ id: userId, username, email });
        const exp = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
        const ip = req.ip || (req.connection && req.connection.remoteAddress) || null;
        const ua = req.get('user-agent') || null;
        const insSes = 'INSERT INTO sesiones (usuario_id, token, ip_address, user_agent, fecha_expiracion, activa) VALUES (?, ?, ?, ?, ?, TRUE)';
        db.query(insSes, [userId, token, ip, ua, exp], (err) => {
          if (err) console.warn('No se pudo crear sesión en DB (register):', err);
          return res.status(201).json({ success: true, token, user: { id: userId, username, email, nombre_completo } });
        });
      });
    });
  });

  // login
  router.post('/login', (req, res) => {
    try {
  const { username, email, password } = req.body || {};
  // decide lookup method early to avoid temporal-dead-zone if additional logs reference it
  const useEmail = !!email;
  console.log('[auth] /login handler start - parsed body keys:', Object.keys(req.body || {}));
    // Debug logging to help diagnose frontend mismatches (avoid logging raw password)
    try {
      lastLoginAttempt = {
        username: username || null,
        email: email || null,
        password_present: !!password,
        ip: req.ip || (req.connection && req.connection.remoteAddress) || null,
        headers: {
          origin: req.headers.origin || null,
          referer: req.headers.referer || null,
          'content-type': req.headers['content-type'] || null
        },
        timestamp: new Date()
      };
      console.log('[auth] login attempt ->', lastLoginAttempt);
    } catch (e) {
      // non-fatal
    }
  if ((!username && !email) || !password) return res.status(400).json({ error: 'username/email y password son requeridos' });
  console.log('[auth] validated input - will lookup by', useEmail ? 'email' : 'username');
  console.log('[auth] lookup param (redacted):', useEmail ? String(email).slice(0,40) : String(username).slice(0,40));
  // Prefer email lookup when the client provides an email value. This avoids accidental username
  // lookups when the user typed an email-like string.
  const where = useEmail ? 'email = ?' : 'username = ?';
  const param = useEmail ? email : username;
    const q = `SELECT id, username, email, password, nombre_completo, rol FROM usuarios WHERE ${where} LIMIT 1`;
  console.log('[auth] about to run SELECT query for login');
  db.query(q, [param], (err, rows) => {
    console.log('[auth] entered login db callback');
      if (err) {
        console.error('[auth] DB error on login query:', err);
        return res.status(500).json({ error: 'Error del servidor' });
      }
      if (!rows || !rows.length) return res.status(401).json({ error: 'Credenciales inválidas' });
      const user = rows[0];
      console.log('[auth] user fetched -> id:', user.id, 'username:', user.username, 'email:', user.email);
      // DEV: log some metadata about the stored password hash (do not log full hash in production)
      try {
        const stored = user.password;
        console.log('[auth] stored password hash info -> type:', typeof stored, 'len:', String(stored).length, 'prefix:', String(stored).slice(0,7));
      } catch (e) {
        console.warn('[auth] could not log stored password metadata', e && e.stack ? e.stack : e);
      }
      if (!bcrypt.compareSync(password, user.password)) {
        // Avoid logging the provided password; log metadata to help debugging.
        console.warn('[auth] password mismatch for user id', user.id, 'username:', user.username, 'email:', user.email);
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }
      console.log('[auth] password match OK for user id', user.id);
      // Create JWT token (guard and log any errors)
      let token;
      try {
        token = signToken({ id: user.id, username: user.username, email: user.email, rol: user.rol });
        console.log('[auth] token created for user id', user.id);
      } catch (e) {
        console.error('[auth] error creating token:', e && e.stack ? e.stack : e);
        return res.status(500).json({ error: 'Error generando token' });
      }

      const exp = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
      const ip = req.ip || (req.connection && req.connection.remoteAddress) || null;
      const ua = req.get('user-agent') || null;
      const insSes = 'INSERT INTO sesiones (usuario_id, token, ip_address, user_agent, fecha_expiracion, activa) VALUES (?, ?, ?, ?, ?, TRUE)';

      console.log('[auth] inserting session for user id', user.id, 'exp:', exp);
      db.query(insSes, [user.id, token, ip, ua, exp], (err, result) => {
        if (err) {
          console.error('[auth] DB error inserting session:', err);
          return res.status(500).json({ error: 'Error del servidor' });
        }
        console.log('[auth] session insert result:', result && result.insertId ? { insertId: result.insertId } : result);
        return res.json({ success: true, token, user: { id: user.id, username: user.username, email: user.email, nombre_completo: user.nombre_completo, rol: user.rol } });
      });
    });
    } catch (e) {
      console.error('[auth] unexpected error in /login handler:', e && e.stack ? e.stack : e);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // logout
  router.post('/logout', autenticarToken, (req, res) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const parts = authHeader.split(' ');
    const token = parts.length === 2 ? parts[1] : parts[0];
    const upd = 'UPDATE sesiones SET activa = FALSE WHERE token = ?';
    db.query(upd, [token], (err, result) => {
      if (err) return res.status(500).json({ error: 'Error del servidor' });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Sesión no encontrada' });
      res.json({ success: true, message: 'Sesión cerrada' });
    });
  });

  // me
  router.get('/me', autenticarToken, (req, res) => {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(400).json({ error: 'Usuario no identificado en token' });
    const q = 'SELECT id, username, email, nombre_completo, rol, activo, fecha_registro, ultimo_acceso FROM usuarios WHERE id = ? LIMIT 1';
    db.query(q, [userId], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Error del servidor' });
      if (!rows || !rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
      res.json({ user: rows[0] });
    });
  });

  return router;
};

// Dev-only helper to check a plaintext password against a user record (non-production)
if (process.env.NODE_ENV !== 'production') {
  // Attach a tiny router to expose a password check endpoint for debugging
  module.exports.__dev_check_password = function(db) {
    const r = require('express').Router();
    r.post('/_debug/check_password', (req, res) => {
      const { username, email, password } = req.body || {};
      if ((!username && !email) || !password) return res.status(400).json({ error: 'username/email y password requeridos' });
      const where = email ? 'email = ?' : 'username = ?';
      const param = email || username;
      const q = `SELECT id, username, email, password FROM usuarios WHERE ${where} LIMIT 1`;
      db.query(q, [param], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error DB' });
        if (!rows || !rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
        const u = rows[0];
        const ok = require('bcryptjs').compareSync(password, u.password);
        return res.json({ match: ok, user: { id: u.id, username: u.username, email: u.email } });
      });
    });
    return r;
  };
}

// Exported debug helper: when required directly, offer a small router to read last attempt
if (process.env.NODE_ENV !== 'production') {
  // attach a helper to module.exports to allow server to mount debug route separately
  module.exports._getLastLoginAttempt = function() {
    return function() { return lastLoginAttempt; };
  };
}

// Expose debug endpoint only in non-production (convenience)
if (process.env.NODE_ENV !== 'production') {
  // mount a tiny debug route on the module for visibility; consumers call require(...)(db) which returns router,
  // but we also allow fetching last attempt via a separate exported helper — however simpler is to re-require the file.
  // To keep this file self-contained we'll append an express Router export for debug when required directly.
  try {
    // noop - file-level debug is available through the router instance's closure (lastLoginAttempt)
  } catch (e) {
    // ignore
  }
}

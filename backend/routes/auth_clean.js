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

  router.post('/login', (req, res) => {
    const { username, email, password } = req.body || {};
    if ((!username && !email) || !password) return res.status(400).json({ error: 'username/email y password son requeridos' });
    const where = username ? 'username = ?' : 'email = ?';
    const param = username || email;
    const q = `SELECT id, username, email, password, nombre_completo, rol FROM usuarios WHERE ${where} LIMIT 1`;
    db.query(q, [param], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Error del servidor' });
      if (!rows || !rows.length) return res.status(401).json({ error: 'Credenciales inválidas' });
      const user = rows[0];
      if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Credenciales inválidas' });
      const token = signToken({ id: user.id, username: user.username, email: user.email, rol: user.rol });
      const exp = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
      const ip = req.ip || (req.connection && req.connection.remoteAddress) || null;
      const ua = req.get('user-agent') || null;
      const insSes = 'INSERT INTO sesiones (usuario_id, token, ip_address, user_agent, fecha_expiracion, activa) VALUES (?, ?, ?, ?, ?, TRUE)';
      db.query(insSes, [user.id, token, ip, ua, exp], (err) => {
        if (err) console.warn('No se pudo crear sesión en DB:', err);
        return res.json({ success: true, token, user: { id: user.id, username: user.username, email: user.email, nombre_completo: user.nombre_completo, rol: user.rol } });
      });
    });
  });

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

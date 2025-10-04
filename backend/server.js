// backend/server.js
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: true, // Acepta cualquier origen en desarrollo
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.options('*', cors());
// Lightweight logger specifically for /auth requests to help debug 401 from browser
app.use('/auth', (req, res, next) => {
  try {
    const info = {
      method: req.method,
      path: req.path,
      origin: req.headers.origin || null,
      referer: req.headers.referer || null,
      contentType: req.headers['content-type'] || null,
      body_has: {
        email: req.body && typeof req.body.email !== 'undefined',
        username: req.body && typeof req.body.username !== 'undefined',
        password_present: req.body && typeof req.body.password !== 'undefined'
      },
      timestamp: new Date()
    };
    console.log('[incoming /auth]', JSON.stringify(info));
  } catch (e) {
    // ignore logging errors
  }
  next();
});

// Configuración de la base de datos
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'iot_monitor'
});

// Conectar a la base de datos
db.connect((err) => {
  if (err) {
    console.error('❌ Error conectando a la base de datos:', err);
    console.log('💡 Asegúrate de:');
    console.log('   1. Tener MySQL instalado y corriendo');
    console.log('   2. Crear la base de datos: CREATE DATABASE iot_monitor;');
    console.log('   3. Configurar las credenciales en el archivo .env');
    return;
  }
  console.log('✅ Conectado a MySQL');
  crearTablas();
});

// Crear tablas si no existen
function crearTablas() {
  const crearTablaDatos = `
    CREATE TABLE IF NOT EXISTS datos_sensores (
      id INT AUTO_INCREMENT PRIMARY KEY,
      dispositivo VARCHAR(50) NOT NULL,
      temperatura FLOAT NOT NULL,
      humedad FLOAT NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_timestamp (timestamp),
      INDEX idx_dispositivo (dispositivo)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  db.query(crearTablaDatos, (err) => {
    if (err) {
      console.error('❌ Error creando tabla:', err);
    } else {
      console.log('✅ Tabla datos_sensores verificada/creada');
    }
  });
  
  // Crear tabla usuarios y sesiones (si no existen) — esquema compatible con tu script
  const crearTablaUsuariosSQL = `
    CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      email VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      nombre_completo VARCHAR(100),
      rol ENUM('admin','usuario') DEFAULT 'usuario',
      activo BOOLEAN DEFAULT TRUE,
      fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ultimo_acceso TIMESTAMP NULL,
      INDEX idx_username (username),
      INDEX idx_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const crearTablaSesionesSQL = `
    CREATE TABLE IF NOT EXISTS sesiones (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id INT NOT NULL,
      token VARCHAR(255) NOT NULL UNIQUE,
      ip_address VARCHAR(45),
      user_agent TEXT,
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      fecha_expiracion DATETIME NULL,
      activa BOOLEAN DEFAULT TRUE,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      INDEX idx_token (token),
      INDEX idx_usuario (usuario_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  db.query(crearTablaUsuariosSQL, (err) => {
    if (err) {
      console.error('❌ Error creando tabla usuarios:', err);
    } else {
      console.log('✅ Tabla usuarios verificada/creada');
    }
  });

  db.query(crearTablaSesionesSQL, (err) => {
    if (err) {
      console.error('❌ Error creando tabla sesiones:', err);
    } else {
      console.log('✅ Tabla sesiones verificada/creada');
    }
  });
}

// ============================================
// RUTAS DE LA API
// ============================================

// Ruta principal - Servir el frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    database: db.state === 'authenticated' ? 'connected' : 'disconnected'
  });
});

// POST - Recibir datos del ESP32
app.post('/api/datos', (req, res) => {
  const { dispositivo, temperatura, humedad } = req.body;
  
  // Validación de datos
  if (!dispositivo || temperatura === undefined || humedad === undefined) {
    return res.status(400).json({ 
      error: 'Datos incompletos',
      requerido: { dispositivo: 'string', temperatura: 'number', humedad: 'number' }
    });
  }

  // Validación de rangos razonables
  if (temperatura < -50 || temperatura > 100) {
    return res.status(400).json({ error: 'Temperatura fuera de rango (-50 a 100°C)' });
  }
  
  if (humedad < 0 || humedad > 100) {
    return res.status(400).json({ error: 'Humedad fuera de rango (0 a 100%)' });
  }

  const query = 'INSERT INTO datos_sensores (dispositivo, temperatura, humedad) VALUES (?, ?, ?)';
  
  db.query(query, [dispositivo, temperatura, humedad], (err, result) => {
    if (err) {
      console.error('❌ Error insertando datos:', err);
      return res.status(500).json({ error: 'Error guardando datos en la base de datos' });
    }
    
    console.log(`📊 Datos recibidos de ${dispositivo} - Temp: ${temperatura}°C, Humedad: ${humedad}%`);
    
    res.json({ 
      success: true, 
      mensaje: 'Datos guardados correctamente',
      id: result.insertId,
      timestamp: new Date()
    });
  });
});

// GET - Obtener últimos N registros
app.get('/api/datos/recientes', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  
  const query = `
    SELECT 
      id,
      dispositivo,
      temperatura,
      humedad,
      timestamp
    FROM datos_sensores 
    ORDER BY timestamp DESC 
    LIMIT ?
  `;
  
  db.query(query, [limit], (err, results) => {
    if (err) {
      console.error('❌ Error obteniendo datos:', err);
      return res.status(500).json({ error: 'Error obteniendo datos' });
    }
    res.json(results);
  });
});

// GET - Obtener último dato
app.get('/api/datos/ultimo', (req, res) => {
  const dispositivo = req.query.dispositivo;
  
  let query = `
    SELECT * FROM datos_sensores 
    ${dispositivo ? 'WHERE dispositivo = ?' : ''}
    ORDER BY timestamp DESC 
    LIMIT 1
  `;
  
  const params = dispositivo ? [dispositivo] : [];
  
  db.query(query, params, (err, results) => {
    if (err) {
      console.error('❌ Error obteniendo último dato:', err);
      return res.status(500).json({ error: 'Error obteniendo datos' });
    }
    res.json(results[0] || null);
  });
});

// GET - Obtener estadísticas
app.get('/api/datos/estadisticas', (req, res) => {
  const horas = parseInt(req.query.horas) || 24;
  
  const query = `
    SELECT 
      COUNT(*) as total_registros,
      AVG(temperatura) as temp_promedio,
      MAX(temperatura) as temp_maxima,
      MIN(temperatura) as temp_minima,
      AVG(humedad) as humedad_promedio,
      MAX(humedad) as humedad_maxima,
      MIN(humedad) as humedad_minima,
      MIN(timestamp) as primer_registro,
      MAX(timestamp) as ultimo_registro
    FROM datos_sensores
    WHERE timestamp > DATE_SUB(NOW(), INTERVAL ? HOUR)
  `;
  
  db.query(query, [horas], (err, results) => {
    if (err) {
      console.error('❌ Error obteniendo estadísticas:', err);
      return res.status(500).json({ error: 'Error obteniendo estadísticas' });
    }
    
    const stats = results[0];
    
    // Formatear valores decimales
    if (stats.temp_promedio) stats.temp_promedio = parseFloat(stats.temp_promedio.toFixed(2));
    if (stats.temp_maxima) stats.temp_maxima = parseFloat(stats.temp_maxima.toFixed(2));
    if (stats.temp_minima) stats.temp_minima = parseFloat(stats.temp_minima.toFixed(2));
    if (stats.humedad_promedio) stats.humedad_promedio = parseFloat(stats.humedad_promedio.toFixed(2));
    if (stats.humedad_maxima) stats.humedad_maxima = parseFloat(stats.humedad_maxima.toFixed(2));
    if (stats.humedad_minima) stats.humedad_minima = parseFloat(stats.humedad_minima.toFixed(2));
    
    res.json(stats);
  });
});

// GET - Obtener datos por rango de fechas
app.get('/api/datos/rango', (req, res) => {
  const { inicio, fin } = req.query;
  
  if (!inicio || !fin) {
    return res.status(400).json({ error: 'Se requieren parámetros inicio y fin' });
  }
  
  const query = `
    SELECT * FROM datos_sensores 
    WHERE timestamp BETWEEN ? AND ?
    ORDER BY timestamp ASC
  `;
  
  db.query(query, [inicio, fin], (err, results) => {
    if (err) {
      console.error('❌ Error obteniendo datos por rango:', err);
      return res.status(500).json({ error: 'Error obteniendo datos' });
    }
    res.json(results);
  });
});

// GET - Listar dispositivos
app.get('/api/dispositivos', (req, res) => {
  const query = `
    SELECT 
      dispositivo,
      COUNT(*) as total_registros,
      MAX(timestamp) as ultimo_registro
    FROM datos_sensores
    GROUP BY dispositivo
    ORDER BY ultimo_registro DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('❌ Error obteniendo dispositivos:', err);
      return res.status(500).json({ error: 'Error obteniendo dispositivos' });
    }
    res.json(results);
  });
});

// DELETE - Eliminar datos antiguos (utilidad de mantenimiento)
app.delete('/api/datos/limpiar', (req, res) => {
  const dias = parseInt(req.query.dias) || 30;
  
  const query = `
    DELETE FROM datos_sensores 
    WHERE timestamp < DATE_SUB(NOW(), INTERVAL ? DAY)
  `;
  
  db.query(query, [dias], (err, result) => {
    if (err) {
      console.error('❌ Error limpiando datos:', err);
      return res.status(500).json({ error: 'Error limpiando datos' });
    }
    
    res.json({ 
      success: true,
      mensaje: `Datos de hace más de ${dias} días eliminados`,
      registros_eliminados: result.affectedRows
    });
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('❌ Error del servidor:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('=================================');
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Dashboard disponible en http://localhost:${PORT}`);
  console.log(`🔌 API REST disponible en http://localhost:${PORT}/api`);
  console.log('=================================');
});

// Manejo de cierre graceful
process.on('SIGINT', () => {
  console.log('\n⚠️  Cerrando servidor...');
  db.end((err) => {
    if (err) {
      console.error('Error cerrando la conexión:', err);
    } else {
      console.log('✅ Conexión a la base de datos cerrada');
    }
    process.exit(0);
  });
});

// Rutas de autenticación (register, login, me)
// Rutas de autenticación (register, login, me)
try {
  const authRouter = require(path.join(__dirname, 'routes', 'auth'))(db);
  app.use('/auth', authRouter);
} catch (err) {
  console.warn('⚠️ No se pudo cargar el módulo de autenticación (routes/auth.js). Asegúrate de que exista y no tenga errores de sintaxis.');
}

// Dev-only: mount debug endpoint to see last login attempt recorded by auth module
// debug endpoint now mounted inside auth router (has access to closure)

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});
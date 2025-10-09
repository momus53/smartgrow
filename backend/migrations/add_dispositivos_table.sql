-- Migración: Agregar tabla de dispositivos por usuario
USE iot_monitor;

-- Crear tabla de dispositivos vinculados a usuarios
CREATE TABLE IF NOT EXISTS dispositivos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    tipo ENUM('ESP32', 'Arduino', 'Raspberry Pi', 'Sensor', 'Otro') DEFAULT 'ESP32',
    identificador_unico VARCHAR(100) UNIQUE, -- MAC address, serial, etc.
    descripcion TEXT,
    ubicacion VARCHAR(100),
    estado ENUM('activo', 'inactivo', 'error') DEFAULT 'inactivo',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultima_conexion TIMESTAMP NULL,
    configuracion JSON, -- Para almacenar configuraciones específicas
    activo BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario_dispositivos (usuario_id),
    INDEX idx_identificador (identificador_unico),
    INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Modificar tabla datos_sensores para vincularse con dispositivos
-- Agregar columna dispositivo_id como referencia
ALTER TABLE datos_sensores 
ADD COLUMN dispositivo_id INT NULL AFTER id,
ADD FOREIGN KEY (dispositivo_id) REFERENCES dispositivos(id) ON DELETE SET NULL,
ADD INDEX idx_dispositivo_datos (dispositivo_id);

-- Insertar dispositivos de ejemplo para usuarios existentes
INSERT INTO dispositivos (usuario_id, nombre, tipo, identificador_unico, descripcion, ubicacion, estado) VALUES
(1, 'ESP32 Principal', 'ESP32', 'ESP32-001-AABBCC', 'Sensor principal de temperatura y humedad', 'Sala de estar', 'activo'),
(1, 'Sensor Jardín', 'ESP32', 'ESP32-002-DDEEFF', 'Monitor exterior para plantas', 'Jardín trasero', 'activo'),
(2, 'Arduino Nano', 'Arduino', 'ARDUINO-001-XXYYZZ', 'Dispositivo de prueba', 'Oficina', 'inactivo');

-- Actualizar datos existentes para vincularlos con dispositivos (opcional)
-- UPDATE datos_sensores SET dispositivo_id = 1 WHERE dispositivo = 'ESP32-001';
-- UPDATE datos_sensores SET dispositivo_id = 2 WHERE dispositivo = 'ESP32-002';
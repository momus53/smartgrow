CREATE DATABASE iot_monitor;
USE iot_monitor;

CREATE TABLE datos_sensores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dispositivo VARCHAR(50),
    temperatura FLOAT,
    humedad FLOAT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agregar tabla de usuarios al proyecto IoT Monitor
USE iot_monitor;

-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(100),
    rol ENUM('admin', 'usuario') DEFAULT 'usuario',
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso TIMESTAMP NULL,
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear tabla de sesiones (opcional, para gestión de sesiones)
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

-- Insertar usuario de prueba (password: "admin123")
-- Nota: En producción NUNCA usar passwords en texto plano
INSERT INTO usuarios (username, email, password, nombre_completo, rol) VALUES
('admin', 'admin@iot-monitor.com', '$2a$10$XQ3lK8lNqvzLZFx1hKp7ZeYxVZj3fDhVJKlYqO7lQYxHJ1qF1qF1q', 'Administrador', 'admin'),
('demo', 'demo@iot-monitor.com', '$2a$10$XQ3lK8lNqvzLZFx1hKp7ZeYxVZj3fDhVJKlYqO7lQYxHJ1qF1qF1q', 'Usuario Demo', 'usuario');